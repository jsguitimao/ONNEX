"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Check, ChevronLeft, ChevronRight, X } from "lucide-react";
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
  const [paused, setPaused] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const refreshArrows = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  const scroll = useCallback((direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const step = el.clientWidth * 0.9;
    el.scrollBy({ left: direction === "left" ? -step : step, behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (images.length < 2 || paused || lightboxIndex !== null) return;

    const interval = setInterval(() => {
      const el = scrollRef.current;
      if (!el) return;
      const reachedEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
      if (reachedEnd) {
        el.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        el.scrollBy({ left: el.clientWidth * 0.9, behavior: "smooth" });
      }
    }, 3500);

    return () => clearInterval(interval);
  }, [images.length, paused, lightboxIndex]);

  return (
    <section aria-label={`Trabalhos de ${staffName}`} className="flex flex-col gap-3">
      <header className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground">Últimos trabalhos de {staffName}</h3>
        <p className="text-xs text-muted-foreground">{images.length} {images.length === 1 ? "foto" : "fotos"}</p>
      </header>
      <div
        className="relative"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={() => setPaused(true)}
      >
        <div
          ref={scrollRef}
          onScroll={refreshArrows}
          className="scrollbar-hide flex snap-x snap-mandatory gap-3 overflow-x-auto rounded-2xl"
        >
          {images.map((src, idx) => (
            <button
              type="button"
              key={`${src}-${idx}`}
              onClick={() => setLightboxIndex(idx)}
              aria-label={`Abrir trabalho ${idx + 1} em tamanho grande`}
              className="group relative aspect-square w-[70%] flex-none cursor-zoom-in snap-start overflow-hidden rounded-xl bg-muted sm:w-[40%] lg:w-[25%]"
            >
              <Image
                src={src}
                alt={`Trabalho ${idx + 1} de ${staffName}`}
                fill
                sizes="(min-width: 1024px) 25vw, (min-width: 640px) 40vw, 70vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </button>
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

      {lightboxIndex !== null ? (
        <PortfolioLightbox
          images={images}
          startIndex={lightboxIndex}
          staffName={staffName}
          onClose={() => setLightboxIndex(null)}
        />
      ) : null}
    </section>
  );
}

type LightboxProps = {
  images: string[];
  startIndex: number;
  staffName: string;
  onClose: () => void;
};

function PortfolioLightbox({ images, startIndex, staffName, onClose }: LightboxProps) {
  const [index, setIndex] = useState(startIndex);

  const goPrev = useCallback(() => {
    setIndex((current) => (current - 1 + images.length) % images.length);
  }, [images.length]);

  const goNext = useCallback(() => {
    setIndex((current) => (current + 1) % images.length);
  }, [images.length]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") goPrev();
      if (event.key === "ArrowRight") goNext();
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose, goPrev, goNext]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Foto ${index + 1} de ${staffName}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Fechar"
        className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white transition hover:bg-black/70"
      >
        <X className="size-5" />
      </button>

      <div
        className="relative h-full max-h-[90vh] w-full max-w-5xl"
        onClick={(e) => e.stopPropagation()}
      >
        <Image
          src={images[index]}
          alt={`Trabalho ${index + 1} de ${staffName}`}
          fill
          sizes="100vw"
          priority
          className="object-contain"
        />

        {images.length > 1 ? (
          <>
            <button
              type="button"
              onClick={goPrev}
              aria-label="Anterior"
              className="absolute left-2 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white transition hover:bg-black/70"
            >
              <ChevronLeft className="size-6" />
            </button>
            <button
              type="button"
              onClick={goNext}
              aria-label="Próximo"
              className="absolute right-2 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white transition hover:bg-black/70"
            >
              <ChevronRight className="size-6" />
            </button>
          </>
        ) : null}

        <p className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs text-white">
          {index + 1} / {images.length}
        </p>
      </div>
    </div>
  );
}
