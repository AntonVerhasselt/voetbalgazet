"use client";

import posthog from "posthog-js";

type SafeEventProperties = Record<
  string,
  boolean | number | string | null | undefined
>;

type PublicEventName =
  | "article_body_unlocked"
  | "article_lead_reached"
  | "article_read_depth_reached"
  | "article_share_clicked"
  | "article_viewed"
  | "auth_session_check_completed"
  | "division_selected"
  | "favorite_team_selected"
  | "gate_email_rejected"
  | "gate_email_started"
  | "gate_email_submitted"
  | "gate_impression"
  | "newsletter_article_link_opened"
  | "newsletter_resubscribed"
  | "newsletter_unsubscribed"
  | "preferences_step_viewed"
  | "preferences_updated"
  | "preferences_viewed"
  | "public_page_viewed"
  | "subscription_failed"
  | "subscription_submitted"
  | "subscription_succeeded"
  | "team_search_used";

let initialized = false;

function initializePostHog(): boolean {
  if (initialized) {
    return true;
  }
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim();
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim();
  if (!key || !host || typeof window === "undefined") {
    return false;
  }

  posthog.init(key, {
    api_host: host,
    persistence: "memory",
    autocapture: false,
    capture_pageview: false,
    capture_pageleave: false,
    disable_session_recording: true,
    person_profiles: "never",
  });
  initialized = true;
  return true;
}

export function capturePublicEvent(
  event: PublicEventName,
  properties: SafeEventProperties = {},
): void {
  if (!initializePostHog()) {
    return;
  }
  posthog.capture(event, {
    ...properties,
    version: 1,
  });
}
