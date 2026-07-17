"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatArticleDate } from "@/lib/article-format";
import { capturePublicEvent } from "@/lib/analytics";

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
  initialQuery = "",
}: {
  entries: readonly ArchiveEntry[];
  initialQuery?: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState("");
  const [province, setProvince] = useState("");
  const [division, setDivision] = useState("");
  const [team, setTeam] = useState("");
  const [year, setYear] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const searchOpened = useRef(Boolean(initialQuery.trim()));
  const lastSearchKey = useRef<string | null>(null);

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

  useEffect(() => {
    const normalizedQuery = query.trim();
    const hasSearchIntent = Boolean(
      normalizedQuery || category || province || division || team || year,
    );
    if (!hasSearchIntent) {
      lastSearchKey.current = null;
      return;
    }

    const key = [
      normalizedQuery.length,
      category,
      province,
      division,
      team,
      year,
      filteredEntries.length,
    ].join("|");
    if (lastSearchKey.current === key) {
      return;
    }

    const timeout = window.setTimeout(() => {
      lastSearchKey.current = key;
      capturePublicEvent("search_performed", {
        query_length: normalizedQuery.length,
        result_count: filteredEntries.length,
        has_category_filter: Boolean(category),
        has_province_filter: Boolean(province),
        has_division_filter: Boolean(division),
        has_team_filter: Boolean(team),
        has_year_filter: Boolean(year),
        source_page: "archive",
      });
    }, 400);

    return () => window.clearTimeout(timeout);
  }, [
    category,
    division,
    filteredEntries.length,
    province,
    query,
    team,
    year,
  ]);

  function reset(): void {
    setQuery("");
    setCategory("");
    setProvince("");
    setDivision("");
    setTeam("");
    setYear("");
  }

  const activeFilters = [
    query
      ? {
          key: "query",
          label: `Zoek: ${query}`,
          clear: () => setQuery(""),
        }
      : null,
    category
      ? {
          key: "category",
          label: category,
          clear: () => setCategory(""),
        }
      : null,
    province
      ? {
          key: "province",
          label: province.replaceAll("-", " "),
          clear: () => setProvince(""),
        }
      : null,
    division
      ? {
          key: "division",
          label: division,
          clear: () => setDivision(""),
        }
      : null,
    team
      ? {
          key: "team",
          label: team,
          clear: () => setTeam(""),
        }
      : null,
    year
      ? {
          key: "year",
          label: year,
          clear: () => setYear(""),
        }
      : null,
  ].filter((filter): filter is {
    key: string;
    label: string;
    clear: () => void;
  } => filter !== null);

  function onSearchFocus(): void {
    if (searchOpened.current) {
      return;
    }
    searchOpened.current = true;
    capturePublicEvent("search_opened", {
      source_page: "archive",
    });
  }

  function onResultClick(articleId: string, position: number): void {
    capturePublicEvent("search_result_clicked", {
      article_id: articleId,
      position,
      source_page: "archive",
    });
  }

  return (
    <div className="archive-browser">
      <div className="archive-mobile-tools">
        <button
          className="archive-filter-toggle"
          type="button"
          aria-expanded={filtersOpen}
          aria-controls="archive-filters"
          onClick={() => setFiltersOpen(true)}
        >
          Filters
        </button>
        {activeFilters.length > 0 ? (
          <button type="button" onClick={reset}>
            Wis alles
          </button>
        ) : null}
      </div>

      {filtersOpen ? (
        <button
          className="archive-filters__backdrop"
          type="button"
          aria-label="Sluit filters"
          onClick={() => setFiltersOpen(false)}
        />
      ) : null}

      <aside
        id="archive-filters"
        className={`archive-filters${
          filtersOpen ? " archive-filters--open" : ""
        }`}
        aria-label="Filter het archief"
      >
        <div className="archive-filters__heading">
          <h2>Filters</h2>
          <div>
            <button type="button" onClick={reset} disabled={!hasFilters}>
              Wis alles
            </button>
            <button
              className="archive-filters__close"
              type="button"
              onClick={() => setFiltersOpen(false)}
            >
              Sluit
            </button>
          </div>
        </div>
        <label>
          Zoek in titel en intro
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={onSearchFocus}
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
        {activeFilters.length > 0 ? (
          <div className="archive-chips" aria-label="Actieve filters">
            {activeFilters.map((filter) => (
              <button type="button" key={filter.key} onClick={filter.clear}>
                {filter.label} <span aria-hidden="true">×</span>
              </button>
            ))}
          </div>
        ) : null}
        <div className="archive-results__count">
          <strong>{filteredEntries.length}</strong>{" "}
          {filteredEntries.length === 1 ? "verhaal" : "verhalen"}
        </div>
        {filteredEntries.length === 0 ? (
          <p className="archive-empty">
            Geen verhalen gevonden. Pas je filters aan of wis ze allemaal.
          </p>
        ) : (
          filteredEntries.map((entry, index) => (
            <article className="archive-card" key={entry.slug}>
              <p className="eyebrow">{entry.category}</p>
              <h2>
                <Link
                  href={`/nieuws/${entry.slug}`}
                  onClick={() => onResultClick(entry.slug, index + 1)}
                >
                  {entry.headline}
                </Link>
              </h2>
              <Link
                className="archive-card__description"
                href={`/nieuws/${entry.slug}`}
                onClick={() => onResultClick(entry.slug, index + 1)}
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
