"use client";

import {
  emailShareHref,
  messengerShareHref,
  whatsappShareHref,
} from "@/lib/share";
import {
  LinkIcon,
  MailIcon,
  MessengerIcon,
  WhatsAppIcon,
} from "@/components/share-prototypes/share-icons";
import { useShareActions } from "@/components/share-prototypes/use-share-actions";

/**
 * Variant 4 — Ken Iemand
 * Conversational after-read prompt with channel chips. WhatsApp first and largest.
 */
export function ShareVariantKenIemand({
  articleId,
  headline,
}: {
  articleId: string;
  headline: string;
}) {
  const { url, copied, track, copyLink } = useShareActions(articleId);

  return (
    <section
      className="share-v share-v--prompt"
      aria-label="Deel dit verhaal"
      data-share-variant="ken-iemand"
    >
      <div className="share-prompt">
        <p className="share-prompt__question">
          Ken jij iemand die dit moet lezen?
        </p>
        <p className="share-prompt__hint">
          Stuur het door — vooral via WhatsApp komt het terecht.
        </p>
        <div className="share-prompt__chips">
          <a
            className="share-prompt__chip share-prompt__chip--whatsapp"
            href={whatsappShareHref(headline, url)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track("whatsapp")}
          >
            <WhatsAppIcon />
            WhatsApp
          </a>
          <a
            className="share-prompt__chip"
            href={messengerShareHref(url)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track("messenger")}
          >
            <MessengerIcon />
            Messenger
          </a>
          <a
            className="share-prompt__chip"
            href={emailShareHref(headline, url)}
            onClick={() => track("email")}
          >
            <MailIcon />
            E-mail
          </a>
          <button
            type="button"
            className="share-prompt__chip"
            onClick={() => void copyLink()}
          >
            <LinkIcon />
            {copied ? "Gekopieerd" : "Kopieer link"}
          </button>
        </div>
      </div>
    </section>
  );
}
