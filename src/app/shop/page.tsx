import Image from "next/image";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import BuyButton from "./buy-button";

type Product = {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  active: boolean;
};

export default async function ShopPage() {
  try {
    if (!supabaseAdmin) {
      return <div className="space-y-2"><h1 className="text-3xl font-semibold">Shop</h1><p className="text-red-600">Shop is currently unavailable</p></div>;
    }

    const { data, error } = await supabaseAdmin
      .from("products")
      .select("id,name,description,price_cents,active")
      .eq("active", true)
      .order("created_at", { ascending: true })
      .limit(100); // Limit to prevent huge loads

    if (error) {
      console.error("Shop page error:", error);
      return (
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold">Shop</h1>
          <p className="text-red-600">Failed to load products: {error.message}</p>
          <p className="text-sm text-neutral-500 mt-2">Error code: {error.code || "unknown"}</p>
        </div>
      );
    }

    const products = (data ?? []) as Product[];

  return (
    <div className="space-y-10">
      <section className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div className="space-y-4">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
            Eventyr Shop
          </div>
          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
            Regatta Training Marks &amp; Wind Measurement Systems
          </h1>
          <p className="text-lg text-neutral-600 max-w-2xl">
            Race-proven tools for coaches and race teams. Built for fast setup, reliable
            data, and consistent training blocks.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="overflow-hidden rounded-2xl border bg-neutral-100 shadow-sm">
            <div className="relative aspect-[16/10] w-full">
              <Image
                src="/plastimo-regatta-mark-buoy-training__83145.jpg"
                alt="Regatta training mark on the water"
                fill
                sizes="(min-width: 1024px) 520px, 100vw"
                className="object-cover"
                priority
              />
            </div>
          </div>
          <div className="overflow-hidden rounded-2xl border bg-neutral-100 shadow-sm">
            <div className="relative aspect-[16/10] w-full">
              <Image
                src="/Wind%20system.jpeg"
                alt="Wind measurement system"
                fill
                sizes="(min-width: 1024px) 520px, 100vw"
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6">
        <div className="text-sm text-neutral-600">
          Products are being refreshed. Check back soon or contact us for availability.
        </div>
      </section>
    </div>
    );
  } catch (err: any) {
    console.error("Shop page exception:", err);
    return (
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">Shop</h1>
        <p className="text-red-600">An error occurred: {err?.message || "Unknown error"}</p>
      </div>
    );
  }
}
