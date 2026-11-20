import { useState } from "react";
import { AlertTriangle, ArrowUpRight, ChevronLeft, Clock3, Search, Trophy, TrendingUp, Target } from "lucide-react";
import { LETTERS, TOPICS } from "../../constants/appConstants";
import { buildQuestionLookup, formatAttemptDate, formatExamDuration, calculatePacingStats, getAttemptModeLabel } from "../../utils/mockExamAnalytics";

export default function MockAttemptDetail({ attempt, qMap, onBack, onReviewAttempt, onStartDrillMistakes }) {
  const [reviewSearch, setReviewSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  if (!attempt) return null;

  const questionLookup = buildQuestionLookup(qMap);
  const pacing = calculatePacingStats(attempt.timeSpentMs, attempt.totalCount, attempt.mode);
  const missedCount = (attempt.wrongCount || 0) + (attempt.unansweredCount || 0);

  const allQuestions = (attempt.questions || []).map((question) => {
    const liveQuestion = questionLookup.get(question.id);
    return {
      ...question,
      question: liveQuestion?.question || question.question || "",
      correct: Number.isInteger(liveQuestion?.correct) ? liveQuestion.correct : question.correct,
      topic: liveQuestion?.topic || question.topic || "other",
    };
  });

  const filteredQuestions = allQuestions.filter((q) => {
    if (statusFilter === "wrong" && (!q.wasAnswered || q.isCorrect)) return false;
    if (statusFilter === "skipped" && q.wasAnswered) return false;
    if (statusFilter === "correct" && !q.isCorrect) return false;
    if (!reviewSearch.trim()) return true;
    const qry = reviewSearch.toLowerCase().trim();
    return [q.question || "", q.topic || "", q.label || ""].some((s) => s.toLowerCase().includes(qry));
  });

  const modeTitle =
    attempt.mode === "drill"
      ? `Mistake Drill (${attempt.totalCount} Items)`
      : attempt.mode === "quick"
        ? `Quick Practice (${attempt.totalCount} Items)`
        : attempt.mode === "subprofessional"
          ? "Subprofessional Level (165 Items)"
          : "Professional Level (170 Items)";

  const modeToneClass =
    attempt.mode === "drill"
      ? "text-rose-400 light:text-rose-700"
      : attempt.mode === "quick"
        ? "text-sky-400 light:text-sky-700"
        : attempt.mode === "subprofessional"
          ? "text-violet-400 light:text-violet-700"
          : "text-emerald-400 light:text-emerald-700";

  return (
    <div className="qb-mock-attempt-detail fu space-y-5">
      <header className="space-y-3.5 pb-5 border-b border-qb-border">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 rounded-xl border border-qb-border bg-qb-surface px-3 py-1.5 text-xs font-semibold text-qb-mid transition-colors hover:border-qb-border-hover hover:text-qb-heading cursor-pointer"
          >
            <ChevronLeft size={15} aria-hidden="true" />
            <span>Back to Mock Exam</span>
          </button>

          <span className="text-xs font-medium text-qb-muted tabular-nums">
            Completed {formatAttemptDate(attempt.completedAt)}
          </span>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-[0.08em]">
              <span className={modeToneClass}>{modeTitle}</span>
              <span className="text-qb-muted" aria-hidden="true">·</span>
              <span className="text-qb-muted tabular-nums">
                {attempt.totalCount} {attempt.totalCount === 1 ? "item" : "items"}
              </span>
            </div>
            <h1 className="mt-1 text-2xl sm:text-[26px] font-extrabold tracking-tight text-qb-heading leading-tight">
              Mock Attempt Breakdown
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-qb-muted tabular-nums">
              Review subject accuracy, exam pacing, and item-by-item answers for this attempt.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {missedCount > 0 && onStartDrillMistakes && (
              <button
                type="button"
                onClick={() => onStartDrillMistakes(attempt)}
                title={`Start a focused practice test with ${missedCount} missed/skipped items`}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-500/45 bg-amber-500/12 px-3.5 py-2.5 text-xs sm:text-sm font-bold text-amber-400 light:border-amber-600/40 light:bg-amber-50 light:text-amber-800 transition-colors hover:bg-amber-500/20 cursor-pointer whitespace-nowrap"
              >
                <Target size={15} aria-hidden="true" />
                <span className="tabular-nums">Drill Mistakes ({missedCount})</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => onReviewAttempt(attempt)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs sm:text-sm font-bold text-[#070c18] transition-colors hover:bg-amber-400 cursor-pointer whitespace-nowrap"
            >
              <ArrowUpRight size={16} aria-hidden="true" />
              <span>Open Full Review</span>
            </button>
          </div>
        </div>
      </header>

      <div className="qb-exam-summary">
        <div className="qb-exam-summary-primary">
          <div className="qb-exam-summary-kicker">
            Saved Attempt ({getAttemptModeLabel(attempt.mode)})
          </div>
          <div className="qb-exam-summary-scoreline">
            <div className="qb-exam-summary-n">{attempt.scorePercent}%</div>
            <div className="qb-exam-summary-copy">
              <span>{attempt.correctCount} correct out of {attempt.totalCount} items</span>
              <span>{formatExamDuration(attempt.timeSpentMs)} spent on this run</span>
            </div>
          </div>
        </div>
        <div className="qb-exam-summary-stats">
          <div className="qb-exam-summary-stat">
            <Trophy size={16} />
            <span>{attempt.correctCount} correct</span>
          </div>
          <div className="qb-exam-summary-stat">
            <AlertTriangle size={16} />
            <span>{attempt.wrongCount} wrong</span>
          </div>
          <div className="qb-exam-summary-stat">
            <Clock3 size={16} />
            <span>{pacing.formattedPace} ({pacing.assessment})</span>
          </div>
          <div className="qb-exam-summary-stat">
            <TrendingUp size={16} />
            <span>{attempt.answeredCount}/{attempt.totalCount} answered</span>
          </div>
        </div>
      </div>

      <div className="qb-mock-attempt-page">
        <div className="qb-det-card">
          <div className="qb-mock-section-head">
            <div>
              <div className="qb-mock-section-kicker">Attempt Summary</div>
              <div className="qb-mock-section-title">Performance & Pacing</div>
            </div>
          </div>

          <div className="qb-mock-strength-grid">
            <div className="qb-mock-strength-card good">
              <div className="qb-mock-strength-label">Strongest Subject</div>
              <div className="qb-mock-strength-value">
                {attempt.strongestTopic ? attempt.strongestTopic.label : "Not enough data"}
              </div>
              <div className="qb-mock-strength-sub">
                {attempt.strongestTopic ? `${attempt.strongestTopic.accuracy}% accuracy` : "Finish more attempts to compare topics"}
              </div>
            </div>

            <div className="qb-mock-strength-card warn">
              <div className="qb-mock-strength-label">Weakest Subject</div>
              <div className="qb-mock-strength-value">
                {attempt.weakestTopic ? attempt.weakestTopic.label : "Not enough data"}
              </div>
              <div className="qb-mock-strength-sub">
                {attempt.weakestTopic ? `${attempt.weakestTopic.accuracy}% accuracy` : "Finish more attempts to compare topics"}
              </div>
            </div>
          </div>

          <div className="qb-mock-pacing-panel">
            <div className="qb-mock-subtitle">Exam Pacing Benchmark</div>
            <div className="qb-mock-pacing-desc">
              Average pace on this exam was <strong>{pacing.secondsPerItem}s</strong> per question. Official Civil Service Commission recommended target is ~<strong>{pacing.targetSeconds}s</strong> per item.
            </div>
          </div>

          <div className="qb-mock-topic-breakdown">
            <div className="qb-mock-subtitle">Subject Breakdown</div>
            <div className="qb-mock-topic-list">
              {(attempt.topicStats || []).map((topic) => (
                <div key={topic.topicId} className="qb-mock-topic-row">
                  <div className="qb-mock-topic-main">
                    <span className="qb-mock-topic-dot" style={{ background: topic.color }} />
                    <span className="qb-mock-topic-name">{topic.label}</span>
                  </div>
                  <div className="qb-mock-topic-bar">
                    <span style={{ width: `${topic.accuracy}%`, background: topic.color }} />
                  </div>
                  <div className="qb-mock-topic-meta">
                    {topic.correct}/{topic.total} correct
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="qb-det-card">
          <div className="qb-mock-section-head">
            <div>
              <div className="qb-mock-section-kicker">Question Review</div>
              <div className="qb-mock-section-title">All Questions ({allQuestions.length})</div>
            </div>
          </div>

          <div className="qb-mock-review-filter-tabs">
            <button
              type="button"
              className={`qb-mock-review-tab${statusFilter === "all" ? " active" : ""}`}
              onClick={() => setStatusFilter("all")}
            >
              All ({allQuestions.length})
            </button>
            <button
              type="button"
              className={`qb-mock-review-tab wrong${statusFilter === "wrong" ? " active" : ""}`}
              onClick={() => setStatusFilter("wrong")}
            >
              Wrong ({attempt.wrongCount})
            </button>
            <button
              type="button"
              className={`qb-mock-review-tab skipped${statusFilter === "skipped" ? " active" : ""}`}
              onClick={() => setStatusFilter("skipped")}
            >
              Skipped ({attempt.unansweredCount})
            </button>
            <button
              type="button"
              className={`qb-mock-review-tab correct${statusFilter === "correct" ? " active" : ""}`}
              onClick={() => setStatusFilter("correct")}
            >
              Correct ({attempt.correctCount})
            </button>
          </div>

          <label className="qb-search-box" style={{ margin: "0 0 12px", minHeight: 40, borderRadius: 10 }}>
            <span className="qb-search-icon" style={{ left: 14 }}>
              <Search size={16} />
            </span>
            <input
              className="qb-search"
              style={{ padding: "0 12px 0 42px", minHeight: 38, fontSize: 13 }}
              placeholder="Search reviewed questions..."
              value={reviewSearch}
              onChange={e => setReviewSearch(e.target.value)}
            />
          </label>

          {filteredQuestions.length ? (
            <div className="qb-mock-question-list">
              {filteredQuestions.map((question) => {
                const topicObj = TOPICS.find((t) => t.id === question.topic);
                return (
                  <div key={`${attempt.id}-${question.id}-${question.index}`} className="qb-mock-question-card">
                    <div className="qb-mock-question-top">
                      <div className="qb-mock-question-tags">
                        <span className={`qb-mock-question-status${question.isCorrect ? " good" : question.wasAnswered ? " bad" : " skipped"}`}>
                          {!question.wasAnswered ? "Skipped" : question.isCorrect ? "Correct" : "Wrong"}
                        </span>
                        {topicObj && (
                          <span
                            className="qb-mock-question-topic"
                            style={{ color: topicObj.color, background: `${topicObj.color}18` }}
                          >
                            {topicObj.label}
                          </span>
                        )}
                      </div>
                      <span className="qb-mock-question-index">Q{question.index + 1}</span>
                    </div>
                    <div className="qb-mock-question-text">{question.question || "Question text unavailable"}</div>
                    <div className="qb-mock-question-meta">
                      <span>Your answer: <strong>{question.wasAnswered ? LETTERS[question.userAnswer] : "--"}</strong></span>
                      <span>Correct answer: <strong>{Number.isInteger(question.correct) ? LETTERS[question.correct] : "--"}</strong></span>
                    </div>
                    <button type="button" className="qb-mock-inline-btn" onClick={() => onReviewAttempt(attempt, question.id)}>
                      <span>Open Question Review</span>
                      <ArrowUpRight size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="qb-empty" style={{ padding: "28px 12px" }}>
              <div className="qb-empty-s">
                {reviewSearch.trim() || statusFilter !== "all"
                  ? "No questions match your filter."
                  : "No questions were recorded for this attempt."}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
