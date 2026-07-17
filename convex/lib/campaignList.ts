import type { Doc } from "../_generated/dataModel";

/**
 * Merge per-status campaign pages (each already ordered by updatedAt desc)
 * into a single page ordered by updatedAt desc.
 */
export function mergeCampaignStatusPages(
  pages: readonly (readonly Doc<"newsletterCampaigns">[])[],
  numItems: number,
): {
  page: Doc<"newsletterCampaigns">[];
  isDone: boolean;
  continueCursor: string;
} {
  const merged = pages.flat().sort((a, b) => b.updatedAt - a.updatedAt);
  const page = merged.slice(0, numItems);
  const maybeMore = pages.some((rows) => rows.length >= numItems);
  const isDone = merged.length <= numItems && !maybeMore;
  const last = page[page.length - 1];
  return {
    page,
    isDone,
    continueCursor: last ? String(last.updatedAt) : "",
  };
}
