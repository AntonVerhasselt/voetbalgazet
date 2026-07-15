import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://devoetbalgazet.be"),
  title: {
    default: "De Voetbalgazet — Lokaal voetbal, echte verhalen",
    template: "%s | De Voetbalgazet",
  },
  description:
    "Verhalen, interviews en analyses uit het lokale voetbal in Vlaanderen.",
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
