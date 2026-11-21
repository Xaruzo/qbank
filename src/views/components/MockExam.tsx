import { useState, useMemo, useRef, useLayoutEffect, useEffect, useCallback, type ReactNode } from "react";
import {
  ArrowUpRight,
  PlayCircle,
  RotateCcw,
  TrendingDown,
  TrendingUp,
  Minus,
  GraduationCap,
  Briefcase,
  Sparkles,
  BookOpen,
  Calculator,
  Globe,
  BrainCircuit,
  ClipboardList,
  Layers,
  Target,
  Activity,
  Trophy,
  Zap,
  Clock,
  LayoutGrid,
  LayoutList,
} from "lucide-react";
import { formatAttemptDate, formatExamDuration, getAttemptModeLabel } from "../../utils/mockExamAnalytics";
import { EXAM_PRESETS, TOPICS } from "../../constants/appConstants";
import CustomSelect from "./CustomSelect";
import LoadingSpinner from "./LoadingSpinner";
import CountUp from "./CountUp";
import { useMeterReady } from "../../controllers/useMeterReady";

const TOPIC_ICON_MAP: Record<string, typeof Calculator> = {
  numerical: Calculator,
  verbal: BookOpen,
  general: Globe,
  analytical: BrainCircuit,
  clerical: ClipboardList,
};

// Solid tier color for score meters: red < 50, amber 50–74, green 75+.
const scoreMeterClass = (pct) => (pct >= 75 ? " qb-mock-meter-high" : pct >= 50 ? " qb-mock-meter-mid" : " qb-mock-meter-low");

interface QuickSegOption {
  id: string;
  label: ReactNode;
}

function QuickSegControl({
  ariaLabel,
  options,
  activeId,
  onSelect,
}: {
  ariaLabel: string;
  options: QuickSegOption[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [ready, setReady] = useState(false);
  const [rect, setRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null);

  const syncGlider = useCallback(() => {
    const btn = btnRefs.current[activeId];
    if (!btn || btn.offsetWidth === 0 || btn.offsetHeight === 0) return;
    setRect({
      left: btn.offsetLeft,
      top: btn.offsetTop,
      width: btn.offsetWidth,
      height: btn.offsetHeight,
    });
  }, [activeId]);

  useEffect(() => {
    const rafId = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(rafId);
  }, []);

  useLayoutEffect(() => {
    syncGlider();
    const el = containerRef.current;
    const ro = typeof ResizeObserver !== "undefined" && el ? new ResizeObserver(syncGlider) : null;
    if (ro && el) ro.observe(el);
    window.addEventListener("resize", syncGlider);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", syncGlider);
    };
  }, [syncGlider, options.length]);

  useEffect(() => {
    syncGlider();
  }, [activeId, syncGlider]);

  return (
    <div
      ref={containerRef}
      className={`qb-quick-seg${rect ? " has-glider" : ""}${ready ? " is-ready" : ""}`}
      role="group"
      aria-label={ariaLabel}
    >
      {rect && (
        <span
          className="qb-quick-seg-glider"
          aria-hidden="true"
          style={{
            width: `${rect.width}px`,
            height: `${rect.height}px`,
            transform: `translate3d(${rect.left}px, ${rect.top}px, 0)`,
          }}
        />
      )}
      {options.map((opt) => {
        const isActive = opt.id === activeId;
        return (
          <button
            key={opt.id}
            ref={(el) => { btnRefs.current[opt.id] = el; }}
            type="button"
            className={`qb-quick-seg-btn${isActive ? " is-active" : ""}`}
            aria-pressed={isActive}
            onClick={() => onSelect(opt.id)}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export default function MockExam({
  totalQuestions,
  proQuestionsCount = undefined,
  subProQuestionsCount = undefined,
  presets = EXAM_PRESETS,
  onStartProfessional,
  onStartSubprofessional = undefined,
  onStartExam = undefined,
  onStartQuickPractice = undefined,
  questions = [],
  masteryMap = {},
  activeExam = null,
  isActiveExamLoading = false,
  onResumeActiveExam,
  history = [],
  isHistoryLoading = false,
  onOpenAttempt,
  isAuthenticated,
  authAvailable,
  onRequireAuth,
}) {
  const [selectedPresetId, setSelectedPresetId] = useState("professional");
  const [quickCount, setQuickCount] = useState<10 | 20 | 30>(10);
  const [quickScope, setQuickScope] = useState<"all" | "unseen" | "missed">("all");
  const [quickTopic, setQuickTopic] = useState<string>("all");
  const [quickTimed, setQuickTimed] = useState<boolean>(true);
  const metersReady = useMeterReady(true);
  const [historyViewMode, setHistoryViewMode] = useState<"table" | "grid">(() => {
    try {
      const saved = window.localStorage?.getItem("qbank-mock-history-view");
      return saved === "grid" ? "grid" : "table";
    } catch {
      return "table";
    }
  });

  const handleHistoryViewChange = (mode: "table" | "grid") => {
    setHistoryViewMode(mode);
    try {
      window.localStorage?.setItem("qbank-mock-history-view", mode);
    } catch {
      // Ignore storage errors
    }
  };

  const sortedHistory = useMemo(
    () => [...history].sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()),
    [history]
  );

  const latestAttempt = sortedHistory[0] || null;
  const previousAttempt = sortedHistory[1] || null;
  const recentAverage = sortedHistory.length
    ? Math.round(sortedHistory.slice(0, 5).reduce((sum, attempt) => sum + (attempt.scorePercent || 0), 0) / Math.min(sortedHistory.length, 5))
    : 0;
  const bestAttempt = sortedHistory.reduce((best, attempt) => {
    if (!best) return attempt;
    return (attempt.scorePercent || 0) > (best.scorePercent || 0) ? attempt : best;
  }, null);
  const improvement = latestAttempt && previousAttempt
    ? (latestAttempt.scorePercent || 0) - (previousAttempt.scorePercent || 0)
    : null;
  const resumableAnsweredCount = Object.keys(activeExam?.answers || {}).length;

  const currentPreset = presets?.[selectedPresetId] || EXAM_PRESETS[selectedPresetId] || EXAM_PRESETS.professional;
  const proPreset = presets?.professional || EXAM_PRESETS.professional;
  const subProPreset = presets?.subprofessional || EXAM_PRESETS.subprofessional;

  const proCount = proQuestionsCount !== undefined ? proQuestionsCount : totalQuestions;
  const subProCount = subProQuestionsCount !== undefined ? subProQuestionsCount : totalQuestions;
  const currentAvailable = selectedPresetId === "subprofessional" ? subProCount : proCount;

  const handleStartCurrentPreset = () => {
    if (onStartExam) {
      onStartExam(selectedPresetId);
    } else if (selectedPresetId === "subprofessional" && onStartSubprofessional) {
      onStartSubprofessional();
    } else if (onStartProfessional) {
      onStartProfessional();
    }
  };

  const handleStartPreset = (presetId) => {
    setSelectedPresetId(presetId);
    if (onStartExam) {
      onStartExam(presetId);
    } else if (presetId === "subprofessional" && onStartSubprofessional) {
      onStartSubprofessional();
    } else if (onStartProfessional) {
      onStartProfessional();
    }
  };

  const quickMatchingCount = useMemo(() => {
    if (!Array.isArray(questions) || questions.length === 0) return totalQuestions || 0;
    return questions.filter((q) => {
      if (quickTopic !== "all" && q?.topic !== quickTopic) return false;
      const rec = masteryMap?.[q?.id];
      if (quickScope === "unseen") return !rec || !rec.attempts;
      if (quickScope === "missed") return rec?.lastResult === "wrong";
      return true;
    }).length;
  }, [questions, masteryMap, quickTopic, quickScope, totalQuestions]);

  const quickTopicOptions = useMemo(
    () => [
      {
        value: "all",
        label: "All Subjects",
        icon: (
          <Layers
            size={15}
            className="qb-topic-icon"
            style={{ color: "#f5a623", flexShrink: 0 }}
            data-colored="true"
          />
        ),
      },
      ...TOPICS.map((t) => {
        const Icon = TOPIC_ICON_MAP[t.id] || BookOpen;
        return {
          value: t.id,
          label: t.label,
          icon: (
            <Icon
              size={15}
              className="qb-topic-icon"
              style={{ color: t.color, flexShrink: 0 }}
              data-colored="true"
            />
          ),
        };
      }),
    ],
    []
  );

  const handleStartQuick = () => {
    if (onStartQuickPractice) {
      onStartQuickPractice({
        count: quickCount,
        scope: quickScope,
        topic: quickTopic,
        timed: quickTimed,
      });
    }
  };

  const getShortModeTag = (mode?: string) => {
    if (mode === "subprofessional") return "Subpro";
    if (mode === "drill") return "Drill";
    if (mode === "quick") return "Quick";
    return "Pro";
  };

  return (
    <div className="fu qb-mock-page">
      <div className="qb-section-head qb-mock-page-head">
        <div>
          <div className="qb-section-kicker">Mock Exam Center</div>
          <h1 className="qb-section-title qb-section-title-lg">Official Civil Service Examination Presets</h1>
        </div>
        <span className="qb-exam-progress tabular-nums">{sortedHistory.length} saved attempts</span>
      </div>

      {/* Performance Insights Overview Strip - Compact 4-card desktop row */}
      <div className="qb-mock-insights" role="region" aria-label="Exam Performance Overview">
        {/* Card 1: Latest Score */}
        <div className="qb-mock-mini-card">
          <div className="qb-mock-mini-header">
            <span className="qb-mock-mini-icon score-icon" aria-hidden="true">
              <Target size={15} />
            </span>
            <span className="qb-mock-mini-tag">
              {latestAttempt ? getShortModeTag(latestAttempt.mode) : "Goal 80%+"}
            </span>
          </div>

          <div className="qb-mock-mini-label">Latest Score</div>

          <div className="qb-mock-mini-value-row">
            <div className={`qb-mock-mini-value${latestAttempt ? "" : " qb-mock-mini-empty"}`}>
              {latestAttempt ? <CountUp end={latestAttempt.scorePercent || 0} duration={700} suffix="%" /> : "--"}
            </div>
            {latestAttempt && (
              <span className={`qb-mock-mini-badge${latestAttempt.scorePercent >= 80 ? " pass" : ""}`}>
                {latestAttempt.scorePercent >= 80 ? "Passed" : "Below 80%"}
              </span>
            )}
          </div>

          <div className="qb-mock-meter" aria-hidden="true">
            <span
              className={`qb-mock-meter-fill${latestAttempt ? scoreMeterClass(latestAttempt.scorePercent || 0) : " qb-mock-meter-idle"}`}
              style={
                latestAttempt
                  ? { width: `${metersReady ? Math.max(0, Math.min(100, latestAttempt.scorePercent || 0)) : 0}%` }
                  : null
              }
            />
          </div>

          <div className="qb-mock-mini-sub">
            {latestAttempt
              ? `${latestAttempt.correctCount}/${latestAttempt.totalCount} correct items`
              : isAuthenticated
                ? "No completed attempts yet"
                : "Sign in to record your scores"}
          </div>
        </div>

        {/* Card 2: Recent Average */}
        <div className="qb-mock-mini-card">
          <div className="qb-mock-mini-header">
            <span className="qb-mock-mini-icon avg-icon" aria-hidden="true">
              <Activity size={15} />
            </span>
            <span className="qb-mock-mini-tag">
              {sortedHistory.length > 0 ? `Last ${Math.min(sortedHistory.length, 5)} runs` : "0 runs"}
            </span>
          </div>

          <div className="qb-mock-mini-label">Recent Average</div>

          <div className="qb-mock-mini-value-row">
            <div className={`qb-mock-mini-value${sortedHistory.length ? "" : " qb-mock-mini-empty"}`}>
              {sortedHistory.length ? <CountUp end={recentAverage} duration={700} suffix="%" /> : "--"}
            </div>
            {sortedHistory.length > 0 && (
              <span className={`qb-mock-mini-badge${recentAverage >= 80 ? " pass" : ""}`}>
                {recentAverage >= 80 ? "Passing Pace" : "Keep Practicing"}
              </span>
            )}
          </div>

          <div className="qb-mock-meter" aria-hidden="true">
            <span
              className={`qb-mock-meter-fill${sortedHistory.length ? scoreMeterClass(recentAverage) : " qb-mock-meter-idle"}`}
              style={
                sortedHistory.length
                  ? {
                      width: `${metersReady ? Math.max(0, Math.min(100, recentAverage)) : 0}%`,
                      transitionDelay: metersReady ? "60ms" : "0ms",
                    }
                  : null
              }
            />
          </div>

          <div className="qb-mock-mini-sub">
            {sortedHistory.length
              ? `Based on last ${Math.min(sortedHistory.length, 5)} attempts`
              : isAuthenticated
                ? "Unlock trends with 1st exam"
                : "Available after sign-in"}
          </div>
        </div>

        {/* Card 3: Trend */}
        <div className="qb-mock-mini-card">
          <div className="qb-mock-mini-header">
            <span className={`qb-mock-mini-icon trend-icon${improvement > 0 ? " is-up" : improvement < 0 ? " is-down" : ""}`} aria-hidden="true">
              {improvement > 0 ? <TrendingUp size={15} /> : improvement < 0 ? <TrendingDown size={15} /> : <Minus size={15} />}
            </span>
            <span className="qb-mock-mini-tag">
              {improvement === null ? "Min 2 runs" : improvement > 0 ? "Rising" : improvement < 0 ? "Dip" : "Stable"}
            </span>
          </div>

          <div className="qb-mock-mini-label">Performance Trend</div>

          <div className="qb-mock-mini-value-row">
            <div className={`qb-mock-mini-value${improvement === null ? " qb-mock-mini-empty" : improvement > 0 ? " qb-mock-mini-up" : improvement < 0 ? " qb-mock-mini-down" : ""}`}>
              {improvement === null ? "--" : (
                <CountUp end={improvement} prefix={improvement > 0 ? "+" : ""} suffix="%" duration={700} />
              )}
            </div>
            {improvement !== null && (
              <span className={`qb-mock-mini-badge${improvement > 0 ? " pass" : ""}`}>
                {improvement > 0 ? "Gain" : improvement < 0 ? "Loss" : "Equal"}
              </span>
            )}
          </div>

          <div className="qb-mock-meter" aria-hidden="true">
            <span
              className={`qb-mock-meter-fill${improvement === null ? " qb-mock-meter-idle" : improvement > 0 ? " qb-mock-meter-up" : improvement < 0 ? " qb-mock-meter-down" : ""}`}
              style={
                improvement === null
                  ? null
                  : {
                      width: `${metersReady ? Math.max(0, Math.min(100, 50 + improvement / 2)) : 0}%`,
                      transitionDelay: metersReady ? "120ms" : "0ms",
                    }
              }
            />
          </div>

          <div className="qb-mock-mini-sub">
            {improvement === null
              ? "Requires 2+ completed runs"
              : improvement > 0
                ? "Higher score than previous run"
                : improvement < 0
                  ? "Lower score than previous run"
                  : "Identical to previous run"}
          </div>
        </div>

        {/* Card 4: Best Attempt */}
        <div className="qb-mock-mini-card">
          <div className="qb-mock-mini-header">
            <span className="qb-mock-mini-icon best-icon" aria-hidden="true">
              <Trophy size={15} />
            </span>
            <span className="qb-mock-mini-tag">
              {bestAttempt ? getShortModeTag(bestAttempt.mode) : "Record"}
            </span>
          </div>

          <div className="qb-mock-mini-label">Best Attempt</div>

          <div className="qb-mock-mini-value-row">
            <div className={`qb-mock-mini-value${bestAttempt ? "" : " qb-mock-mini-empty"}`}>
              {bestAttempt ? <CountUp end={bestAttempt.scorePercent || 0} duration={700} suffix="%" /> : "--"}
            </div>
            {bestAttempt && (
              <span className={`qb-mock-mini-badge${bestAttempt.scorePercent >= 80 ? " pass" : ""}`}>
                {bestAttempt.scorePercent >= 80 ? "Passing Score" : "Personal Best"}
              </span>
            )}
          </div>

          <div className="qb-mock-meter" aria-hidden="true">
            <span
              className={`qb-mock-meter-fill${bestAttempt ? scoreMeterClass(bestAttempt.scorePercent || 0) : " qb-mock-meter-idle"}`}
              style={
                bestAttempt
                  ? {
                      width: `${metersReady ? Math.max(0, Math.min(100, bestAttempt.scorePercent || 0)) : 0}%`,
                      transitionDelay: metersReady ? "180ms" : "0ms",
                    }
                  : null
              }
            />
          </div>

          <div className="qb-mock-mini-sub">
            {bestAttempt
              ? `${formatAttemptDate(bestAttempt.completedAt)} • ${bestAttempt.correctCount}/${bestAttempt.totalCount}`
              : isAuthenticated ? "No record yet" : "Sign in to record your best"}
          </div>
        </div>
      </div>

      {/* Main Exam Launcher Card */}
      <div className="qb-det-card qb-mock-hero-card">
        <div className="qb-exam-card">
            {/* Exam Preset Selection Switcher */}
            <div className="qb-preset-switcher" role="tablist" aria-label="Civil Service Exam Presets">
              <button
                type="button"
                role="tab"
                aria-selected={selectedPresetId === "professional"}
                className={`qb-preset-tab${selectedPresetId === "professional" ? " on is-pro" : ""}`}
                onClick={() => setSelectedPresetId("professional")}
              >
                <div className="qb-preset-tab-icon pro-icon">
                  <GraduationCap size={20} />
                </div>
                <div className="qb-preset-tab-info">
                  <div className="qb-preset-tab-title">
                    <span>Professional Level</span>
                    <span className="qb-preset-badge pro-badge">170 Items • 3h 10m</span>
                  </div>
                  <div className="qb-preset-tab-sub">Includes Analytical Ability • 2nd Level Positions</div>
                </div>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={selectedPresetId === "subprofessional"}
                className={`qb-preset-tab${selectedPresetId === "subprofessional" ? " on is-subpro" : ""}`}
                onClick={() => setSelectedPresetId("subprofessional")}
              >
                <div className="qb-preset-tab-icon subpro-icon">
                  <Briefcase size={20} />
                </div>
                <div className="qb-preset-tab-info">
                  <div className="qb-preset-tab-title">
                    <span>Subprofessional Level</span>
                    <span className="qb-preset-badge subpro-badge">165 Items • 2h 40m</span>
                  </div>
                  <div className="qb-preset-tab-sub">Includes Clerical Operations • 1st Level Positions</div>
                </div>
              </button>
            </div>

            {/* Active Preset Header Details */}
            <div className="qb-mock-hero-top">
              <div>
                <div className="qb-mock-preset-header">
                  <div className="qb-exam-title">
                    {currentPreset.name} Preset
                  </div>
                  <span className={`qb-preset-tier-pill ${selectedPresetId}`}>
                    {currentPreset.badge}
                  </span>
                </div>
                <div className="qb-mock-hero-copy">
                  {currentPreset.description}
                </div>
              </div>
              <div className="qb-exam-meta">
                <span>Time Limit: {currentPreset.durationLabel} ({Math.round(currentPreset.durationMs / 60000)} mins)</span>
                <span>Target: {currentPreset.totalItems} questions</span>
                <span>Bank Matching: {currentAvailable} items available</span>
              </div>
            </div>

            {/* Subject Area Coverage Breakdown */}
            <div className="qb-mock-subjects-section">
              <div className="qb-mock-subjects-label">
                <BookOpen size={13} />
                <span>Tested Subject Areas ({selectedPresetId === "subprofessional" ? "Subprofessional Scope" : "Professional Scope"}):</span>
              </div>
              <div className="qb-mock-subjects-grid">
                {currentPreset.subjects.map((sub) => {
                  const isSpecial = sub.id === "analytical" || sub.id === "clerical";
                  return (
                    <div
                      key={sub.id}
                      className={`qb-mock-subject-card${isSpecial ? (sub.id === "clerical" ? " highlight-subpro" : " highlight-pro") : ""}`}
                    >
                      <div className="qb-mock-subject-top">
                        <span className="qb-mock-subject-name">{sub.name}</span>
                        {isSpecial && (
                          <span className="qb-mock-subject-tag">
                            <Sparkles size={11} />
                            {sub.id === "clerical" ? "Subpro Exclusive" : "Pro Exclusive"}
                          </span>
                        )}
                      </div>
                      <div className="qb-mock-subject-desc">{sub.desc}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Blueprint Overview */}
            <div className="qb-mock-blueprint">
              <div className="qb-mock-blueprint-card">
                <span className="qb-mock-blueprint-label">CSC Standard Format</span>
                <strong>{currentPreset.totalItems} Items in {currentPreset.durationLabel}</strong>
                <p>Simulates real-world pacing with fixed exam duration and random question ordering.</p>
              </div>
              <div className="qb-mock-blueprint-card">
                <span className="qb-mock-blueprint-label">Session Continuity</span>
                <strong>{activeExam ? "Active session in progress" : "Ready to start"}</strong>
                <p>
                  {activeExam
                    ? `${activeExam.mode === "subprofessional" ? "Subprofessional" : "Professional"} run (${resumableAnsweredCount}/${activeExam.totalCount || activeExam.orderIds?.length || 0} answered).`
                    : "Answers auto-saved. Take a break and resume anytime without losing progress."}
                </p>
              </div>
              <div className="qb-mock-blueprint-card">
                <span className="qb-mock-blueprint-label">Analytics & Review</span>
                <strong>{latestAttempt ? `${latestAttempt.scorePercent}% latest score` : "Awaiting first run"}</strong>
                <p>Complete breakdown by subject area, pacing analysis, and answer review with step-by-step solutions.</p>
              </div>
            </div>

            {!isAuthenticated && authAvailable && (
              <div className="qb-mock-hero-note">
                Sign in with Google to start timed mock exams, record your attempts, and track subject performance across devices.
              </div>
            )}

            {/* Action Buttons */}
            <div className="qb-mock-hero-actions">
              <button
                type="button"
                className={`qb-exam-start${selectedPresetId === "subprofessional" ? " qb-exam-start-subpro" : ""}`}
                onClick={handleStartCurrentPreset}
                disabled={currentAvailable === 0}
              >
                <PlayCircle size={16} />
                {isAuthenticated || !authAvailable
                  ? `Start ${currentPreset.shortName} Exam (${currentPreset.durationLabel})`
                  : "Sign In to Start"}
              </button>

              {/* One-click quick launcher for the other preset */}
              <button
                type="button"
                className="qb-mock-secondary-btn"
                onClick={() => handleStartPreset(selectedPresetId === "professional" ? "subprofessional" : "professional")}
                disabled={(selectedPresetId === "professional" ? subProCount : proCount) === 0}
              >
                <PlayCircle size={15} />
                {selectedPresetId === "professional"
                  ? `Switch to Subprofessional (${subProPreset.durationLabel})`
                  : `Switch to Professional (${proPreset.durationLabel})`}
              </button>

              {isAuthenticated && activeExam && (
                <button type="button" className="qb-mock-secondary-btn qb-mock-resume-btn" onClick={onResumeActiveExam} disabled={isActiveExamLoading}>
                  <RotateCcw size={16} />
                  Resume Active {getAttemptModeLabel(activeExam.mode)} Session
                </button>
              )}

              {isAuthenticated && latestAttempt && (
                <button type="button" className="qb-mock-secondary-btn" onClick={() => onOpenAttempt(latestAttempt.id)}>
                  <ArrowUpRight size={16} />
                  Open Latest Attempt ({latestAttempt.scorePercent}%)
                </button>
              )}
            </div>

            {isAuthenticated && activeExam && (
              <div className="qb-mock-hero-note">
                Active session: <strong>{getAttemptModeLabel(activeExam.mode)}</strong> at question {(activeExam.currentIndex || 0) + 1} with {resumableAnsweredCount} answers saved.
              </div>
            )}
          </div>
        </div>

      {/* Minimalist Quick Practice Mode Builder (10 / 20 / 30 items) */}
      {onStartQuickPractice && (
        <section className="qb-det-card qb-quick-practice-card" aria-label="Quick Practice Mode">
          <div className="qb-quick-practice-head">
            <div>
              <div className="qb-mock-section-kicker">Focused Sprint</div>
              <h2 className="qb-quick-practice-title">Quick Practice Session</h2>
              <p className="qb-quick-practice-copy">
                Run a short practice set with your choice of item count, question pool, subject, and timer.
              </p>
            </div>
            <span className="qb-quick-practice-match tabular-nums">
              {quickMatchingCount} matching item{quickMatchingCount === 1 ? "" : "s"}
            </span>
          </div>

          <div className="qb-quick-practice-grid">
            <div className="qb-quick-control-group">
              <span className="qb-quick-control-label">Questions</span>
              <QuickSegControl
                ariaLabel="Number of questions"
                activeId={String(quickCount)}
                onSelect={(id) => setQuickCount(Number(id) as 10 | 20 | 30)}
                options={[
                  { id: "10", label: "10" },
                  { id: "20", label: "20" },
                  { id: "30", label: "30" },
                ]}
              />
            </div>

            <div className="qb-quick-control-group">
              <span className="qb-quick-control-label">Pool</span>
              <QuickSegControl
                ariaLabel="Question pool"
                activeId={quickScope}
                onSelect={(id) => setQuickScope(id as "all" | "unseen" | "missed")}
                options={[
                  { id: "all", label: "All" },
                  { id: "unseen", label: "Unseen" },
                  { id: "missed", label: "Missed" },
                ]}
              />
            </div>

            <div className="qb-quick-control-group">
              <span className="qb-quick-control-label">Subject</span>
              <CustomSelect
                value={quickTopic}
                onChange={setQuickTopic}
                options={quickTopicOptions}
                className="qb-quick-topic-select"
                showCheckmark
                portal
              />
            </div>

            <div className="qb-quick-control-group">
              <span className="qb-quick-control-label">Pacing</span>
              <QuickSegControl
                ariaLabel="Timer option"
                activeId={quickTimed ? "timed" : "untimed"}
                onSelect={(id) => setQuickTimed(id === "timed")}
                options={[
                  {
                    id: "timed",
                    label: (
                      <>
                        <Clock size={13} />
                        <span>Timed</span>
                      </>
                    ),
                  },
                  { id: "untimed", label: <span>Untimed</span> },
                ]}
              />
            </div>
          </div>

          <div className="qb-quick-practice-foot">
            <span className="qb-quick-practice-note tabular-nums">
              {quickTimed
                ? `Est. limit: ${Math.min(quickCount, quickMatchingCount)} min (1 min/item)`
                : "Untimed study run · elapsed stopwatch active"}
            </span>
            <button
              type="button"
              className="qb-quick-start-btn"
              onClick={handleStartQuick}
              disabled={quickMatchingCount === 0}
            >
              <Zap size={15} className="shrink-0" />
              <span className="tabular-nums">
                {quickMatchingCount === 0
                  ? "No Matching Items"
                  : `Start ${Math.min(quickCount, quickMatchingCount)}-Item Quick Practice`}
              </span>
            </button>
          </div>
        </section>
      )}

      {/* History of Saved Attempts */}
      <section className="qb-mock-history" aria-label="Saved Attempts History">
        <div className="rounded-2xl border border-qb-border bg-qb-surface p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-qb-accent">
                Saved Attempts
              </div>
              <h2 className="mt-0.5 text-lg sm:text-xl font-bold text-qb-heading">
                History &amp; Presets
              </h2>
              <p className="mt-0.5 text-xs sm:text-sm text-qb-muted">
                Open past sessions to inspect score changes, unanswered items, and pacing over time.
              </p>
            </div>

            <div className="flex items-center gap-2.5 self-start sm:self-center shrink-0">
              <span className="text-xs font-semibold text-qb-muted tabular-nums">
                {isHistoryLoading ? "Loading..." : `${sortedHistory.length} total`}
              </span>
              <div
                role="group"
                aria-label="History view mode"
                className="inline-flex items-center gap-1 rounded-xl border border-qb-border bg-qb-input p-1"
              >
                <button
                  type="button"
                  onClick={() => handleHistoryViewChange("table")}
                  aria-pressed={historyViewMode === "table"}
                  title="Table view"
                  aria-label="Table view"
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors cursor-pointer ${
                    historyViewMode === "table"
                      ? "bg-amber-500 text-[#070c18]"
                      : "text-qb-muted hover:text-qb-heading hover:bg-qb-surface-hover"
                  }`}
                >
                  <LayoutList size={15} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => handleHistoryViewChange("grid")}
                  aria-pressed={historyViewMode === "grid"}
                  title="Grid view"
                  aria-label="Grid view"
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors cursor-pointer ${
                    historyViewMode === "grid"
                      ? "bg-amber-500 text-[#070c18]"
                      : "text-qb-muted hover:text-qb-heading hover:bg-qb-surface-hover"
                  }`}
                >
                  <LayoutGrid size={15} aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>

          {!isAuthenticated && authAvailable ? (
            <div className="rounded-xl border border-qb-border bg-qb-input py-12 px-4 text-center">
              <div className="text-base font-bold text-qb-heading">Sign in to view saved history</div>
              <p className="mt-1.5 text-xs sm:text-sm text-qb-muted max-w-md mx-auto">
                Your mock exam attempts, trends, and subject breakdown are saved per account.
              </p>
              <button
                type="button"
                className="qb-mock-secondary-btn mt-4 inline-flex items-center gap-1.5"
                onClick={onRequireAuth}
              >
                <ArrowUpRight size={16} />
                <span>Sign In</span>
              </button>
            </div>
          ) : isHistoryLoading ? (
            <LoadingSpinner centered text="Loading mock exam history..." />
          ) : !sortedHistory.length ? (
            <div className="rounded-xl border border-qb-border bg-qb-input py-12 px-4 text-center">
              <div className="text-base font-bold text-qb-heading">No mock exam history yet</div>
              <p className="mt-1.5 text-xs sm:text-sm text-qb-muted max-w-lg mx-auto">
                Finish a Professional (170-item) or Subprofessional (165-item) mock exam, and your score, subject breakdown, and reviewed questions will appear here.
              </p>
            </div>
          ) : historyViewMode === "table" ? (
            <div className="overflow-x-auto rounded-xl border border-qb-border bg-qb-input">
              <table className="w-full min-w-[680px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-qb-border text-[10.5px] font-bold uppercase tracking-[0.08em] text-qb-muted">
                    <th className="py-3 pl-4 pr-3">Attempt</th>
                    <th className="py-3 px-3">Mode</th>
                    <th className="py-3 px-3">Score</th>
                    <th className="py-3 px-3">Breakdown</th>
                    <th className="py-3 px-3">Duration</th>
                    <th className="py-3 pl-3 pr-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-qb-border">
                  {sortedHistory.map((attempt, index) => {
                    const attemptNum = sortedHistory.length - index;
                    const passed = (attempt.scorePercent || 0) >= 80;
                    const midScore = !passed && (attempt.scorePercent || 0) >= 50;
                    const scoreTone = passed
                      ? "text-emerald-400 light:text-emerald-700"
                      : midScore
                        ? "text-amber-400 light:text-amber-700"
                        : "text-rose-400 light:text-rose-700";
                    const modeTone =
                      attempt.mode === "drill"
                        ? "text-rose-400 light:text-rose-700"
                        : attempt.mode === "quick"
                          ? "text-sky-400 light:text-sky-700"
                          : attempt.mode === "subprofessional"
                            ? "text-violet-400 light:text-violet-700"
                            : "text-emerald-400 light:text-emerald-700";
                    const totalItems = Number(attempt.totalCount) || 0;

                    return (
                      <tr
                        key={attempt.id}
                        onClick={() => onOpenAttempt(attempt.id)}
                        className="group transition-colors hover:bg-qb-surface-hover cursor-pointer"
                      >
                        <td className="py-3 pl-4 pr-3">
                          <div className="flex items-center gap-2.5">
                            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-qb-border bg-qb-surface text-xs font-bold text-qb-heading tabular-nums">
                              #{attemptNum}
                            </span>
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-qb-heading truncate">
                                {attempt.title?.trim() || `Attempt ${attemptNum}`}
                              </div>
                              <div className="text-xs text-qb-muted tabular-nums">
                                {formatAttemptDate(attempt.completedAt)}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className={`text-xs font-bold ${modeTone}`}>
                            {getAttemptModeLabel(attempt.mode)}
                          </span>
                          <div className="text-[11px] text-qb-muted tabular-nums">
                            {totalItems} {totalItems === 1 ? "item" : "items"}
                          </div>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap tabular-nums">
                          <div className={`text-sm font-extrabold ${scoreTone}`}>
                            {attempt.scorePercent}%
                          </div>
                          <div className="text-[11px] text-qb-muted">
                            {passed ? "Passing" : "Below 80%"}
                          </div>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap text-xs text-qb-mid tabular-nums">
                          <span>{attempt.correctCount} correct</span>
                          <span className="text-qb-muted" aria-hidden="true"> · </span>
                          <span>{attempt.unansweredCount} blank</span>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap text-xs font-medium text-qb-mid tabular-nums">
                          {formatExamDuration(attempt.timeSpentMs)}
                        </td>
                        <td className="py-3 pl-3 pr-4 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenAttempt(attempt.id);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-qb-border bg-qb-surface px-2.5 py-1.5 text-xs font-semibold text-qb-heading transition-colors group-hover:border-amber-500/45 group-hover:text-qb-accent cursor-pointer"
                          >
                            <span>Open</span>
                            <ArrowUpRight size={13} aria-hidden="true" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 max-h-[760px] overflow-y-auto pr-0.5">
              {sortedHistory.map((attempt, index) => {
                const attemptNum = sortedHistory.length - index;
                const passed = (attempt.scorePercent || 0) >= 80;
                const midScore = !passed && (attempt.scorePercent || 0) >= 50;
                const scoreTone = passed
                  ? "text-emerald-400 light:text-emerald-700"
                  : midScore
                    ? "text-amber-400 light:text-amber-700"
                    : "text-rose-400 light:text-rose-700";
                const modeTone =
                  attempt.mode === "drill"
                    ? "text-rose-400 light:text-rose-700"
                    : attempt.mode === "quick"
                      ? "text-sky-400 light:text-sky-700"
                      : attempt.mode === "subprofessional"
                        ? "text-violet-400 light:text-violet-700"
                        : "text-emerald-400 light:text-emerald-700";
                const totalItems = Number(attempt.totalCount) || 0;

                return (
                  <button
                    key={attempt.id}
                    type="button"
                    onClick={() => onOpenAttempt(attempt.id)}
                    className="group rounded-2xl border border-qb-border bg-qb-input p-4 flex flex-col justify-between gap-3 text-left transition-colors hover:border-amber-500/45 hover:bg-qb-surface-hover cursor-pointer"
                  >
                    <div className="space-y-2 w-full">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-qb-muted tabular-nums">
                            Attempt {attemptNum}
                          </span>
                          <span className="text-qb-muted" aria-hidden="true">·</span>
                          <span className={`text-xs font-bold truncate ${modeTone}`}>
                            {getAttemptModeLabel(attempt.mode)}
                          </span>
                        </div>
                        <span className={`text-2xl font-extrabold leading-none tabular-nums shrink-0 ${scoreTone}`}>
                          {attempt.scorePercent}%
                        </span>
                      </div>

                      <div className="text-sm font-semibold text-qb-heading">
                        {formatAttemptDate(attempt.completedAt)}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-qb-muted tabular-nums">
                        <span>{attempt.correctCount} correct</span>
                        <span aria-hidden="true">·</span>
                        <span>{attempt.unansweredCount} blank</span>
                        <span aria-hidden="true">·</span>
                        <span>{formatExamDuration(attempt.timeSpentMs)}</span>
                        <span aria-hidden="true">·</span>
                        <span>{totalItems} {totalItems === 1 ? "item" : "items"}</span>
                      </div>
                    </div>

                    <div className="w-full pt-2.5 border-t border-qb-border flex items-center justify-between text-xs font-bold text-qb-accent">
                      <span>Open attempt details</span>
                      <ArrowUpRight size={14} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

