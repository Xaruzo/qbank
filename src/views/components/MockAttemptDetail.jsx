import React, { useState } from "react";
import { AlertTriangle, ArrowUpRight, ChevronLeft, Clock3, Search, Trophy, TrendingUp } from "lucide-react";
import { LETTERS } from "../../constants/appConstants";
import { buildQuestionLookup, formatAttemptDate, formatExamDuration } from "../../utils/mockExamAnalytics";

export default function MockAttemptDetail({ attempt, qMap, onBack, onReviewAttempt }) {
  const [reviewSearch, setReviewSearch] = useState("");
  if (!attempt) return null;

  const questionLookup = buildQuestionLookup(qMap);

  const answeredQuestions = (attempt.questions || [])
    .filter((question) => question.wasAnswered)
    .map((question) => {
      const liveQuestion = questionLookup.get(question.id);
      return {
        ...question,
        question: liveQuestion?.question || question.question || "",
        correct: Number.isInteger(liveQuestion?.correct) ? liveQuestion.correct : question.correct,
      };
    });

  const filteredQuestions = !reviewSearch.trim()
    ? answeredQuestions
    : answeredQuestions.filter((q) => {
        const qry = reviewSearch.toLowerCase().trim();
        return [q.question || "", q.topic || "", q.label || ""].some((s) => s.toLowerCase().includes(qry));
      });


  return (
    <div className="qb-mock-attempt-detail fu">
      <div className="qb-det-hdr qb-det-hdr-attempt">
        <button className="qb-back" onClick={onBack} style={{ display: "flex", alignItems: "center" }}>
          <ChevronLeft size={16} style={{ marginRight: 4 }} />
          Back to Mock Exam
        </button>
        <div className="qb-mock-attempt-toolbar">
          <span className="qb-badge qb-exam-mode-badge qb-mock-attempt-badge">
            Attempt Details
          </span>
          <button type="button" className="qb-mock-secondary-btn qb-mock-attempt-open-btn" onClick={() => onReviewAttempt(attempt)}>
            <ArrowUpRight size={16} />
            Open Full Review
          </button>
          <span className="qb-exam-progress qb-mock-attempt-date-chip">{formatAttemptDate(attempt.completedAt)}</span>
        </div>
      </div>

      <div className="qb-exam-summary" style={{ marginBottom: 18 }}>
        <div className="qb-exam-summary-primary">
          <div className="qb-exam-summary-kicker">Saved Attempt</div>
          <div className="qb-exam-summary-scoreline">
            <div className="qb-exam-summary-n">{attempt.scorePercent}%</div>
            <div className="qb-exam-summary-copy">
              <span>{attempt.correctCount} correct out of {attempt.totalCount}</span>
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
            <span>{formatExamDuration(attempt.timeSpentMs)}</span>
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
              <div className="qb-mock-section-title">Performance</div>
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
              <div className="qb-mock-section-title">Reviewed Questions</div>
            </div>
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
              {filteredQuestions.map((question) => (
                <div key={`${attempt.id}-${question.id}-${question.index}`} className="qb-mock-question-card">
                  <div className="qb-mock-question-top">
                    <span className={`qb-mock-question-status${question.isCorrect ? " good" : question.wasAnswered ? " bad" : ""}`}>
                      {!question.wasAnswered ? "Skipped" : question.isCorrect ? "Correct" : "Wrong"}
                    </span>
                    <span className="qb-mock-question-index">Q{question.index + 1}</span>
                  </div>
                  <div className="qb-mock-question-text">{question.question || "Question text unavailable"}</div>
                  <div className="qb-mock-question-meta">
                    <span>Your answer: {question.wasAnswered ? LETTERS[question.userAnswer] : "--"}</span>
                    <span>Correct: {Number.isInteger(question.correct) ? LETTERS[question.correct] : "--"}</span>
                  </div>
                  <button type="button" className="qb-mock-inline-btn" onClick={() => onReviewAttempt(attempt, question.id)}>
                    Open Question Review
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="qb-empty" style={{ padding: "28px 12px" }}>
              <div className="qb-empty-s">{reviewSearch.trim() ? "No questions match your search." : "No answered questions were saved for this attempt."}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
