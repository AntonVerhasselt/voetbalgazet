import { components, internal } from "../_generated/api";
import { Resend } from "@convex-dev/resend";

export const resend: Resend = new Resend(components.resend, {
  onEmailEvent: internal.subscribers.handleEmailEvent,
  testMode: true,
});

export const FROM_ADDRESS =
  process.env.RESEND_FROM_ADDRESS ?? "De Voetbalgazet <newsletter@voetbalgazet.be>";
