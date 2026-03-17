"use client";

import { useState } from "react";

export default function RequestActions({ requestId }: { requestId: string }) {
  const [loading, setLoading] = useState(false);

  async function setStatus(status: "approved_awaiting_payment" | "declined" | "needs_info") {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/requests/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request_id: requestId, status }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        alert(data?.error ?? "Update failed");
        return;
      }

      window.location.reload();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        disabled={loading}
        className="rounded-lg border px-3 py-2 disabled:opacity-60"
        onClick={() => setStatus("approved_awaiting_payment")}
      >
        Approve (awaiting payment)
      </button>

      <button
        disabled={loading}
        className="rounded-lg border px-3 py-2 disabled:opacity-60"
        onClick={() => setStatus("needs_info")}
      >
        Needs info
      </button>

      <button
        disabled={loading}
        className="rounded-lg border px-3 py-2 disabled:opacity-60"
        onClick={() => setStatus("declined")}
      >
        Decline
      </button>
    </div>
  );
}
