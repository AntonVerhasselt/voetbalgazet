"use client";

import { useEffect } from "react";
import {
  isTextEntryElement,
  scrollFieldIntoView,
  syncVisualViewportCssVars,
} from "@/lib/keyboard-focus";

/**
 * Keeps focused text fields visible above the soft keyboard app-wide.
 * Also syncs --vv-* / --keyboard-inset CSS vars for fixed overlays.
 */
export function KeyboardFocusGuard() {
  useEffect(() => {
    let focusedField: HTMLElement | null = null;
    const scrollTimers = new Set<number>();
    let blurTimer: number | null = null;

    function clearScrollTimers(): void {
      for (const timer of scrollTimers) {
        window.clearTimeout(timer);
      }
      scrollTimers.clear();
    }

    function scheduleScrollIntoView(delayMs = 50): void {
      if (!focusedField) {
        return;
      }
      const field = focusedField;
      const timer = window.setTimeout(() => {
        scrollTimers.delete(timer);
        if (focusedField === field && document.activeElement === field) {
          scrollFieldIntoView(field);
        }
      }, delayMs);
      scrollTimers.add(timer);
    }

    function onFocusIn(event: FocusEvent): void {
      if (blurTimer !== null) {
        window.clearTimeout(blurTimer);
        blurTimer = null;
      }
      const target = event.target;
      if (!isTextEntryElement(target)) {
        return;
      }
      // Skip honeypots and other aria-hidden decoys.
      if (target.closest('[aria-hidden="true"]')) {
        return;
      }
      clearScrollTimers();
      focusedField = target;
      // Immediate pass, then again after the keyboard typically finishes opening.
      scheduleScrollIntoView(16);
      scheduleScrollIntoView(280);
    }

    function onFocusOut(): void {
      blurTimer = window.setTimeout(() => {
        blurTimer = null;
        if (!isTextEntryElement(document.activeElement)) {
          focusedField = null;
          clearScrollTimers();
        }
      }, 0);
    }

    function onViewportChange(): void {
      syncVisualViewportCssVars();
      // Keyboard open/close often fires after focus; re-scroll while focused.
      scheduleScrollIntoView(80);
    }

    syncVisualViewportCssVars();

    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);

    const vv = window.visualViewport;
    vv?.addEventListener("resize", onViewportChange);
    vv?.addEventListener("scroll", onViewportChange);
    window.addEventListener("resize", onViewportChange);

    return () => {
      clearScrollTimers();
      if (blurTimer !== null) {
        window.clearTimeout(blurTimer);
      }
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      vv?.removeEventListener("resize", onViewportChange);
      vv?.removeEventListener("scroll", onViewportChange);
      window.removeEventListener("resize", onViewportChange);
    };
  }, []);

  return null;
}
