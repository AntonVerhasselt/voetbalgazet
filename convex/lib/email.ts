const MAX_EMAIL_LENGTH = 254;
const SIMPLE_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

export function normalizeAndValidateEmail(email: string): string {
  const normalizedEmail = email.normalize("NFKC").trim().toLowerCase();

  if (
    normalizedEmail.length === 0 ||
    normalizedEmail.length > MAX_EMAIL_LENGTH ||
    !SIMPLE_EMAIL_PATTERN.test(normalizedEmail)
  ) {
    throw new Error("Vul een geldig e-mailadres in.");
  }

  return normalizedEmail;
}
