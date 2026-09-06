/**
 * Static company facts and interface copy defaults.
 *
 * Anything an administrator can edit at runtime lives in the site_content table
 * and overrides these values. What remains here is the fallback used before the
 * database is reachable, and the single place a developer edits a phone number.
 */

export const site = {
  name: "Malhotra Enterprise",
  shortName: "Malhotra",
  tagline: "Architectural and home hardware",
  description:
    "Architectural hardware for modern homes, commercial spaces and interior projects. Browse the catalogue and send an inquiry to our team in Kathmandu.",
  locale: "en_NP",
  city: "Kathmandu",
  country: "Nepal",
} as const;

export const contact = {
  phone: "+977 1 4000000",
  phoneHref: "tel:+97714000000",
  whatsappNumber: "9779800000000",
  email: "inquiries@malhotraenterprise.com.np",
  addressLines: ["New Road", "Kathmandu 44600", "Nepal"],
  hours: [
    { days: "Sunday to Friday", time: "10:00 to 18:00" },
    { days: "Saturday", time: "Closed" },
  ],
} as const;

/** Opens WhatsApp with a message already written for the customer. */
export function whatsappLink(message?: string): string {
  const base = `https://wa.me/${contact.whatsappNumber}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export const primaryNavigation = [
  { label: "Home", href: "/" },
  { label: "Products", href: "/products" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
] as const;
