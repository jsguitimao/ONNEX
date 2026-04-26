import type { MetadataRoute } from "next";
import { getAppUrl } from "@/lib/app-config";
import { listPublicBusinessSlugs } from "@/lib/business";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const appUrl = getAppUrl();
  const now = new Date();

  const businesses = await listPublicBusinessSlugs().catch(() => []);

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
