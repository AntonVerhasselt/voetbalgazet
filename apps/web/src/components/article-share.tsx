"use client";

import { useEffect, useState } from "react";
import {
  FEATURE_FLAGS,
  capturePublicEvent,
  getPostHog,
  isFeatureEnabled,
} from "@/lib/analytics";
import { SITE_URL } from "@/lib/site-config";

export function ArticleShare({
  articleId,
  headline,
}: {
  articleId: string;
  headline: string;
}) {
  const [enabled, setEnabled] = useState(true);
  const [copied, setCopied] = useState(false);
  const canNativeShare =
    typeof navigator !== "undefined" && typeof navigator.share === "function";

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

  const url = `${SITE_URL}/nieuws/${articleId}`;

  async function shareNative(): Promise<void> {
    capturePublicEvent("article_share_clicked", {
      article_id: articleId,
      channel: "native_share",
    });
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: headline, url });
      } catch {
        // Cancelled or unsupported — click already counted.
      }
    }
  }

  async function copyLink(): Promise<void> {
    capturePublicEvent("article_share_clicked", {
      article_id: articleId,
      channel: "copy_link",
    });
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="article-share" aria-label="Deel dit verhaal">
      <p className="article-share__label">Deel</p>
      <div className="article-share__actions">
        {canNativeShare ? (
          <button
            type="button"
            className="text-link"
            onClick={() => void shareNative()}
          >
            Deel via…
          </button>
        ) : null}
        <button
          type="button"
          className="text-link"
          onClick={() => void copyLink()}
        >
          {copied ? "Link gekopieerd" : "Kopieer link"}
        </button>
      </div>
    </div>
  );
}
