export function normalizeWhatsAppPhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 8) return null;
  if (digits.startsWith("0")) return `49${digits.slice(1)}`;
  return digits;
}

export function buildWhatsAppUrl(phone: string, text: string): string | null {
  const normalized = normalizeWhatsAppPhone(phone);
  if (!normalized) return null;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(text)}`;
}

export function buildMailtoUrl(email: string, subject: string, body: string): string {
  const params = new URLSearchParams();
  if (subject) params.set("subject", subject);
  if (body) params.set("body", body);
  const query = params.toString();
  return query ? `mailto:${email}?${query}` : `mailto:${email}`;
}
