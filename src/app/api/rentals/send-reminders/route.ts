import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendEmail } from "@/lib/email";

export const runtime = "nodejs";

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret");
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret || secret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Admin access not configured" }, { status: 500 });
  }

  const now = new Date();
  const inEightWeeks = new Date(now.getTime() + ONE_WEEK_MS * 8);

  const { data: bookings, error } = await supabaseAdmin
    .from("rib_bookings")
    .select("id,customer_email,start_at,end_at,location,last_reminder_at")
    .in("status", ["confirmed", "deposit_paid", "booked"])
    .gte("start_at", now.toISOString())
    .lte("start_at", inEightWeeks.toISOString());

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results: { id: string; emailed: boolean }[] = [];

  for (const booking of bookings ?? []) {
    if (!booking.customer_email) continue;
    const lastReminder = booking.last_reminder_at ? new Date(booking.last_reminder_at) : null;
    if (lastReminder && now.getTime() - lastReminder.getTime() < ONE_WEEK_MS) {
      continue;
    }

    await sendEmail({
      to: booking.customer_email,
      subject: "Eventyr RIB Charter reminder",
      text: `Reminder: your RIB booking starts on ${booking.start_at}. Location: ${booking.location ?? "TBD"}.`,
    });

    await supabaseAdmin
      .from("rib_bookings")
      .update({ last_reminder_at: now.toISOString() })
      .eq("id", booking.id);

    results.push({ id: booking.id, emailed: true });
  }

  return NextResponse.json({ ok: true, sent: results.length, results });
}
