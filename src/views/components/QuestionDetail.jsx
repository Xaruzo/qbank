import React, { useEffect, useRef, useState } from "react";
import { TOPICS, LETTERS } from "../../constants/appConstants";
import { ChevronLeft, X, Check, Search, ChevronDown, ChevronRight, Star, Link2 } from "lucide-react";
import MarkdownText from "./MarkdownText";

export default function QuestionDetail({
  question,
  onBack,
  onEdit,
  onDelete,
  onToggleFavorite,
  hasNext,
  onNext,
  forceShowSolution,
  canManageQuestions,
  onRequireAuth,
}) {
  const [pick, setPick] = useState(null);
  const [showSol, setShowSol] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [answerMs, setAnswerMs] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [shareLabel, setShareLabel] = useState("Share");
  const timerStartRef = useRef(0);
  const timerIdRef = useRef(null);
  const [expandedZoom, setExpandedZoom] = useState(1);
  const expandedScrollRef = useRef(null);
  const expandedImgRef = useRef(null);
  const lastTapRef = useRef({ t: 0, x: 0, y: 0 });
  const suppressPointerTapRef = useRef(false);

  const topic = TOPICS.find(t => t.id === question.topic) || TOPICS[0];
  const label = typeof question.label === "string" ? question.label.trim() : "";
  const solImg = question.solutionDraw ? (typeof question.solutionDraw === 'string' ? question.solutionDraw : question.solutionDraw.dataURL) : null;

  useEffect(() => {
    setPick(null);
    setShowSol(!!forceShowSolution);
    setConfirmDel(false);
    setExpanded(false);
    setAnswerMs(0);
    timerStartRef.current = performance.now();
    setTimerRunning(true);
    setExpandedZoom(1);
    setShareLabel("Share");
  }, [question.id, forceShowSolution]);

  useEffect(() => {
    if (!timerRunning) return;
    timerIdRef.current = window.setInterval(() => {
      setAnswerMs(performance.now() - timerStartRef.current);
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
    setExpandedZoom(1);
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
    if (timerRunning) {
      setAnswerMs(performance.now() - timerStartRef.current);
      setTimerRunning(false);
    }
    setPick(i);
  };

  return (
    <div className="fu">
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
              onTouchEnd={handleExpandedTouchEnd}
              onPointerUp={(e) => {
                if (e.pointerType !== "touch") return;
                if (suppressPointerTapRef.current) {
                  try {
                    e.preventDefault();
                  } catch {}
                }
              }}
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
      <div className="qb-det-hdr">
        <button className="qb-back" onClick={onBack} style={{ display: "flex", alignItems: "center" }}>
          <ChevronLeft size={16} style={{ marginRight: 4 }} />
          Back
        </button>
        <span className="qb-badge" style={{ color:topic.color, background:`${topic.color}20`, padding:"4px 10px", borderRadius:5 }}>
          {topic.label}
        </span>
        <div className="qb-det-actions">
          <span className="qb-timer">{answerTimeText}</span>
          <button
            type="button"
            className="qb-share-btn"
            aria-label="Share question link"
            title="Share question link"
            onClick={handleShare}
          >
            <Link2 size={16} />
            {shareLabel}
          </button>
          <button
            type="button"
            className={`qb-det-fav-btn${question.favorite ? " on" : ""}`}
            aria-label={question.favorite ? "Remove from favorites" : "Add to favorites"}
            title={question.favorite ? "Unfavorite question" : "Favorite question"}
            onClick={() => onToggleFavorite(question.id)}
          >
            <Star size={16} fill={question.favorite ? "currentColor" : "none"} />
          </button>
          {!canManageQuestions ? (
            <button className="qb-edit-btn" onClick={onRequireAuth}>Sign In to Edit</button>
          ) : !confirmDel ? (
            <>
              <button className="qb-edit-btn" onClick={() => onEdit(question)}>Edit</button>
              <button className="qb-del-btn" onClick={() => setConfirmDel(true)}>Delete</button>
            </>
          ) : (
            <>
              <button className="qb-del-cancel" onClick={() => setConfirmDel(false)}>Cancel</button>
              <button className="qb-del-confirm" onClick={() => onDelete(question.id)}>Confirm Delete</button>
            </>
          )}
        </div>
      </div>
      <div className="qb-det-card">
        {label && <div className="qb-det-label">{label}</div>}
        <div className="qb-det-q">
          <MarkdownText text={question.question} />
        </div>
        {pick!==null && (
          <div className={`qb-banner ${pick===question.correct?"ok":"no"}`}>
            {pick===question.correct ? "Correct!" : `Incorrect — correct answer is ${LETTERS[question.correct]}`}
          </div>
        )}
        {question.choices.map((c,i) => {
          let cls = "qb-choice";
          if (pick!==null) {
            if (i===question.correct)        cls += " correct";
            else if (i===pick)               cls += " wrong";
            else                         cls += " faded";
          }
          return (
            <button key={i} className={cls} onClick={() => onPick(i)} disabled={pick!==null}>
              <span className="qb-choice-l">{LETTERS[i]}</span>
              <MarkdownText text={c} inline className="qb-choice-content" />
              {pick!==null && i===question.correct && <Check size={16} className="qb-choice-tag" style={{ color:"#16a34a" }} />}
              {pick!==null && i===pick && i!==question.correct && <X size={16} className="qb-choice-tag" style={{ color:"#e0365a" }} />}
            </button>
          );
        })}
        <div className="qb-next-row">
          <button
            className="qb-next-btn"
            disabled={pick === null}
            onClick={() => {
              if (pick === null) return;
              onNext();
            }}
          >
            {hasNext ? "Next" : "Finish"}
            <ChevronRight size={16} />
          </button>
        </div>
        {canRevealSolution && (question.solution||question.solutionDraw) && !showSol && (
          <button className="qb-reveal" onClick={() => setShowSol(true)} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%" }}>
            Show Solution
            <ChevronDown size={16} style={{ marginLeft: 6 }} />
          </button>
        )}
        {showSol && (question.solution||question.solutionDraw) && (
                  <div className="qb-sol">
                    <div className="qb-sol-title">Solution</div>
                    {question.solution && <div className="qb-sol-body"><MarkdownText text={question.solution} /></div>}
                    {question.solutionDraw && (
                      <div style={{ cursor: "zoom-in" }} onClick={() => setExpanded(true)}>
                        <img 
                          src={solImg} 
                          alt="drawn solution"
                          style={{ width:"100%", borderRadius:6, display:"block", marginTop:question.solution?14:0, border:"1px solid var(--border)" }}
                        />
                        <p className="qb-expand-hint" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Search size={12} style={{ marginRight: 4 }} />
                          Click to expand drawing
                        </p>
                      </div>
                    )}
                  </div>
                )}
        {pick===null && <p className="qb-hint">Tap a choice to check your answer</p>}
      </div>
    </div>
  );
}
