/** Shared helpers so focused form fields stay visible above the mobile keyboard. */

const TEXT_ENTRY_SELECTOR =
  'input:not([type="hidden"]):not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="checkbox"]):not([type="radio"]):not([type="file"]), textarea, select, [contenteditable="true"], [contenteditable=""]';

export function isTextEntryElement(element: EventTarget | null): element is HTMLElement {
  if (!(element instanceof HTMLElement)) {
    return false;
  }
  if (element.matches(TEXT_ENTRY_SELECTOR)) {
    return true;
  }
  return element.isContentEditable;
}

function isScrollable(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element);
  const overflowY = style.overflowY;
  if (
    overflowY !== "auto" &&
    overflowY !== "scroll" &&
    overflowY !== "overlay"
  ) {
    return false;
  }
  return element.scrollHeight > element.clientHeight + 1;
}

/** Nearest ancestor that can scroll vertically (or the document scrolling element). */
export function findScrollParent(element: HTMLElement): HTMLElement {
  let current: HTMLElement | null = element.parentElement;
  while (current) {
    if (isScrollable(current)) {
      return current;
    }
    current = current.parentElement;
  }
  return (document.scrollingElement as HTMLElement | null) ?? document.documentElement;
}

export type VisualViewportBox = {
  top: number;
  left: number;
  width: number;
  height: number;
  bottom: number;
};

export function getVisualViewportBox(): VisualViewportBox {
  const vv = window.visualViewport;
  if (!vv) {
    return {
      top: 0,
      left: 0,
      width: window.innerWidth,
      height: window.innerHeight,
      bottom: window.innerHeight,
    };
  }
  return {
    top: vv.offsetTop,
    left: vv.offsetLeft,
    width: vv.width,
    height: vv.height,
    bottom: vv.offsetTop + vv.height,
  };
}

/**
 * Publish visual-viewport metrics as CSS custom properties on :root so fixed
 * overlays (gate sheet, modals) can size themselves to the area above the keyboard.
 */
export function syncVisualViewportCssVars(
  root: HTMLElement = document.documentElement,
): VisualViewportBox {
  const box = getVisualViewportBox();
  const keyboardInset = Math.max(
    0,
    window.innerHeight - box.height - box.top,
  );

  root.style.setProperty("--vv-top", `${box.top}px`);
  root.style.setProperty("--vv-left", `${box.left}px`);
  root.style.setProperty("--vv-width", `${box.width}px`);
  root.style.setProperty("--vv-height", `${box.height}px`);
  root.style.setProperty("--keyboard-inset", `${keyboardInset}px`);

  return box;
}

const FOCUS_PADDING_PX = 20;

/**
 * Scroll a focused field into the visible visual viewport, preferring its
 * nearest scroll container (needed when document scroll is locked).
 */
export function scrollFieldIntoView(element: HTMLElement): void {
  if (!element.isConnected) {
    return;
  }

  const box = getVisualViewportBox();
  const rect = element.getBoundingClientRect();
  const visibleTop = box.top + FOCUS_PADDING_PX;
  const visibleBottom = box.bottom - FOCUS_PADDING_PX;

  if (rect.top >= visibleTop && rect.bottom <= visibleBottom) {
    return;
  }

  // Prefer scrolling the nearest overflow ancestor (e.g. .gate-sheet).
  const scrollParent = findScrollParent(element);
  const parentIsDocument =
    scrollParent === document.documentElement ||
    scrollParent === document.body ||
    scrollParent === document.scrollingElement;

  if (!parentIsDocument) {
    const parentRect = scrollParent.getBoundingClientRect();
    const parentVisibleTop = Math.max(parentRect.top, visibleTop);
    const parentVisibleBottom = Math.min(parentRect.bottom, visibleBottom);
    const fieldTopInParent =
      rect.top - parentRect.top + scrollParent.scrollTop;
    const targetTop =
      fieldTopInParent -
      (parentVisibleBottom - parentVisibleTop) / 2 +
      rect.height / 2;
    scrollParent.scrollTo({
      top: Math.max(0, targetTop),
      behavior: "smooth",
    });
  } else {
    element.scrollIntoView({
      block: "center",
      inline: "nearest",
      behavior: "smooth",
    });
  }

  // After layout/keyboard animation, nudge again if still clipped.
  window.requestAnimationFrame(() => {
    const nextRect = element.getBoundingClientRect();
    const nextBox = getVisualViewportBox();
    const nextTop = nextBox.top + FOCUS_PADDING_PX;
    const nextBottom = nextBox.bottom - FOCUS_PADDING_PX;

    if (nextRect.bottom <= nextBottom && nextRect.top >= nextTop) {
      return;
    }

    let delta = 0;
    if (nextRect.bottom > nextBottom) {
      delta = nextRect.bottom - nextBottom;
    } else if (nextRect.top < nextTop) {
      delta = nextRect.top - nextTop;
    }

    if (delta === 0) {
      return;
    }

    if (!parentIsDocument) {
      scrollParent.scrollBy({ top: delta, behavior: "smooth" });
    } else {
      window.scrollBy({ top: delta, behavior: "smooth" });
    }
  });
}
