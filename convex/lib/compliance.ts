/** Locked campaign compliance footer — YARU DAKEN BV. */

export const COMPLIANCE_FOOTER_VERSION = "1";
export const RENDERER_VERSION = "1";
export const THEME_VERSION = "1";
export const EDITOR_FORMAT = "react-email-editor" as const;
export const EDITOR_FORMAT_VERSION = 1;
export const MAX_DOCUMENT_JSON_BYTES = 256 * 1024;

export const COMPLIANCE = {
  companyName: "YARU DAKEN BV",
  addressLine: "Van Duyststraat 60, 2100 Antwerpen, België",
  kbo: "1017.634.522",
  btw: "BE 1017.634.522",
  kboUrl:
    "https://kbopub.economie.fgov.be/kbopub/toonondernemingps.html?ondernemingsnummer=1017634522",
  replyTo: "redactie@devoetbalgazet.be",
  privacyEmail: "privacy@devoetbalgazet.be",
  privacyPath: "/privacy",
  preferencesPath: "/voorkeuren",
  unsubscribePath: "/uitschrijven",
  defaultFromAddress: "redactie@nieuws.devoetbalgazet.be",
  defaultFromName: "De Voetbalgazet",
  sendingDomain: "nieuws.devoetbalgazet.be",
  mediaCdnHost: "https://media.devoetbalgazet.be",
  timezone: "Europe/Brussels",
} as const;

export function mediaCdnUrl(r2Key: string): string {
  const encoded = r2Key
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `${COMPLIANCE.mediaCdnHost}/${encoded}`;
}

export function defaultCampaignName(now = new Date()): string {
  const formatter = new Intl.DateTimeFormat("nl-BE", {
    timeZone: COMPLIANCE.timezone,
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  return `Nieuwsbrief — ${formatter.format(now)}`;
}

export function emptyEditorDocumentJson(): string {
  // TipTap forbids empty text nodes — use an empty paragraph without content.
  return JSON.stringify({
    type: "doc",
    content: [{ type: "paragraph" }],
  });
}

/** Strip empty TipTap text nodes that crash the editor. */
export function sanitizeEditorDocumentJson(documentJson: string): string {
  try {
    const parsed = JSON.parse(documentJson) as {
      type?: string;
      content?: unknown[];
    };
    const walk = (node: unknown): unknown => {
      if (!node || typeof node !== "object") {
        return node;
      }
      const record = node as {
        type?: string;
        text?: string;
        content?: unknown[];
      };
      if (record.type === "text" && (record.text ?? "") === "") {
        return null;
      }
      if (Array.isArray(record.content)) {
        const next = record.content
          .map(walk)
          .filter((child): child is unknown => child !== null);
        return { ...record, content: next.length > 0 ? next : undefined };
      }
      return record;
    };
    const cleaned = walk(parsed);
    return JSON.stringify(cleaned ?? { type: "doc", content: [{ type: "paragraph" }] });
  } catch {
    return emptyEditorDocumentJson();
  }
}

export function campaignStatusLabel(
  status:
    | "draft"
    | "scheduled"
    | "preparing"
    | "sending"
    | "sent"
    | "partially_failed"
    | "failed"
    | "cancelled",
): string {
  switch (status) {
    case "draft":
      return "Concept";
    case "scheduled":
      return "Gepland";
    case "preparing":
      return "Ontvangers voorbereiden";
    case "sending":
      return "Wordt verzonden";
    case "sent":
      return "Verzonden";
    case "partially_failed":
      return "Deels mislukt";
    case "failed":
      return "Mislukt";
    case "cancelled":
      return "Geannuleerd";
  }
}
