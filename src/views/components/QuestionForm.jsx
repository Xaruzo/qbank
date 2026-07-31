import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { TOPICS, LETTERS, PROBLEM_LABELS } from "../../constants/appConstants";
import DrawCanvas from "./DrawCanvas";
import SymbolToolbar from "./SymbolToolbar";
import { handleSymbolShortcuts } from "../../utils/symbolShortcuts";
import { uploadImageToSupabase, validateImageFile } from "../../utils/imageUpload";
import { ChevronLeft, ChevronDown, Pencil, Image, Upload, Loader } from "lucide-react";

export default function QuestionForm({ initialData, onSave, onCancel, layersHost, sideRailHost }) {
  const [form, setForm] = useState(initialData ? {
    ...initialData,
    label: typeof initialData.label === "string" ? initialData.label : "",
    solutionUpload: (initialData.solutionDraw && typeof initialData.solutionDraw === "string" && initialData.solutionDraw.startsWith("data:image"))
      ? initialData.solutionDraw
      : initialData.solutionUpload || null,
  } : {
    question: "",
    choices: ["", "", "", ""],
    correct: 0,
    solution: "",
    solutionDraw: null,
    solutionUpload: null,
    topic: "numerical",
    label: "",
  });
  const [visualMode, setVisualMode] = useState(
    form.solutionUpload ? "upload"
    : form.solutionDraw && typeof form.solutionDraw === "string" && form.solutionDraw.startsWith("data:image") ? "upload"
    : form.solutionDraw ? "draw"
    : null
  );
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

  const topicLabel = useMemo(() => TOPICS.find(t => t.id === form.topic)?.label || "Topic", [form.topic]);

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
          <span className="qb-editor-side-kicker">Editor Summary</span>
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
          <span className="qb-editor-side-kicker">Question Settings</span>
          <div className="qb-editor-side-title">Topic and label</div>
          <p className="qb-editor-side-copy">
            Keep these supporting controls on the side so the main editing flow stays cleaner.
          </p>
        </div>
        <div className="qb-editor-side-stack">
          <div>
            <label className="qb-flabel">Topic</label>
            <div className="qb-select" ref={topicRef} data-dir={topicDir} data-open={topicOpen}>
              <button className="qb-select-btn" type="button" onClick={() => {
                if (!topicOpen && topicRef.current) {
                  const rect = topicRef.current.getBoundingClientRect();
                  setTopicDir(window.innerHeight - rect.bottom < 220 ? "up" : "down");
                }
                setTopicOpen(o => !o);
              }} aria-expanded={topicOpen}>
                <span>{topicLabel}</span>
                <ChevronDown size={16} />
              </button>
              <div className={`qb-select-menu${topicOpen ? " open" : ""}`}>
                {TOPICS.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    className={`qb-select-item${t.id === form.topic ? " on" : ""}`}
                    onClick={() => {
                      setForm(f => ({ ...f, topic: t.id }));
                      setTopicOpen(false);
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="qb-flabel">
              Label{" "}
              <span style={{ textTransform:"none", letterSpacing:0, fontFamily:"DM Sans,sans-serif", fontSize:11, color:"var(--text-faint)" }}>(optional)</span>
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
                    <ChevronDown size={16} />
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
                    style={{ marginTop: 8, padding: "6px 12px", fontSize: 12 }}
                    onClick={() => {
                      setUseCustomLabel(false);
                      setForm(f => ({ ...f, label: "" }));
                    }}
                  >
                    Use preset label
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="qb-editor-side-card">
        <div className="qb-editor-side-card-head">
          <span className="qb-editor-side-kicker">Actions</span>
          <div className="qb-editor-side-title">{valid ? "Ready to save" : "Complete the required fields"}</div>
          <p className="qb-editor-side-copy">
            Save from here once the question prompt and first four choices are filled in (5th optional).
          </p>
        </div>
        {error && <p className="qb-editor-side-error">{error}</p>}
        <div className="qb-editor-side-actions">
          <button className="qb-fcancel" onClick={onCancel}>Cancel</button>
          <button className="qb-fsave" onClick={handleSave} disabled={!valid}>{initialData ? "Save Changes" : "Add Question"}</button>
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
          <span className="qb-form-chip" data-label="Choices">Up to 5 answer choices</span>
          <span className="qb-form-chip" data-label="Visual">Visual solution support</span>
          <span className="qb-form-chip" data-label="Controls">Topic and label controls</span>
        </div>
      </div>

      <div className="qb-fsec">
        <label className="qb-flabel">Question</label>
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
        <label className="qb-flabel">Choices <span style={{ textTransform:"none", letterSpacing:0, fontFamily:"DM Sans,sans-serif", fontSize:11, color:"var(--text-faint)" }}>— select radio for correct answer</span></label>
        {form.choices.map((c,i) => (
          <div key={i} className="qb-crow">
            <input type="radio" className="qb-cradio" name="correct" checked={form.correct===i} onChange={() => setForm({...form, correct:i})} />
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
              className="qb-add-choice"
              onClick={() => {
                const nc = [...form.choices];
                nc.pop();
                const newCorrect = form.correct >= nc.length ? 0 : form.correct;
                setForm({...form, choices: nc, correct: newCorrect});
              }}
              style={{
                background:"none", border:"1px solid var(--border)", color:"var(--text-muted)",
                fontFamily:"'DM Sans',sans-serif", fontSize:12, fontWeight:600,
                padding:"6px 12px", borderRadius:8, cursor:"pointer"
              }}
            >
              – Remove 5th choice
            </button>
          ) : (
            <button
              type="button"
              className="qb-add-choice"
              onClick={() => setForm({...form, choices: [...form.choices, ""]})}
              style={{
                background:"none", border:"1px dashed var(--border)", color:"var(--text-muted)",
                fontFamily:"'DM Sans',sans-serif", fontSize:12, fontWeight:600,
                padding:"6px 12px", borderRadius:8, cursor:"pointer"
              }}
            >
              + Add 5th choice (optional)
            </button>
          )}
        </div>
      </div>

      <div className="qb-fsec">
        <label className="qb-flabel">
          Solution / Explanation{" "}
          <span style={{ textTransform:"none", letterSpacing:0, fontFamily:"DM Sans,sans-serif", fontSize:11, color:"var(--text-faint)" }}>(optional)</span>
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
          <button type="button" className={`sol-tab${visualMode==="draw"?" sol-on":""}`} onClick={() => setVisualMode(visualMode==="draw"?null:"draw")}>
            <Pencil size={14} />
            {form.solutionDraw ? "Drawing" : "Add Drawing"}
          </button>
          <button type="button" className={`sol-tab${visualMode==="upload"?" sol-on":""}`} onClick={() => setVisualMode(visualMode==="upload"?null:"upload")}>
            <Image size={14} />
            {form.solutionUpload ? "Image" : "Add Image"}
          </button>
        </div>

        {visualMode==="draw" && (
          <div style={{ marginTop:12 }}>
            <DrawCanvas value={form.solutionDraw} onChange={v => setForm(f => ({...f, solutionDraw:v}))} layersHost={layersHost} />
            {form.solutionDraw && (
              <div style={{ display:"flex", justifyContent:"flex-end", marginTop:8 }}>
                <button
                  type="button"
                  onClick={() => setConfirmRemoveDraw(true)}
                  style={{
                    background:"none", border:"1px solid var(--border)", color:"#fff",
                    fontFamily:"'DM Sans',sans-serif", fontSize:12, fontWeight:600,
                    padding:"5px 12px", borderRadius:8, cursor:"pointer",
                    display:"inline-flex", alignItems:"center", gap:6
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  Remove Drawing
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
                fontFamily: "'DM Sans', sans-serif"
              }}>
                {uploadError}
              </div>
            )}
          </div>
        )}
      </div>

      {!useSideRail && settingsPanel}

      {confirmRemoveDraw && createPortal(
        <div style={{
          position:"fixed", inset:0, zIndex:9999,
          display:"flex", alignItems:"center", justifyContent:"center",
          background:"rgba(0,0,0,.55)", backdropFilter:"blur(4px)"
        }}>
          <div style={{
            background:"var(--surface-h)", border:"1px solid var(--border)",
            borderRadius:14, padding:24, maxWidth:340, width:"90%",
            boxShadow:"0 20px 50px rgba(0,0,0,.4)"
          }}>
            <div style={{ fontSize:14, fontWeight:600, marginBottom:8 }}>Remove drawing?</div>
            <div style={{ fontSize:13, color:"var(--text-muted)", marginBottom:18, lineHeight:1.4 }}>
              This will permanently delete your drawing.
            </div>
            <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
              <button
                type="button"
                onClick={() => setConfirmRemoveDraw(false)}
                style={{
                  background:"none", border:"1px solid var(--border)", color:"var(--text-muted)",
                  fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:600,
                  padding:"8px 16px", borderRadius:10, cursor:"pointer"
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => { setForm(f => ({...f, solutionDraw: null})); setVisualMode(null); setConfirmRemoveDraw(false); }}
                style={{
                  background:"#dc2626", border:"none", color:"#fff",
                  fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:600,
                  padding:"8px 16px", borderRadius:10, cursor:"pointer"
                }}
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
          <button className="qb-fcancel" onClick={onCancel}>Cancel</button>
          <button className="qb-fsave" onClick={handleSave} disabled={!valid}>{initialData ? "Save Changes" : "Add Question"}</button>
        </div>
      )}
      {useSideRail && createPortal(settingsPanel, sideRailHost)}
    </div>
  );
}
