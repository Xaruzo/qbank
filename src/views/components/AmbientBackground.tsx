import React, { useEffect, useRef } from "react";

interface AmbientBackgroundProps {
  isDark?: boolean;
  variant?: "desk" | "hall";
}

interface Particle {
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
  depth: number; // 1 = background, 2 = midground, 3 = foreground
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
  "Pro",
  "Subpro",
];

export default function AmbientBackground({
  isDark = true,
  variant = "desk",
}: AmbientBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const scrollOffsetRef = useRef<number>(0);
  const animFrameIdRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Track window scroll for multi-depth parallax
    const handleScroll = () => {
      // Check page scroll either on window or on the active scroll container
      const scroller =
        document.querySelector(".qb-landing-root") ||
        document.querySelector(".qb-signin-root") ||
        window;
      const scrollY =
        scroller === window
          ? window.scrollY
          : (scroller as HTMLElement).scrollTop || window.scrollY;
      scrollOffsetRef.current = scrollY;
    };

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize);

    const scrollerEl =
      document.querySelector(".qb-landing-root") ||
      document.querySelector(".qb-signin-root");
    if (scrollerEl) {
      scrollerEl.addEventListener("scroll", handleScroll, { passive: true });
    }

    // Check reduced motion preference
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    // Palette based on theme
    const darkPalette = [
      "rgba(245, 166, 35,", // amber
      "rgba(56, 189, 248,", // cyan
      "rgba(167, 139, 250,", // purple
      "rgba(255, 255, 255,", // soft white dust
      "rgba(52, 211, 153,", // emerald
    ];

    const lightPalette = [
      "rgba(217, 119, 6,", // amber dark
      "rgba(2, 132, 199,", // blue
      "rgba(124, 58, 237,", // violet
      "rgba(100, 116, 139,", // slate
    ];

    const palette = isDark ? darkPalette : lightPalette;

    // Generate floating ambient particles & glyphs
    const particleCount = width < 768 ? 28 : 55;
    const particles: Particle[] = [];

    for (let i = 0; i < particleCount; i++) {
      const isSymbol = i % 4 === 0;
      const depth = Math.random() * 2 + 1; // 1 to 3
      const colorPrefix = palette[Math.floor(Math.random() * palette.length)];
      const maxAlpha = isDark ? Math.random() * 0.35 + 0.15 : Math.random() * 0.25 + 0.1;

      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        baseX: Math.random() * width,
        radius: isSymbol ? 0 : Math.random() * 2.5 + 1.2,
        vy: -(Math.random() * 0.35 + 0.15) * (depth * 0.6),
        vx: (Math.random() - 0.5) * 0.2,
        alpha: Math.random() * maxAlpha,
        maxAlpha,
        fadeSpeed: Math.random() * 0.006 + 0.003,
        fadingIn: Math.random() > 0.5,
        color: colorPrefix,
        depth,
        symbol: isSymbol
          ? EXAM_SYMBOLS[Math.floor(Math.random() * EXAM_SYMBOLS.length)]
          : undefined,
        size: isSymbol ? Math.floor(Math.random() * 4 + 11) : undefined,
        rot: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.008,
      });
    }

    let lastTime = performance.now();

    const render = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      ctx.clearRect(0, 0, width, height);

      const scrollParallax = scrollOffsetRef.current;

      // Draw subtle ambient glow spots (living breathing light)
      const pulse = Math.sin(time * 0.0008) * 0.08 + 0.92;
      const glowGrad1 = ctx.createRadialGradient(
        width * 0.25,
        height * 0.35,
        20,
        width * 0.25,
        height * 0.35,
        width * 0.5 * pulse
      );
      glowGrad1.addColorStop(
        0,
        isDark ? "rgba(245, 166, 35, 0.045)" : "rgba(245, 166, 35, 0.03)"
      );
      glowGrad1.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = glowGrad1;
      ctx.fillRect(0, 0, width, height);

      const glowGrad2 = ctx.createRadialGradient(
        width * 0.8,
        height * 0.7,
        30,
        width * 0.8,
        height * 0.7,
        width * 0.55 * pulse
      );
      glowGrad2.addColorStop(
        0,
        isDark ? "rgba(56, 189, 248, 0.04)" : "rgba(56, 189, 248, 0.025)"
      );
      glowGrad2.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = glowGrad2;
      ctx.fillRect(0, 0, width, height);

      // Render living particles & symbols
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        if (!prefersReducedMotion) {
          // Animate particle position
          p.y += p.vy;
          p.baseX += p.vx;
          p.x = p.baseX + Math.sin(time * 0.001 + i) * (6 * p.depth);

          if (p.vRot && p.rot !== undefined) {
            p.rot += p.vRot;
          }

          // Gentle fading alpha breathing
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
          if (p.y < -40) {
            p.y = height + 30;
            p.baseX = Math.random() * width;
          } else if (p.y > height + 40) {
            p.y = -30;
            p.baseX = Math.random() * width;
          }
        }

        // Apply scroll parallax offset based on particle depth layer
        const parallaxY = (p.y - (scrollParallax * (p.depth * 0.12))) % (height + 60);
        const finalY = parallaxY < -30 ? parallaxY + height + 60 : parallaxY;

        ctx.save();
        if (p.symbol) {
          // Render floating math / examinee symbol
          ctx.translate(p.x, finalY);
          if (p.rot) ctx.rotate(p.rot);
          ctx.font = `600 ${p.size || 12}px 'Fira Mono', monospace`;
          ctx.fillStyle = `${p.color} ${p.alpha})`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(p.symbol, 0, 0);
        } else {
          // Render glowing dust mote / bokeh particle
          ctx.beginPath();
          ctx.arc(p.x, finalY, p.radius, 0, Math.PI * 2);
          ctx.fillStyle = `${p.color} ${p.alpha})`;
          ctx.fill();

          // Soft subtle halo
          ctx.beginPath();
          ctx.arc(p.x, finalY, p.radius * 2.2, 0, Math.PI * 2);
          ctx.fillStyle = `${p.color} ${p.alpha * 0.25})`;
          ctx.fill();
        }
        ctx.restore();
      }

      animFrameIdRef.current = requestAnimationFrame(render);
    };

    animFrameIdRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
      if (scrollerEl) {
        scrollerEl.removeEventListener("scroll", handleScroll);
      }
    };
  }, [isDark]);

  return (
    <div className="qb-ambient-bg-wrapper" aria-hidden="true">
      {/* Living Canvas Particle Field (Dust motes & exam symbols with scroll parallax) */}
      <canvas ref={canvasRef} className="qb-ambient-canvas" />

      {/* Measured Gradient Scrim for optimal contrast throughout scroll */}
      <div className="qb-ambient-scrim" />
    </div>
  );
}
