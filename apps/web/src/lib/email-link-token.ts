import { createHmac, timingSafeEqual } from "node:crypto";

/** Purpose-bound email tokens. Only newsletter unsubscribe — never site access. */
export type EmailLinkPurpose = "newsletter_unsubscribe";

export type EmailLinkPayload = {
  email: string;
  purpose: EmailLinkPurpose;
  expiresAt: number;
};

const DEFAULT_UNSUBSCRIBE_TTL_MS = 1000 * 60 * 60 * 24 * 730; // ~2 years

function emailLinkSecret(): string {
  const secret = process.env.BETTER_AUTH_SECRET?.trim();
  if (secret) {
    return secret;
  }
  if (process.env.NODE_ENV !== "production") {
    return "local-email-link-dev-only";
  }
  throw new Error("BETTER_AUTH_SECRET ontbreekt voor e-maillinks.");
}

function signature(payload: string): Buffer {
  return createHmac("sha256", emailLinkSecret()).update(payload).digest();
}

function encodePayload(payload: EmailLinkPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decodePayload(encoded: string): EmailLinkPayload | null {
  try {
    const parsed = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as Partial<EmailLinkPayload>;
    if (
      typeof parsed.email !== "string" ||
      parsed.purpose !== "newsletter_unsubscribe" ||
      typeof parsed.expiresAt !== "number"
    ) {
      return null;
    }
    return {
      email: parsed.email,
      purpose: parsed.purpose,
      expiresAt: parsed.expiresAt,
    };
  } catch {
    return null;
  }
}

/** Mint a newsletter-only unsubscribe token (Phase 4 campaign footer). */
export function createUnsubscribeToken(
  email: string,
  now = Date.now(),
  ttlMs = DEFAULT_UNSUBSCRIBE_TTL_MS,
): string {
  const payload: EmailLinkPayload = {
    email: email.normalize("NFKC").trim().toLowerCase(),
    purpose: "newsletter_unsubscribe",
    expiresAt: now + ttlMs,
  };
  const encoded = encodePayload(payload);
  const sig = signature(encoded).toString("base64url");
  return `${encoded}.${sig}`;
}

export function verifyUnsubscribeToken(
  token: string,
  now = Date.now(),
): EmailLinkPayload | null {
  const [encoded, providedSignature, extra] = token.split(".");
  if (!encoded || !providedSignature || extra) {
    return null;
  }
  const expected = signature(encoded);
  let provided: Buffer;
  try {
    provided = Buffer.from(providedSignature, "base64url");
  } catch {
    return null;
  }
  if (
    expected.length !== provided.length ||
    !timingSafeEqual(expected, provided)
  ) {
    return null;
  }
  const payload = decodePayload(encoded);
  if (!payload || payload.expiresAt < now) {
    return null;
  }
  return payload;
}
