import { describe, expect, it } from "vitest";
import {
  describeAudience,
  maskEmail,
  parseEditorDocument,
  renderCampaignEmail,
  validateDocumentForSend,
} from "../convex/lib/emailRender";
import { emptyEditorDocumentJson } from "../convex/lib/compliance";

describe("emailRender", () => {
  it("rejects oversized or invalid documents", () => {
    expect(() => parseEditorDocument("{")).toThrow(/Ongeldig/);
    expect(() => parseEditorDocument(JSON.stringify({ type: "paragraph" }))).toThrow(
      /doc/,
    );
  });

  it("rejects empty content for send", () => {
    expect(() => validateDocumentForSend(emptyEditorDocumentJson())).toThrow(
      /inhoud/i,
    );
  });

  it("renders body html, plaintext and compliance footer", () => {
    const documentJson = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "Titel" }],
        },
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Hallo " },
            {
              type: "text",
              marks: [{ type: "bold" }],
              text: "wereld",
            },
          ],
        },
      ],
    });
    const rendered = renderCampaignEmail({
      documentJson,
      subject: "Test",
      preheader: "Voorbeeld",
      links: {
        unsubscribeUrl: "https://example.com/uitschrijven?token=abc",
        preferencesUrl: "https://example.com/voorkeuren",
        privacyUrl: "https://example.com/privacy",
        siteUrl: "https://example.com",
      },
    });
    expect(rendered.html).toContain("Titel");
    expect(rendered.html).toContain("<strong>wereld</strong>");
    expect(rendered.html).toContain("Uitschrijven");
    expect(rendered.html).toContain("YARU DAKEN BV");
    expect(rendered.text).toContain("Titel");
    expect(rendered.text).toContain("Uitschrijven:");
    expect(rendered.footerVersion).toBe("1");
  });

  it("masks emails and describes audiences", () => {
    expect(maskEmail("anton@example.com")).toBe("a***@example.com");
    expect(
      describeAudience({
        divisionLabels: ["P1 Antwerpen"],
        teamLabels: ["KFC Duffel"],
      }),
    ).toContain("reeks: P1 Antwerpen");
  });
});
