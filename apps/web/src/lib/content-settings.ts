import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "yaml";

export type SettingsSelectOption = {
  label: string;
  value: string;
};

type AuthorItem = {
  key?: unknown;
  displayName?: unknown;
  active?: unknown;
};

type CategoryItem = {
  key?: unknown;
  label?: unknown;
  active?: unknown;
  sortOrder?: unknown;
};

function settingsRoot(): string {
  const cwd = process.cwd();
  if (cwd.endsWith(`${path.sep}apps${path.sep}web`)) {
    return path.join(cwd, "content", "settings");
  }
  return path.join(cwd, "apps", "web", "content", "settings");
}

function readYamlFile(fileName: string): unknown {
  const filePath = path.join(settingsRoot(), fileName);
  if (!existsSync(filePath)) {
    return null;
  }
  return parse(readFileSync(filePath, "utf8"));
}

function itemsFrom(fileName: string): unknown[] {
  const parsed = readYamlFile(fileName);
  if (!parsed || typeof parsed !== "object" || !("items" in parsed)) {
    return [];
  }
  const items = (parsed as { items?: unknown }).items;
  return Array.isArray(items) ? items : [];
}

export function authorSelectOptions(): SettingsSelectOption[] {
  return itemsFrom("authors.yaml")
    .map((item) => item as AuthorItem)
    .filter(
      (item) =>
        typeof item.key === "string" &&
        typeof item.displayName === "string" &&
        item.active !== false,
    )
    .map((item) => ({
      label: item.displayName as string,
      value: item.key as string,
    }));
}

export function categorySelectOptions(): SettingsSelectOption[] {
  return itemsFrom("categories.yaml")
    .map((item) => item as CategoryItem)
    .filter(
      (item) =>
        typeof item.key === "string" &&
        typeof item.label === "string" &&
        item.active !== false,
    )
    .sort((left, right) => {
      const leftOrder =
        typeof left.sortOrder === "number" ? left.sortOrder : 0;
      const rightOrder =
        typeof right.sortOrder === "number" ? right.sortOrder : 0;
      return leftOrder - rightOrder;
    })
    .map((item) => ({
      label: item.label as string,
      value: item.key as string,
    }));
}
