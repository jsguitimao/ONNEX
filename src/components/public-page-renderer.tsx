"use client";

// Renderer unico da pagina publica. Usado por:
// - /[slug]/page.tsx (modo "live", DB -> ViewModel via fromPublicBusiness)
// - bio-render.tsx (EditorDraft -> ViewModel via fromEditorDraft)
//
// Single source of truth visual: o que o editor mostra e o que o cliente final ve.

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, ChevronRight, Copy, X } from "lucide-react";
import { Drawer } from "@base-ui/react/drawer";
import { useBookingSheetOptional } from "@/components/booking-sheet";
import { BioSelectionTick } from "@/components/bio-selection-tick";
import { canOptimizeImageUrl } from "@/lib/image-optimization";
import { formatEuro } from "@/lib/formatters";
import type { PublicPageViewModel } from "@/lib/public-page/types";

// Triple drop-shadow do front validado (--shadow-card). Mesmo valor nos dois temas.
const CARD_SHADOW =
  "0 0.5px 1px rgba(0, 0, 0, 0.04), 0 4px 8px rgba(0, 0, 0, 0.04), 0 16px 32px rgba(0, 0, 0, 0.06)";

type Props = {
  viewModel: PublicPageViewModel;
};

type Theme = "dark" | "light";

const FEATURED_SERVICES_COUNT = 7;
const FEATURED_GALLERY_COUNT = 6;
const sectionActionStyle = {
  fontSize: "var(--text-bio-label)",
  lineHeight: "var(--text-bio-label-line)",
  letterSpacing: "var(--text-bio-label-tracking)",
} as const;

type Palette = {
  pageBg: string;
  pageText: string;
  cardBg: string;
  cardShadow: string;
  cardBorderFaint: string;
  heroBg: string;
  heroFade: string;
  subtleText: string;
  staffPlaceholder: string;
  galleryPlaceholder: string;
  mapBg: string;
  mapColorScheme: "dark" | "light";
  buttonBorder: string;
  buttonBg: string;
  buttonHoverBorder: string;
  buttonHoverBg: string;
  footerSubtle: string;
};

// Valores neutros portados do front validado (tokens em src/app/globals.css do
// barber-bio-main): background #0A0A0A, card #141414, overlay white/0.04,
// border #383838, skeleton #2D2D2D, muted-foreground #A6A6A6 (e equivalentes light).
const PALETTES: Record<Theme, Palette> = {
  dark: {
    pageBg: "bg-[#0a0a0a]",
    pageText: "text-[#fcfcfc]",
    cardBg: "bg-[#141414]",
    cardShadow: CARD_SHADOW,
    cardBorderFaint: "border-white/[0.06]",
    heroBg: "bg-[#141414]",
    heroFade: "#141414",
    subtleText: "text-[#a6a6a6]",
    staffPlaceholder: "bg-[#2d2d2d]",
    galleryPlaceholder: "bg-[#2d2d2d]",
    mapBg: "bg-[#1a1a1a]",
    mapColorScheme: "dark",
    buttonBorder: "border-[#383838]",
    buttonBg: "bg-white/[0.04]",
    buttonHoverBorder: "hover:border-white/[0.24]",
    buttonHoverBg: "hover:bg-white/[0.08]",
    footerSubtle: "text-[#8c8c8c]",
  },
  light: {
    pageBg: "bg-[#fafafa]",
    pageText: "text-[#141414]",
    cardBg: "bg-[#f0f0f0]",
    cardShadow: CARD_SHADOW,
    cardBorderFaint: "border-black/[0.06]",
    heroBg: "bg-[#f0f0f0]",
    heroFade: "#f0f0f0",
    subtleText: "text-[#737373]",
    staffPlaceholder: "bg-[#e8e8e8]",
    galleryPlaceholder: "bg-[#e8e8e8]",
    mapBg: "bg-[#f0f0f0]",
    mapColorScheme: "light",
    buttonBorder: "border-[#e8e8e8]",
    buttonBg: "bg-black/[0.04]",
    buttonHoverBorder: "hover:border-black/[0.24]",
    buttonHoverBg: "hover:bg-black/[0.08]",
    footerSubtle: "text-[#737373]",
  },
};

export function PublicPageRenderer({ viewModel }: Props) {
  const palette = PALETTES[viewModel.theme];
  const sheet = useBookingSheetOptional();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const services = viewModel.services;
  const staffMembers = viewModel.staffMembers;
  const galleryImages = viewModel.galleryImages;
  const phoneDigits = viewModel.socials.phoneDigits;

  const tabs = [
    { label: "Serviços", href: "#servicos" },
    ...(viewModel.showTeam ? [{ label: "Equipa", href: "#equipa" }] : []),
    ...(viewModel.onlineBooking ? [{ label: "Agendar", href: "#agendar" }] : []),
  ];

  const canOpenBooking = viewModel.onlineBooking && sheet !== null;

  function handleTabClick(event: React.MouseEvent<HTMLAnchorElement>, href: string) {
    if (href === "#agendar" && canOpenBooking) {
      event.preventDefault();
      sheet?.open();
    }
  }

  function handleServiceClick(serviceId: string) {
    if (canOpenBooking) sheet?.open(serviceId);
  }

  return (
    <main
      data-theme={viewModel.theme}
      className={`min-h-screen ${palette.pageBg} ${palette.pageText}`}
    >
      <div className="mx-auto w-full sm:max-w-[460px] sm:py-10">
        <div
          className={`${palette.cardBg} min-h-screen sm:min-h-0 sm:overflow-hidden sm:rounded-2xl sm:border ${palette.cardBorderFaint} sm:shadow-[var(--bio-card-shadow)]`}
          style={{ ["--bio-card-shadow"]: palette.cardShadow } as React.CSSProperties}
        >
          {/* 1. Hero */}
          {viewModel.hero ? (
            <HeroBlock hero={viewModel.hero} alt={viewModel.name} palette={palette} />
          ) : null}

          <div className="flex flex-col gap-4 pb-4 pt-4">
            {/* 2. Nome + headline + descrição */}
            <header className="flex flex-col items-center px-4 text-center">
              <h1
                className="font-bold"
                style={{ fontSize: "34px", lineHeight: "41px", letterSpacing: "-0.4px" }}
              >
                {viewModel.name || "—"}
              </h1>
              {viewModel.headline ? (
                <p className={`mt-2 text-[15px] font-medium leading-5 ${palette.subtleText}`}>
                  {viewModel.headline}
                </p>
              ) : null}
              {viewModel.description ? (
                <p className={`mt-3 max-w-[36ch] text-[14px] leading-[1.5] ${palette.subtleText}`}>
                  {viewModel.description}
                </p>
              ) : null}
            </header>

            {/* 3. Redes sociais */}
            <SocialIcons
              phoneDigits={phoneDigits}
              instagramUrl={viewModel.socials.instagramUrl}
              tiktokUrl={viewModel.socials.tiktokUrl}
              facebookUrl={viewModel.socials.facebookUrl}
              palette={palette}
            />

            {/* 4. Tabs (anchors; "Agendar" abre o booking sheet quando existe provider) */}
            {tabs.length > 0 ? (
              <nav aria-label="Navegação rápida" className="overflow-x-auto px-2">
                <ul className="flex min-w-max items-center justify-center gap-1">
                  {tabs.map((tab) => (
                    <li key={tab.label}>
                      <a
                        href={tab.href}
                        onClick={(event) => handleTabClick(event, tab.href)}
                        className={`inline-flex h-11 items-center rounded-full px-4 text-[15px] font-semibold tracking-[-0.2px] transition active:scale-[0.97] ${palette.subtleText} ${palette.buttonHoverBg} ${
                          viewModel.theme === "dark"
                            ? "hover:text-[#fcfcfc]"
                            : "hover:text-[#141414]"
                        }`}
                      >
                        {tab.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            ) : null}

            {/* 5. Os nossos servicos */}
            {services.length > 0 ? (
              <ServicesSection
                services={services}
                palette={palette}
                showPrices={viewModel.showPrices}
                showDurations={viewModel.showDurations}
                onSelect={canOpenBooking ? handleServiceClick : undefined}
              />
            ) : null}

            {/* 6. A nossa equipa */}
            {viewModel.showTeam && staffMembers.length > 0 ? (
              <TeamSection staff={staffMembers} palette={palette} />
            ) : null}

            {/* 7. Ultimos trabalhos */}
            {galleryImages.length > 0 ? (
              <GallerySection
                images={galleryImages}
                palette={palette}
                onOpen={(idx) => setLightboxIndex(idx)}
              />
            ) : null}

            {/* 8. Onde estamos */}
            {viewModel.mapsAddress ? (
              <LocationSection address={viewModel.mapsAddress} palette={palette} />
            ) : null}

            {/* 9. Footer */}
            <footer className="flex flex-col items-center gap-1 px-4 py-6 text-center">
              <p className={`text-xs ${palette.footerSubtle}`}>
                © {new Date().getFullYear()} · {viewModel.name || "—"}
              </p>
            </footer>
          </div>
        </div>
      </div>

      {lightboxIndex !== null && galleryImages.length > 0 ? (
        <GalleryLightbox
          images={galleryImages}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      ) : null}
    </main>
  );
}

function HeroBlock({
  hero,
  alt,
  palette,
}: {
  hero: NonNullable<PublicPageViewModel["hero"]>;
  alt: string;
  palette: Palette;
}) {
  const fadeColor = palette.heroFade;

  return (
    <div className={`relative aspect-[5/4] w-full ${palette.heroBg}`}>
      {hero.kind === "video" ? (
        <SafeVideo hero={hero} alt={alt} />
      ) : (
        <SafeImage
          src={hero.url}
          alt={alt}
          preload
          sizes="(max-width: 480px) 100vw, 460px"
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `linear-gradient(to bottom, transparent 0%, ${fadeColor} 95%)`,
        }}
      />
    </div>
  );
}

function ServicesSection({
  services,
  palette,
  showPrices,
  showDurations,
  onSelect,
}: {
  services: PublicPageViewModel["services"];
  palette: Palette;
  showPrices: boolean;
  showDurations: boolean;
  onSelect?: (serviceId: string) => void;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const featuredServices = services.slice(0, FEATURED_SERVICES_COUNT);
  const showSeeAll = services.length > FEATURED_SERVICES_COUNT;

  function handleSelect(serviceId: string) {
    setDrawerOpen(false);
    onSelect?.(serviceId);
  }

  const headerAction = showSeeAll ? <SeeAllTrigger palette={palette} /> : null;

  return (
    <Drawer.Root open={drawerOpen} onOpenChange={setDrawerOpen}>
      <section id="servicos" className="flex flex-col gap-3 px-4 pt-6">
        <SectionHeader title="Os nossos serviços" action={headerAction} />
        <ServicesList
          services={featuredServices}
          palette={palette}
          showPrices={showPrices}
          showDurations={showDurations}
          onSelect={onSelect ? handleSelect : undefined}
        />
      </section>

      <BottomSheet palette={palette} title="Os nossos serviços">
        <ServicesList
          services={services}
          palette={palette}
          showPrices={showPrices}
          showDurations={showDurations}
          onSelect={onSelect ? handleSelect : undefined}
        />
      </BottomSheet>
    </Drawer.Root>
  );
}

function ServicesList({
  services,
  palette,
  showPrices,
  showDurations,
  onSelect,
}: {
  services: PublicPageViewModel["services"];
  palette: Palette;
  showPrices: boolean;
  showDurations: boolean;
  onSelect?: (serviceId: string) => void;
}) {
  return (
    <ul className="flex flex-col gap-2">
      {services.map((service) => (
        <li key={service.id}>
          <ServiceCard
            service={service}
            palette={palette}
            showPrices={showPrices}
            showDurations={showDurations}
            onSelect={onSelect}
          />
        </li>
      ))}
    </ul>
  );
}

function ServiceCard({
  service,
  palette,
  showPrices,
  showDurations,
  onSelect,
}: {
  service: PublicPageViewModel["services"][number];
  palette: Palette;
  showPrices: boolean;
  showDurations: boolean;
  onSelect?: (serviceId: string) => void;
}) {
  const inner = (
    <>
      <BioSelectionTick active={false} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold leading-5 tracking-[-0.2px]">
          {service.name.trim() || "Novo serviço"}
        </p>
        {showDurations ? (
          <p className={`mt-0.5 text-[13px] leading-[18px] ${palette.subtleText}`}>
            {service.durationMinutes} min
          </p>
        ) : null}
      </div>
      {showPrices ? (
        <p className="shrink-0 text-[15px] font-semibold tracking-[-0.2px] tabular-nums">
          {formatEuro(service.priceCents)}
        </p>
      ) : null}
    </>
  );

  if (!onSelect) {
    return <div className={serviceCardClassName(palette, false)}>{inner}</div>;
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(service.id)}
      className={serviceCardClassName(palette, true)}
      aria-label={`Agendar ${service.name}`}
    >
      {inner}
    </button>
  );
}

function serviceCardClassName(palette: Palette, interactive: boolean) {
  const base = `flex h-16 w-full items-center gap-3 rounded-xl border px-4 text-left ${palette.buttonBg} ${palette.buttonBorder} ${palette.pageText}`;
  if (!interactive) return base;
  return `${base} cursor-pointer transition active:scale-[0.99] ${palette.buttonHoverBorder} ${palette.buttonHoverBg}`;
}

function TeamSection({
  staff,
  palette,
}: {
  staff: PublicPageViewModel["staffMembers"];
  palette: Palette;
}) {
  return (
    <section id="equipa" className="flex flex-col gap-3 px-4 pt-6">
      <h2 className="text-[20px] font-bold leading-[26px] tracking-[-0.4px]">A nossa equipa</h2>
      <ul className="grid grid-cols-2 gap-2">
        {staff.map((m) => (
          <li key={m.id}>
            <article className={`overflow-hidden rounded-xl border ${palette.buttonBorder} ${palette.buttonBg}`}>
              <div className={`relative aspect-square w-full ${palette.staffPlaceholder}`}>
                {m.avatarUrl ? (
                  <SafeImage
                    src={m.avatarUrl}
                    alt={m.fullName}
                    sizes="(max-width: 480px) 50vw, 230px"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : null}
              </div>
              <div className="px-3.5 py-3.5">
                <p className="truncate text-[15px] font-semibold leading-5 tracking-[-0.2px]">{m.fullName}</p>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}

function GallerySection({
  images,
  palette,
  onOpen,
}: {
  images: string[];
  palette: Palette;
  onOpen?: (index: number) => void;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const featuredImages = images.slice(0, FEATURED_GALLERY_COUNT);
  const showSeeAll = images.length > FEATURED_GALLERY_COUNT;

  function handleOpen(index: number) {
    setDrawerOpen(false);
    onOpen?.(index);
  }

  const headerAction = showSeeAll ? <SeeAllTrigger palette={palette} /> : null;

  return (
    <Drawer.Root open={drawerOpen} onOpenChange={setDrawerOpen}>
      <section id="trabalhos" className="flex flex-col gap-3 px-4 pt-6">
        <SectionHeader title="Últimos trabalhos" action={headerAction} />
        <GalleryGrid
          images={featuredImages}
          palette={palette}
          onOpen={onOpen ? handleOpen : undefined}
        />
      </section>

      <BottomSheet palette={palette} title="Últimos trabalhos">
        <GalleryGrid images={images} palette={palette} onOpen={onOpen ? handleOpen : undefined} />
      </BottomSheet>
    </Drawer.Root>
  );
}

function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <header className="flex items-center justify-between gap-3">
      <h2 className="text-[20px] font-bold leading-[26px] tracking-[-0.4px]">{title}</h2>
      {action ?? null}
    </header>
  );
}

// Botão "VER TODOS" partilhado pelas secções com drawer (Serviços, Galeria).
function SeeAllTrigger({ palette }: { palette: Palette }) {
  return (
    <Drawer.Trigger
      className={`-mr-2 inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 font-semibold uppercase transition active:scale-[0.97] ${palette.pageText} ${palette.buttonHoverBg}`}
      style={sectionActionStyle}
    >
      VER TODOS
      <ChevronRight className="size-3.5" />
    </Drawer.Trigger>
  );
}

function GalleryGrid({
  images,
  palette,
  onOpen,
}: {
  images: string[];
  palette: Palette;
  onOpen?: (index: number) => void;
}) {
  return (
    <ul className="grid grid-cols-3 gap-2">
      {images.map((src, idx) => (
        <li key={`${idx}-${src}`}>
          {onOpen ? (
            <button
              type="button"
              onClick={() => onOpen(idx)}
              aria-label={`Ampliar trabalho ${idx + 1}`}
              className={`relative block aspect-square w-full cursor-zoom-in overflow-hidden rounded-lg transition active:scale-[0.98] ${palette.galleryPlaceholder}`}
            >
              <SafeImage
                src={src}
                alt={`Trabalho ${idx + 1}`}
                sizes="(max-width: 480px) 33vw, 152px"
                className="absolute inset-0 h-full w-full object-cover"
              />
            </button>
          ) : (
            <div
              className={`relative block aspect-square w-full overflow-hidden rounded-lg ${palette.galleryPlaceholder}`}
            >
              <SafeImage
                src={src}
                alt={`Trabalho ${idx + 1}`}
                sizes="(max-width: 480px) 33vw, 152px"
                className="absolute inset-0 h-full w-full object-cover"
              />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

function BottomSheet({
  palette,
  title,
  children,
}: {
  palette: Palette;
  title: string;
  children: React.ReactNode;
}) {
  const isDark = palette.mapColorScheme === "dark";
  const closeButtonClass = isDark
    ? "bg-white/[0.08] text-[#fafafa] active:bg-white/[0.14]"
    : "bg-black/[0.06] text-[#141414] active:bg-black/[0.12]";

  return (
    <Drawer.Portal>
      <Drawer.Backdrop className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
      <Drawer.Popup
        className={`fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[85vh] w-full max-w-[var(--bio-card-width)] flex-col overflow-hidden rounded-t-[20px] ${palette.cardBg} ${palette.pageText} shadow-[0_-16px_48px_rgba(0,0,0,0.16)] transition-transform duration-300 data-[ending-style]:translate-y-full data-[starting-style]:translate-y-full`}
      >
        <div className="my-2.5 flex justify-center">
          <span
            aria-hidden
            className={`h-[5px] w-9 rounded-full ${isDark ? "bg-white/20" : "bg-black/20"}`}
          />
        </div>

        <header className="flex items-center justify-between gap-3 px-5 pb-3 pt-1">
          <Drawer.Title className="text-[20px] font-bold leading-7 tracking-[-0.4px]">
            {title}
          </Drawer.Title>
          <Drawer.Close
            aria-label="Fechar"
            className={`flex size-9 items-center justify-center rounded-full transition ${closeButtonClass}`}
          >
            <X className="size-4" strokeWidth={2.5} />
          </Drawer.Close>
        </header>

        <div className="overflow-y-auto px-5 pb-[max(env(safe-area-inset-bottom),24px)]">
          {children}
        </div>
      </Drawer.Popup>
    </Drawer.Portal>
  );
}

function GalleryLightbox({
  images,
  startIndex,
  onClose,
}: {
  images: string[];
  startIndex: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(startIndex);
  const touchStartX = useRef<number | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const goPrev = useCallback(() => {
    setIndex((current) => Math.max(0, current - 1));
  }, []);

  const goNext = useCallback(() => {
    setIndex((current) => Math.min(images.length - 1, current + 1));
  }, [images.length]);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") goPrev();
      if (event.key === "ArrowRight") goNext();
      if (event.key === "Tab" && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [onClose, goPrev, goNext]);

  function handleTouchStart(event: React.TouchEvent) {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  }

  function handleTouchEnd(event: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const endX = event.changedTouches[0]?.clientX ?? touchStartX.current;
    const delta = endX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < 50) return;
    if (delta < 0) goNext();
    else goPrev();
  }

  const currentSrc = images[index];
  if (!currentSrc) return null;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Foto ${index + 1} de ${images.length}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 px-5 backdrop-blur-md"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <button
        ref={closeButtonRef}
        type="button"
        onClick={onClose}
        aria-label="Fechar"
        className="absolute right-5 top-5 z-[60] flex size-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition-colors hover:bg-white/20 active:bg-white/25"
      >
        <X className="size-5" strokeWidth={2.25} />
      </button>

      <div className="flex w-full max-w-[460px] flex-col items-center gap-5">
        <div
          className="relative aspect-square w-full overflow-hidden rounded-[20px] bg-white/5"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <Image
            src={currentSrc}
            alt={`Trabalho ${index + 1}`}
            fill
            sizes="(max-width: 480px) 100vw, 460px"
            unoptimized={!canOptimizeImageUrl(currentSrc)}
            className="object-cover"
            draggable={false}
          />
        </div>

        {images.length > 1 ? (
          <div className="hidden items-center gap-3 sm:flex">
            <button
              type="button"
              onClick={goPrev}
              disabled={index <= 0}
              aria-label="Anterior"
              className="flex size-11 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition-colors duration-200 hover:bg-white/20 active:bg-white/25 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ArrowLeft className="size-5" strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={goNext}
              disabled={index >= images.length - 1}
              aria-label="Próximo"
              className="flex size-11 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition-colors duration-200 hover:bg-white/20 active:bg-white/25 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ArrowRight className="size-5" strokeWidth={2} />
            </button>
          </div>
        ) : null}

        <span aria-hidden className="text-xs tabular-nums text-white/60">
          {index + 1} / {images.length}
        </span>
      </div>
    </div>
  );
}

function SafeImage({
  src,
  alt,
  sizes,
  className,
  preload = false,
}: {
  src: string;
  alt: string;
  sizes: string;
  className: string;
  preload?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="absolute inset-0 flex items-center justify-center px-3 text-center text-xs text-zinc-400">
        Media indisponível
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      preload={preload}
      sizes={sizes}
      className={className}
      unoptimized={!canOptimizeImageUrl(src)}
      onError={() => setFailed(true)}
    />
  );
}

function SafeVideo({
  hero,
  alt,
}: {
  hero: NonNullable<PublicPageViewModel["hero"]>;
  alt: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="absolute inset-0 flex items-center justify-center px-3 text-center text-xs text-zinc-400">
        Vídeo indisponível
      </div>
    );
  }

  return (
    <video
      key={hero.url}
      src={hero.url}
      poster={hero.posterUrl ?? undefined}
      autoPlay
      muted
      playsInline
      loop
      preload="metadata"
      className="absolute inset-0 h-full w-full object-cover"
      aria-label={alt}
      onError={() => setFailed(true)}
    />
  );
}

function LocationSection({
  address,
  palette,
}: {
  address: string;
  palette: Palette;
}) {
  const encoded = encodeURIComponent(address);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard pode estar bloqueado (contexto inseguro / permissão negada);
      // o endereço continua visível, então apenas ignoramos.
    }
  };

  return (
    <section id="onde-estamos" className="flex flex-col gap-3 px-4 pt-6">
      <h2 className="text-[20px] font-bold leading-[26px] tracking-[-0.4px]">Onde estamos</h2>

      <div className={`overflow-hidden rounded-xl border ${palette.cardBorderFaint} ${palette.mapBg}`}>
        <iframe
          title={`Mapa de ${address}`}
          src={`https://www.google.com/maps?q=${encoded}&output=embed`}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
          className="aspect-[5/3] w-full border-0"
          style={{ colorScheme: palette.mapColorScheme }}
        />
      </div>

      <div className="flex items-center gap-1.5">
        <p className={`min-w-0 truncate text-[15px] ${palette.subtleText}`}>{address}</p>
        <button
          type="button"
          onClick={handleCopy}
          aria-label={copied ? "Endereço copiado" : "Copiar endereço"}
          aria-live="polite"
          className={`flex size-7 shrink-0 items-center justify-center rounded-full transition active:scale-[0.95] ${palette.subtleText} ${palette.buttonHoverBg}`}
        >
          {copied ? (
            <Check className="size-3.5" strokeWidth={2.25} />
          ) : (
            <Copy className="size-3.5" strokeWidth={2} />
          )}
        </button>
      </div>
    </section>
  );
}

function SocialIcons({
  phoneDigits,
  instagramUrl,
  tiktokUrl,
  facebookUrl,
  palette,
}: {
  phoneDigits: string;
  instagramUrl: string | null;
  tiktokUrl: string | null;
  facebookUrl: string | null;
  palette: Palette;
}) {
  const items: Array<{ label: string; href: string; icon: React.ReactElement }> = [];

  if (phoneDigits) {
    items.push({
      label: "WhatsApp",
      href: `https://wa.me/${phoneDigits}`,
      icon: (
        <svg width="24" height="24" viewBox="0 0 21 21" fill="none" stroke="currentColor" strokeLinejoin="round" aria-hidden>
          <path d="M11 0.5 A9.5 9.5 0 0 0 2.8 14.8 L0.5 19.5 L6.3 18.2 A9.5 9.5 0 1 0 11 0.5 Z" />
          <path fillRule="evenodd" clipRule="evenodd" d="M7.92242 6.19161C7.74339 5.7834 7.54453 5.77348 7.37541 5.77348C7.22613 5.76357 7.06634 5.76357 6.89723 5.76357C6.73861 5.76357 6.46977 5.82305 6.24118 6.07206C6.012 6.32049 5.38569 6.90772 5.38569 8.11136C5.38569 9.31558 6.261 10.4796 6.38055 10.6388C6.49951 10.798 8.0717 13.3446 10.5594 14.3301C12.6285 15.146 13.0466 14.9868 13.4945 14.9366C13.9418 14.8871 14.9372 14.35 15.146 13.7726C15.3448 13.2058 15.3448 12.7084 15.2853 12.6087C15.2259 12.5095 15.0562 12.4495 14.8177 12.32C14.5687 12.201 13.3749 11.6039 13.1463 11.524C12.9172 11.4447 12.7579 11.405 12.5987 11.6435C12.4395 11.8925 11.9719 12.4395 11.8231 12.5987C11.6832 12.758 11.5345 12.7778 11.2954 12.6582C11.047 12.5393 10.2609 12.2803 9.32549 11.4447C8.59888 10.7974 8.11136 9.99204 7.96207 9.75353C7.82328 9.50452 7.94224 9.37506 8.0717 9.25551C8.18134 9.14646 8.32071 8.96743 8.44026 8.82806C8.55922 8.6881 8.59888 8.57905 8.68868 8.41985C8.76799 8.26065 8.72834 8.11136 8.66886 7.9924C8.60879 7.88276 8.14168 6.67913 7.92242 6.19161Z" />
        </svg>
      ),
    });
  }
  if (instagramUrl) {
    items.push({
      label: "Instagram",
      href: instagramUrl,
      icon: (
        <svg width="24" height="24" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeLinejoin="round" aria-hidden>
          <path d="M0.559014 5.51641C0.603748 4.53889 0.756808 3.90844 0.9638 3.37329L0.966584 3.3659C1.1717 2.82134 1.49303 2.32802 1.9082 1.92027L1.91403 1.91455L1.91975 1.90873C2.32783 1.49302 2.82133 1.17201 3.36541 0.967434L3.3748 0.963844C3.90872 0.756207 4.53794 0.603716 5.51628 0.558989M0.559014 5.51641C0.511985 6.56085 0.5 6.88461 0.5 9.59259C0.5 12.3012 0.511326 12.6242 0.558989 13.6689M0.559014 5.51641L0.559013 5.77987M0.967434 15.8198C1.17201 16.3639 1.49302 16.8573 1.90873 17.2654L1.91454 17.2711L1.92026 17.277C2.32802 17.6921 2.82136 18.0135 3.36593 18.2186L3.37405 18.2217C3.90847 18.4289 4.53799 18.5815 5.51628 18.6262M0.967434 15.8198L0.963844 15.8104C0.756207 15.2765 0.603716 14.6472 0.558989 13.6689M0.967434 15.8198L0.955169 15.7552M0.558989 13.6689L0.575008 13.7533M0.558989 13.6689L0.55899 13.4048M0.955169 15.7552L0.575008 13.7533M0.955169 15.7552C0.793712 15.3286 0.627452 14.7335 0.575008 13.7533M0.955169 15.7552C0.960833 15.7701 0.966491 15.7849 0.972138 15.7995C1.1769 16.3515 1.50133 16.8513 1.92212 17.263C2.33369 17.6837 2.83331 18.0081 3.38513 18.2128C3.82797 18.3853 4.45196 18.5656 5.51613 18.6143C6.59006 18.6632 6.92185 18.6732 9.59259 18.6732C12.2633 18.6732 12.5954 18.6632 13.6693 18.6143C14.7348 18.5655 15.3581 18.3842 15.7993 18.2131C16.3515 18.0084 16.8514 17.6839 17.2631 17.263C17.6837 16.8514 18.0081 16.3518 18.2128 15.8C18.3853 15.3572 18.5656 14.7332 18.6143 13.669C18.6632 12.5951 18.6732 12.2627 18.6732 9.59259C18.6732 6.92252 18.6632 6.58978 18.6143 5.51585C18.5652 4.44479 18.3823 3.82061 18.2104 3.37894C17.9856 2.79865 17.7005 2.35976 17.2624 1.9216C16.8251 1.48517 16.3874 1.19995 15.8067 0.974937C15.3634 0.801644 14.7388 0.619853 13.6693 0.570842C13.5763 0.566609 13.4889 0.562668 13.405 0.559M0.575008 13.7533C0.573527 13.7256 0.572138 13.6976 0.570842 13.6693C0.566605 13.5762 0.562661 13.4887 0.55899 13.4048M5.51628 0.558989C6.56096 0.511326 6.8846 0.5 9.59259 0.5C12.3005 0.5 12.6241 0.511973 13.6685 0.559M5.51628 0.558989L5.78041 0.55899M13.6685 0.559L13.405 0.559M13.6685 0.559C14.6462 0.603717 15.2767 0.756754 15.8119 0.963768L15.8193 0.966584C16.3638 1.1717 16.8572 1.49303 17.2649 1.9082L17.2706 1.91397L17.2763 1.91963C17.6916 2.32741 18.0129 2.82087 18.2178 3.36558L18.2213 3.3748C18.429 3.90872 18.5815 4.53794 18.6262 5.51628M5.78041 0.55899L13.405 0.559M5.78041 0.55899C6.66502 0.52031 7.15396 0.511984 9.59259 0.511984C12.0314 0.511984 12.5202 0.520311 13.405 0.559M5.78041 0.55899C5.69645 0.562661 5.60894 0.566605 5.51585 0.570842C4.45034 0.619671 3.82709 0.800947 3.38582 0.9721C2.83162 1.17754 2.33005 1.5037 1.91747 1.92694C1.48339 2.36281 1.19926 2.79959 0.974968 3.37844C0.801665 3.82168 0.619844 4.44659 0.570829 5.51613C0.566606 5.60892 0.562673 5.69617 0.559013 5.77987M18.6262 13.6689C18.5815 14.6472 18.429 15.2767 18.2217 15.8111L18.2186 15.8193C18.0135 16.3638 17.6921 16.8572 17.277 17.2649L17.2711 17.2706L17.2654 17.2765C16.8573 17.6922 16.3639 18.0132 15.8198 18.2177L15.8104 18.2213C15.2765 18.429 14.6472 18.5815 13.6689 18.6262M0.55899 13.4048C0.52031 12.5202 0.511984 12.0312 0.511984 9.59259C0.511984 7.15321 0.520304 6.66496 0.559013 5.77987M0.55899 13.4048L0.559013 5.77987M7.97541 13.4968C8.48812 13.7092 9.03764 13.8185 9.59259 13.8185C10.7134 13.8185 11.7882 13.3733 12.5808 12.5807C13.3733 11.7882 13.8185 10.7134 13.8185 9.59259C13.8185 8.47181 13.3733 7.39694 12.5808 6.60443C11.7882 5.81192 10.7134 5.36669 9.59259 5.36669C9.03764 5.36669 8.48812 5.476 7.97541 5.68837C7.4627 5.90074 6.99684 6.21202 6.60443 6.60443C6.21202 6.99684 5.90075 7.4627 5.68837 7.97541C5.476 8.48812 5.3667 9.03764 5.3667 9.59259C5.3667 10.1475 5.476 10.6971 5.68837 11.2098C5.90074 11.7225 6.21202 12.1883 6.60443 12.5807C6.99684 12.9732 7.4627 13.2844 7.97541 13.4968ZM6.59502 6.59501C7.39002 5.8 8.46828 5.35337 9.59259 5.35337C10.7169 5.35337 11.7952 5.8 12.5902 6.59501C13.3852 7.39002 13.8318 8.46828 13.8318 9.59259C13.8318 10.7169 13.3852 11.7952 12.5902 12.5902C11.7952 13.3852 10.7169 13.8318 9.59259 13.8318C8.46828 13.8318 7.39002 13.3852 6.59502 12.5902C5.80001 11.7952 5.35338 10.7169 5.35338 9.59259C5.35338 8.46828 5.80001 7.39002 6.59502 6.59501ZM16.2189 4.36639C16.2189 4.68819 16.0911 4.99681 15.8635 5.22435C15.636 5.4519 15.3273 5.57973 15.0055 5.57973C14.6837 5.57973 14.3751 5.4519 14.1476 5.22435C13.92 4.99681 13.7922 4.68819 13.7922 4.36639C13.7922 4.04459 13.92 3.73597 14.1476 3.50843C14.3751 3.28088 14.6837 3.15304 15.0055 3.15304C15.3273 3.15304 15.636 3.28088 15.8635 3.50843C16.0911 3.73597 16.2189 4.04459 16.2189 4.36639Z" />
        </svg>
      ),
    });
  }
  if (tiktokUrl) {
    items.push({
      label: "TikTok",
      href: tiktokUrl,
      icon: (
        <svg width="24" height="24" viewBox="0 0 18 20" fill="none" stroke="currentColor" strokeLinejoin="round" aria-hidden>
          <path d="M13.2759 3.39721C12.5982 2.62035 12.1908 1.60739 12.1908 0.5H11.3417M13.2759 3.39721C13.8934 4.10545 14.7295 4.62054 15.6816 4.82222C15.9775 4.88661 16.2863 4.92098 16.6079 4.92098V8.09716C14.9611 8.09716 13.4344 7.56926 12.1907 6.67645V13.1362C12.1907 16.364 9.56606 18.9865 6.34537 18.9865C4.65992 18.9865 3.13747 18.2654 2.06962 17.1194C1.09611 16.0721 0.5 14.6728 0.5 13.1362C0.5 9.95569 3.04742 7.36321 6.20382 7.29452M13.2759 3.39721C13.2593 3.38645 13.2429 3.37559 13.2265 3.36461M4.18396 14.69C3.86661 14.2522 3.67791 13.7157 3.67791 13.1319C3.67791 11.6597 4.87442 10.4622 6.34544 10.4622C6.6199 10.4622 6.88577 10.5094 7.13451 10.5867V7.34179C6.87717 7.30742 6.6156 7.28593 6.34544 7.28593C6.29824 7.28593 5.91824 7.31121 5.87106 7.31121M11.3372 0.5L9.01284 0.5L9.00855 13.2349C8.95712 14.6599 7.78199 15.806 6.34537 15.806C5.45332 15.806 4.6685 15.3639 4.17961 14.6943" />
        </svg>
      ),
    });
  }
  if (facebookUrl) {
    items.push({
      label: "Facebook",
      href: facebookUrl,
      icon: (
        <svg width="24" height="24" viewBox="0 0 23 23" fill="none" stroke="currentColor" strokeLinejoin="round" aria-hidden>
          <path d="M21.8065 11.2184C21.8065 5.29877 17.0369 0.5 11.1533 0.5C5.26962 0.5 0.5 5.29877 0.5 11.2184C0.5 16.5682 4.39574 21.0024 9.48868 21.8065V14.3166H6.78375V11.2184H9.48868V8.85697C9.48868 6.17068 11.0791 4.68686 13.5126 4.68686C14.6781 4.68686 15.8973 4.8962 15.8973 4.8962V7.53392H14.5539C13.2305 7.53392 12.8178 8.36013 12.8178 9.20776V11.2184H15.7724L15.3001 14.3166H12.8178V21.8065C17.9108 21.0024 21.8065 16.5682 21.8065 11.2184Z" />
        </svg>
      ),
    });
  }

  if (items.length === 0) return null;

  return (
    <div className="flex items-center justify-center gap-1 px-4">
      {items.map((item) => (
        <a
          key={item.label}
          href={item.href}
          target="_blank"
          rel="noreferrer"
          aria-label={item.label}
          className={`flex size-11 items-center justify-center rounded-full transition active:scale-[0.97] ${palette.buttonHoverBg}`}
        >
          {item.icon}
        </a>
      ))}
    </div>
  );
}
