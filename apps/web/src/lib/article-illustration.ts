export type IllustrationMode = "generic" | "match" | "custom";

export type IllustrationCopyInput = {
  illustrationMode: IllustrationMode;
  category: string;
  kicker: string;
  homeTeam: string;
  awayTeam: string;
  competitionLabel: string;
  divisionKeys: readonly string[];
};

export type IllustrationCopy = {
  eyebrow: string;
  title: string;
  subtitle: string;
};

export function getIllustrationCopy(
  article: IllustrationCopyInput,
): IllustrationCopy {
  const eyebrow = article.category || "Lokaal";

  if (article.illustrationMode === "generic") {
    return {
      eyebrow,
      title: "Zondag",
      subtitle: "langs de lijn",
    };
  }

  if (article.illustrationMode === "match") {
    return {
      eyebrow,
      title: article.homeTeam || article.kicker || "Thuis",
      subtitle:
        article.awayTeam ||
        article.competitionLabel ||
        article.divisionKeys[0]?.replaceAll("-", " ") ||
        "uit",
    };
  }

  // custom: prefer explicit match fields, then editorial kicker/competition
  return {
    eyebrow,
    title: article.homeTeam || article.kicker || "Lokaal",
    subtitle:
      article.awayTeam ||
      article.competitionLabel ||
      article.divisionKeys[0]?.replaceAll("-", " ") ||
      "voetbal",
  };
}
