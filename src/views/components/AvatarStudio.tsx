import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Camera,
  Check,
  Circle,
  Crop,
  FlipHorizontal,
  Link as LinkIcon,
  Move,
  RefreshCw,
  RotateCcw,
  RotateCw,
  Square,
  Timer,
  Trash2,
  Upload,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

const OUTPUT_AVATAR_SIZE = 256;

type AvatarShape = "circle" | "badge";
type StudioMode = "idle" | "crop" | "camera";

interface AvatarStudioProps {
  fullName: string;
  email: string;
  roleLabel: string;
  avatarUrl: string | null;
  avatarShape: AvatarShape;
  onStageAvatar: (url: string | null, shape: AvatarShape) => void;
}

interface DiceBearPreset {
  label: string;
  style?: string;
  background?: string;
}

const DICEBEAR_PRESETS: DiceBearPreset[] = [
  { label: "Social", style: "avataaars" },
  { label: "Anime", style: "lorelei" },
  { label: "Robot", style: "bottts" },
  { label: "Pixel Art", style: "pixel-art" },
  { label: "Notionist", style: "micah" },
  { label: "Smiley", style: "thumbs" },
  { label: "Cyber Rings", style: "rings" },
  { label: "Shapes", style: "shapes" },
  { label: "Grid", style: "identicon" },
  { label: "Indigo", style: "initials", background: "4f46e5" },
  { label: "Emerald", style: "initials", background: "059669" },
  { label: "Rose", style: "initials", background: "e11d48" },
];

const buildDiceBearUrl = (preset: DiceBearPreset, seed: string): string => {
  const params = new URLSearchParams({ seed, size: "512" });
  if (preset.background) params.set("backgroundColor", preset.background);
  return `https://api.dicebear.com/7.x/${preset.style}/svg?${params.toString()}`;
};

export default function AvatarStudio({
  fullName,
  email,
  roleLabel,
  avatarUrl,
  avatarShape,
  onStageAvatar,
}: AvatarStudioProps) {
  const [studioMode, setStudioMode] = useState<StudioMode>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [showUrlRow, setShowUrlRow] = useState(false);
  const [urlDraft, setUrlDraft] = useState("");

  // Interactive cropper state (PolicyPulse-style social media cropper)
  const [cropZoom, setCropZoom] = useState(1);
  const [cropRotation, setCropRotation] = useState(0);
  const [cropFlipH, setCropFlipH] = useState(false);
  const [cropPan, setCropPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDraggingCrop, setIsDraggingCrop] = useState(false);
  const [cropGuideShape, setCropGuideShape] = useState<AvatarShape>(avatarShape);
  const [cameFromCamera, setCameFromCamera] = useState(false);
  const [applyingCrop, setApplyingCrop] = useState(false);

  // Live camera state
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [mirrorCamera, setMirrorCamera] = useState(true);
  const [useTimer, setUseTimer] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement>(null);
  const cropImageRef = useRef<HTMLImageElement | null>(null);
  const cropStageCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cropPreviewBadgeRef = useRef<HTMLCanvasElement | null>(null);
  const cropPreviewCircleRef = useRef<HTMLCanvasElement | null>(null);
  const dragStartRef = useRef<{
    pointerX: number;
    pointerY: number;
    startPanX: number;
    startPanY: number;
  } | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const countdownTimerRef = useRef<number | null>(null);

  const seed = fullName.trim() || "Reviewer";
  const initials =
    seed
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("") || "R";

  // ==========================================================================
  // Camera stream management
  // ==========================================================================
  const stopCameraStream = useCallback(() => {
    if (countdownTimerRef.current) {
      window.clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setCountdown(null);
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraReady(false);
  }, []);

  useEffect(() => {
    return () => stopCameraStream();
  }, [stopCameraStream]);

  const startCamera = useCallback(
    async (preferredFacing: "user" | "environment" = facingMode) => {
      stopCameraStream();
      setCameraError("");
      setStudioMode("camera");

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError(
          "Live webcam access is not supported in this browser context. Use the button below to snap or choose a photo from your device."
        );
        return;
      }

      try {
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: preferredFacing },
              width: { ideal: 720 },
              height: { ideal: 720 },
            },
            audio: false,
          });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        }

        mediaStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setCameraReady(true);
      } catch {
        setCameraError(
          "Camera permission was denied or no camera was detected. You can grant camera access or use your device camera below."
        );
      }
    },
    [facingMode, stopCameraStream]
  );

  const captureCameraFrame = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return;

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const captureCanvas = document.createElement("canvas");
    captureCanvas.width = vw;
    captureCanvas.height = vh;
    const ctx = captureCanvas.getContext("2d");
    if (!ctx) return;

    ctx.save();
    if (mirrorCamera) {
      ctx.translate(vw, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, vw, vh);
    ctx.restore();

    const snappedDataUrl = captureCanvas.toDataURL("image/jpeg", 0.92);
    stopCameraStream();
    openCropperWithSource(snappedDataUrl, true);
  }, [mirrorCamera, stopCameraStream, openCropperWithSource]);

  const handleTriggerShutter = () => {
    if (!cameraReady || countdown !== null) return;
    if (!useTimer) {
      captureCameraFrame();
      return;
    }
    let remaining = 3;
    setCountdown(remaining);
    countdownTimerRef.current = window.setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        if (countdownTimerRef.current) {
          window.clearInterval(countdownTimerRef.current);
          countdownTimerRef.current = null;
        }
        setCountdown(null);
        captureCameraFrame();
      } else {
        setCountdown(remaining);
      }
    }, 900);
  };

  const handleToggleCameraFacing = () => {
    const nextFacing = facingMode === "user" ? "environment" : "user";
    setFacingMode(nextFacing);
    setMirrorCamera(nextFacing === "user");
    void startCamera(nextFacing);
  };

  const openCropperWithSource = useCallback((srcUrl: string, fromCamera = false) => {
    setErrorMsg("");
    let effectiveUrl = srcUrl;
    if (effectiveUrl.includes("api.dicebear.com") && !effectiveUrl.includes("size=")) {
      effectiveUrl = `${effectiveUrl}${effectiveUrl.includes("?") ? "&" : "?"}size=512`;
    }

    const rawImg = new Image();
    if (!effectiveUrl.startsWith("data:")) {
      rawImg.crossOrigin = "anonymous";
    }
    rawImg.onload = () => {
      const isSvgSource =
        effectiveUrl.includes("/svg") ||
        effectiveUrl.endsWith(".svg") ||
        effectiveUrl.startsWith("data:image/svg");

      // Normalize SVGs to a crisp 512x512 bitmap so stage (512), previews (96),
      // and saved output (256) match identically.
      if (isSvgSource || (rawImg.naturalWidth === 300 && rawImg.naturalHeight === 150)) {
        const normSize = 512;
        rawImg.width = normSize;
        rawImg.height = normSize;
        const offCanvas = document.createElement("canvas");
        offCanvas.width = normSize;
        offCanvas.height = normSize;
        const offCtx = offCanvas.getContext("2d");
        if (offCtx) {
          offCtx.drawImage(rawImg, 0, 0, normSize, normSize);
          const normalizedDataUrl = offCanvas.toDataURL("image/png");
          const normImg = new Image();
          normImg.onload = () => {
            cropImageRef.current = normImg;
            setCameFromCamera(fromCamera);
            setCropZoom(1);
            setCropRotation(0);
            setCropFlipH(false);
            setCropPan({ x: 0, y: 0 });
            setStudioMode("crop");
          };
          normImg.src = normalizedDataUrl;
          return;
        }
      }

      cropImageRef.current = rawImg;
      setCameFromCamera(fromCamera);
      setCropZoom(1);
      setCropRotation(0);
      setCropFlipH(false);
      setCropPan({ x: 0, y: 0 });
      setStudioMode("crop");
    };
    rawImg.onerror = () => {
      setErrorMsg("Unable to load that image for cropping. Please upload a PNG, JPG, or WebP file.");
    };
    rawImg.src = effectiveUrl;
  }, []);

  // ==========================================================================
  // Cropper core (clamped pan, canvas rendering, SVG normalization)
  // ==========================================================================
  const clampPan = useCallback(
    (rawPan: { x: number; y: number }, zoomVal: number, rotationVal: number) => {
      const img = cropImageRef.current;
      if (!img || !img.naturalWidth || !img.naturalHeight) {
        return { x: 0, y: 0 };
      }
      const isQuarterTurn = Math.abs(rotationVal % 180) === 90;
      const effW = isQuarterTurn ? img.naturalHeight : img.naturalWidth;
      const effH = isQuarterTurn ? img.naturalWidth : img.naturalHeight;

      const baseScale = Math.max(OUTPUT_AVATAR_SIZE / effW, OUTPUT_AVATAR_SIZE / effH);
      const totalScale = baseScale * zoomVal;

      const scaledW = effW * totalScale;
      const scaledH = effH * totalScale;

      const maxPanX = Math.max(0, (scaledW - OUTPUT_AVATAR_SIZE) / 2);
      const maxPanY = Math.max(0, (scaledH - OUTPUT_AVATAR_SIZE) / 2);

      return {
        x: Math.max(-maxPanX, Math.min(maxPanX, rawPan.x)),
        y: Math.max(-maxPanY, Math.min(maxPanY, rawPan.y)),
      };
    },
    []
  );

  const renderCropToCanvas = useCallback(
    (
      canvas: HTMLCanvasElement | null,
      targetSize: number,
      zoomVal: number,
      rotationVal: number,
      flipHVal: boolean,
      panVal: { x: number; y: number }
    ) => {
      const img = cropImageRef.current;
      if (!canvas || !img) return;
      const imgW = img.naturalWidth || img.width || 512;
      const imgH = img.naturalHeight || img.height || 512;
      if (!imgW || !imgH) return;

      if (canvas.width !== targetSize || canvas.height !== targetSize) {
        canvas.width = targetSize;
        canvas.height = targetSize;
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const isQuarterTurn = Math.abs(rotationVal % 180) === 90;
      const effW = isQuarterTurn ? imgH : imgW;
      const effH = isQuarterTurn ? imgW : imgH;

      const baseScale = Math.max(OUTPUT_AVATAR_SIZE / effW, OUTPUT_AVATAR_SIZE / effH);
      const totalScale = baseScale * zoomVal;
      const clamped = clampPan(panVal, zoomVal, rotationVal);
      const ratio = targetSize / OUTPUT_AVATAR_SIZE;

      ctx.save();
      ctx.clearRect(0, 0, targetSize, targetSize);
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, targetSize, targetSize);

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      ctx.translate(targetSize / 2 + clamped.x * ratio, targetSize / 2 + clamped.y * ratio);
      ctx.rotate((rotationVal * Math.PI) / 180);
      ctx.scale((flipHVal ? -1 : 1) * totalScale * ratio, totalScale * ratio);
      ctx.drawImage(img, -imgW / 2, -imgH / 2, imgW, imgH);
      ctx.restore();
    },
    [clampPan]
  );

  // Re-render stage + live mini previews whenever crop parameters change
  useEffect(() => {
    if (studioMode !== "crop" || !cropImageRef.current) return;
    renderCropToCanvas(cropStageCanvasRef.current, 512, cropZoom, cropRotation, cropFlipH, cropPan);
    renderCropToCanvas(
      cropPreviewBadgeRef.current,
      96,
      cropZoom,
      cropRotation,
      cropFlipH,
      cropPan
    );
    renderCropToCanvas(
      cropPreviewCircleRef.current,
      96,
      cropZoom,
      cropRotation,
      cropFlipH,
      cropPan
    );
  }, [studioMode, cropZoom, cropRotation, cropFlipH, cropPan, renderCropToCanvas]);

  const generateInitialsCanvasDataUrl = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";
    ctx.fillStyle = "#b45309";
    ctx.fillRect(0, 0, 512, 512);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 210px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(initials, 256, 266);
    return canvas.toDataURL("image/png");
  };

  const handleOpenCropForCurrentAvatar = () => {
    setCropGuideShape(avatarShape);
    if (avatarUrl && avatarUrl.trim()) {
      openCropperWithSource(avatarUrl.trim(), false);
    } else {
      const fallbackUrl = generateInitialsCanvasDataUrl();
      if (fallbackUrl) {
        openCropperWithSource(fallbackUrl, false);
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErrorMsg("Please select a valid image file (PNG, JPG, WebP, or SVG).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      openCropperWithSource(String(reader.result), false);
    };
    reader.readAsDataURL(file);
  };

  const handleApplyCroppedPhoto = async () => {
    if (!cropImageRef.current) return;
    setApplyingCrop(true);
    try {
      const outputCanvas = document.createElement("canvas");
      renderCropToCanvas(outputCanvas, OUTPUT_AVATAR_SIZE, cropZoom, cropRotation, cropFlipH, cropPan);
      const croppedDataUrl = outputCanvas.toDataURL("image/jpeg", 0.9);
      onStageAvatar(croppedDataUrl, cropGuideShape);
      setErrorMsg("");
      setStudioMode("idle");
    } finally {
      setApplyingCrop(false);
    }
  };

  // Pointer drag + wheel handlers for the interactive crop stage
  const handleStagePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDraggingCrop(true);
    dragStartRef.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      startPanX: cropPan.x,
      startPanY: cropPan.y,
    };
  };

  const handleStagePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingCrop || !dragStartRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const scaleFactor = OUTPUT_AVATAR_SIZE / Math.max(1, rect.width);
    const dx = (e.clientX - dragStartRef.current.pointerX) * scaleFactor;
    const dy = (e.clientY - dragStartRef.current.pointerY) * scaleFactor;
    const nextPan = clampPan(
      {
        x: dragStartRef.current.startPanX + dx,
        y: dragStartRef.current.startPanY + dy,
      },
      cropZoom,
      cropRotation
    );
    setCropPan(nextPan);
  };

  const handleStagePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingCrop) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
    }
    setIsDraggingCrop(false);
    dragStartRef.current = null;
  };

  const handleStageWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.0018;
    const nextZoom = Math.max(1, Math.min(3, Number((cropZoom + delta).toFixed(2))));
    setCropZoom(nextZoom);
    setCropPan((prev) => clampPan(prev, nextZoom, cropRotation));
  };

  const handleZoomChange = (nextZoomRaw: number) => {
    const nextZoom = Math.max(1, Math.min(3, Number(nextZoomRaw.toFixed(2))));
    setCropZoom(nextZoom);
    setCropPan((prev) => clampPan(prev, nextZoom, cropRotation));
  };

  const handleRotate = (deltaDeg: number) => {
    const nextRot = (cropRotation + deltaDeg + 360) % 360;
    setCropRotation(nextRot);
    setCropPan((prev) => clampPan(prev, cropZoom, nextRot));
  };

  const handleResetCrop = () => {
    setCropZoom(1);
    setCropRotation(0);
    setCropFlipH(false);
    setCropPan({ x: 0, y: 0 });
  };

  const handleLeaveStudioMode = () => {
    stopCameraStream();
    setStudioMode("idle");
  };

  const handleApplyUrlDraft = () => {
    const cleanUrl = urlDraft.trim();
    if (!cleanUrl) return;
    onStageAvatar(cleanUrl, avatarShape);
    setUrlDraft("");
    setShowUrlRow(false);
    setErrorMsg("");
  };

  const handleStageShape = (shape: AvatarShape) => {
    onStageAvatar(avatarUrl, shape);
  };

  const renderAvatarVisual = (sizeClass: string) => {
    if (avatarUrl) {
      return <img src={avatarUrl} alt={fullName || "Avatar"} className={`qb-studio-avatar-img ${sizeClass}`} draggable={false} />;
    }
    return (
      <span className={`qb-studio-avatar-initials ${sizeClass}`}>
        {initials}
      </span>
    );
  };

  return (
    <div className="qb-studio">
      {/* ================================================================
          MODE A: INTERACTIVE PHOTO CROPPER
      ================================================================ */}
      {studioMode === "crop" && (
        <div className="qb-studio-mode-card is-crop">
          <div className="qb-studio-mode-head">
            <div className="qb-studio-mode-icon is-crop">
              <Crop size={16} />
            </div>
            <div className="qb-studio-mode-titles">
              <h4>Crop &amp; Frame Photo</h4>
              <p>Drag to reposition · {OUTPUT_AVATAR_SIZE}×{OUTPUT_AVATAR_SIZE}px square</p>
            </div>

            <div className="qb-studio-guide-switch" role="group" aria-label="Crop mask guide">
              <button
                type="button"
                className={`qb-studio-guide-btn${cropGuideShape === "badge" ? " active" : ""}`}
                onClick={() => setCropGuideShape("badge")}
                title="Rounded badge mask guide"
              >
                <Square size={13} />
                <span>Badge</span>
              </button>
              <button
                type="button"
                className={`qb-studio-guide-btn${cropGuideShape === "circle" ? " active" : ""}`}
                onClick={() => setCropGuideShape("circle")}
                title="Circular mask guide"
              >
                <Circle size={13} />
                <span>Circle</span>
              </button>
            </div>
          </div>

          <div className="qb-studio-crop-layout">
            <div
              className={`qb-studio-stage${isDraggingCrop ? " is-dragging" : ""}`}
              onPointerDown={handleStagePointerDown}
              onPointerMove={handleStagePointerMove}
              onPointerUp={handleStagePointerUp}
              onPointerCancel={handleStagePointerUp}
              onWheel={handleStageWheel}
            >
              <canvas ref={cropStageCanvasRef} width={512} height={512} className="qb-studio-stage-canvas" />

              <div className="qb-studio-stage-overlay" aria-hidden="true">
                <div
                  className={`qb-studio-stage-guide ${cropGuideShape === "circle" ? "is-circle" : "is-badge"}`}
                />
                <div className={`qb-studio-stage-grid${isDraggingCrop ? " is-dragging" : ""}`}>
                  <span className="v1" />
                  <span className="v2" />
                  <span className="h1" />
                  <span className="h2" />
                </div>
                <div className="qb-studio-stage-hint">
                  <Move size={12} />
                  <span>Drag to pan</span>
                </div>
              </div>
            </div>

            <div className="qb-studio-crop-side">
              <div className="qb-studio-panel">
                <div className="qb-studio-panel-head">
                  <span>Output Shape &amp; Preview</span>
                  <span className="qb-studio-panel-mono">
                    {cropGuideShape === "circle" ? "Circle Active" : "Badge Active"}
                  </span>
                </div>
                <div className="qb-studio-shape-previews">
                  <button
                    type="button"
                    className={`qb-studio-shape-preview${cropGuideShape === "badge" ? " active" : ""}`}
                    onClick={() => setCropGuideShape("badge")}
                  >
                    <canvas ref={cropPreviewBadgeRef} width={96} height={96} className="is-badge" />
                    <span className="qb-studio-shape-preview-text">
                      <strong>Badge</strong>
                      <small>{cropGuideShape === "badge" ? "Selected" : "Square"}</small>
                    </span>
                  </button>
                  <button
                    type="button"
                    className={`qb-studio-shape-preview${cropGuideShape === "circle" ? " active" : ""}`}
                    onClick={() => setCropGuideShape("circle")}
                  >
                    <canvas ref={cropPreviewCircleRef} width={96} height={96} className="is-circle" />
                    <span className="qb-studio-shape-preview-text">
                      <strong>Circle</strong>
                      <small>{cropGuideShape === "circle" ? "Selected" : "Round"}</small>
                    </span>
                  </button>
                </div>
              </div>

              <div className="qb-studio-panel">
                <div className="qb-studio-panel-head">
                  <span className="qb-studio-panel-label">
                    <ZoomIn size={13} />
                    <span>Zoom</span>
                  </span>
                  <span className="qb-studio-panel-mono">{Math.round(cropZoom * 100)}%</span>
                </div>
                <div className="qb-studio-zoom-row">
                  <button type="button" className="qb-studio-icon-btn" onClick={() => handleZoomChange(cropZoom - 0.15)} title="Zoom Out">
                    <ZoomOut size={14} />
                  </button>
                  <input
                    type="range"
                    min={1}
                    max={3}
                    step={0.02}
                    value={cropZoom}
                    onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
                    className="qb-studio-zoom-slider"
                    aria-label="Zoom"
                  />
                  <button type="button" className="qb-studio-icon-btn" onClick={() => handleZoomChange(cropZoom + 0.15)} title="Zoom In">
                    <ZoomIn size={14} />
                  </button>
                </div>
              </div>

              <div className="qb-studio-transform-grid">
                <button type="button" className="qb-studio-tool-btn" onClick={() => handleRotate(-90)} title="Rotate 90° counter-clockwise">
                  <RotateCcw size={13} />
                  <span>-90°</span>
                </button>
                <button type="button" className="qb-studio-tool-btn" onClick={() => handleRotate(90)} title="Rotate 90° clockwise">
                  <RotateCw size={13} />
                  <span>+90°</span>
                </button>
                <button
                  type="button"
                  className={`qb-studio-tool-btn${cropFlipH ? " active" : ""}`}
                  onClick={() => setCropFlipH((prev) => !prev)}
                  title="Flip horizontal"
                >
                  <FlipHorizontal size={13} />
                  <span>Flip</span>
                </button>
                <button type="button" className="qb-studio-tool-btn" onClick={handleResetCrop} title="Reset pan, zoom & rotation">
                  <RefreshCw size={13} />
                  <span>Reset</span>
                </button>
              </div>
            </div>
          </div>

          <div className="qb-studio-mode-footer">
            {cameFromCamera ? (
              <button type="button" className="qb-studio-tool-btn" onClick={() => void startCamera(facingMode)}>
                <Camera size={13} />
                <span>Retake Photo</span>
              </button>
            ) : (
              <button type="button" className="qb-studio-tool-btn" onClick={() => fileInputRef.current?.click()}>
                <Upload size={13} />
                <span>Different Image</span>
              </button>
            )}
            <div className="qb-studio-mode-footer-actions">
              <button type="button" className="qb-studio-tool-btn" onClick={handleLeaveStudioMode}>
                Cancel
              </button>
              <button
                type="button"
                className="qb-studio-apply-btn"
                disabled={applyingCrop}
                onClick={() => void handleApplyCroppedPhoto()}
              >
                <Check size={13} />
                <span>{applyingCrop ? "Applying..." : "Apply Crop"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================
          MODE B: LIVE CAMERA CAPTURE
      ================================================================ */}
      {studioMode === "camera" && (
        <div className="qb-studio-mode-card is-camera">
          <div className="qb-studio-mode-head">
            <div className="qb-studio-mode-icon is-camera">
              <Camera size={16} />
            </div>
            <div className="qb-studio-mode-titles">
              <h4>Take a Profile Photo</h4>
              <p>Center yourself in the frame, then crop to fit</p>
            </div>
            <button type="button" className="qb-studio-tool-btn" onClick={handleLeaveStudioMode}>
              Back
            </button>
          </div>

          {cameraError ? (
            <div className="qb-studio-cam-error">
              <p>{cameraError}</p>
              <div className="qb-studio-cam-error-actions">
                <button type="button" className="qb-studio-apply-btn" onClick={() => nativeCameraInputRef.current?.click()}>
                  <Camera size={14} />
                  <span>Open Device Camera / Photo Picker</span>
                </button>
                <button type="button" className="qb-studio-tool-btn" onClick={() => void startCamera(facingMode)}>
                  <RefreshCw size={13} />
                  <span>Retry Webcam</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="qb-studio-cam-layout">
              <div className="qb-studio-viewfinder">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`qb-studio-video${mirrorCamera ? " is-mirrored" : ""}`}
                />
                <div className="qb-studio-viewfinder-guide" aria-hidden="true" />
                {countdown !== null && (
                  <div className="qb-studio-countdown" aria-hidden="true">
                    <span>{countdown}</span>
                  </div>
                )}
                {!cameraReady && (
                  <div className="qb-studio-cam-starting">
                    <RefreshCw size={18} className="qb-studio-spin" />
                    <span>Starting camera...</span>
                  </div>
                )}
              </div>

              <div className="qb-studio-cam-side">
                <button
                  type="button"
                  className="qb-studio-shutter-btn"
                  disabled={!cameraReady || countdown !== null}
                  onClick={handleTriggerShutter}
                >
                  <Camera size={15} />
                  <span>
                    {countdown !== null
                      ? `Capturing in ${countdown}...`
                      : useTimer
                        ? "Snap Photo (3s Timer)"
                        : "Snap Photo Now"}
                  </span>
                </button>

                <div className="qb-studio-cam-grid">
                  <button
                    type="button"
                    className={`qb-studio-tool-btn${mirrorCamera ? " active" : ""}`}
                    onClick={() => setMirrorCamera((prev) => !prev)}
                    title="Mirror selfie view"
                  >
                    <FlipHorizontal size={13} />
                    <span>Mirror</span>
                  </button>
                  <button
                    type="button"
                    className={`qb-studio-tool-btn${useTimer ? " active" : ""}`}
                    onClick={() => setUseTimer((prev) => !prev)}
                    title="Toggle 3-second countdown timer"
                  >
                    <Timer size={13} />
                    <span>3s Timer</span>
                  </button>
                  <button
                    type="button"
                    className="qb-studio-tool-btn"
                    onClick={handleToggleCameraFacing}
                    title="Switch front / rear camera"
                  >
                    <RefreshCw size={13} />
                    <span>Switch</span>
                  </button>
                </div>

                <div className="qb-studio-cam-browse">
                  <span>Prefer an existing image?</span>
                  <button
                    type="button"
                    onClick={() => {
                      stopCameraStream();
                      fileInputRef.current?.click();
                    }}
                  >
                    Browse files
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================================================================
          MODE C: IDENTITY SUMMARY, TOOLBAR & STYLE PRESETS
      ================================================================ */}
      {studioMode === "idle" && (
        <div className="qb-studio-idle">
          <div className="qb-studio-idle-head">
            <button
              type="button"
              className="qb-studio-avatar-btn"
              onClick={handleOpenCropForCurrentAvatar}
              title="Click to crop or adjust photo frame"
            >
              <span className={`qb-studio-avatar shape-${avatarShape}`}>
                {renderAvatarVisual("")}
              </span>
              <span className="qb-studio-avatar-crop-badge" aria-hidden="true">
                <Crop size={13} />
              </span>
            </button>

            <div className="qb-studio-identity">
              <div className="qb-studio-identity-name-row">
                <span className="qb-studio-identity-name">{fullName.trim() || "Reviewer"}</span>
                <span className="qb-studio-identity-role">{roleLabel}</span>
              </div>
              <span className="qb-studio-identity-email">{email}</span>
              <span className="qb-studio-identity-spec">
                {avatarShape === "circle" ? "Circle Avatar" : "Badge Avatar"} · {OUTPUT_AVATAR_SIZE}×{OUTPUT_AVATAR_SIZE}px
              </span>
            </div>

            <div className="qb-settings-shape-toggle-group" data-shape={avatarShape}>
              <div
                className={`qb-settings-shape-glider ${avatarShape === "circle" ? "is-circle" : "is-badge"}`}
                aria-hidden="true"
              />
              <button
                type="button"
                className={`qb-settings-shape-btn${avatarShape === "badge" ? " active" : ""}`}
                onClick={() => handleStageShape("badge")}
                aria-pressed={avatarShape === "badge"}
              >
                <span className="shape-icon badge-shape" />
                <span>Badge</span>
              </button>
              <button
                type="button"
                className={`qb-settings-shape-btn${avatarShape === "circle" ? " active" : ""}`}
                onClick={() => handleStageShape("circle")}
                aria-pressed={avatarShape === "circle"}
              >
                <span className="shape-icon circle-shape" />
                <span>Circle</span>
              </button>
            </div>
          </div>

          <div className="qb-studio-toolbar">
            <button type="button" className="qb-studio-upload-btn" onClick={() => fileInputRef.current?.click()}>
              <Upload size={14} />
              <span>Upload Photo</span>
            </button>
            <button type="button" className="qb-studio-tool-btn" onClick={() => void startCamera("user")}>
              <Camera size={13} />
              <span>Take Photo</span>
            </button>
            <button
              type="button"
              className="qb-studio-tool-btn"
              onClick={handleOpenCropForCurrentAvatar}
              title="Crop & reposition current photo"
            >
              <Crop size={13} />
              <span>Crop Photo</span>
            </button>
            <button
              type="button"
              className={`qb-studio-tool-btn${showUrlRow ? " active" : ""}`}
              onClick={() => setShowUrlRow((prev) => !prev)}
              title="Paste custom avatar URL"
            >
              <LinkIcon size={13} />
              <span>Image URL</span>
            </button>
            {avatarUrl && (
              <button
                type="button"
                className="qb-studio-tool-btn is-danger"
                onClick={() => onStageAvatar(null, avatarShape)}
                title="Reset to initials"
              >
                <Trash2 size={13} />
                <span>Remove Photo</span>
              </button>
            )}
          </div>

          {showUrlRow && (
            <div className="qb-studio-url-row">
              <input
                type="text"
                value={urlDraft}
                onChange={(e) => setUrlDraft(e.target.value)}
                placeholder="Paste image URL (https://...)"
                className="qb-studio-url-input"
                autoFocus
              />
              {urlDraft.trim().startsWith("http") && (
                <button
                  type="button"
                  className="qb-studio-url-crop-btn"
                  onClick={() => openCropperWithSource(urlDraft.trim(), false)}
                >
                  Crop &amp; Apply
                </button>
              )}
              <button type="button" className="qb-studio-tool-btn" onClick={handleApplyUrlDraft}>
                Apply
              </button>
              <button
                type="button"
                className="qb-studio-icon-btn"
                onClick={() => {
                  setShowUrlRow(false);
                  setUrlDraft("");
                }}
                aria-label="Close URL input"
              >
                <X size={14} />
              </button>
            </div>
          )}

          <div className="qb-studio-presets">
            <div className="qb-studio-presets-head">
              <span>Or choose a quick badge style</span>
              <span className="qb-studio-presets-count">{DICEBEAR_PRESETS.length} styles</span>
            </div>
            <div className="qb-studio-presets-row">
              <button
                type="button"
                className={`qb-studio-preset-chip${!avatarUrl ? " active" : ""}`}
                onClick={() => onStageAvatar(null, avatarShape)}
                title="Initials"
              >
                <span className={`qb-studio-preset-initials shape-${avatarShape}`}>{initials.slice(0, 1) || "R"}</span>
                <span>Initials</span>
              </button>
              {DICEBEAR_PRESETS.map((preset) => {
                const url = buildDiceBearUrl(preset, seed);
                const isSelected = avatarUrl === url;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    className={`qb-studio-preset-chip${isSelected ? " active" : ""}`}
                    onClick={() => onStageAvatar(url, avatarShape)}
                    title={preset.label}
                  >
                    <img
                      src={url}
                      alt=""
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      draggable={false}
                      className={`qb-studio-preset-img shape-${avatarShape}`}
                    />
                    <span>{preset.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="qb-studio-error" role="alert">
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Hidden inputs: file upload + native device camera capture */}
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} style={{ display: "none" }} />
      <input
        ref={nativeCameraInputRef}
        type="file"
        accept="image/*"
        capture="user"
        onChange={handleFileUpload}
        style={{ display: "none" }}
      />
    </div>
  );
}
