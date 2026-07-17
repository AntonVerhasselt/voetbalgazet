import {
  COMPLIANCE,
  COMPLIANCE_FOOTER_VERSION,
  MAX_DOCUMENT_JSON_BYTES,
  RENDERER_VERSION,
  THEME_VERSION,
  sanitizeEditorDocumentJson,
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
  codeBg: "#F5F0E8",
} as const;

const FONT_BODY =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
const FONT_DISPLAY = "Georgia,'Times New Roman',serif";
const FONT_MONO =
  "ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono',monospace";

/** CSS properties safe to pass through from editor inline styles. */
const SAFE_STYLE_PROPS = new Set([
  "color",
  "background",
  "background-color",
  "font-size",
  "font-weight",
  "font-family",
  "font-style",
  "line-height",
  "letter-spacing",
  "text-align",
  "text-decoration",
  "text-transform",
  "padding",
  "padding-top",
  "padding-right",
  "padding-bottom",
  "padding-left",
  "margin",
  "margin-top",
  "margin-right",
  "margin-bottom",
  "margin-left",
  "border",
  "border-top",
  "border-right",
  "border-bottom",
  "border-left",
  "border-width",
  "border-style",
  "border-color",
  "border-radius",
  "width",
  "max-width",
  "height",
  "min-height",
  "vertical-align",
]);

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

/** Parse and whitelist inline CSS from editor attrs.style. */
function sanitizeInlineStyle(raw: unknown): string {
  if (typeof raw !== "string" || !raw.trim()) {
    return "";
  }
  const parts: string[] = [];
  for (const declaration of raw.split(";")) {
    const trimmed = declaration.trim();
    if (!trimmed) continue;
    const colon = trimmed.indexOf(":");
    if (colon <= 0) continue;
    const prop = trimmed.slice(0, colon).trim().toLowerCase();
    const value = trimmed.slice(colon + 1).trim();
    if (
      !value ||
      /expression|javascript:|url\s*\(/i.test(value)
    ) {
      continue;
    }
    if (!SAFE_STYLE_PROPS.has(prop)) {
      continue;
    }
    parts.push(`${prop}:${value}`);
  }
  return parts.join(";");
}

function styleAttr(styles: Array<string | undefined | false>): string {
  const merged = styles.filter(Boolean).join(";");
  return merged ? ` style="${escapeHtml(merged)}"` : "";
}

function alignmentCss(attrs: Record<string, unknown> | undefined): string {
  const alignment = attrs?.alignment ?? attrs?.align;
  if (
    alignment === "center" ||
    alignment === "right" ||
    alignment === "justify" ||
    alignment === "left"
  ) {
    return `text-align:${alignment}`;
  }
  return "";
}

function widthCss(attrs: Record<string, unknown> | undefined): string {
  const width = attrs?.width;
  if (typeof width === "number" && Number.isFinite(width)) {
    return `width:${width}px`;
  }
  if (typeof width === "string" && width && width !== "auto") {
    if (/^\d+(\.\d+)?(px|%)?$/.test(width)) {
      return width.endsWith("%") || width.endsWith("px")
        ? `width:${width}`
        : `width:${width}px`;
    }
  }
  return "";
}

function renderMarks(text: string, marks: TipTapMark[] | undefined): string {
  let html = escapeHtml(text);
  if (!marks?.length) {
    return html;
  }
  // Apply marks outermost-first so links wrap styled text correctly.
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
      case "strike":
        html = `<s>${html}</s>`;
        break;
      case "code":
        html = `<code style="font-family:${FONT_MONO};font-size:0.9em;background:${COLORS.codeBg};padding:1px 4px;">${html}</code>`;
        break;
      case "sup":
      case "superscript":
        html = `<sup>${html}</sup>`;
        break;
      case "uppercase":
        html = `<span style="text-transform:uppercase;">${html}</span>`;
        break;
      case "preservedStyle": {
        const style = sanitizeInlineStyle(mark.attrs?.style);
        html = style ? `<span style="${escapeHtml(style)}">${html}</span>` : html;
        break;
      }
      case "link": {
        const href = mark.attrs?.href;
        const linkStyle = sanitizeInlineStyle(mark.attrs?.style);
        if (isSafeHttpUrl(href)) {
          const extra = linkStyle ? `;${linkStyle}` : "";
          html = `<a href="${escapeHtml(href)}" style="color:${COLORS.ink};text-decoration:underline${extra}">${html}</a>`;
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

function renderBlockChildren(nodes: TipTapNode[] | undefined): string {
  if (!nodes?.length) {
    return "";
  }
  return nodes.map(renderNode).join("");
}

function columnCountForType(type: string): number {
  switch (type) {
    case "twoColumns":
      return 2;
    case "threeColumns":
      return 3;
    case "fourColumns":
      return 4;
    default:
      return 1;
  }
}

function renderColumns(node: TipTapNode): string {
  const count = columnCountForType(node.type);
  const columns = node.content ?? [];
  const cellSpacing =
    typeof node.attrs?.cellspacing === "number"
      ? Math.min(Math.max(node.attrs.cellspacing, 0), 32)
      : 0;
  // Keep percentage columns + optional gutters within ~100% width.
  const gutterTotal = cellSpacing > 0 ? cellSpacing * Math.max(count - 1, 0) : 0;
  const availablePct = gutterTotal > 0 ? Math.max(100 - Math.ceil((gutterTotal / 600) * 100), 50) : 100;
  const widthPct = Math.floor(availablePct / Math.max(count, 1));
  const outerStyle = [
    sanitizeInlineStyle(node.attrs?.style),
    alignmentCss(node.attrs),
  ]
    .filter(Boolean)
    .join(";");

  const cells: string[] = [];
  for (let index = 0; index < count; index++) {
    if (index > 0 && cellSpacing > 0) {
      cells.push(
        `<td width="${cellSpacing}" style="width:${cellSpacing}px;font-size:1px;line-height:1px;">&nbsp;</td>`,
      );
    }
    const col = columns[index];
    const colStyle = [
      `width:${widthPct}%`,
      "vertical-align:top",
      sanitizeInlineStyle(col?.attrs?.style),
      widthCss(col?.attrs),
    ]
      .filter(Boolean)
      .join(";");
    const inner = col ? renderBlockChildren(col.content) : "&nbsp;";
    cells.push(
      `<td width="${widthPct}%" valign="top"${styleAttr([colStyle])}>${inner || "&nbsp;"}</td>`,
    );
  }

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"${styleAttr([
    "margin:0 0 16px",
    outerStyle,
  ])}><tr>${cells.join("")}</tr></table>`;
}

function renderNode(node: TipTapNode): string {
  const inlineStyle = sanitizeInlineStyle(node.attrs?.style);
  const align = alignmentCss(node.attrs);

  switch (node.type) {
    case "doc":
      return renderBlockChildren(node.content);

    case "globalContent":
    case "previewText":
      return "";

    case "body":
    case "container":
    case "div":
      return renderBlockChildren(node.content);

    case "paragraph": {
      const styles = [
        "margin:0 0 16px",
        "font-size:16px",
        "line-height:1.55",
        `color:${COLORS.ink}`,
        `font-family:${FONT_BODY}`,
        align,
        inlineStyle,
      ];
      return `<p${styleAttr(styles)}>${renderInline(node.content) || "&nbsp;"}</p>`;
    }

    case "heading": {
      const level = Number(node.attrs?.level ?? 2);
      const safeLevel = level >= 1 && level <= 3 ? level : 2;
      const sizes = { 1: "28px", 2: "22px", 3: "18px" } as const;
      const size = sizes[safeLevel as 1 | 2 | 3];
      const styles = [
        "margin:0 0 12px",
        `font-size:${size}`,
        "line-height:1.25",
        `color:${COLORS.ink}`,
        `font-family:${FONT_DISPLAY}`,
        "font-weight:700",
        align,
        inlineStyle,
      ];
      return `<h${safeLevel}${styleAttr(styles)}>${renderInline(node.content)}</h${safeLevel}>`;
    }

    case "bulletList": {
      const styles = [
        "margin:0 0 16px",
        "padding-left:20px",
        `color:${COLORS.ink}`,
        `font-family:${FONT_BODY}`,
        inlineStyle,
      ];
      return `<ul${styleAttr(styles)}>${renderBlockChildren(node.content)}</ul>`;
    }

    case "orderedList": {
      const styles = [
        "margin:0 0 16px",
        "padding-left:20px",
        `color:${COLORS.ink}`,
        `font-family:${FONT_BODY}`,
        inlineStyle,
      ];
      return `<ol${styleAttr(styles)}>${renderBlockChildren(node.content)}</ol>`;
    }

    case "listItem": {
      const styles = [
        "margin:0 0 6px",
        "font-size:16px",
        "line-height:1.5",
        inlineStyle,
      ];
      // List items may contain block paragraphs — prefer block children when present.
      const hasBlockChild = (node.content ?? []).some(
        (child) => child.type !== "text" && child.type !== "hardBreak",
      );
      const inner = hasBlockChild
        ? renderBlockChildren(node.content)
        : renderInline(node.content);
      return `<li${styleAttr(styles)}>${inner || "&nbsp;"}</li>`;
    }

    case "blockquote": {
      const styles = [
        "margin:0 0 16px",
        "padding:8px 0 8px 14px",
        `border-left:3px solid ${COLORS.border}`,
        `color:${COLORS.muted}`,
        `font-family:${FONT_DISPLAY}`,
        align,
        inlineStyle,
      ];
      return `<blockquote${styleAttr(styles)}>${renderBlockChildren(node.content)}</blockquote>`;
    }

    case "codeBlock": {
      const styles = [
        "margin:0 0 16px",
        "padding:12px 14px",
        `background:${COLORS.codeBg}`,
        `color:${COLORS.ink}`,
        `font-family:${FONT_MONO}`,
        "font-size:13px",
        "line-height:1.45",
        "white-space:pre-wrap",
        `border:1px solid ${COLORS.border}`,
        inlineStyle,
      ];
      const code = (node.content ?? [])
        .map((child) =>
          child.type === "text" ? escapeHtml(child.text ?? "") : "",
        )
        .join("");
      return `<pre${styleAttr(styles)}><code>${code || "&nbsp;"}</code></pre>`;
    }

    case "horizontalRule":
    case "divider": {
      const styles = [
        "border:none",
        `border-top:1px solid ${COLORS.border}`,
        "margin:24px 0",
        inlineStyle,
      ];
      return `<hr${styleAttr(styles)} />`;
    }

    case "image": {
      const src = node.attrs?.src;
      const alt = typeof node.attrs?.alt === "string" ? node.attrs.alt : "";
      if (!isSafeHttpUrl(src)) {
        return "";
      }
      const width = node.attrs?.width;
      const height = node.attrs?.height;
      const hasExplicitHeight =
        typeof height === "number" ||
        (typeof height === "string" && height !== "auto" && /^\d+$/.test(height));
      const widthAttr =
        typeof width === "number"
          ? ` width="${width}"`
          : typeof width === "string" && width !== "auto" && /^\d+$/.test(width)
            ? ` width="${width}"`
            : "";
      const heightAttr = hasExplicitHeight
        ? ` height="${typeof height === "number" ? height : height}"`
        : "";
      const imgAlign = node.attrs?.alignment ?? node.attrs?.align;
      const margin =
        imgAlign === "left"
          ? "margin:0 auto 16px 0"
          : imgAlign === "right"
            ? "margin:0 0 16px auto"
            : "margin:0 auto 16px";
      const imgStyles = [
        "display:block",
        "max-width:100%",
        hasExplicitHeight ? undefined : "height:auto",
        margin,
        widthCss(node.attrs),
        inlineStyle,
      ];
      const img = `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}"${widthAttr}${heightAttr}${styleAttr(imgStyles)} />`;
      const href = node.attrs?.href;
      if (isSafeHttpUrl(href)) {
        return `<a href="${escapeHtml(href)}" style="text-decoration:none;">${img}</a>`;
      }
      return img;
    }

    case "button": {
      const href = node.attrs?.href ?? node.attrs?.url;
      const label =
        typeof node.attrs?.label === "string"
          ? escapeHtml(node.attrs.label)
          : renderInline(node.content) || "Meer lezen";
      const btnAlign = node.attrs?.alignment ?? node.attrs?.align ?? "left";
      const alignStyle =
        btnAlign === "center"
          ? "text-align:center"
          : btnAlign === "right"
            ? "text-align:right"
            : "text-align:left";
      const btnStyles = [
        "display:inline-block",
        `background:${COLORS.buttonBg}`,
        `color:${COLORS.buttonFg}`,
        "text-decoration:none",
        "padding:12px 18px",
        `font-family:${FONT_BODY}`,
        "font-size:15px",
        "font-weight:600",
        inlineStyle,
      ];
      if (!isSafeHttpUrl(href)) {
        return `<p${styleAttr(["margin:0 0 16px", `color:${COLORS.muted}`, alignStyle])}>${label.replace(/<[^>]+>/g, "")}</p>`;
      }
      return `<p${styleAttr(["margin:0 0 20px", alignStyle])}><a href="${escapeHtml(String(href))}"${styleAttr(btnStyles)}>${label}</a></p>`;
    }

    case "spacer": {
      const height = Number(node.attrs?.height ?? 24);
      const safeHeight = Number.isFinite(height)
        ? Math.min(Math.max(height, 8), 96)
        : 24;
      return `<div style="height:${safeHeight}px;line-height:${safeHeight}px;font-size:1px;">&nbsp;</div>`;
    }

    case "section": {
      const styles = [
        "margin:0 0 16px",
        "width:100%",
        align,
        inlineStyle,
      ];
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"${styleAttr(styles)}><tr><td>${renderBlockChildren(node.content)}</td></tr></table>`;
    }

    case "twoColumns":
    case "threeColumns":
    case "fourColumns":
      return renderColumns(node);

    case "columnsColumn":
      return renderBlockChildren(node.content);

    case "table": {
      const styles = [
        "margin:0 0 16px",
        "border-collapse:collapse",
        "width:100%",
        inlineStyle,
      ];
      return `<table role="table" width="100%" cellpadding="0" cellspacing="0"${styleAttr(styles)}>${renderBlockChildren(node.content)}</table>`;
    }

    case "tableRow":
      return `<tr>${renderBlockChildren(node.content)}</tr>`;

    case "tableHeader": {
      const styles = [
        "padding:8px 10px",
        `border:1px solid ${COLORS.border}`,
        `background:${COLORS.bg}`,
        `color:${COLORS.ink}`,
        `font-family:${FONT_BODY}`,
        "font-size:14px",
        "font-weight:700",
        "text-align:left",
        "vertical-align:top",
        align,
        inlineStyle,
      ];
      return `<th${styleAttr(styles)}>${renderBlockChildren(node.content) || "&nbsp;"}</th>`;
    }

    case "tableCell": {
      const styles = [
        "padding:8px 10px",
        `border:1px solid ${COLORS.border}`,
        `color:${COLORS.ink}`,
        `font-family:${FONT_BODY}`,
        "font-size:14px",
        "vertical-align:top",
        align,
        inlineStyle,
      ];
      return `<td${styleAttr(styles)}>${renderBlockChildren(node.content) || "&nbsp;"}</td>`;
    }

    default:
      if (node.content?.length) {
        return renderBlockChildren(node.content);
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
    case "globalContent":
    case "previewText":
    case "spacer":
      return "";
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
    case "blockquote":
      return `${(node.content ?? []).map(nodeToText).join("")}\n`;
    case "codeBlock":
      return `${(node.content ?? []).map(nodeToText).join("")}\n\n`;
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
      const alt =
        typeof node.attrs?.alt === "string" ? node.attrs.alt : "Afbeelding";
      const src = node.attrs?.src;
      return isSafeHttpUrl(src) ? `[${alt}](${src})\n\n` : `[${alt}]\n\n`;
    }
    case "twoColumns":
    case "threeColumns":
    case "fourColumns":
      return (node.content ?? [])
        .map((col) => nodeToText(col).trim())
        .filter(Boolean)
        .join("\n\n")
        .concat("\n\n");
    case "table":
      return (node.content ?? [])
        .map((row) =>
          (row.content ?? [])
            .map((cell) => nodeToText(cell).trim().replace(/\n+/g, " "))
            .join(" | "),
        )
        .join("\n")
        .concat("\n\n");
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
  const sanitized = JSON.parse(
    sanitizeEditorDocumentJson(JSON.stringify(parsed)),
  ) as TipTapNode;
  if (sanitized.type !== "doc") {
    throw new Error("Editor-document mist type 'doc'.");
  }
  return sanitized;
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
    <td style="padding-top:20px;font-family:${FONT_BODY};font-size:13px;line-height:1.5;color:${COLORS.muted};">
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

function isOwnNewsArticleUrl(href: string, siteUrl: string): boolean {
  try {
    const link = new URL(href);
    const site = new URL(siteUrl);
    if (link.origin !== site.origin) {
      return false;
    }
    return /^\/nieuws\/[a-z0-9]+(?:-[a-z0-9]+)*\/?$/u.test(link.pathname);
  } catch {
    return false;
  }
}

/**
 * Append opaque campaign analytics id + UTM params to own-domain article links.
 * Never logs recipient identity; `cid` is the send analyticsId only.
 */
export function withCampaignAnalyticsLinks(
  value: string,
  args: { siteUrl: string; campaignAnalyticsId: string },
): string {
  const cid = args.campaignAnalyticsId.trim();
  if (!cid || !/^[a-zA-Z0-9_-]{1,64}$/u.test(cid)) {
    return value;
  }

  return value.replace(
    /https?:\/\/[^\s"'<>]+/giu,
    (match) => {
      if (!isOwnNewsArticleUrl(match, args.siteUrl)) {
        return match;
      }
      try {
        const url = new URL(match);
        url.searchParams.set("cid", cid);
        if (!url.searchParams.has("utm_source")) {
          url.searchParams.set("utm_source", "newsletter");
        }
        if (!url.searchParams.has("utm_medium")) {
          url.searchParams.set("utm_medium", "email");
        }
        return url.toString();
      } catch {
        return match;
      }
    },
  );
}

export function renderCampaignEmail(args: {
  documentJson: string;
  subject: string;
  preheader?: string;
  links: ComplianceLinks;
  includeFooter?: boolean;
  campaignAnalyticsId?: string;
}): RenderedEmail {
  const doc = parseEditorDocument(args.documentJson);
  const bodyHtml = renderNode(doc);
  const includeFooter = args.includeFooter !== false;
  const footerHtml = includeFooter ? renderComplianceFooter(args.links) : "";
  const preheader = args.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(args.preheader)}</div>`
    : "";

  let html = `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no" />
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
  let text = includeFooter
    ? `${textBody}\n\n${renderComplianceFooterText(args.links)}`
    : textBody;

  if (args.campaignAnalyticsId) {
    html = withCampaignAnalyticsLinks(html, {
      siteUrl: args.links.siteUrl,
      campaignAnalyticsId: args.campaignAnalyticsId,
    });
    text = withCampaignAnalyticsLinks(text, {
      siteUrl: args.links.siteUrl,
      campaignAnalyticsId: args.campaignAnalyticsId,
    });
  }

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
