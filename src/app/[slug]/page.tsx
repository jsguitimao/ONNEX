import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BookingSheetProvider } from "@/components/booking-sheet";
import { PublicPageRenderer } from "@/components/public-page-renderer";
import { getAppUrl } from "@/lib/app-config";
import { getBusinessBySlug, getPublicBusinessPayload } from "@/lib/business";
import { inferMediaKindFromUrl, isSupportedMediaUrl } from "@/lib/media-url";
import { fromPublicBusiness } from "@/lib/public-page/from-public-business";

export const revalidate = 60;

type PublicPageProps = {
  params: Promise<{ slug: string }>;
};

function isHeroVideo(url: string) {
  return inferMediaKindFromUrl(url) === "video";
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
      title: "Pagina nao encontrada | ONNEX.PT",
      description: "A pagina publica pedida nao esta disponivel.",
    };
  }

  const title =
    business.bookingPage?.seoTitle?.trim() ||
    `${business.name} - Marcacao online`;
  const description =
    business.bookingPage?.seoDescription?.trim() ||
    business.bookingPage?.headline?.trim() ||
    business.description?.trim() ||
    `Marca online com ${business.name}.`;

  return buildPublicPageMetadata({
    name: title,
    slug: business.slug,
    description,
    imageUrl:
      business.bookingPage?.heroImageUrl &&
      isSupportedMediaUrl(business.bookingPage.heroImageUrl) &&
      !isHeroVideo(business.bookingPage.heroImageUrl)
        ? business.bookingPage.heroImageUrl
        : [business.coverImageUrl, business.logoUrl].find(
            (url): url is string => Boolean(url && isSupportedMediaUrl(url)),
          ),
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
  const heroImage = [publicBusiness.heroImageUrl, business.coverImageUrl, business.logoUrl]
    .find((url): url is string => Boolean(url && isSupportedMediaUrl(url)));
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
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <BookingSheetProvider business={publicBusiness}>
        <PublicPageRenderer
          viewModel={fromPublicBusiness(publicBusiness)}
          bookingMode="live"
        />
      </BookingSheetProvider>
    </>
  );
}
