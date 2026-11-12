import { useEffect, useRef, useState } from "react";

export interface CountUpProps {
  end: number;
  start?: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  triggerOnce?: boolean;
  threshold?: number;
}

export default function CountUp({
  end,
  start = 0,
  duration = 1600,
  decimals = 0,
  prefix = "",
  suffix = "",
  className = "",
  triggerOnce = true,
  threshold = 0.15,
}: CountUpProps) {
  const [displayValue, setDisplayValue] = useState<number>(start);
  const elementRef = useRef<HTMLSpanElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const displayValueRef = useRef<number>(start);
  const hasAnimatedRef = useRef<boolean>(false);

  useEffect(() => {
    const el = elementRef.current;
    if (!el) return undefined;

    const animateTo = (from: number, to: number) => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }

      let startTime: number | null = null;
      const diff = to - from;

      const animate = (currentTime: number) => {
        if (startTime === null) startTime = currentTime;
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Standard ease-out cubic curve: fast start, soft organic deceleration
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const currentVal = from + diff * easeOut;

        displayValueRef.current = currentVal;
        setDisplayValue(currentVal);

        if (progress < 1) {
          animFrameRef.current = requestAnimationFrame(animate);
        } else {
          displayValueRef.current = to;
          setDisplayValue(to);
          animFrameRef.current = null;
        }
      };

      animFrameRef.current = requestAnimationFrame(animate);
    };

    // Check for reduced motion preference
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      // Fallback for reduced motion / older environments without IntersectionObserver
      displayValueRef.current = end;
      setDisplayValue(end);
      hasAnimatedRef.current = true;
      return undefined;
    }

    // Once revealed, subsequent value changes animate from the currently
    // displayed number instead of waiting for another intersection.
    if (hasAnimatedRef.current) {
      animateTo(displayValueRef.current, end);
      return () => {
        if (animFrameRef.current !== null) {
          cancelAnimationFrame(animFrameRef.current);
        }
      };
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateTo(start, end);
            hasAnimatedRef.current = true;

            if (triggerOnce) {
              observer.unobserve(el);
            }
          }
        });
      },
      {
        threshold,
        rootMargin: "0px 0px -30px 0px",
      }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [end, start, duration, triggerOnce, threshold]);

  const formattedNumber =
    decimals > 0
      ? displayValue.toFixed(decimals)
      : Math.round(displayValue).toString();

  return (
    <span
      ref={elementRef}
      className={`qb-countup tabular-nums ${className}`.trim()}
      style={{ fontVariantNumeric: "tabular-nums" }}
    >
      {prefix}
      {formattedNumber}
      {suffix}
    </span>
  );
}
