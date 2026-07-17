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
  const leadCaptured = useRef(false);
  const depthsCaptured = useRef<Set<number>>(new Set());
  const emailLinkCaptured = useRef(false);

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

  useEffect(() => {
    if (emailLinkCaptured.current) {
      return;
    }
    const params = new URLSearchParams(window.location.search);
    if (params.get("from") !== "email") {
      return;
    }
    emailLinkCaptured.current = true;
    capturePublicEvent("newsletter_article_link_opened", {
      article_id: articleId,
    });
  }, [articleId]);

  useEffect(() => {
    const lead = document.querySelector<HTMLElement>("[data-article-lead]");
    const markers = [
      ...document.querySelectorAll<HTMLElement>("[data-read-depth]"),
    ];
    if (!lead && markers.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) {
            continue;
          }
          const target = entry.target as HTMLElement;
          if (target.dataset.articleLead !== undefined && !leadCaptured.current) {
            leadCaptured.current = true;
            capturePublicEvent("article_lead_reached", {
              article_id: articleId,
            });
            observer.unobserve(target);
            continue;
          }
          const depth = Number(target.dataset.readDepth);
          if (!Number.isFinite(depth) || depthsCaptured.current.has(depth)) {
            continue;
          }
          depthsCaptured.current.add(depth);
          capturePublicEvent("article_read_depth_reached", {
            article_id: articleId,
            depth_percent: depth,
          });
          observer.unobserve(target);
        }
      },
      { rootMargin: "0px 0px -15% 0px", threshold: 0 },
    );

    if (lead) {
      observer.observe(lead);
    }
    for (const marker of markers) {
      observer.observe(marker);
    }
    return () => observer.disconnect();
  }, [articleId]);

  return null;
}
