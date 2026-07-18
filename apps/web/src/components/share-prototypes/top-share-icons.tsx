"use client";

import {
  emailShareHref,
  facebookShareHref,
  whatsappShareHref,
  xShareHref,
} from "@/lib/share";
import {
  FacebookIcon,
  LinkIcon,
  MailIcon,
  WhatsAppIcon,
  XIcon,
} from "@/components/share-icons";
import { useShareActions } from "@/components/share-prototypes/use-share-actions";

/**
 * Top 3 — Icon Rail
 * Ultra-compact: WhatsApp tinted first, then equal icons. No text beyond aria-labels.
 */
export function TopShareIcons({
  articleId,
  headline,
}: {
  articleId: string;
  headline: string;
}) {
  const { url, copied, track, copyLink } = useShareActions(articleId);

  return (
    <section
      className="top-share top-share--icons"
      aria-label="Deel dit verhaal"
      data-top-share="icons"
    >
      <a
        className="top-share-icons__wa"
        href={whatsappShareHref(headline, url)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Stuur naar de ploegchat via WhatsApp"
        title="Stuur naar de ploegchat"
        onClick={() => track("whatsapp")}
      >
        <WhatsAppIcon />
      </a>
      <a
        href={facebookShareHref(url)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Deel op Facebook"
        onClick={() => track("facebook")}
      >
        <FacebookIcon />
      </a>
      <a
        href={xShareHref(headline, url)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Deel op X"
        onClick={() => track("x")}
      >
        <XIcon />
      </a>
      <a
        href={emailShareHref(headline, url)}
        aria-label="Deel via e-mail"
        onClick={() => track("email")}
      >
        <MailIcon />
      </a>
      <button
        type="button"
        aria-label={copied ? "Link gekopieerd" : "Kopieer link"}
        onClick={() => void copyLink()}
      >
        <LinkIcon />
      </button>
      {copied ? (
        <span className="top-share-icons__copied" aria-live="polite">
          Gekopieerd
        </span>
      ) : null}
    </section>
  );
}
