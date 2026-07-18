"use client";

import { useState } from "react";
import {
  emailShareHref,
  facebookShareHref,
  messengerShareHref,
  whatsappShareHref,
  xShareHref,
} from "@/lib/share";
import {
  FacebookIcon,
  LinkIcon,
  MailIcon,
  MessengerIcon,
  WhatsAppIcon,
  XIcon,
} from "@/components/share-prototypes/share-icons";
import { useShareActions } from "@/components/share-prototypes/use-share-actions";

/**
 * Variant 3 — Sticky Dock
 * Mobile-first fixed bottom dock with WhatsApp as the center action.
 * "Meer" reveals secondary channels in a compact tray.
 */
export function ShareVariantStickyDock({
  articleId,
  headline,
}: {
  articleId: string;
  headline: string;
}) {
  const { url, copied, track, copyLink } = useShareActions(articleId);
  const [open, setOpen] = useState(true);

  return (
    <section
      className="share-v share-v--dock"
      aria-label="Deel dit verhaal"
      data-share-variant="sticky-dock"
    >
      <div className="share-dock-preview">
        <p className="share-v__eyebrow">Voorbeeld · sticky dock onderaan</p>
        <p className="share-dock-preview__hint">
          Op artikelpagina&apos;s blijft dit dock vast onderaan het scherm.
        </p>
      </div>

      <div className={`share-dock ${open ? "is-open" : ""}`}>
        {open ? (
          <div className="share-dock__tray" role="group" aria-label="Meer delen">
            <a
              href={facebookShareHref(url)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track("facebook")}
            >
              <FacebookIcon />
              Facebook
            </a>
            <a
              href={messengerShareHref(url)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track("messenger")}
            >
              <MessengerIcon />
              Messenger
            </a>
            <a
              href={xShareHref(headline, url)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track("x")}
            >
              <XIcon />
              X
            </a>
            <a
              href={emailShareHref(headline, url)}
              onClick={() => track("email")}
            >
              <MailIcon />
              Mail
            </a>
            <button type="button" onClick={() => void copyLink()}>
              <LinkIcon />
              {copied ? "Gekopieerd" : "Link"}
            </button>
          </div>
        ) : null}

        <div className="share-dock__bar">
          <button
            type="button"
            className="share-dock__more"
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? "Minder" : "Meer"}
          </button>
          <a
            className="share-dock__whatsapp"
            href={whatsappShareHref(headline, url)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track("whatsapp")}
          >
            <WhatsAppIcon />
            WhatsApp
          </a>
          <span className="share-dock__spacer" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}
