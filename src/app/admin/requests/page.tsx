import { supabaseAdmin } from "@/lib/supabaseAdmin";
import RequestActions from "./actions";
import PaymentLink from "./payment-link";

type RequestRow = {
  id: string;
  type: string;
  status: string;
  start_at: string | null;
  end_at: string | null;
  location: string | null;
  details: any;
  created_at: string;
};

function RequestCard({
  r,
  showPayment,
}: {
  r: RequestRow;
  showPayment?: boolean;
}) {
  return (
    <div className="rounded-xl border p-4 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="font-semibold">{r.type}</div>
        <div className="text-sm text-neutral-600">{r.status}</div>
      </div>

      <div className="text-sm text-neutral-700">
        <div>
          <span className="text-neutral-500">When:</span> {r.start_at} → {r.end_at}
        </div>
        <div>
          <span className="text-neutral-500">Location:</span> {r.location ?? "-"}
        </div>
      </div>

      <div className="rounded-lg border p-3">
        <div className="text-xs text-neutral-500">Contact</div>
        <div className="text-sm">
          {r.details?.name ?? "-"} • {r.details?.email ?? "-"} • {r.details?.phone ?? "-"}
        </div>
        {r.details?.notes ? (
          <div className="text-sm text-neutral-600 mt-2">{r.details.notes}</div>
        ) : null}
      </div>

      <RequestActions requestId={r.id} />

      {showPayment ? <PaymentLink requestId={r.id} /> : null}

      <div className="text-xs text-neutral-500 font-mono break-all">id: {r.id}</div>
    </div>
  );
}

export default async function AdminRequestsPage() {
  if (!supabaseAdmin) {
    return <div>Admin access not configured</div>;
  }
  
  const { data, error } = await supabaseAdmin
    .from("requests")
    .select("id,type,status,start_at,end_at,location,details,created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return (
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">Admin – Requests</h1>
        <p className="text-red-600">{error.message}</p>
      </div>
    );
  }

  const rows = (data ?? []) as RequestRow[];
  const pending = rows.filter((r) => r.status === "pending");
  const awaitingPayment = rows.filter((r) => r.status === "approved_awaiting_payment");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold">Admin – Requests</h1>
        <p className="text-neutral-600">
          Pending: {pending.length} • Awaiting payment: {awaitingPayment.length}
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Pending</h2>
        {pending.map((r) => (
          <RequestCard key={r.id} r={r} />
        ))}
        {pending.length === 0 ? <p className="text-neutral-600">No pending requests.</p> : null}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Approved (awaiting payment)</h2>
        {awaitingPayment.map((r) => (
          <RequestCard key={r.id} r={r} showPayment />
        ))}
        {awaitingPayment.length === 0 ? (
          <p className="text-neutral-600">No approved requests awaiting payment.</p>
        ) : null}
      </section>
    </div>
  );
}
