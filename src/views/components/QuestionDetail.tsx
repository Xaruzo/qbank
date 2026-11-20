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
  MoreHorizontal,
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
  canEditQuestion,
  canDeleteQuestion,
  questionIndex,
  totalQuestions,
  queueQuestions = [],
  onSelectQuestion,
  sessionResults = {},
  onRecordResult,
}) {
  const allowEdit = canEditQuestion ?? !!canManageQuestions;
  const allowDelete = canDeleteQuestion ?? !!canManageQuestions;
  const [pick, setPick] = useState(null);
  const [showSol, setShowSol] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const cancelDeleteBtnRef = useRef<HTMLButtonElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [answerMs, setAnswerMs] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [shareLabel, setShareLabel] = useState("Share");
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [scratchMap, setScratchMap] = useState<Record<string, string>>({});
  const timerStartRef = useRef(0);
  const timerIdRef = useRef(null);
  const overflowRef = useRef<HTMLDivElement>(null);
  const copyAreaRef = useRef(null);
  const cardScrollRef = useRef(null);
  const navGridRef = useRef<HTMLDivElement>(null);
  const activeNavBtnRef = useRef<HTMLButtonElement>(null);
  usePlainTextCopy(copyAreaRef);

  const prevRef = useRef(onPrev);
  const nextRef = useRef(onNext);
  const onPickRef = useRef<(idx: number) => void>(() => {});
  const toggleSolRef = useRef<() => void>(() => {});

  useEffect(() => {
    prevRef.current = onPrev;
    nextRef.current = onNext;
  }, [onPrev, onNext]);

  useEffect(() => {
    const onKeyDown = (e) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        if ((e.key === "ArrowLeft" && hasPrev) || (e.key === "ArrowRight" && hasNext)) {
          e.preventDefault();
          (document.activeElement as HTMLElement | null)?.blur();
          if (e.key === "ArrowLeft") prevRef.current();
          else nextRef.current();
        }
        return;
      }

      if (/^[1-9]$/.test(e.key)) {
        const idx = Number(e.key) - 1;
        if (idx >= 0 && idx < (question.choices?.length || 0)) {
          e.preventDefault();
          onPickRef.current(idx);
        }
        return;
      }

      if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        toggleSolRef.current();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [hasPrev, hasNext, question.choices?.length]);

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
    setOverflowOpen(false);
    if (cardScrollRef.current) {
      cardScrollRef.current.scrollTop = 0;
    }
  }, [question.id, forceShowSolution]);

  useEffect(() => {
    if (!overflowOpen) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (overflowRef.current?.contains(e.target as Node)) return;
      setOverflowOpen(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOverflowOpen(false);
    };
    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [overflowOpen]);

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
    if (el) {
      el.scrollLeft = 0;
      el.scrollTop = 0;
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setExpanded(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
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
    onRecordResult?.(question.id, i === question.correct);
  };

  useEffect(() => {
    onPickRef.current = onPick;
    toggleSolRef.current = () => {
      if (canRevealSolution && hasSolution) {
        setShowSol((prev) => !prev);
      }
    };
  });

  useEffect(() => {
    const container = navGridRef.current;
    const activeBtn = activeNavBtnRef.current;
    if (!container || !activeBtn) return;
    const top = activeBtn.offsetTop - container.offsetTop;
    const targetTop = top - container.clientHeight / 2 + activeBtn.clientHeight / 2;
    container.scrollTo({ top: Math.max(0, targetTop), behavior: "smooth" });
  }, [question.id]);

  const queueItems = Array.isArray(queueQuestions) ? queueQuestions : [];
  const queueAnsweredCount = queueItems.reduce(
    (acc, q) => (sessionResults[q.id] ? acc + 1 : acc),
    0
  );
  const queueCorrectCount = queueItems.reduce(
    (acc, q) => (sessionResults[q.id] === "correct" ? acc + 1 : acc),
    0
  );
  const queueAccuracy =
    queueAnsweredCount > 0 ? Math.round((queueCorrectCount / queueAnsweredCount) * 100) : null;
  const progressPct =
    questionIndex && totalQuestions
      ? Math.min(100, Math.round((questionIndex / totalQuestions) * 100))
      : 0;
  const currentScratch = scratchMap[question.id] || "";

  return (
    <div className="qb-det-page fu !gap-2.5" ref={copyAreaRef}>
      {expanded && solImg && typeof document !== "undefined" && createPortal(
        <div
          className="qb-modal-ov"
          role="dialog"
          aria-modal="true"
          aria-label="Expanded solution illustration"
          onClick={() => setExpanded(false)}
        >
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
        </div>,
        document.body
      )}

      {/* Top Header & Action Toolbar */}
      <div className="qb-det-hdr sm:!py-2 sm:!mb-0">
        <div className="qb-det-meta">
          <div className="qb-det-meta-left">
            <button
              type="button"
              className="qb-back-btn sm:!h-8 sm:!py-0 sm:!px-2.5 sm:!text-xs sm:!rounded-lg"
              onClick={onBack}
              title="Return to Question Bank"
            >
              <ChevronLeft size={14} />
              <span>Bank</span>
            </button>

            <span
              className="qb-det-topic-badge sm:!py-1 sm:!px-2.5 sm:!text-[11.5px]"
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
                className="qb-det-index-badge sm:!h-7 sm:!py-0 sm:!px-2.5 sm:!text-[11.5px]"
                title={`Item ${questionIndex} of ${totalQuestions}`}
              >
                <span className="qb-det-index-full">Item {questionIndex} of {totalQuestions}</span>
                <span className="qb-det-index-short">{questionIndex} / {totalQuestions}</span>
              </span>
            )}
          </div>

          <div className="qb-timer-pill sm:!h-8 sm:!min-w-[70px] sm:!px-2.5 sm:!text-xs sm:!rounded-lg" title="Time spent on this question">
            <Clock size={12} className="qb-timer-icon" />
            <span className="qb-timer-val">{answerTimeText}</span>
          </div>
        </div>

        <div className="qb-det-actions">
          {/* Desktop inline actions (>=768px) */}
          <div className="qb-det-actions-inline">
            {onTips && (
              <button
                type="button"
                className="qb-det-action-btn qb-det-tips-btn sm:!h-8 sm:!px-2.5 sm:!rounded-lg"
                aria-label="Open tips and methods for this question"
                title="Open tips and methods"
                onClick={onTips}
              >
                <Lightbulb size={13} />
                <span>Tips</span>
              </button>
            )}

            <button
              type="button"
              className={`qb-det-action-btn qb-det-share-btn sm:!h-8 sm:!min-w-[78px] sm:!px-2.5 sm:!rounded-lg${shareLabel !== "Share" ? " is-copied" : ""}`}
              aria-label="Share question link"
              title="Share question link"
              onClick={handleShare}
            >
              {shareLabel === "Share" ? <Link2 size={13} /> : <Check size={13} />}
              <span>{shareLabel}</span>
            </button>

            {(allowEdit || allowDelete) && (
              <div className="qb-det-admin-group">
                {allowEdit && (
                  <button
                    type="button"
                    className="qb-edit-btn sm:!h-8 sm:!py-0 sm:!px-2.5 sm:!text-xs sm:!rounded-lg"
                    onClick={() => onEdit(question)}
                    title="Edit question"
                    aria-label="Edit question"
                  >
                    <Pencil size={13} className="qb-btn-icon" />
                    <span>Edit</span>
                  </button>
                )}
                {allowDelete && (
                  <button
                    type="button"
                    className="qb-del-btn sm:!h-8 sm:!py-0 sm:!px-2.5 sm:!text-xs sm:!rounded-lg"
                    onClick={() => setIsDeleteModalOpen(true)}
                    title="Delete question"
                    aria-label="Delete question"
                    aria-haspopup="dialog"
                  >
                    <Trash2 size={13} className="qb-btn-icon" />
                    <span>Delete</span>
                  </button>
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            className={`qb-det-fav-btn sm:!w-8 sm:!h-8 sm:!rounded-lg${question.favorite ? " on" : ""}`}
            aria-label={question.favorite ? "Remove from favorites" : "Add to favorites"}
            title={question.favorite ? "Unfavorite question" : "Favorite question"}
            onClick={() => onToggleFavorite(question.id)}
          >
            <Star size={14} fill={question.favorite ? "currentColor" : "none"} />
          </button>

          {/* Compact mobile/tablet overflow trigger (<768px) */}
          <div className="qb-det-overflow-wrap" ref={overflowRef}>
            <button
              type="button"
              className={`qb-det-overflow-btn${overflowOpen ? " is-active" : ""}`}
              aria-label="More question actions"
              aria-expanded={overflowOpen}
              aria-haspopup="menu"
              onClick={() => setOverflowOpen((prev) => !prev)}
            >
              <MoreHorizontal size={16} />
            </button>

            {overflowOpen && (
              <div className="qb-det-overflow-menu" role="menu">
                {onTips && (
                  <button
                    type="button"
                    role="menuitem"
                    className="qb-det-overflow-item"
                    onClick={() => {
                      setOverflowOpen(false);
                      onTips();
                    }}
                  >
                    <Lightbulb size={15} />
                    <span>Tips & Methods</span>
                  </button>
                )}
                <button
                  type="button"
                  role="menuitem"
                  className="qb-det-overflow-item"
                  onClick={() => {
                    setOverflowOpen(false);
                    handleShare();
                  }}
                >
                  {shareLabel === "Share" ? <Link2 size={15} /> : <Check size={15} />}
                  <span>{shareLabel === "Share" ? "Copy Share Link" : shareLabel}</span>
                </button>
                {(allowEdit || allowDelete) && (
                  <>
                    <div className="qb-det-overflow-divider" />
                    {allowEdit && (
                      <button
                        type="button"
                        role="menuitem"
                        className="qb-det-overflow-item"
                        onClick={() => {
                          setOverflowOpen(false);
                          onEdit(question);
                        }}
                      >
                        <Pencil size={15} />
                        <span>Edit Question</span>
                      </button>
                    )}
                    {allowDelete && (
                      <button
                        type="button"
                        role="menuitem"
                        className="qb-det-overflow-item is-danger"
                        onClick={() => {
                          setOverflowOpen(false);
                          setIsDeleteModalOpen(true);
                        }}
                      >
                        <Trash2 size={15} />
                        <span>Delete Question</span>
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Split Study Workspace on Desktop, Single Column on Tablet/Mobile */}
      <div className="qb-det-workspace">
        <div className="qb-det-main-col">
          {/* Main Question Card */}
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
      </div>

      {/* Sticky Bottom Controls Dock (zero vertical target drift across questions) */}
      <div className="qb-det-footer sm:!py-2 sm:!px-4 sm:!rounded-xl">
        <div className="qb-det-footer-left">
          {canRevealSolution && hasSolution && (
            <button
              type="button"
              className={`qb-reveal-toggle sm:!py-1.5 sm:!px-3 sm:!text-xs sm:!rounded-lg${showSol ? " is-active" : ""}`}
              onClick={() => setShowSol((prev) => !prev)}
            >
              <Lightbulb size={14} />
              <span>{showSol ? "Hide Solution" : "Show Solution"}</span>
              <ChevronDown size={14} className={`qb-reveal-caret${showSol ? " is-open" : ""}`} />
            </button>
          )}
          {pick === null && (
            <div className="qb-det-footer-hint sm:!text-xs">
              <MousePointerClick size={13} className="qb-det-footer-hint-ico" />
              <span>Tap a choice to check your answer</span>
            </div>
          )}
        </div>

        {pick !== null && (
          <div
            className={`qb-det-footer-verdict sm:!text-xs ${pick === question.correct ? "ok" : "no"}`}
            role="status"
            aria-live="polite"
          >
            {pick === question.correct ? (
              <CheckCircle2 size={14} className="qb-det-footer-verdict-ico" />
            ) : (
              <AlertCircle size={14} className="qb-det-footer-verdict-ico" />
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
            className="qb-det-navbtn qb-det-navbtn-prev sm:!py-1.5 sm:!px-3.5 sm:!text-xs sm:!rounded-lg"
            onClick={onPrev}
            disabled={!hasPrev}
            title={hasPrev ? "Previous question (←)" : "No previous question"}
          >
            <ChevronLeft size={14} />
            <span>Prev</span>
          </button>
          <button
            type="button"
            className="qb-det-navbtn qb-det-navbtn-next sm:!py-1.5 sm:!px-3.5 sm:!text-xs sm:!rounded-lg"
            onClick={onNext}
            title={hasNext ? "Next question (→)" : "Finish review"}
          >
            <span>{hasNext ? "Next" : "Finish"}</span>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
        </div>

        {/* Desktop Companion Study Rail (Hidden on Tablet/Mobile <= 1099px) */}
        <aside className="qb-det-rail" aria-label="Study companion rail">
          {queueItems.length > 0 && (
            <section className="qb-det-rail-card">
              <div className="qb-det-rail-head">
                <h2 className="qb-det-rail-title">Practice Queue</h2>
                <span className="qb-det-rail-meta">
                  {questionIndex && totalQuestions ? `${questionIndex} / ${totalQuestions}` : `${queueItems.length} items`}
                </span>
              </div>

              {questionIndex && totalQuestions ? (
                <div className="qb-det-rail-progress" aria-label={`Question ${questionIndex} of ${totalQuestions}`}>
                  <div className="qb-det-rail-progress-bar">
                    <div
                      className="qb-det-rail-progress-fill"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
              ) : null}

              <div className="qb-det-rail-stats">
                <div className="qb-det-rail-stat">
                  <span className="qb-det-rail-stat-val">{queueAnsweredCount}</span>
                  <span className="qb-det-rail-stat-lbl">Answered</span>
                </div>
                <div className="qb-det-rail-stat">
                  <span className="qb-det-rail-stat-val">{queueCorrectCount}</span>
                  <span className="qb-det-rail-stat-lbl">Correct</span>
                </div>
                <div className="qb-det-rail-stat">
                  <span className="qb-det-rail-stat-val">
                    {queueAccuracy !== null ? `${queueAccuracy}%` : "—"}
                  </span>
                  <span className="qb-det-rail-stat-lbl">Accuracy</span>
                </div>
              </div>

              <div className="qb-det-rail-grid" ref={navGridRef} role="navigation" aria-label="Question navigator">
                {queueItems.map((item, idx) => {
                  const isCurrent = item.id === question.id;
                  const status = sessionResults[item.id];
                  const itemTopic = TOPICS.find((t) => t.id === item.topic);
                  const num = idx + 1;
                  return (
                    <button
                      key={item.id}
                      ref={isCurrent ? activeNavBtnRef : undefined}
                      type="button"
                      className={`qb-det-nav-cell${isCurrent ? " is-current" : ""}${
                        status === "correct" ? " is-ok" : status === "wrong" ? " is-no" : ""
                      }${item.favorite ? " is-fav" : ""}`}
                      onClick={() => onSelectQuestion?.(item.id)}
                      aria-current={isCurrent ? "true" : undefined}
                      title={`Item ${num}${itemTopic ? ` · ${itemTopic.label}` : ""}${item.favorite ? " ★" : ""}`}
                    >
                      <span>{num}</span>
                    </button>
                  );
                })}
              </div>

              <div className="qb-det-rail-legend" aria-hidden="true">
                <span className="qb-det-legend-item">
                  <span className="qb-det-legend-swatch is-current" />
                  Current
                </span>
                <span className="qb-det-legend-item">
                  <span className="qb-det-legend-swatch is-ok" />
                  Correct
                </span>
                <span className="qb-det-legend-item">
                  <span className="qb-det-legend-swatch is-no" />
                  Missed
                </span>
                <span className="qb-det-legend-item">
                  <span className="qb-det-legend-swatch is-fav" />
                  Starred
                </span>
              </div>
            </section>
          )}

          <section className="qb-det-rail-card">
            <div className="qb-det-rail-head">
              <h2 className="qb-det-rail-title">Rough Scratchpad</h2>
              <button
                type="button"
                className="qb-det-rail-clear"
                disabled={!currentScratch}
                onClick={() =>
                  setScratchMap((prev) => ({
                    ...prev,
                    [question.id]: "",
                  }))
                }
              >
                Clear
              </button>
            </div>
            <textarea
              className="qb-det-scratch-input"
              rows={5}
              value={currentScratch}
              onChange={(e) => {
                const val = e.target.value;
                setScratchMap((prev) => ({
                  ...prev,
                  [question.id]: val,
                }));
              }}
              placeholder="Jot down formulas, steps, or elimination notes for this item..."
              aria-label="Rough scratchpad for this question"
            />
          </section>

          <section className="qb-det-rail-card qb-det-rail-shortcuts">
            <div className="qb-det-rail-head">
              <h2 className="qb-det-rail-title">Keyboard Shortcuts</h2>
            </div>
            <div className="qb-det-shortcut-list">
              <div className="qb-det-shortcut-row">
                <span className="qb-det-shortcut-label">Previous / Next</span>
                <span className="qb-det-shortcut-keys">
                  <kbd>←</kbd>
                  <kbd>→</kbd>
                </span>
              </div>
              <div className="qb-det-shortcut-row">
                <span className="qb-det-shortcut-label">Pick answer choice</span>
                <span className="qb-det-shortcut-keys">
                  <kbd>1</kbd>–<kbd>{question.choices?.length || 4}</kbd>
                </span>
              </div>
              <div className="qb-det-shortcut-row">
                <span className="qb-det-shortcut-label">Toggle solution</span>
                <span className="qb-det-shortcut-keys">
                  <kbd>S</kbd>
                </span>
              </div>
            </div>
          </section>
        </aside>
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
