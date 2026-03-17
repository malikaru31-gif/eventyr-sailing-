import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("Missing STRIPE_SECRET_KEY in env");
  }
  return new Stripe(key);
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const booking_id = body?.booking_id as string | undefined;
    if (!booking_id) {
      return NextResponse.json({ error: "Missing booking_id" }, { status: 400 });
    }
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Admin access not configured" }, { status: 500 });
    }

    const { data: booking, error: bookingError } = await supabaseAdmin
      .from("rib_bookings")
      .select("id,status,total_cents,deposit_cents,customer_email,start_at,end_at,location")
      .eq("id", booking_id)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const depositCents = Number(booking.deposit_cents ?? 0);
    if (!Number.isFinite(depositCents) || depositCents <= 0) {
      return NextResponse.json({ error: "Invalid deposit amount" }, { status: 400 });
    }

    const requestOrigin = req.headers.get("origin");
    const envAppUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
    const baseUrl =
      envAppUrl || (requestOrigin && !requestOrigin.includes("vercel.app") ? requestOrigin : null);

    if (!baseUrl) {
      return NextResponse.json(
        { error: "Missing NEXT_PUBLIC_APP_URL configuration" },
        { status: 500 }
      );
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: "Eventyr RIB reservation fee (20%)",
              description: `${booking.start_at} → ${booking.end_at} • ${booking.location ?? "TBD"}`,
            },
            unit_amount: depositCents,
          },
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/rentals/confirmation?booking=${booking.id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/rentals?booking_cancelled=${booking.id}`,
      metadata: { source: "rib_reservation", booking_id: booking.id },
    });

    await supabaseAdmin
      .from("rib_bookings")
      .update({ status: "held", stripe_session_id: session.id })
      .eq("id", booking.id);

    return NextResponse.json({ ok: true, url: session.url });
  } catch (err: any) {
    console.error("[rentals/deposit] Error:", err);
    return NextResponse.json({ error: err?.message ?? "Failed" }, { status: 500 });
  }
}
