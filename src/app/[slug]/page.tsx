import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { HeroVideo } from "@/components/hero-video";
import { PublicBookingFlow } from "@/components/public-booking-flow";
import { PublicStaffGrid } from "@/components/public-staff-grid";
import { SocialLinks } from "@/components/social-links";
import { getBusinessBySlug, getPublicBusinessPayload } from "@/lib/business";
import { getAppUrl } from "@/lib/app-config";

export const revalidate = 60;

type PublicPageProps = {
  params: Promise<{ slug: string }>;
};

function isHeroVideo(url: string) {
  const lowered = url.toLowerCase().split("?")[0];
  return /\.(mp4|webm)$/.test(lowered);
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
    `${business.name} — Marcação online`;
  const description =
    business.bookingPage?.seoDescription?.trim() ||
    business.bookingPage?.headline?.trim() ||
    business.description?.trim() ||
    `Marca online com ${business.name}.`;

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
    ...(() => {
      const sameAs = [business.instagramUrl, business.tiktokUrl, business.facebookUrl].filter(
        (url): url is string => Boolean(url),
      );
      return sameAs.length > 0 ? { sameAs } : {};
    })(),
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
            <HeroVideo
              src={heroImage}
              posterUrl={business.coverImageUrl ?? business.logoUrl}
              ariaLabel={`${business.name} — vídeo principal`}
            />
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
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[15%] bg-gradient-to-b from-transparent to-background"
        />
      </section>

      {/* 2. Nome da barbearia */}
      <section className="mx-auto max-w-[480px] px-5 pt-10 text-center sm:pt-14">
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
          tiktokUrl={business.tiktokUrl}
          facebookUrl={business.facebookUrl}
          className="mt-6"
        />
      </section>

      {/* 4. Barbeiros + portfolio */}
      {publicBusiness.showTeam && publicBusiness.staffMembers.length > 0 ? (
        <section className="mx-auto max-w-[480px] px-5 py-12 sm:py-16">
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
        <section id="booking" className="mx-auto max-w-[480px] px-5 py-12 sm:py-16">
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
        <section className="mx-auto max-w-[480px] px-5 py-12 sm:py-16">
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
        <div className="mx-auto flex max-w-[480px] flex-col items-center gap-4 px-5 text-center">
          <p className="text-lg font-semibold">{business.name}</p>
          <SocialLinks
            phoneDigits={phoneDigits}
            instagramUrl={business.instagramUrl}
            tiktokUrl={business.tiktokUrl}
            facebookUrl={business.facebookUrl}
          />
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} · {business.name}
          </p>
        </div>
      </footer>
    </main>
  );
}

