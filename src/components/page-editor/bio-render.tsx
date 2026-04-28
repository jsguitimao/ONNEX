// Renderer da página pública a partir de um EditorDraft.
// Usado pelo /preview (recebe via postMessage). Mesmo layout do /mock.

import Image from "next/image";
import type { EditorDraft } from "@/lib/page-editor/draft";

const CARD_SHADOW =
  "rgba(250,250,250,0.09) 0.301094px 0.301094px 1.27743px -1px, rgba(250,250,250,0.082) 1.14427px 1.14427px 4.85471px -2px, rgba(250,250,250,0.06) 5px 5px 21.2132px -3px";

type Props = { draft: EditorDraft };

export function BioRender({ draft }: Props) {
  const phoneDigits = draft.phone.replace(/\D/g, "");

  return (
    <main className="min-h-screen bg-[#0e0e11] text-[#fafafa]">
      <div className="bio-container py-6 sm:py-10">
        <div
          className="overflow-hidden rounded-2xl bg-[#09090b]"
          style={{ boxShadow: CARD_SHADOW }}
        >
          {/* 1. Hero */}
          {draft.hero ? <HeroBlock hero={draft.hero} alt={draft.name} /> : null}

          <div className="flex flex-col gap-4 pb-4 pt-6">
            {/* 2. Nome */}
            <header className="flex flex-col items-center px-4 text-center">
              <h1
                className="font-bold text-[#fafafa]"
                style={{ fontSize: "40px", lineHeight: "56px", letterSpacing: "-1.6px" }}
              >
                {draft.name || "—"}
              </h1>
              {draft.city ? (
                <p className="mt-1 text-sm text-[#a1a1aa]">{draft.city}</p>
              ) : null}
            </header>

            {/* 3. Sociais */}
            <SocialIcons
              phoneDigits={draft.whatsappEnabled ? phoneDigits : ""}
              instagramUrl={draft.instagramUrl}
              tiktokUrl={draft.tiktokUrl}
              facebookUrl={draft.facebookUrl}
            />

            {/* 4. Tabs (estáticas no preview — não navegam) */}
            <nav className="overflow-x-auto px-4">
              <ul className="flex min-w-max items-center justify-center gap-6 pb-1 pt-1 text-[#a1a1aa]">
                {["Serviços", "Equipa", "Agendar"].map((label) => (
                  <li key={label} className="text-sm font-medium">{label}</li>
                ))}
              </ul>
            </nav>

            {/* 5. Serviços */}
            {draft.services.length > 0 ? (
              <ServicesSection services={draft.services.slice(0, 5)} />
            ) : null}

            {/* 6. Equipa */}
            {draft.staffMembers.length > 0 ? (
              <TeamSection staff={draft.staffMembers} />
            ) : null}

            {/* 7. Galeria */}
            {draft.galleryImages.length > 0 ? (
              <GallerySection images={draft.galleryImages} />
            ) : null}

            {/* 8. Localização */}
            {draft.mapsAddress ? <LocationSection address={draft.mapsAddress} /> : null}

            {/* 9. Footer */}
            <footer className="flex flex-col items-center gap-1 px-4 py-6 text-center">
              <p className="text-xs text-[#71717a]">
                © {new Date().getFullYear()} · {draft.name || "—"}
              </p>
            </footer>
          </div>
        </div>
      </div>
    </main>
  );
}

function HeroBlock({
  hero,
  alt,
}: {
  hero: NonNullable<EditorDraft["hero"]>;
  alt: string;
}) {
  return (
    <div className="relative aspect-square w-full bg-[#1a1a1d]">
      {hero.kind === "video" ? (
        <video
          src={hero.url}
          poster={hero.posterUrl ?? undefined}
          autoPlay
          muted
          playsInline
          loop
          preload="metadata"
          className="absolute inset-0 h-full w-full object-cover"
          aria-label={alt}
        />
      ) : (
        <Image
          src={hero.url}
          alt={alt}
          fill
          priority
          sizes="(max-width: 480px) 100vw, 460px"
          className="object-cover"
          unoptimized
        />
      )}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(250,250,250,0) 0%, #09090b 95.1718%)",
        }}
      />
    </div>
  );
}

function ServicesSection({ services }: { services: EditorDraft["services"] }) {
  return (
    <section id="servicos" className="flex flex-col gap-3 px-4 pt-4">
      <h2 className="text-base font-semibold">Os nossos serviços</h2>
      <ul className="flex flex-col gap-2">
        {services.map((s) => (
          <li key={s.id}>
            <div className="flex h-14 items-center gap-3 rounded-lg bg-[#fafafa] px-4 text-[#0a0a0a]">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{s.name}</p>
                <p className="text-xs text-[#71717a]">{s.durationMinutes} min</p>
              </div>
              <p className="shrink-0 text-sm font-semibold tabular-nums">
                {(s.priceCents / 100).toFixed(2)} €
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function TeamSection({ staff }: { staff: EditorDraft["staffMembers"] }) {
  return (
    <section id="equipa" className="flex flex-col gap-3 px-4 pt-4">
      <h2 className="text-base font-semibold">A nossa equipa</h2>
      <ul className="grid grid-cols-2 gap-2">
        {staff.map((m) => (
          <li key={m.id}>
            <article className="overflow-hidden rounded-lg bg-[#1a1a1d]">
              <div className="relative aspect-square w-full bg-[#27272a]">
                {m.avatarUrl ? (
                  <Image
                    src={m.avatarUrl}
                    alt={m.fullName}
                    fill
                    sizes="(max-width: 480px) 50vw, 230px"
                    className="object-cover"
                    unoptimized
                  />
                ) : null}
              </div>
              <div className="px-3 py-3">
                <p className="truncate text-sm font-semibold text-[#fafafa]">
                  {m.fullName}
                </p>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}

function GallerySection({ images }: { images: string[] }) {
  return (
    <section className="flex flex-col gap-3 px-4 pt-4">
      <h2 className="text-base font-semibold">Últimos trabalhos</h2>
      <div className="-mx-4 overflow-hidden px-4">
        <ul className="animate-marquee flex w-max gap-2">
          {[...images, ...images].map((src, idx) => (
            <li
              key={`${idx}-${src}`}
              className="shrink-0"
              aria-hidden={idx >= images.length || undefined}
            >
              <div className="relative size-44 overflow-hidden rounded-lg bg-[#27272a]">
                <Image
                  src={src}
                  alt={idx >= images.length ? "" : `Trabalho ${idx + 1}`}
                  fill
                  sizes="176px"
                  className="object-cover"
                  unoptimized
                />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function LocationSection({ address }: { address: string }) {
  const encoded = encodeURIComponent(address);
  return (
    <section id="onde-estamos" className="flex flex-col gap-3 px-4 pt-4">
      <h2 className="text-base font-semibold">Onde estamos</h2>
      <div className="overflow-hidden rounded-lg border border-white/[0.08] bg-[#1a1a1d]">
        <iframe
          title={`Mapa de ${address}`}
          src={`https://www.google.com/maps?q=${encoded}&output=embed`}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
          className="aspect-[5/3] w-full border-0"
          style={{ colorScheme: "dark" }}
        />
      </div>
    </section>
  );
}

function SocialIcons({
  phoneDigits,
  instagramUrl,
  tiktokUrl,
  facebookUrl,
}: {
  phoneDigits: string;
  instagramUrl: string;
  tiktokUrl: string;
  facebookUrl: string;
}) {
  const items: Array<{ label: string; icon: React.ReactElement }> = [];

  if (phoneDigits) {
    items.push({
      label: "WhatsApp",
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
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M22 12a10 10 0 1 0-11.56 9.88V14.9H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.23.2 2.23.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.45 2.9h-2.33v6.98A10 10 0 0 0 22 12z" />
        </svg>
      ),
    });
  }

  if (items.length === 0) return null;

  return (
    <div className="flex items-center justify-center gap-6 px-4">
      {items.map((item) => (
        <span
          key={item.label}
          aria-label={item.label}
          className="text-[#fafafa] transition hover:opacity-70"
        >
          {item.icon}
        </span>
      ))}
    </div>
  );
}
