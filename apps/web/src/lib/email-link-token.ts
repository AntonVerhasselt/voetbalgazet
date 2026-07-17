const OPAQUE_EMAIL_LINK_TOKEN_PATTERN = /^[A-Za-z0-9_-]{32,128}$/u;

export function isPlausibleEmailLinkToken(token: string): boolean {
  return OPAQUE_EMAIL_LINK_TOKEN_PATTERN.test(token);
}
