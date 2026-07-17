"use client";

import { useEffect, useRef } from "react";
import { capturePublicEvent } from "@/lib/analytics";

export function UnsubscribeAnalytics() {
  const captured = useRef(false);

  useEffect(() => {
    if (captured.current) {
      return;
    }
    captured.current = true;
    capturePublicEvent("newsletter_unsubscribed", {});
  }, []);

  return null;
}
