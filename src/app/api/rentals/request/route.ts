import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { computeRibQuote } from "@/lib/ribQuote";

export const runtime = "nodejs";

type RentalType = "rib_rental" | "mark_rental" | "wind_rental";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const type: RentalType = body.type;
    const start_at: string = body.start_at;
    const end_at: string = body.end_at;
    const location: string | null = body.location ?? null;
    const event_id: string | null = body.event_id ?? null;
    const include_driver = Boolean(body.include_driver);

    const details = {
      name: body.name ?? null,
      email: body.email ?? null,
      phone: body.phone ?? null,
      notes: body.notes ?? null,
      quantity: body.quantity ?? null,
    };

    const allowed: RentalType[] = ["rib_rental", "mark_rental", "wind_rental"];
    if (!allowed.includes(type)) {
      return NextResponse.json({ error: "Invalid rental type" }, { status: 400 });
    }
    if (!start_at || !end_at) {
      return NextResponse.json({ error: "Start and end date are required" }, { status: 400 });
    }
    if (!details.email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(details.email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }
    const startMs = Date.parse(start_at);
    const endMs = Date.parse(end_at);

    if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
    }
    if (endMs <= startMs) {
      return NextResponse.json({ error: "End must be after start" }, { status: 400 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Admin access not configured" }, { status: 500 });
    }

    const admin = supabaseAdmin;

    if (type === "rib_rental") {
      if (!event_id) {
        return NextResponse.json({ error: "Event is required for RIB bookings" }, { status: 400 });
      }

      const quantityNum = Number(details.quantity ?? 1);
      const quote = await computeRibQuote(
        admin,
        {
          eventId: event_id,
          startAt: start_at,
          endAt: end_at,
          quantity: quantityNum,
          includeDriver: include_driver,
          customerEmail: details.email ?? null,
        },
        { logQuote: true }
      );

      const holdExpiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      const { data: bookingRow, error: bookingInsertError } = await admin
        .from("rib_bookings")
        .insert([
          {
            status: "held",
            start_at,
            end_at,
            location: location ?? quote.event.location ?? null,
            quantity: quantityNum,
            customer_name: details.name,
            customer_email: details.email,
            customer_phone: details.phone,
            notes: details.notes,
            total_cents: quote.price_total,
            deposit_cents: quote.deposit,
            hold_expires_at: holdExpiresAt,
            availability_id: quote.event_id,
            event_id: quote.event_id,
          },
        ])
        .select("id,total_cents,deposit_cents,hold_expires_at")
        .single();

      if (bookingInsertError) {
        console.error("[rentals/request] Booking insert error:", bookingInsertError);
        return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
      }

      return NextResponse.json({
        ok: true,
        mode: "rib_booking",
        booking_id: bookingRow.id,
        total_cents: bookingRow.total_cents,
        deposit_cents: bookingRow.deposit_cents,
        hold_expires_at: bookingRow.hold_expires_at,
      });
    }

    const { data, error } = await admin
      .from("requests")
      .insert([
        {
          user_id: null,
          type,
          status: "pending",
          start_at,
          end_at,
          location,
          details,
        },
      ])
      .select("id")
      .single();

    if (error) {
      // Don't expose database error details to client
      console.error("[rentals/request] Database error:", error);
      return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, request_id: data.id });
  } catch (err: any) {
    console.error("[rentals/request] Error:", err);
    return NextResponse.json({ error: err?.message ?? "Invalid request" }, { status: 400 });
  }
}
