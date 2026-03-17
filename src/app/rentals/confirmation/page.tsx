import Link from "next/link";

export default async function RentalConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ booking?: string; session_id?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Reservation fee received</h1>
      <p className="text-neutral-600">
        Thanks! We’re confirming your RIB booking. You’ll receive a confirmation email shortly.
      </p>
      <div className="rounded-2xl border border-neutral-200 bg-white p-4 text-sm text-neutral-700">
        <div>
          <span className="text-neutral-500">Booking:</span> {params.booking ?? "—"}
        </div>
        <div>
          <span className="text-neutral-500">Stripe session:</span> {params.session_id ?? "—"}
        </div>
      </div>
      <Link
        href="/rentals"
        className="inline-flex items-center justify-center rounded-full border border-neutral-200 bg-white px-5 py-3 text-sm font-semibold text-neutral-900 hover:bg-neutral-50"
      >
        Back to rentals
      </Link>
    </div>
  );
}
