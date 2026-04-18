"use client";

import { useCallback, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type PublicCarouselProps = {
  children: React.ReactNode[];
  accentColor: string;
};

export function PublicCarousel({ children, accentColor }: PublicCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(children.length > 3);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  function scroll(direction: "left" | "right") {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.clientWidth / Math.min(children.length, 3);
    el.scrollBy({
      left: direction === "left" ? -cardWidth : cardWidth,
      behavior: "smooth",
    });
  }

  if (children.length === 0) return null;

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className="scrollbar-hide flex snap-x snap-mandatory gap-5 overflow-x-auto sm:gap-6"
        style={{ scrollbarWidth: "none" }}
      >
        {children.map((child, idx) => (
          <div
            key={idx}
            className="w-[80%] flex-none snap-start sm:w-[calc(33.333%-16px)]"
          >
            {child}
          </div>
        ))}
      </div>

      {children.length > 3 && (
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => scroll("left")}
            disabled={!canScrollLeft}
            className="flex size-10 items-center justify-center rounded-full border border-white/20 text-white/70 transition hover:-translate-y-0.5 disabled:opacity-30 disabled:hover:translate-y-0"
            style={{
              ...(canScrollLeft ? { borderColor: accentColor, color: accentColor } : {}),
            }}
            aria-label="Anterior"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => scroll("right")}
            disabled={!canScrollRight}
            className="flex size-10 items-center justify-center rounded-full border border-white/20 text-white/70 transition hover:-translate-y-0.5 disabled:opacity-30 disabled:hover:translate-y-0"
            style={{
              ...(canScrollRight ? { borderColor: accentColor, color: accentColor } : {}),
            }}
            aria-label="Próximo"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
      )}
    </div>
  );
}
