import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { HeroVideo } from "@/components/hero-video";
import { PublicBookingFlow } from "@/components/public-booking-flow";
import { PublicStaffGrid } from "@/components/public-staff-grid";
import { getBusinessBySlug, getPublicBusinessPayload } from "@/lib/business";
import { getAppUrl } from "@/lib/app-config";

export const dynamic = "force-dynamic";

type PublicPageProps = {
  params: Promise<{ slug: string }>;
};

function isHeroVideo(url: string) {
  const lowered = url.toLowerCase().split("?")[0];
  return /\.(mp4|webm|mov)$/.test(lowered);
}

function buildPublicPageMetadata(input: {
  name: string;
  slug: string;
  description: string;
  imageUrl?: string | null;
}) {
  const url = `${getAppUrl()}/${input.slug}`;
  const images = input.imageUrl ? [{ url: input.imageUrl }] : undefined;

  return {
    title: input.name,
    description: input.description,
    alternates: { canonical: url },
    openGraph: {
      title: input.name,
      description: input.description,
      url,
      type: "website",
      images,
    },
    twitter: {
      card: images ? "summary_large_image" : "summary",
      title: input.name,
      description: input.description,
      images: input.imageUrl ? [input.imageUrl] : undefined,
    },
  } satisfies Metadata;
}

export async function generateMetadata({ params }: PublicPageProps): Promise<Metadata> {
  const { slug } = await params;
  const business = await getBusinessBySlug(slug);

  if (!business) {
    return {
      title: "Página não encontrada | BUKBARBEARIA.COM",
      description: "A página pública pedida não está disponível.",
    };
  }

  const title =
    business.bookingPage?.seoTitle?.trim() ||
    `${business.name} | Marcação online na BUKBARBEARIA.COM`;
  const description =
    business.bookingPage?.seoDescription?.trim() ||
    business.bookingPage?.headline?.trim() ||
    business.description?.trim() ||
    `Marca online com ${business.name} na BUKBARBEARIA.COM.`;

  return buildPublicPageMetadata({
    name: title,
    slug: business.slug,
    description,
    imageUrl: business.coverImageUrl || business.logoUrl,
  });
}

export default async function PublicBookingPage({ params }: PublicPageProps) {
  const { slug } = await params;
  const business = await getBusinessBySlug(slug);
  const publicBusiness = await getPublicBusinessPayload(slug);

  if (!business || !publicBusiness) {
    notFound();
  }

  const location = business.locations[0];
  const phoneDigits = (business.contactPhone ?? "").replace(/\D/g, "");
  const heroImage = publicBusiness.heroImageUrl ?? business.coverImageUrl ?? business.logoUrl;
  const theme = publicBusiness.theme;

  const mapQuery = [location?.addressLine1, location?.city].filter(Boolean).join(", ");
  const pageUrl = `${getAppUrl()}/${business.slug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BarberShop",
    name: business.name,
    url: pageUrl,
    ...(business.description ? { description: business.description } : {}),
    ...(heroImage && !isHeroVideo(heroImage) ? { image: heroImage } : {}),
    ...(phoneDigits ? { telephone: `+${phoneDigits}` } : {}),
    ...(business.contactEmail ? { email: business.contactEmail } : {}),
    ...(location
      ? {
          address: {
            "@type": "PostalAddress",
            streetAddress: location.addressLine1 ?? undefined,
            addressLocality: location.city ?? undefined,
            postalCode: location.postalCode ?? undefined,
            addressCountry: location.countryCode ?? "PT",
          },
        }
      : {}),
    ...(business.instagramUrl ? { sameAs: [business.instagramUrl] } : {}),
  };

  return (
    <main
      data-theme={theme}
      className="min-h-screen bg-background text-foreground"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* 1. Hero — 70vh (mobile) / 100vh (desktop) */}
      <section className="relative h-[70vh] w-full overflow-hidden bg-muted md:h-screen">
        {heroImage ? (
          isHeroVideo(heroImage) ? (
            <HeroVideo src={heroImage} ariaLabel={`${business.name} — vídeo principal`} />
          ) : (
            <Image
              src={heroImage}
              alt={`${business.name} — imagem principal`}
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
          )
        ) : null}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-b from-transparent to-background"
        />
      </section>

      {/* 2. Nome da barbearia */}
      <section className="mx-auto max-w-3xl px-5 pt-10 text-center sm:pt-14">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{business.name}</h1>
        {business.description ? (
          <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground sm:text-base">
            {business.description}
          </p>
        ) : null}

        {/* 3. Redes sociais */}
        <SocialLinks
          phoneDigits={phoneDigits}
          instagramUrl={business.instagramUrl}
          websiteUrl={business.websiteUrl}
          className="mt-6"
        />
      </section>

      {/* 4. Barbeiros + portfolio */}
      {publicBusiness.showTeam && publicBusiness.staffMembers.length > 0 ? (
        <section className="mx-auto max-w-5xl px-5 py-12 sm:py-16">
          <header className="mb-6 text-center sm:mb-8">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Os nossos barbeiros</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Seleciona um barbeiro para ver os últimos trabalhos.
            </p>
          </header>
          <PublicStaffGrid staffMembers={publicBusiness.staffMembers} />
        </section>
      ) : null}

      {/* 5. Agendamento */}
      {publicBusiness.onlineBooking ? (
        <section id="booking" className="mx-auto max-w-xl px-5 py-12 sm:py-16">
          <header className="mb-6 text-center">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Agendar horário</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Escolhe serviço, barbeiro e horário. Confirmação imediata.
            </p>
          </header>
          <PublicBookingFlow business={publicBusiness} />
        </section>
      ) : null}

      {/* 6. Google Maps */}
      {mapQuery ? (
        <section className="mx-auto max-w-5xl px-5 py-12 sm:py-16">
          <header className="mb-6 text-center">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Onde estamos</h2>
            {location?.addressLine1 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                {[location.addressLine1, location.city].filter(Boolean).join(" · ")}
              </p>
            ) : null}
          </header>
          <div className="overflow-hidden rounded-2xl border border-border bg-muted">
            <iframe
              src={`https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed`}
              title={`Mapa de ${location?.addressLine1 ?? location?.city ?? business.name}`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="aspect-[16/9] w-full border-0"
              allowFullScreen
            />
          </div>
        </section>
      ) : null}

      {/* 7. Footer */}
      <footer className="border-t border-border py-10">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-5 text-center">
          <p className="text-lg font-semibold">{business.name}</p>
          <SocialLinks
            phoneDigits={phoneDigits}
            instagramUrl={business.instagramUrl}
            websiteUrl={business.websiteUrl}
          />
          {business.contactEmail ? (
            <a
              href={`mailto:${business.contactEmail}`}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              {business.contactEmail}
            </a>
          ) : null}
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} · {business.name}
          </p>
        </div>
      </footer>
    </main>
  );
}

type SocialLinksProps = {
  phoneDigits: string;
  instagramUrl: string | null;
  websiteUrl: string | null;
  className?: string;
};

function SocialLinks({ phoneDigits, instagramUrl, websiteUrl, className }: SocialLinksProps) {
  if (!phoneDigits && !instagramUrl && !websiteUrl) return null;

  const iconClass =
    "flex size-11 items-center justify-center rounded-full border border-border bg-card text-foreground transition hover:-translate-y-0.5 hover:border-ring hover:bg-accent";

  return (
    <div className={`flex items-center justify-center gap-3 ${className ?? ""}`}>
      {phoneDigits ? (
        <a
          href={`https://wa.me/${phoneDigits}`}
          target="_blank"
          rel="noreferrer"
          aria-label="WhatsApp"
          className={iconClass}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M12 2a10 10 0 0 0-8.5 15.3L2 22l4.9-1.4A10 10 0 1 0 12 2zm5.3 14.1c-.2.6-1.2 1.2-1.7 1.3-.4.1-1 .1-1.6-.1-.4-.1-.9-.3-1.5-.5-2.6-1.2-4.4-3.8-4.5-4-.1-.2-1-1.3-1-2.5 0-1.2.6-1.8.9-2.1.2-.2.5-.3.7-.3h.5c.2 0 .4 0 .6.5.2.5.7 1.7.8 1.8.1.1.1.3 0 .5l-.3.4-.4.5c-.1.1-.3.2-.1.5.2.3.8 1.3 1.7 2.1 1.2 1 2.2 1.4 2.5 1.5.3.1.5.1.7-.1l.8-1c.2-.3.5-.2.7-.1l1.7.8c.3.2.5.3.5.5.1.2.1.9-.1 1.6z" />
          </svg>
        </a>
      ) : null}
      {instagramUrl ? (
        <a
          href={instagramUrl}
          target="_blank"
          rel="noreferrer"
          aria-label="Instagram"
          className={iconClass}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
            <rect x="3" y="3" width="18" height="18" rx="5" />
            <circle cx="12" cy="12" r="4" />
            <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
          </svg>
        </a>
      ) : null}
      {websiteUrl ? (
        <a
          href={websiteUrl}
          target="_blank"
          rel="noreferrer"
          aria-label="Website"
          className={iconClass}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
            <circle cx="12" cy="12" r="9" />
            <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
          </svg>
        </a>
      ) : null}
    </div>
  );
}
