import type { Metadata } from "next";
import "./globals.css";
import { DEFAULT_OG_IMAGE, SITE_URL } from "@/lib/site-config";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "De Voetbalgazet — Lokaal voetbal, echte verhalen",
    template: "%s | De Voetbalgazet",
  },
  description:
    "Verhalen, interviews en analyses uit het lokale voetbal in Vlaanderen.",
  alternates: {
    canonical: "/",
    types: {
      "application/rss+xml": "/feed.xml",
    },
  },
  openGraph: {
    type: "website",
    locale: "nl_BE",
    siteName: "De Voetbalgazet",
    title: "De Voetbalgazet — Lokaal voetbal, echte verhalen",
    description:
      "Verhalen, interviews en analyses uit het lokale voetbal in Vlaanderen.",
    images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "De Voetbalgazet — Lokaal voetbal, echte verhalen",
    description:
      "Verhalen, interviews en analyses uit het lokale voetbal in Vlaanderen.",
    images: [DEFAULT_OG_IMAGE],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl-BE">
      <body>
        <a className="skip-link" href="#inhoud">
          Ga naar de inhoud
        </a>
        <div id="inhoud" tabIndex={-1}>
          {children}
        </div>
      </body>
    </html>
  );
}
