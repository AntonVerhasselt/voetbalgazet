const EDITOR_TIME_ZONE = "Europe/Brussels";

/**
 * Keystatic `fields.datetime` stores wall-clock values without a timezone
 * (`YYYY-MM-DDTHH:mm`). Editors enter Europe/Brussels local time; we persist
 * canonical UTC ISO strings for RSS, JSON-LD, and display.
 */
export function normalizeEditorDatetime(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  const match =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/u.exec(trimmed);
  if (!match) {
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6] ?? "0");
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second);
  const offsetMs = zonedOffsetMs(utcGuess, EDITOR_TIME_ZONE);
  return new Date(utcGuess - offsetMs).toISOString();
}

function zonedOffsetMs(utcMs: number, timeZone: string): number {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(
    formatter
      .formatToParts(new Date(utcMs))
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  const asUtcComponents = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return asUtcComponents - utcMs;
}

export const EDITOR_DATETIME_POLICY =
  "Keystatic publication datetimes are Europe/Brussels wall time, stored as UTC.";
