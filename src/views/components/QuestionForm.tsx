import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { TOPICS, LETTERS, PROBLEM_LABELS } from "../../constants/appConstants";
import DrawCanvas from "./DrawCanvas";
import SymbolToolbar from "./SymbolToolbar";
import { handleSymbolShortcuts } from "../../utils/symbolShortcuts";
import { uploadImageToSupabase, validateImageFile } from "../../utils/imageUpload";
import { 
  ChevronLeft, ChevronDown, Pencil, Image, Loader,
  Trash2, Maximize2, Minimize2, Sparkles, Layers, X, Check, PenTool, ArrowLeft,
  Calculator, BookOpen, Globe, BrainCircuit, ClipboardList, AlertTriangle, RotateCcw,
  Tag, Save, Plus, CheckCircle2, AlertCircle,
  ListOrdered, Lightbulb, HelpCircle, SlidersHorizontal, BarChart2
} from "lucide-react";

const TOPIC_ICON_MAP: Record<string, typeof Calculator> = {
  numerical: Calculator,
  verbal: BookOpen,
  general: Globe,
  analytical: BrainCircuit,
  clerical: ClipboardList,
};

export default function QuestionForm({ initialData, onSave, onCancel, sideRailHost }) {
  const [isDrawModalOpen, setIsDrawModalOpen] = useState(false);
  const [tempDraw, setTempDraw] = useState(initialData?.solutionDraw || null);
  const [modalLayersHostEl, setModalLayersHostEl] = useState<HTMLDivElement | null>(null);
  const [showModalLayers, setShowModalLayers] = useState<boolean>(() => {
    return typeof window !== "undefined" ? window.innerWidth >= 860 : true;
  });
  const [form, setForm] = useState(() => {
    if (!initialData) {
      return {
        question: "",
        choices: ["", "", "", ""],
        correct: 0,
        solution: "",
        solutionDraw: null,
        solutionUpload: null,
        topic: "numerical",
        label: "",
      };
    }
    const rawChoices = Array.isArray(initialData.choices) ? initialData.choices : [];
    const choices = rawChoices.map((c: any) => typeof c === "string" ? c : String(c ?? ""));
    while (choices.length < 4) choices.push("");
    const isDataUrl = typeof initialData.solutionDraw === "string" && initialData.solutionDraw.startsWith("data:image");
    return {
      ...initialData,
      question: typeof initialData.question === "string" ? initialData.question : "",
      choices,
      correct: typeof initialData.correct === "number" ? initialData.correct : 0,
      solution: typeof initialData.solution === "string" ? initialData.solution : "",
      topic: initialData.topic || "numerical",
      label: typeof initialData.label === "string" ? initialData.label : "",
      solutionDraw: initialData.solutionDraw || null,
      solutionUpload: isDataUrl ? initialData.solutionDraw : (initialData.solutionUpload || null),
    };
  });
  const [visualMode, setVisualMode] = useState(() => {
    if (initialData?.solutionUpload) return "upload";
    if (initialData?.solutionDraw && typeof initialData.solutionDraw === "string" && initialData.solutionDraw.startsWith("data:image")) return "upload";
    if (initialData?.solutionDraw) return "draw";
    return null;
  });
  const [confirmRemoveDraw, setConfirmRemoveDraw] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [error, setError] = useState("");
  const [topicOpen, setTopicOpen] = useState(false);
  const [topicDir, setTopicDir] = useState("down");
  const [labelOpen, setLabelOpen] = useState(false);
  const [labelDir, setLabelDir] = useState("down");
  const topicRef = useRef(null);
  const labelRef = useRef(null);
  const questionRef = useRef(null);
  const choiceRefs = useRef([]);
  const activeChoiceRef = useRef(null);
  const solutionRef = useRef(null);
  const [activeChoice, setActiveChoice] = useState(null);
  const [useCustomLabel, setUseCustomLabel] = useState(!initialData?.label || !PROBLEM_LABELS.includes(initialData.label));

  // The drawing is fetched after the question list loads, so the edit form can
  // mount before it arrives. Adopt it unless the user already touched visuals.
  useEffect(() => {
    if (!initialData?.id || initialData.solutionDraw === undefined) return;
    const draw = initialData.solutionDraw;
    const isDataUrl = typeof draw === "string" && draw.startsWith("data:image");
    setForm((current) => {
      if (current.id !== initialData.id || current.solutionDraw !== undefined) return current;
      return {
        ...current,
        solutionDraw: draw,
        solutionUpload: isDataUrl ? draw : initialData.solutionUpload || null,
      };
    });
    setVisualMode((current) => current ?? (
      initialData.solutionUpload || isDataUrl ? "upload" : draw ? "draw" : null
    ));
  }, [initialData?.id, initialData?.solutionDraw, initialData?.solutionUpload]);

  const drawPreviewUrl = useMemo(() => {
    const d = form.solutionDraw;
    if (!d) return null;
    if (typeof d === "string") {
      if (d.startsWith("data:image")) return d;
      try {
        const parsed = JSON.parse(d);
        if (parsed && typeof parsed === "object" && parsed.dataURL) return parsed.dataURL;
      } catch {
        // ignore JSON parse error
      }
      return null;
    }
    if (typeof d === "object" && d?.dataURL) return d.dataURL;
    return null;
  }, [form.solutionDraw]);

  const [initialDrawSnapshot, setInitialDrawSnapshot] = useState<any>(initialData?.solutionDraw || null);
  const [isDrawDirty, setIsDrawDirty] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const cancelDiscardBtnRef = useRef<HTMLButtonElement | null>(null);

  const handleOpenDrawModal = () => {
    setTempDraw(form.solutionDraw);
    setInitialDrawSnapshot(form.solutionDraw);
    setIsDrawDirty(false);
    setShowDiscardConfirm(false);
    // Default Visual Layers to closed on mobile view (< 860px) to maximize canvas space,
    // and default to open on desktop and tablet (>= 860px).
    const isDesktopOrTablet = typeof window !== "undefined" && window.innerWidth >= 860;
    setShowModalLayers(isDesktopOrTablet);
    setIsDrawModalOpen(true);
  };

  const handleDrawChange = (val: any) => {
    setTempDraw(val);
    setIsDrawDirty(true);
  };

  const hasDrawChanges = useMemo(() => {
    if (!isDrawDirty) return false;

    const initDataURL = typeof initialDrawSnapshot === "string"
      ? initialDrawSnapshot
      : initialDrawSnapshot?.dataURL || "";
    const currDataURL = typeof tempDraw === "string"
      ? tempDraw
      : tempDraw?.dataURL || "";

    const initObjects = Array.isArray(initialDrawSnapshot?.state?.objects)
      ? initialDrawSnapshot.state.objects
      : [];
    const currObjects = Array.isArray(tempDraw?.state?.objects)
      ? tempDraw.state.objects
      : [];

    if (initObjects.length === 0 && currObjects.length === 0 && !currDataURL && !initDataURL) {
      return false;
    }

    if (initObjects.length !== currObjects.length) {
      return true;
    }

    if (currDataURL && initDataURL && currDataURL !== initDataURL) {
      return true;
    }

    try {
      const initStr = JSON.stringify(initObjects);
      const currStr = JSON.stringify(currObjects);
      if (initStr !== currStr) return true;
    } catch {
      return true;
    }

    return false;
  }, [isDrawDirty, initialDrawSnapshot, tempDraw]);

  const unsavedObjectCount = useMemo(() => {
    if (!tempDraw) return 0;
    if (Array.isArray(tempDraw?.state?.objects)) return tempDraw.state.objects.length;
    return 0;
  }, [tempDraw]);

  const handleDiscardClick = () => {
    if (hasDrawChanges) {
      setShowDiscardConfirm(true);
    } else {
      handleForceCloseDraw();
    }
  };

  const handleForceCloseDraw = () => {
    setTempDraw(form.solutionDraw);
    setIsDrawDirty(false);
    setShowDiscardConfirm(false);
    setIsDrawModalOpen(false);
  };

  const handleConfirmDiscardDraw = () => {
    setTempDraw(form.solutionDraw);
    setIsDrawDirty(false);
    setShowDiscardConfirm(false);
    setIsDrawModalOpen(false);
  };

  const handleApplyDraw = () => {
    setForm(f => ({ ...f, solutionDraw: tempDraw }));
    setIsDrawDirty(false);
    setShowDiscardConfirm(false);
    setIsDrawModalOpen(false);
  };

  const [isBrowserFs, setIsBrowserFs] = useState(false);

  const toggleBrowserFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsBrowserFs(true);
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
          setIsBrowserFs(false);
        }
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsBrowserFs(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  useEffect(() => {
    if (showDiscardConfirm) {
      cancelDiscardBtnRef.current?.focus();
    }
  }, [showDiscardConfirm]);

  useEffect(() => {
    if (!isDrawModalOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showDiscardConfirm) {
          e.preventDefault();
          setShowDiscardConfirm(false);
          return;
        }
        const hasCanvasOverlay = !!document.querySelector(
          ".draw-popover-menu, .draw-floating-popover, .draw-shortcuts-popover, .draw-ctx-menu-wrap, .sol-est-overlay, .draw-artboard-frame textarea"
        );
        if (e.defaultPrevented || hasCanvasOverlay) {
          return;
        }
        e.preventDefault();
        handleDiscardClick();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleApplyDraw();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isDrawModalOpen, tempDraw, showDiscardConfirm, hasDrawChanges]);

  const currentTopicObj = useMemo(() => TOPICS.find(t => t.id === form.topic) || TOPICS[0], [form.topic]);
  const topicLabel = currentTopicObj.label;
  const TopicIcon = TOPIC_ICON_MAP[currentTopicObj.id] || Calculator;

  const undoStacks = useRef({ question: [], solution: [], choices: [[], [], [], [], []] });

  const pushUndo = (field, index, prev) => {
    if (typeof prev !== "string") return;
    const stack = field === "choices" ? undoStacks.current.choices[index] : undoStacks.current[field];
    if (!stack) return;
    if (stack[stack.length - 1] !== prev) stack.push(prev);
    if (stack.length > 100) stack.shift();
  };

  const handleUndo = (field, index) => {
    const stack = field === "choices" ? undoStacks.current.choices[index] : undoStacks.current[field];
    if (!stack || !stack.length) return;
    const prev = stack.pop();
    if (field === "question") setForm(f => ({ ...f, question: prev }));
    else if (field === "solution") setForm(f => ({ ...f, solution: prev }));
    else setForm(f => {
      const nc = [...f.choices];
      nc[index] = prev;
      return { ...f, choices: nc };
    });
  };

  const undoKeyHandler = (field, index) => (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
      e.preventDefault();
      handleUndo(field, index);
    }
  };

  const trimWordSelection = (el) => {
    if (!el) return;
    requestAnimationFrame(() => {
      const start = el.selectionStart;
      const end = el.selectionEnd;
      if (start === null || end === null || start === end) return;
      const value = el.value;
      let s = start;
      let e = end;
      while (e > s && /\s/.test(value[e - 1])) e--;
      while (s < e && /\s/.test(value[s])) s++;
      if (s !== start || e !== end) el.setSelectionRange(s, e);
    });
  };

  useEffect(() => {
    if (!topicOpen) return;
    const handle = (e) => {
      const root = topicRef.current;
      if (!root) return;
      if (root.contains(e.target)) return;
      setTopicOpen(false);
    };
    window.addEventListener("mousedown", handle);
    return () => window.removeEventListener("mousedown", handle);
  }, [topicOpen]);

  useEffect(() => {
    if (!topicOpen) return;
    const handle = (e) => {
      if (e.key === "Escape") setTopicOpen(false);
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [topicOpen]);

  useEffect(() => {
    if (!labelOpen) return;
    const handle = (e) => {
      const root = labelRef.current;
      if (!root) return;
      if (root.contains(e.target)) return;
      setLabelOpen(false);
    };
    window.addEventListener("mousedown", handle);
    return () => window.removeEventListener("mousedown", handle);
  }, [labelOpen]);

  useEffect(() => {
    if (!labelOpen) return;
    const handle = (e) => {
      if (e.key === "Escape") setLabelOpen(false);
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [labelOpen]);

  const handleSave = () => {
    if (!form.question.trim()) { setError("Question cannot be empty."); return; }
    if (form.choices.slice(0, 4).some(c => !c.trim())) { setError("All 4 choices are required."); return; }
    const data = { ...form };
    if (visualMode === "upload" && data.solutionUpload) {
      data.solutionDraw = data.solutionUpload;
      data.solutionUpload = null;
    }
    onSave(data);
  };

  const valid = form.question.trim() && form.choices.slice(0, 4).every(c => c.trim());
  const filledChoices = form.choices.filter(choice => choice.trim()).length;
  const hasQuestion = !!form.question.trim();
  const hasSolution = !!form.solution.trim();
  const hasVisualSupport = !!(form.solutionDraw || form.solutionUpload);
  const useSideRail = !!sideRailHost;

  const settingsPanel = (
    <div className="qb-editor-rail">
      <div className="qb-editor-side-card qb-editor-side-card-summary">
        <div className="qb-editor-side-card-head">
          <span className="qb-editor-side-kicker">
            <BarChart2 size={13} className="qb-kicker-icon" />
            <span>Editor Summary</span>
          </span>
          <div className="qb-editor-side-title">{initialData ? "Refine this question" : "Build this question"}</div>
          <p className="qb-editor-side-copy">
            Keep the main column focused on writing, then use this rail for settings, progress, and final actions.
          </p>
        </div>
        <div className="qb-editor-progress">
          <div className={`qb-editor-progress-row${hasQuestion ? " is-done" : ""}`}>
            <div className="qb-editor-progress-info">
              <span className="qb-editor-progress-dot" aria-hidden="true" />
              <span>Question prompt</span>
            </div>
            <span className="qb-editor-progress-meta">{hasQuestion ? "Ready" : "Pending"}</span>
          </div>
          <div className={`qb-editor-progress-row${filledChoices >= 4 ? " is-done" : ""}`}>
            <div className="qb-editor-progress-info">
              <span className="qb-editor-progress-dot" aria-hidden="true" />
              <span>Answer choices</span>
            </div>
            <span className="qb-editor-progress-meta">{filledChoices}/{form.choices.length}</span>
          </div>
          <div className={`qb-editor-progress-row${hasSolution ? " is-done" : ""}`}>
            <div className="qb-editor-progress-info">
              <span className="qb-editor-progress-dot" aria-hidden="true" />
              <span>Explanation</span>
            </div>
            <span className="qb-editor-progress-meta">{hasSolution ? "Added" : "Optional"}</span>
          </div>
          <div className={`qb-editor-progress-row${hasVisualSupport ? " is-done" : ""}`}>
            <div className="qb-editor-progress-info">
              <span className="qb-editor-progress-dot" aria-hidden="true" />
              <span>Visual support</span>
            </div>
            <span className="qb-editor-progress-meta">{hasVisualSupport ? "Attached" : "Optional"}</span>
          </div>
        </div>
      </div>

      <div className="qb-editor-side-card">
        <div className="qb-editor-side-card-head">
          <span className="qb-editor-side-kicker">
            <SlidersHorizontal size={13} className="qb-kicker-icon" />
            <span>Question Settings</span>
          </span>
          <div className="qb-editor-side-title">Topic and label</div>
          <p className="qb-editor-side-copy">
            Keep these supporting controls on the side so the main editing flow stays cleaner.
          </p>
        </div>
        <div className="qb-editor-side-stack">
          <div>
            <label className="qb-flabel">
              <Layers size={13} className="qb-flabel-icon" />
              <span>Topic</span>
            </label>
            <div className="qb-select" ref={topicRef} data-dir={topicDir} data-open={topicOpen}>
              <button
                className="qb-select-btn qb-topic-select-btn"
                type="button"
                onClick={() => {
                  if (!topicOpen && topicRef.current) {
                    const rect = topicRef.current.getBoundingClientRect();
                    setTopicDir(window.innerHeight - rect.bottom < 220 ? "up" : "down");
                  }
                  setTopicOpen(o => !o);
                }}
                aria-expanded={topicOpen}
                style={{
                  borderColor: `${currentTopicObj.color}45`,
                  backgroundColor: `${currentTopicObj.color}14`,
                }}
              >
                <span className="qb-select-btn-lead" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    className="qb-topic-lead-icon"
                    style={{ color: currentTopicObj.color, display: "inline-flex", alignItems: "center" }}
                    aria-hidden="true"
                  >
                    {TopicIcon && (
                      <TopicIcon
                        size={16}
                        className="qb-topic-icon"
                        style={{ color: currentTopicObj.color, flexShrink: 0 }}
                        data-colored="true"
                      />
                    )}
                  </span>
                  <span
                    className="qb-topic-btn-text"
                    style={{ color: currentTopicObj.color, fontWeight: 600 }}
                  >
                    {currentTopicObj.label}
                  </span>
                </span>
                <ChevronDown size={16} className={`qb-select-chevron${topicOpen ? " is-open" : ""}`} />
              </button>
              <div className={`qb-select-menu${topicOpen ? " open" : ""}`}>
                {TOPICS.map(t => {
                  const Icon = TOPIC_ICON_MAP[t.id];
                  const isSelected = t.id === form.topic;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      className={`qb-select-item qb-topic-select-item${isSelected ? " on" : ""}`}
                      style={
                        isSelected
                          ? {
                              color: t.color,
                              backgroundColor: `${t.color}1c`,
                              borderColor: `${t.color}40`,
                            }
                          : undefined
                      }
                      onClick={() => {
                        setForm(f => ({ ...f, topic: t.id }));
                        setTopicOpen(false);
                      }}
                    >
                      {Icon && (
                        <span
                          className="qb-topic-icon-wrap"
                          style={{ color: t.color, display: "inline-flex", alignItems: "center" }}
                        >
                          <Icon
                            size={15}
                            className="qb-topic-icon"
                            style={{ color: t.color, flexShrink: 0 }}
                            data-colored="true"
                          />
                        </span>
                      )}
                      <span
                        className="qb-select-item-label"
                        style={isSelected ? { color: t.color, fontWeight: 700 } : undefined}
                      >
                        {t.label}
                      </span>
                      {isSelected && (
                        <Check
                          size={14}
                          className="qb-select-item-check"
                          style={{ color: t.color }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div>
            <label className="qb-flabel">
              <Tag size={13} className="qb-flabel-icon" />
              <span>Label</span> <span className="qb-flabel-sub">(optional)</span>
            </label>
            <div>
              {!useCustomLabel ? (
                <div className="qb-select" ref={labelRef} data-dir={labelDir} data-open={labelOpen}>
                  <button className="qb-select-btn" type="button" onClick={() => {
                    if (!labelOpen && labelRef.current) {
                      const rect = labelRef.current.getBoundingClientRect();
                      setLabelDir(window.innerHeight - rect.bottom < 220 ? "up" : "down");
                    }
                    setLabelOpen(o => !o);
                  }} aria-expanded={labelOpen}>
                    <span>{form.label || "Select a label..."}</span>
                    <ChevronDown size={16} className={`qb-select-chevron${labelOpen ? " is-open" : ""}`} />
                  </button>
                  <div className={`qb-select-menu${labelOpen ? " open" : ""}`}>
                    {PROBLEM_LABELS.map(label => (
                      <button
                        key={label}
                        type="button"
                        className={`qb-select-item${form.label === label ? " on" : ""}`}
                        onClick={() => {
                          setForm(f => ({ ...f, label }));
                          setLabelOpen(false);
                        }}
                      >
                        {label}
                      </button>
                    ))}
                    <button
                      type="button"
                      className="qb-select-item"
                      onClick={() => {
                        setUseCustomLabel(true);
                        setForm(f => ({ ...f, label: "" }));
                        setLabelOpen(false);
                      }}
                    >
                      Other (custom)
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <input
                    className="qb-finput"
                    placeholder="e.g. Age Problem, Sentence Error"
                    value={form.label}
                    onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                  />
                  <button
                    type="button"
                    className="qb-fcancel"
                    style={{ marginTop: 8, padding: "6px 12px", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 6 }}
                    onClick={() => {
                      setUseCustomLabel(false);
                      setForm(f => ({ ...f, label: "" }));
                    }}
                  >
                    <Tag size={13} className="qb-btn-icon" />
                    <span>Use preset label</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="qb-editor-side-card">
        <div className="qb-editor-side-card-head">
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {valid ? (
              <CheckCircle2 size={15} style={{ color: "#34d399", flexShrink: 0 }} />
            ) : (
              <AlertCircle size={15} style={{ color: "#f59e0b", flexShrink: 0 }} />
            )}
            <span className="qb-editor-side-kicker">Actions</span>
          </div>
          <div className="qb-editor-side-title">{valid ? "Ready to save" : "Complete the required fields"}</div>
          <p className="qb-editor-side-copy">
            Save from here once the question prompt and first four choices are filled in (5th optional).
          </p>
        </div>
        {error && <p className="qb-editor-side-error">{error}</p>}
        <div className="qb-editor-side-actions">
          <button type="button" className="qb-fcancel" onClick={onCancel}>
            <X size={19} strokeWidth={2.25} className="qb-btn-icon" />
            <span>Cancel</span>
          </button>
          <button type="button" className="qb-fsave" onClick={handleSave} disabled={!valid}>
            {initialData ? (
              <>
                <Save size={19} strokeWidth={2.25} className="qb-btn-icon" />
                <span>Save Changes</span>
              </>
            ) : (
              <>
                <Plus size={19} strokeWidth={2.25} className="qb-btn-icon" />
                <span>Add Question</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fu qb-form-workspace">
      <div className="qb-form-hero">
        <div className="qb-form-hero-main">
          <span className="qb-section-kicker">Editing Studio</span>
          <div className="qb-form-hdr">
            <button className="qb-back qb-back-ghost" onClick={onCancel} style={{ display: "flex", alignItems: "center" }}>
              <ChevronLeft size={16} style={{ marginRight: 4 }} />
              Back
            </button>
            <span className="qb-form-status">{initialData ? "Editing Existing Question" : "Creating New Question"}</span>
          </div>
          <h2 className="qb-form-title">{initialData ? "Shape and refine the full question flow." : "Build a focused question block with a cleaner workspace."}</h2>
          <p className="qb-form-subtitle">
            Keep the prompt, answer choices, and visual explanation in one centered workspace so the editor feels calm, spacious, and easier to scan.
          </p>
        </div>
        <div className="qb-form-hero-meta" aria-label="Editor highlights">
          <div className="qb-form-chip-pill">
            <Sparkles size={15} className="qb-chip-icon qb-icon-amber" />
            <div className="qb-chip-text">
              <span className="qb-chip-title">CHOICES</span>
              <span className="qb-chip-desc">Up to 5 answer options</span>
            </div>
          </div>
          <div className="qb-form-chip-pill">
            <PenTool size={15} className="qb-chip-icon qb-icon-cyan" />
            <div className="qb-chip-text">
              <span className="qb-chip-title">VISUAL</span>
              <span className="qb-chip-desc">Canvas solution support</span>
            </div>
          </div>
          <div className="qb-form-chip-pill">
            <Layers size={15} className="qb-chip-icon qb-icon-purple" />
            <div className="qb-chip-text">
              <span className="qb-chip-title">CONTROLS</span>
              <span className="qb-chip-desc">Topic & preset labels</span>
            </div>
          </div>
        </div>
      </div>

      <div className="qb-fsec">
        <label className="qb-flabel">
          <HelpCircle size={14} className="qb-flabel-icon" />
          <span>Question</span>
        </label>
        <textarea ref={questionRef} className="qb-fta" placeholder="Type the question here..." value={form.question}
          onKeyDown={undoKeyHandler("question", null)}
          onDoubleClick={() => trimWordSelection(questionRef.current)}
          onChange={e => {
            const val = e.target.value;
            pushUndo("question", null, form.question);
            setForm({...form, question: val});
            handleSymbolShortcuts(e.target, val, v => setForm(f => ({...f, question: v})));
          }} rows={3} />
        <SymbolToolbar
          targetRef={questionRef}
          value={form.question}
          onChange={v => setForm(f => ({ ...f, question: v }))}
        />
      </div>

      <div className="qb-fsec">
        <label className="qb-flabel">
          <ListOrdered size={14} className="qb-flabel-icon" />
          <span>Choices</span> <span className="qb-flabel-sub">— select radio for correct answer</span>
        </label>
        {form.choices.map((c,i) => (
          <div key={i} className={`qb-crow${form.correct===i ? " is-correct" : ""}`}>
            <input
              type="radio"
              className="qb-cradio"
              name="correct"
              checked={form.correct===i}
              onChange={() => setForm({...form, correct:i})}
              aria-label={`Select Choice ${LETTERS[i]} as correct answer`}
            />
            <span className="qb-cletter">{LETTERS[i]}.</span>
            <input ref={el => { choiceRefs.current[i] = el; }} className="qb-finput" placeholder={`Choice ${LETTERS[i]}${i === 4 ? " (optional)" : ""}`} value={c}
              onFocus={() => { setActiveChoice(i); activeChoiceRef.current = choiceRefs.current[i]; }}
              onKeyDown={undoKeyHandler("choices", i)}
              onDoubleClick={() => trimWordSelection(choiceRefs.current[i])}
              onChange={e => {
                const val = e.target.value;
                pushUndo("choices", i, form.choices[i]);
                const nc=[...form.choices];
                nc[i]=val;
                setForm({...form, choices:nc});
                handleSymbolShortcuts(e.target, val, v => {
                  const ncc = [...form.choices];
                  ncc[i] = v;
                  setForm(f => ({ ...f, choices: ncc }));
                });
              }} />
          </div>
        ))}
        <SymbolToolbar
          targetRef={activeChoiceRef}
          value={activeChoice !== null ? form.choices[activeChoice] : ""}
          onChange={v => {
            if (activeChoice === null) return;
            const nc = [...form.choices];
            nc[activeChoice] = v;
            setForm(f => ({ ...f, choices: nc }));
          }}
          disabled={activeChoice === null}
        />
        <div style={{ marginTop: 8 }}>
          {form.choices.length >= 5 ? (
            <button
              type="button"
              className="qb-add-choice qb-remove-choice-btn"
              onClick={() => {
                const nc = [...form.choices];
                nc.pop();
                const newCorrect = form.correct >= nc.length ? 0 : form.correct;
                setForm({...form, choices: nc, correct: newCorrect});
              }}
            >
              – Remove 5th choice
            </button>
          ) : (
            <button
              type="button"
              className="qb-add-choice"
              onClick={() => setForm({...form, choices: [...form.choices, ""]})}
            >
              + Add 5th choice (optional)
            </button>
          )}
        </div>
      </div>

      <div className="qb-fsec">
        <label className="qb-flabel">
          <Lightbulb size={14} className="qb-flabel-icon" />
          <span>Solution / Explanation</span> <span className="qb-flabel-sub">(optional)</span>
        </label>

        <textarea ref={solutionRef} className="qb-fta" placeholder="Write the step-by-step solution here..." value={form.solution}
          onKeyDown={undoKeyHandler("solution", null)}
          onDoubleClick={() => trimWordSelection(solutionRef.current)}
          onChange={e => {
            const val = e.target.value;
            pushUndo("solution", null, form.solution);
            setForm({...form, solution: val});
            handleSymbolShortcuts(e.target, val, v => setForm(f => ({...f, solution: v})));
          }} rows={5} />
        <SymbolToolbar
          targetRef={solutionRef}
          value={form.solution}
          onChange={v => setForm(f => ({ ...f, solution: v }))}
        />

        <div className="sol-tabs" aria-label="Additional visual content" style={{ marginTop:12 }}>
          <button 
            type="button" 
            className={`sol-tab${visualMode==="draw"?" sol-on":""}`} 
            onClick={() => {
              if (visualMode === "draw") {
                setVisualMode(null);
              } else {
                setVisualMode("draw");
                if (!form.solutionDraw) {
                  handleOpenDrawModal();
                }
              }
            }}
          >
            <Pencil size={14} />
            {form.solutionDraw ? "Whiteboard Diagram" : "Add Whiteboard"}
          </button>
          <button type="button" className={`sol-tab${visualMode==="upload"?" sol-on":""}`} onClick={() => setVisualMode(visualMode==="upload"?null:"upload")}>
            <Image size={14} />
            {form.solutionUpload ? "Image" : "Add Image"}
          </button>
        </div>

        {visualMode==="draw" && (
          <div className="qb-draw-visual-section">
            {form.solutionDraw ? (
              <div className="qb-draw-preview-card">
                <div 
                  className="qb-draw-preview-media"
                  onClick={handleOpenDrawModal}
                  title="Click to open full-screen whiteboard studio"
                >
                  {drawPreviewUrl ? (
                    <img src={drawPreviewUrl} alt="Solution diagram snapshot" className="qb-draw-preview-img" />
                  ) : (
                    <div className="qb-draw-preview-placeholder">
                      <Sparkles size={24} />
                      <span>Diagram Attached (Vector State)</span>
                    </div>
                  )}
                  <div className="qb-draw-preview-overlay">
                    <Maximize2 size={16} />
                    <span>Open Full Screen</span>
                  </div>
                </div>

                <div className="qb-draw-preview-info">
                  <div className="qb-draw-preview-meta">
                    <span className="qb-draw-badge-pill">
                      <span className="qb-draw-pulse-dot" />
                      Whiteboard Attached
                    </span>
                    <span className="qb-draw-preview-hint">Rendered in solution view & zoomable</span>
                  </div>
                  <h4 className="qb-draw-preview-title">Visual Solution Canvas</h4>
                  <p className="qb-draw-preview-copy">
                    This step-by-step diagram is linked to this question. Examinees can inspect it and zoom in full detail during review.
                  </p>
                  <div className="qb-draw-preview-actions">
                    <button
                      type="button"
                      className="qb-draw-action-btn qb-draw-action-btn-edit"
                      onClick={handleOpenDrawModal}
                    >
                      <Pencil size={14} />
                      <span>Open Full-Screen Whiteboard</span>
                    </button>
                    <button
                      type="button"
                      className="qb-draw-action-btn qb-draw-action-btn-remove"
                      onClick={() => setConfirmRemoveDraw(true)}
                    >
                      <Trash2 size={14} />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="qb-draw-empty-card">
                <div className="qb-draw-empty-icon-wrap">
                  <PenTool size={22} />
                </div>
                <div className="qb-draw-empty-content">
                  <h4 className="qb-draw-empty-title">Visual Explanation & Whiteboard Studio</h4>
                  <p className="qb-draw-empty-desc">
                    Illustrate calculations, fraction cancellation steps, geometry angles, or ratio tables with vector brushes, text, and math symbols in a dedicated full-screen view.
                  </p>
                </div>
                <button
                  type="button"
                  className="qb-draw-launch-btn"
                  onClick={handleOpenDrawModal}
                >
                  <Pencil size={14} />
                  <span>Launch Full-Screen Whiteboard</span>
                </button>
              </div>
            )}
          </div>
        )}

        {visualMode==="upload" && (
          <div style={{ display:"flex", flexDirection:"column", gap:12, marginTop:12 }}>
            {form.solutionUpload ? (
              <div className="qb-upload-preview">
                <img src={form.solutionUpload} alt="uploaded solution" />
                <button type="button" className="qb-upload-remove" onClick={() => setForm(f => ({...f, solutionUpload: null}))}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            ) : (
              <label className="qb-upload-label" style={{ opacity: uploadingImage ? 0.6 : 1, cursor: uploadingImage ? "wait" : "pointer" }}>
                {uploadingImage ? (
                  <>
                    <Loader size={32} className="qb-spinner" />
                    <span>Uploading image...</span>
                    <span>Please wait</span>
                  </>
                ) : (
                  <>
                    <Image size={32} />
                    <span>Click to upload an image or screenshot</span>
                    <span>PNG, JPG, WEBP (max 10MB)</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                  style={{ display:"none" }}
                  disabled={uploadingImage}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;

                    // Validate file
                    const validation = validateImageFile(file);
                    if (!validation.valid) {
                      setUploadError(validation.error);
                      e.target.value = "";
                      return;
                    }

                    setUploadingImage(true);
                    setUploadError("");

                    try {
                      // Upload to Supabase Storage
                      const { url } = await uploadImageToSupabase(file, "solutions", "user");
                      setForm(f => ({...f, solutionUpload: url}));
                    } catch (err) {
                      console.error("Image upload failed:", err);
                      setUploadError(err.message || "Failed to upload image. Please try again.");
                    } finally {
                      setUploadingImage(false);
                      e.target.value = "";
                    }
                  }}
                />
              </label>
            )}
            {uploadError && (
              <div style={{
                padding: "12px",
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                borderRadius: "8px",
                color: "#ef4444",
                fontSize: "13px",
                fontFamily: "var(--font-sans)"
              }}>
                {uploadError}
              </div>
            )}
          </div>
        )}
      </div>

      {!useSideRail && settingsPanel}

      {isDrawModalOpen && createPortal(
        <div 
          className="qb-draw-studio-view" 
          role="region" 
          aria-label="Solution Whiteboard Studio"
        >
          {/* Studio Top Navigation Bar */}
          <header className="qb-draw-studio-nav">
            <div className="qb-draw-studio-nav-left">
              <button
                type="button"
                className="qb-draw-studio-back-btn"
                onClick={handleDiscardClick}
                title="Return to Question Form (Esc)"
              >
                <ArrowLeft size={16} />
                <span className="qb-draw-studio-btn-text">
                  Back<span className="qb-draw-studio-btn-text-full"> to Question</span>
                </span>
              </button>

              <div className="qb-draw-studio-divider" />

              <div className="qb-draw-studio-info">
                <div className="qb-draw-studio-title-line">
                  <h2 className="qb-draw-studio-title">
                    <span className="qb-draw-studio-title-full">Solution Whiteboard Studio</span>
                    <span className="qb-draw-studio-title-short">Whiteboard</span>
                  </h2>
                  {topicLabel && (
                    <span className="qb-draw-studio-topic-label" title={`Exam Subject: ${topicLabel}`}>
                      · {topicLabel}
                    </span>
                  )}
                </div>
                <span className="qb-draw-studio-sub">
                  Vector workspace for math steps, formulas, and geometry
                </span>
              </div>
            </div>

            <div className="qb-draw-studio-nav-right">
              <button
                type="button"
                className={`qb-draw-studio-tool-btn${showModalLayers ? " is-active" : ""}`}
                onClick={() => setShowModalLayers(prev => !prev)}
                aria-pressed={showModalLayers}
                aria-label={showModalLayers ? "Hide Layers Panel" : "Show Layers Panel"}
                title={showModalLayers ? "Hide Layers Panel" : "Show Layers Panel"}
              >
                <Layers size={14} />
                <span>Layers</span>
              </button>

              <button
                type="button"
                className={`qb-draw-studio-tool-btn qb-draw-studio-tool-fs${isBrowserFs ? " is-active" : ""}`}
                onClick={toggleBrowserFullscreen}
                aria-pressed={isBrowserFs}
                aria-label={isBrowserFs ? "Exit Window Fullscreen" : "Window Fullscreen"}
                title={isBrowserFs ? "Exit Window Fullscreen" : "Window Fullscreen"}
              >
                {isBrowserFs ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                <span className="qb-draw-studio-tool-label">
                  {isBrowserFs ? "Exit" : "Fullscreen"}
                </span>
              </button>

              <div className="qb-draw-studio-divider" />

              <button
                type="button"
                className="qb-draw-studio-btn-save"
                onClick={handleApplyDraw}
                title="Save drawing and return to question (Ctrl+S)"
              >
                <Check size={16} />
                <span>
                  Save<span className="qb-draw-studio-btn-text-full"> &amp; Return</span>
                </span>
              </button>
            </div>
          </header>

          {/* Full View Studio Body */}
          <main className="qb-draw-studio-body">
            <div className="qb-draw-studio-canvas-area">
              <DrawCanvas
                value={tempDraw}
                onChange={handleDrawChange}
                isStudioModal={true}
                layersHost={showModalLayers ? modalLayersHostEl : null}
                questionContext={{
                  question: form.question,
                  solution: form.solution,
                  choices: form.choices,
                  correct: form.correct,
                  topic: form.topic,
                  topicLabel: topicLabel,
                  label: form.label,
                }}
              />
            </div>

            {showModalLayers && (
              <aside className="qb-draw-studio-sidebar">
                <div className="qb-draw-studio-sidebar-header">
                  <div className="qb-draw-studio-sidebar-title">
                    <Layers size={14} />
                    <span>Visual Layers</span>
                  </div>
                  <button
                    type="button"
                    className="qb-draw-studio-sidebar-close"
                    onClick={() => setShowModalLayers(false)}
                    title="Hide Layers Sidebar"
                  >
                    <X size={14} />
                  </button>
                </div>
                <div ref={setModalLayersHostEl} className="qb-studio-layers-slot" />
              </aside>
            )}
          </main>
        </div>,
        document.body
      )}

      {showDiscardConfirm && createPortal(
        <div
          className="qb-modal-backdrop qb-discard-modal-overlay"
          role="presentation"
          onClick={() => setShowDiscardConfirm(false)}
        >
          <div
            className="qb-modal-card qb-discard-modal-card"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="qb-discard-modal-title"
            aria-describedby="qb-discard-modal-desc"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="qb-discard-modal-header">
              <div className="qb-discard-modal-icon-badge" aria-hidden="true">
                <AlertTriangle size={24} strokeWidth={2.4} />
              </div>
              <div className="qb-discard-modal-headings">
                <h3 id="qb-discard-modal-title" className="qb-discard-modal-title">
                  Discard Whiteboard Changes?
                </h3>
                <p id="qb-discard-modal-desc" className="qb-discard-modal-desc">
                  Are you sure you want to discard your changes? All unsaved shapes, math notations, and drawing steps made in this session will be permanently lost.
                </p>
              </div>
            </div>

            <div className="qb-discard-modal-preview">
              <div className="qb-discard-modal-preview-meta">
                <span className="qb-discard-modal-topic-pill">
                  {topicLabel || "Whiteboard Studio"}
                </span>
                <span className="qb-discard-modal-count-pill">
                  <Layers size={12} />
                  <span>
                    {unsavedObjectCount > 0
                      ? `${unsavedObjectCount} active element${unsavedObjectCount === 1 ? "" : "s"}`
                      : "Unsaved diagram edits"}
                  </span>
                </span>
              </div>
              <p className="qb-discard-modal-preview-text">
                Your previously saved diagram will be preserved. This action only discards edits made during this session.
              </p>
            </div>

            <div className="qb-discard-modal-actions">
              <button
                ref={cancelDiscardBtnRef}
                type="button"
                className="qb-discard-modal-btn qb-discard-modal-btn-cancel"
                onClick={() => setShowDiscardConfirm(false)}
              >
                <ArrowLeft size={14} className="qb-btn-icon" />
                <span>Keep Editing</span>
              </button>

              <div className="qb-discard-modal-actions-right">
                <button
                  type="button"
                  className="qb-discard-modal-btn qb-discard-modal-btn-save"
                  onClick={handleApplyDraw}
                >
                  <Check size={14} className="qb-btn-icon" />
                  <span>Save & Return</span>
                </button>

                <button
                  type="button"
                  className="qb-discard-modal-btn qb-discard-modal-btn-danger"
                  onClick={handleConfirmDiscardDraw}
                >
                  <Trash2 size={14} className="qb-btn-icon" />
                  <span>Discard</span>
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {confirmRemoveDraw && createPortal(
        <div
          className="qb-modal-backdrop qb-delete-modal-overlay"
          role="presentation"
          onClick={() => setConfirmRemoveDraw(false)}
        >
          <div
            className="qb-modal-card"
            style={{ maxWidth: 380 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="qb-remove-draw-title"
            onClick={e => e.stopPropagation()}
          >
            <h3 id="qb-remove-draw-title" className="qb-modal-title">
              Remove drawing?
            </h3>
            <p className="qb-modal-text">
              This will permanently remove the solution diagram from this question.
            </p>
            <div className="qb-modal-actions">
              <button
                type="button"
                className="qb-modal-btn qb-modal-btn-cancel"
                onClick={() => setConfirmRemoveDraw(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="qb-modal-btn qb-modal-btn-danger"
                onClick={() => { setForm(f => ({...f, solutionDraw: null})); setVisualMode(null); setConfirmRemoveDraw(false); }}
              >
                Remove
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      {!useSideRail && error && <p className="qb-ferr">{error}</p>}
      {!useSideRail && (
        <div className="qb-factions">
          <button type="button" className="qb-fcancel" onClick={onCancel}>
            <X size={19} strokeWidth={2.25} className="qb-btn-icon" />
            <span>Cancel</span>
          </button>
          <button type="button" className="qb-fsave" onClick={handleSave} disabled={!valid}>
            {initialData ? (
              <>
                <Save size={19} strokeWidth={2.25} className="qb-btn-icon" />
                <span>Save Changes</span>
              </>
            ) : (
              <>
                <Plus size={19} strokeWidth={2.25} className="qb-btn-icon" />
                <span>Add Question</span>
              </>
            )}
          </button>
        </div>
      )}
      {useSideRail && createPortal(settingsPanel, sideRailHost)}
    </div>
  );
}
