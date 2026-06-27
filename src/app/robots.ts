import type { MetadataRoute } from "next";
import { getAppUrl } from "@/lib/app-config";

export default function robots(): MetadataRoute.Robots {
  const appUrl = getAppUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard", "/onboarding", "/sign-in", "/sign-up", "/api/", "/booking/", "/mock", "/preview"],
      },
    ],
    sitemap: `${appUrl}/sitemap.xml`,
    host: appUrl,
  };
}
