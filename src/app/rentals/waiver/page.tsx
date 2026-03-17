import WaiverForm from "./waiver-form";

export default async function RibWaiverPage({
  searchParams,
}: {
  searchParams: Promise<{ booking?: string }>;
}) {
  const params = await searchParams;
  const bookingId = params.booking ?? "";

  return <WaiverForm bookingId={bookingId} />;
}
