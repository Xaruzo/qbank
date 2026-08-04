import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Flag, X, Search, AlertTriangle, CheckCircle2, Clock3, Target } from "lucide-react";
import MarkdownText from "./MarkdownText";
import { LETTERS, TOPICS } from "../../constants/appConstants";
import { calculateExamMetrics } from "../../utils/mockExamAnalytics";
import usePlainTextCopy from "../../utils/usePlainTextCopy";

const formatClock = (ms) => {
  const t = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

export default function MockExamRunner({ exam, qMap, onUpdateExam, onExit }) {
  const [now, setNow] = useState(Date.now());
  const [showSol, setShowSol] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const questionScrollRef = useRef(null);
  const expandedScrollRef = useRef(null);
  const expandedImgRef = useRef(null);
  const copyAreaRef = useRef(null);
  usePlainTextCopy(copyAreaRef);
  const [expandedZoom, setExpandedZoom] = useState(1);

  const endAt = exam.startedAt + exam.durationMs;
  const remainingMs = Math.max(0, endAt - now);
  const finished = exam.finished || remainingMs <= 0;
  const metrics = useMemo(() => calculateExamMetrics(exam, qMap, now), [exam, qMap, now]);
  const questionLookup = metrics.questionLookup;
  const currentId = exam.orderIds[exam.currentIndex] || null;
  const q = currentId ? questionLookup.get(currentId) : null;

  const jumpTo = (index) => {
    onUpdateExam((prev) => {
      const nextIndex = Math.max(0, Math.min(prev.orderIds.length - 1, index));
      if (nextIndex === prev.currentIndex) return prev;
      const leavingId = prev.orderIds[prev.currentIndex] || null;
      const leavingAnswered = leavingId ? (prev.answers[leavingId] !== undefined) : false;
      const leavingReview = leavingId ? !!(prev.review && prev.review[leavingId]) : false;
      if (!finished && leavingId && !leavingAnswered && !leavingReview) {
        return { ...prev, currentIndex: nextIndex, review: { ...(prev.review || {}), [leavingId]: true } };
      }
      return { ...prev, currentIndex: nextIndex };
    });
  };

  const goPrev = () => {
    onUpdateExam((prev) => {
      const nextIndex = Math.max(0, prev.currentIndex - 1);
      if (nextIndex === prev.currentIndex) return prev;
      const leavingId = prev.orderIds[prev.currentIndex] || null;
      const leavingAnswered = leavingId ? (prev.answers[leavingId] !== undefined) : false;
      const leavingReview = leavingId ? !!(prev.review && prev.review[leavingId]) : false;
      if (!finished && leavingId && !leavingAnswered && !leavingReview) {
        return { ...prev, currentIndex: nextIndex, review: { ...(prev.review || {}), [leavingId]: true } };
      }
      return { ...prev, currentIndex: nextIndex };
    });
  };

  const goNext = () => {
    onUpdateExam((prev) => {
      const nextIndex = Math.min(prev.orderIds.length - 1, prev.currentIndex + 1);
      if (nextIndex === prev.currentIndex) return prev;
      const leavingId = prev.orderIds[prev.currentIndex] || null;
      const leavingAnswered = leavingId ? (prev.answers[leavingId] !== undefined) : false;
      const leavingReview = leavingId ? !!(prev.review && prev.review[leavingId]) : false;
      if (!finished && leavingId && !leavingAnswered && !leavingReview) {
        return { ...prev, currentIndex: nextIndex, review: { ...(prev.review || {}), [leavingId]: true } };
      }
      return { ...prev, currentIndex: nextIndex };
    });
  };

  const goPrevRef = useRef(goPrev);
  const goNextRef = useRef(goNext);
  goPrevRef.current = goPrev;
  goNextRef.current = goNext;

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        if ((e.key === 'ArrowLeft' && exam.currentIndex > 0) || (e.key === 'ArrowRight' && exam.currentIndex < exam.orderIds.length - 1)) {
          e.preventDefault();
          document.activeElement?.blur();
          if (e.key === 'ArrowLeft') goPrevRef.current();
          else goNextRef.current();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [exam.currentIndex, exam.orderIds.length]);

  const removeCurrentQuestion = () => {
    onUpdateExam((prev) => {
      const newOrderIds = [...prev.orderIds];
      newOrderIds.splice(prev.currentIndex, 1);
      const newCurrentIndex = Math.min(prev.currentIndex, newOrderIds.length - 1);
      return {
        ...prev,
        orderIds: newOrderIds,
        currentIndex: newCurrentIndex,
        totalCount: newOrderIds.length
      };
    });
  };
  const pick = currentId ? (exam.answers[currentId] ?? null) : null;
  const solImg = q?.solutionDraw ? (typeof q.solutionDraw === "string" ? q.solutionDraw : q.solutionDraw.dataURL) : q?.solutionUpload || null;
  const totalCount = Number.isFinite(exam.totalCount) ? exam.totalCount : exam.orderIds.length;
  const reviewMap = exam.review || {};
  const isMarkedReview = currentId ? !!reviewMap[currentId] : false;

  useEffect(() => {
    if (finished) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [finished]);

  useEffect(() => {
    if (!finished) return;
    if (!exam.finished) onUpdateExam((prev) => ({ ...prev, finished: true }));
  }, [finished, exam.finished, onUpdateExam]);

  useEffect(() => {
    setShowSol(false);
    setExpanded(false);
    setExpandedZoom(1);
  }, [currentId, finished]);

  useEffect(() => {
    const el = questionScrollRef.current;
    if (!el) return;
    el.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [currentId]);

  useEffect(() => {
    if (!expanded) return;
    setExpandedZoom(1);
    const el = expandedScrollRef.current;
    if (!el) return;
    el.scrollLeft = 0;
    el.scrollTop = 0;
  }, [expanded]);

  const answeredCount = metrics.answeredCount;
  const reviewCount = metrics.reviewCount;
  const score = finished ? metrics.correctCount : null;
  const examLabel = exam.isReviewSession ? "Saved Review" : "Professional";
  const examStats = [
    { value: `${exam.currentIndex + 1}/${totalCount}`, label: "Question" },
    { value: answeredCount, label: "Answered" },
    { value: reviewCount, label: "Review" }
  ];

  const finishExam = () => onUpdateExam((prev) => ({ ...prev, finished: true }));
  const toggleReview = () => {
    if (!currentId || finished) return;
    onUpdateExam((prev) => {
      const next = { ...(prev.review || {}) };
      if (next[currentId]) delete next[currentId];
      else next[currentId] = true;
      return { ...prev, review: next };
    });
  };

  const examHeader = (
    <div className="qb-exam-top">
      <div className="qb-exam-head-card">
        <div className="qb-det-hdr qb-det-hdr-exam">
          <button className="qb-back" onClick={onExit} style={{ display: "flex", alignItems: "center" }}>
            <ChevronLeft size={16} style={{ marginRight: 4 }} />
            Exit
          </button>
          <span className="qb-badge qb-exam-mode-badge">
            {examLabel}
          </span>
        </div>
        <div className="qb-exam-head-meta">
          <div className="qb-exam-head-stats">
            {examStats.map((stat) => (
              <div key={stat.label} className="qb-exam-stat-chip">
                <span className="qb-exam-stat-value">{stat.value}</span>
                <span className="qb-exam-stat-label">{stat.label}</span>
              </div>
            ))}
          </div>
          {!finished && (
            <button type="button" className="qb-exam-flag qb-exam-flag-head" onClick={finishExam} title="Finish exam">
              <Flag size={16} />
              Finish
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const examSidePanel = (
    <div className="qb-exam-side">
      <div className="qb-exam-side-inner">
        <div className="qb-exam-timer-card">
          <div className="qb-exam-timer-label">{finished ? "Time Used" : "Time Remaining"}</div>
          <div className={`qb-exam-timer-big${!finished && remainingMs <= 5 * 60 * 1000 ? " qb-exam-timer-warn" : ""}`}>
            {formatClock(finished ? metrics.timeSpentMs : remainingMs)}
          </div>
          <div className="qb-exam-timer-row">
            {!finished ? (
              <button type="button" className={`qb-exam-mark${isMarkedReview ? " on" : ""}`} onClick={toggleReview}>
                <Flag size={16} />
                {isMarkedReview ? "Needs review" : "Mark review"}
              </button>
            ) : (
              <span className="qb-exam-timer-chip">Review mode</span>
            )}
          </div>
        </div>

        <div className="qb-exam-qgrid-card">
          <div className="qb-exam-qgrid-h">
            Questions
            <span className="qb-exam-qgrid-hs">{exam.currentIndex + 1}/{totalCount}</span>
          </div>
          <div className="qb-exam-qgrid">
            {Array.from({ length: totalCount }).map((_, i) => {
              const id = exam.orderIds[i];
              const answered = id ? (exam.answers[id] !== undefined) : false;
              const review = id ? !!reviewMap[id] : false;
              const isCurrent = i === exam.currentIndex;
              let cls = "qb-qnum-btn";
              if (!id) cls += " qb-qnum-dis";
              else if (review) cls += " qb-qnum-review";
              else if (answered) cls += " qb-qnum-ans";
              else cls += " qb-qnum-empty";
              if (isCurrent) cls += " qb-qnum-cur";

              return (
                <button
                  key={i}
                  type="button"
                  className={cls}
                  onClick={() => jumpTo(i)}
                  disabled={!id}
                  title={id ? `Go to question ${i + 1}` : `Question ${i + 1} unavailable`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
          <div className="qb-exam-legend">
            <div className="qb-exam-legend-item">
              <span className="qb-exam-dot qb-exam-dot-empty" />
              Unanswered
            </div>
            <div className="qb-exam-legend-item">
              <span className="qb-exam-dot qb-exam-dot-ans" />
              Answered
            </div>
            <div className="qb-exam-legend-item">
              <span className="qb-exam-dot qb-exam-dot-review" />
              Needs review
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const zoomExpandedAt = (clientX, clientY, nextZoom) => {
    const scrollEl = expandedScrollRef.current;
    const imgEl = expandedImgRef.current;
    if (!scrollEl || !imgEl) return;
    const rect = imgEl.getBoundingClientRect();
    const rx = rect.width ? (clientX - rect.left) / rect.width : 0.5;
    const ry = rect.height ? (clientY - rect.top) / rect.height : 0.5;
    const clampedX = Math.max(0, Math.min(1, rx));
    const clampedY = Math.max(0, Math.min(1, ry));
    setExpandedZoom(nextZoom);
    window.requestAnimationFrame(() => {
      const s = expandedScrollRef.current;
      const img = expandedImgRef.current;
      if (!s || !img) return;
      const targetLeft = img.offsetWidth * clampedX - s.clientWidth / 2;
      const targetTop = img.offsetHeight * clampedY - s.clientHeight / 2;
      s.scrollLeft = Math.max(0, targetLeft);
      s.scrollTop = Math.max(0, targetTop);
    });
  };

  const toggleExpandedZoom = (clientX, clientY) => {
    const nextZoom = expandedZoom === 1 ? 2 : 1;
    zoomExpandedAt(clientX, clientY, nextZoom);
  };

  const onPick = (i) => {
    if (!q || finished) return;
    onUpdateExam((prev) => {
      const nextReview = { ...(prev.review || {}) };
      delete nextReview[q.id];
      return {
        ...prev,
        answers: { ...prev.answers, [q.id]: i },
        review: nextReview
      };
    });
  };

  if (!q) {
    return (
    <div className="qb-exam-run fu" ref={copyAreaRef}>
        <div className="qb-exam-shell">
          {examHeader}
          {examSidePanel}
          <div className="qb-exam-layout">
          <div className="qb-exam-main">
            <div className="qb-det-card">
              <div ref={questionScrollRef} className="qb-exam-card-scroll">
                <div className="qb-empty">
                  <div className="qb-empty-text">Question not found</div>
                  <div className="qb-empty-s" style={{ marginBottom: 14 }}>This question appears to be missing or removed.</div>
                  <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                    <button 
                      type="button" 
                      className="qb-fsave" 
                      onClick={removeCurrentQuestion}
                      style={{ background: "#fb7185", color: "#fff" }}
                    >
                      Remove This Question
                    </button>
                    <button 
                      type="button" 
                      className="qb-fcancel" 
                      onClick={goNext}
                    >
                      Skip to Next Question
                    </button>
                  </div>
                </div>
              </div>
              <div className="qb-exam-nav">
                <button type="button" className="qb-exam-navbtn" onClick={goPrev} disabled={exam.currentIndex === 0}>
                  <ChevronLeft size={16} />
                  Prev
                </button>
                <button type="button" className="qb-exam-navbtn" onClick={goNext} disabled={exam.currentIndex >= exam.orderIds.length - 1}>
                  Next
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>
    );
  }

  const showReview = finished;

  return (
    <div className="qb-exam-run fu">
      {expanded && solImg && (
        <div className="qb-modal-ov" onClick={() => setExpanded(false)}>
          <button className="qb-modal-close" onClick={(e) => { e.stopPropagation(); setExpanded(false); }}>
            <X size={24} />
          </button>
          <div className="qb-modal-content" onClick={e => e.stopPropagation()}>
            <div
              className="qb-modal-scroll"
              ref={expandedScrollRef}
              onDoubleClick={(e) => toggleExpandedZoom(e.clientX, e.clientY)}
            >
              <img
                ref={expandedImgRef}
                src={solImg}
                alt="expanded solution"
                className="qb-modal-img"
                style={{
                  width: `${expandedZoom * 100}%`,
                  maxWidth: expandedZoom === 1 ? "100%" : "none",
                  maxHeight: expandedZoom === 1 ? "80vh" : "none",
                  cursor: expandedZoom === 1 ? "zoom-in" : "zoom-out",
                  touchAction: "manipulation"
                }}
              />
            </div>
          </div>
        </div>
      )}

      <div className="qb-exam-shell">
        {examHeader}
        {examSidePanel}

        <div className="qb-exam-layout">
          <div className="qb-exam-main">
            <div className="qb-det-card">
            {finished && (
              <div className="qb-exam-summary">
                <div className="qb-exam-summary-primary">
                  <div className="qb-exam-summary-kicker">{exam.isReviewSession ? "Review Snapshot" : "Final Score"}</div>
                  <div className="qb-exam-summary-scoreline">
                    <div className="qb-exam-summary-n">{metrics.scorePercent}%</div>
                    <div className="qb-exam-summary-copy">
                      <div>{score}/{metrics.totalCount} correct</div>
                      <div>{metrics.wrongCount} wrong, {metrics.unansweredCount} blank</div>
                    </div>
                  </div>
                </div>

                <div className="qb-exam-summary-stats">
                  <div className="qb-exam-summary-stat">
                    <CheckCircle2 size={16} />
                    <span>{metrics.correctCount} correct</span>
                  </div>
                  <div className="qb-exam-summary-stat">
                    <AlertTriangle size={16} />
                    <span>{metrics.wrongCount} wrong</span>
                  </div>
                  <div className="qb-exam-summary-stat">
                    <Clock3 size={16} />
                    <span>{formatClock(metrics.timeSpentMs)} used</span>
                  </div>
                  <div className="qb-exam-summary-stat">
                    <Target size={16} />
                    <span>
                      {metrics.strongestTopic ? `Best: ${metrics.strongestTopic.label}` : "Topic insight pending"}
                    </span>
                  </div>
                </div>
              </div>
            )}
            <div ref={questionScrollRef} className="qb-exam-card-scroll">
              {q.topic && (
                <div style={{ marginBottom: 12 }}>
                  {(() => {
                    const t = TOPICS.find(t => t.id === q.topic) || TOPICS[0];
                    return (
                      <span className="qb-badge" style={{ 
                        color: t.color, 
                        background: `${t.color}20`,
                        fontSize: 12,
                        padding: "6px 12px",
                        borderRadius: 6
                      }}>
                        {t.label}
                      </span>
                    );
                  })()}
                </div>
              )}
              <div className="qb-det-q">
                <MarkdownText text={q.question} />
              </div>

              {q.choices.map((c, i) => {
                let cls = "qb-choice";
                if (!showReview) {
                  if (pick === i) cls += " qb-choice-sel";
                } else {
                  if (i === q.correct) cls += " correct";
                  else if (pick === i) cls += " wrong";
                  else if (pick !== null) cls += " faded";
                }
                return (
                  <button
                    key={i}
                    className={cls}
                    onClick={() => onPick(i)}
                    disabled={showReview}
                  >
                    <span className="qb-choice-l">{LETTERS[i]}</span>
                    <MarkdownText text={c} inline className="qb-choice-content" />
                  </button>
                );
              })}

              {showReview && (q.solution || q.solutionDraw || q.solutionUpload) && !showSol && (
                <button className="qb-reveal" onClick={() => setShowSol(true)} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%" }}>
                  Show Solution
                  <ChevronRight size={16} style={{ marginLeft: 6 }} />
                </button>
              )}

              {showReview && showSol && (q.solution || q.solutionDraw || q.solutionUpload) && (
                <div className="qb-sol">
                  <div className="qb-sol-title">Solution</div>
                  {q.solution && <div className="qb-sol-body"><MarkdownText text={q.solution} /></div>}
                  {(q.solutionDraw || q.solutionUpload) && (
                    <div style={{ cursor: "zoom-in" }} onClick={() => setExpanded(true)}>
                      <img
                        src={solImg}
                        alt="solution"
                        style={{ width: "100%", borderRadius: 6, display: "block", marginTop: q.solution ? 14 : 0, border: "1px solid var(--border)" }}
                      />
                      <p className="qb-expand-hint" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Search size={12} style={{ marginRight: 4 }} />
                        Click to expand
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="qb-exam-nav">
              <button type="button" className="qb-exam-navbtn" onClick={goPrev} disabled={exam.currentIndex === 0}>
                <ChevronLeft size={16} />
                Prev
              </button>
              <button type="button" className="qb-exam-navbtn" onClick={goNext} disabled={exam.currentIndex >= exam.orderIds.length - 1}>
                Next
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
