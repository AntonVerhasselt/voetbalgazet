"use client";

import { useEffect } from "react";
import { capturePublicEvent } from "@/lib/analytics";

export function UnsubscribeAnalytics({
  status,
}: {
  status: string | undefined;
}) {
  useEffect(() => {
    if (status === "bevestigd") {
      capturePublicEvent("newsletter_unsubscribed", {
        reason_code: "confirmed",
      });
    }
  }, [status]);

  return null;
}
