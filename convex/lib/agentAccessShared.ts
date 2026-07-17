/** Fixed agent identity — not configurable via env. */
export const AGENT_EMAIL = "cursor-agent@agents.devoetbalgazet.local";

export const AGENT_DISPLAY_NAME = "Cursor Agent";

/** Minimum length for AGENT_ACCESS_SECRET. Shorter or unset → door closed. */
export const AGENT_ACCESS_SECRET_MIN_LENGTH = 32;

const PASSWORD_DERIVATION_INFO = "devoetbalgazet-agent-access-v1";

export function readConfiguredAgentAccessSecret(
  value: string | undefined,
): string | null {
  const secret = value?.trim() ?? "";
  if (secret.length < AGENT_ACCESS_SECRET_MIN_LENGTH) {
    return null;
  }
  return secret;
}

/** Constant-time string equality for secrets (UTF-8 bytes). */
export function secretsEqual(left: string, right: string): boolean {
  const encoder = new TextEncoder();
  const a = encoder.encode(left);
  const b = encoder.encode(right);
  if (a.length !== b.length) {
    let diff = a.length ^ b.length;
    const longest = a.length > b.length ? a : b;
    for (let i = 0; i < longest.length; i += 1) {
      diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
    }
    return diff === 0 && a.length === b.length;
  }
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a[i]! ^ b[i]!;
  }
  return mismatch === 0;
}

function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  const base64 =
    typeof btoa === "function"
      ? btoa(binary)
      : Buffer.from(bytes).toString("base64");
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/u, "");
}

/**
 * Derive the Better Auth credential password from AGENT_ACCESS_SECRET.
 * Never store this as a separate env var.
 */
export async function deriveAgentPassword(secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(PASSWORD_DERIVATION_INFO),
  );
  return bufferToBase64Url(signature);
}

export async function hashIpAddress(ip: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(ip),
  );
  return bufferToBase64Url(digest);
}
