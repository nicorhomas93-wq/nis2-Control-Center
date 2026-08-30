import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/check", "/pricing", "/demo", "/legal"],
        disallow: [
          "/api/",
          "/dashboard",
          "/assessment",
          "/audit",
          "/aufgaben",
          "/auth",
          "/betroffenheit",
          "/billing",
          "/company",
          "/documents",
          "/export",
          "/fragebogen",
          "/incidents",
          "/integrationen",
          "/invite",
          "/jarvis",
          "/lieferanten",
          "/login",
          "/mandanten",
          "/measures",
          "/owner",
          "/register",
          "/result",
          "/risks",
          "/schulungen",
          "/settings",
          "/success",
          "/upgrade",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
