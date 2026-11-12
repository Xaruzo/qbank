import React, { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  X,
  ScanEye,
  Monitor,
  Tablet,
  Smartphone,
  Maximize2,
  Lightbulb,
  Search,
  CheckCircle2,
  Sparkles,
  Info,
  Minus,
  Plus,
} from "lucide-react";
import MarkdownText from "./MarkdownText";

export interface SolutionSizeEstimatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string | null;
  canvasWidth: number;
  canvasHeight: number;
  exportMultiplier?: number;
  questionContext?: {
    question?: string;
    solution?: string;
    choices?: string[];
    correct?: number;
    topic?: string;
    topicLabel?: string;
    label?: string;
  } | null;
  showSafeBounds?: boolean;
  onToggleSafeBounds?: (enabled: boolean) => void;
  onAdjustHeight?: (delta: number) => void;
}

const LETTERS = ["A", "B", "C", "D", "E"];

export default function SolutionSizeEstimatorModal({
  isOpen,
  onClose,
  imageSrc,
  canvasWidth,
  canvasHeight,
  exportMultiplier = 2,
  questionContext,
  showSafeBounds = false,
  onToggleSafeBounds,
  onAdjustHeight,
}: SolutionSizeEstimatorModalProps) {
  const [deviceMode, setDeviceMode] = useState<"desktop" | "tablet" | "mobile" | "native">("desktop");

  // Fallback realistic question context if none provided
  const question = questionContext?.question?.trim() || "What is the ratio of 1/4 to 3/5?";
  const solution =
    questionContext?.solution?.trim() ||
    "To find the ratio of 1/4 to 3/5, divide 1/4 by 3/5:\n\n$$\\frac{1}{4} \\div \\frac{3}{5} = \\frac{1}{4} \\times \\frac{5}{3} = \\frac{5}{12}$$\n\nTherefore, the ratio in standard notation is **5:12**.";
  const choices =
    questionContext?.choices && questionContext.choices.length > 0 && questionContext.choices.some(c => c.trim())
      ? questionContext.choices.slice(0, 4)
      : ["1:3", "3:20", "5:12", "3:4"];
  const correct = typeof questionContext?.correct === "number" ? questionContext.correct : 2;
  const topicLabel = questionContext?.topicLabel || "Numerical Ability";
  const label = questionContext?.label || "Ratio & Proportion";

  // Calculations
  const retinaWidth = Math.round(canvasWidth * exportMultiplier);
  const retinaHeight = Math.round(canvasHeight * exportMultiplier);
  const aspectRatio = canvasHeight > 0 ? (canvasWidth / canvasHeight).toFixed(2) : "1.00";

  // Estimated file size from base64 string
  const estimatedFileSizeKB = useMemo(() => {
    if (!imageSrc) return "0";
    const base64Length = imageSrc.length - (imageSrc.indexOf(",") + 1);
    const approxBytes = Math.round((base64Length * 3) / 4);
    return Math.max(1, Math.round(approxBytes / 1024)).toString();
  }, [imageSrc]);

  // Width in pixels of simulated solution container
  const containerWidthMap = {
    desktop: 680,
    tablet: 520,
    mobile: 340,
    native: canvasWidth,
  };
  const simulatedContainerWidth = containerWidthMap[deviceMode];

  // Rendered height of diagram inside container
  const renderedDiagramHeight = Math.round((simulatedContainerWidth / canvasWidth) * canvasHeight);
  const scalePercent = Math.round((simulatedContainerWidth / canvasWidth) * 100);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="qb-sol-estimator-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sol-estimator-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="qb-sol-estimator-container">
        {/* Header */}
        <div className="qb-sol-estimator-header">
          {/* Top Row: Title, Icon, Badge, and Close Button */}
          <div className="qb-sol-estimator-header-top">
            <div className="qb-sol-estimator-header-left">
              <div className="qb-sol-estimator-icon-wrap" aria-hidden="true">
                <ScanEye size={22} className="qb-sol-estimator-icon" />
              </div>
              <div className="qb-sol-estimator-title-block">
                <div className="qb-sol-estimator-title-row">
                  <h3 id="sol-estimator-title" className="qb-sol-estimator-title">
                    Solution Display Size & Resolution Estimator
                  </h3>
                  <span className="qb-sol-estimator-badge">
                    <Sparkles size={13} /> Real-time Simulation
                  </span>
                </div>
                <p className="qb-sol-estimator-sub">
                  Shows exactly how this diagram scales and renders on the question card just below the problem choices.
                </p>
              </div>
            </div>

            <button
              type="button"
              className="qb-sol-estimator-close-btn"
              onClick={onClose}
              aria-label="Close estimator"
              title="Close (Esc)"
            >
              <X size={20} />
            </button>
          </div>

          {/* Viewport device switcher strip (dedicated row, spacious & responsive) */}
          <div className="qb-sol-estimator-devices-row">
            <div className="qb-sol-estimator-devices" role="group" aria-label="Device viewport mode">
              <button
                type="button"
                className={`qb-sol-device-btn${deviceMode === "desktop" ? " is-active" : ""}`}
                onClick={() => setDeviceMode("desktop")}
                title="Desktop Solution Card (~680px width)"
              >
                <Monitor size={18} className="qb-sol-device-icon" />
                <span className="qb-sol-device-label">Desktop (680px)</span>
              </button>
              <button
                type="button"
                className={`qb-sol-device-btn${deviceMode === "tablet" ? " is-active" : ""}`}
                onClick={() => setDeviceMode("tablet")}
                title="Tablet Solution Card (~520px width)"
              >
                <Tablet size={18} className="qb-sol-device-icon" />
                <span className="qb-sol-device-label">Tablet (520px)</span>
              </button>
              <button
                type="button"
                className={`qb-sol-device-btn${deviceMode === "mobile" ? " is-active" : ""}`}
                onClick={() => setDeviceMode("mobile")}
                title="Mobile Solution Card (~340px width)"
              >
                <Smartphone size={18} className="qb-sol-device-icon" />
                <span className="qb-sol-device-label">Mobile (340px)</span>
              </button>
              <button
                type="button"
                className={`qb-sol-device-btn${deviceMode === "native" ? " is-active" : ""}`}
                onClick={() => setDeviceMode("native")}
                title="1:1 Native Canvas Resolution"
              >
                <Maximize2 size={18} className="qb-sol-device-icon" />
                <span className="qb-sol-device-label">1:1 Native</span>
              </button>
            </div>
          </div>
        </div>

        {/* Technical Metrics Strip */}
        <div className="qb-sol-estimator-metrics-strip">
          <div className="qb-sol-metric-card">
            <span className="qb-sol-metric-label">Export / Retina Resolution</span>
            <div className="qb-sol-metric-val tabular-nums">
              {retinaWidth} × {retinaHeight} <span className="qb-sol-metric-unit">px</span>
            </div>
            <span className="qb-sol-metric-sub">
              {exportMultiplier}× HiDPI rasterization · Razor-sharp formulas
            </span>
          </div>

          <div className="qb-sol-metric-card">
            <span className="qb-sol-metric-label">Solution Display Size</span>
            <div className="qb-sol-metric-val tabular-nums">
              {simulatedContainerWidth} × {renderedDiagramHeight} <span className="qb-sol-metric-unit">px</span>
            </div>
            <span className="qb-sol-metric-sub">
              Aspect Ratio {aspectRatio}:1 · Responsive 100% width
            </span>
          </div>

          <div className="qb-sol-metric-card">
            <span className="qb-sol-metric-label">Display Scale Factor</span>
            <div className="qb-sol-metric-val tabular-nums">
              {scalePercent}% <span className="qb-sol-metric-unit">scale</span>
            </div>
            <span className="qb-sol-metric-sub">
              {deviceMode === "mobile"
                ? "Auto-scaled for phone screens"
                : "Optimal reading size · Zero horizontal scroll"}
            </span>
          </div>

          <div className="qb-sol-metric-card">
            <span className="qb-sol-metric-label">Estimated PNG Weight</span>
            <div className="qb-sol-metric-val tabular-nums">
              ~{estimatedFileSizeKB} <span className="qb-sol-metric-unit">KB</span>
            </div>
            <span className="qb-sol-metric-sub">
              <CheckCircle2 size={15} className="qb-sol-metric-ok-icon text-emerald-400 inline mr-1" />
              Ultra-lightweight · Instant load for test-takers
            </span>
          </div>
        </div>

        {/* Main Body: Scrollable Question & Solution Mockup */}
        <div className="qb-sol-estimator-body">
          <div className="qb-sol-estimator-body-intro">
            <Info size={18} className="qb-sol-estimator-info-icon" />
            <span>
              Below is the exact view examinees see when they reveal the step-by-step solution for this question:
            </span>
          </div>

          <div
            className="qb-sol-mockup-frame"
            style={{
              maxWidth: simulatedContainerWidth > 0 ? `min(${simulatedContainerWidth}px, 100%)` : "100%",
            }}
          >
            {/* Question Card Box */}
            <div className="qb-sol-mockup-card">
              {/* Question Meta Header */}
              <div className="qb-sol-mockup-meta">
                <span className="qb-sol-mockup-topic-tag">
                  {topicLabel}
                </span>
                {label && (
                  <span className="qb-sol-mockup-label-tag">
                    {label}
                  </span>
                )}
                <span className="qb-sol-mockup-mode-pill">
                  {deviceMode.toUpperCase()} VIEW ({simulatedContainerWidth}px)
                </span>
              </div>

              {/* Question Text */}
              <div className="qb-sol-mockup-question-text">
                <MarkdownText text={question} />
              </div>

              {/* Answer Choices (Centered and Aligned) */}
              <div className="qb-choices-group qb-sol-mockup-choices" role="radiogroup">
                {choices.map((choiceText, index) => {
                  const isCorrect = index === correct;
                  return (
                    <div
                      key={index}
                      className={`qb-choice ${isCorrect ? "correct" : ""}`}
                      style={{ cursor: "default", pointerEvents: "none" }}
                    >
                      <span className="qb-choice-l">{LETTERS[index]}</span>
                      <MarkdownText text={choiceText} inline className="qb-choice-content" />
                      {isCorrect && (
                        <span className="qb-choice-indicator ok">
                          <CheckCircle2 size={18} />
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Step-by-Step Solution Block just below the question */}
              <div className="qb-sol qb-sol-mockup-solution-block">
                <div className="qb-sol-header">
                  <div className="qb-sol-title">
                    <Lightbulb size={18} className="qb-sol-icon" />
                    <span>Step-by-Step Solution & Explanation</span>
                  </div>
                  <span className="qb-sol-mockup-solution-badge">Live Attached Diagram</span>
                </div>

                {solution && (
                  <div className="qb-sol-body">
                    <MarkdownText text={solution} />
                  </div>
                )}

                {/* The Solution Media Box with the Whiteboard Drawing */}
                <div className="qb-sol-media-box qb-sol-mockup-media-box">
                  <div className="qb-sol-mockup-media-header">
                    <span className="qb-sol-mockup-media-dim tabular-nums">
                      Diagram: {retinaWidth} × {retinaHeight} px · Rendered: {simulatedContainerWidth} × {renderedDiagramHeight} px
                    </span>
                    <span className="qb-sol-mockup-media-scale">
                      Scale: {scalePercent}%
                    </span>
                  </div>

                  {imageSrc ? (
                    <img
                      src={imageSrc}
                      alt="Solution whiteboard diagram preview"
                      className="qb-sol-img qb-sol-mockup-diagram-img"
                    />
                  ) : (
                    <div className="qb-sol-mockup-empty">
                      <Sparkles size={28} />
                      <span>Draw on the whiteboard canvas to see your solution preview live</span>
                    </div>
                  )}

                  <div className="qb-expand-hint qb-sol-mockup-expand-hint">
                    <Search size={15} />
                    <span>Click diagram to expand & zoom in full vector fidelity</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="qb-sol-estimator-footer">
          <div className="qb-sol-estimator-footer-left">
            {onToggleSafeBounds && (
              <label className="qb-sol-estimator-toggle-label">
                <input
                  type="checkbox"
                  checked={showSafeBounds}
                  onChange={(e) => onToggleSafeBounds(e.target.checked)}
                  className="qb-sol-estimator-checkbox"
                />
                <span className="qb-sol-estimator-toggle-text">
                  Show Solution Safe Area overlay on Whiteboard canvas
                </span>
              </label>
            )}

            {onAdjustHeight && (
              <div className="qb-sol-estimator-height-group">
                <span className="qb-sol-estimator-height-label">Canvas Height:</span>
                <div className="qb-sol-estimator-height-stepper">
                  <button
                    type="button"
                    className="qb-sol-estimator-h-btn"
                    onClick={() => onAdjustHeight(-150)}
                    title="Reduce Canvas Height by 150px"
                  >
                    <Minus size={15} />
                    <span>150px</span>
                  </button>
                  <span className="qb-sol-estimator-h-val tabular-nums">{canvasHeight}px</span>
                  <button
                    type="button"
                    className="qb-sol-estimator-h-btn"
                    onClick={() => onAdjustHeight(200)}
                    title="Add 200px Vertical Space"
                  >
                    <Plus size={15} />
                    <span>200px</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="qb-sol-estimator-footer-right">
            <button
              type="button"
              className="qb-sol-estimator-back-btn"
              onClick={onClose}
            >
              Back to Canvas
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
