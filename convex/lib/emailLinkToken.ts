export type EmailLinkPurpose = "unsubscribe";

export type EmailLinkPayload = {
  email: string;
  purpose: EmailLinkPurpose;
  expiresAt: number;
};

function emailLinkSecret(): string {
  const secret = process.env.BETTER_AUTH_SECRET?.trim();
  if (secret) {
    return secret;
  }
  // Local anonymous Convex agent deployments may omit Better Auth secrets.
  return "local-email-link-dev-only";
}

function decodeBase64Url(value: string): string {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/");
  const padLength = (4 - (padded.length % 4)) % 4;
  return atob(padded + "=".repeat(padLength));
}

function decodePayload(encoded: string): EmailLinkPayload | null {
  try {
    const parsed = JSON.parse(decodeBase64Url(encoded)) as Partial<EmailLinkPayload>;
    if (
      typeof parsed.email !== "string" ||
      parsed.purpose !== "unsubscribe" ||
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

function base64UrlToBytes(value: string): Uint8Array | null {
  try {
    const binary = decodeBase64Url(value);
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  } catch {
    return null;
  }
}

function timingSafeEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) {
    return false;
  }
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left[index]! ^ right[index]!;
  }
  return diff === 0;
}

async function signature(payload: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(emailLinkSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signed = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload),
  );
  return new Uint8Array(signed);
}

export async function verifyUnsubscribeToken(
  token: string,
  now = Date.now(),
): Promise<EmailLinkPayload | null> {
  const [encoded, providedSignature, extra] = token.split(".");
  if (!encoded || !providedSignature || extra) {
    return null;
  }
  const expected = await signature(encoded);
  const provided = base64UrlToBytes(providedSignature);
  if (!provided || !timingSafeEqual(expected, provided)) {
    return null;
  }
  const payload = decodePayload(encoded);
  if (!payload || payload.expiresAt < now) {
    return null;
  }
  return payload;
}
