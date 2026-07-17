import { createElement } from "react";
import {
  collection,
  config,
  fields,
  singleton,
} from "@keystatic/core";
import {
  divisionOptions,
  provinceOptions,
  teamOptions,
} from "../../convex/lib/preferenceCatalog";
import {
  authorOptions,
  categoryOptions,
  defaultAuthorValue,
  defaultCategoryValue,
} from "./src/lib/content-settings-options";

const isHosted = Boolean(
  process.env.NEXT_PUBLIC_KEYSTATIC_GITHUB_APP_SLUG?.trim(),
);

const defaultAuthor = defaultAuthorValue;
const defaultCategory = defaultCategoryValue;

const bodyOptions = {
  heading: [2, 3] as const,
  blockquote: true,
  orderedList: true,
  unorderedList: true,
  divider: true,
  link: true,
  image: {
    directory: "public/images/articles",
    publicPath: "/images/articles/",
    schema: {
      alt: fields.text({
        label: "Alternatieve tekst",
        validation: { isRequired: true },
      }),
      title: fields.text({
        label: "Bijschrift en credit",
        description: "Optioneel bijschrift, gevolgd door de beeldcredit.",
      }),
    },
  },
  table: false,
  code: false,
  codeBlock: false,
} as const;

export const articleMarkdocConfig =
  fields.markdoc.createMarkdocConfig({ options: bodyOptions });

function BrandMark({ colorScheme }: { colorScheme: "light" | "dark" }) {
  const ink = colorScheme === "dark" ? "#f5f0e6" : "#173f35";
  return createElement(
    "svg",
    {
      "aria-hidden": true,
      viewBox: "0 0 48 48",
      width: 32,
      height: 32,
      fill: "none",
    },
    createElement("rect", {
      x: 2,
      y: 2,
      width: 44,
      height: 44,
      stroke: ink,
      strokeWidth: 3,
    }),
    createElement("path", {
      d: "M13 14h22v5H13zm0 8h22v5H13zm0 8h14v5H13z",
      fill: ink,
    }),
  );
}

const settingsItemFields = {
  key: fields.text({
    label: "Stabiele key",
    validation: {
      isRequired: true,
      pattern: {
        regex: /^[a-z0-9]+(?:-[a-z0-9]+)*$/u,
        message: "Gebruik lowercase ASCII met koppeltekens.",
      },
    },
  }),
  label: fields.text({
    label: "Naam",
    validation: { isRequired: true },
  }),
  active: fields.checkbox({ label: "Actief", defaultValue: true }),
};

export default config({
  storage: isHosted
    ? {
        kind: "github",
        repo: "AntonVerhasselt/voetbalgazet",
        pathPrefix: "apps/web",
        branchPrefix: "content/",
      }
    : { kind: "local" },
  locale: "nl-NL",
  ui: {
    brand: {
      name: "De Voetbalgazet",
      mark: BrandMark,
    },
    navigation: {
      Content: ["articles"],
      Instellingen: [
        "authors",
        "categories",
        "divisions",
        "teams",
        "editorial",
      ],
    },
  },
  collections: {
    articles: collection({
      label: "Artikels",
      slugField: "title",
      path: "content/articles/*",
      format: { contentField: "body" },
      entryLayout: "content",
      previewUrl: "/preview/start?branch={branch}&to=/nieuws/{slug}",
      columns: ["title", "status", "publishedAt", "category"],
      schema: {
        title: fields.slug({
          name: {
            label: "Titel",
            description: "Interne titel voor de slug en artikellijst.",
            validation: { isRequired: true, length: { min: 8, max: 120 } },
          },
          slug: {
            label: "Slug",
            description: "Na de eerste publicatie niet meer wijzigen.",
            validation: {
              pattern: {
                regex: /^[a-z0-9]+(?:-[a-z0-9]+)*$/u,
                message: "Gebruik lowercase ASCII met koppeltekens.",
              },
            },
          },
        }),
        status: fields.select({
          label: "Publicatiestatus",
          options: [
            { label: "Concept", value: "draft" },
            { label: "Gepubliceerd", value: "published" },
            { label: "Gearchiveerd", value: "archived" },
          ],
          defaultValue: "draft",
        }),
        publishedAt: fields.datetime({
          label: "Publicatiedatum",
          description:
            "Verplicht bij Gepubliceerd — zonder dit veld faalt de sitebuild. Vul Europe/Brussels-lokale tijd in (CET/CEST); opslag gebeurt als UTC.",
        }),
        updatedAt: fields.datetime({
          label: "Laatst inhoudelijk bijgewerkt",
          description: "Europe/Brussels-lokale tijd (CET/CEST).",
        }),
        author: fields.select({
          label: "Auteur",
          options: authorOptions,
          defaultValue: defaultAuthor,
        }),
        headline: fields.text({
          label: "Kop",
          validation: { isRequired: true, length: { min: 8, max: 120 } },
          description: "Controleer deze kop ook in de mobiele preview.",
        }),
        dek: fields.text({
          label: "Intro",
          multiline: true,
          validation: { isRequired: true, length: { min: 20, max: 240 } },
        }),
        kicker: fields.text({ label: "Bovenkop" }),
        category: fields.select({
          label: "Categorie",
          options: categoryOptions,
          defaultValue: defaultCategory,
        }),
        isGated: fields.checkbox({
          label: "E-mailgate",
          defaultValue: true,
          description: "Toon alleen de lead voordat een lezer toegang heeft.",
        }),
        leadParagraphCount: fields.integer({
          label: "Publieke lead-alinea's",
          defaultValue: 2,
          validation: { min: 2, max: 3 },
        }),
        featured: fields.checkbox({
          label: "Uitgelicht op homepage",
          defaultValue: false,
        }),
        province: fields.select({
          label: "Provincie",
          options: provinceOptions.map((province) => ({
            label: province.label,
            value: province.key,
          })),
          defaultValue: "antwerpen",
        }),
        divisionKeys: fields.multiselect({
          label: "Reeksen",
          options: divisionOptions.map((division) => ({
            label: division.label,
            value: division.key,
          })),
          defaultValue: [],
        }),
        teamKeys: fields.multiselect({
          label: "Clubs",
          options: teamOptions.map((team) => ({
            label: team.label,
            value: team.key,
          })),
          defaultValue: [],
        }),
        illustrationMode: fields.select({
          label: "Beeldmodus",
          options: [
            { label: "Typografisch", value: "generic" },
            { label: "Wedstrijd", value: "match" },
            { label: "Eigen beeld", value: "custom" },
          ],
          defaultValue: "generic",
        }),
        illustrationTone: fields.select({
          label: "Illustratiekleur",
          options: [
            { label: "Groen", value: "green" },
            { label: "Rood", value: "red" },
            { label: "Goud", value: "gold" },
            { label: "Automatisch", value: "auto" },
          ],
          defaultValue: "auto",
        }),
        homeTeam: fields.text({ label: "Thuisploeg" }),
        awayTeam: fields.text({ label: "Uitploeg" }),
        competitionLabel: fields.text({ label: "Wedstrijd/reekslabel" }),
        heroImage: fields.image({
          label: "Hoofdbeeld",
          directory: "public/images/articles",
          publicPath: "/images/articles/",
        }),
        heroAlt: fields.text({
          label: "Alternatieve tekst hoofdbeeld",
          description: "Verplicht wanneer een hoofdbeeld is ingesteld.",
        }),
        heroCredit: fields.text({ label: "Beeldcredit" }),
        socialImage: fields.image({
          label: "Social beeld",
          directory: "public/images/articles",
          publicPath: "/images/articles/",
        }),
        seoTitle: fields.text({
          label: "SEO-titel",
          validation: { length: { max: 65 } },
        }),
        seoDescription: fields.text({
          label: "SEO-omschrijving",
          multiline: true,
          validation: { length: { max: 170 } },
        }),
        canonicalOverride: fields.url({ label: "Canonieke URL override" }),
        excludeFromSearch: fields.checkbox({
          label: "Uitsluiten van zoeken",
          defaultValue: false,
        }),
        body: fields.markdoc({
          label: "Inhoud",
          description:
            "Gebruik alleen tussenkoppen H2/H3, citaten, lijsten, links en beelden.",
          options: bodyOptions,
        }),
      },
    }),
  },
  singletons: {
    authors: singleton({
      label: "Auteurs",
      path: "content/settings/authors",
      format: "yaml",
      schema: {
        items: fields.array(
          fields.object({
            key: settingsItemFields.key,
            displayName: fields.text({
              label: "Naam",
              validation: { isRequired: true },
            }),
            role: fields.text({
              label: "Rol",
              validation: { isRequired: true },
            }),
            bio: fields.text({ label: "Bio", multiline: true }),
            image: fields.image({
              label: "Profielfoto",
              directory: "public/images/authors",
              publicPath: "/images/authors/",
            }),
            active: settingsItemFields.active,
          }),
          {
            label: "Auteurs",
            itemLabel: (props) => props.fields.displayName.value,
          },
        ),
      },
    }),
    categories: singleton({
      label: "Categorieën",
      path: "content/settings/categories",
      format: "yaml",
      schema: {
        items: fields.array(
          fields.object({
            ...settingsItemFields,
            description: fields.text({
              label: "Omschrijving",
              multiline: true,
            }),
            sortOrder: fields.integer({
              label: "Sorteervolgorde",
              defaultValue: 0,
            }),
          }),
          {
            label: "Categorieën",
            itemLabel: (props) => props.fields.label.value,
          },
        ),
      },
    }),
    divisions: singleton({
      label: "Reeksen",
      path: "content/settings/divisions",
      format: "yaml",
      schema: {
        items: fields.array(
          fields.object({
            ...settingsItemFields,
            provinceKey: fields.text({
              label: "Provinciekey",
              validation: { isRequired: true },
            }),
            level: fields.integer({ label: "Niveau", defaultValue: 1 }),
            sortOrder: fields.integer({
              label: "Sorteervolgorde",
              defaultValue: 0,
            }),
          }),
          {
            label: "Reeksen",
            itemLabel: (props) => props.fields.label.value,
          },
        ),
      },
    }),
    teams: singleton({
      label: "Clubs",
      path: "content/settings/teams",
      format: "yaml",
      schema: {
        items: fields.array(
          fields.object({
            ...settingsItemFields,
            divisionKeys: fields.array(fields.text({ label: "Reekskey" }), {
              label: "Actuele reeksen",
              itemLabel: (props) => props.value,
            }),
            provinceKey: fields.text({
              label: "Provinciekey",
              validation: { isRequired: true },
            }),
            aliases: fields.array(fields.text({ label: "Alias" }), {
              label: "Alternatieve namen",
              itemLabel: (props) => props.value,
            }),
          }),
          {
            label: "Clubs",
            itemLabel: (props) => props.fields.label.value,
          },
        ),
      },
    }),
    editorial: singleton({
      label: "Redactionele instellingen",
      path: "content/settings/editorial",
      format: "yaml",
      schema: {
        siteName: fields.text({
          label: "Sitenaam",
          validation: { isRequired: true },
        }),
        tagline: fields.text({
          label: "Tagline",
          validation: { isRequired: true },
        }),
        defaultAuthorKey: fields.select({
          label: "Standaardauteur",
          options: authorOptions,
          defaultValue: defaultAuthor,
        }),
        defaultGated: fields.checkbox({
          label: "Nieuwe artikels standaard gated",
          defaultValue: true,
        }),
        contactCopy: fields.text({
          label: "Redactioneel contact",
          multiline: true,
        }),
      },
    }),
  },
});
