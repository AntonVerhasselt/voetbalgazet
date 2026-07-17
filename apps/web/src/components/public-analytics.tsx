"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { capturePublicEvent } from "@/lib/analytics";

function pageType(pathname: string): string {
  if (pathname === "/") return "homepage";
  if (pathname === "/archief") return "archive";
  if (pathname.startsWith("/nieuws/")) return "article";
  if (pathname === "/privacy" || pathname === "/voorwaarden") return "legal";
  if (pathname === "/voorkeuren") return "preferences";
  return "public_other";
}

function pathTemplate(pathname: string): string {
  return pathname.startsWith("/nieuws/") ? "/nieuws/[slug]" : pathname;
}

export function PublicAnalytics() {
  const pathname = usePathname();
  const capturedPath = useRef<string | null>(null);

  useEffect(() => {
    if (capturedPath.current === pathname) {
      return;
    }
    capturedPath.current = pathname;
    capturePublicEvent("public_page_viewed", {
      page_type: pageType(pathname),
      path_template: pathTemplate(pathname),
    });
  }, [pathname]);

  return null;
}
