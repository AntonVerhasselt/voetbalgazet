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
 * Top 1 — Ploegchat Pill
 * One-line green pill + quiet icons. Minimal vertical space.
 */
export function TopSharePill({
  articleId,
  headline,
}: {
  articleId: string;
  headline: string;
}) {
  const { url, copied, track, copyLink } = useShareActions(articleId);

  return (
    <section
      className="top-share top-share--pill"
      aria-label="Deel dit verhaal"
      data-top-share="pill"
    >
      <a
        className="top-share-pill__wa"
        href={whatsappShareHref(headline, url)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => track("whatsapp")}
      >
        <WhatsAppIcon />
        <span>Ploegchat</span>
      </a>
      <ul className="top-share-pill__others">
        <li>
          <a
            href={facebookShareHref(url)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Facebook"
            onClick={() => track("facebook")}
          >
            <FacebookIcon />
          </a>
        </li>
        <li>
          <a
            href={xShareHref(headline, url)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="X"
            onClick={() => track("x")}
          >
            <XIcon />
          </a>
        </li>
        <li>
          <a
            href={emailShareHref(headline, url)}
            aria-label="E-mail"
            onClick={() => track("email")}
          >
            <MailIcon />
          </a>
        </li>
        <li>
          <button
            type="button"
            aria-label={copied ? "Gekopieerd" : "Kopieer link"}
            onClick={() => void copyLink()}
          >
            <LinkIcon />
          </button>
        </li>
      </ul>
    </section>
  );
}
