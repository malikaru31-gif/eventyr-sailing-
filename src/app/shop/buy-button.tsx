"use client";

import { useState } from "react";

export default function BuyButton({ productId }: { productId: string }) {
  const [loading, setLoading] = useState(false);

  async function onBuy() {
    setLoading(true);
    try {
      const res = await fetch("/api/checkout/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: [{ productId, quantity: 1 }] }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        alert(data?.error ?? `Checkout failed (${res.status})`);
        return;
      }

      if (!data?.url) {
        alert("Checkout failed: no URL returned.");
        return;
      }

      window.location.assign(data.url);
    } catch (err: any) {
      alert(err?.message ?? "Client error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={onBuy}
      disabled={loading}
      className="rounded-lg border px-4 py-2 hover:bg-neutral-50 disabled:opacity-60"
    >
      {loading ? "Opening checkout..." : "Buy now"}
    </button>
  );
}
