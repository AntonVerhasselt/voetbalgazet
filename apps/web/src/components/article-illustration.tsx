function IllustrationLines({ text }: { text: string }) {
  const lines = text.split(/\r?\n/);

  return (
    <>
      {lines.map((line, index) => (
        <span key={index}>
          {index > 0 ? <br /> : null}
          {line}
        </span>
      ))}
    </>
  );
}

export function ArticleIllustration({
  compact = false,
  tone = "green",
  eyebrow = "Lokale verhalen",
  title = "Zondag",
  subtitle = "langs de lijn",
  alt = "Typografische illustratie: zondag langs de lijn",
}: {
  compact?: boolean;
  tone?: "green" | "red" | "gold";
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  alt?: string;
}) {
  return (
    <figure
      className={`article-illustration article-illustration--${tone}${compact ? " article-illustration--compact" : ""}`}
      role="img"
      aria-label={alt}
    >
      <span className="article-illustration__eyebrow">{eyebrow}</span>
      <span className="article-illustration__title">
        <IllustrationLines text={title} />
      </span>
      <span className="article-illustration__rule" />
      <span className="article-illustration__subtitle">
        <IllustrationLines text={subtitle} />
      </span>
    </figure>
  );
}
