"use client";

import { useEffect, useRef } from "react";
import { capturePublicEvent, deviceType } from "@/lib/analytics";

function ratingFor(
  metric: string,
  value: number,
): "good" | "needs_improvement" | "poor" {
  if (metric === "LCP") {
    if (value <= 2500) return "good";
    if (value <= 4000) return "needs_improvement";
    return "poor";
  }
  if (metric === "INP" || metric === "FID") {
    if (value <= 200) return "good";
    if (value <= 500) return "needs_improvement";
    return "poor";
  }
  if (metric === "CLS") {
    if (value <= 0.1) return "good";
    if (value <= 0.25) return "needs_improvement";
    return "poor";
  }
  return "needs_improvement";
}

function valueBucket(metric: string, value: number): string {
  if (metric === "CLS") {
    if (value <= 0.1) return "0_0.1";
    if (value <= 0.25) return "0.1_0.25";
    return "0.25_plus";
  }
  if (value < 1000) return "0_1s";
  if (value < 2500) return "1_2.5s";
  if (value < 4000) return "2.5_4s";
  return "4s_plus";
}

export function WebVitalsReporter({ pageType }: { pageType: string }) {
  const reported = useRef(new Set<string>());

  useEffect(() => {
    if (typeof PerformanceObserver === "undefined") {
      return;
    }

    function report(metric: string, value: number): void {
      if (reported.current.has(metric)) {
        return;
      }
      reported.current.add(metric);
      capturePublicEvent("web_vital_measured", {
        metric,
        rating: ratingFor(metric, value),
        value_bucket: valueBucket(metric, value),
        page_type: pageType,
        device_type: deviceType(),
      });
    }

    const observers: PerformanceObserver[] = [];

    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const last = entries[entries.length - 1];
        if (last) {
          report("LCP", last.startTime);
        }
      });
      lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });
      observers.push(lcpObserver);
    } catch {
      // Unsupported entry type.
    }

    try {
      const clsObserver = new PerformanceObserver((list) => {
        let cls = 0;
        for (const entry of list.getEntries()) {
          const layoutShift = entry as PerformanceEntry & {
            hadRecentInput?: boolean;
            value?: number;
          };
          if (!layoutShift.hadRecentInput && typeof layoutShift.value === "number") {
            cls += layoutShift.value;
          }
        }
        report("CLS", cls);
      });
      clsObserver.observe({ type: "layout-shift", buffered: true });
      observers.push(clsObserver);
    } catch {
      // Unsupported entry type.
    }

    try {
      const inpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const last = entries[entries.length - 1] as PerformanceEntry & {
          duration?: number;
        };
        if (last && typeof last.duration === "number") {
          report("INP", last.duration);
        }
      });
      inpObserver.observe({ type: "event", buffered: true, durationThreshold: 16 } as PerformanceObserverInit);
      observers.push(inpObserver);
    } catch {
      // Unsupported entry type.
    }

    return () => {
      for (const observer of observers) {
        observer.disconnect();
      }
    };
  }, [pageType]);

  return null;
}
