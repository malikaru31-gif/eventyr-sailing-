import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

// Lazy initialization to avoid build-time errors when env vars are missing
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

    const request_id = body?.request_id as string | undefined;
    const amount_eur = body?.amount_eur as number | undefined;
    const description = (body?.description as string | undefined) ?? "Rental payment";

    if (!request_id) return NextResponse.json({ error: "Missing request_id" }, { status: 400 });
    if (!amount_eur || !Number.isFinite(amount_eur) || amount_eur <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    const amount_cents = Math.round(amount_eur * 100);

    if (!supabaseAdmin) {
      return NextResponse.json({ ok: false, error: "Admin access not configured" }, { status: 500 });
    }

    const { data: reqRow, error: reqErr } = await supabaseAdmin
      .from("requests")
      .select("id,type,status,details")
      .eq("id", request_id)
      .single();

    if (reqErr) return NextResponse.json({ error: reqErr.message }, { status: 500 });
    if (!reqRow) return NextResponse.json({ error: "Request not found" }, { status: 404 });

    // Resolve baseUrl dynamically - never hardcode deployment URLs
    // CRITICAL: Reject vercel.app URLs at every step
    const requestOrigin = req.headers.get("origin");
    const envAppUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
    
    // Log what we're seeing for debugging
    console.log("[admin/requests/create-payment-link] Resolving baseUrl:", {
      hasNextPublicAppUrl: !!process.env.NEXT_PUBLIC_APP_URL,
      nextPublicAppUrl: process.env.NEXT_PUBLIC_APP_URL,
      hasAppUrl: !!process.env.APP_URL,
      appUrl: process.env.APP_URL,
      requestOrigin: requestOrigin,
    });

    // Reject vercel.app URLs immediately - even from env vars
    if (envAppUrl && envAppUrl.includes("vercel.app")) {
      console.error("[admin/requests/create-payment-link] NEXT_PUBLIC_APP_URL is set to a vercel.app URL (INVALID):", envAppUrl);
      throw new Error("NEXT_PUBLIC_APP_URL must be set to your production domain (e.g., https://eventyrperformance.com), not a Vercel deployment URL. Current value: " + envAppUrl);
    }

    if (requestOrigin && requestOrigin.includes("vercel.app")) {
      console.warn("[admin/requests/create-payment-link] Request origin is vercel.app (will be rejected):", requestOrigin);
    }

    // Build baseUrl - NEVER use vercel.app URLs
    const baseUrl = envAppUrl || 
      (requestOrigin && !requestOrigin.includes("vercel.app") ? requestOrigin : null) ||
      null;

    // Final validation - reject vercel.app and localhost in production
    if (!baseUrl) {
      console.error("[admin/requests/create-payment-link] Missing baseUrl. NEXT_PUBLIC_APP_URL must be set:", {
        hasNextPublicAppUrl: !!process.env.NEXT_PUBLIC_APP_URL,
        hasAppUrl: !!process.env.APP_URL,
        requestOrigin: requestOrigin,
        isVercelApp: requestOrigin?.includes("vercel.app"),
      });
      throw new Error("NEXT_PUBLIC_APP_URL environment variable must be set to your production domain (e.g., https://eventyrperformance.com). Cannot use vercel.app URLs or localhost.");
    }

    if (baseUrl.includes("vercel.app")) {
      console.error("[admin/requests/create-payment-link] baseUrl contains vercel.app (should have been rejected):", baseUrl);
      throw new Error("NEXT_PUBLIC_APP_URL must be set to your production domain, not a Vercel deployment URL");
    }

    if (baseUrl === "http://localhost:3000") {
      console.error("[admin/requests/create-payment-link] baseUrl is localhost (invalid for production):", baseUrl);
      throw new Error("NEXT_PUBLIC_APP_URL environment variable must be set to your production domain");
    }

    console.log("[admin/requests/create-payment-link] Using baseUrl:", baseUrl);

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: { name: description },
            unit_amount: amount_cents,
          },
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/api/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/admin/requests`,
      metadata: { source: "rental_request", request_id },
    });

    // Store as a "quote" record so you can track/pay status later
    const { error: qErr } = await supabaseAdmin!.from("quotes").upsert(
      {
        request_id,
        currency: "eur",
        line_items: [{ description, amount_cents }],
        total_cents: amount_cents,
        payment: "requires_payment",
        stripe_checkout_session_id: session.id,
      },
      { onConflict: "request_id" }
    );

    if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });

    // Ensure request remains in awaiting payment
    await supabaseAdmin!
      .from("requests")
      .update({ status: "approved_awaiting_payment" })
      .eq("id", request_id);

    return NextResponse.json({ ok: true, url: session.url });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Failed" }, { status: 500 });
  }
}
