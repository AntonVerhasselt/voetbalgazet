"use client";

import { useId, useState } from "react";
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
 * Variant 5 — Gazet Sheet
 * Compact editorial trigger that opens a bottom sheet with WhatsApp as the hero action.
 */
export function ShareVariantGazetSheet({
  articleId,
  headline,
}: {
  articleId: string;
  headline: string;
}) {
  const { url, copied, track, copyLink } = useShareActions(articleId);
  const [open, setOpen] = useState(true);
  const titleId = useId();

  return (
    <section
      className="share-v share-v--sheet"
      aria-label="Deel dit verhaal"
      data-share-variant="gazet-sheet"
    >
      <button
        type="button"
        className="share-sheet__trigger"
        aria-expanded={open}
        aria-controls={titleId}
        onClick={() => setOpen(true)}
      >
        Deel dit stuk
        <span aria-hidden="true">↗</span>
      </button>

      {open ? (
        <div className="share-sheet" role="dialog" aria-labelledby={titleId}>
          <div className="share-sheet__scrim" onClick={() => setOpen(false)} />
          <div className="share-sheet__panel">
            <div className="share-sheet__handle" aria-hidden="true" />
            <div className="share-sheet__header">
              <h2 id={titleId}>Deel dit verhaal</h2>
              <button
                type="button"
                className="share-sheet__close"
                onClick={() => setOpen(false)}
              >
                Sluiten
              </button>
            </div>
            <a
              className="share-sheet__whatsapp"
              href={whatsappShareHref(headline, url)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track("whatsapp")}
            >
              <WhatsAppIcon />
              <span>
                <strong>WhatsApp</strong>
                <em>Meest gebruikt bij De Voetbalgazet</em>
              </span>
            </a>
            <ul className="share-sheet__grid">
              <li>
                <a
                  href={facebookShareHref(url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => track("facebook")}
                >
                  <FacebookIcon />
                  Facebook
                </a>
              </li>
              <li>
                <a
                  href={xShareHref(headline, url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => track("x")}
                >
                  <XIcon />
                  X
                </a>
              </li>
              <li>
                <a
                  href={emailShareHref(headline, url)}
                  onClick={() => track("email")}
                >
                  <MailIcon />
                  Mail
                </a>
              </li>
              <li>
                <button type="button" onClick={() => void copyLink()}>
                  <LinkIcon />
                  {copied ? "Gekopieerd" : "Link"}
                </button>
              </li>
            </ul>
          </div>
        </div>
      ) : null}
    </section>
  );
}
