/**
 * Map Resend (and legacy) bounce payloads to hard-bounce suppression.
 *
 * Resend `email.bounced` uses bounce.type `Permanent` | `Temporary` | `Undetermined`
 * (not the string "hard"). Soft issues often arrive as `email.delivery_delayed` instead.
 */
export function isHardBounceEvent(
  eventType: string,
  bounceType?: string | null,
  bounceSubType?: string | null,
): boolean {
  if (eventType !== "email.bounced") {
    return false;
  }
  const type = (bounceType ?? "").trim().toLowerCase();
  const subType = (bounceSubType ?? "").trim().toLowerCase();
  if (type === "temporary" || type === "transient") {
    return false;
  }
  return (
    type === "permanent" ||
    type === "undetermined" ||
    type === "" ||
    type.includes("hard") ||
    subType.includes("hard")
  );
}
