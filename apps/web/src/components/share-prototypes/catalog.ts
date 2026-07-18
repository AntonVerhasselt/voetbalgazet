import { ShareVariantGazetSheet } from "@/components/share-prototypes/share-variant-gazet-sheet";
import { ShareVariantKenIemand } from "@/components/share-prototypes/share-variant-ken-iemand";
import { ShareVariantKleedkamerPass } from "@/components/share-prototypes/share-variant-kleedkamer-pass";
import { ShareVariantStickyDock } from "@/components/share-prototypes/share-variant-sticky-dock";
import { ShareVariantWhatsAppHero } from "@/components/share-prototypes/share-variant-whatsapp-hero";

export const SHARE_PROTOTYPES = [
  {
    slug: "whatsapp-hero",
    number: 1,
    title: "WhatsApp Hero",
    summary:
      "Één grote WhatsApp-CTA (“Stuur naar de ploegchat”) met een stille icoonrij voor de rest.",
    Component: ShareVariantWhatsAppHero,
  },
  {
    slug: "kleedkamer-pass",
    number: 2,
    title: "Kleedkamerpass",
    summary:
      "Ticket/pass-metafoor: WhatsApp op het hoofddeel, andere kanalen op een afscheurbare stub.",
    Component: ShareVariantKleedkamerPass,
  },
  {
    slug: "sticky-dock",
    number: 3,
    title: "Sticky Dock",
    summary:
      "Mobiel dock onderaan het scherm met WhatsApp centraal en een uitklapbare tray voor meer.",
    Component: ShareVariantStickyDock,
  },
  {
    slug: "ken-iemand",
    number: 4,
    title: "Ken jij iemand?",
    summary:
      "Gesprekspunt na het lezen — WhatsApp als grootste chip, daarna Messenger, mail en link.",
    Component: ShareVariantKenIemand,
  },
  {
    slug: "gazet-sheet",
    number: 5,
    title: "Gazet Sheet",
    summary:
      "Compacte “Deel dit stuk”-knop opent een bottomsheet met WhatsApp als heldenactie.",
    Component: ShareVariantGazetSheet,
  },
] as const;

export type SharePrototypeSlug = (typeof SHARE_PROTOTYPES)[number]["slug"];

export function getSharePrototype(slug: string) {
  return SHARE_PROTOTYPES.find((prototype) => prototype.slug === slug);
}
