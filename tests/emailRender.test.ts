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

  it("renders columns, buttons, sections, code, tables and marks", () => {
    const documentJson = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "section",
          attrs: { style: "background-color:#F5F0E8;padding:12px" },
          content: [
            {
              type: "paragraph",
              attrs: { alignment: "center" },
              content: [
                {
                  type: "text",
                  text: "Gecentreerd ",
                  marks: [{ type: "italic" }],
                },
                {
                  type: "text",
                  text: "en doorstreept",
                  marks: [{ type: "strike" }],
                },
              ],
            },
          ],
        },
        {
          type: "twoColumns",
          content: [
            {
              type: "columnsColumn",
              content: [
                {
                  type: "heading",
                  attrs: { level: 2 },
                  content: [{ type: "text", text: "Links" }],
                },
              ],
            },
            {
              type: "columnsColumn",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Rechts" }],
                },
              ],
            },
          ],
        },
        {
          type: "button",
          attrs: { href: "https://example.com/meer", alignment: "center" },
          content: [{ type: "text", text: "Lees meer" }],
        },
        {
          type: "codeBlock",
          content: [{ type: "text", text: "const x = 1;" }],
        },
        {
          type: "spacer",
          attrs: { height: 32 },
        },
        {
          type: "table",
          content: [
            {
              type: "tableRow",
              content: [
                {
                  type: "tableHeader",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Kolom A" }],
                    },
                  ],
                },
                {
                  type: "tableCell",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Cel B" }],
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: "image",
          attrs: {
            src: "https://media.example.com/photo.jpg",
            alt: "Foto",
            alignment: "center",
            href: "https://example.com",
          },
        },
      ],
    });
    const rendered = renderCampaignEmail({
      documentJson,
      subject: "Layout test",
      links: {
        unsubscribeUrl: "https://example.com/uitschrijven",
        preferencesUrl: "https://example.com/voorkeuren",
        privacyUrl: "https://example.com/privacy",
        siteUrl: "https://example.com",
      },
    });
    expect(rendered.html).toContain("text-align:center");
    expect(rendered.html).toContain("<s>en doorstreept</s>");
    expect(rendered.html).toContain("Links");
    expect(rendered.html).toContain("Rechts");
    expect(rendered.html).toContain('href="https://example.com/meer"');
    expect(rendered.html).toContain("Lees meer");
    expect(rendered.html).toContain("const x = 1;");
    expect(rendered.html).toContain("height:32px");
    expect(rendered.html).toContain("Kolom A");
    expect(rendered.html).toContain("Cel B");
    expect(rendered.html).toContain('src="https://media.example.com/photo.jpg"');
    expect(rendered.html).toContain('alt="Foto"');
    expect(rendered.text).toContain("Links");
    expect(rendered.text).toContain("Lees meer: https://example.com/meer");
    expect(rendered.rendererVersion).toBe("2");
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

  it("appends opaque campaign analytics ids to own-domain article links", () => {
    const documentJson = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Lees",
              marks: [
                {
                  type: "link",
                  attrs: {
                    href: "https://devoetbalgazet.be/nieuws/derby-reportage",
                  },
                },
              ],
            },
          ],
        },
      ],
    });
    const rendered = renderCampaignEmail({
      documentJson,
      subject: "Test",
      links: {
        unsubscribeUrl: "https://devoetbalgazet.be/uitschrijven",
        preferencesUrl: "https://devoetbalgazet.be/voorkeuren",
        privacyUrl: "https://devoetbalgazet.be/privacy",
        siteUrl: "https://devoetbalgazet.be",
      },
      campaignAnalyticsId: "abc123def456",
    });
    expect(rendered.html).toContain("cid=abc123def456");
    expect(rendered.html).toContain("utm_source=newsletter");
    expect(rendered.html).toContain("utm_medium=email");
    expect(rendered.html).toContain("/nieuws/derby-reportage?");
  });
});
