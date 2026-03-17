import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

export async function GET() {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Admin access not configured" }, { status: 500 });
    }

    const { data, error } = await supabaseAdmin
      .from("rib_availability")
      .select(
        "id,start_at,end_at,location,event_name,event_code,timezone,inventory_total,manual_daily_rate_cents"
      )
      .order("start_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, events: data ?? [] });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to load events" }, { status: 400 });
  }
}
