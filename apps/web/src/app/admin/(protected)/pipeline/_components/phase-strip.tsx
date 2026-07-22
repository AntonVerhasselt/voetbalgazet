"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import { pipelineApi } from "@/lib/pipeline-api";
import { usePipelineDivision } from "./pipeline-division-context";

const PHASES = [
  { key: "ideeen", label: "Ideeën", href: "/admin/pipeline/ideeen" },
  { key: "contacten", label: "Contacten", href: "/admin/pipeline/contacten" },
  {
    key: "interviews",
    label: "Interviews",
    href: "/admin/pipeline/interviews",
  },
  { key: "drafts", label: "Drafts", href: "/admin/pipeline/drafts" },
  { key: "publicatie", label: "Publicatie", href: null },
] as const;

type PhaseKey = (typeof PHASES)[number]["key"];

export function PhaseStrip() {
  const pathname = usePathname();
  const { divisionKey, withReeksQuery } = usePipelineDivision();
  const counts = useQuery(
    pipelineApi.getPhaseCounts,
    divisionKey ? { divisionKey } : "skip",
  );

  function countFor(key: PhaseKey): number | null {
    if (!counts) return null;
    return counts[key];
  }

  function isActive(href: string | null): boolean {
    if (!href) return false;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  // Detail pages live under /admin/pipeline/[articleId] — highlight Ideeën.
  const onIdeaDetail =
    pathname.startsWith("/admin/pipeline/") &&
    !PHASES.some(
      (p) =>
        p.href &&
        (pathname === p.href || pathname.startsWith(`${p.href}/`)),
    ) &&
    pathname !== "/admin/pipeline";

  return (
    <nav className="newsletter-tabs pipeline-phase-strip" aria-label="Pipelinefasen">
      {PHASES.map((phase) => {
        const count = countFor(phase.key);
        const countLabel = count === null ? "…" : String(count);
        const active =
          (phase.key === "ideeen" && onIdeaDetail) || isActive(phase.href);
        const className = active
          ? "newsletter-tabs__tab newsletter-tabs__tab--active"
          : "newsletter-tabs__tab";

        if (!phase.href) {
          return (
            <span
              key={phase.key}
              className={`${className} pipeline-phase-strip__static`}
              aria-disabled="true"
            >
              {phase.label}
              <span className="pipeline-phase-strip__count">{countLabel}</span>
            </span>
          );
        }

        return (
          <Link
            key={phase.key}
            href={withReeksQuery(phase.href)}
            className={className}
            aria-current={active ? "page" : undefined}
          >
            {phase.label}
            <span className="pipeline-phase-strip__count">{countLabel}</span>
          </Link>
        );
      })}
    </nav>
  );
}
