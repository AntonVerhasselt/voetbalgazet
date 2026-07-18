import { TopShareCaption } from "@/components/share-prototypes/top-share-caption";
import { TopShareIcons } from "@/components/share-prototypes/top-share-icons";
import { TopShareMore } from "@/components/share-prototypes/top-share-more";
import { TopSharePill } from "@/components/share-prototypes/top-share-pill";
import { TopShareRule } from "@/components/share-prototypes/top-share-rule";

export const TOP_SHARE_PROTOTYPES = [
  {
    slug: "pill",
    number: 1,
    title: "Ploegchat Pill",
    summary:
      "Eén regel: groene “Ploegchat”-pill + stille iconen. Minimale hoogte.",
    Component: TopSharePill,
  },
  {
    slug: "rule",
    number: 2,
    title: "Rule Strip",
    summary:
      "Editoriale hairline: label “Deel”, WhatsApp-tekstlink, daarna iconen.",
    Component: TopShareRule,
  },
  {
    slug: "icons",
    number: 3,
    title: "Icon Rail",
    summary:
      "Alleen iconen — WhatsApp licht uitgelicht. Geen zichtbare copy.",
    Component: TopShareIcons,
  },
  {
    slug: "caption",
    number: 4,
    title: "Caption Pair",
    summary:
      "Als bijschrift: “Voor de ploegchat” links, compacte acties rechts.",
    Component: TopShareCaption,
  },
  {
    slug: "more",
    number: 5,
    title: "Meer-menu",
    summary:
      "Één WhatsApp-link + “Meer” voor de rest. Kleinste default footprint.",
    Component: TopShareMore,
  },
] as const;

export type TopSharePrototypeSlug =
  (typeof TOP_SHARE_PROTOTYPES)[number]["slug"];

export function getTopSharePrototype(slug: string) {
  return TOP_SHARE_PROTOTYPES.find((prototype) => prototype.slug === slug);
}
