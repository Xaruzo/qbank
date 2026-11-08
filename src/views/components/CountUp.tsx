import React, { useEffect, useRef, useState } from "react";

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
  const [hasAnimated, setHasAnimated] = useState<boolean>(false);
  const elementRef = useRef<HTMLSpanElement>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const el = elementRef.current;
    if (!el) return undefined;

    // Check for reduced motion preference
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      setDisplayValue(end);
      setHasAnimated(true);
      return undefined;
    }

    if (!("IntersectionObserver" in window)) {
      // Fallback for older environments without IntersectionObserver
      setDisplayValue(end);
      setHasAnimated(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && (!hasAnimated || !triggerOnce)) {
            // Start the count-up animation
            let startTime: number | null = null;
            const diff = end - start;

            const animate = (currentTime: number) => {
              if (startTime === null) startTime = currentTime;
              const elapsed = currentTime - startTime;
              const progress = Math.min(elapsed / duration, 1);

              // Standard ease-out cubic curve: fast start, soft organic deceleration
              const easeOut = 1 - Math.pow(1 - progress, 3);
              const currentVal = start + diff * easeOut;

              setDisplayValue(currentVal);

              if (progress < 1) {
                animFrameRef.current = requestAnimationFrame(animate);
              } else {
                setDisplayValue(end);
                setHasAnimated(true);
              }
            };

            animFrameRef.current = requestAnimationFrame(animate);

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
  }, [end, start, duration, triggerOnce, threshold, hasAnimated]);

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
