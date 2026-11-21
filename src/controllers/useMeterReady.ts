import { useEffect, useState } from "react";

/**
 * Delays meter fill activation by one painted frame so CSS width/height
 * transitions sweep smoothly from 0% to their target percentage on mount
 * or when a view becomes active, while respecting reduced-motion settings.
 */
export function useMeterReady(active = true): boolean {
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);

  const [prevActive, setPrevActive] = useState<boolean>(active);
  const [ready, setReady] = useState<boolean>(() => active && prefersReducedMotion);

  if (active !== prevActive) {
    setPrevActive(active);
    setReady(active && prefersReducedMotion);
  }

  useEffect(() => {
    if (!active || ready) return undefined;

    let raf2 = 0;
    const raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(() => {
        setReady(true);
      });
    });

    return () => {
      window.cancelAnimationFrame(raf1);
      if (raf2) window.cancelAnimationFrame(raf2);
    };
  }, [active, ready]);

  return ready;
}
