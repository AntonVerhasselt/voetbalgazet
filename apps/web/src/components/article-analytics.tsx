"use client";

import { useEffect, useRef } from "react";
import { capturePublicEvent } from "@/lib/analytics";

export function ArticleAnalytics({
  articleId,
  category,
  division,
  isGated,
}: {
  articleId: string;
  category: string;
  division: string;
  isGated: boolean;
}) {
  const captured = useRef(false);

  useEffect(() => {
    if (captured.current) {
      return;
    }
    captured.current = true;
    capturePublicEvent("article_viewed", {
      article_id: articleId,
      slug: articleId,
      category,
      division,
      is_gated: isGated,
    });
  }, [articleId, category, division, isGated]);

  return null;
}
