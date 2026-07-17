export type IllustrationCopyInput = {
  category: string;
  illustrationTitle: string;
  illustrationSubtitle: string;
};

export type IllustrationCopy = {
  eyebrow: string;
  title: string;
  subtitle: string;
};

const DEFAULT_TITLE = "Zondag";
const DEFAULT_SUBTITLE = "langs de lijn";

export function getIllustrationCopy(
  article: IllustrationCopyInput,
): IllustrationCopy {
  return {
    eyebrow: article.category || "Lokaal",
    title: article.illustrationTitle.trim() || DEFAULT_TITLE,
    subtitle: article.illustrationSubtitle.trim() || DEFAULT_SUBTITLE,
  };
}
