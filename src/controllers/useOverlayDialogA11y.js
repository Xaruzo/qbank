import { useEffect, useRef } from "react";

/**
 * Shared a11y behavior for temporary overlay dialogs (nav drawers).
 *
 * While `open` is true:
 * - moves focus into the dialog (first focusable button) when it opens,
 * - traps Tab / Shift+Tab so keyboard focus cannot wander into the
 *   content behind the scrim,
 * - calls `onClose` on Escape,
 * - restores focus to the element that had focus before opening when
 *   the dialog closes (typically the header hamburger button).
 *
 * `onClose` is read through a ref so callers can pass an inline arrow
 * function without the effect re-running (and re-focusing) on every
 * parent render.
 *
 * @param {boolean} open     Whether the overlay dialog is currently shown.
 * @param {Function} onClose Close callback (Escape).
 * @param {import("react").RefObject<HTMLElement>} cardRef Ref of the dialog element.
 */
export function useOverlayDialogA11y(open, onClose, cardRef) {
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return undefined;

    const card = cardRef.current;
    const previouslyFocused = document.activeElement;
    const focusables = card ? Array.from(card.querySelectorAll("button")) : [];
    if (focusables.length) focusables[0].focus();

    const handleKey = (e) => {
      if (e.key === "Escape") {
        if (onCloseRef.current) onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !focusables.length) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const current = document.activeElement;
      const outsideCard = !card || !card.contains(current);

      if (e.shiftKey && (current === first || outsideCard)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (current === last || outsideCard)) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      if (previouslyFocused && typeof previouslyFocused.focus === "function") {
        previouslyFocused.focus();
      }
    };
  }, [open, cardRef]);
}
