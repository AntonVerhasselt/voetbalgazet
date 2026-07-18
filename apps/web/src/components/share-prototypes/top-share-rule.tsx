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
 * Top 2 — Rule Strip
 * Hairline editorial strip: mono label + WhatsApp text link + icon cluster.
 */
export function TopShareRule({
  articleId,
  headline,
}: {
  articleId: string;
  headline: string;
}) {
  const { url, copied, track, copyLink } = useShareActions(articleId);

  return (
    <section
      className="top-share top-share--rule"
      aria-label="Deel dit verhaal"
      data-top-share="rule"
    >
      <span className="top-share-rule__label">Deel</span>
      <a
        className="top-share-rule__wa"
        href={whatsappShareHref(headline, url)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => track("whatsapp")}
      >
        <WhatsAppIcon />
        Stuur naar de ploegchat
      </a>
      <span className="top-share-rule__sep" aria-hidden="true" />
      <ul className="top-share-rule__others">
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
