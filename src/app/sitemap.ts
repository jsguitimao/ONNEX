import type { MetadataRoute } from "next";
import { unstable_cache } from "next/cache";
import { getAppUrl } from "@/lib/app-config";
import { listPublicBusinessSlugs } from "@/lib/business";
import { captureException } from "@/lib/observability";

export const revalidate = 3600;
export const dynamic = "force-dynamic";

const listCachedPublicBusinessSlugs = unstable_cache(
  listPublicBusinessSlugs,
  ["sitemap-public-business-slugs"],
  { revalidate: 3600 },
);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const appUrl = getAppUrl();
  const now = new Date();

  const businesses = await listCachedPublicBusinessSlugs().catch((error) => {
    captureException("sitemap.business_slugs_failed", error, {
      route: "/sitemap.xml",
    });
    return [];
  });

  return [
    {
      url: appUrl,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    ...businesses.map((business) => ({
      url: `${appUrl}/${business.slug}`,
      lastModified: business.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    {
      url: `${appUrl}/privacidade`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${appUrl}/termos`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
