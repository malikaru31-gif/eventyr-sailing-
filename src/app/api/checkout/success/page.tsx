export default async function SuccessPage({
    searchParams,
  }: {
    searchParams: Promise<{ session_id?: string }>;
  }) {
    const { session_id } = await searchParams;
  
    return (
      <main className="min-h-screen p-10">
        <div className="mx-auto max-w-xl space-y-4">
          <h1 className="text-3xl font-semibold">Payment successful ✅</h1>
          <p className="text-neutral-600">Thanks! Your order is confirmed.</p>
  
          <div className="rounded-lg border p-4">
            <div className="text-sm text-neutral-500">Stripe session_id</div>
            <div className="font-mono break-all">{session_id ?? "(missing)"}</div>
          </div>
  
          <a className="inline-block rounded-lg border px-4 py-2" href="/">
            Back to home
          </a>
        </div>
      </main>
    );
  }
  
  