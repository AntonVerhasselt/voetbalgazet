import { COMPLIANCE } from "./compliance";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function decodeR2KeyPath(pathname: string): string | null {
  try {
    return pathname
      .split("/")
      .filter(Boolean)
      .map((segment) => decodeURIComponent(segment))
      .join("/");
  } catch {
    return null;
  }
}

export function extractEmailMediaR2Keys(html: string): string[] {
  const keys = new Set<string>();
  const hostPattern = escapeRegExp(COMPLIANCE.mediaCdnHost);
  const mediaUrlPattern = new RegExp(`${hostPattern}/[^"'\\s<>]+`, "giu");
  for (const match of html.matchAll(mediaUrlPattern)) {
    const urlText = match[0]?.replace(/&amp;/gu, "&");
    if (!urlText) {
      continue;
    }
    try {
      const url = new URL(urlText);
      const key = decodeR2KeyPath(url.pathname);
      if (key) {
        keys.add(key);
      }
    } catch {
      continue;
    }
  }

  const r2KeyPattern = /\b(?:data-r2-key|r2Key)=["']([^"']+)["']/giu;
  for (const match of html.matchAll(r2KeyPattern)) {
    const key = match[1]?.trim();
    if (key) {
      keys.add(key);
    }
  }
  return [...keys];
}
