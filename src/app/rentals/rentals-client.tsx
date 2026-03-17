"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type RentalType = "rib_rental" | "mark_rental" | "wind_rental";

type EventBlock = {
  id: string;
  start_at: string;
  end_at: string;
  location: string | null;
  event_name: string | null;
  event_code: string | null;
  timezone: string | null;
  inventory_total: number;
  manual_daily_rate_cents: number | null;
};

type QuoteResponse = {
  availability: number;
  reserved: number;
  inventory_total: number;
  days: number;
  cost_total: number;
  price_total: number;
  deposit: number;
  breakdown: { label: string; cents: number }[];
};

function RentalRequestForm() {
  const searchParams = useSearchParams();
  const [type, setType] = useState<RentalType>("rib_rental");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [location, setLocation] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [eventId, setEventId] = useState("");
  const [includeDriver, setIncludeDriver] = useState(false);

  const [events, setEvents] = useState<EventBlock[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [resultId, setResultId] = useState<string | null>(null);
  const [booking, setBooking] = useState<{
    id: string;
    total_cents: number;
    deposit_cents: number;
    hold_expires_at: string | null;
  } | null>(null);

  const locationParam = (searchParams.get("location") || "").trim();

  useEffect(() => {
    if (!locationParam) return;
    setType("rib_rental");
    setLocation(locationParam);
  }, [locationParam]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/rentals/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          start_at: start ? new Date(start).toISOString() : null,
          end_at: end ? new Date(end).toISOString() : null,
          location,
          quantity,
          event_id: type === "rib_rental" ? eventId : null,
          include_driver: type === "rib_rental" ? includeDriver : null,
          name,
          email,
          phone,
          notes,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        alert(data?.error ?? `Request failed (${res.status})`);
        return;
      }

      if (data?.mode === "rib_booking") {
        setBooking({
          id: data.booking_id,
          total_cents: data.total_cents ?? 0,
          deposit_cents: data.deposit_cents ?? 0,
          hold_expires_at: data.hold_expires_at ?? null,
        });
        return;
      }

      setResultId(data.request_id);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadEvents() {
      if (type !== "rib_rental") return;
      setEventsLoading(true);
      try {
        const res = await fetch("/api/rentals/events");
        const payload = await res.json().catch(() => null);
        if (!res.ok) {
          setEvents([]);
          return;
        }
        if (!cancelled) {
          setEvents((payload?.events as EventBlock[]) ?? []);
        }
      } finally {
        if (!cancelled) setEventsLoading(false);
      }
    }

    loadEvents();

    return () => {
      cancelled = true;
    };
  }, [type]);

  useEffect(() => {
    if (type !== "rib_rental") return;
    if (!locationParam) return;
    if (!events.length) return;
    if (eventId) return;
    const needle = locationParam.toLowerCase();
    const match = events.find((event) => (event.location ?? "").toLowerCase().includes(needle));
    if (match) {
      setEventId(match.id);
    }
  }, [type, locationParam, events, eventId]);

  useEffect(() => {
    let cancelled = false;

    async function loadQuote() {
      if (type !== "rib_rental") return;
      if (!eventId || !start || !end || quantity <= 0) {
        setQuote(null);
        setQuoteError(null);
        return;
      }

      setQuoteError(null);
      const res = await fetch("/api/rentals/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: eventId,
          start_at: new Date(start).toISOString(),
          end_at: new Date(end).toISOString(),
          quantity,
          include_driver: includeDriver,
          customer_email: email || null,
        }),
      });
      const payload = await res.json().catch(() => null);
      if (cancelled) return;
      if (!res.ok) {
        setQuote(null);
        setQuoteError(payload?.error ?? "Unable to generate quote");
        return;
      }
      setQuote({
        availability: payload.availability,
        reserved: payload.reserved,
        inventory_total: payload.inventory_total,
        days: payload.days,
        cost_total: payload.cost_total,
        price_total: payload.price_total,
        deposit: payload.deposit,
        breakdown: payload.breakdown ?? [],
      });
    }

    loadQuote();

    return () => {
      cancelled = true;
    };
  }, [type, eventId, start, end, quantity, includeDriver, email]);

  if (booking) {
    const totalEur = (booking.total_cents / 100).toFixed(2);
    const depositEur = (booking.deposit_cents / 100).toFixed(2);

    return (
      <div className="card p-6 sm:p-8 space-y-5">
        <div className="space-y-2">
          <div className="text-xl font-semibold">Availability confirmed</div>
          <p className="text-neutral-600">
            To secure the RIB, pay a 20% reservation fee or sign the waiver online.
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-4">
          <div className="text-xs text-neutral-500">Booking ID</div>
          <div className="font-mono break-all text-sm text-neutral-900">{booking.id}</div>
          <div className="mt-3 text-sm text-neutral-700">
            Total estimate: <span className="font-semibold">€{totalEur}</span> •
            Reservation fee (20%): <span className="font-semibold">€{depositEur}</span>
          </div>
          {booking.hold_expires_at ? (
            <div className="mt-2 text-xs text-neutral-500">
              Hold expires at {new Date(booking.hold_expires_at).toLocaleString()}.
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-full bg-black px-6 py-3 text-sm font-semibold text-white hover:opacity-90"
            onClick={async () => {
              setLoading(true);
              try {
                const res = await fetch("/api/rentals/deposit", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ booking_id: booking.id }),
                });
                const payload = await res.json().catch(() => null);
                if (!res.ok || !payload?.url) {
                  alert(payload?.error ?? "Unable to start payment");
                  return;
                }
                window.location.href = payload.url;
              } finally {
                setLoading(false);
              }
            }}
          >
            {loading ? "Redirecting..." : "Pay reservation fee"}
          </button>
          <a
            href={`/rentals/waiver?booking=${booking.id}`}
            className="inline-flex items-center justify-center rounded-full border border-neutral-200 bg-white px-6 py-3 text-sm font-semibold text-neutral-900 hover:bg-neutral-50"
          >
            Sign waiver online
          </a>
        </div>

        <button
          className="inline-flex items-center justify-center rounded-full border border-neutral-200 bg-white px-5 py-3 text-sm font-semibold text-neutral-900 hover:bg-neutral-50"
          onClick={() => {
            setBooking(null);
            setResultId(null);
            setStart("");
            setEnd("");
            setLocation("");
            setQuantity(1);
            setEventId("");
            setIncludeDriver(false);
            setQuote(null);
            setQuoteError(null);
            setName("");
            setEmail("");
            setPhone("");
            setNotes("");
            setType("rib_rental");
          }}
        >
          Create another request
        </button>
      </div>
    );
  }

  if (resultId) {
    return (
      <div className="card p-6 sm:p-8 space-y-4">
        <div className="text-xl font-semibold">Request submitted ✅</div>
        <p className="text-neutral-600">
          We’ll review availability and send an approval + payment link.
        </p>

        <div className="rounded-2xl border border-neutral-200 bg-white p-4">
          <div className="text-xs text-neutral-500">Request ID</div>
          <div className="font-mono break-all text-sm text-neutral-900">{resultId}</div>
        </div>

        <button
          className="inline-flex items-center justify-center rounded-full border border-neutral-200 bg-white px-5 py-3 text-sm font-semibold text-neutral-900 hover:bg-neutral-50"
          onClick={() => {
            setResultId(null);
            setStart("");
            setEnd("");
            setLocation("");
            setQuantity(1);
            setEventId("");
            setIncludeDriver(false);
            setQuote(null);
            setQuoteError(null);
            setName("");
            setEmail("");
            setPhone("");
            setNotes("");
            setType("rib_rental");
          }}
        >
          Create another request
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl bg-white shadow-sm p-6 sm:p-8 space-y-6">
      <div>
        <div className="text-xs font-semibold tracking-[0.18em] text-neutral-600">
          REQUEST FORM
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
          RIB Charter & Equipment Rental
        </h1>
        <p className="mt-2 text-neutral-600">
          Submit your request — we’ll confirm availability and send an approval + payment link.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1">
          <div className="text-sm font-medium">Rental type</div>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as RentalType)}
            className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2"
          >
            <option value="rib_rental">RIB Charter</option>
            <option value="mark_rental">Regatta Marks Rental</option>
            <option value="wind_rental">Wind System Rental</option>
          </select>
        </label>

        <label className="space-y-1">
          <div className="text-sm font-medium">Quantity</div>
          <input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2"
          />
        </label>

        {type === "rib_rental" ? (
          <label className="space-y-1 sm:col-span-2">
            <div className="text-sm font-medium">Event block</div>
            <select
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2"
              required
            >
              <option value="">
                {eventsLoading
                  ? "Loading events..."
                  : events.length
                  ? "Select event"
                  : "No events available"}
              </option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {(event.location ?? "Event") +
                    " • " +
                    (event.event_name ?? "Event") +
                    " • " +
                    new Date(event.start_at).toLocaleDateString() +
                    " → " +
                    new Date(event.end_at).toLocaleDateString() +
                    " • " +
                    event.inventory_total +
                    " RIBs"}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label className="space-y-1">
          <div className="text-sm font-medium">Start *</div>
          <input
            type="datetime-local"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2"
            required
          />
        </label>

        <label className="space-y-1">
          <div className="text-sm font-medium">End *</div>
          <input
            type="datetime-local"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2"
            required
          />
        </label>

        {type !== "rib_rental" ? (
          <label className="space-y-1 sm:col-span-2">
            <div className="text-sm font-medium">Location</div>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2"
              placeholder="e.g. Garda / Palma / Portimão"
            />
          </label>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1">
          <div className="text-sm font-medium">Name</div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2"
            placeholder="Full name"
          />
        </label>

        <label className="space-y-1">
          <div className="text-sm font-medium">Email *</div>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2"
            placeholder="you@team.com"
          />
        </label>

        <label className="space-y-1">
          <div className="text-sm font-medium">Phone</div>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2"
            placeholder="+31..."
          />
        </label>

        <label className="space-y-1 sm:col-span-2">
          <div className="text-sm font-medium">Notes</div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2"
            rows={4}
            placeholder="Any requirements, delivery/pickup details, event name, etc."
          />
        </label>
      </div>

      {type === "rib_rental" ? (
        <div className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-4">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={includeDriver}
              onChange={(e) => setIncludeDriver(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-300 text-black"
            />
            Include on-site driver
          </label>

          {quoteError ? <div className="text-sm text-red-600">{quoteError}</div> : null}
          {quote ? (
            <div className="space-y-2 text-sm text-neutral-700">
              <div>
                Total: <span className="font-semibold">€{(quote.price_total / 100).toFixed(2)}</span>
                {" • "}
                Deposit (20%):{" "}
                <span className="font-semibold">€{(quote.deposit / 100).toFixed(2)}</span>
              </div>
              <div className="text-xs text-neutral-500">
                Availability: {quote.availability} / {quote.inventory_total} RIBs • {quote.days} day
                {quote.days === 1 ? "" : "s"}
              </div>
              <div className="divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-neutral-50">
                {quote.breakdown.map((line) => (
                  <div key={line.label} className="flex items-center justify-between px-3 py-2 text-xs">
                    <span>{line.label}</span>
                    <span>€{(line.cents / 100).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-xs text-neutral-500">Enter event + dates to see pricing.</div>
          )}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={loading || (type === "rib_rental" && !quote)}
        className="inline-flex items-center justify-center rounded-full bg-black px-6 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
      >
        {loading ? "Submitting..." : type === "rib_rental" ? "Reserve RIB" : "Submit request"}
      </button>
    </form>
  );
}

export default function RentalsClient() {
  return (
    <div className="space-y-10 sm:space-y-14">
      {/* HERO */}
      <section className="overflow-hidden rounded-3xl border border-black/10 bg-neutral-950">
        <div className="relative px-6 py-10 sm:px-10 sm:py-12">
          <div className="absolute inset-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/Herorentals.jpg"
              alt="RIB charter hero"
              className="h-full w-full object-cover object-bottom"
              style={{ objectPosition: "50% 85%" }}
            />
            <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/35 to-black/10" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-black/10" />
          </div>

          <div className="relative max-w-3xl">
            <p className="text-xs font-semibold tracking-[0.18em] text-white/80">
              EVENTYR RIB CHARTERS
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-4xl">
              High-quality RIBs. Simple logistics.
            </h2>
            <p className="mt-4 text-base text-white/75 sm:text-lg">
              Flexible delivery across Europe — and a fleet prepared for coaching needs.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="#faq"
                className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-neutral-900 hover:bg-white/90"
              >
                Read FAQ
              </a>
              <a
                href="#reviews"
                className="inline-flex items-center justify-center rounded-full border border-white/25 bg-white/10 px-6 py-3 text-sm font-semibold text-white hover:bg-white/15"
              >
                See reviews
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Booking form */}
      <RentalRequestForm />

      {/* RIB Gallery */}
      <section className="space-y-4">
        <div className="text-xs font-semibold tracking-[0.18em] text-neutral-600">FLEET</div>
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Our RIB Fleet
        </h2>
        <p className="text-neutral-600">
          5.8m RIBs with 90hp Yamaha 4-stroke engines — professionally maintained and ready for coaching.
        </p>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-6">
          <div className="group relative overflow-hidden rounded-2xl border border-neutral-200 bg-white">
            <div className="relative aspect-[4/3] w-full bg-neutral-100">
              <img
                src="/Rib Fleet.jpeg"
                alt="Professional RIB fleet"
                className="h-full w-full object-cover transition-transform group-hover:scale-105"
                onError={(e) => {
                  const img = e.currentTarget as HTMLImageElement;
                  img.src = "/Herorentals.jpg";
                  img.onerror = null; // Prevent infinite loop
                }}
              />
            </div>
            <div className="p-4">
              <div className="text-sm font-semibold text-neutral-900">Professional RIB Fleet</div>
              <div className="mt-1 text-xs text-neutral-600">5.8m with Yamaha 90hp engine</div>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl border border-neutral-200 bg-white">
            <div className="relative aspect-[4/3] w-full bg-neutral-100">
              <img
                src="/Ready for action.jpg"
                alt="Ready for action"
                className="h-full w-full object-cover transition-transform group-hover:scale-105"
                onError={(e) => {
                  const img = e.currentTarget as HTMLImageElement;
                  img.src = "/Herorentals.jpg";
                  img.onerror = null;
                }}
              />
            </div>
            <div className="p-4">
              <div className="text-sm font-semibold text-neutral-900">Ready for Action</div>
              <div className="mt-1 text-xs text-neutral-600">Fully equipped and maintained</div>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl border border-neutral-200 bg-white">
            <div className="relative aspect-[4/3] w-full bg-neutral-100">
              <img
                src="/service eventyr.jpeg"
                alt="Support and safety"
                className="h-full w-full object-cover transition-transform group-hover:scale-105"
                onError={(e) => {
                  const img = e.currentTarget as HTMLImageElement;
                  img.src = "/Herorentals.jpg";
                  img.onerror = null;
                }}
              />
            </div>
            <div className="p-4">
              <div className="text-sm font-semibold text-neutral-900">Support and Safety</div>
              <div className="mt-1 text-xs text-neutral-600">Professional support available</div>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl border border-neutral-200 bg-white">
            <div className="relative aspect-[4/3] w-full bg-neutral-100">
              <img
                src="/transport.jpeg"
                alt="Port operations"
                className="h-full w-full object-cover transition-transform group-hover:scale-105"
                onError={(e) => {
                  const img = e.currentTarget as HTMLImageElement;
                  img.src = "/Herorentals.jpg";
                  img.onerror = null;
                }}
              />
            </div>
            <div className="p-4">
              <div className="text-sm font-semibold text-neutral-900">Port Operations</div>
              <div className="mt-1 text-xs text-neutral-600">Easy delivery and pickup</div>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl border border-neutral-200 bg-white">
            <div className="relative aspect-[4/3] w-full bg-neutral-100">
              <img
                src="/Yamaha.jpg"
                alt="Yamaha 90hp engine"
                className="h-full w-full object-cover transition-transform group-hover:scale-105"
                onError={(e) => {
                  const img = e.currentTarget as HTMLImageElement;
                  img.src = "/Herorentals.jpg";
                  img.onerror = null;
                }}
              />
            </div>
            <div className="p-4">
              <div className="text-sm font-semibold text-neutral-900">Yamaha 90hp Engine</div>
              <div className="mt-1 text-xs text-neutral-600">Reliable 4-stroke power</div>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl border border-neutral-200 bg-white">
            <div className="relative aspect-[4/3] w-full bg-neutral-100">
              <img
                src="/Professional Handling.jpeg"
                alt="Professional handling"
                className="h-full w-full object-cover transition-transform group-hover:scale-105"
                onError={(e) => {
                  const img = e.currentTarget as HTMLImageElement;
                  img.src = "/Herorentals.jpg";
                  img.onerror = null;
                }}
              />
            </div>
            <div className="p-4">
              <div className="text-sm font-semibold text-neutral-900">Professional Handling</div>
              <div className="mt-1 text-xs text-neutral-600">Expert delivery and setup</div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="rounded-2xl bg-white shadow-sm p-6 sm:p-8">
        <div className="space-y-2">
          <div className="text-xs font-semibold tracking-[0.18em] text-neutral-600">FAQ</div>
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Frequently asked questions
          </h2>
          <p className="text-neutral-600">
            Quick answers about our RIB charter service.
          </p>
        </div>

        <div className="mt-6 divide-y divide-neutral-200 rounded-2xl bg-white">
          <details className="group p-5" open>
            <summary className="cursor-pointer list-none text-base font-semibold text-neutral-900">
              Why choose Eventyr Rib Charters?
              <span className="float-right text-neutral-500 transition group-open:rotate-180">⌄</span>
            </summary>
            <p className="mt-3 text-sm text-neutral-700">
              Eventyr Rib Charters is dedicated to providing high-quality RIBs at the most affordable prices on the market. Our fleet is well-maintained, and we offer flexible delivery options free of charge across Europe to ensure a seamless experience for our customers.
            </p>
          </details>

          <details className="group p-5">
            <summary className="cursor-pointer list-none text-base font-semibold text-neutral-900">
              What is a RIB (Rigid Inflatable Boat)?
              <span className="float-right text-neutral-500 transition group-open:rotate-180">⌄</span>
            </summary>
            <p className="mt-3 text-sm text-neutral-700">
              A RIB, or Rigid Inflatable Boat, is a type of watercraft with a rigid hull and inflatable tubes. It combines the stability of a hard hull with the buoyancy of inflatable tubes, making it versatile and suitable for various water activities. The ribs offered by Eventyr Rib Charters are 5.8m long with a 90hp Yamaha 4-stroke outboard engine. These ribs are tailored to suit the needs of sailing coaches to the minute detail.
            </p>
          </details>

          <details className="group p-5">
            <summary className="cursor-pointer list-none text-base font-semibold text-neutral-900">
              How can I book a RIB charter with Eventyr?
              <span className="float-right text-neutral-500 transition group-open:rotate-180">⌄</span>
            </summary>
            <p className="mt-3 text-sm text-neutral-700">
              Booking with us is easy! Simply visit our website and navigate to the "Locations" section. Click on one of the locations and you'll be prompted with a form, fill in the form and thats it now just wait for a confirmation.
            </p>
          </details>

          <details className="group p-5">
            <summary className="cursor-pointer list-none text-base font-semibold text-neutral-900">
              Are fuel costs included in the charter fee?
              <span className="float-right text-neutral-500 transition group-open:rotate-180">⌄</span>
            </summary>
            <p className="mt-3 text-sm text-neutral-700">
              No, fuel costs are not included in the charter fee. You are responsible for refueling the RIB upon return, and we provide clear instructions on the fueling process. The RIB will be supplied with a full tank.
            </p>
          </details>

          <details className="group p-5">
            <summary className="cursor-pointer list-none text-base font-semibold text-neutral-900">
              What safety measures are in place?
              <span className="float-right text-neutral-500 transition group-open:rotate-180">⌄</span>
            </summary>
            <p className="mt-3 text-sm text-neutral-700">
              Safety is our top priority. Our RIBs are equipped with all necessary safety gear. Additionally, our team is available to assist with any questions or concerns you may have throughout your rental period.
            </p>
          </details>

          <details className="group p-5">
            <summary className="cursor-pointer list-none text-base font-semibold text-neutral-900">
              Can I cancel or modify my reservation?
              <span className="float-right text-neutral-500 transition group-open:rotate-180">⌄</span>
            </summary>
            <p className="mt-3 text-sm text-neutral-700">
              Yes, you can modify or cancel your reservation, but please refer to our cancellation policy for details. We understand that plans may change, and we strive to accommodate our customers to the best of our ability.
            </p>
          </details>

          <details className="group p-5">
            <summary className="cursor-pointer list-none text-base font-semibold text-neutral-900">
              How do I contact Eventyr Rib Charters for additional assistance?
              <span className="float-right text-neutral-500 transition group-open:rotate-180">⌄</span>
            </summary>
            <p className="mt-3 text-sm text-neutral-700">
              For any further assistance or inquiries, please visit our "Contact Us" Section on the website. Our customer support team is ready to assist you with any questions or concerns you may have.
            </p>
          </details>
        </div>
      </section>

      {/* REVIEWS */}
      <section id="reviews" className="rounded-2xl bg-white shadow-sm p-6 sm:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <div className="text-xs font-semibold tracking-[0.18em] text-neutral-600">REVIEWS</div>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              What customers say
            </h2>
            <p className="text-neutral-600">
              Google reviews (link below). We can later automate these via the Google Places API.
            </p>
          </div>

          <a
            href="https://share.google/RPeepvcwtfKwTi2Zt"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-full bg-black px-5 py-3 text-sm font-semibold text-white hover:opacity-90"
          >
            View on Google
          </a>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl bg-white p-5">
            <div className="text-sm font-semibold">★★★★★</div>
            <p className="mt-3 text-sm text-neutral-700">
              “Fast delivery and super well-maintained RIB. Exactly what we needed for coaching.”
            </p>
            <div className="mt-4 text-xs font-semibold text-neutral-500">Google review</div>
          </div>
          <div className="rounded-3xl bg-white p-5">
            <div className="text-sm font-semibold">★★★★★</div>
            <p className="mt-3 text-sm text-neutral-700">
              “Easy booking, clear communication, and the boat performed perfectly.”
            </p>
            <div className="mt-4 text-xs font-semibold text-neutral-500">Google review</div>
          </div>
          <div className="rounded-3xl bg-white p-5">
            <div className="text-sm font-semibold">★★★★★</div>
            <p className="mt-3 text-sm text-neutral-700">
              “Best value RIB charter we’ve used in Europe — professional and flexible.”
            </p>
            <div className="mt-4 text-xs font-semibold text-neutral-500">Google review</div>
          </div>
        </div>
      </section>
    </div>
  );
}
