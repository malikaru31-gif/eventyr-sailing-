import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { computeRibQuote } from "@/lib/ribQuote";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const event_id = body?.event_id as string | undefined;
    const start_at = body?.start_at as string | undefined;
    const end_at = body?.end_at as string | undefined;
    const quantity = Number(body?.quantity ?? 0);
    const include_driver = Boolean(body?.include_driver);
    const customer_email = body?.customer_email as string | undefined;

    if (!event_id || !start_at || !end_at) {
      return NextResponse.json({ error: "Missing event or date range" }, { status: 400 });
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return NextResponse.json({ error: "Quantity must be > 0" }, { status: 400 });
    }
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Admin access not configured" }, { status: 500 });
    }

    const quote = await computeRibQuote(supabaseAdmin, {
      eventId: event_id,
      startAt: start_at,
      endAt: end_at,
      quantity,
      includeDriver: include_driver,
      customerEmail: customer_email ?? null,
    }, { logQuote: true });

    return NextResponse.json({
      ok: true,
      ...quote,
    });
  } catch (err: any) {
    const message = err?.message ?? "Failed to create quote";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
