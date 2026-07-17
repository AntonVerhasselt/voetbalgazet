import {
  COMPLIANCE,
  COMPLIANCE_FOOTER_VERSION,
  MAX_DOCUMENT_JSON_BYTES,
  RENDERER_VERSION,
  THEME_VERSION,
} from "./compliance";

export type TipTapMark = {
  type: string;
  attrs?: Record<string, unknown>;
};

export type TipTapNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TipTapNode[];
  marks?: TipTapMark[];
  text?: string;
};

export type RenderedEmail = {
  html: string;
  text: string;
  rendererVersion: string;
  themeVersion: string;
  footerVersion: string;
};

export type ComplianceLinks = {
  unsubscribeUrl: string;
  preferencesUrl: string;
  privacyUrl: string;
  siteUrl: string;
};

const COLORS = {
  bg: "#F5F0E8",
  ink: "#1A1510",
  muted: "#6B5E52",
  border: "#D4C8B8",
  buttonBg: "#1A1510",
  buttonFg: "#F5F0E8",
} as const;

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function isSafeHttpUrl(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function renderMarks(text: string, marks: TipTapMark[] | undefined): string {
  let html = escapeHtml(text);
  if (!marks?.length) {
    return html;
  }
  for (const mark of marks) {
    switch (mark.type) {
      case "bold":
        html = `<strong>${html}</strong>`;
        break;
      case "italic":
        html = `<em>${html}</em>`;
        break;
      case "underline":
        html = `<u>${html}</u>`;
        break;
      case "link": {
        const href = mark.attrs?.href;
        if (isSafeHttpUrl(href)) {
          html = `<a href="${escapeHtml(href)}" style="color:${COLORS.ink};text-decoration:underline;">${html}</a>`;
        }
        break;
      }
      default:
        break;
    }
  }
  return html;
}

function renderInline(nodes: TipTapNode[] | undefined): string {
  if (!nodes?.length) {
    return "";
  }
  return nodes
    .map((node) => {
      if (node.type === "text") {
        return renderMarks(node.text ?? "", node.marks);
      }
      if (node.type === "hardBreak") {
        return "<br />";
      }
      return renderNode(node);
    })
    .join("");
}

function renderNode(node: TipTapNode): string {
  switch (node.type) {
    case "doc":
      return (node.content ?? []).map(renderNode).join("");
    case "paragraph": {
      const inner = renderInline(node.content);
      return `<p style="margin:0 0 16px;font-size:16px;line-height:1.55;color:${COLORS.ink};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">${inner || "&nbsp;"}</p>`;
    }
    case "heading": {
      const level = Number(node.attrs?.level ?? 2);
      const safeLevel = level >= 1 && level <= 3 ? level : 2;
      const sizes = { 1: "28px", 2: "22px", 3: "18px" } as const;
      const size = sizes[safeLevel as 1 | 2 | 3];
      return `<h${safeLevel} style="margin:0 0 12px;font-size:${size};line-height:1.25;color:${COLORS.ink};font-family:Georgia,'Times New Roman',serif;font-weight:700;">${renderInline(node.content)}</h${safeLevel}>`;
    }
    case "bulletList":
      return `<ul style="margin:0 0 16px;padding-left:20px;color:${COLORS.ink};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">${(node.content ?? []).map(renderNode).join("")}</ul>`;
    case "orderedList":
      return `<ol style="margin:0 0 16px;padding-left:20px;color:${COLORS.ink};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">${(node.content ?? []).map(renderNode).join("")}</ol>`;
    case "listItem":
      return `<li style="margin:0 0 6px;font-size:16px;line-height:1.5;">${renderInline(node.content)}</li>`;
    case "blockquote":
      return `<blockquote style="margin:0 0 16px;padding:8px 0 8px 14px;border-left:3px solid ${COLORS.border};color:${COLORS.muted};font-family:Georgia,'Times New Roman',serif;">${(node.content ?? []).map(renderNode).join("")}</blockquote>`;
    case "horizontalRule":
    case "divider":
      return `<hr style="border:none;border-top:1px solid ${COLORS.border};margin:24px 0;" />`;
    case "image": {
      const src = node.attrs?.src;
      const alt = typeof node.attrs?.alt === "string" ? node.attrs.alt : "";
      if (!isSafeHttpUrl(src)) {
        return "";
      }
      return `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" style="display:block;max-width:100%;height:auto;margin:0 0 16px;" />`;
    }
    case "button": {
      const href = node.attrs?.href ?? node.attrs?.url;
      const label =
        typeof node.attrs?.label === "string"
          ? node.attrs.label
          : renderInline(node.content) || "Meer lezen";
      if (!isSafeHttpUrl(href)) {
        return `<p style="margin:0 0 16px;color:${COLORS.muted};">${escapeHtml(label.replace(/<[^>]+>/g, ""))}</p>`;
      }
      return `<p style="margin:0 0 20px;"><a href="${escapeHtml(String(href))}" style="display:inline-block;background:${COLORS.buttonBg};color:${COLORS.buttonFg};text-decoration:none;padding:12px 18px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;">${label.includes("<") ? label : escapeHtml(label)}</a></p>`;
    }
    case "spacer": {
      const height = Number(node.attrs?.height ?? 24);
      const safeHeight = Number.isFinite(height)
        ? Math.min(Math.max(height, 8), 96)
        : 24;
      return `<div style="height:${safeHeight}px;line-height:${safeHeight}px;">&nbsp;</div>`;
    }
    default:
      if (node.content?.length) {
        return node.content.map(renderNode).join("");
      }
      return "";
  }
}

function nodeToText(node: TipTapNode): string {
  switch (node.type) {
    case "text":
      return node.text ?? "";
    case "hardBreak":
      return "\n";
    case "paragraph":
    case "heading":
    case "listItem":
      return `${(node.content ?? []).map(nodeToText).join("")}\n\n`;
    case "bulletList":
    case "orderedList":
      return (node.content ?? [])
        .map((child) => `- ${nodeToText(child).trim()}`)
        .join("\n")
        .concat("\n\n");
    case "horizontalRule":
    case "divider":
      return "---\n\n";
    case "button": {
      const href = node.attrs?.href ?? node.attrs?.url;
      const label =
        typeof node.attrs?.label === "string"
          ? node.attrs.label
          : (node.content ?? []).map(nodeToText).join("") || "Meer lezen";
      return isSafeHttpUrl(href) ? `${label}: ${href}\n\n` : `${label}\n\n`;
    }
    case "image": {
      const alt = typeof node.attrs?.alt === "string" ? node.attrs.alt : "Afbeelding";
      const src = node.attrs?.src;
      return isSafeHttpUrl(src) ? `[${alt}](${src})\n\n` : `[${alt}]\n\n`;
    }
    default:
      return (node.content ?? []).map(nodeToText).join("");
  }
}

export function parseEditorDocument(documentJson: string): TipTapNode {
  if (documentJson.length > MAX_DOCUMENT_JSON_BYTES) {
    throw new Error("De e-mailinhoud is te groot (max. 256 KiB).");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(documentJson) as unknown;
  } catch {
    throw new Error("Ongeldig editor-document.");
  }
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    (parsed as TipTapNode).type !== "doc"
  ) {
    throw new Error("Editor-document mist type 'doc'.");
  }
  return parsed as TipTapNode;
}

export function validateDocumentForSend(documentJson: string): TipTapNode {
  const doc = parseEditorDocument(documentJson);
  const text = nodeToText(doc).trim();
  if (!text) {
    throw new Error("Voeg inhoud toe vóór je verzendt.");
  }
  return doc;
}

function renderComplianceFooter(links: ComplianceLinks): string {
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:32px;border-top:1px solid ${COLORS.border};">
  <tr>
    <td style="padding-top:20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:13px;line-height:1.5;color:${COLORS.muted};">
      <p style="margin:0 0 10px;">
        <a href="${escapeHtml(links.unsubscribeUrl)}" style="color:${COLORS.ink};">Uitschrijven</a>
        &nbsp;·&nbsp;
        <a href="${escapeHtml(links.preferencesUrl)}" style="color:${COLORS.ink};">Voorkeuren aanpassen</a>
        &nbsp;·&nbsp;
        <a href="${escapeHtml(links.privacyUrl)}" style="color:${COLORS.ink};">Privacy</a>
      </p>
      <p style="margin:0 0 6px;">${escapeHtml(COMPLIANCE.companyName)} — ${escapeHtml(COMPLIANCE.addressLine)}</p>
      <p style="margin:0 0 6px;">KBO ${escapeHtml(COMPLIANCE.kbo)} · btw ${escapeHtml(COMPLIANCE.btw)}</p>
      <p style="margin:0;">Je ontvangt deze mail omdat je je inschreef op De Voetbalgazet.</p>
    </td>
  </tr>
</table>`.trim();
}

function renderComplianceFooterText(links: ComplianceLinks): string {
  return [
    "---",
    `Uitschrijven: ${links.unsubscribeUrl}`,
    `Voorkeuren: ${links.preferencesUrl}`,
    `Privacy: ${links.privacyUrl}`,
    `${COMPLIANCE.companyName} — ${COMPLIANCE.addressLine}`,
    `KBO ${COMPLIANCE.kbo} · btw ${COMPLIANCE.btw}`,
  ].join("\n");
}

export function renderCampaignEmail(args: {
  documentJson: string;
  subject: string;
  preheader?: string;
  links: ComplianceLinks;
  includeFooter?: boolean;
}): RenderedEmail {
  const doc = parseEditorDocument(args.documentJson);
  const bodyHtml = renderNode(doc);
  const includeFooter = args.includeFooter !== false;
  const footerHtml = includeFooter ? renderComplianceFooter(args.links) : "";
  const preheader = args.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(args.preheader)}</div>`
    : "";

  const html = `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(args.subject)}</title>
</head>
<body style="margin:0;padding:0;background:${COLORS.bg};">
  ${preheader}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.bg};">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border:1px solid ${COLORS.border};">
          <tr>
            <td style="padding:28px 24px;">
              ${bodyHtml}
              ${footerHtml}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const textBody = nodeToText(doc).trim();
  const text = includeFooter
    ? `${textBody}\n\n${renderComplianceFooterText(args.links)}`
    : textBody;

  return {
    html,
    text,
    rendererVersion: RENDERER_VERSION,
    themeVersion: THEME_VERSION,
    footerVersion: includeFooter ? COMPLIANCE_FOOTER_VERSION : "none",
  };
}

export function renderTransactionalEmail(args: {
  documentJson: string;
  subject: string;
  preheader?: string;
  variables: Record<string, string>;
}): RenderedEmail {
  let documentJson = args.documentJson;
  for (const [key, value] of Object.entries(args.variables)) {
    documentJson = documentJson.replaceAll(`{{${key}}}`, value);
  }
  return renderCampaignEmail({
    documentJson,
    subject: args.subject,
    preheader: args.preheader,
    links: {
      unsubscribeUrl: "#",
      preferencesUrl: "#",
      privacyUrl: "#",
      siteUrl: "#",
    },
    includeFooter: false,
  });
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) {
    return "***";
  }
  const visible = local.slice(0, 1);
  return `${visible}***@${domain}`;
}

export function describeAudience(args: {
  divisionLabels: string[];
  teamLabels: string[];
}): string {
  const parts: string[] = ["Alle actieve abonnees"];
  if (args.divisionLabels.length > 0) {
    parts.push(`reeks: ${args.divisionLabels.join(" of ")}`);
  }
  if (args.teamLabels.length > 0) {
    parts.push(`club: ${args.teamLabels.join(" of ")}`);
  }
  if (parts.length === 1) {
    return parts[0]!;
  }
  return `${parts[0]} · ${parts.slice(1).join(" · ")}`;
}
