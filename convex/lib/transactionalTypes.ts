/** Seed definitions for visually managed transactional emails. */

export const TRANSACTIONAL_TYPE_SEEDS = [
  {
    type: "welcome" as const,
    displayName: "Welkomstmail",
    allowedVariableKeys: ["confirmUrl", "firstName"],
    requiredVariableKeys: ["confirmUrl"],
    subject: "Welkom bij De Voetbalgazet",
    documentJson: JSON.stringify({
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "Welkom bij De Voetbalgazet" }],
        },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Je kunt meteen verder lezen. Bevestig je e-mailadres om later je voorkeuren veilig aan te passen.",
            },
          ],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "{{confirmUrl}}" }],
        },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Deze link vervalt na 15 minuten.",
            },
          ],
        },
      ],
    }),
  },
  {
    type: "magic_link" as const,
    displayName: "Magic link",
    allowedVariableKeys: ["magicUrl"],
    requiredVariableKeys: ["magicUrl"],
    subject: "Je aanmeldlink voor De Voetbalgazet",
    documentJson: JSON.stringify({
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "Meld je aan" }],
        },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Gebruik deze link om jezelf te bevestigen. De link vervalt na korte tijd.",
            },
          ],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "{{magicUrl}}" }],
        },
      ],
    }),
  },
  {
    type: "verify_email" as const,
    displayName: "E-mailverificatie",
    allowedVariableKeys: ["verifyUrl"],
    requiredVariableKeys: ["verifyUrl"],
    subject: "Bevestig je e-mailadres",
    documentJson: JSON.stringify({
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "Bevestig je e-mailadres" }],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "{{verifyUrl}}" }],
        },
      ],
    }),
  },
  {
    type: "unsubscribe_confirmed" as const,
    displayName: "Uitschrijving bevestigd",
    allowedVariableKeys: ["preferencesUrl"],
    requiredVariableKeys: [],
    subject: "Je bent uitgeschreven van de nieuwsbrief",
    documentJson: JSON.stringify({
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "Uitschrijving bevestigd" }],
        },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Je ontvangt geen wekelijkse nieuwsbrief meer. Je website-toegang blijft behouden.",
            },
          ],
        },
      ],
    }),
  },
  {
    type: "preferences_changed" as const,
    displayName: "Voorkeuren aangepast",
    allowedVariableKeys: ["preferencesUrl"],
    requiredVariableKeys: ["preferencesUrl"],
    subject: "Je voorkeuren zijn bijgewerkt",
    documentJson: JSON.stringify({
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "Je voorkeuren zijn bijgewerkt" }],
        },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "We hebben je nieuwsbriefvoorkeuren opgeslagen. Je kunt ze later opnieuw aanpassen via deze link:",
            },
          ],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "{{preferencesUrl}}" }],
        },
      ],
    }),
  },
  {
    type: "admin_send_alert" as const,
    displayName: "AdminSendAlert",
    allowedVariableKeys: ["campaignName", "status", "dashboardUrl"],
    requiredVariableKeys: ["campaignName", "status", "dashboardUrl"],
    subject: "Nieuwsbriefstatus: {{campaignName}}",
    documentJson: JSON.stringify({
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "Nieuwsbriefstatus" }],
        },
        {
          type: "paragraph",
          content: [
            { type: "text", text: "{{campaignName}} staat op " },
            { type: "text", text: "{{status}}" },
            { type: "text", text: "." },
          ],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "{{dashboardUrl}}" }],
        },
      ],
    }),
  },
] as const;

export type TransactionalEmailType =
  (typeof TRANSACTIONAL_TYPE_SEEDS)[number]["type"];

export function transactionalContentFingerprint(args: {
  subject: string;
  preheader?: string;
  documentJson: string;
}): string {
  return `${args.subject}\n${args.preheader ?? ""}\n${args.documentJson}`;
}

export function seedForType(type: TransactionalEmailType) {
  const seed = TRANSACTIONAL_TYPE_SEEDS.find((entry) => entry.type === type);
  if (!seed) {
    throw new Error(`Onbekend dienstmailtype: ${type}`);
  }
  return seed;
}
