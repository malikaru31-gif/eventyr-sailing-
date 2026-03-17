import { supabaseAdmin } from "@/lib/supabaseAdmin";
import AvailabilityForm from "./availability-form";
import AvailabilityList from "./availability-list";

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
  created_at: string;
};

export default async function RibAvailabilityPage() {
  if (!supabaseAdmin) {
    return <div>Admin access not configured</div>;
  }

  const { data, error } = await supabaseAdmin
    .from("rib_availability")
    .select(
      "id,start_at,end_at,location,quantity,inventory_total,event_name,event_code,pricing_mode,manual_daily_rate_cents,min_daily_rate_cents,max_daily_rate_cents,notes,created_at"
    )
    .order("start_at", { ascending: true });

  const { data: costProfileRows } = await supabaseAdmin
    .from("rib_cost_profile")
    .select(
      "id,depreciation_per_day_cents,maintenance_reserve_per_day_cents,insurance_per_day_cents,admin_overhead_per_day_cents,prep_turnaround_cents"
    )
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    return (
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">Admin – RIB availability</h1>
        <p className="text-red-600">{error.message}</p>
      </div>
    );
  }

  const rows = (data ?? []) as AvailabilityRow[];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold">Admin – RIB availability</h1>
        <p className="text-neutral-600">
          Add windows and daily rates to let the booking system auto-confirm availability.
        </p>
      </div>

      <AvailabilityForm costProfile={costProfileRows?.[0] ?? null} />
      <AvailabilityList rows={rows} />
    </div>
  );
}
