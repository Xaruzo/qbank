import React, { useEffect, useRef, useState } from "react";

interface AppleHeroCanvasProps {
  className?: string;
  frameCount?: number;
  scrollTargetRef?: React.RefObject<HTMLElement | null>;
  isDark?: boolean;
}

const TOTAL_FRAMES = 30;

export default function AppleHeroCanvas({
  className = "qb-apple-hero-canvas",
  frameCount = TOTAL_FRAMES,
  scrollTargetRef,
  isDark = true,
}: AppleHeroCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const frameIndexRef = useRef<number>(0);
  const targetFrameRef = useRef<number>(0);
  const rafIdRef = useRef<number | null>(null);
  const isInViewRef = useRef<boolean>(true);
  const lastTimeRef = useRef<number>(0);
  const [firstFrameLoaded, setFirstFrameLoaded] = useState<boolean>(false);

  // Preload optimized WebP frames
  useEffect(() => {
    const loadedImages: HTMLImageElement[] = [];
    let isMounted = true;

    for (let i = 1; i <= frameCount; i++) {
      const img = new Image();
      const paddedIndex = String(i).padStart(3, "0");
      img.src = `/frames/frame_${paddedIndex}.webp`;

      if (i === 1) {
        img.onload = () => {
          if (isMounted) {
            setFirstFrameLoaded(true);
            drawFrame(0);
          }
        };
      }
      loadedImages.push(img);
    }
    imagesRef.current = loadedImages;

    return () => {
      isMounted = false;
    };
  }, [frameCount]);

  // Canvas drawing helper with object-fit: cover math
  const drawFrame = (index: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const clampedIndex = Math.min(Math.max(Math.floor(index), 0), frameCount - 1);
    const img = imagesRef.current[clampedIndex] || imagesRef.current[0];
    if (!img || !img.complete || img.naturalWidth === 0) return;

    const cw = canvas.width;
    const ch = canvas.height;
    ctx.clearRect(0, 0, cw, ch);

    // Cover math
    const imgRatio = img.naturalWidth / img.naturalHeight;
    const canvasRatio = cw / ch;
    let drawW = cw;
    let drawH = ch;
    let offsetX = 0;
    let offsetY = 0;

    if (canvasRatio > imgRatio) {
      drawW = cw;
      drawH = cw / imgRatio;
      offsetY = (ch - drawH) / 2;
    } else {
      drawH = ch;
      drawW = ch * imgRatio;
      offsetX = (cw - drawW) / 2;
    }

    ctx.drawImage(img, offsetX, offsetY, drawW, drawH);

    // Subtle Apple-style cinematic lighting overlay (warm amber glow + vignette)
    const vignette = ctx.createRadialGradient(
      cw * 0.5,
      ch * 0.45,
      ch * 0.2,
      cw * 0.5,
      ch * 0.5,
      Math.max(cw, ch) * 0.75
    );
    if (isDark) {
      vignette.addColorStop(0, "rgba(5, 9, 20, 0.05)");
      vignette.addColorStop(0.7, "rgba(5, 9, 20, 0.45)");
      vignette.addColorStop(1, "rgba(5, 9, 20, 0.85)");
    } else {
      vignette.addColorStop(0, "rgba(237, 242, 251, 0.05)");
      vignette.addColorStop(0.7, "rgba(237, 242, 251, 0.4)");
      vignette.addColorStop(1, "rgba(237, 242, 251, 0.85)");
    }
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, cw, ch);
  };

  // Scroll & Resize Handling
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const handleResize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      const newW = Math.round(rect.width * dpr);
      const newH = Math.round(rect.height * dpr);
      if (newW > 0 && newH > 0 && (canvas.width !== newW || canvas.height !== newH)) {
        canvas.width = newW;
        canvas.height = newH;
        drawFrame(frameIndexRef.current);
      }
    };

    handleResize();
    const ro = new ResizeObserver(handleResize);
    ro.observe(canvas);

    // IntersectionObserver to pause loop completely when hero is scrolled off-screen
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          isInViewRef.current = entry.isIntersecting;
        });
      },
      { threshold: 0.05 }
    );
    io.observe(canvas);

    // Scroll listener (tracks container or window)
    const scrollEl = scrollTargetRef?.current || window;
    const handleScroll = () => {
      const scrollTop =
        scrollTargetRef?.current?.scrollTop ??
        window.scrollY ??
        document.documentElement.scrollTop;

      // Map 0 to 650px of scroll to full 0..29 frame range
      const scrollRange = 650;
      const progress = Math.min(Math.max(scrollTop / scrollRange, 0), 1);
      targetFrameRef.current = progress * (frameCount - 1);
    };

    if (scrollTargetRef?.current) {
      scrollTargetRef.current.addEventListener("scroll", handleScroll, { passive: true });
    } else {
      window.addEventListener("scroll", handleScroll, { passive: true });
    }
    handleScroll();

    // 60fps render loop with lerp & ambient breathing drift
    let running = true;
    const loop = (timestamp: number) => {
      if (!running) return;

      if (isInViewRef.current && !prefersReducedMotion) {
        const delta = timestamp - lastTimeRef.current;
        lastTimeRef.current = timestamp;

        // Subtle ambient organic breathing when stationary near top
        const isNearTop = targetFrameRef.current < 2;
        const ambientOffset = isNearTop ? Math.sin(timestamp * 0.0008) * 0.8 : 0;
        const effectiveTarget = Math.max(0, Math.min(frameCount - 1, targetFrameRef.current + ambientOffset));

        // Smooth lerp interpolation (Apple feel)
        const diff = effectiveTarget - frameIndexRef.current;
        if (Math.abs(diff) > 0.01) {
          frameIndexRef.current += diff * 0.1;
          drawFrame(frameIndexRef.current);
        }
      }

      rafIdRef.current = requestAnimationFrame(loop);
    };

    rafIdRef.current = requestAnimationFrame(loop);

    return () => {
      running = false;
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      ro.disconnect();
      io.disconnect();
      if (scrollTargetRef?.current) {
        scrollTargetRef.current.removeEventListener("scroll", handleScroll);
      } else {
        window.removeEventListener("scroll", handleScroll);
      }
    };
  }, [frameCount, isDark, scrollTargetRef]);

  return (
    <div
      className={`qb-apple-hero-container ${className}`}
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 1,
      }}
      aria-hidden="true"
    >
      {/* High-speed initial WebP backdrop to eliminate any flash before canvas paints */}
      <div
        className="qb-apple-hero-poster"
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: "url(/hero_desk_reviewer.webp)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          opacity: firstFrameLoaded ? 0 : 0.8,
          transition: "opacity 0.4s ease",
          zIndex: 1,
        }}
      />

      {/* Frame-by-frame hardware accelerated Canvas */}
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          display: "block",
          zIndex: 2,
        }}
      />
    </div>
  );
}
