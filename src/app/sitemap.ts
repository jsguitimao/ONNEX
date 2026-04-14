import type { MetadataRoute } from "next";
import { getAppUrl } from "@/lib/app-config";
import { db } from "@/lib/db";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const appUrl = getAppUrl();
  const businesses = await db.business.findMany({
    where: {
      status: "ACTIVE",
    },
    select: {
      slug: true,
      updatedAt: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  return [
    {
      url: appUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    ...businesses.map((business) => ({
      url: `${appUrl}/${business.slug}`,
      lastModified: business.updatedAt,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
  ];
}
