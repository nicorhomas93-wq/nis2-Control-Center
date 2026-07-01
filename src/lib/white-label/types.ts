export interface ConsultantSettings {
  company_id: string;
  white_label_enabled: boolean;
  display_name: string | null;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  accent_color: string | null;
  email_sender_name: string | null;
  support_email: string | null;
  custom_domain: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ResolvedBranding {
  active: boolean;
  displayName: string;
  tagline: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  emailSenderName: string | null;
  supportEmail: string | null;
  customDomain: string | null;
}

export const DEFAULT_BRANDING: ResolvedBranding = {
  active: false,
  displayName: "TKND",
  tagline: "NIS2 Control Center",
  logoUrl: null,
  primaryColor: "#2563eb",
  secondaryColor: "#dbeafe",
  accentColor: "#60a5fa",
  emailSenderName: null,
  supportEmail: null,
  customDomain: null,
};

export const DEFAULT_CONSULTANT_SETTINGS: Omit<ConsultantSettings, "company_id"> = {
  white_label_enabled: false,
  display_name: null,
  logo_url: null,
  primary_color: "#2563eb",
  secondary_color: "#dbeafe",
  accent_color: "#60a5fa",
  email_sender_name: null,
  support_email: null,
  custom_domain: null,
};
