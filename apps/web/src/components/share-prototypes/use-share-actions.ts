"use client";

import { useState } from "react";
import { capturePublicEvent } from "@/lib/analytics";
import {
  articleShareUrl,
  type ShareChannel,
} from "@/lib/share";

export function useShareActions(articleId: string) {
  const [copied, setCopied] = useState(false);
  const url = articleShareUrl(articleId);

  function track(channel: ShareChannel): void {
    capturePublicEvent("article_share_clicked", {
      article_id: articleId,
      channel,
      prototype: true,
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

  return { url, copied, track, copyLink };
}
