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
} from "@/components/share-prototypes/share-icons";
import { useShareActions } from "@/components/share-prototypes/use-share-actions";

/**
 * Variant 1 — WhatsApp Hero
 * One dominant green CTA for the club WhatsApp group, quiet icon row for the rest.
 */
export function ShareVariantWhatsAppHero({
  articleId,
  headline,
}: {
  articleId: string;
  headline: string;
}) {
  const { url, copied, track, copyLink } = useShareActions(articleId);

  return (
    <section
      className="share-v share-v--hero"
      aria-label="Deel dit verhaal"
      data-share-variant="whatsapp-hero"
    >
      <p className="share-v__eyebrow">Deel met je ploeg</p>
      <a
        className="share-v-hero__whatsapp"
        href={whatsappShareHref(headline, url)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => track("whatsapp")}
      >
        <WhatsAppIcon className="share-v__icon" />
        <span className="share-v-hero__copy">
          <strong>Stuur naar de WhatsApp-groep</strong>
          <span>De snelste weg naar de kleedkamerchat</span>
        </span>
      </a>
      <ul className="share-v-hero__others">
        <li>
          <a
            href={facebookShareHref(url)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Deel op Facebook"
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
            aria-label="Deel op X"
            onClick={() => track("x")}
          >
            <XIcon />
          </a>
        </li>
        <li>
          <a
            href={emailShareHref(headline, url)}
            aria-label="Deel via e-mail"
            onClick={() => track("email")}
          >
            <MailIcon />
          </a>
        </li>
        <li>
          <button
            type="button"
            aria-label={copied ? "Link gekopieerd" : "Kopieer link"}
            onClick={() => void copyLink()}
          >
            <LinkIcon />
          </button>
        </li>
      </ul>
      {copied ? (
        <p className="share-v__status" aria-live="polite">
          Link gekopieerd
        </p>
      ) : null}
    </section>
  );
}
