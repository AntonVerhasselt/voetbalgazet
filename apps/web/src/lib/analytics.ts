"use client";

import posthog from "posthog-js";

export type SafeEventProperties = Record<
  string,
  boolean | number | string | null | undefined
>;

export const FEATURE_FLAGS = {
  articleShareActions: "article_share_actions",
  homepageSecondaryLayout: "homepage_secondary_layout",
} as const;

const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
] as const;

type AdminEventName =
  | "newsletter_campaign_send_confirmed"
  | "newsletter_campaign_scheduled"
  | "newsletter_failed_recipients_recovered"
  | "newsletter_kill_switch_toggled";

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
    // Request that PostHog not store IP when the project allows this option.
    ip: false,
    capture_exceptions: true,
    capture_performance: true,
  });
  initialized = true;
  return true;
}

export function getPostHog(): typeof posthog | null {
  if (!initializePostHog()) {
    return null;
  }
  return posthog;
}

export function capturePublicEvent(
  event: string,
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

export function captureAdminEvent(
  event: AdminEventName,
  properties: SafeEventProperties = {},
): void {
  if (!initializePostHog()) {
    return;
  }
  posthog.capture(event, {
    ...properties,
    surface: "admin",
    version: 1,
  });
}

export function capturePublicException(
  error: unknown,
  properties: SafeEventProperties = {},
): void {
  if (!initializePostHog()) {
    return;
  }
  posthog.captureException(error, {
    ...properties,
    version: 1,
  });
}

export function isFeatureEnabled(flag: string): boolean | undefined {
  if (!initializePostHog()) {
    return undefined;
  }
  return posthog.isFeatureEnabled(flag);
}

export function referrerDomain(referrer = document.referrer): string | null {
  if (!referrer) {
    return null;
  }
  try {
    return new URL(referrer).hostname || null;
  } catch {
    return null;
  }
}

export function deviceType(): "mobile" | "tablet" | "desktop" {
  if (typeof window === "undefined") {
    return "desktop";
  }
  const width = window.innerWidth;
  if (width < 768) {
    return "mobile";
  }
  if (width < 1024) {
    return "tablet";
  }
  return "desktop";
}

export function utmProperties(
  search = typeof window === "undefined" ? "" : window.location.search,
): SafeEventProperties {
  const params = new URLSearchParams(search);
  const props: SafeEventProperties = {};
  for (const key of UTM_KEYS) {
    const value = params.get(key)?.trim();
    if (value) {
      props[key] = value.slice(0, 200);
    }
  }
  return props;
}

/** Opaque campaign analytics id from newsletter links (`cid`), never a Convex id. */
export function campaignAnalyticsId(
  search = typeof window === "undefined" ? "" : window.location.search,
): string | null {
  const value = new URLSearchParams(search).get("cid")?.trim();
  if (!value || value.length > 64 || !/^[a-zA-Z0-9_-]+$/u.test(value)) {
    return null;
  }
  return value;
}

export function stripSensitiveSearchParams(keys: string[]): void {
  if (typeof window === "undefined") {
    return;
  }
  const url = new URL(window.location.href);
  let changed = false;
  for (const key of keys) {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key);
      changed = true;
    }
  }
  if (changed) {
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }
}

export function bucketDurationMs(durationMs: number): string {
  if (durationMs < 100) return "0_100ms";
  if (durationMs < 300) return "100_300ms";
  if (durationMs < 1000) return "300_1000ms";
  if (durationMs < 3000) return "1_3s";
  return "3s_plus";
}
