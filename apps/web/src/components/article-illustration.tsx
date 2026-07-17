"use client";

import { useLayoutEffect, useRef } from "react";

function splitLines(text: string): string[] {
  const lines = text.split(/\r?\n/);
  return lines.length > 0 ? lines : [""];
}

function FitLines({
  text,
  className,
  minFontPx,
}: {
  text: string;
  className: string;
  minFontPx: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const lines = splitLines(text);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const fit = () => {
      el.style.fontSize = "";
      const maxFontPx = Number.parseFloat(getComputedStyle(el).fontSize);
      if (!Number.isFinite(maxFontPx) || maxFontPx <= 0) return;

      const available = el.clientWidth;
      if (available <= 0) return;

      const lineNodes = el.querySelectorAll<HTMLElement>(
        ".article-illustration__line",
      );

      const overflows = () =>
        Array.from(lineNodes).some(
          (line) => line.scrollWidth > available + 0.5,
        );

      el.style.fontSize = `${maxFontPx}px`;
      if (!overflows()) return;

      let low = Math.min(minFontPx, maxFontPx);
      let high = maxFontPx;
      for (let i = 0; i < 16; i += 1) {
        const mid = (low + high) / 2;
        el.style.fontSize = `${mid}px`;
        if (overflows()) {
          high = mid;
        } else {
          low = mid;
        }
      }
      el.style.fontSize = `${low}px`;
    };

    let frame = 0;
    const scheduleFit = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(fit);
    };

    const run = () => {
      if (typeof document !== "undefined" && document.fonts?.ready) {
        void document.fonts.ready.then(scheduleFit);
      }
      scheduleFit();
    };

    run();

    const observer = new ResizeObserver(scheduleFit);
    observer.observe(el);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [text, minFontPx, lines.length]);

  return (
    <span ref={ref} className={className}>
      {lines.map((line, index) => (
        <span key={index} className="article-illustration__line">
          {line.length > 0 ? line : "\u00A0"}
        </span>
      ))}
    </span>
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
      <FitLines
        text={title}
        className="article-illustration__title"
        minFontPx={compact ? 22 : 28}
      />
      <span className="article-illustration__rule" />
      <FitLines
        text={subtitle}
        className="article-illustration__subtitle"
        minFontPx={11}
      />
    </figure>
  );
}
