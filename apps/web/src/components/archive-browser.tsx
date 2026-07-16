"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatArticleDate } from "@/lib/content";

type ArchiveEntry = {
  slug: string;
  headline: string;
  dek: string;
  category: string;
  categoryKey: string;
  provinceKey: string;
  divisionKeys: readonly string[];
  teamKeys: readonly string[];
  publishedAt: string;
  readingTime: string;
};

export function ArchiveBrowser({
  entries,
}: {
  entries: readonly ArchiveEntry[];
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [province, setProvince] = useState("");
  const [division, setDivision] = useState("");
  const [team, setTeam] = useState("");
  const [year, setYear] = useState("");

  const options = useMemo(
    () => ({
      categories: [...new Set(entries.map((entry) => entry.category))].sort(),
      provinces: [...new Set(entries.map((entry) => entry.provinceKey))].sort(),
      divisions: [...new Set(entries.flatMap((entry) => entry.divisionKeys))].sort(),
      teams: [...new Set(entries.flatMap((entry) => entry.teamKeys))].sort(),
      years: [
        ...new Set(
          entries.map((entry) => String(new Date(entry.publishedAt).getUTCFullYear())),
        ),
      ].sort((left, right) => right.localeCompare(left)),
    }),
    [entries],
  );

  const filteredEntries = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("nl-BE");
    return entries.filter((entry) => {
      const searchable = `${entry.headline} ${entry.dek}`.toLocaleLowerCase(
        "nl-BE",
      );
      return (
        (!normalizedQuery || searchable.includes(normalizedQuery)) &&
        (!category || entry.category === category) &&
        (!province || entry.provinceKey === province) &&
        (!division || entry.divisionKeys.includes(division)) &&
        (!team || entry.teamKeys.includes(team)) &&
        (!year ||
          String(new Date(entry.publishedAt).getUTCFullYear()) === year)
      );
    });
  }, [category, division, entries, province, query, team, year]);

  const hasFilters = Boolean(
    query || category || province || division || team || year,
  );

  function reset(): void {
    setQuery("");
    setCategory("");
    setProvince("");
    setDivision("");
    setTeam("");
    setYear("");
  }

  return (
    <div className="archive-browser">
      <aside className="archive-filters" aria-label="Filter het archief">
        <div className="archive-filters__heading">
          <h2>Filters</h2>
          <button type="button" onClick={reset} disabled={!hasFilters}>
            Wis alles
          </button>
        </div>
        <label>
          Zoek in titel en intro
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Zoek een verhaal"
          />
        </label>
        <label>
          Categorie
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            <option value="">Alle categorieën</option>
            {options.categories.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </label>
        <label>
          Provincie
          <select
            value={province}
            onChange={(event) => setProvince(event.target.value)}
          >
            <option value="">Alle provincies</option>
            {options.provinces.map((option) => (
              <option key={option} value={option}>
                {option.replaceAll("-", " ")}
              </option>
            ))}
          </select>
        </label>
        <label>
          Reeks
          <select
            value={division}
            onChange={(event) => setDivision(event.target.value)}
          >
            <option value="">Alle reeksen</option>
            {options.divisions.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </label>
        <label>
          Club
          <select
            value={team}
            onChange={(event) => setTeam(event.target.value)}
          >
            <option value="">Alle clubs</option>
            {options.teams.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </label>
        <label>
          Jaar
          <select value={year} onChange={(event) => setYear(event.target.value)}>
            <option value="">Alle jaren</option>
            {options.years.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </label>
      </aside>

      <section className="archive-results" aria-live="polite">
        <div className="archive-results__count">
          <strong>{filteredEntries.length}</strong>{" "}
          {filteredEntries.length === 1 ? "verhaal" : "verhalen"}
        </div>
        {filteredEntries.length === 0 ? (
          <p className="archive-empty">
            Geen verhalen gevonden. Pas je filters aan of wis ze allemaal.
          </p>
        ) : (
          filteredEntries.map((entry) => (
            <article className="archive-card" key={entry.slug}>
              <p className="eyebrow">{entry.category}</p>
              <h2>
                <Link href={`/nieuws/${entry.slug}`}>{entry.headline}</Link>
              </h2>
              <Link
                className="archive-card__description"
                href={`/nieuws/${entry.slug}`}
              >
                {entry.dek}
              </Link>
              <span>
                {formatArticleDate(entry.publishedAt)} · {entry.readingTime}
              </span>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
