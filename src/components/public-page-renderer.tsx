"use client";

// Renderer unico da pagina publica. Usado por:
// - /[slug]/page.tsx (modo "live", DB -> ViewModel via fromPublicBusiness)
// - bio-render.tsx (modo "preview", EditorDraft -> ViewModel via fromEditorDraft)
// - /mock/page.tsx (demo estatica, mockBusiness -> ViewModel via fromPublicBusiness)
//
// Single source of truth visual: o que o editor mostra e o que o cliente final ve.
// O tratamento visual segue o front bio/barbearia validado (barber-bio), adaptado
// ao stack do Onnex (palettes dark/light proprias, lightbox proprio, sem deps novas).

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useBookingSheetOptional } from "@/components/booking-sheet";
import { canOptimizeImageUrl } from "@/lib/image-optimization";
import { formatEuro } from "@/lib/formatters";
import type { PublicPageViewModel } from "@/lib/public-page/types";

const DARK_CARD_SHADOW =
  "rgba(250,250,250,0.09) 0.301094px 0.301094px 1.27743px -1px, rgba(250,250,250,0.082) 1.14427px 1.14427px 4.85471px -2px, rgba(250,250,250,0.06) 5px 5px 21.2132px -3px";
const LIGHT_CARD_SHADOW =
  "rgba(15,23,42,0.09) 0.301094px 0.301094px 1.27743px -1px, rgba(15,23,42,0.082) 1.14427px 1.14427px 4.85471px -2px, rgba(15,23,42,0.06) 5px 5px 21.2132px -3px";

type BookingMode = "live" | "preview";

type Props = {
  viewModel: PublicPageViewModel;
  bookingMode?: BookingMode;
};

type Theme = "dark" | "light";

type Palette = {
  pageBg: string;
  pageText: string;
  cardBg: string;
  cardShadow: string;
  heroBg: string;
  /** Hex usado no degradê (vinheta) do hero — tem de bater com cardBg. */
  heroFadeColor: string;
  subtleText: string;
  /** Hover/press em botões redondos (sociais + tabs). */
  overlayHover: string;
  overlayActive: string;
  /** Cartões fantasma (serviços) — borda + fundo subtil. */
  ghostBg: string;
  ghostBorder: string;
  ghostHover: string;
  tickBorder: string;
  /** Cartões com borda (equipa). */
  teamCardBg: string;
  teamCardBorder: string;
  /** Placeholder de media (skeleton). */
  skeleton: string;
  mapBorder: string;
  mapBg: string;
  mapColorScheme: "dark" | "light";
  buttonBorder: string;
  buttonBg: string;
  buttonHoverBorder: string;
  buttonHoverBg: string;
  footerSubtle: string;
};

const PALETTES: Record<Theme, Palette> = {
  dark: {
    pageBg: "bg-[#0e0e11]",
    pageText: "text-[#fafafa]",
    cardBg: "bg-[#09090b]",
    cardShadow: DARK_CARD_SHADOW,
    heroBg: "bg-[#1a1a1d]",
    heroFadeColor: "#09090b",
    subtleText: "text-[#a1a1aa]",
    overlayHover: "hover:bg-white/[0.06]",
    overlayActive: "active:bg-white/[0.12]",
    ghostBg: "bg-white/[0.03]",
    ghostBorder: "border-white/[0.08]",
    ghostHover: "hover:border-white/[0.16] hover:bg-white/[0.06]",
    tickBorder: "border-white/25",
    teamCardBg: "bg-white/[0.03]",
    teamCardBorder: "border-white/[0.08]",
    skeleton: "bg-[#27272a]",
    mapBorder: "border-white/[0.08]",
    mapBg: "bg-[#1a1a1d]",
    mapColorScheme: "dark",
    buttonBorder: "border-white/[0.12]",
    buttonBg: "bg-white/[0.02]",
    buttonHoverBorder: "hover:border-white/[0.24]",
    buttonHoverBg: "hover:bg-white/[0.06]",
    footerSubtle: "text-[#71717a]",
  },
  light: {
    pageBg: "bg-[#f5f5f7]",
    pageText: "text-[#0a0a0a]",
    cardBg: "bg-white",
    cardShadow: LIGHT_CARD_SHADOW,
    heroBg: "bg-[#e4e4e7]",
    heroFadeColor: "#ffffff",
    subtleText: "text-[#52525b]",
    overlayHover: "hover:bg-black/[0.05]",
    overlayActive: "active:bg-black/[0.1]",
    ghostBg: "bg-black/[0.02]",
    ghostBorder: "border-black/[0.08]",
    ghostHover: "hover:border-black/[0.16] hover:bg-black/[0.04]",
    tickBorder: "border-black/20",
    teamCardBg: "bg-black/[0.02]",
    teamCardBorder: "border-black/[0.08]",
    skeleton: "bg-[#e4e4e7]",
    mapBorder: "border-black/[0.08]",
    mapBg: "bg-[#f4f4f5]",
    mapColorScheme: "light",
    buttonBorder: "border-black/[0.12]",
    buttonBg: "bg-black/[0.02]",
    buttonHoverBorder: "hover:border-black/[0.24]",
    buttonHoverBg: "hover:bg-black/[0.06]",
    footerSubtle: "text-[#71717a]",
  },
};

export function PublicPageRenderer({ viewModel, bookingMode = "live" }: Props) {
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

  const canOpenBooking = bookingMode === "live" && viewModel.onlineBooking && sheet !== null;

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
      <div className="mx-auto w-full max-w-[480px] px-4 py-6 sm:py-10">
        <div
          className={`overflow-hidden rounded-2xl ${palette.cardBg}`}
          style={{ boxShadow: palette.cardShadow }}
        >
          {/* 1. Hero */}
          {viewModel.hero ? (
            <HeroBlock hero={viewModel.hero} alt={viewModel.name} palette={palette} />
          ) : null}

          <div className="flex flex-col gap-4 pb-4 pt-6">
            {/* 2. Nome + cidade + headline + descricao */}
            <header className="flex flex-col items-center px-4 text-center">
              <h1
                className="font-bold"
                style={{ fontSize: "34px", lineHeight: "41px", letterSpacing: "-0.4px" }}
              >
                {viewModel.name || "—"}
              </h1>
              {viewModel.locationCity ? (
                <p className={`mt-1 text-sm ${palette.subtleText}`}>{viewModel.locationCity}</p>
              ) : null}
              {viewModel.headline ? (
                <p className="mt-4 max-w-[320px] text-base font-semibold leading-6">
                  {viewModel.headline}
                </p>
              ) : null}
              {viewModel.description ? (
                <p className={`mt-2 max-w-[330px] text-sm leading-6 ${palette.subtleText}`}>
                  {viewModel.description}
                </p>
              ) : null}
            </header>

            {/* 3. Redes sociais */}
            <SocialIcons
              palette={palette}
              phoneDigits={phoneDigits}
              instagramUrl={viewModel.socials.instagramUrl}
              tiktokUrl={viewModel.socials.tiktokUrl}
              facebookUrl={viewModel.socials.facebookUrl}
            />

            {/* 4. Tabs (anchors; "Agendar" em modo live abre o booking sheet) */}
            {tabs.length > 0 ? (
              <nav
                aria-label="Navegação rápida"
                className="overflow-x-auto px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                <ul className="flex min-w-max items-center justify-center gap-1">
                  {tabs.map((tab) => (
                    <li key={tab.label}>
                      <a
                        href={tab.href}
                        onClick={(event) => handleTabClick(event, tab.href)}
                        className={`inline-flex h-11 items-center rounded-full px-4 text-[15px] font-semibold transition ${palette.subtleText} ${palette.overlayHover} ${palette.overlayActive} active:scale-[0.97]`}
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
  return (
    <div className={`relative aspect-[5/4] w-full ${palette.heroBg}`}>
      {hero.kind === "video" ? (
        <SafeVideo hero={hero} alt={alt} />
      ) : (
        <SafeImage
          src={hero.url}
          alt={alt}
          priority
          sizes="(max-width: 480px) 100vw, 460px"
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      {/* Vinheta de altura total: transparente no topo, saturando até cardBg
          a 95% — sem costura visível entre o hero e o corpo do cartão. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `linear-gradient(to bottom, transparent 0%, ${palette.heroFadeColor} 95%)`,
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
  return (
    <section id="servicos" className="flex flex-col gap-3 px-4 pt-6">
      <h2 className="text-xl font-bold tracking-tight">Os nossos serviços</h2>
      <ul className="flex flex-col gap-2">
        {services.map((s) => {
          const cardBase = `flex h-16 w-full items-center gap-3 rounded-xl border px-4 text-left transition ${palette.ghostBg} ${palette.ghostBorder}`;
          const inner = (
            <>
              <span
                aria-hidden
                className={`size-5 shrink-0 rounded-full border-[1.5px] ${palette.tickBorder}`}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold leading-tight">
                  {s.name.trim() || "Novo serviço"}
                </p>
                {showDurations ? (
                  <p className={`mt-0.5 text-[13px] ${palette.subtleText}`}>
                    {s.durationMinutes} min
                  </p>
                ) : null}
              </div>
              {showPrices ? (
                <p className="shrink-0 text-[15px] font-semibold tabular-nums">
                  {formatEuro(s.priceCents)}
                </p>
              ) : null}
            </>
          );
          return (
            <li key={s.id}>
              {onSelect ? (
                <button
                  type="button"
                  onClick={() => onSelect(s.id)}
                  className={`${cardBase} cursor-pointer active:scale-[0.99] ${palette.ghostHover}`}
                  aria-label={`Agendar ${s.name}`}
                >
                  {inner}
                </button>
              ) : (
                <div className={cardBase}>{inner}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
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
      <h2 className="text-xl font-bold tracking-tight">A nossa equipa</h2>
      <ul className="grid grid-cols-2 gap-2">
        {staff.map((m) => (
          <li key={m.id}>
            <article
              className={`overflow-hidden rounded-xl border ${palette.teamCardBorder} ${palette.teamCardBg}`}
            >
              <div className={`relative aspect-square w-full ${palette.skeleton}`}>
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
                <p className="truncate text-[15px] font-semibold">{m.fullName}</p>
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
  return (
    <section id="trabalhos" className="flex flex-col gap-3 px-4 pt-6">
      <h2 className="text-xl font-bold tracking-tight">Últimos trabalhos</h2>
      <ul className="grid grid-cols-3 gap-2">
        {images.map((src, idx) => (
          <li key={`${idx}-${src}`}>
            {onOpen ? (
              <button
                type="button"
                onClick={() => onOpen(idx)}
                aria-label={`Abrir trabalho ${idx + 1} em tamanho grande`}
                className={`group relative block aspect-square w-full overflow-hidden rounded-lg ${palette.skeleton} cursor-zoom-in active:scale-[0.98]`}
              >
                <SafeImage
                  src={src}
                  alt={`Trabalho ${idx + 1}`}
                  sizes="(max-width: 480px) 33vw, 152px"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              </button>
            ) : (
              <div
                className={`relative block aspect-square w-full overflow-hidden rounded-lg ${palette.skeleton}`}
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
    </section>
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
    setIndex((current) => (current - 1 + images.length) % images.length);
  }, [images.length]);

  const goNext = useCallback(() => {
    setIndex((current) => (current + 1) % images.length);
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <button
        ref={closeButtonRef}
        type="button"
        onClick={onClose}
        aria-label="Fechar"
        className="absolute right-4 top-4 z-[60] flex size-11 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white transition hover:bg-black/80 active:scale-95"
      >
        <X className="size-5" />
      </button>

      <div
        className="relative h-full max-h-[90vh] w-full max-w-5xl"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <Image
          src={currentSrc}
          alt={`Trabalho ${index + 1}`}
          fill
          sizes="100vw"
          priority
          unoptimized={!canOptimizeImageUrl(currentSrc)}
          className="pointer-events-none object-contain"
          draggable={false}
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

function SafeImage({
  src,
  alt,
  sizes,
  className,
  priority = false,
}: {
  src: string;
  alt: string;
  sizes: string;
  className: string;
  priority?: boolean;
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
      priority={priority}
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
  const wazeUrl = `https://waze.com/ul?q=${encoded}&navigate=yes`;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encoded}`;
  const buttonClass = `inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border ${palette.buttonBorder} ${palette.buttonBg} text-sm font-medium transition ${palette.buttonHoverBorder} ${palette.buttonHoverBg}`;

  return (
    <section id="onde-estamos" className="flex flex-col gap-3 px-4 pt-6">
      <h2 className="text-xl font-bold tracking-tight">Onde estamos</h2>

      <p className={`text-xs leading-relaxed ${palette.subtleText}`}>{address}</p>

      <div className={`overflow-hidden rounded-xl border ${palette.mapBorder} ${palette.mapBg}`}>
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

      <div className="flex w-full gap-2">
        <a
          href={wazeUrl}
          target="_blank"
          rel="noreferrer"
          aria-label={`Abrir morada no Waze: ${address}`}
          className={buttonClass}
        >
          <WazeIcon />
          Abrir com Waze
        </a>
        <a
          href={mapsUrl}
          target="_blank"
          rel="noreferrer"
          aria-label={`Abrir morada no Google Maps: ${address}`}
          className={buttonClass}
        >
          <GoogleMapsIcon />
          Abrir no Maps
        </a>
      </div>
    </section>
  );
}

function WazeIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polygon points="3 11 22 2 13 21 11 13 3 11" />
    </svg>
  );
}

function GoogleMapsIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20 10c0 7-8 12-8 12s-8-5-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function SocialIcons({
  palette,
  phoneDigits,
  instagramUrl,
  tiktokUrl,
  facebookUrl,
}: {
  palette: Palette;
  phoneDigits: string;
  instagramUrl: string | null;
  tiktokUrl: string | null;
  facebookUrl: string | null;
}) {
  const items: Array<{ label: string; href: string; icon: React.ReactElement }> = [];

  if (phoneDigits) {
    items.push({
      label: "WhatsApp",
      href: `https://wa.me/${phoneDigits}`,
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M12 2a10 10 0 0 0-8.5 15.3L2 22l4.9-1.4A10 10 0 1 0 12 2zm5.3 14.1c-.2.6-1.2 1.2-1.7 1.3-.4.1-1 .1-1.6-.1-.4-.1-.9-.3-1.5-.5-2.6-1.2-4.4-3.8-4.5-4-.1-.2-1-1.3-1-2.5 0-1.2.6-1.8.9-2.1.2-.2.5-.3.7-.3h.5c.2 0 .4 0 .6.5.2.5.7 1.7.8 1.8.1.1.1.3 0 .5l-.3.4-.4.5c-.1.1-.3.2-.1.5.2.3.8 1.3 1.7 2.1 1.2 1 2.2 1.4 2.5 1.5.3.1.5.1.7-.1l.8-1c.2-.3.5-.2.7-.1l1.7.8c.3.2.5.3.5.5.1.2.1.9-.1 1.6z" />
        </svg>
      ),
    });
  }
  if (instagramUrl) {
    items.push({
      label: "Instagram",
      href: instagramUrl,
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
        </svg>
      ),
    });
  }
  if (tiktokUrl) {
    items.push({
      label: "TikTok",
      href: tiktokUrl,
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.93a8.16 8.16 0 0 0 4.77 1.52V7a4.85 4.85 0 0 1-1.84-.31z" />
        </svg>
      ),
    });
  }
  if (facebookUrl) {
    items.push({
      label: "Facebook",
      href: facebookUrl,
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M22 12a10 10 0 1 0-11.56 9.88V14.9H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.23.2 2.23.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.45 2.9h-2.33v6.98A10 10 0 0 0 22 12z" />
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
          className={`flex size-11 items-center justify-center rounded-full transition active:scale-[0.97] ${palette.overlayHover} ${palette.overlayActive}`}
        >
          {item.icon}
        </a>
      ))}
    </div>
  );
}
