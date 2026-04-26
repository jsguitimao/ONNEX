import Image from "next/image";
import { mockBusiness } from "@/lib/mock-business";
import { BioLocationSection } from "@/components/bio-location-section";
import { BioSection } from "@/components/bio-section";
import { BioSectionActionLink } from "@/components/bio-section-action";
import { BioTabs } from "@/components/bio-tabs";
import { BookingSheetProvider } from "@/components/booking-sheet";
import { ServicesCatalog } from "@/components/services-catalog";

export const dynamic = "force-static";

// Sombra extraída da referência: 3 brilhos brancos subtis (não drop shadow preto).
const CARD_SHADOW =
  "rgba(250,250,250,0.09) 0.301094px 0.301094px 1.27743px -1px, rgba(250,250,250,0.082) 1.14427px 1.14427px 4.85471px -2px, rgba(250,250,250,0.06) 5px 5px 21.2132px -3px";

export default function MockPublicPage() {
  const business = mockBusiness;
  const phoneDigits = (business.phone ?? "").replace(/\D/g, "");
  const heroImage = business.heroImageUrl ?? business.coverImageUrl;
  const portfolio = Array.from(
    new Set(business.staffMembers.flatMap((m) => m.portfolioImages)),
  );

  return (
    <BookingSheetProvider business={business} mockMode>
      <main className="min-h-screen bg-[#0e0e11] text-[#fafafa]">
        <div className="bio-container py-6 sm:py-10">
          <div
            className="overflow-hidden rounded-2xl bg-[#09090b]"
            style={{ boxShadow: CARD_SHADOW }}
          >
            {/* 1. Hero */}
            {heroImage ? (
              <div className="relative aspect-square w-full bg-[#1a1a1d]">
                <Image
                  src={heroImage}
                  alt={business.name}
                  fill
                  priority
                  sizes="(max-width: 480px) 100vw, 460px"
                  className="object-cover"
                />
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0"
                  style={{
                    backgroundImage:
                      "linear-gradient(rgba(250,250,250,0) 0%, #09090b 95.1718%)",
                  }}
                />
              </div>
            ) : null}

            <div className="flex flex-col gap-4 pb-4 pt-6">
              {/* 2. Nome */}
              <header className="flex flex-col items-center px-4 text-center">
                <h1
                  className="font-bold text-[#fafafa]"
                  style={{
                    fontSize: "40px",
                    lineHeight: "56px",
                    letterSpacing: "-1.6px",
                  }}
                >
                  {business.name}
                </h1>
              </header>

              {/* 3. Sociais */}
              <SocialIcons
                phoneDigits={phoneDigits}
                instagramUrl={business.instagramUrl}
                tiktokUrl={business.tiktokUrl}
                facebookUrl={business.facebookUrl}
              />

              {/* 4. Tabs */}
              <BioTabs />

              {/* 5. Serviços */}
              <ServicesCatalog services={business.services} featured={5} />

              {/* 6. Equipa */}
              <BioSection
                id="equipa"
                title="A nossa equipa"
                headerAction={
                  business.staffMembers.length > 4 ? (
                    <BioSectionActionLink href="#equipa">VER TODOS</BioSectionActionLink>
                  ) : null
                }
              >
                <ul className="grid grid-cols-2 gap-2">
                  {business.staffMembers.map((member) => (
                    <li key={member.id}>
                      <article className="overflow-hidden rounded-lg bg-[#1a1a1d]">
                        <div className="relative aspect-square w-full bg-[#27272a]">
                          {member.avatarUrl ? (
                            <Image
                              src={member.avatarUrl}
                              alt={member.fullName}
                              fill
                              sizes="(max-width: 480px) 50vw, 230px"
                              className="object-cover"
                            />
                          ) : null}
                        </div>
                        <div className="px-3 py-3">
                          <p className="truncate text-sm font-semibold text-[#fafafa]">
                            {member.fullName}
                          </p>
                        </div>
                      </article>
                    </li>
                  ))}
                </ul>
              </BioSection>

              {/* 7. Galeria — carousel auto-scroll, pausa em hover, respeita prefers-reduced-motion */}
              {portfolio.length > 0 ? (
                <BioSection id="galeria" title="Últimos trabalhos">
                  <div
                    className="-mx-4 overflow-hidden px-4"
                    aria-roledescription="carousel"
                  >
                    <ul className="animate-marquee flex w-max gap-2">
                      {[...portfolio, ...portfolio].map((src, idx) => (
                        <li
                          key={`${idx}-${src}`}
                          className="shrink-0"
                          aria-hidden={idx >= portfolio.length || undefined}
                        >
                          <div className="relative size-44 overflow-hidden rounded-lg bg-[#27272a]">
                            <Image
                              src={src}
                              alt={
                                idx >= portfolio.length
                                  ? ""
                                  : `Trabalho ${idx + 1}`
                              }
                              fill
                              sizes="176px"
                              className="object-cover"
                            />
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </BioSection>
              ) : null}

              {/* 8. Onde estamos */}
              {business.mapsAddress ? (
                <BioLocationSection address={business.mapsAddress} />
              ) : null}

              {/* 9. Footer */}
              <footer className="flex flex-col items-center gap-1 px-4 py-6 text-center">
                <p className="text-xs text-[#71717a]">
                  © {new Date().getFullYear()} · {business.name}
                </p>
              </footer>
            </div>
          </div>
        </div>
      </main>
    </BookingSheetProvider>
  );
}

type SocialIconsProps = {
  phoneDigits: string;
  instagramUrl: string | null;
  tiktokUrl: string | null;
  facebookUrl: string | null;
};

function SocialIcons({
  phoneDigits,
  instagramUrl,
  tiktokUrl,
  facebookUrl,
}: SocialIconsProps) {
  const items: Array<{ href: string; label: string; icon: React.ReactElement }> = [];

  if (phoneDigits) {
    items.push({
      href: `https://wa.me/${phoneDigits}`,
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
      href: instagramUrl,
      label: "Instagram",
      icon: (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden
        >
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
        </svg>
      ),
    });
  }
  if (tiktokUrl) {
    items.push({
      href: tiktokUrl,
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
      href: facebookUrl,
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
        <a
          key={item.label}
          href={item.href}
          target="_blank"
          rel="noreferrer"
          aria-label={item.label}
          className="text-[#fafafa] transition hover:opacity-70"
        >
          {item.icon}
        </a>
      ))}
    </div>
  );
}
