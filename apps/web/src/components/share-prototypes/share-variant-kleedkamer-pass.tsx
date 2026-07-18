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
 * Variant 2 — Kleedkamer Pass
 * Ticket/pass metaphor: tear-off stub for WhatsApp, perforated row for other channels.
 */
export function ShareVariantKleedkamerPass({
  articleId,
  headline,
}: {
  articleId: string;
  headline: string;
}) {
  const { url, copied, track, copyLink } = useShareActions(articleId);

  return (
    <section
      className="share-v share-v--pass"
      aria-label="Deel dit verhaal"
      data-share-variant="kleedkamer-pass"
    >
      <div className="share-pass">
        <div className="share-pass__main">
          <p className="share-pass__series">Doorsturen · seizoen 25/26</p>
          <h2 className="share-pass__title">Kleedkamerpass</h2>
          <p className="share-pass__dek">
            Geef dit verhaal door aan wie erbij moet zijn.
          </p>
          <a
            className="share-pass__whatsapp"
            href={whatsappShareHref(headline, url)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track("whatsapp")}
          >
            <WhatsAppIcon />
            Open WhatsApp
          </a>
        </div>
        <div className="share-pass__stub" aria-label="Andere kanalen">
          <a
            href={facebookShareHref(url)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track("facebook")}
          >
            <FacebookIcon />
            <span>Facebook</span>
          </a>
          <a
            href={xShareHref(headline, url)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track("x")}
          >
            <XIcon />
            <span>X</span>
          </a>
          <a
            href={emailShareHref(headline, url)}
            onClick={() => track("email")}
          >
            <MailIcon />
            <span>Mail</span>
          </a>
          <button type="button" onClick={() => void copyLink()}>
            <LinkIcon />
            <span>{copied ? "Gekopieerd" : "Link"}</span>
          </button>
        </div>
      </div>
    </section>
  );
}
