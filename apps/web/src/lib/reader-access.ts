export function hasReaderAccess(user: unknown): boolean {
  if (!user || typeof user !== "object") {
    return false;
  }
  const flags = user as {
    isAnonymous?: unknown;
    emailVerified?: unknown;
  };
  return flags.isAnonymous === true || flags.emailVerified === true;
}
