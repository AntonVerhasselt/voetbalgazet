"use client";

import { useEffect, useState } from "react";
import {
  FacebookIcon,
  LinkIcon,
  MailIcon,
  WhatsAppIcon,
  XIcon,
} from "@/components/share-icons";
import {
  FEATURE_FLAGS,
  capturePublicEvent,
  getPostHog,
  isFeatureEnabled,
} from "@/lib/analytics";
import {
  articleShareUrl,
  emailShareHref,
  facebookShareHref,
  type ShareChannel,
  whatsappShareHref,
  xShareHref,
} from "@/lib/share";

/**
 * Compact share strip for placement right after the article hero.
 * WhatsApp “Ploegchat” pill + quiet secondary icons.
 */
export function ArticleSharePill({
  articleId,
  headline,
}: {
  articleId: string;
  headline: string;
}) {
  const [enabled, setEnabled] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const client = getPostHog();
    if (!client) {
      return;
    }
    const sync = () => {
      setEnabled(isFeatureEnabled(FEATURE_FLAGS.articleShareActions) !== false);
    };
    client.onFeatureFlags(sync);
    queueMicrotask(sync);
  }, []);

  if (!enabled) {
    return null;
  }

  const url = articleShareUrl(articleId);

  function track(channel: ShareChannel): void {
    capturePublicEvent("article_share_clicked", {
      article_id: articleId,
      channel,
      placement: "top",
    });
  }

  async function copyLink(): Promise<void> {
    track("copy_link");
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section
      className="article-share-pill"
      aria-label="Deel dit verhaal"
    >
      <a
        className="article-share-pill__whatsapp"
        href={whatsappShareHref(headline, url)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => track("whatsapp")}
      >
        <WhatsAppIcon />
        <span>Ploegchat</span>
      </a>
      <ul className="article-share-pill__others">
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
        <span className="article-share-pill__status" aria-live="polite">
          Link gekopieerd
        </span>
      ) : null}
    </section>
  );
}
