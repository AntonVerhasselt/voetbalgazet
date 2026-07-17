"use client";

import { useState } from "react";
import { capturePublicEvent } from "@/lib/analytics";

export function ArticleShareControls({
  articleId,
  headline,
}: {
  articleId: string;
  headline: string;
}) {
  const [copyStatus, setCopyStatus] = useState("");

  function articleUrl(): string {
    return window.location.href.split("#")[0] ?? window.location.href;
  }

  async function shareNative(): Promise<void> {
    const url = articleUrl();
    capturePublicEvent("article_share_clicked", {
      article_id: articleId,
      share_method: "native",
    });
    if (navigator.share) {
      await navigator.share({
        title: headline,
        url,
      });
      return;
    }
    await navigator.clipboard.writeText(url);
    setCopyStatus("Link gekopieerd.");
  }

  async function copyLink(): Promise<void> {
    await navigator.clipboard.writeText(articleUrl());
    setCopyStatus("Link gekopieerd.");
    capturePublicEvent("article_share_clicked", {
      article_id: articleId,
      share_method: "copy",
    });
  }

  return (
    <div className="article-share" aria-label="Deel dit artikel">
      <span>Deel</span>
      <button
        type="button"
        onClick={() => {
          void shareNative();
        }}
      >
        Delen
      </button>
      <button
        type="button"
        onClick={() => {
          void copyLink();
        }}
      >
        Kopieer link
      </button>
      <span className="article-share__status" aria-live="polite">
        {copyStatus}
      </span>
    </div>
  );
}
