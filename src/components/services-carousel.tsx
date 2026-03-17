"use client";

import { useRef, useCallback } from "react";

const SCROLL_AMOUNT = 360;
const HOVER_SCROLL_INTERVAL = 800;
const HOVER_SCROLL_STEP = 2;

export function ServicesCarousel({ children }: { children: React.ReactNode }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollLeft = useCallback(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: -SCROLL_AMOUNT, behavior: "smooth" });
  }, []);

  const scrollRight = useCallback(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: SCROLL_AMOUNT, behavior: "smooth" });
  }, []);

  const hoverScrollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startScrollLeft = useCallback(() => {
    if (hoverScrollRef.current) return;
    hoverScrollRef.current = setInterval(() => {
      if (!scrollRef.current) return;
      scrollRef.current.scrollBy({ left: -HOVER_SCROLL_STEP, behavior: "auto" });
    }, HOVER_SCROLL_INTERVAL);
  }, []);

  const startScrollRight = useCallback(() => {
    if (hoverScrollRef.current) return;
    hoverScrollRef.current = setInterval(() => {
      if (!scrollRef.current) return;
      scrollRef.current.scrollBy({ left: HOVER_SCROLL_STEP, behavior: "auto" });
    }, HOVER_SCROLL_INTERVAL);
  }, []);

  const stopHoverScroll = useCallback(() => {
    if (hoverScrollRef.current) {
      clearInterval(hoverScrollRef.current);
      hoverScrollRef.current = null;
    }
  }, []);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={scrollLeft}
        onMouseEnter={startScrollLeft}
        onMouseLeave={stopHoverScroll}
        aria-label="Scroll left"
        className="pointer-events-auto absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/40 bg-black/35 p-2 text-white/85 transition hover:bg-black/55 hover:text-white"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <button
        type="button"
        onClick={scrollRight}
        onMouseEnter={startScrollRight}
        onMouseLeave={stopHoverScroll}
        aria-label="Scroll right"
        className="pointer-events-auto absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/40 bg-black/35 p-2 text-white/85 transition hover:bg-black/55 hover:text-white"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div
        ref={scrollRef}
        className="overflow-x-auto pb-2 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
    </div>
  );
}
