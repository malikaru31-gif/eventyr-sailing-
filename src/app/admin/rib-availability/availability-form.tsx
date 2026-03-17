"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type CostProfile = {
  depreciation_per_day_cents: number;
  maintenance_reserve_per_day_cents: number;
  insurance_per_day_cents: number;
  admin_overhead_per_day_cents: number;
  prep_turnaround_cents: number;
} | null;

export default function AvailabilityForm({ costProfile }: { costProfile: CostProfile }) {
  const router = useRouter();
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [location, setLocation] = useState("");
  const [eventName, setEventName] = useState("");
  const [eventCode, setEventCode] = useState("");
  const [timezone, setTimezone] = useState("Europe/Amsterdam");
  const [quantity, setQuantity] = useState(1);
  const [inventoryTotal, setInventoryTotal] = useState(1);
  const [notes, setNotes] = useState("");

  const [fuelPrice, setFuelPrice] = useState(180);
  const [fuelLitersPerDay, setFuelLitersPerDay] = useState(35);
  const [ferryTotal, setFerryTotal] = useState(0);
  const [tollsTotal, setTollsTotal] = useState(0);
  const [hotelsTotal, setHotelsTotal] = useState(0);
  const [localMiscTotal, setLocalMiscTotal] = useState(0);
  const [transportKm, setTransportKm] = useState(0);
  const [transportPerKm, setTransportPerKm] = useState(0);
  const [driverDayRate, setDriverDayRate] = useState(0);

  const [pricingMode, setPricingMode] = useState("margin");
  const [targetMarginBps, setTargetMarginBps] = useState(3500);
  const [targetProfitPerDay, setTargetProfitPerDay] = useState(0);
  const [minDailyRate, setMinDailyRate] = useState(0);
  const [maxDailyRate, setMaxDailyRate] = useState(0);
  const [lastMinuteMarkupBps, setLastMinuteMarkupBps] = useState(0);
  const [longBookingDiscountBps, setLongBookingDiscountBps] = useState(0);

  const [manualOverride, setManualOverride] = useState(false);
  const [manualDailyRate, setManualDailyRate] = useState(0);

  const [saving, setSaving] = useState(false);

  const preview = useMemo(() => {
    const globalPerDay =
      (costProfile?.depreciation_per_day_cents ?? 0) +
      (costProfile?.maintenance_reserve_per_day_cents ?? 0) +
      (costProfile?.insurance_per_day_cents ?? 0) +
      (costProfile?.admin_overhead_per_day_cents ?? 0);
    const prep = costProfile?.prep_turnaround_cents ?? 0;
    const fuelPerDay = fuelPrice * fuelLitersPerDay;
    const eventFixedTotal =
      ferryTotal + tollsTotal + hotelsTotal + localMiscTotal + transportKm * transportPerKm;
    const eventStart = start ? Date.parse(start) : NaN;
    const eventEnd = end ? Date.parse(end) : NaN;
    const eventDays = Number.isFinite(eventStart) && Number.isFinite(eventEnd)
      ? Math.max(1, Math.ceil((eventEnd - eventStart) / (1000 * 60 * 60 * 24)))
      : 1;
    const inventoryDays = Math.max(1, eventDays * Math.max(1, inventoryTotal));
    const eventFixedAlloc = Math.round(eventFixedTotal / inventoryDays);
    const eventPerDay = eventFixedAlloc + fuelPerDay + driverDayRate;

    const costTotal = Math.max(0, globalPerDay + eventPerDay + prep);
    let priceTotal = costTotal;

    if (manualOverride && manualDailyRate > 0) {
      priceTotal = manualDailyRate;
    } else {
      const margin = targetMarginBps / 10000;
      const marginPrice = margin > 0 && margin < 1 ? costTotal / (1 - margin) : costTotal;
      const profitPrice = costTotal + targetProfitPerDay;
      if (pricingMode === "profit") priceTotal = profitPrice;
      else if (pricingMode === "hybrid") priceTotal = Math.max(marginPrice, profitPrice);
      else priceTotal = marginPrice;
    }

    if (minDailyRate > 0) priceTotal = Math.max(priceTotal, minDailyRate);
    if (maxDailyRate > 0) priceTotal = Math.min(priceTotal, maxDailyRate);

    const deposit = Math.round(priceTotal * 0.2);

    return {
      costPerDay: Math.round(costTotal),
      pricePerDay: Math.round(priceTotal),
      deposit,
    };
  }, [
    costProfile,
    fuelPrice,
    fuelLitersPerDay,
    ferryTotal,
    tollsTotal,
    hotelsTotal,
    localMiscTotal,
    transportKm,
    transportPerKm,
    driverDayRate,
    inventoryTotal,
    manualOverride,
    manualDailyRate,
    pricingMode,
    targetMarginBps,
    targetProfitPerDay,
    minDailyRate,
    maxDailyRate,
  ]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/rib-availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start_at: start ? new Date(start).toISOString() : null,
          end_at: end ? new Date(end).toISOString() : null,
          location,
          event_name: eventName,
          event_code: eventCode,
          timezone,
          quantity,
          inventory_total: inventoryTotal,
          notes,
          fuel_price_per_liter_cents: fuelPrice,
          estimated_fuel_liters_per_day: fuelLitersPerDay,
          ferry_total_cents: ferryTotal,
          tolls_total_cents: tollsTotal,
          hotels_total_cents: hotelsTotal,
          local_misc_total_cents: localMiscTotal,
          transport_km: transportKm,
          transport_cost_per_km_cents: transportPerKm,
          on_site_driver_day_rate_cents: driverDayRate,
          pricing_mode: pricingMode,
          target_margin_bps: targetMarginBps,
          target_profit_per_day_cents: targetProfitPerDay || null,
          min_daily_rate_cents: minDailyRate || null,
          max_daily_rate_cents: maxDailyRate || null,
          last_minute_markup_bps: lastMinuteMarkupBps || null,
          long_booking_discount_bps: longBookingDiscountBps || null,
          manual_daily_rate_cents: manualOverride ? manualDailyRate : null,
        }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        alert(payload?.error ?? "Unable to save availability");
        return;
      }
      setStart("");
      setEnd("");
      setLocation("");
      setEventName("");
      setEventCode("");
      setTimezone("Europe/Amsterdam");
      setQuantity(1);
      setInventoryTotal(1);
      setNotes("");
      setManualOverride(false);
      setManualDailyRate(0);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-neutral-200 bg-white p-5 space-y-6">
      <div className="text-sm font-semibold">Add event block</div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1">
          <div className="text-sm font-medium">Event name</div>
          <input
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2"
          />
        </label>
        <label className="space-y-1">
          <div className="text-sm font-medium">Event code</div>
          <input
            value={eventCode}
            onChange={(e) => setEventCode(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2"
          />
        </label>
        <label className="space-y-1">
          <div className="text-sm font-medium">Start</div>
          <input
            type="datetime-local"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            required
            className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2"
          />
        </label>
        <label className="space-y-1">
          <div className="text-sm font-medium">End</div>
          <input
            type="datetime-local"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            required
            className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2"
          />
        </label>
        <label className="space-y-1">
          <div className="text-sm font-medium">Timezone</div>
          <input
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2"
          />
        </label>
        <label className="space-y-1">
          <div className="text-sm font-medium">Location</div>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2"
            placeholder="Garda / Palma"
          />
        </label>
        <label className="space-y-1">
          <div className="text-sm font-medium">Inventory total (RIBs)</div>
          <input
            type="number"
            min={1}
            value={inventoryTotal}
            onChange={(e) => setInventoryTotal(Number(e.target.value))}
            className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2"
          />
        </label>
        <label className="space-y-1">
          <div className="text-sm font-medium">Quantity default (request)</div>
          <input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2"
          />
        </label>
        <label className="space-y-1 sm:col-span-2">
          <div className="text-sm font-medium">Notes</div>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2"
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2 text-sm font-semibold">Event costs</div>
        <label className="space-y-1">
          <div className="text-sm font-medium">Fuel price per liter (cents)</div>
          <input
            type="number"
            min={0}
            value={fuelPrice}
            onChange={(e) => setFuelPrice(Number(e.target.value))}
            className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2"
          />
        </label>
        <label className="space-y-1">
          <div className="text-sm font-medium">Estimated fuel liters/day</div>
          <input
            type="number"
            min={0}
            value={fuelLitersPerDay}
            onChange={(e) => setFuelLitersPerDay(Number(e.target.value))}
            className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2"
          />
        </label>
        <label className="space-y-1">
          <div className="text-sm font-medium">Ferry total (cents)</div>
          <input
            type="number"
            min={0}
            value={ferryTotal}
            onChange={(e) => setFerryTotal(Number(e.target.value))}
            className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2"
          />
        </label>
        <label className="space-y-1">
          <div className="text-sm font-medium">Tolls total (cents)</div>
          <input
            type="number"
            min={0}
            value={tollsTotal}
            onChange={(e) => setTollsTotal(Number(e.target.value))}
            className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2"
          />
        </label>
        <label className="space-y-1">
          <div className="text-sm font-medium">Hotels total (cents)</div>
          <input
            type="number"
            min={0}
            value={hotelsTotal}
            onChange={(e) => setHotelsTotal(Number(e.target.value))}
            className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2"
          />
        </label>
        <label className="space-y-1">
          <div className="text-sm font-medium">Local misc total (cents)</div>
          <input
            type="number"
            min={0}
            value={localMiscTotal}
            onChange={(e) => setLocalMiscTotal(Number(e.target.value))}
            className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2"
          />
        </label>
        <label className="space-y-1">
          <div className="text-sm font-medium">Transport km (roundtrip)</div>
          <input
            type="number"
            min={0}
            value={transportKm}
            onChange={(e) => setTransportKm(Number(e.target.value))}
            className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2"
          />
        </label>
        <label className="space-y-1">
          <div className="text-sm font-medium">Transport cost per km (cents)</div>
          <input
            type="number"
            min={0}
            value={transportPerKm}
            onChange={(e) => setTransportPerKm(Number(e.target.value))}
            className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2"
          />
        </label>
        <label className="space-y-1">
          <div className="text-sm font-medium">On-site driver day rate (cents)</div>
          <input
            type="number"
            min={0}
            value={driverDayRate}
            onChange={(e) => setDriverDayRate(Number(e.target.value))}
            className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2"
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2 text-sm font-semibold">Pricing targets</div>
        <label className="space-y-1">
          <div className="text-sm font-medium">Pricing mode</div>
          <select
            value={pricingMode}
            onChange={(e) => setPricingMode(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2"
          >
            <option value="margin">Margin</option>
            <option value="profit">Profit</option>
            <option value="hybrid">Hybrid</option>
          </select>
        </label>
        <label className="space-y-1">
          <div className="text-sm font-medium">Target margin (bps)</div>
          <input
            type="number"
            min={0}
            value={targetMarginBps}
            onChange={(e) => setTargetMarginBps(Number(e.target.value))}
            className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2"
          />
        </label>
        <label className="space-y-1">
          <div className="text-sm font-medium">Target profit per day (cents)</div>
          <input
            type="number"
            min={0}
            value={targetProfitPerDay}
            onChange={(e) => setTargetProfitPerDay(Number(e.target.value))}
            className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2"
          />
        </label>
        <label className="space-y-1">
          <div className="text-sm font-medium">Min daily rate (cents)</div>
          <input
            type="number"
            min={0}
            value={minDailyRate}
            onChange={(e) => setMinDailyRate(Number(e.target.value))}
            className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2"
          />
        </label>
        <label className="space-y-1">
          <div className="text-sm font-medium">Max daily rate (cents)</div>
          <input
            type="number"
            min={0}
            value={maxDailyRate}
            onChange={(e) => setMaxDailyRate(Number(e.target.value))}
            className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2"
          />
        </label>
        <label className="space-y-1">
          <div className="text-sm font-medium">Last minute markup (bps)</div>
          <input
            type="number"
            min={0}
            value={lastMinuteMarkupBps}
            onChange={(e) => setLastMinuteMarkupBps(Number(e.target.value))}
            className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2"
          />
        </label>
        <label className="space-y-1">
          <div className="text-sm font-medium">Long booking discount (bps)</div>
          <input
            type="number"
            min={0}
            value={longBookingDiscountBps}
            onChange={(e) => setLongBookingDiscountBps(Number(e.target.value))}
            className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2"
          />
        </label>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 space-y-3">
        <div className="text-sm font-semibold">Pricing Preview (1 day / 1 RIB)</div>
        <div className="text-sm text-neutral-700">
          Suggested cost/day: €{(preview.costPerDay / 100).toFixed(2)} • Suggested price/day: €
          {(preview.pricePerDay / 100).toFixed(2)}
        </div>
        <div className="text-xs text-neutral-500">
          Deposit (20%): €{(preview.deposit / 100).toFixed(2)}
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">Manual override daily rate</div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={manualOverride}
              onChange={(e) => setManualOverride(e.target.checked)}
            />
            Enable
          </label>
        </div>
        <input
          type="number"
          min={0}
          disabled={!manualOverride}
          value={manualDailyRate}
          onChange={(e) => setManualDailyRate(Number(e.target.value))}
          className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 disabled:bg-neutral-100"
          placeholder="Daily rate in cents"
        />
      </div>

      <button
        type="submit"
        disabled={saving}
        className="inline-flex items-center justify-center rounded-full bg-black px-5 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
      >
        {saving ? "Saving..." : "Add event block"}
      </button>
    </form>
  );
}
