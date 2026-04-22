"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type StaffMember = {
  id: string;
  fullName: string;
  roleTitle: string | null;
  avatarUrl: string | null;
  portfolioImages: string[];
};

type Props = {
  staffMembers: StaffMember[];
};

const MAX_PORTFOLIO = 10;

export function PublicStaffGrid({ staffMembers }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = staffMembers.find((member) => member.id === selectedId) ?? null;
  const portfolio = selected?.portfolioImages.slice(0, MAX_PORTFOLIO) ?? [];

  return (
    <div className="flex flex-col gap-8">
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        {staffMembers.map((member) => {
          const isSelected = member.id === selectedId;
          return (
            <li key={member.id}>
              <button
                type="button"
                onClick={() => setSelectedId(isSelected ? null : member.id)}
                aria-pressed={isSelected}
                className={cn(
                  "group relative block w-full overflow-hidden rounded-2xl border bg-card text-left transition",
                  "hover:-translate-y-0.5 hover:shadow-lg",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  isSelected ? "border-primary ring-2 ring-primary" : "border-border"
                )}
              >
                <div className="relative aspect-square w-full bg-muted">
                  {member.avatarUrl ? (
                    <Image
                      src={member.avatarUrl}
                      alt={member.fullName}
                      fill
                      sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                      className="object-cover"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-5xl font-semibold text-muted-foreground">
                      {member.fullName.charAt(0).toUpperCase()}
                    </span>
                  )}
                  {isSelected ? (
                    <span
                      aria-hidden
                      className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg"
                    >
                      <Check className="size-4" strokeWidth={3} />
                    </span>
                  ) : null}
                </div>
                <div className="p-3 text-center">
                  <p className="truncate text-sm font-semibold text-foreground">{member.fullName}</p>
                  {member.roleTitle ? (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{member.roleTitle}</p>
                  ) : null}
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      {selected && portfolio.length > 0 ? (
        <PortfolioCarousel staffName={selected.fullName} images={portfolio} />
      ) : null}
    </div>
  );
}

type PortfolioCarouselProps = {
  staffName: string;
  images: string[];
};

function PortfolioCarousel({ staffName, images }: PortfolioCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(images.length > 1);

  const refreshArrows = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  function scroll(direction: "left" | "right") {
    const el = scrollRef.current;
    if (!el) return;
    const step = el.clientWidth * 0.9;
    el.scrollBy({ left: direction === "left" ? -step : step, behavior: "smooth" });
  }

  return (
    <section aria-label={`Trabalhos de ${staffName}`} className="flex flex-col gap-3">
      <header className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground">Últimos trabalhos de {staffName}</h3>
        <p className="text-xs text-muted-foreground">{images.length} {images.length === 1 ? "foto" : "fotos"}</p>
      </header>
      <div className="relative">
        <div
          ref={scrollRef}
          onScroll={refreshArrows}
          className="scrollbar-hide flex snap-x snap-mandatory gap-3 overflow-x-auto rounded-2xl"
        >
          {images.map((src, idx) => (
            <div
              key={`${src}-${idx}`}
              className="relative aspect-square w-[70%] flex-none snap-start overflow-hidden rounded-xl bg-muted sm:w-[40%] lg:w-[25%]"
            >
              <Image
                src={src}
                alt={`Trabalho ${idx + 1} de ${staffName}`}
                fill
                sizes="(min-width: 1024px) 25vw, (min-width: 640px) 40vw, 70vw"
                className="object-cover"
              />
            </div>
          ))}
        </div>

        {images.length > 1 ? (
          <>
            <button
              type="button"
              onClick={() => scroll("left")}
              disabled={!canScrollLeft}
              aria-label="Anterior"
              className="absolute left-2 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/90 text-foreground shadow-md backdrop-blur transition hover:bg-background disabled:opacity-0"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => scroll("right")}
              disabled={!canScrollRight}
              aria-label="Próximo"
              className="absolute right-2 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/90 text-foreground shadow-md backdrop-blur transition hover:bg-background disabled:opacity-0"
            >
              <ChevronRight className="size-5" />
            </button>
          </>
        ) : null}
      </div>
    </section>
  );
}
