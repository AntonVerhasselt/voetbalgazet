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
 * Top 4 — Caption Pair
 * Sits like a photo credit: caption-style line left, compact share right.
 */
export function TopShareCaption({
  articleId,
  headline,
}: {
  articleId: string;
  headline: string;
}) {
  const { url, copied, track, copyLink } = useShareActions(articleId);

  return (
    <section
      className="top-share top-share--caption"
      aria-label="Deel dit verhaal"
      data-top-share="caption"
    >
      <p className="top-share-caption__hint">Voor de ploegchat</p>
      <div className="top-share-caption__actions">
        <a
          className="top-share-caption__wa"
          href={whatsappShareHref(headline, url)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track("whatsapp")}
        >
          <WhatsAppIcon />
          WhatsApp
        </a>
        <a
          href={facebookShareHref(url)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Facebook"
          onClick={() => track("facebook")}
        >
          <FacebookIcon />
        </a>
        <a
          href={xShareHref(headline, url)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="X"
          onClick={() => track("x")}
        >
          <XIcon />
        </a>
        <a
          href={emailShareHref(headline, url)}
          aria-label="E-mail"
          onClick={() => track("email")}
        >
          <MailIcon />
        </a>
        <button
          type="button"
          aria-label={copied ? "Gekopieerd" : "Kopieer link"}
          onClick={() => void copyLink()}
        >
          <LinkIcon />
        </button>
      </div>
    </section>
  );
}
