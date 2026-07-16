"use client";

import posthog from "posthog-js";

type SafeEventProperties = Record<
  string,
  boolean | number | string | null | undefined
>;

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
