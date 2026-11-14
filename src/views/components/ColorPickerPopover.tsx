import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Pipette } from "lucide-react";

export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export interface HsvColor {
  /** Hue in degrees [0, 360) */
  h: number;
  /** Saturation in percent [0, 100] */
  s: number;
  /** Value (brightness) in percent [0, 100] */
  v: number;
}

export interface ColorPickerPanelProps {
  /** Current selected color (hex string like "#1a2540" or "transparent"). */
  value: string;
  /** Called immediately on live interaction; commit is true on final selection or drag end. */
  onChange: (nextColor: string, commit: boolean) => void;
  /** Optional preset swatches grid shown above the custom spectrum. */
  presets?: readonly string[];
  /** Title displayed at top of panel (hidden when omitted). */
  title?: string;
  /** Allows choosing "transparent" / no color (useful for shape fill). */
  allowTransparent?: boolean;
  /** Compact spacing for nested floating popovers. */
  compact?: boolean;
}

interface EyeDropperResult {
  sRGBHex: string;
}

interface EyeDropperInstance {
  open: (options?: { signal?: AbortSignal }) => Promise<EyeDropperResult>;
}

interface WindowWithEyeDropper extends Window {
  EyeDropper?: new () => EyeDropperInstance;
}

const DEFAULT_FALLBACK_HEX = "#1a2540";

export function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

export function normalizeHex(input: string): string | null {
  const trimmed = input.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(trimmed)) {
    const r = trimmed[0] + trimmed[0];
    const g = trimmed[1] + trimmed[1];
    const b = trimmed[2] + trimmed[2];
    return `#${r}${g}${b}`.toLowerCase();
  }
  if (/^[0-9a-fA-F]{6}$/.test(trimmed)) {
    return `#${trimmed}`.toLowerCase();
  }
  return null;
}

export function hexToRgb(hex: string): RgbColor | null {
  const normalized = normalizeHex(hex);
  if (!normalized) return null;
  const num = parseInt(normalized.slice(1), 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

export function rgbToHex({ r, g, b }: RgbColor): string {
  const toHex = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function rgbToHsv({ r, g, b }: RgbColor): HsvColor {
  const rn = clamp(r, 0, 255) / 255;
  const gn = clamp(g, 0, 255) / 255;
  const bn = clamp(b, 0, 255) / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;

  let h = 0;
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }

  const s = max === 0 ? 0 : (d / max) * 100;
  const v = max * 100;
  return { h, s, v };
}

export function hsvToRgb({ h, s, v }: HsvColor): RgbColor {
  const hn = ((h % 360) + 360) % 360;
  const sn = clamp(s, 0, 100) / 100;
  const vn = clamp(v, 0, 100) / 100;

  const c = vn * sn;
  const x = c * (1 - Math.abs(((hn / 60) % 2) - 1));
  const m = vn - c;

  let r1 = 0;
  let g1 = 0;
  let b1 = 0;
  if (hn < 60) {
    r1 = c;
    g1 = x;
  } else if (hn < 120) {
    r1 = x;
    g1 = c;
  } else if (hn < 180) {
    g1 = c;
    b1 = x;
  } else if (hn < 240) {
    g1 = x;
    b1 = c;
  } else if (hn < 300) {
    r1 = x;
    b1 = c;
  } else {
    r1 = c;
    b1 = x;
  }

  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255),
  };
}

export function hsvToHex(hsv: HsvColor): string {
  return rgbToHex(hsvToRgb(hsv));
}

function getRelativeLuminance({ r, g, b }: RgbColor): number {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function parseHexOrFallback(value: string): string {
  return normalizeHex(value) ?? DEFAULT_FALLBACK_HEX;
}

export const ColorPickerPanel: React.FC<ColorPickerPanelProps> = ({
  value,
  onChange,
  presets = [],
  title,
  allowTransparent = false,
  compact = false,
}) => {
  const isTransparent = value === "transparent";
  const resolvedHex = useMemo(() => parseHexOrFallback(value), [value]);

  const [hsv, setHsv] = useState<HsvColor>(() => {
    const rgb = hexToRgb(resolvedHex) ?? { r: 26, g: 37, b: 64 };
    return rgbToHsv(rgb);
  });
  const [hexDraft, setHexDraft] = useState<string>(resolvedHex);

  const svAreaRef = useRef<HTMLDivElement | null>(null);
  const hueBarRef = useRef<HTMLDivElement | null>(null);
  const draggingTargetRef = useRef<"sv" | "hue" | null>(null);
  const latestHsvRef = useRef<HsvColor>(hsv);
  latestHsvRef.current = hsv;

  // Sync external color prop only when it represents a genuinely different RGB value,
  // preserving hue while dragging near black (v=0) or white/gray (s=0).
  useEffect(() => {
    setHexDraft(resolvedHex);
    const currentFromHsv = hsvToHex(latestHsvRef.current);
    if (currentFromHsv !== resolvedHex) {
      const rgb = hexToRgb(resolvedHex);
      if (rgb) {
        const nextHsv = rgbToHsv(rgb);
        // Preserve existing hue if new color is grayscale (s === 0)
        setHsv((prev) => ({
          h: nextHsv.s === 0 ? prev.h : nextHsv.h,
          s: nextHsv.s,
          v: nextHsv.v,
        }));
      }
    }
  }, [resolvedHex]);

  const supportsEyeDropper =
    typeof window !== "undefined" &&
    typeof (window as WindowWithEyeDropper).EyeDropper === "function";

  const activeRgb = useMemo(() => hsvToRgb(hsv), [hsv]);
  const activeHex = useMemo(() => rgbToHex(activeRgb), [activeRgb]);
  const isLightActive = useMemo(() => getRelativeLuminance(activeRgb) > 0.62, [activeRgb]);

  const updateFromHsv = useCallback(
    (next: HsvColor, commit: boolean) => {
      const normalized: HsvColor = {
        h: ((next.h % 360) + 360) % 360,
        s: clamp(next.s, 0, 100),
        v: clamp(next.v, 0, 100),
      };
      latestHsvRef.current = normalized;
      setHsv(normalized);
      const nextHex = hsvToHex(normalized);
      setHexDraft(nextHex);
      onChange(nextHex, commit);
    },
    [onChange]
  );

  const updateSvFromPointer = useCallback(
    (clientX: number, clientY: number, commit: boolean) => {
      const el = svAreaRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const s = clamp(((clientX - rect.left) / rect.width) * 100, 0, 100);
      const v = clamp((1 - (clientY - rect.top) / rect.height) * 100, 0, 100);
      updateFromHsv({ ...latestHsvRef.current, s, v }, commit);
    },
    [updateFromHsv]
  );

  const updateHueFromPointer = useCallback(
    (clientX: number, commit: boolean) => {
      const el = hueBarRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0) return;
      const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
      // Keep 360 slightly below 360 so hue slider doesn't snap back to x=0
      const h = ratio >= 1 ? 359.99 : ratio * 360;
      updateFromHsv({ ...latestHsvRef.current, h }, commit);
    },
    [updateFromHsv]
  );

  const handleSvPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    draggingTargetRef.current = "sv";
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore synthetic events where pointerId cannot be captured
    }
    updateSvFromPointer(e.clientX, e.clientY, false);
  };

  const handleSvPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (draggingTargetRef.current !== "sv") return;
    e.preventDefault();
    updateSvFromPointer(e.clientX, e.clientY, false);
  };

  const handleSvPointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (draggingTargetRef.current !== "sv") return;
    draggingTargetRef.current = null;
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignore release errors
    }
    updateSvFromPointer(e.clientX, e.clientY, true);
  };

  const handleHuePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    draggingTargetRef.current = "hue";
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore synthetic events
    }
    updateHueFromPointer(e.clientX, false);
  };

  const handleHuePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (draggingTargetRef.current !== "hue") return;
    e.preventDefault();
    updateHueFromPointer(e.clientX, false);
  };

  const handleHuePointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (draggingTargetRef.current !== "hue") return;
    draggingTargetRef.current = null;
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignore release errors
    }
    updateHueFromPointer(e.clientX, true);
  };

  const handleSvKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 10 : 2;
    let nextS = hsv.s;
    let nextV = hsv.v;
    if (e.key === "ArrowLeft") nextS -= step;
    else if (e.key === "ArrowRight") nextS += step;
    else if (e.key === "ArrowUp") nextV += step;
    else if (e.key === "ArrowDown") nextV -= step;
    else return;
    e.preventDefault();
    updateFromHsv({ ...hsv, s: nextS, v: nextV }, true);
  };

  const handleHueKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 18 : 4;
    let nextH = hsv.h;
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") nextH -= step;
    else if (e.key === "ArrowRight" || e.key === "ArrowUp") nextH += step;
    else return;
    e.preventDefault();
    updateFromHsv({ ...hsv, h: nextH }, true);
  };

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextRaw = e.target.value;
    setHexDraft(nextRaw);
    const trimmed = nextRaw.trim();
    if (/^#?[0-9a-fA-F]{6}$/.test(trimmed)) {
      const norm = normalizeHex(trimmed);
      if (norm) {
        const rgb = hexToRgb(norm);
        if (rgb) setHsv(rgbToHsv(rgb));
        onChange(norm, true);
      }
    }
  };

  const commitHexDraft = () => {
    const norm = normalizeHex(hexDraft);
    if (norm) {
      setHexDraft(norm);
      const rgb = hexToRgb(norm);
      if (rgb) setHsv(rgbToHsv(rgb));
      onChange(norm, true);
    } else {
      setHexDraft(activeHex);
    }
  };

  const handleRgbChannelChange = (channel: keyof RgbColor, raw: string) => {
    const parsed = parseInt(raw, 10);
    if (Number.isNaN(parsed)) return;
    const nextRgb: RgbColor = {
      ...activeRgb,
      [channel]: clamp(parsed, 0, 255),
    };
    const nextHsv = rgbToHsv(nextRgb);
    const nextHex = rgbToHex(nextRgb);
    setHsv((prev) => ({
      h: nextHsv.s === 0 ? prev.h : nextHsv.h,
      s: nextHsv.s,
      v: nextHsv.v,
    }));
    setHexDraft(nextHex);
    onChange(nextHex, true);
  };

  const handleEyeDropper = async () => {
    const EyeDropperCtor = (window as WindowWithEyeDropper).EyeDropper;
    if (!EyeDropperCtor) return;
    try {
      const result = await new EyeDropperCtor().open();
      const norm = normalizeHex(result.sRGBHex);
      if (norm) {
        setHexDraft(norm);
        const rgb = hexToRgb(norm);
        if (rgb) setHsv(rgbToHsv(rgb));
        onChange(norm, true);
      }
    } catch {
      // User cancelled eyedropper (AbortError) — ignore cleanly
    }
  };

  const handlePresetClick = (presetColor: string) => {
    if (presetColor === "transparent") {
      onChange("transparent", true);
      return;
    }
    const norm = normalizeHex(presetColor) ?? presetColor;
    setHexDraft(norm);
    const rgb = hexToRgb(norm);
    if (rgb) {
      const nextHsv = rgbToHsv(rgb);
      setHsv((prev) => ({
        h: nextHsv.s === 0 ? prev.h : nextHsv.h,
        s: nextHsv.s,
        v: nextHsv.v,
      }));
    }
    onChange(norm, true);
  };

  const hueColor = `hsl(${Math.round(hsv.h)}, 100%, 50%)`;

  return (
    <div
      className={`draw-cp-root${compact ? " is-compact" : ""}`}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {title && <div className="draw-cp-title">{title}</div>}

      {presets.length > 0 && (
        <div className="draw-cp-presets" role="group" aria-label="Preset colors">
          {presets.map((c) => {
            const normC = c === "transparent" ? "transparent" : (normalizeHex(c) ?? c.toLowerCase());
            const isSelected =
              c === "transparent"
                ? isTransparent
                : !isTransparent && normalizeHex(resolvedHex) === normC;
            const rgb = c === "transparent" ? null : hexToRgb(normC);
            const isLightPreset = rgb ? getRelativeLuminance(rgb) > 0.72 : true;
            return (
              <button
                key={c}
                type="button"
                className={`draw-cp-swatch${isSelected ? " is-selected" : ""}${
                  c === "transparent" ? " is-transparent" : ""
                }`}
                style={c === "transparent" ? undefined : { backgroundColor: c }}
                onClick={() => handlePresetClick(c)}
                title={c === "transparent" ? "No fill (Transparent)" : c.toUpperCase()}
                aria-label={`Color ${c}`}
                aria-pressed={isSelected}
              >
                {isSelected && (
                  <Check
                    size={11}
                    strokeWidth={3}
                    color={isLightPreset ? "#0f172a" : "#ffffff"}
                  />
                )}
              </button>
            );
          })}
        </div>
      )}

      {presets.length > 0 && <div className="draw-cp-divider" />}

      {/* 2D Saturation & Value Spectrum */}
      <div
        ref={svAreaRef}
        className="draw-cp-sv"
        style={{ backgroundColor: hueColor }}
        onPointerDown={handleSvPointerDown}
        onPointerMove={handleSvPointerMove}
        onPointerUp={handleSvPointerEnd}
        onPointerCancel={handleSvPointerEnd}
        onKeyDown={handleSvKeyDown}
        role="slider"
        tabIndex={0}
        aria-label="Saturation and brightness"
        aria-valuetext={`Saturation ${Math.round(hsv.s)}%, Brightness ${Math.round(hsv.v)}%`}
      >
        <div className="draw-cp-sv-white" />
        <div className="draw-cp-sv-black" />
        <div
          className="draw-cp-sv-thumb"
          style={{
            left: `${hsv.s}%`,
            top: `${100 - hsv.v}%`,
            backgroundColor: activeHex,
            borderColor: isLightActive ? "#0f172a" : "#ffffff",
          }}
        />
      </div>

      {/* Rainbow Hue Bar */}
      <div
        ref={hueBarRef}
        className="draw-cp-hue"
        onPointerDown={handleHuePointerDown}
        onPointerMove={handleHuePointerMove}
        onPointerUp={handleHuePointerEnd}
        onPointerCancel={handleHuePointerEnd}
        onKeyDown={handleHueKeyDown}
        role="slider"
        tabIndex={0}
        aria-label="Hue"
        aria-valuemin={0}
        aria-valuemax={360}
        aria-valuenow={Math.round(hsv.h)}
      >
        <div
          className="draw-cp-hue-thumb"
          style={{
            left: `${clamp((hsv.h / 360) * 100, 0, 100)}%`,
            backgroundColor: hueColor,
          }}
        />
      </div>

      {/* Preview + Eyedropper + Hex Input */}
      <div className="draw-cp-controls-row">
        <div
          className={`draw-cp-preview${isTransparent ? " is-transparent" : ""}`}
          style={isTransparent ? undefined : { backgroundColor: activeHex }}
          title={isTransparent ? "Transparent" : activeHex.toUpperCase()}
        />

        {supportsEyeDropper && (
          <button
            type="button"
            className="draw-cp-icon-btn"
            onClick={handleEyeDropper}
            title="Pick color from screen (Eyedropper)"
            aria-label="Pick color from screen"
          >
            <Pipette size={13} />
          </button>
        )}

        {allowTransparent && (
          <button
            type="button"
            className={`draw-cp-clear-btn${isTransparent ? " is-active" : ""}`}
            onClick={() => handlePresetClick("transparent")}
            title="Transparent (No Color)"
            aria-label="Transparent"
          >
            None
          </button>
        )}

        <input
          type="text"
          className="draw-cp-hex-input"
          value={isTransparent ? "transparent" : hexDraft}
          onChange={handleHexChange}
          onBlur={commitHexDraft}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              commitHexDraft();
              e.currentTarget.blur();
            } else if (e.key === "Escape") {
              setHexDraft(activeHex);
              e.currentTarget.blur();
            }
          }}
          spellCheck={false}
          maxLength={11}
          placeholder="#1a2540"
          aria-label="Hex color code"
          title="Enter hex code (#RRGGBB)"
        />
      </div>

      {/* R / G / B Numeric Inputs */}
      <div className="draw-cp-rgb-grid">
        {(["r", "g", "b"] as const).map((ch) => (
          <label key={ch} className="draw-cp-rgb-field">
            <span className="draw-cp-rgb-label">{ch.toUpperCase()}</span>
            <input
              type="number"
              className="draw-cp-rgb-input"
              min={0}
              max={255}
              value={activeRgb[ch]}
              onChange={(e) => handleRgbChannelChange(ch, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === "Escape") e.currentTarget.blur();
              }}
              aria-label={`${ch.toUpperCase()} channel value`}
            />
          </label>
        ))}
      </div>
    </div>
  );
};

export default ColorPickerPanel;
