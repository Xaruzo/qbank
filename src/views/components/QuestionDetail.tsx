import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { TOPICS, LETTERS } from "../../constants/appConstants";
import {
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  Search,
  ChevronDown,
  Star,
  Link2,
  Lightbulb,
  Clock,
  CheckCircle2,
  AlertCircle,
  MousePointerClick,
  Pencil,
  Trash2,
} from "lucide-react";
import MarkdownText from "./MarkdownText";
import usePlainTextCopy from "../../utils/usePlainTextCopy";

export default function QuestionDetail({
  question,
  onBack,
  onEdit,
  onDelete,
  onToggleFavorite,
  onTips,
  hasPrev,
  onPrev,
  hasNext,
  onNext,
  forceShowSolution,
  canManageQuestions,
  questionIndex,
  totalQuestions,
}) {
  const [pick, setPick] = useState(null);
  const [showSol, setShowSol] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const cancelDeleteBtnRef = useRef<HTMLButtonElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [answerMs, setAnswerMs] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [shareLabel, setShareLabel] = useState("Share");
  const timerStartRef = useRef(0);
  const timerIdRef = useRef(null);
  const copyAreaRef = useRef(null);
  const cardScrollRef = useRef(null);
  usePlainTextCopy(copyAreaRef);

  const prevRef = useRef(onPrev);
  const nextRef = useRef(onNext);

  useEffect(() => {
    prevRef.current = onPrev;
    nextRef.current = onNext;
  }, [onPrev, onNext]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        if ((e.key === 'ArrowLeft' && hasPrev) || (e.key === 'ArrowRight' && hasNext)) {
          e.preventDefault();
          (document.activeElement as HTMLElement | null)?.blur();
          if (e.key === 'ArrowLeft') prevRef.current();
          else nextRef.current();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [hasPrev, hasNext]);

  const [expandedZoom, setExpandedZoom] = useState(1);
  const expandedScrollRef = useRef(null);
  const expandedImgRef = useRef(null);
  const lastTapRef = useRef({ t: 0, x: 0, y: 0 });
  const suppressPointerTapRef = useRef(false);
  const lastMouseClickRef = useRef({ t: 0, x: 0, y: 0 });

  const topic = TOPICS.find(t => t.id === question.topic) || TOPICS[0];
  const label = typeof question.label === "string" ? question.label.trim() : "";
  const solImg = question.solutionDraw ? (typeof question.solutionDraw === 'string' ? question.solutionDraw : question.solutionDraw.dataURL) : question.solutionUpload || null;
  const hasSolution = !!(question.solution || question.solutionDraw || question.solutionUpload);

  useEffect(() => {
    setPick(null);
    setShowSol(!!forceShowSolution);
    setIsDeleteModalOpen(false);
    setIsDeleting(false);
    setExpanded(false);
    setAnswerMs(0);
    timerStartRef.current = Date.now();
    setTimerRunning(true);
    setExpandedZoom(1);
    setShareLabel("Share");
    if (cardScrollRef.current) {
      cardScrollRef.current.scrollTop = 0;
    }
  }, [question.id, forceShowSolution]);

  useEffect(() => {
    if (!isDeleteModalOpen) return;
    cancelDeleteBtnRef.current?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isDeleting) {
        e.preventDefault();
        setIsDeleteModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDeleteModalOpen, isDeleting]);

  const handleConfirmDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await onDelete(question.id);
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
    }
  };

  useEffect(() => {
    if (!timerRunning) return;
    timerIdRef.current = window.setInterval(() => {
      setAnswerMs(Date.now() - timerStartRef.current);
    }, 100);
    return () => {
      if (timerIdRef.current) window.clearInterval(timerIdRef.current);
      timerIdRef.current = null;
    };
  }, [timerRunning]);

  useEffect(() => {
    if (pick === null) return;
    setTimerRunning(false);
  }, [pick]);

  useEffect(() => {
    if (!expanded) return;
    lastTapRef.current = { t: 0, x: 0, y: 0 };
    const el = expandedScrollRef.current;
    if (!el) return;
    el.scrollLeft = 0;
    el.scrollTop = 0;
  }, [expanded]);

  useEffect(() => () => {
    if (timerIdRef.current) window.clearInterval(timerIdRef.current);
    timerIdRef.current = null;
  }, []);

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

  const handleExpandedMouseDown = (e) => {
    if (e.pointerType === "touch") return;
    const now = Date.now();
    const last = lastMouseClickRef.current;
    const dx = e.clientX - last.x;
    const dy = e.clientY - last.y;
    if ((now - last.t) < 420 && (dx * dx + dy * dy) < 1600) {
      lastMouseClickRef.current = { t: 0, x: 0, y: 0 };
      toggleExpandedZoom(e.clientX, e.clientY);
      e.preventDefault();
      return;
    }
    lastMouseClickRef.current = { t: now, x: e.clientX, y: e.clientY };
  };

  const handleExpandedTouchEnd = (e) => {
    const touch = e.changedTouches?.[0];
    if (!touch) return;
    const now = Date.now();
    const last = lastTapRef.current;
    const dx = touch.clientX - last.x;
    const dy = touch.clientY - last.y;
    if ((now - last.t) < 420 && (dx * dx + dy * dy) < 1600) {
      lastTapRef.current = { t: 0, x: 0, y: 0 };
      suppressPointerTapRef.current = true;
      toggleExpandedZoom(touch.clientX, touch.clientY);
      try {
        e.preventDefault();
      } catch {}
      window.setTimeout(() => {
        suppressPointerTapRef.current = false;
      }, 260);
      return;
    }
    lastTapRef.current = { t: now, x: touch.clientX, y: touch.clientY };
  };

  const answerTimeText = `${(answerMs / 1000).toFixed(1)}s`;
  const canRevealSolution = pick !== null || !!forceShowSolution;

  const copyToClipboard = async (text) => {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const el = document.createElement("textarea");
    el.value = text;
    el.setAttribute("readonly", "");
    el.style.position = "fixed";
    el.style.left = "-9999px";
    document.body.appendChild(el);
    el.select();
    document.execCommand("copy");
    document.body.removeChild(el);
  };

  const handleShare = async () => {
    const url = `${window.location.origin}${window.location.pathname}?q=${encodeURIComponent(question.id)}&sol=1`;
    try {
      if (navigator.share) {
        await navigator.share({ url });
        setShareLabel("Shared");
        window.setTimeout(() => setShareLabel("Share"), 1200);
        return;
      }
    } catch {}

    try {
      await copyToClipboard(url);
      setShareLabel("Copied");
      window.setTimeout(() => setShareLabel("Share"), 1200);
    } catch {
      setShareLabel("Error");
      window.setTimeout(() => setShareLabel("Share"), 1200);
    }
  };

  const onPick = (i) => {
    if (pick !== null) return;
    setTimerRunning(false);
    setPick(i);
  };

  return (
    <div className="qb-det-page fu" ref={copyAreaRef}>
      {expanded && solImg && (
        <div className="qb-modal-ov" onClick={() => setExpanded(false)}>
          <button
            type="button"
            className="qb-modal-close"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(false);
            }}
            aria-label="Close image preview"
          >
            <X size={24} />
          </button>
          <div className="qb-modal-content" onClick={(e) => e.stopPropagation()}>
            <div
              className="qb-modal-scroll"
              ref={expandedScrollRef}
              onMouseDown={handleExpandedMouseDown}
              onTouchEnd={handleExpandedTouchEnd}
              onPointerUp={(e) => {
                if (e.pointerType !== "touch") return;
                if (suppressPointerTapRef.current) {
                  try {
                    e.preventDefault();
                  } catch {}
                }
              }}
              style={{ userSelect: "none" }}
            >
              <img
                ref={expandedImgRef}
                src={solImg}
                alt="Expanded solution illustration"
                className="qb-modal-img"
                onMouseDown={handleExpandedMouseDown}
                style={{
                  width: `${expandedZoom * 100}%`,
                  maxWidth: expandedZoom === 1 ? "100%" : "none",
                  maxHeight: expandedZoom === 1 ? "80vh" : "none",
                  cursor: expandedZoom === 1 ? "zoom-in" : "zoom-out",
                  touchAction: "manipulation",
                  userSelect: "none",
                  pointerEvents: "auto",
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Top Header & Action Toolbar */}
      <div className="qb-det-hdr">
        <div className="qb-det-meta">
          <div className="qb-det-meta-left">
            <button
              type="button"
              className="qb-back-btn"
              onClick={onBack}
              title="Return to Question Bank"
            >
              <ChevronLeft size={15} />
              <span>Bank</span>
            </button>

            <span
              className="qb-det-topic-badge"
              style={{
                color: topic.color,
                backgroundColor: `${topic.color}16`,
                borderColor: `${topic.color}35`,
              }}
              title={topic.label}
            >
              <span
                className="qb-det-topic-dot"
                style={{ backgroundColor: topic.color }}
              />
              <span className="qb-det-topic-label">{topic.label}</span>
            </span>

            {questionIndex && totalQuestions && (
              <span
                className="qb-det-index-badge"
                title={`Item ${questionIndex} of ${totalQuestions}`}
              >
                <span className="qb-det-index-full">Item {questionIndex} of {totalQuestions}</span>
                <span className="qb-det-index-short">{questionIndex} / {totalQuestions}</span>
              </span>
            )}
          </div>

          <div className="qb-timer-pill" title="Time spent on this question">
            <Clock size={12} className="qb-timer-icon" />
            <span className="qb-timer-val">{answerTimeText}</span>
          </div>
        </div>

        <div className="qb-det-actions">
          {onTips && (
            <button
              type="button"
              className="qb-det-action-btn qb-det-tips-btn"
              aria-label="Open tips and methods for this question"
              title="Open tips and methods"
              onClick={onTips}
            >
              <Lightbulb size={14} />
              <span>Tips</span>
            </button>
          )}

          <div className="qb-det-actions-group">
            <button
              type="button"
              className={`qb-det-action-btn qb-det-share-btn${shareLabel !== "Share" ? " is-copied" : ""}`}
              aria-label="Share question link"
              title="Share question link"
              onClick={handleShare}
            >
              {shareLabel === "Share" ? <Link2 size={14} /> : <Check size={14} />}
              <span>{shareLabel}</span>
            </button>

            <button
              type="button"
              className={`qb-det-fav-btn${question.favorite ? " on" : ""}`}
              aria-label={question.favorite ? "Remove from favorites" : "Add to favorites"}
              title={question.favorite ? "Unfavorite question" : "Favorite question"}
              onClick={() => onToggleFavorite(question.id)}
            >
              <Star size={15} fill={question.favorite ? "currentColor" : "none"} />
            </button>

            {canManageQuestions && (
              <div className="qb-det-admin-group">
                <button
                  type="button"
                  className="qb-edit-btn"
                  onClick={() => onEdit(question)}
                  title="Edit question"
                >
                  <Pencil size={13} className="qb-btn-icon" />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  className="qb-del-btn"
                  onClick={() => setIsDeleteModalOpen(true)}
                  title="Delete question"
                  aria-haspopup="dialog"
                >
                  <Trash2 size={13} className="qb-btn-icon" />
                  <span>Delete</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Contained Question Card with Internal Scroll */}
      <div className="qb-det-card qb-det-card-fixed">
        <div ref={cardScrollRef} className="qb-det-card-scroll">
          {label && (
            <div className="qb-det-label-wrap">
              <span className="qb-det-label">{label}</span>
            </div>
          )}

          <div className="qb-det-q">
            <MarkdownText text={question.question} />
          </div>

          <div className="qb-choices-group" role="radiogroup" aria-label="Answer choices">
            {question.choices.map((c, i) => {
              let cls = "qb-choice";
              if (pick !== null) {
                if (i === question.correct) cls += " correct";
                else if (i === pick) cls += " wrong";
                else cls += " faded";
              }
              return (
                <button
                  key={i}
                  type="button"
                  className={cls}
                  onClick={() => onPick(i)}
                  disabled={pick !== null}
                >
                  <span className="qb-choice-l">{LETTERS[i]}</span>
                  <MarkdownText text={c} inline className="qb-choice-content" />
                  {pick !== null && i === question.correct && (
                    <span className="qb-choice-indicator ok">
                      <Check size={16} />
                    </span>
                  )}
                  {pick !== null && i === pick && i !== question.correct && (
                    <span className="qb-choice-indicator no">
                      <X size={16} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {showSol && hasSolution && (
            <div className="qb-sol">
              <div className="qb-sol-header">
                <div className="qb-sol-title">
                  <Lightbulb size={14} className="qb-sol-icon" />
                  <span>Step-by-Step Solution & Explanation</span>
                </div>
              </div>
              {question.solution && (
                <div className="qb-sol-body">
                  <MarkdownText text={question.solution} />
                </div>
              )}
              {(question.solutionDraw || question.solutionUpload) && (
                <div className="qb-sol-media-box" onClick={() => { setExpanded(true); setExpandedZoom(1); }}>
                  <img
                    src={solImg}
                    alt="Solution diagram"
                    className="qb-sol-img"
                  />
                  <p className="qb-expand-hint">
                    <Search size={13} />
                    <span>Click diagram to expand & zoom</span>
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pinned Bottom Controls Footer */}
        <div className="qb-det-footer">
          <div className="qb-det-footer-left">
            {canRevealSolution && hasSolution && (
              <button
                type="button"
                className={`qb-reveal-toggle${showSol ? " is-active" : ""}`}
                onClick={() => setShowSol((prev) => !prev)}
              >
                <Lightbulb size={15} />
                <span>{showSol ? "Hide Solution" : "Show Solution"}</span>
                <ChevronDown size={15} className={`qb-reveal-caret${showSol ? " is-open" : ""}`} />
              </button>
            )}
            {pick === null && (
              <div className="qb-det-footer-hint">
                <MousePointerClick size={14} className="qb-det-footer-hint-ico" />
                <span>Tap a choice to check your answer</span>
              </div>
            )}
          </div>

          {pick !== null && (
            <div
              className={`qb-det-footer-verdict ${pick === question.correct ? "ok" : "no"}`}
              role="status"
              aria-live="polite"
            >
              {pick === question.correct ? (
                <CheckCircle2 size={15} className="qb-det-footer-verdict-ico" />
              ) : (
                <AlertCircle size={15} className="qb-det-footer-verdict-ico" />
              )}
              <span>
                {pick === question.correct
                  ? `Correct! Choice ${LETTERS[question.correct]} is right.`
                  : `Incorrect. The correct answer is ${LETTERS[question.correct]}.`}
              </span>
            </div>
          )}

          <div className="qb-det-footer-right">
            <button
              type="button"
              className="qb-det-navbtn qb-det-navbtn-prev"
              onClick={onPrev}
              disabled={!hasPrev}
              title={hasPrev ? "Previous question (←)" : "No previous question"}
            >
              <ChevronLeft size={16} />
              <span>Prev</span>
            </button>
            <button
              type="button"
              className="qb-det-navbtn qb-det-navbtn-next"
              onClick={onNext}
              title={hasNext ? "Next question (→)" : "Finish review"}
            >
              <span>{hasNext ? "Next" : "Finish"}</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Industry-Standard Accessible Delete Confirmation Modal */}
      {isDeleteModalOpen &&
        createPortal(
          <div
            className="qb-modal-backdrop qb-delete-modal-overlay"
            role="presentation"
            onClick={() => {
              if (!isDeleting) setIsDeleteModalOpen(false);
            }}
          >
            <div
              className="qb-modal-card qb-delete-modal-card"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="qb-delete-title"
              aria-describedby="qb-delete-desc"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="qb-delete-modal-header">
                <div className="qb-delete-modal-icon-badge" aria-hidden="true">
                  <Trash2 size={22} />
                </div>
                <div className="qb-delete-modal-headings">
                  <h3 id="qb-delete-title" className="qb-modal-title qb-delete-modal-title">
                    Delete Question?
                  </h3>
                  <p id="qb-delete-desc" className="qb-modal-text qb-delete-modal-desc">
                    Are you sure you want to delete this question? This action will permanently remove it from the question bank and cannot be undone.
                  </p>
                </div>
              </div>

              {/* Context Preview of the question being deleted */}
              <div className="qb-delete-modal-preview">
                <div className="qb-delete-modal-preview-meta">
                  <span className="qb-delete-modal-topic-pill">
                    {topic?.label || question.topic}
                  </span>
                  {questionIndex && totalQuestions ? (
                    <span className="qb-delete-modal-idx">
                      Item {questionIndex} of {totalQuestions}
                    </span>
                  ) : null}
                  {label && <span className="qb-delete-modal-code">{label}</span>}
                </div>
                <p className="qb-delete-modal-preview-text">
                  {question.question.length > 180
                    ? `${question.question.slice(0, 180).trim()}…`
                    : question.question}
                </p>
                <div className="qb-delete-modal-preview-footer">
                  <span>{question.choices?.length || 4} answer choices</span>
                  {hasSolution && <span>• Includes solution explanation</span>}
                </div>
              </div>

              <div className="qb-modal-actions qb-delete-modal-actions">
                <button
                  ref={cancelDeleteBtnRef}
                  type="button"
                  className="qb-modal-btn qb-modal-btn-cancel qb-delete-modal-btn-cancel"
                  onClick={() => setIsDeleteModalOpen(false)}
                  disabled={isDeleting}
                >
                  <X size={14} className="qb-btn-icon" />
                  <span>Cancel</span>
                </button>
                <button
                  type="button"
                  className="qb-modal-btn qb-modal-btn-danger qb-delete-modal-btn-delete"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                >
                  <Trash2 size={14} className="qb-btn-icon" />
                  <span>{isDeleting ? "Deleting…" : "Delete Question"}</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
