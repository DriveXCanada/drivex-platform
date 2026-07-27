"use client";

import { useEffect } from "react";

const MESSAGE =
  "You have unsaved work on this page. If you leave now it will be lost — go back and Submit/Confirm first.";

/**
 * Warns the user before they leave a page while `dirty` is true. Covers:
 *  - closing the tab, refreshing, or navigating to another site (browser
 *    "Leave site?" dialog via beforeunload)
 *  - clicking an in-app link (intercepted with a confirm() prompt, since the
 *    App Router does client-side navigation that beforeunload doesn't catch)
 *
 * Pass `true` only while there is genuinely un-submitted work.
 */
export function useUnsavedWarning(dirty: boolean): void {
  useEffect(() => {
    if (!dirty) return;

    const beforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Required for the prompt to show in some browsers.
      e.returnValue = MESSAGE;
      return MESSAGE;
    };
    window.addEventListener("beforeunload", beforeUnload);

    // Intercept clicks on internal links (Next.js <Link> renders an <a>).
    const onClickCapture = (e: MouseEvent) => {
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      )
        return;
      const anchor = (e.target as HTMLElement | null)?.closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (
        !href ||
        href.startsWith("#") ||
        anchor.target === "_blank" ||
        anchor.hasAttribute("download")
      )
        return;

      let url: URL;
      try {
        url = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }
      // Other sites are handled by the beforeunload dialog.
      if (url.origin !== window.location.origin) return;
      // Staying on the exact same page — nothing to warn about.
      if (
        url.pathname === window.location.pathname &&
        url.search === window.location.search
      )
        return;

      if (!window.confirm(MESSAGE)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    document.addEventListener("click", onClickCapture, true);

    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", onClickCapture, true);
    };
  }, [dirty]);
}
