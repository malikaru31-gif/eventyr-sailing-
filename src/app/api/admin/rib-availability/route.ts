import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

function toNumber(value: any) {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const start_at = body?.start_at as string | undefined;
    const end_at = body?.end_at as string | undefined;
    const location = body?.location as string | undefined;
    const quantity = Number(body?.quantity ?? 0);
    const inventory_total = Number(body?.inventory_total ?? 0);
    const event_name = body?.event_name as string | undefined;
    const event_code = body?.event_code as string | undefined;
    const timezone = body?.timezone as string | undefined;
    const daily_rate_eur = Number(body?.daily_rate_eur ?? 0);
    const notes = body?.notes as string | undefined;
    const fuel_price_per_liter_cents = toNumber(body?.fuel_price_per_liter_cents);
    const estimated_fuel_liters_per_day = toNumber(body?.estimated_fuel_liters_per_day);
    const ferry_total_cents = toNumber(body?.ferry_total_cents);
    const tolls_total_cents = toNumber(body?.tolls_total_cents);
    const hotels_total_cents = toNumber(body?.hotels_total_cents);
    const local_misc_total_cents = toNumber(body?.local_misc_total_cents);
    const transport_km = toNumber(body?.transport_km);
    const transport_cost_per_km_cents = toNumber(body?.transport_cost_per_km_cents);
    const on_site_driver_day_rate_cents = toNumber(body?.on_site_driver_day_rate_cents);
    const pricing_mode = body?.pricing_mode as string | undefined;
    const target_margin_bps = toNumber(body?.target_margin_bps);
    const target_profit_per_day_cents = toNumber(body?.target_profit_per_day_cents);
    const min_daily_rate_cents = toNumber(body?.min_daily_rate_cents);
    const max_daily_rate_cents = toNumber(body?.max_daily_rate_cents);
    const last_minute_markup_bps = toNumber(body?.last_minute_markup_bps);
    const long_booking_discount_bps = toNumber(body?.long_booking_discount_bps);
    const manual_daily_rate_cents = toNumber(body?.manual_daily_rate_cents);

    if (!start_at || !end_at) {
      return NextResponse.json({ error: "Start/end required" }, { status: 400 });
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return NextResponse.json({ error: "Quantity must be > 0" }, { status: 400 });
    }
    if (!Number.isFinite(inventory_total) || inventory_total <= 0) {
      return NextResponse.json({ error: "Inventory total must be > 0" }, { status: 400 });
    }
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Admin access not configured" }, { status: 500 });
    }

    const { data, error } = await supabaseAdmin
      .from("rib_availability")
      .insert([
        {
          start_at,
          end_at,
          location: location || null,
          quantity,
          inventory_total,
          event_name: event_name || null,
          event_code: event_code || null,
          timezone: timezone || null,
          daily_rate_cents: daily_rate_eur > 0 ? Math.round(daily_rate_eur * 100) : null,
          fuel_price_per_liter_cents: fuel_price_per_liter_cents || null,
          estimated_fuel_liters_per_day: estimated_fuel_liters_per_day || null,
          ferry_total_cents: ferry_total_cents || null,
          tolls_total_cents: tolls_total_cents || null,
          hotels_total_cents: hotels_total_cents || null,
          local_misc_total_cents: local_misc_total_cents || null,
          transport_km: transport_km || null,
          transport_cost_per_km_cents: transport_cost_per_km_cents || null,
          on_site_driver_day_rate_cents: on_site_driver_day_rate_cents || null,
          pricing_mode: pricing_mode || "margin",
          target_margin_bps: target_margin_bps > 0 ? target_margin_bps : 3500,
          target_profit_per_day_cents: target_profit_per_day_cents || null,
          min_daily_rate_cents: min_daily_rate_cents || null,
          max_daily_rate_cents: max_daily_rate_cents || null,
          last_minute_markup_bps: last_minute_markup_bps || null,
          long_booking_discount_bps: long_booking_discount_bps || null,
          manual_daily_rate_cents: manual_daily_rate_cents || null,
          notes: notes || null,
        },
      ])
      .select("id")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, id: data.id });
  } catch (err: any) {
    console.error("[admin/rib-availability] Error:", err);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Admin access not configured" }, { status: 500 });
    }

    const { error } = await supabaseAdmin.from("rib_availability").delete().eq("id", id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[admin/rib-availability] Delete error:", err);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
