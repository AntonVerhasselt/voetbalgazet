import { describe, expect, it } from "vitest";
import {
  describeAudience,
  emptyEditorDocumentJson,
  maskEmail,
  parseEditorDocument,
  renderCampaignEmail,
  validateDocumentForSend,
} from "@devoetbalgazet/emails";
// Convex re-exports must stay wired to the shared package.
import {
  parseEditorDocument as parseViaConvexReexport,
  renderCampaignEmail as renderViaConvexReexport,
} from "../convex/lib/emailRender";
import { emptyEditorDocumentJson as emptyViaConvexReexport } from "../convex/lib/compliance";

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
    expect(rendered.html).toContain("background:#1A1510");
    expect(rendered.html).toContain("const x = 1;");
    expect(rendered.html).toContain("height:32px");
    expect(rendered.html).toContain("Kolom A");
    expect(rendered.html).toContain("Cel B");
    expect(rendered.html).toContain('src="https://media.example.com/photo.jpg"');
    expect(rendered.html).toContain('alt="Foto"');
    expect(rendered.text).toContain("Links");
    expect(rendered.text).toContain("Lees meer: https://example.com/meer");
    expect(rendered.rendererVersion).toBe("3");
  });

  it("keeps bulletproof button chrome for editor placeholder href=#", () => {
    const documentJson = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "button",
          attrs: { href: "#", alignment: "center" },
          content: [{ type: "text", text: "Button" }],
        },
      ],
    });
    const rendered = renderCampaignEmail({
      documentJson,
      subject: "CTA test",
      links: {
        unsubscribeUrl: "https://devoetbalgazet.be/uitschrijven",
        preferencesUrl: "https://devoetbalgazet.be/voorkeuren",
        privacyUrl: "https://devoetbalgazet.be/privacy",
        siteUrl: "https://devoetbalgazet.be",
      },
    });
    expect(rendered.html).toContain('href="https://devoetbalgazet.be"');
    expect(rendered.html).toContain("background:#1A1510");
    expect(rendered.html).toContain("Button");
    expect(rendered.html).not.toMatch(
      /<p[^>]*color:#6B5E52[^>]*>Button<\/p>/,
    );
    expect(rendered.html).toContain('role="presentation"');
    expect(rendered.text).toContain("Button: https://devoetbalgazet.be");
  });

  it("renders accent variant buttons and relative article paths", () => {
    const documentJson = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "button",
          attrs: {
            href: "/nieuws/zondagen-langs-de-lijn",
            alignment: "left",
            variant: "accent",
          },
          content: [{ type: "text", text: "Lees het verhaal" }],
        },
      ],
    });
    const rendered = renderCampaignEmail({
      documentJson,
      subject: "Accent CTA",
      links: {
        unsubscribeUrl: "https://devoetbalgazet.be/uitschrijven",
        preferencesUrl: "https://devoetbalgazet.be/voorkeuren",
        privacyUrl: "https://devoetbalgazet.be/privacy",
        siteUrl: "https://devoetbalgazet.be",
      },
    });
    expect(rendered.html).toContain(
      'href="https://devoetbalgazet.be/nieuws/zondagen-langs-de-lijn"',
    );
    expect(rendered.html).toContain("background:#9F2F24");
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

  it("exposes the same API through convex/lib re-exports", () => {
    expect(emptyViaConvexReexport()).toBe(emptyEditorDocumentJson());
    const documentJson = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Parity" }],
        },
      ],
    });
    expect(parseViaConvexReexport(documentJson)).toEqual(
      parseEditorDocument(documentJson),
    );
    const links = {
      unsubscribeUrl: "https://example.com/uitschrijven",
      preferencesUrl: "https://example.com/voorkeuren",
      privacyUrl: "https://example.com/privacy",
      siteUrl: "https://example.com",
    };
    expect(
      renderViaConvexReexport({
        documentJson,
        subject: "Parity",
        links,
      }).html,
    ).toBe(
      renderCampaignEmail({
        documentJson,
        subject: "Parity",
        links,
      }).html,
    );
  });
});
