"use client";

import { useState } from "react";

type AvailabilityRow = {
  id: string;
  start_at: string;
  end_at: string;
  location: string | null;
  quantity: number;
  inventory_total: number;
  event_name: string | null;
  event_code: string | null;
  pricing_mode: string | null;
  manual_daily_rate_cents: number | null;
  min_daily_rate_cents: number | null;
  max_daily_rate_cents: number | null;
  notes: string | null;
};

export default function AvailabilityList({ rows }: { rows: AvailabilityRow[] }) {
  const [items, setItems] = useState(rows);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function remove(id: string) {
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/rib-availability?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        alert(payload?.error ?? "Unable to delete");
        return;
      }
      setItems((prev) => prev.filter((item) => item.id !== id));
    } finally {
      setDeleting(null);
    }
  }

  if (!items.length) {
    return <p className="text-neutral-600">No availability windows yet.</p>;
  }

  return (
    <div className="grid gap-4">
      {items.map((row) => (
        <div key={row.id} className="rounded-2xl border border-neutral-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-semibold">
              {row.start_at} → {row.end_at}
            </div>
            <button
              className="text-xs font-semibold text-red-600 hover:underline disabled:opacity-60"
              disabled={deleting === row.id}
              onClick={() => remove(row.id)}
            >
              {deleting === row.id ? "Removing..." : "Remove"}
            </button>
          </div>
          <div className="mt-2 text-sm text-neutral-600">
            {row.location ?? "Any"} • {row.event_name ?? "Event"} • Inventory:{" "}
            {row.inventory_total} • Mode: {row.pricing_mode ?? "margin"}
          </div>
          <div className="mt-2 text-xs text-neutral-500">
            Manual rate:{" "}
            {row.manual_daily_rate_cents
              ? `€${(row.manual_daily_rate_cents / 100).toFixed(2)}`
              : "Dynamic"}{" "}
            • Min:{" "}
            {row.min_daily_rate_cents
              ? `€${(row.min_daily_rate_cents / 100).toFixed(2)}`
              : "—"}{" "}
            • Max:{" "}
            {row.max_daily_rate_cents
              ? `€${(row.max_daily_rate_cents / 100).toFixed(2)}`
              : "—"}
          </div>
          {row.notes ? <div className="mt-2 text-xs text-neutral-500">{row.notes}</div> : null}
        </div>
      ))}
    </div>
  );
}
