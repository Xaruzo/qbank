import React, { useMemo } from "react";
import { ArrowUpRight, PlayCircle, RotateCcw } from "lucide-react";
import { formatAttemptDate, formatExamDuration } from "../../utils/mockExamAnalytics";

const DURATION_MS = (3 * 60 * 60 + 20 * 60) * 1000;

export default function MockExam({
  totalQuestions,
  onStartProfessional,
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

  return (
    <div className="fu">
      <div className="qb-det-hdr">
        <span className="qb-badge" style={{ padding: "6px 12px", borderRadius: 8, background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}>
          Mock Exams
        </span>
      </div>

      <div className="qb-mock-grid">
        <div className="qb-det-card">
          <div className="qb-exam-card">
            <div className="qb-exam-title">Professional</div>
            <div className="qb-exam-meta">
              <span>Time: {formatExamDuration(DURATION_MS)}</span>
              <span>Questions: {totalQuestions}</span>
              <span>Order: randomized</span>
            </div>
            <div className="qb-mock-hero-copy">
              Train with a full-length exam, then review saved attempts to track which subjects are improving and which topics still need work.
            </div>
            {!isAuthenticated && authAvailable && (
              <div className="qb-mock-hero-note">
                Sign in with Google to start a mock exam and save your personal attempt history.
              </div>
            )}
            <div className="qb-mock-hero-actions">
              <button type="button" className="qb-exam-start" onClick={onStartProfessional} disabled={totalQuestions === 0}>
                <PlayCircle size={16} />
                {isAuthenticated || !authAvailable ? "Start Mock Exam" : "Sign In to Start"}
              </button>
              {isAuthenticated && activeExam && (
                <button type="button" className="qb-mock-secondary-btn" onClick={onResumeActiveExam} disabled={isActiveExamLoading}>
                  <RotateCcw size={16} />
                  Resume Active Exam
                </button>
              )}
              {isAuthenticated && latestAttempt && (
                <button type="button" className="qb-mock-secondary-btn" onClick={() => onOpenAttempt(latestAttempt.id)}>
                  <ArrowUpRight size={16} />
                  Open Latest Attempt
                </button>
              )}
            </div>
            {isAuthenticated && activeExam && (
              <div className="qb-mock-hero-note">
                {resumableAnsweredCount}/{activeExam.totalCount || activeExam.orderIds?.length || 0} answered, resume from question {(activeExam.currentIndex || 0) + 1}.
              </div>
            )}
          </div>
        </div>

        <div className="qb-mock-insights">
          <div className="qb-mock-mini-card">
            <div className="qb-mock-mini-label">Latest Score</div>
            <div className="qb-mock-mini-value">{latestAttempt ? `${latestAttempt.scorePercent}%` : "--"}</div>
            <div className="qb-mock-mini-sub">
              {latestAttempt
                ? `${latestAttempt.correctCount}/${latestAttempt.totalCount} correct`
                : isAuthenticated
                  ? "No completed attempts yet"
                  : "Sign in to save your attempts"}
            </div>
          </div>

          <div className="qb-mock-mini-card">
            <div className="qb-mock-mini-label">Recent Average</div>
            <div className="qb-mock-mini-value">{sortedHistory.length ? `${recentAverage}%` : "--"}</div>
            <div className="qb-mock-mini-sub">
              {sortedHistory.length
                ? `Based on last ${Math.min(sortedHistory.length, 5)} attempts`
                : isAuthenticated
                  ? "Start one exam to unlock trends"
                  : "Available after sign-in"}
            </div>
          </div>

          <div className="qb-mock-mini-card">
            <div className="qb-mock-mini-label">Trend</div>
            <div className="qb-mock-mini-value">
              {improvement === null ? "--" : `${improvement > 0 ? "+" : ""}${improvement}%`}
            </div>
            <div className="qb-mock-mini-sub">
              {improvement === null ? "Need at least 2 attempts" : improvement >= 0 ? "Moving upward" : "Recent dip to review"}
            </div>
          </div>

          <div className="qb-mock-mini-card">
            <div className="qb-mock-mini-label">Best Attempt</div>
            <div className="qb-mock-mini-value">{bestAttempt ? `${bestAttempt.scorePercent}%` : "--"}</div>
            <div className="qb-mock-mini-sub">
              {bestAttempt ? formatAttemptDate(bestAttempt.completedAt) : isAuthenticated ? "No record yet" : "Sign in to track progress"}
            </div>
          </div>
        </div>
      </div>

      <div className="qb-mock-history">
        <div className="qb-det-card qb-mock-history-list">
          <div className="qb-mock-section-head">
            <div>
              <div className="qb-mock-section-kicker">Saved Attempts</div>
              <div className="qb-mock-section-title">History</div>
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
            <div className="qb-loading" style={{ minHeight: 220 }}>
              <div className="qb-loading-spinner" aria-hidden="true" />
              <div className="qb-loading-text">Loading mock exam history...</div>
            </div>
          ) : !sortedHistory.length ? (
            <div className="qb-empty" style={{ padding: "48px 16px" }}>
              <div className="qb-empty-text">No mock exam history yet</div>
              <div className="qb-empty-s" style={{ marginTop: 8 }}>
                Finish a mock exam and your score, subject breakdown, and reviewed questions will appear here.
              </div>
            </div>
          ) : (
            <div className="qb-mock-attempts">
              {sortedHistory.map((attempt, index) => (
                <button
                  key={attempt.id}
                  type="button"
                  className="qb-mock-attempt-card"
                  onClick={() => onOpenAttempt(attempt.id)}
                >
                  <div className="qb-mock-attempt-top">
                    <span className="qb-mock-attempt-rank">Attempt {sortedHistory.length - index}</span>
                    <span className="qb-mock-attempt-score">{attempt.scorePercent}%</span>
                  </div>
                  <div className="qb-mock-attempt-date">{formatAttemptDate(attempt.completedAt)}</div>
                  <div className="qb-mock-attempt-meta">
                    <span>{attempt.correctCount} correct</span>
                    <span>{attempt.unansweredCount} blank</span>
                    <span>{formatExamDuration(attempt.timeSpentMs)}</span>
                  </div>
                  <div className="qb-mock-attempt-link">
                    <span>Open attempt details</span>
                    <ArrowUpRight size={15} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
