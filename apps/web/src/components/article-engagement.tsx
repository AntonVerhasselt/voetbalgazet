"use client";

import { useEffect, useRef } from "react";
import { capturePublicEvent } from "@/lib/analytics";
import { authClient } from "@/lib/auth-client";

const DEPTH_THRESHOLDS = [25, 50, 75, 100] as const;

function accessLevel(hasSession: boolean): "reader" | "none" {
  return hasSession ? "reader" : "none";
}

export function ArticleEngagement({
  articleId,
  categoryKey,
  divisionKey,
  authorKey,
  leadLength,
  isGated,
}: {
  articleId: string;
  categoryKey: string;
  divisionKey: string;
  authorKey: string;
  leadLength: number;
  isGated: boolean;
}) {
  const { data: session } = authClient.useSession();
  const reachedDepths = useRef(new Set<number>());
  const leadReached = useRef(false);
  const hasSession = Boolean(session?.user);

  useEffect(() => {
    const article = document.querySelector("article.article");
    if (!article) {
      return;
    }

    function measureDepth(): void {
      if (!article) {
        return;
      }
      const rect = article.getBoundingClientRect();
      const articleTop = window.scrollY + rect.top;
      const articleHeight = Math.max(rect.height, 1);
      const viewportBottom = window.scrollY + window.innerHeight;
      const scrolledIntoArticle = Math.min(
        Math.max(viewportBottom - articleTop, 0),
        articleHeight,
      );
      const percent = Math.round((scrolledIntoArticle / articleHeight) * 100);

      for (const depth of DEPTH_THRESHOLDS) {
        if (percent < depth || reachedDepths.current.has(depth)) {
          continue;
        }
        reachedDepths.current.add(depth);
        capturePublicEvent("article_read_depth_reached", {
          article_id: articleId,
          category_key: categoryKey,
          division_key: divisionKey,
          author_key: authorKey,
          depth,
          access_level: accessLevel(hasSession),
          is_gated: isGated,
        });
      }
    }

    function onScroll(): void {
      measureDepth();
    }

    measureDepth();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [
    articleId,
    authorKey,
    categoryKey,
    divisionKey,
    hasSession,
    isGated,
  ]);

  useEffect(() => {
    if (leadReached.current) {
      return;
    }

    const lead = document.querySelector(".article-lead, .article__body");
    if (!lead) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting || leadReached.current) {
          return;
        }
        leadReached.current = true;
        capturePublicEvent("article_lead_reached", {
          article_id: articleId,
          category_key: categoryKey,
          division_key: divisionKey,
          author_key: authorKey,
          lead_percent: 100,
          lead_length: leadLength,
          access_level: accessLevel(hasSession),
        });
        observer.disconnect();
      },
      { threshold: 0.85 },
    );

    observer.observe(lead);
    return () => observer.disconnect();
  }, [
    articleId,
    authorKey,
    categoryKey,
    divisionKey,
    hasSession,
    leadLength,
  ]);

  return null;
}
