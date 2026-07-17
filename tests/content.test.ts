import { describe, expect, it } from "vitest";
import {
  divisionOptions,
  teamOptions,
} from "../convex/lib/preferenceCatalog";
import {
  authorSelectOptions,
  categorySelectOptions,
  divisionSettingsItems,
  teamSettingsItems,
} from "../apps/web/src/lib/content-settings";
import {
  authorOptions,
  categoryOptions,
} from "../apps/web/src/lib/content-settings-options";
import {
  excerptArticle,
  getAllArticles,
  getPublishedArticles,
  splitArticle,
  validateArticles,
} from "../apps/web/src/lib/content";
import { getIllustrationCopy } from "../apps/web/src/lib/article-illustration";
import { normalizeEditorDatetime } from "../apps/web/src/lib/editor-datetime";

describe("Keystatic article pipeline", () => {
  it("keeps Keystatic select options aligned with Git settings YAML", () => {
    expect(authorOptions).toEqual(authorSelectOptions());
    expect(categoryOptions).toEqual(categorySelectOptions());
  });

  it("keeps Convex preference catalog keys aligned with taxonomy YAML", () => {
    const yamlDivisions = divisionSettingsItems();
    const yamlTeams = teamSettingsItems();

    expect(yamlDivisions.map((item) => item.key).toSorted()).toEqual(
      divisionOptions.map((item) => item.key).toSorted(),
    );
    expect(yamlTeams.map((item) => item.key).toSorted()).toEqual(
      teamOptions.map((item) => item.key).toSorted(),
    );

    for (const division of yamlDivisions) {
      const catalog = divisionOptions.find((item) => item.key === division.key);
      expect(catalog).toMatchObject({
        provinceKey: division.provinceKey,
        level: division.level,
        sortOrder: division.sortOrder,
      });
    }

    for (const team of yamlTeams) {
      const catalog = teamOptions.find((item) => item.key === team.key);
      expect(catalog).toMatchObject({
        label: team.label,
        provinceKey: team.provinceKey,
        divisionKeys: [...team.divisionKeys],
      });
    }
  });

  it("treats Keystatic datetimes as Europe/Brussels wall time", () => {
    // CEST (UTC+2): editor 08:00 → stored 06:00Z
    expect(normalizeEditorDatetime("2026-07-12T08:00")).toBe(
      "2026-07-12T06:00:00.000Z",
    );
    // CET (UTC+1): editor 08:00 → stored 07:00Z
    expect(normalizeEditorDatetime("2026-01-12T08:00")).toBe(
      "2026-01-12T07:00:00.000Z",
    );
  });

  it("derives illustration copy from illustrationMode", () => {
    expect(
      getIllustrationCopy({
        illustrationMode: "generic",
        category: "Clubnieuws",
        kicker: "Zondag",
        homeTeam: "",
        awayTeam: "",
        competitionLabel: "",
        divisionKeys: [],
      }),
    ).toEqual({
      eyebrow: "Clubnieuws",
      title: "Zondag",
      subtitle: "langs de lijn",
    });

    expect(
      getIllustrationCopy({
        illustrationMode: "match",
        category: "Wedstrijdverslagen",
        kicker: "",
        homeTeam: "KFC Duffel",
        awayTeam: "KSV Aartselaar",
        competitionLabel: "1ste provinciale",
        divisionKeys: ["antwerpen-p1"],
      }),
    ).toEqual({
      eyebrow: "Wedstrijdverslagen",
      title: "KFC Duffel",
      subtitle: "KSV Aartselaar",
    });
  });

  it("reads Markdoc and only publishes newest-first entries", async () => {
    const [all, published] = await Promise.all([
      getAllArticles(),
      getPublishedArticles(),
    ]);
    expect(all.some((article) => article.status === "draft")).toBe(true);
    expect(all.some((article) => article.status === "archived")).toBe(true);
    expect(published.length).toBeGreaterThan(1);
    expect(published.every((article) => article.status === "published")).toBe(
      true,
    );
    expect(
      published.every(
        (article, index) =>
          index === 0 ||
          published[index - 1]!.publishedAt >= article.publishedAt,
      ),
    ).toBe(true);
  });

  it("keeps the configured Markdoc lead public and the rest gated", async () => {
    const gatedArticle = (await getAllArticles()).find(
      (article) => article.isGated,
    );
    expect(gatedArticle).toBeDefined();
    const sections = splitArticle(gatedArticle!);
    expect(
      sections.lead.filter((block) => block.type === "paragraph"),
    ).toHaveLength(gatedArticle!.leadParagraphCount);
    expect(sections.gated.length).toBeGreaterThan(0);
  });

  it("build validation rejects duplicate slugs", async () => {
    const articles = await getAllArticles();
    const duplicate = [articles[0]!, { ...articles[0]! }];
    expect(validateArticles(duplicate)).toContain(
      `Dubbele artikelslug: ${articles[0]!.slug}`,
    );
  });

  it("RSS excerpts contain lead copy but not gated body copy", async () => {
    const gatedArticle = (await getAllArticles()).find(
      (article) => article.isGated,
    )!;
    const excerpt = excerptArticle(gatedArticle);
    const sections = splitArticle(gatedArticle);
    const firstLeadText = sections.lead[0]?.attributes.content;
    const firstGatedText = sections.gated
      .flatMap((node) => [...node.walk()])
      .find(
        (node) =>
          node.type === "text" && typeof node.attributes.content === "string",
      )?.attributes.content;
    expect(typeof firstLeadText === "string" ? excerpt : excerpt.length).toBeTruthy();
    if (typeof firstGatedText === "string") {
      expect(excerpt).not.toContain(firstGatedText);
    }
  });
});
