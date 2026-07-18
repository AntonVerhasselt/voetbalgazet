"use client";

import { useState } from "react";
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
 * Top 5 — More Menu
 * Single WhatsApp link + “Meer” disclosure for other channels. Smallest default footprint.
 */
export function TopShareMore({
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
      className="top-share top-share--more"
      aria-label="Deel dit verhaal"
      data-top-share="more"
    >
      <a
        className="top-share-more__wa"
        href={whatsappShareHref(headline, url)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => track("whatsapp")}
      >
        <WhatsAppIcon />
        Stuur naar de ploegchat
      </a>
      <div className="top-share-more__wrap">
        <button
          type="button"
          className="top-share-more__toggle"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          Meer
        </button>
        {open ? (
          <ul className="top-share-more__menu" role="list">
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
        ) : null}
      </div>
    </section>
  );
}
