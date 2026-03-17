import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendEmail } from "@/lib/email";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const booking_id = body?.booking_id as string | undefined;
    const full_name = body?.full_name as string | undefined;
    const email = body?.email as string | undefined;
    const accepted = Boolean(body?.accepted);

    if (!booking_id || !full_name || !email) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (!accepted) {
      return NextResponse.json({ error: "Waiver must be accepted" }, { status: 400 });
    }
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Admin access not configured" }, { status: 500 });
    }

    const { data: booking, error: bookingError } = await supabaseAdmin
      .from("rib_bookings")
      .select("id,status,customer_email,start_at,end_at,location,total_cents")
      .eq("id", booking_id)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const { error: updateError } = await supabaseAdmin
      .from("rib_bookings")
      .update({
        status: "confirmed",
        waiver_signed_at: new Date().toISOString(),
        waiver_name: full_name,
        waiver_email: email,
      })
      .eq("id", booking_id);

    if (updateError) {
      console.error("[rentals/waiver] Update error:", updateError);
      return NextResponse.json({ error: "Failed to confirm booking" }, { status: 500 });
    }

    await sendEmail({
      to: booking.customer_email || email,
      subject: "Eventyr RIB Charter booking confirmed",
      text: `Your RIB booking is confirmed for ${booking.start_at} → ${booking.end_at}. Location: ${booking.location ?? "TBD"}.`,
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[rentals/waiver] Error:", err);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
