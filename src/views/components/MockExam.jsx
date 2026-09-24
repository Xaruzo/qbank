import React, { useState, useMemo } from "react";
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
  Target,
  Activity,
  Trophy,
} from "lucide-react";
import { formatAttemptDate, formatExamDuration } from "../../utils/mockExamAnalytics";
import { EXAM_PRESETS } from "../../constants/appConstants";
import LoadingSpinner from "./LoadingSpinner";

// Solid tier color for score meters: red < 50, amber 50–74, green 75+.
const scoreMeterClass = (pct) => (pct >= 75 ? " qb-mock-meter-high" : pct >= 50 ? " qb-mock-meter-mid" : " qb-mock-meter-low");

export default function MockExam({
  totalQuestions,
  proQuestionsCount,
  subProQuestionsCount,
  presets = EXAM_PRESETS,
  onStartProfessional,
  onStartSubprofessional,
  onStartExam,
  activeExam = null,
  isActiveExamLoading = false,
  onResumeActiveExam,
  history = [],
  isHistoryLoading = false,
  onReviewAttempt,
  onOpenAttempt,
  isAuthenticated,
  authAvailable,
  onRequireAuth,
}) {
  const [selectedPresetId, setSelectedPresetId] = useState("professional");

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

  return (
    <div className="fu qb-mock-page">
      <div className="qb-section-head qb-mock-page-head">
        <div>
          <div className="qb-section-kicker">Mock Exam Center</div>
          <h1 className="qb-section-title qb-section-title-lg">Official Civil Service Examination Presets</h1>
        </div>
        <span className="qb-exam-progress">{sortedHistory.length} saved attempts</span>
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
              {latestAttempt ? (latestAttempt.mode === "subprofessional" ? "Subpro" : "Pro") : "Goal 80%+"}
            </span>
          </div>

          <div className="qb-mock-mini-label">Latest Score</div>

          <div className="qb-mock-mini-value-row">
            <div className={`qb-mock-mini-value${latestAttempt ? "" : " qb-mock-mini-empty"}`}>
              {latestAttempt ? `${latestAttempt.scorePercent}%` : "--"}
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
              style={latestAttempt ? { width: `${Math.max(0, Math.min(100, latestAttempt.scorePercent || 0))}%` } : null}
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
              {sortedHistory.length ? `${recentAverage}%` : "--"}
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
              style={sortedHistory.length ? { width: `${Math.max(0, Math.min(100, recentAverage))}%` } : null}
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
                <>
                  <span>{improvement > 0 ? `+${improvement}%` : `${improvement}%`}</span>
                </>
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
              style={improvement === null ? null : { width: `${Math.max(0, Math.min(100, 50 + improvement / 2))}%` }}
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
              {bestAttempt ? (bestAttempt.mode === "subprofessional" ? "Subpro" : "Pro") : "Record"}
            </span>
          </div>

          <div className="qb-mock-mini-label">Best Attempt</div>

          <div className="qb-mock-mini-value-row">
            <div className={`qb-mock-mini-value${bestAttempt ? "" : " qb-mock-mini-empty"}`}>
              {bestAttempt ? `${bestAttempt.scorePercent}%` : "--"}
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
              style={bestAttempt ? { width: `${Math.max(0, Math.min(100, bestAttempt.scorePercent || 0))}%` } : null}
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
                  Resume Active {activeExam.mode === "subprofessional" ? "Subprofessional" : "Professional"} Exam
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
                Active session: <strong>{activeExam.mode === "subprofessional" ? "Subprofessional Level" : "Professional Level"}</strong> at question {(activeExam.currentIndex || 0) + 1} with {resumableAnsweredCount} answers saved.
              </div>
            )}
          </div>
        </div>

      {/* History of Saved Attempts */}
      <div className="qb-mock-history">
        <div className="qb-det-card qb-mock-history-list">
          <div className="qb-mock-section-head">
            <div>
              <div className="qb-mock-section-kicker">Saved Attempts</div>
              <div className="qb-mock-section-title">History & Presets</div>
              <div className="qb-mock-section-copy">Open past sessions to inspect score changes, unanswered items, and pacing over time.</div>
            </div>
            <span className="qb-exam-progress">{isHistoryLoading ? "Loading..." : `${sortedHistory.length} total`}</span>
          </div>

          {!isAuthenticated && authAvailable ? (
            <div className="qb-empty" style={{ padding: "48px 16px" }}>
              <div className="qb-empty-text">Sign in to view saved history</div>
              <div className="qb-empty-s" style={{ marginTop: 8 }}>
                Your mock exam attempts, trends, and subject breakdown are saved per account.
              </div>
              <button type="button" className="qb-mock-secondary-btn" style={{ marginTop: 16 }} onClick={onRequireAuth}>
                <ArrowUpRight size={16} />
                Sign In
              </button>
            </div>
          ) : isHistoryLoading ? (
            <LoadingSpinner centered text="Loading mock exam history..." />
          ) : !sortedHistory.length ? (
            <div className="qb-empty" style={{ padding: "48px 16px" }}>
              <div className="qb-empty-text">No mock exam history yet</div>
              <div className="qb-empty-s" style={{ marginTop: 8 }}>
                Finish a Professional (170-item) or Subprofessional (165-item) mock exam, and your score, subject breakdown, and reviewed questions will appear here.
              </div>
            </div>
          ) : (
            <div className="qb-mock-attempts">
              {sortedHistory.map((attempt, index) => {
                const isSubPro = attempt.mode === "subprofessional";
                return (
                  <button
                    key={attempt.id}
                    type="button"
                    className="qb-mock-attempt-card"
                    onClick={() => onOpenAttempt(attempt.id)}
                  >
                    <div className="qb-mock-attempt-top">
                      <div className="qb-mock-attempt-top-left">
                        <span className="qb-mock-attempt-rank">Attempt {sortedHistory.length - index}</span>
                        <span className={`qb-mock-attempt-tier-pill ${isSubPro ? "subpro" : "pro"}`}>
                          {isSubPro ? "Subprofessional" : "Professional"}
                        </span>
                      </div>
                      <span className="qb-mock-attempt-score">{attempt.scorePercent}%</span>
                    </div>
                    <div className="qb-mock-attempt-date">{formatAttemptDate(attempt.completedAt)}</div>
                    <div className="qb-mock-attempt-meta">
                      <span>{attempt.correctCount} correct</span>
                      <span>{attempt.unansweredCount} blank</span>
                      <span>{formatExamDuration(attempt.timeSpentMs)}</span>
                      <span>{attempt.totalCount} items</span>
                    </div>
                    <div className="qb-mock-attempt-link">
                      <span>Open attempt details</span>
                      <ArrowUpRight size={15} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

