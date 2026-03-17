import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

type RentalType = "rib_rental" | "mark_rental" | "wind_rental";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const type: RentalType = body.type;
    const start_at: string = body.start_at;
    const end_at: string = body.end_at;
    const location: string | null = body.location ?? null;

    // Contact + extra info goes into details
    const details = {
      name: body.name ?? null,
      email: body.email ?? null,
      phone: body.phone ?? null,
      notes: body.notes ?? null,
      quantity: body.quantity ?? null,
      ...((body.details && typeof body.details === "object") ? body.details : {}),
    };

    // Basic validation
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

    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Admin access not configured" }, { status: 500 });
    }

    const { data, error } = await supabaseAdmin
      .from("requests")
      .insert([
        {
          user_id: null,             // guest request
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
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, request_id: data.id });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Invalid request" }, { status: 400 });
  }
}
