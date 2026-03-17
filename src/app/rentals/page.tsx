import { Suspense } from "react";
import RentalsClient from "./rentals-client";

export default function RentalsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-10 sm:space-y-14">
          <div className="card p-6 sm:p-8">Loading rentals...</div>
        </div>
      }
    >
      <RentalsClient />
    </Suspense>
  );
}
