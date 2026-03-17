import Stripe from "stripe";
import { NextResponse } from "next/server";
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

const EU_COUNTRIES: Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[] =
  [
    "AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU","IE","IT","LV","LT","LU","MT",
    "NL","PL","PT","RO","SK","SI","ES","SE",
  ];

type CartItem = { productId: string; quantity: number };
type DbProduct = { id: string; name: string; price_cents: number; active: boolean };

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const items: CartItem[] = body.items;

    if (!items?.length) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    if (items.some((i) => !i.productId || !Number.isInteger(i.quantity) || i.quantity <= 0)) {
      return NextResponse.json({ error: "Invalid cart items" }, { status: 400 });
    }

    const productIds = items.map((i) => i.productId);

    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Admin access not configured" }, { status: 500 });
    }

    const { data: products, error } = await supabaseAdmin
      .from("products")
      .select("id,name,price_cents,active")
      .in("id", productIds);

    if (error) throw error;

    if (!products || products.length !== productIds.length) {
      return NextResponse.json({ error: "Some products not found" }, { status: 400 });
    }

    const typedProducts = products as DbProduct[];

    if (typedProducts.some((p) => !p.active)) {
      return NextResponse.json({ error: "Some products are not available" }, { status: 400 });
    }

    if (typedProducts.some((p) => !p.price_cents || p.price_cents <= 0)) {
      return NextResponse.json({ error: "Set product prices first" }, { status: 400 });
    }

    const productMap = new Map(typedProducts.map((p) => [p.id, p]));

    const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map((i) => {
      const p = productMap.get(i.productId)!;
      return {
        price_data: {
          currency: "eur",
          product_data: { name: p.name },
          unit_amount: p.price_cents, // cents!
        },
        quantity: i.quantity,
      };
    });

    // Resolve baseUrl dynamically - never hardcode deployment URLs
    // CRITICAL: Reject vercel.app URLs at every step
    const requestOrigin = req.headers.get("origin");
    const envAppUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
    
    // Log what we're seeing for debugging
    console.log("[checkout/products] Resolving baseUrl:", {
      hasNextPublicAppUrl: !!process.env.NEXT_PUBLIC_APP_URL,
      nextPublicAppUrl: process.env.NEXT_PUBLIC_APP_URL,
      hasAppUrl: !!process.env.APP_URL,
      appUrl: process.env.APP_URL,
      requestOrigin: requestOrigin,
    });

    // Reject vercel.app URLs immediately - even from env vars
    if (envAppUrl && envAppUrl.includes("vercel.app")) {
      console.error("[checkout/products] NEXT_PUBLIC_APP_URL is set to a vercel.app URL (INVALID):", envAppUrl);
      throw new Error("NEXT_PUBLIC_APP_URL must be set to your production domain (e.g., https://eventyrperformance.com), not a Vercel deployment URL. Current value: " + envAppUrl);
    }

    if (requestOrigin && requestOrigin.includes("vercel.app")) {
      console.warn("[checkout/products] Request origin is vercel.app (will be rejected):", requestOrigin);
    }

    // Build baseUrl - NEVER use vercel.app URLs
    const baseUrl = envAppUrl || 
      (requestOrigin && !requestOrigin.includes("vercel.app") ? requestOrigin : null) ||
      null;

    // Final validation - reject vercel.app and localhost in production
    if (!baseUrl) {
      console.error("[checkout/products] Missing baseUrl. NEXT_PUBLIC_APP_URL must be set:", {
        hasNextPublicAppUrl: !!process.env.NEXT_PUBLIC_APP_URL,
        hasAppUrl: !!process.env.APP_URL,
        requestOrigin: requestOrigin,
        isVercelApp: requestOrigin?.includes("vercel.app"),
      });
      throw new Error("NEXT_PUBLIC_APP_URL environment variable must be set to your production domain (e.g., https://eventyrperformance.com). Cannot use vercel.app URLs or localhost.");
    }

    if (baseUrl.includes("vercel.app")) {
      console.error("[checkout/products] baseUrl contains vercel.app (should have been rejected):", baseUrl);
      throw new Error("NEXT_PUBLIC_APP_URL must be set to your production domain, not a Vercel deployment URL");
    }

    if (baseUrl === "http://localhost:3000") {
      console.error("[checkout/products] baseUrl is localhost (invalid for production):", baseUrl);
      throw new Error("NEXT_PUBLIC_APP_URL environment variable must be set to your production domain");
    }

    console.log("[checkout/products] Using baseUrl:", baseUrl);

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items,
      shipping_address_collection: { allowed_countries: EU_COUNTRIES },
      shipping_options: [{ shipping_rate: process.env.STRIPE_SHIPPING_EU_STANDARD! }],
      success_url: `${baseUrl}/api/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/cart`,
      metadata: { source: "products" },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message ?? "Checkout error" }, { status: 500 });
  }
}
