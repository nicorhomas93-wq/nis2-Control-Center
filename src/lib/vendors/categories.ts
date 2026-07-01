import type { VendorCategory } from "@/lib/vendors/types";

export const VENDOR_CATEGORIES: VendorCategory[] = [
  "cloud",
  "hosting",
  "saas",
  "rechenzentrum",
  "managed_services",
  "it_dienstleister",
  "softwareanbieter",
  "telekommunikation",
  "sonstiger",
];

export const VENDOR_CATEGORY_LABELS: Record<VendorCategory, string> = {
  cloud: "Cloud",
  hosting: "Hosting",
  saas: "SaaS",
  rechenzentrum: "Rechenzentrum",
  managed_services: "Managed Services",
  it_dienstleister: "IT-Dienstleister",
  softwareanbieter: "Softwareanbieter",
  telekommunikation: "Telekommunikation",
  sonstiger: "Sonstiger Dienstleister",
};

export const VENDOR_STATUS_LABELS = {
  active: "Aktiv",
  inactive: "Inaktiv",
} as const;
