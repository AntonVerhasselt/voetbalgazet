import { createHmac, timingSafeEqual } from "node:crypto";

export const PREVIEW_COOKIE = "vg_keystatic_preview";
const PREVIEW_TTL_SECONDS = 15 * 60;

export type PreviewSession = {
  branch: string;
  target: string;
  expiresAt: number;
};

function previewSecret(): string {
  const secret = process.env.KEYSTATIC_SECRET?.trim();
  if (secret) {
    return secret;
  }
  if (process.env.NODE_ENV !== "production") {
    return "local-keystatic-preview-only";
  }
  throw new Error("KEYSTATIC_SECRET ontbreekt voor beveiligde draftpreview.");
}

function signature(payload: string): Buffer {
  return createHmac("sha256", previewSecret()).update(payload).digest();
}

export function isAllowedPreviewBranch(branch: string): boolean {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._/-]{0,119}$/u.test(branch)) {
    return false;
  }
  if (branch.includes("..") || branch.includes("//")) {
    return false;
  }
  const prefixes = (
    process.env.KEYSTATIC_PREVIEW_BRANCH_PREFIXES ??
    "master,main,content/,cursor/"
  )
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return prefixes.some(
    (prefix) => branch === prefix || branch.startsWith(prefix),
  );
}

export function isAllowedPreviewTarget(target: string): boolean {
  return /^\/nieuws\/[a-z0-9]+(?:-[a-z0-9]+)*(?:\?.*)?$/u.test(target);
}

export function isSameOriginRequest(request: Request): boolean {
  const requestUrl = new URL(request.url);
  const origin = request.headers.get("origin");
  if (origin) {
    return origin === requestUrl.origin;
  }
  const referer = request.headers.get("referer");
  if (!referer) {
    return false;
  }
  try {
    return new URL(referer).origin === requestUrl.origin;
  } catch {
    return false;
  }
}

export function createPreviewToken(
  branch: string,
  target: string,
  now = Date.now(),
): string {
  if (!isAllowedPreviewBranch(branch) || !isAllowedPreviewTarget(target)) {
    throw new Error("Ongeldige previewbestemming.");
  }
  const session: PreviewSession = {
    branch,
    target,
    expiresAt: now + PREVIEW_TTL_SECONDS * 1000,
  };
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${payload}.${signature(payload).toString("base64url")}`;
}

function isPreviewSession(value: unknown): value is PreviewSession {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.branch === "string" &&
    typeof candidate.target === "string" &&
    typeof candidate.expiresAt === "number"
  );
}

export function verifyPreviewToken(
  token: string,
  now = Date.now(),
): PreviewSession | null {
  const [payload, providedSignature, extra] = token.split(".");
  if (!payload || !providedSignature || extra !== undefined) {
    return null;
  }
  const expected = signature(payload);
  let provided: Buffer;
  try {
    provided = Buffer.from(providedSignature, "base64url");
  } catch {
    return null;
  }
  if (
    provided.length !== expected.length ||
    !timingSafeEqual(provided, expected)
  ) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    );
    if (
      !isPreviewSession(parsed) ||
      parsed.expiresAt <= now ||
      !isAllowedPreviewBranch(parsed.branch) ||
      !isAllowedPreviewTarget(parsed.target)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
