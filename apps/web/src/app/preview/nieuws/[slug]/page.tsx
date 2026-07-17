import type { Metadata } from "next";
import { cookies, draftMode } from "next/headers";
import { notFound } from "next/navigation";
import { ArticlePageContent } from "@/components/article-page-content";
import { PreviewFrame } from "@/components/preview-frame";
import { getEditorSession } from "@/lib/admin-session";
import { getArticle } from "@/lib/content";
import {
  PREVIEW_COOKIE,
  verifyPreviewToken,
} from "@/lib/preview-session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Artikelpreview",
  robots: { index: false, follow: false, nocache: true },
};

export default async function PreviewArticlePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ gate?: string }>;
}) {
  const [{ slug }, query, draft, session, cookieStore] = await Promise.all([
    params,
    searchParams,
    draftMode(),
    getEditorSession(),
    cookies(),
  ]);
  const token = cookieStore.get(PREVIEW_COOKIE)?.value;
  const preview = token ? verifyPreviewToken(token) : null;
  if (
    !draft.isEnabled ||
    !session ||
    !preview ||
    new URL(preview.target, "https://preview.local").pathname !==
      `/nieuws/${slug}`
  ) {
    notFound();
  }

  const article = await getArticle(slug, preview.branch);
  if (!article) {
    notFound();
  }
  const gateMode = query.gate === "ungated" ? "ungated" : "gated";
  return (
    <PreviewFrame
      articlePath={`/preview/nieuws/${article.slug}`}
      gateMode={gateMode}
    >
      <ArticlePageContent article={article} previewGateMode={gateMode} />
    </PreviewFrame>
  );
}
