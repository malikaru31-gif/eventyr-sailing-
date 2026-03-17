import Stripe from "stripe";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendEmail } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("Missing STRIPE_SECRET_KEY in env");
  }
  return new Stripe(key);
}

export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Missing Stripe webhook config" }, { status: 400 });
  }

  const stripe = getStripe();
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error("[stripe/webhook] Signature error:", err?.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const bookingId = session.metadata?.booking_id;
    const source = session.metadata?.source;

    if (source === "rib_reservation" && bookingId && supabaseAdmin) {
      const { data: booking } = await supabaseAdmin
        .from("rib_bookings")
        .select("id,customer_email,start_at,end_at,location")
        .eq("id", bookingId)
        .single();

      await supabaseAdmin
        .from("rib_bookings")
        .update({
          status: "deposit_paid",
          deposit_paid_at: new Date().toISOString(),
          stripe_session_id: session.id,
        })
        .eq("id", bookingId);

      if (booking?.customer_email) {
        await sendEmail({
          to: booking.customer_email,
          subject: "Eventyr RIB Charter booking confirmed",
          text: `Your RIB booking is confirmed for ${booking.start_at} → ${booking.end_at}. Location: ${booking.location ?? "TBD"}.`,
        });
      }
    }
  }

  return NextResponse.json({ received: true });
}
