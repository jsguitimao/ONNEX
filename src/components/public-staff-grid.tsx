"use client";

import { useCallback, useEffect, useState } from "react";
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
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [touchPaused, setTouchPaused] = useState(false);

  const shouldAnimate = images.length > 1;
  // Duplicamos as imagens para o loop visual ser sem "salto"
  const loopedImages = shouldAnimate ? [...images, ...images] : images;

  return (
    <section aria-label={`Trabalhos de ${staffName}`} className="flex flex-col gap-3">
      <header className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground">Últimos trabalhos de {staffName}</h3>
        <p className="text-xs text-muted-foreground">{images.length} {images.length === 1 ? "foto" : "fotos"}</p>
      </header>
      <div className="relative overflow-hidden rounded-2xl">
        <div
          className={cn(
            "flex gap-3 will-change-transform",
            shouldAnimate && "animate-marquee",
            shouldAnimate && touchPaused && "animate-marquee-paused"
          )}
          style={{ width: shouldAnimate ? "max-content" : undefined }}
          onTouchStart={() => setTouchPaused(true)}
          onTouchEnd={() => setTouchPaused(false)}
        >
          {loopedImages.map((src, idx) => {
            const realIndex = idx % images.length;
            return (
              <button
                type="button"
                key={`${src}-${idx}`}
                onClick={() => setLightboxIndex(realIndex)}
                aria-hidden={idx >= images.length}
                aria-label={`Abrir trabalho ${realIndex + 1} em tamanho grande`}
                className="group relative aspect-square w-[70vw] max-w-[280px] flex-none cursor-zoom-in overflow-hidden rounded-xl bg-muted sm:w-[40vw] sm:max-w-[300px] lg:w-[25vw] lg:max-w-[320px]"
              >
                <Image
                  src={src}
                  alt={`Trabalho ${realIndex + 1} de ${staffName}`}
                  fill
                  sizes="(min-width: 1024px) 320px, (min-width: 640px) 300px, 70vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                />
              </button>
            );
          })}
        </div>
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
