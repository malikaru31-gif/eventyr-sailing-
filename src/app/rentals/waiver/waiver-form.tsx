"use client";

import { useState } from "react";
import Link from "next/link";

export default function WaiverForm({ bookingId }: { bookingId: string }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!bookingId) {
      alert("Missing booking ID.");
      return;
    }
    if (!accepted) {
      alert("Please accept the waiver terms.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/rentals/waiver", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: bookingId, full_name: fullName, email, accepted }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        alert(payload?.error ?? "Unable to submit waiver");
        return;
      }
      setDone(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Waiver signed</h1>
        <p className="text-neutral-600">
          Your RIB booking is confirmed. We sent a confirmation email with the details.
        </p>
        <Link
          href="/rentals"
          className="inline-flex items-center justify-center rounded-full border border-neutral-200 bg-white px-5 py-3 text-sm font-semibold text-neutral-900 hover:bg-neutral-50"
        >
          Back to rentals
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <div className="text-xs font-semibold tracking-[0.18em] text-neutral-600">RIB WAIVER</div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Sign waiver to confirm</h1>
        <p className="mt-2 text-neutral-600">
          Signing the waiver confirms your RIB booking without a reservation fee.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 rounded-3xl border border-neutral-200 bg-white p-6">
        <label className="block space-y-1">
          <div className="text-sm font-medium">Full name</div>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2"
            required
          />
        </label>
        <label className="block space-y-1">
          <div className="text-sm font-medium">Email</div>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2"
            required
          />
        </label>

        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">
          By signing this waiver, you acknowledge you are responsible for safe operation of the
          vessel, accept liability for your crew, and agree to the Eventyr RIB Charter terms.
        </div>

        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-neutral-300 text-black"
          />
          <span>I agree to the waiver and terms above.</span>
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex w-full items-center justify-center rounded-full bg-black px-6 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
        >
          {submitting ? "Submitting..." : "Sign waiver & confirm booking"}
        </button>
      </form>

      {!bookingId ? (
        <p className="text-sm text-red-600">Missing booking ID. Please use the link provided.</p>
      ) : null}
    </div>
  );
}
