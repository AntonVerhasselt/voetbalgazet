"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";
import {
  campaignAnalyticsId,
  capturePublicEvent,
  deviceType,
  referrerDomain,
  stripSensitiveSearchParams,
  utmProperties,
} from "@/lib/analytics";
import { WebVitalsReporter } from "@/components/web-vitals-reporter";

function pageType(pathname: string): string {
  if (pathname === "/") return "homepage";
  if (pathname === "/archief") return "archive";
  if (pathname.startsWith("/nieuws/")) return "article";
  if (pathname === "/privacy" || pathname === "/voorwaarden") return "legal";
  if (pathname === "/voorkeuren") return "preferences";
  if (pathname === "/uitschrijven") return "unsubscribe";
  return "public_other";
}

function pathTemplate(pathname: string): string {
  return pathname.startsWith("/nieuws/") ? "/nieuws/[slug]" : pathname;
}

function articleIdFromPath(pathname: string): string | null {
  const match = /^\/nieuws\/([a-z0-9]+(?:-[a-z0-9]+)*)$/u.exec(pathname);
  return match?.[1] ?? null;
}

function PublicAnalyticsInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const capturedPath = useRef<string | null>(null);
  const authHandled = useRef(false);
  const newsletterHandled = useRef(false);

  useEffect(() => {
    const searchKey = searchParams.toString();
    const pathKey = `${pathname}?${searchKey}`;
    if (capturedPath.current === pathKey) {
      return;
    }
    capturedPath.current = pathKey;

    const search = searchKey ? `?${searchKey}` : "";
    capturePublicEvent("public_page_viewed", {
      page_type: pageType(pathname),
      path_template: pathTemplate(pathname),
      referrer_domain: referrerDomain(),
      device_type: deviceType(),
      ...utmProperties(search),
    });

    const articleId = articleIdFromPath(pathname);
    const cid = campaignAnalyticsId(search);
    if (articleId && cid && !newsletterHandled.current) {
      newsletterHandled.current = true;
      capturePublicEvent("newsletter_article_link_opened", {
        article_id: articleId,
        campaign_analytics_id: cid,
      });
      stripSensitiveSearchParams(["cid"]);
    }

    if (!authHandled.current) {
      const authError = searchParams.get("auth_fout");
      if (authError) {
        authHandled.current = true;
        capturePublicEvent("auth_link_failed", {
          error_code: authError === "1" ? "verify_failed" : authError.slice(0, 64),
          link_type: pathname.startsWith("/nieuws/")
            ? "article"
            : pathname === "/voorkeuren"
              ? "preferences"
              : "other",
        });
        stripSensitiveSearchParams(["auth_fout"]);
      } else if (
        searchParams.get("welcome") === "1" ||
        searchParams.get("verified") === "1"
      ) {
        authHandled.current = true;
        capturePublicEvent("welcome_link_opened", {
          link_type: pathname.startsWith("/nieuws/")
            ? "article"
            : pathname === "/voorkeuren"
              ? "preferences"
              : "other",
          token_age_bucket: "unknown",
        });
        capturePublicEvent("subscriber_session_verified", {
          source: pathname.startsWith("/nieuws/") ? "article_link" : "preferences_link",
          was_anonymous: false,
        });
        stripSensitiveSearchParams(["welcome", "verified"]);
      }
    }
  }, [pathname, searchParams]);

  return (
    <>
      <WebVitalsReporter pageType={pageType(pathname)} />
    </>
  );
}

export function PublicAnalytics() {
  return (
    <Suspense fallback={null}>
      <PublicAnalyticsInner />
    </Suspense>
  );
}
