type QuoteInput = {
  eventId: string;
  startAt: string;
  endAt: string;
  quantity: number;
  includeDriver: boolean;
  customerEmail?: string | null;
};

type QuoteBreakdown = {
  label: string;
  cents: number;
};

type QuoteResult = {
  event_id: string;
  availability: number;
  reserved: number;
  inventory_total: number;
  days: number;
  cost_total: number;
  price_total: number;
  deposit: number;
  breakdown: QuoteBreakdown[];
  event: any;
  cost_profile_id: string | null;
};

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const RESERVED_STATUSES = [
  "awaiting_action",
  "held",
  "deposit_paid",
  "confirmed",
  "awaiting_payment",
  "reserved",
  "booked",
];

function toNumber(value: any) {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
}

export async function computeRibQuote(
  admin: any,
  input: QuoteInput,
  options?: { logQuote?: boolean }
): Promise<QuoteResult> {
  const { eventId, startAt, endAt, quantity, includeDriver, customerEmail } = input;

  const { data: event, error: eventError } = await admin
    .from("rib_availability")
    .select("*")
    .eq("id", eventId)
    .single();

  if (eventError || !event) {
    throw new Error("Event block not found");
  }

  if (startAt < event.start_at || endAt > event.end_at) {
    throw new Error("Requested dates must be inside the event block");
  }

  const nowIso = new Date().toISOString();
  const { data: bookingRows, error: bookingError } = await admin
    .from("rib_bookings")
    .select("id,quantity,status,hold_expires_at")
    .eq("event_id", eventId)
    .lt("start_at", endAt)
    .gt("end_at", startAt)
    .in("status", RESERVED_STATUSES)
    .or(`hold_expires_at.is.null,hold_expires_at.gt.${nowIso}`);

  if (bookingError) {
    throw new Error("Failed to check existing bookings");
  }

  const reserved = (bookingRows ?? []).reduce(
    (sum: number, row: any) => sum + (row.quantity ?? 0),
    0
  );
  const inventoryTotal = toNumber(event.inventory_total ?? event.quantity ?? 0);
  const availability = Math.max(0, inventoryTotal - reserved);

  if (quantity > availability) {
    throw new Error("Selected dates are fully booked");
  }

  const { data: costProfileRows } = await admin
    .from("rib_cost_profile")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1);

  const costProfile = costProfileRows?.[0] ?? null;
  const costProfileId = costProfile?.id ?? null;

  const startMs = Date.parse(startAt);
  const endMs = Date.parse(endAt);
  const days = Math.max(1, Math.ceil((endMs - startMs) / MS_PER_DAY));

  const eventDays = Math.max(
    1,
    Math.ceil((Date.parse(event.end_at) - Date.parse(event.start_at)) / MS_PER_DAY)
  );
  const inventoryDays = Math.max(1, eventDays * inventoryTotal);

  const transportTotal = toNumber(event.transport_km) * toNumber(event.transport_cost_per_km_cents);
  const eventFixedTotal =
    toNumber(event.ferry_total_cents) +
    toNumber(event.tolls_total_cents) +
    toNumber(event.hotels_total_cents) +
    toNumber(event.local_misc_total_cents) +
    transportTotal;
  const eventFixedAllocPerRibDay = Math.round(eventFixedTotal / inventoryDays);

  const fuelPerDay =
    toNumber(event.estimated_fuel_liters_per_day) * toNumber(event.fuel_price_per_liter_cents);
  const driverPerDay = includeDriver ? toNumber(event.on_site_driver_day_rate_cents) : 0;

  const globalPerDay =
    toNumber(costProfile?.depreciation_per_day_cents) +
    toNumber(costProfile?.maintenance_reserve_per_day_cents) +
    toNumber(costProfile?.insurance_per_day_cents) +
    toNumber(costProfile?.admin_overhead_per_day_cents);

  const eventPerDay = eventFixedAllocPerRibDay + fuelPerDay + driverPerDay;
  const prepTurnaround = toNumber(costProfile?.prep_turnaround_cents);

  const costTotal = Math.max(0, (globalPerDay + eventPerDay) * days * quantity + prepTurnaround);

  let priceTotal = costTotal;
  const manualDaily = toNumber(event.manual_daily_rate_cents);
  const pricingMode = (event.pricing_mode ?? "margin").toString();
  const targetMargin = toNumber(event.target_margin_bps) / 10000;
  const targetProfitPerDay = toNumber(event.target_profit_per_day_cents);

  if (manualDaily > 0) {
    priceTotal = manualDaily * days * quantity;
  } else {
    const marginPrice =
      targetMargin > 0 && targetMargin < 1 ? costTotal / (1 - targetMargin) : costTotal;
    const profitPrice = costTotal + targetProfitPerDay * days * quantity;

    if (pricingMode === "profit") {
      priceTotal = profitPrice;
    } else if (pricingMode === "hybrid") {
      priceTotal = Math.max(marginPrice, profitPrice);
    } else {
      priceTotal = marginPrice;
    }
  }

  const minDaily = toNumber(event.min_daily_rate_cents);
  const maxDaily = toNumber(event.max_daily_rate_cents);
  const units = Math.max(1, days * quantity);
  let dailyRate = priceTotal / units;
  if (minDaily > 0) dailyRate = Math.max(dailyRate, minDaily);
  if (maxDaily > 0) dailyRate = Math.min(dailyRate, maxDaily);
  priceTotal = Math.round(dailyRate * units);

  const deposit = Math.round(priceTotal * 0.2);

  const breakdown: QuoteBreakdown[] = [
    { label: "Global per day (depreciation + maintenance + insurance + admin)", cents: globalPerDay },
    { label: "Event fixed alloc per day", cents: eventFixedAllocPerRibDay },
    { label: "Fuel per day", cents: fuelPerDay },
    { label: "Driver per day", cents: driverPerDay },
    { label: "Prep/turnaround", cents: prepTurnaround },
  ];

  const result: QuoteResult = {
    event_id: eventId,
    availability,
    reserved,
    inventory_total: inventoryTotal,
    days,
    cost_total: costTotal,
    price_total: priceTotal,
    deposit,
    breakdown,
    event,
    cost_profile_id: costProfileId,
  };

  if (options?.logQuote) {
    try {
      await admin.from("rib_quotes").insert([
        {
          event_id: eventId,
          start_at: startAt,
          end_at: endAt,
          quantity,
          cost_profile_id: costProfileId,
          computed_cost_total_cents: costTotal,
          computed_price_total_cents: priceTotal,
          computed_deposit_cents: deposit,
          customer_email: customerEmail ?? null,
        },
      ]);
    } catch (err) {
      console.warn("[ribQuote] Unable to insert rib_quotes (table may not exist).");
    }
  }

  return result;
}
