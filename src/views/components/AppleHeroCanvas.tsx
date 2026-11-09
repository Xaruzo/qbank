import React, { useEffect, useRef, useState } from "react";

interface AppleHeroCanvasProps {
  className?: string;
  frameCount?: number;
  scrollTargetRef?: React.RefObject<HTMLElement | null>;
  isDark?: boolean;
}

const TOTAL_FRAMES = 30;

interface FloatingMote {
  x: number;
  y: number;
  baseX: number;
  radius: number;
  vy: number;
  vx: number;
  alpha: number;
  maxAlpha: number;
  fadeSpeed: number;
  fadingIn: boolean;
  color: string;
  depth: number;
  symbol?: string;
  size?: number;
  rot?: number;
  vRot?: number;
}

const EXAM_SYMBOLS = [
  "80%",
  "170",
  "67s",
  "∑",
  "π",
  "√x",
  "RA 6713",
  "1987",
  "No Calc",
  "CSC",
  "OMR #2",
  "165",
  "Pass 1",
  "Pass 2",
];

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
  const scrollRatioRef = useRef<number>(0);
  const rafIdRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const [firstFrameLoaded, setFirstFrameLoaded] = useState<boolean>(false);
  const motesRef = useRef<FloatingMote[]>([]);

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
            drawFrame(0, 0);
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

  // Initialize floating motes and symbols
  const initMotes = (width: number, height: number) => {
    const palette = isDark
      ? [
          "rgba(245, 166, 35,", // amber
          "rgba(56, 189, 248,", // cyan
          "rgba(167, 139, 250,", // purple
          "rgba(255, 255, 255,", // soft white
          "rgba(52, 211, 153,", // emerald
        ]
      : [
          "rgba(217, 119, 6,", // amber dark
          "rgba(2, 132, 199,", // blue
          "rgba(124, 58, 237,", // violet
          "rgba(100, 116, 139,", // slate
        ];

    const count = width < 768 ? 24 : 45;
    const motes: FloatingMote[] = [];

    for (let i = 0; i < count; i++) {
      const isSymbol = i % 4 === 0;
      const depth = Math.random() * 2 + 1; // 1 to 3
      const colorPrefix = palette[Math.floor(Math.random() * palette.length)];
      const maxAlpha = isDark
        ? Math.random() * 0.35 + 0.15
        : Math.random() * 0.22 + 0.08;

      motes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        baseX: Math.random() * width,
        radius: isSymbol ? 0 : Math.random() * 2.2 + 1,
        vy: -(Math.random() * 0.3 + 0.12) * (depth * 0.6),
        vx: (Math.random() - 0.5) * 0.2,
        alpha: Math.random() * maxAlpha,
        maxAlpha,
        fadeSpeed: Math.random() * 0.005 + 0.002,
        fadingIn: Math.random() > 0.5,
        color: colorPrefix,
        depth,
        symbol: isSymbol
          ? EXAM_SYMBOLS[Math.floor(Math.random() * EXAM_SYMBOLS.length)]
          : undefined,
        size: isSymbol ? Math.floor(Math.random() * 3 + 11) : undefined,
        rot: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.006,
      });
    }
    motesRef.current = motes;
  };

  // Canvas drawing helper with frame-by-frame WebP + ambient motes + lighting
  const drawFrame = (index: number, timestamp: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const clampedIndex = Math.min(
      Math.max(Math.floor(index), 0),
      frameCount - 1
    );
    const img = imagesRef.current[clampedIndex] || imagesRef.current[0];
    if (!img || !img.complete || img.naturalWidth === 0) return;

    const cw = canvas.width;
    const ch = canvas.height;
    ctx.clearRect(0, 0, cw, ch);

    // Object-fit: cover math
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

    // Living breathing vignette & lighting overlay
    const pulse = Math.sin(timestamp * 0.0007) * 0.05 + 0.95;
    const vignette = ctx.createRadialGradient(
      cw * 0.5,
      ch * 0.45,
      ch * 0.2 * pulse,
      cw * 0.5,
      ch * 0.5,
      Math.max(cw, ch) * 0.8
    );
    if (isDark) {
      vignette.addColorStop(0, "rgba(5, 9, 20, 0.25)");
      vignette.addColorStop(0.5, "rgba(5, 9, 20, 0.65)");
      vignette.addColorStop(1, "rgba(5, 9, 20, 0.92)");
    } else {
      vignette.addColorStop(0, "rgba(237, 242, 251, 0.25)");
      vignette.addColorStop(0.5, "rgba(237, 242, 251, 0.65)");
      vignette.addColorStop(1, "rgba(237, 242, 251, 0.92)");
    }
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, cw, ch);

    // Draw floating study particles & symbols across the full screen
    const motes = motesRef.current;
    const scrollParallax = scrollRatioRef.current * 400;

    for (let i = 0; i < motes.length; i++) {
      const p = motes[i];

      // Particle physics
      p.y += p.vy;
      p.baseX += p.vx;
      p.x = p.baseX + Math.sin(timestamp * 0.0008 + i) * (5 * p.depth);

      if (p.vRot && p.rot !== undefined) {
        p.rot += p.vRot;
      }

      // Fading cycle
      if (p.fadingIn) {
        p.alpha += p.fadeSpeed;
        if (p.alpha >= p.maxAlpha) {
          p.alpha = p.maxAlpha;
          p.fadingIn = false;
        }
      } else {
        p.alpha -= p.fadeSpeed;
        if (p.alpha <= 0.04) {
          p.alpha = 0.04;
          p.fadingIn = true;
        }
      }

      // Wrap vertically
      if (p.y < -30) {
        p.y = ch + 20;
        p.baseX = Math.random() * cw;
      } else if (p.y > ch + 30) {
        p.y = -20;
        p.baseX = Math.random() * cw;
      }

      // Parallax position
      const finalY = (p.y - (scrollParallax * (p.depth * 0.15))) % (ch + 60);
      const renderY = finalY < -30 ? finalY + ch + 60 : finalY;

      ctx.save();
      if (p.symbol) {
        ctx.translate(p.x, renderY);
        if (p.rot) ctx.rotate(p.rot);
        ctx.font = `600 ${p.size || 12}px 'Fira Mono', monospace`;
        ctx.fillStyle = `${p.color} ${p.alpha})`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(p.symbol, 0, 0);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, renderY, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color} ${p.alpha})`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(p.x, renderY, p.radius * 2, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color} ${p.alpha * 0.25})`;
        ctx.fill();
      }
      ctx.restore();
    }
  };

  // Full-page scroll scrubbing & animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const handleResize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      const newW = Math.round(rect.width * dpr);
      const newH = Math.round(rect.height * dpr);
      if (newW > 0 && newH > 0 && (canvas.width !== newW || canvas.height !== newH)) {
        canvas.width = newW;
        canvas.height = newH;
        initMotes(newW, newH);
        drawFrame(frameIndexRef.current, performance.now());
      }
    };

    handleResize();
    const ro = new ResizeObserver(handleResize);
    ro.observe(canvas);

    // Full-page scroll listener
    const getScrollProgress = () => {
      const rootScroller =
        scrollTargetRef?.current ||
        document.querySelector(".qb-landing-root") ||
        document.querySelector(".qb-landing-scroll") ||
        document.documentElement;

      const scrollTop =
        scrollTargetRef?.current?.scrollTop ??
        (rootScroller as HTMLElement).scrollTop ??
        window.scrollY ??
        document.documentElement.scrollTop;

      const scrollHeight =
        (rootScroller as HTMLElement).scrollHeight ||
        document.documentElement.scrollHeight;
      const clientHeight =
        (rootScroller as HTMLElement).clientHeight || window.innerHeight;

      const maxScroll = Math.max(1, scrollHeight - clientHeight);
      return Math.min(Math.max(scrollTop / maxScroll, 0), 1);
    };

    const handleScroll = () => {
      const progress = getScrollProgress();
      scrollRatioRef.current = progress;

      // Map progress across multiple frame cycles or 0..29 so scrolling continuously animates
      // 2 full forward-backward cycles across the entire page scroll:
      // 0% -> 25% (0 -> 29), 25% -> 50% (29 -> 0), 50% -> 75% (0 -> 29), 75% -> 100% (29 -> 0)
      const cycleProgress = (progress * 2.5) % 2; // oscillates 0 -> 1 -> 0
      const normalizedCycle =
        cycleProgress <= 1 ? cycleProgress : 2 - cycleProgress;
      targetFrameRef.current = normalizedCycle * (frameCount - 1);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    if (scrollTargetRef?.current) {
      scrollTargetRef.current.addEventListener("scroll", handleScroll, {
        passive: true,
      });
    }
    const rootEl = document.querySelector(".qb-landing-root");
    if (rootEl) {
      rootEl.addEventListener("scroll", handleScroll, { passive: true });
    }

    handleScroll();

    // 60fps continuous render loop with lerp + idle breathing
    let running = true;
    const loop = (timestamp: number) => {
      if (!running) return;

      if (!prefersReducedMotion) {
        // Continuous ambient breathing drift (moves ±1.2 frames even when user stops scrolling)
        const idleBreathing = Math.sin(timestamp * 0.0009) * 1.5;
        const effectiveTarget = Math.max(
          0,
          Math.min(frameCount - 1, targetFrameRef.current + idleBreathing)
        );

        // Smooth lerp easing
        const diff = effectiveTarget - frameIndexRef.current;
        if (Math.abs(diff) > 0.01) {
          frameIndexRef.current += diff * 0.09;
        }

        drawFrame(frameIndexRef.current, timestamp);
      }

      rafIdRef.current = requestAnimationFrame(loop);
    };

    rafIdRef.current = requestAnimationFrame(loop);

    return () => {
      running = false;
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      ro.disconnect();
      window.removeEventListener("scroll", handleScroll);
      if (scrollTargetRef?.current) {
        scrollTargetRef.current.removeEventListener("scroll", handleScroll);
      }
      if (rootEl) {
        rootEl.removeEventListener("scroll", handleScroll);
      }
    };
  }, [frameCount, isDark, scrollTargetRef]);

  return (
    <div
      className={`qb-apple-hero-container ${className}`}
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 0,
      }}
      aria-hidden="true"
    >
      {/* High-speed initial WebP backdrop to eliminate flash */}
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
