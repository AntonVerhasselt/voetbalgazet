export type SettingsSelectOption = {
  label: string;
  value: string;
};

/**
 * Editor select options for Keystatic (must stay client-safe — no node:fs).
 * Keep these in sync with `content/settings/authors.yaml` and
 * `content/settings/categories.yaml`. Vitest asserts parity.
 */
export const authorOptions: SettingsSelectOption[] = [
  { label: "Redactie De Voetbalgazet", value: "redactie" },
  { label: "Lotte Vermeiren", value: "lotte-vermeiren" },
  { label: "Milan De Smet", value: "milan-de-smet" },
];

export const categoryOptions: SettingsSelectOption[] = [
  { label: "Wedstrijdverslagen", value: "wedstrijdverslagen" },
  { label: "Transfernieuws", value: "transfernieuws" },
  { label: "Interviews", value: "interviews" },
  { label: "Analyse", value: "analyse" },
  { label: "Jeugd", value: "jeugd" },
  { label: "Clubnieuws", value: "clubnieuws" },
];

export const defaultAuthorValue =
  authorOptions.find((option) => option.value === "redactie")?.value ??
  authorOptions[0]!.value;

export const defaultCategoryValue =
  categoryOptions.find((option) => option.value === "clubnieuws")?.value ??
  categoryOptions[0]!.value;
