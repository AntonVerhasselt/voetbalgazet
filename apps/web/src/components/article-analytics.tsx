"use client";

import { useEffect, useRef } from "react";
import { capturePublicEvent } from "@/lib/analytics";

export function ArticleAnalytics({
  articleId,
  categoryKey,
  divisionKey,
  authorKey,
  isGated,
}: {
  articleId: string;
  categoryKey: string;
  divisionKey: string;
  authorKey: string;
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
      category: categoryKey,
      category_key: categoryKey,
      division: divisionKey,
      division_key: divisionKey,
      author_key: authorKey,
      is_gated: isGated,
    });
  }, [articleId, authorKey, categoryKey, divisionKey, isGated]);

  return null;
}
