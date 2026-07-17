export type EmailLinkPurpose =
  | "newsletter_unsubscribe"
  | "article_access"
  | "preferences_access";

export const UNSUBSCRIBE_TTL_MS = 1000 * 60 * 60 * 24 * 730; // ~2 years
export const ARTICLE_ACCESS_TTL_MS = 1000 * 60 * 60 * 24 * 30;
export const PREFERENCES_ACCESS_TTL_MS = 1000 * 60 * 60 * 24;

export function ttlForEmailLinkPurpose(purpose: EmailLinkPurpose): number {
  switch (purpose) {
    case "newsletter_unsubscribe":
      return UNSUBSCRIBE_TTL_MS;
    case "article_access":
      return ARTICLE_ACCESS_TTL_MS;
    case "preferences_access":
      return PREFERENCES_ACCESS_TTL_MS;
  }
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

export function generateOpaqueToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export async function verifyTokenHash(
  token: string,
  expectedHash: string,
): Promise<boolean> {
  return (await hashToken(token)) === expectedHash;
}
