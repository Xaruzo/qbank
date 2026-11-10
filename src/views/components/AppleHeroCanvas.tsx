import React, { useEffect, useRef } from "react";
import * as THREE from "three";

interface AppleHeroCanvasProps {
  className?: string;
  frameCount?: number; // Retained for backward interface compatibility
  scrollTargetRef?: React.RefObject<HTMLElement | null>;
  isDark?: boolean;
  disableScrollScrubbing?: boolean;
}

// Exam symbols and badges floating in the knowledge constellation
const EXAM_KNOWLEDGE_BADGES = [
  "80% Pass Mark",
  "170 Questions",
  "67s / Item",
  "RA 6713 Code",
  "CSC Merit System",
  "OMR Bubble #2",
  "∑ Math Shortcuts",
  "√x Logic Steps",
  "Phil. Const. 1987",
  "Clerical Indexing",
  "Verbal Analogies",
  "Subprof 165 Qs",
  "General Info",
  "Passing Doctrine",
];

// Helper: Procedural circular particle texture with dense, crisp core
function createGlowPointTexture(isDark: boolean): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    if (isDark) {
      gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
      gradient.addColorStop(0.25, "rgba(255, 255, 255, 0.95)");
      gradient.addColorStop(0.55, "rgba(255, 255, 255, 0.5)");
      gradient.addColorStop(0.85, "rgba(255, 255, 255, 0.12)");
      gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
    } else {
      // In light mode, points need an opaque, high-contrast core
      gradient.addColorStop(0, "rgba(15, 23, 42, 1)");
      gradient.addColorStop(0.35, "rgba(30, 41, 59, 0.9)");
      gradient.addColorStop(0.65, "rgba(51, 65, 85, 0.55)");
      gradient.addColorStop(0.9, "rgba(71, 85, 105, 0.15)");
      gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
    }

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(32, 32, 32, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Helper: Procedural Sprite Badge for Floating Exam Knowledge Motes
function createBadgeTexture(text: string, isDark: boolean): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 72;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.clearRect(0, 0, 256, 72);

    // Pill background
    ctx.beginPath();
    const r = 16;
    const x = 8;
    const y = 8;
    const w = 240;
    const h = 56;
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();

    if (isDark) {
      ctx.fillStyle = "rgba(14, 22, 38, 0.88)";
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(245, 166, 35, 0.5)";
      ctx.stroke();

      ctx.font = "bold 20px 'DM Sans', sans-serif";
      ctx.fillStyle = "rgba(254, 243, 199, 0.96)";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, 128, 36);
    } else {
      // High-contrast clean white pill with rich navy text and amber border in light mode
      ctx.fillStyle = "rgba(255, 255, 255, 0.96)";
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = "rgba(217, 119, 6, 0.65)";
      ctx.stroke();

      ctx.font = "bold 20px 'DM Sans', sans-serif";
      ctx.fillStyle = "#0f172a";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, 128, 36);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Detect software WebGL per Three.js directives
function detectSoftwareGl(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const gl = document.createElement("canvas").getContext("webgl2");
    if (!gl) return true;
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return false;
  }
}

export default function AppleHeroCanvas({
  className = "qb-apple-hero-canvas",
  scrollTargetRef,
  isDark = true,
  disableScrollScrubbing = false,
}: AppleHeroCanvasProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let animFrameId = 0;
    let isDisposed = false;

    // Detect environment capabilities
    const isSoftwareGl = detectSoftwareGl();
    const isLiteMode =
      typeof document !== "undefined" &&
      (document.body.classList.contains("qb-lite-mode") ||
        document.body.classList.contains("qb-no-animations") ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches);

    // Grid Dimensions: 105 x 75 points
    const GRID_X = isLiteMode ? 60 : isSoftwareGl ? 80 : 105;
    const GRID_Z = isLiteMode ? 45 : isSoftwareGl ? 60 : 75;
    const SEPARATION_X = 26;
    const SEPARATION_Z = 26;
    const TOTAL_POINTS = GRID_X * GRID_Z;

    // SCENE SETUP
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(
      isDark ? 0x070c18 : 0xf1f5f9,
      isDark ? 0.00045 : 0.00035
    );

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const camera = new THREE.PerspectiveCamera(55, width / height, 1, 4500);
    camera.position.set(0, 260, 920);
    camera.lookAt(0, -20, 0);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch {
      return;
    }

    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl || isLiteMode ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.position = "absolute";
    renderer.domElement.style.top = "0";
    renderer.domElement.style.left = "0";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.pointerEvents = "none";
    renderer.domElement.style.display = "block";

    container.appendChild(renderer.domElement);

    // ─────────────────────────────────────────────────────────────────────────────
    // 1. GENERATIVE 3D UNDULATING WAVE FIELD
    // ─────────────────────────────────────────────────────────────────────────────
    const pointTexture = createGlowPointTexture(isDark);
    const positions = new Float32Array(TOTAL_POINTS * 3);
    const colors = new Float32Array(TOTAL_POINTS * 3);
    const baseColors = new Float32Array(TOTAL_POINTS * 3);
    const originalPositions = new Float32Array(TOTAL_POINTS * 3);

    let idx = 0;
    const halfWidth = (GRID_X * SEPARATION_X) / 2;
    const halfDepth = (GRID_Z * SEPARATION_Z) / 2;

    for (let ix = 0; ix < GRID_X; ix++) {
      for (let iz = 0; iz < GRID_Z; iz++) {
        const x = ix * SEPARATION_X - halfWidth;
        const z = iz * SEPARATION_Z - halfDepth;
        const y = 0;

        positions[idx] = x;
        positions[idx + 1] = y;
        positions[idx + 2] = z;

        originalPositions[idx] = x;
        originalPositions[idx + 1] = y;
        originalPositions[idx + 2] = z;

        // Base color allocation
        const ratio = (x + halfWidth) / (halfWidth * 2);
        if (isDark) {
          // Dark Mode Palette: Luminous Gold Amber, Cyan, Royal Violet
          if (ratio < 0.35) {
            baseColors[idx] = 0.98;
            baseColors[idx + 1] = 0.68;
            baseColors[idx + 2] = 0.16;
          } else if (ratio < 0.7) {
            baseColors[idx] = 0.22;
            baseColors[idx + 1] = 0.78;
            baseColors[idx + 2] = 0.98;
          } else {
            baseColors[idx] = 0.68;
            baseColors[idx + 1] = 0.38;
            baseColors[idx + 2] = 0.98;
          }
        } else {
          // Light Mode Palette: High-contrast Cobalt Blue, Vivid Amber Gold, Forest Emerald
          if (ratio < 0.4) {
            baseColors[idx] = 0.12;
            baseColors[idx + 1] = 0.38;
            baseColors[idx + 2] = 0.92; // Deep vivid cobalt
          } else if (ratio < 0.75) {
            baseColors[idx] = 0.88;
            baseColors[idx + 1] = 0.46;
            baseColors[idx + 2] = 0.04; // Rich warm amber gold
          } else {
            baseColors[idx] = 0.05;
            baseColors[idx + 1] = 0.60;
            baseColors[idx + 2] = 0.42; // Deep teal emerald
          }
        }

        colors[idx] = baseColors[idx];
        colors[idx + 1] = baseColors[idx + 1];
        colors[idx + 2] = baseColors[idx + 2];

        idx += 3;
      }
    }

    const waveGeometry = new THREE.BufferGeometry();
    waveGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    waveGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const waveMaterial = new THREE.PointsMaterial({
      size: isDark ? 16 : 14,
      vertexColors: true,
      map: pointTexture,
      transparent: true,
      opacity: isDark ? 0.85 : 0.88,
      blending: isDark ? THREE.AdditiveBlending : THREE.NormalBlending,
      depthWrite: false,
    });

    const wavePoints = new THREE.Points(waveGeometry, waveMaterial);
    wavePoints.position.y = -30;
    scene.add(wavePoints);

    // ─────────────────────────────────────────────────────────────────────────────
    // 2. KNOWLEDGE CONSTELLATION NODES & DYNAMIC CONNECTION LINES
    // ─────────────────────────────────────────────────────────────────────────────
    const CONSTELLATION_COUNT = isLiteMode ? 18 : 36;
    const constellationPositions = new Float32Array(CONSTELLATION_COUNT * 3);
    const constellationVelocities: { vx: number; vy: number; vz: number; phase: number }[] = [];

    for (let i = 0; i < CONSTELLATION_COUNT; i++) {
      const i3 = i * 3;
      const x = (Math.random() - 0.5) * 1600;
      const y = (Math.random() - 0.5) * 360 + 80;
      const z = (Math.random() - 0.5) * 900;

      constellationPositions[i3] = x;
      constellationPositions[i3 + 1] = y;
      constellationPositions[i3 + 2] = z;

      constellationVelocities.push({
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.35,
        vz: (Math.random() - 0.5) * 0.45,
        phase: Math.random() * Math.PI * 2,
      });
    }

    const constellationGeom = new THREE.BufferGeometry();
    constellationGeom.setAttribute(
      "position",
      new THREE.BufferAttribute(constellationPositions, 3)
    );

    const constellationMaterial = new THREE.PointsMaterial({
      size: isDark ? 18 : 15,
      color: isDark ? 0xf5a623 : 0x1d4ed8,
      map: pointTexture,
      transparent: true,
      opacity: isDark ? 0.92 : 0.92,
      blending: isDark ? THREE.AdditiveBlending : THREE.NormalBlending,
      depthWrite: false,
    });

    const constellationPoints = new THREE.Points(constellationGeom, constellationMaterial);
    scene.add(constellationPoints);

    // Proximity Lines
    const MAX_LINES = 160;
    const linePositions = new Float32Array(MAX_LINES * 2 * 3);
    const lineColors = new Float32Array(MAX_LINES * 2 * 3);

    const lineGeom = new THREE.BufferGeometry();
    lineGeom.setAttribute("position", new THREE.BufferAttribute(linePositions, 3));
    lineGeom.setAttribute("color", new THREE.BufferAttribute(lineColors, 3));

    const lineMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: isDark ? 0.36 : 0.48,
      blending: isDark ? THREE.AdditiveBlending : THREE.NormalBlending,
      depthWrite: false,
    });

    const constellationLines = new THREE.LineSegments(lineGeom, lineMaterial);
    scene.add(constellationLines);

    // ─────────────────────────────────────────────────────────────────────────────
    // 3. FLOATING EXAM EMBLEM BADGES (LIVING KNOWLEDGE PILLS)
    // ─────────────────────────────────────────────────────────────────────────────
    const spriteGroup = new THREE.Group();
    const badgeSprites: {
      sprite: THREE.Sprite;
      baseX: number;
      baseY: number;
      baseZ: number;
      speed: number;
      phase: number;
      texture: THREE.Texture;
    }[] = [];

    const badgeCount = isLiteMode ? 6 : 10;
    for (let i = 0; i < badgeCount; i++) {
      const text = EXAM_KNOWLEDGE_BADGES[i % EXAM_KNOWLEDGE_BADGES.length];
      const texture = createBadgeTexture(text, isDark);
      const spriteMaterial = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        opacity: isDark ? 0.78 : 0.92,
        depthWrite: false,
      });

      const sprite = new THREE.Sprite(spriteMaterial);
      const scaleX = 145;
      const scaleY = 40;
      sprite.scale.set(scaleX, scaleY, 1);

      const angle = (i / badgeCount) * Math.PI * 2;
      const radius = 540 + (i % 3) * 110;
      const bx = Math.cos(angle) * radius;
      const by = 90 + (i % 4) * 45;
      const bz = Math.sin(angle) * (radius * 0.6) - 100;

      sprite.position.set(bx, by, bz);
      spriteGroup.add(sprite);

      badgeSprites.push({
        sprite,
        baseX: bx,
        baseY: by,
        baseZ: bz,
        speed: 0.00045 + (i % 3) * 0.0002,
        phase: angle,
        texture,
      });
    }
    scene.add(spriteGroup);

    // ─────────────────────────────────────────────────────────────────────────────
    // 4. INTERACTION & SCROLL SMOOTHING
    // ─────────────────────────────────────────────────────────────────────────────
    const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
    const scroll = { current: 0, target: 0 };

    const handlePointerMove = (e: MouseEvent) => {
      mouse.targetX = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.targetY = -(e.clientY / window.innerHeight) * 2 + 1;
    };

    const handleScroll = () => {
      if (disableScrollScrubbing) return;
      let ratio = 0;
      if (scrollTargetRef?.current) {
        const el = scrollTargetRef.current;
        const max = el.scrollHeight - el.clientHeight;
        ratio = max > 0 ? el.scrollTop / max : 0;
      } else {
        const doc = document.documentElement;
        const max = doc.scrollHeight - window.innerHeight;
        ratio = max > 0 ? window.scrollY / max : 0;
      }
      scroll.target = Math.max(0, Math.min(1, ratio));
    };

    window.addEventListener("mousemove", handlePointerMove, { passive: true });
    window.addEventListener("scroll", handleScroll, { passive: true });
    if (scrollTargetRef?.current) {
      scrollTargetRef.current.addEventListener("scroll", handleScroll, { passive: true });
    }

    const handleResize = () => {
      if (!container || !renderer) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    // ─────────────────────────────────────────────────────────────────────────────
    // 5. ANIMATION LOOP (LIVING MOTION AT 60 FPS)
    // ─────────────────────────────────────────────────────────────────────────────
    let clock = 0;
    const posAttr = waveGeometry.attributes.position as THREE.BufferAttribute;
    const colAttr = waveGeometry.attributes.color as THREE.BufferAttribute;
    const cPosAttr = constellationGeom.attributes.position as THREE.BufferAttribute;
    const lPosAttr = lineGeom.attributes.position as THREE.BufferAttribute;
    const lColAttr = lineGeom.attributes.color as THREE.BufferAttribute;

    const animate = () => {
      if (isDisposed) return;

      if (document.hidden) {
        animFrameId = requestAnimationFrame(animate);
        return;
      }

      clock += 0.016;

      // Exponential damping on mouse and scroll
      mouse.x += (mouse.targetX - mouse.x) * 0.05;
      mouse.y += (mouse.targetY - mouse.y) * 0.05;
      scroll.current += (scroll.target - scroll.current) * 0.06;

      // Camera Glide
      const baseCamY = 260 + scroll.current * 180;
      const baseCamZ = 920 - scroll.current * 200;
      const baseCamX = mouse.x * 120;

      camera.position.x = baseCamX;
      camera.position.y = baseCamY + mouse.y * 45;
      camera.position.z = baseCamZ;
      camera.lookAt(mouse.x * 35, -20 + scroll.current * 50, -scroll.current * 80);

      // 1. Undulating Multi-Harmonic Wave Math
      const pArr = posAttr.array as Float32Array;
      const cArr = colAttr.array as Float32Array;
      let pIndex = 0;

      const rippleWorldX = mouse.x * 550;
      const rippleWorldZ = -mouse.y * 320;

      for (let ix = 0; ix < GRID_X; ix++) {
        for (let iz = 0; iz < GRID_Z; iz++) {
          const ox = originalPositions[pIndex];
          const oz = originalPositions[pIndex + 2];

          // Harmonic wave equation
          const wave1 = Math.sin(ox * 0.0034 + clock * 1.35) * 58;
          const wave2 = Math.cos(oz * 0.0044 + clock * 1.0) * 48;
          const wave3 = Math.sin((ox + oz) * 0.0026 + clock * 0.72) * 28;

          // Pointer magnetic ripple
          const dx = ox - rippleWorldX;
          const dz = oz - rippleWorldZ;
          const distSq = dx * dx + dz * dz;
          let ripple = 0;
          if (distSq < 160000) {
            const dist = Math.sqrt(distSq);
            ripple = Math.exp(-distSq / 28000) * 38 * Math.sin(dist * 0.032 - clock * 4.2);
          }

          const elevation = wave1 + wave2 + wave3 + ripple;
          pArr[pIndex + 1] = elevation;

          // Peak luminance dynamic modulation from immutable baseColors
          const peakRatio = Math.max(0, Math.min(1, (elevation + 65) / 135));
          const brightness = isDark
            ? 0.65 + peakRatio * 0.45
            : 0.82 + peakRatio * 0.35;

          cArr[pIndex] = Math.min(1, baseColors[pIndex] * brightness);
          cArr[pIndex + 1] = Math.min(1, baseColors[pIndex + 1] * brightness);
          cArr[pIndex + 2] = Math.min(1, baseColors[pIndex + 2] * brightness);

          pIndex += 3;
        }
      }
      posAttr.needsUpdate = true;
      colAttr.needsUpdate = true;

      // 2. Animate Constellation Motes
      const cArrPos = cPosAttr.array as Float32Array;
      for (let i = 0; i < CONSTELLATION_COUNT; i++) {
        const i3 = i * 3;
        const vel = constellationVelocities[i];

        cArrPos[i3] += vel.vx;
        cArrPos[i3 + 1] += vel.vy + Math.sin(clock * 1.5 + vel.phase) * 0.22;
        cArrPos[i3 + 2] += vel.vz;

        if (cArrPos[i3] > 800) cArrPos[i3] = -800;
        if (cArrPos[i3] < -800) cArrPos[i3] = 800;
        if (cArrPos[i3 + 1] > 280) cArrPos[i3 + 1] = -40;
        if (cArrPos[i3 + 1] < -40) cArrPos[i3 + 1] = 280;
        if (cArrPos[i3 + 2] > 450) cArrPos[i3 + 2] = -450;
        if (cArrPos[i3 + 2] < -450) cArrPos[i3 + 2] = 450;
      }
      cPosAttr.needsUpdate = true;

      // 3. Proximity Lines between Constellation Nodes
      const lArrPos = lPosAttr.array as Float32Array;
      const lArrCol = lColAttr.array as Float32Array;
      let lineVertexIdx = 0;
      let lineSegmentsDrawn = 0;
      const PROXIMITY_DIST_SQ = 230 * 230;

      for (let i = 0; i < CONSTELLATION_COUNT && lineSegmentsDrawn < MAX_LINES; i++) {
        const i3 = i * 3;
        const x1 = cArrPos[i3];
        const y1 = cArrPos[i3 + 1];
        const z1 = cArrPos[i3 + 2];

        for (let j = i + 1; j < CONSTELLATION_COUNT && lineSegmentsDrawn < MAX_LINES; j++) {
          const j3 = j * 3;
          const x2 = cArrPos[j3];
          const y2 = cArrPos[j3 + 1];
          const z2 = cArrPos[j3 + 2];

          const dSq = (x1 - x2) ** 2 + (y1 - y2) ** 2 + (z1 - z2) ** 2;
          if (dSq < PROXIMITY_DIST_SQ) {
            const alpha = 1 - dSq / PROXIMITY_DIST_SQ;

            // Point A
            lArrPos[lineVertexIdx] = x1;
            lArrPos[lineVertexIdx + 1] = y1;
            lArrPos[lineVertexIdx + 2] = z1;

            if (isDark) {
              lArrCol[lineVertexIdx] = 0.98 * alpha;
              lArrCol[lineVertexIdx + 1] = 0.68 * alpha;
              lArrCol[lineVertexIdx + 2] = 0.18 * alpha;
            } else {
              lArrCol[lineVertexIdx] = 0.12 * alpha;
              lArrCol[lineVertexIdx + 1] = 0.38 * alpha;
              lArrCol[lineVertexIdx + 2] = 0.92 * alpha;
            }

            // Point B
            lArrPos[lineVertexIdx + 3] = x2;
            lArrPos[lineVertexIdx + 4] = y2;
            lArrPos[lineVertexIdx + 5] = z2;

            if (isDark) {
              lArrCol[lineVertexIdx + 3] = 0.22 * alpha;
              lArrCol[lineVertexIdx + 4] = 0.78 * alpha;
              lArrCol[lineVertexIdx + 5] = 0.98 * alpha;
            } else {
              lArrCol[lineVertexIdx + 3] = 0.88 * alpha;
              lArrCol[lineVertexIdx + 4] = 0.46 * alpha;
              lArrCol[lineVertexIdx + 5] = 0.04 * alpha;
            }

            lineVertexIdx += 6;
            lineSegmentsDrawn++;
          }
        }
      }

      for (let k = lineVertexIdx; k < MAX_LINES * 6; k++) {
        lArrPos[k] = 0;
        lArrCol[k] = 0;
      }
      lPosAttr.needsUpdate = true;
      lColAttr.needsUpdate = true;

      // 4. Animate Floating Exam Badges
      badgeSprites.forEach((b, i) => {
        const curAngle = b.phase + clock * b.speed * 200;
        const radius = 540 + (i % 3) * 110;
        b.sprite.position.x = Math.cos(curAngle) * radius + mouse.x * 40;
        b.sprite.position.y = b.baseY + Math.sin(clock * 1.2 + i) * 18 + mouse.y * 20;
        b.sprite.position.z = Math.sin(curAngle) * (radius * 0.6) - 100 - scroll.current * 100;
      });

      renderer.render(scene, camera);
      animFrameId = requestAnimationFrame(animate);
    };

    animFrameId = requestAnimationFrame(animate);

    // ─────────────────────────────────────────────────────────────────────────────
    // CLEANUP & RESOURCE DISPOSAL
    // ─────────────────────────────────────────────────────────────────────────────
    return () => {
      isDisposed = true;
      if (animFrameId) cancelAnimationFrame(animFrameId);

      window.removeEventListener("mousemove", handlePointerMove);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
      if (scrollTargetRef?.current) {
        scrollTargetRef.current.removeEventListener("scroll", handleScroll);
      }

      waveGeometry.dispose();
      waveMaterial.dispose();
      pointTexture.dispose();
      constellationGeom.dispose();
      constellationMaterial.dispose();
      lineGeom.dispose();
      lineMaterial.dispose();

      badgeSprites.forEach((b) => {
        b.texture.dispose();
        b.sprite.material.dispose();
      });

      if (renderer) {
        renderer.dispose();
        if (renderer.domElement && renderer.domElement.parentNode) {
          renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
      }
    };
  }, [isDark, disableScrollScrubbing, scrollTargetRef]);

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
      <div
        ref={mountRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          display: "block",
        }}
      />
    </div>
  );
}
