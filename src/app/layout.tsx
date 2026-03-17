import "./globals.css";
import type { Metadata } from "next";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import DevGateWrapper from "@/components/dev-gate-wrapper";

export const metadata: Metadata = {
  title: "Eventyr Sailing Logistics",
  description: "RIB Charter • Equipment Rental • Regatta Marks • Wind Systems",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gradient-to-b from-white to-neutral-50 text-neutral-900">
        <DevGateWrapper>
          <SiteHeader />
          <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            {children}
          </main>
          <SiteFooter />
        </DevGateWrapper>
      </body>
    </html>
  );
}
