"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { capturePublicEvent } from "@/lib/analytics";

export function TrackedArticleLink({
  href,
  articleId,
  slot,
  position,
  className,
  children,
  ariaLabel,
}: {
  href: string;
  articleId: string;
  slot: string;
  position?: number;
  className?: string;
  children: ReactNode;
  ariaLabel?: string;
}) {
  return (
    <Link
      href={href}
      className={className}
      aria-label={ariaLabel}
      onClick={() => {
        capturePublicEvent("homepage_article_clicked", {
          article_id: articleId,
          slot,
          position: position ?? null,
        });
      }}
    >
      {children}
    </Link>
  );
}
