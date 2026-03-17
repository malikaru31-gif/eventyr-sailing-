import Link from "next/link";
import Image from "next/image";
import EuropeRibMap from "@/components/europe-rib-map";

function FullBleed({ children }: { children: React.ReactNode }) {
  return <div className="mx-[calc(50%-50vw)] w-screen">{children}</div>;
}

function ServiceCard({
  eyebrow,
  title,
  subtitle,
  cta,
  href,
  imageSrc,
  imageAlt,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  cta: string;
  href: string;
  imageSrc?: string;
  imageAlt?: string;
}) {
  return (
    <Link
      href={href}
      className="group relative block overflow-hidden rounded-3xl bg-black transition-all duration-200 hover:-translate-y-1 hover:shadow-xl"
    >
      <div className="absolute inset-0">
        {imageSrc ? (
          <Image
            src={imageSrc}
            alt={imageAlt ?? title}
            fill
            sizes="(min-width: 1024px) 520px, 100vw"
            className="object-cover"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-800" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      </div>
      <div className="relative flex min-h-[320px] flex-col justify-end p-6 sm:min-h-[420px] sm:p-10">
        <div className="text-xs font-semibold tracking-widest text-white/70">{eyebrow}</div>
        <div className="mt-2 text-3xl font-semibold leading-tight text-white sm:text-4xl">{title}</div>
        <div className="mt-2 max-w-xl text-sm text-white/80 sm:text-base">{subtitle}</div>
        <div className="mt-5 inline-flex w-fit items-center gap-2 rounded-full bg-white/90 px-5 py-2.5 text-sm font-semibold text-neutral-900">
          {cta}
        </div>
      </div>
    </Link>
  );
}

export default function HomePage() {
  return (
    <div className="space-y-12 sm:space-y-16">
      {/* HERO */}
      <FullBleed>
        <section className="relative overflow-hidden border-b bg-black">
          <div className="absolute inset-0">
            <Image
              src="/Herorentals.jpg"
              alt="Eventyr Sailing Logistics"
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/50 to-black/30" />
          </div>

          <div className="relative flex w-full flex-col items-center justify-center px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
            <div className="w-full max-w-4xl flex flex-col items-center">
              <div className="text-center text-xs font-semibold tracking-widest text-white/70">
                EVENTYR SAILING LOGISTICS
              </div>
              <h1 className="mt-4 w-full max-w-2xl text-center text-3xl font-semibold leading-tight tracking-tight text-white sm:text-5xl">
                RIB charters, marks &amp; equipment
                <br />
                <span className="text-white/70">across Europe.</span>
              </h1>
              <p className="mt-4 max-w-xl text-center text-base text-white/70 sm:text-lg">
                Everything your regatta or training block needs on the water — delivered to your venue.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/rentals"
                  className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-neutral-900 shadow-sm ring-1 ring-black/10 transition hover:bg-neutral-50"
                >
                  Book a RIB charter
                </Link>
                <Link
                  href="/shop"
                  className="inline-flex items-center justify-center rounded-full bg-white/10 px-6 py-3 text-sm font-semibold text-white shadow-sm ring-1 ring-white/25 backdrop-blur transition hover:bg-white/15"
                >
                  Browse the shop
                </Link>
              </div>
            </div>
          </div>
        </section>
      </FullBleed>

      {/* RIB MAP */}
      <section className="w-full py-10 sm:py-14">
        <div className="grid w-full gap-[clamp(2.5rem,5vw,3rem)] lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <div className="flex flex-col items-center justify-center">
            <div className="space-y-5 w-full max-w-[min(100%,36rem)] flex flex-col items-center text-center">
              <div className="inline-flex items-center gap-2 rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold tracking-widest text-neutral-500">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500" />
                RIB CHARTER LOCATIONS
              </div>
              <h2 className="text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl leading-tight">
                8 venues from Portugal
                <br />
                <span className="text-neutral-400">to Denmark.</span>
              </h2>
              <p className="text-base leading-relaxed text-neutral-500 sm:text-lg max-w-[min(100%,28rem)]">
                Crew-ready RIBs for regattas, training blocks, and coach support.
                Flexible delivery with on-site driver options.
              </p>
              <Link
                href="/rentals"
                className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800"
              >
                Browse all locations
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="opacity-60">
                  <path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>
            </div>
          </div>
          <div className="relative w-full min-w-0 lg:flex lg:justify-end lg:-mr-8 xl:-mr-12">
            <div className="relative w-full min-w-[280px] max-w-[min(100%,28rem)] lg:min-w-[320px] lg:max-w-[min(100%,36rem)]">
              <EuropeRibMap />
            </div>
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section className="w-full space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-xs font-semibold tracking-widest text-neutral-600">SERVICES</div>
            <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">What we offer</h2>
          </div>
        </div>
        <div className="grid w-full gap-[clamp(1rem,2vw,1.5rem)] lg:grid-cols-2">
          <ServiceCard
            eyebrow="RIB CHARTER"
            title="RIB charter across Europe"
            subtitle="Reserve a crew-ready RIB for regattas, training blocks, or coach support."
            cta="Book a charter"
            href="/rentals"
            imageSrc="/Herorentals.jpg"
            imageAlt="RIB charter on the water"
          />
          <ServiceCard
            eyebrow="SHOP"
            title="Regatta Training Marks"
            subtitle="Professional marks for training blocks and regattas — built to last, easy to deploy."
            cta="Shop marks"
            href="/shop"
            imageSrc="/plastimo-regatta-mark-buoy-training__83145.jpg"
            imageAlt="Regatta training mark"
          />
          <ServiceCard
            eyebrow="SHOP / RENT"
            title="Wind Measurement Systems"
            subtitle="Get better decisions with consistent wind data — buy or request rental."
            cta="See wind systems"
            href="/shop"
            imageSrc="/Wind%20system.jpeg"
            imageAlt="Wind measurement system"
          />
          <div className="relative block overflow-hidden rounded-3xl bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl">
            <div className="flex min-h-[320px] flex-col justify-end p-6 sm:min-h-[420px] sm:p-10">
              <div className="text-xs font-semibold tracking-widest text-blue-300">PERFORMANCE PLATFORM</div>
              <div className="mt-2 text-3xl font-semibold leading-tight text-white sm:text-4xl">
                Track athlete performance
              </div>
              <div className="mt-2 max-w-xl text-sm text-blue-100 sm:text-base">
                Training load, Strava sync, coach dashboards, and live session tools — on Eventyr Performance.
              </div>
              <a
                href="https://www.eventyrperformance.com"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex w-fit items-center gap-2 rounded-full bg-white/90 px-5 py-2.5 text-sm font-semibold text-neutral-900"
              >
                Go to Eventyr Performance ↗
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
