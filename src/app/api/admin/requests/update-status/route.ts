import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

type Status = "approved_awaiting_payment" | "declined" | "needs_info";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  const request_id = body?.request_id as string | undefined;
  const status = body?.status as Status | undefined;

  if (!request_id) return NextResponse.json({ error: "Missing request_id" }, { status: 400 });

  const allowed: Status[] = ["approved_awaiting_payment", "declined", "needs_info"];
  if (!status || !allowed.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ ok: false, error: "Admin access not configured" }, { status: 500 });
  }

  const { error } = await supabaseAdmin
    .from("requests")
    .update({ status })
    .eq("id", request_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
