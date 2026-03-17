export default function CartPage() {
    return (
      <main className="min-h-screen p-10">
        <div className="mx-auto max-w-xl space-y-4">
          <h1 className="text-3xl font-semibold">Cart</h1>
          <p className="text-neutral-600">
            If you canceled checkout, you’ll land here.
          </p>
  
          <a className="inline-block rounded-lg border px-4 py-2" href="/">
            Back to home
          </a>
        </div>
      </main>
    );
  }
  