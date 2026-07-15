export function ArticleIllustration({
  compact = false,
}: {
  compact?: boolean;
}) {
  return (
    <figure
      className={`article-illustration${compact ? " article-illustration--compact" : ""}`}
      role="img"
      aria-label="Typografische illustratie: zondag langs de lijn"
    >
      <span className="article-illustration__eyebrow">Lokale verhalen</span>
      <span className="article-illustration__title">Zondag</span>
      <span className="article-illustration__rule" />
      <span className="article-illustration__subtitle">langs de lijn</span>
    </figure>
  );
}
