"use client";

import { useState } from "react";

export default function PaymentLink({ requestId }: { requestId: string }) {
  const [amount, setAmount] = useState<string>("");
  const [desc, setDesc] = useState<string>("Rental payment");
  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState<string | null>(null);

  async function createLink() {
    setLoading(true);
    setUrl(null);
    try {
      const amount_eur = Number(amount.replace(",", "."));

      const res = await fetch("/api/admin/requests/create-payment-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request_id: requestId, amount_eur, description: desc }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        alert(data?.error ?? `Failed (${res.status})`);
        return;
      }

      if (!data?.url) {
        alert("No URL returned from server.");
        return;
      }

      setUrl(data.url);
    } catch (e: any) {
      alert(e?.message ?? "Client error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border p-3 space-y-2">
      <div className="text-sm font-medium">Create payment link</div>

      <div className="grid gap-2 sm:grid-cols-3">
        <input
          className="rounded-lg border px-3 py-2"
          placeholder="Description"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
        />

        <input
          className="rounded-lg border px-3 py-2"
          placeholder="Amount (€)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="decimal"
        />

        <button
          className="rounded-lg border px-3 py-2 hover:bg-neutral-50 disabled:opacity-60"
          disabled={loading}
          onClick={createLink}
        >
          {loading ? "Creating..." : "Create link"}
        </button>
      </div>

      {url ? (
        <div className="space-y-2">
          <div className="text-xs text-neutral-500">Payment URL</div>
          <div className="font-mono text-xs break-all rounded-lg border p-2">{url}</div>

          <button
            className="rounded-lg border px-3 py-2"
            onClick={async () => {
              await navigator.clipboard.writeText(url);
              alert("Copied!");
            }}
          >
            Copy URL
          </button>
        </div>
      ) : null}
    </div>
  );
}
