import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface MobileScrollIndicatorProps {
  isDark: boolean;
}

const MOBILE_QUERY = "(max-width: 768px)";
const HIDE_DELAY_MS = 750;
const MIN_THUMB_HEIGHT = 28;
const TRACK_EDGE_PAD = 6;

const EXCLUDED_SELECTOR = [
  ".qb-select-menu",
  ".qb-select-menu-scroll",
  ".qb-reels-snap-feed",
  ".qb-no-scrollbar",
  ".qb-landing-subject-selector",
  ".draw-bar-row",
].join(", ");

function resolveScrollElement(target: EventTarget | null): HTMLElement | null {
  if (!target) return null;
  if (target === document || target === document.documentElement || target === document.body) {
    return (document.scrollingElement as HTMLElement | null) || document.documentElement;
  }
  return target instanceof HTMLElement ? target : null;
}

function isExcludedElement(el: HTMLElement): boolean {
  return Boolean(el.closest(EXCLUDED_SELECTOR));
}

export default function MobileScrollIndicator({ isDark }: MobileScrollIndicatorProps) {
  const [isMobileViewport, setIsMobileViewport] = useState(() =>
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia(MOBILE_QUERY).matches
      : false
  );
  const [isScrolling, setIsScrolling] = useState(false);

  const trackWrapRef = useRef<HTMLDivElement | null>(null);
  const activeElementRef = useRef<HTMLElement | null>(null);
  const hideTimerRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const isScrollingRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mql = window.matchMedia(MOBILE_QUERY);
    const handleChange = (e: MediaQueryListEvent) => {
      setIsMobileViewport(e.matches);
      if (!e.matches) {
        isScrollingRef.current = false;
        setIsScrolling(false);
      }
    };
    setIsMobileViewport(mql.matches);
    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    if (!isMobileViewport) return;

    const clearHideTimer = () => {
      if (hideTimerRef.current !== null) {
        window.clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    };

    const scheduleHide = () => {
      clearHideTimer();
      hideTimerRef.current = window.setTimeout(() => {
        isScrollingRef.current = false;
        setIsScrolling(false);
      }, HIDE_DELAY_MS);
    };

    const updateThumbPosition = () => {
      rafRef.current = null;
      const el = activeElementRef.current;
      const wrapEl = trackWrapRef.current;
      if (!el || !wrapEl) return;

      const isRootDoc =
        el === document.documentElement ||
        el === document.body ||
        el === document.scrollingElement;

      const scrollHeight = el.scrollHeight;
      const clientHeight = isRootDoc ? window.innerHeight : el.clientHeight;
      const maxScroll = scrollHeight - clientHeight;

      if (maxScroll <= 2) {
        clearHideTimer();
        if (isScrollingRef.current) {
          isScrollingRef.current = false;
          setIsScrolling(false);
        }
        return;
      }

      const rect = isRootDoc
        ? { top: 0, bottom: window.innerHeight, right: window.innerWidth }
        : el.getBoundingClientRect();

      const visibleTop = Math.max(0, rect.top) + TRACK_EDGE_PAD;
      const visibleBottom = Math.min(window.innerHeight, rect.bottom) - TRACK_EDGE_PAD;
      const trackHeight = Math.max(0, visibleBottom - visibleTop);

      if (trackHeight <= MIN_THUMB_HEIGHT) return;

      const scrollTop = isRootDoc ? window.scrollY || el.scrollTop : el.scrollTop;
      const progress = Math.min(1, Math.max(0, scrollTop / maxScroll));
      const thumbHeight = Math.min(
        trackHeight,
        Math.max(MIN_THUMB_HEIGHT, (clientHeight / scrollHeight) * trackHeight)
      );
      const thumbTop = visibleTop + progress * Math.max(0, trackHeight - thumbHeight);
      const rightInset = Math.max(2, window.innerWidth - rect.right + 3);

      wrapEl.style.height = `${thumbHeight.toFixed(1)}px`;
      wrapEl.style.right = `${rightInset.toFixed(1)}px`;
      wrapEl.style.transform = `translate3d(0, ${thumbTop.toFixed(1)}px, 0)`;

      if (!isScrollingRef.current) {
        isScrollingRef.current = true;
        setIsScrolling(true);
      }
      scheduleHide();
    };

    const handleScroll = (e: Event) => {
      const el = resolveScrollElement(e.target);
      if (!el || isExcludedElement(el)) return;

      const isRootDoc =
        el === document.documentElement ||
        el === document.body ||
        el === document.scrollingElement;
      const clientHeight = isRootDoc ? window.innerHeight : el.clientHeight;
      if (el.scrollHeight <= clientHeight + 2) return;

      activeElementRef.current = el;
      if (rafRef.current === null) {
        rafRef.current = window.requestAnimationFrame(updateThumbPosition);
      }
    };

    document.addEventListener("scroll", handleScroll, { passive: true, capture: true });
    return () => {
      document.removeEventListener("scroll", handleScroll, { capture: true });
      clearHideTimer();
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [isMobileViewport]);

  if (!isMobileViewport || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      ref={trackWrapRef}
      aria-hidden="true"
      className="pointer-events-none fixed top-0 right-[3px] z-[1100] h-8 w-[3.5px] will-change-transform"
    >
      <div
        className={`h-full w-full rounded-full origin-right transition-all ${
          isScrolling
            ? "opacity-100 scale-x-100 duration-100 ease-out"
            : "opacity-0 scale-x-75 duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
        } ${
          isDark
            ? "bg-amber-400/75 shadow-[0_0_6px_rgba(245,166,35,0.28)]"
            : "bg-slate-800/45 shadow-[0_0_4px_rgba(15,23,42,0.16)]"
        }`}
      />
    </div>,
    document.body
  );
}
