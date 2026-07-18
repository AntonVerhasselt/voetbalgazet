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

export function ArticleShare({
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
    // Feature flags may already be loaded.
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
    <section className="article-share" aria-label="Deel dit verhaal">
      <p className="article-share__label">Deel met je ploeg</p>
      <a
        className="article-share__whatsapp"
        href={whatsappShareHref(headline, url)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => track("whatsapp")}
      >
        <WhatsAppIcon className="article-share__whatsapp-icon" />
        <span className="article-share__whatsapp-copy">
          <strong>Stuur naar de ploegchat</strong>
          <span>Zodat jullie het in de kleedkamer kunnen nabespreken</span>
        </span>
      </a>
      <ul className="article-share__others">
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
        <p className="article-share__status" aria-live="polite">
          Link gekopieerd
        </p>
      ) : null}
    </section>
  );
}
