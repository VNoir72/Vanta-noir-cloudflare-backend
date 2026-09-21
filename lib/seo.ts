import type { Metadata } from "next";

// Keep the owner's chosen public domain consistent across search metadata.
export const SITE_URL = "https://vantanoir.store";

export const SEO_PAGES = {
  home: {
    path: "/",
    title: "Vanta Noir | Presence. Power. Precision.",
    description: "Vanta Noir — Presence. Power. Precision. Discover distinctive streetwear, denim, knitwear, outerwear, athletic pieces and everyday accessories.",
  },
  about: {
    path: "/about",
    title: "About Vanta Noir",
    description: "Discover Vanta Noir — Presence. Power. Precision. Individuality, quiet confidence and purposeful fashion with an athletic influence.",
  },
  contact: {
    path: "/contact",
    title: "Contact & Customer Care | Vanta Noir",
    description: "Contact Vanta Noir customer care for help with orders, sizing, product details, stock and delivery. Find our email and social channels.",
  },
  help: {
    path: "/help-center",
    title: "Help Center | Vanta Noir",
    description: "Find answers about Vanta Noir orders, shipping, returns, payments and sizing. Track your order as a guest or contact customer care.",
  },
  studio: {
    path: "/case-studies",
    title: "Studio Notes & Collection Design | Vanta Noir",
    description: "Explore the thinking behind Vanta Noir collections, from the four-style product system to technical details designed for movement.",
  },
  reviews: {
    path: "/reviews",
    title: "Customer Reviews | Vanta Noir",
    description: "Learn how Vanta Noir verifies customer feedback and how to share your experience after receiving an order.",
  },
  shipping: {
    path: "/shipping-returns",
    title: "Shipping & Returns | Vanta Noir",
    description: "Read Vanta Noir shipping, delivery, returns, exchanges and refund information, including how to contact care about your order.",
  },
  privacy: {
    path: "/privacy-policy",
    title: "Privacy Policy | Vanta Noir",
    description: "Learn how Vanta Noir collects, uses and protects personal information, including order details, essential storage and Google Analytics.",
  },
  terms: {
    path: "/terms-of-service",
    title: "Terms of Service | Vanta Noir",
    description: "Read the terms that apply when browsing Vanta Noir, placing an order, making a payment or contacting customer care.",
  },
  choices: {
    path: "/privacy-choices",
    title: "Your Privacy Choices | Vanta Noir",
    description: "Learn about Vanta Noir’s essential browser storage, Google Analytics cookies and the browser controls available to manage them.",
  },
} as const;

export const SOCIAL_IMAGE = {
  url: `${SITE_URL}/images/vanta-hero.png`,
  width: 1672,
  height: 941,
  alt: "Vanta Noir technical streetwear collection",
};

export function pageMetadata(page: keyof typeof SEO_PAGES): Metadata {
  const { path, title, description } = SEO_PAGES[page];
  const url = new URL(path, SITE_URL).href;

  return {
    // Absolute titles prevent inherited templates from repeating the brand.
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      siteName: "Vanta Noir",
      title,
      description,
      url,
      images: [SOCIAL_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [SOCIAL_IMAGE.url],
    },
  };
}
