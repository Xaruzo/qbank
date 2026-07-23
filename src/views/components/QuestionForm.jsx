import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { TOPICS, LETTERS, PROBLEM_LABELS } from "../../constants/appConstants";
import DrawCanvas from "./DrawCanvas";
import SymbolToolbar from "./SymbolToolbar";
import { handleSymbolShortcuts } from "../../utils/symbolShortcuts";
import { ChevronLeft, ChevronDown, Pencil, Image } from "lucide-react";

export default function QuestionForm({ initialData, onSave, onCancel, layersHost }) {
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
    if (form.choices.some(c => !c.trim())) { setError("All 4 choices are required."); return; }
    const data = { ...form };
    if (visualMode === "upload" && data.solutionUpload) {
      data.solutionDraw = data.solutionUpload;
      data.solutionUpload = null;
    }
    onSave(data);
  };

  const valid = form.question.trim() && form.choices.every(c => c.trim());

  return (
    <div className="fu">
      <div className="qb-form-hdr">
        <button className="qb-back" onClick={onCancel} style={{ display: "flex", alignItems: "center" }}>
          <ChevronLeft size={16} style={{ marginRight: 4 }} />
          Back
        </button>
        <h2 className="qb-form-title">{initialData ? "Edit Question" : "New Question"}</h2>
      </div>

      {/* Question Section */}
      <section className="qb-form-section">
        <h3 className="qb-form-section-title">Question</h3>
        <div className="qb-form-section-content">
          <textarea ref={questionRef} className="qb-fta-enhanced" placeholder="Type the question here..." value={form.question}
            onChange={e => {
              const val = e.target.value;
              setForm({...form, question: val});
              handleSymbolShortcuts(e.target, val, v => setForm(f => ({...f, question: v})));
            }} rows={4} />
          <SymbolToolbar
            targetRef={questionRef}
            value={form.question}
            onChange={v => setForm(f => ({ ...f, question: v }))}
          />
        </div>
      </section>

      {/* Choices Section */}
      <section className="qb-form-section">
        <h3 className="qb-form-section-title">Answer Choices</h3>
        <div className="qb-form-section-content">
          <div className="qb-choices-description">
            Select the correct answer by clicking the radio button
          </div>
          <div className="qb-choices-grid">
            {form.choices.map((c,i) => (
              <div key={i} className="qb-choice-row">
                <label className="qb-choice-label">
                  <input
                    type="radio"
                    className="qb-cradio-enhanced"
                    name="correct"
                    checked={form.correct===i}
                    onChange={() => setForm({...form, correct:i})}
                  />
                  <span className="qb-choice-letter">{LETTERS[i]}</span>
                  <span className="qb-choice-text">{c}</span>
                </label>
                <input
                  ref={el => { choiceRefs.current[i] = el; }}
                  className="qb-finput-enhanced"
                  placeholder={`Choice ${LETTERS[i]}`}
                  value={c}
                  onFocus={() => { setActiveChoice(i); activeChoiceRef.current = choiceRefs.current[i]; }}
                  onChange={e => {
                    const val = e.target.value;
                    const nc=[...form.choices];
                    nc[i]=val;
                    setForm({...form, choices:nc});
                    handleSymbolShortcuts(e.target, val, v => {
                      const ncc = [...form.choices];
                      ncc[i] = v;
                      setForm(f => ({ ...f, choices: ncc }));
                    });
                  }}
                />
              </div>
            ))}
          </div>
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
        </div>
      </section>

      {/* Solution Section */}
      <section className="qb-form-section">
        <h3 className="qb-form-section-title">Solution Explanation</h3>
        <div className="qb-form-section-content">
          <div className="qb-solution-description">
            Explain the solution step-by-step (optional)
          </div>
          <textarea ref={solutionRef} className="qb-fta-enhanced" placeholder="Write the step-by-step solution here..." value={form.solution}
            onChange={e => {
              const val = e.target.value;
              setForm({...form, solution: val});
              handleSymbolShortcuts(e.target, val, v => setForm(f => ({...f, solution: v})));
            }} rows={6} />
          <SymbolToolbar
            targetRef={solutionRef}
            value={form.solution}
            onChange={v => setForm(f => ({ ...f, solution: v }))}
          />

          <div className="qb-solution-tabs" aria-label="Additional visual content">
            <button
              type="button"
              className={`qb-solution-tab${visualMode==="draw"?" qb-tab-active":""}`}
              onClick={() => setVisualMode(visualMode==="draw"?null:"draw")}
            >
              <Pencil size={14} />
              <span>{form.solutionDraw ? "Drawing" : "Add Drawing"}</span>
            </button>
            <button
              type="button"
              className={`qb-solution-tab${visualMode==="upload"?" qb-tab-active":""}`}
              onClick={() => setVisualMode(visualMode==="upload"?null:"upload")}
            >
              <Image size={14} />
              <span>{form.solutionUpload ? "Image" : "Add Image"}</span>
            </button>
          </div>

          {visualMode==="draw" && (
            <div className="qb-drawing-container">
              <DrawCanvas
                value={form.solutionDraw}
                onChange={v => setForm(f => ({...f, solutionDraw:v}))}
                layersHost={layersHost}
              />
              {form.solutionDraw && (
                <div className="qb-drawing-actions">
                  <button
                    type="button"
                    onClick={() => setConfirmRemoveDraw(true)}
                    className="qb-button-secondary"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    Remove Drawing
                  </button>
                </div>
              )}
            </div>
          )}

          {visualMode==="upload" && (
            <div className="qb-upload-container">
              {form.solutionUpload ? (
                <div className="qb-upload-preview">
                  <img src={form.solutionUpload} alt="uploaded solution" />
                  <button type="button" className="qb-upload-remove" onClick={() => setForm(f => ({...f, solutionUpload: null}))}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              ) : (
                <label className="qb-upload-label-enhanced">
                  <Image size={32} />
                  <span>Click to upload an image or screenshot</span>
                  <span>PNG, JPG, WEBP</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    style={{ display:"none" }}
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        setForm(f => ({...f, solutionUpload: ev.target?.result}));
                      };
                      reader.readAsDataURL(file);
                      e.target.value = "";
                    }}
                  />
                </label>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Metadata Section */}
      <section className="qb-form-section">
        <h3 className="qb-form-section-title">Question Details</h3>
        <div className="qb-form-section-content">
          <div className="qb-metadata-grid">
            <div>
              <label className="qb-field-label">Topic</label>
              <div className="qb-select-enhanced" ref={topicRef} data-dir={topicDir} data-open={topicOpen}>
                <button
                  className="qb-select-btn-enhanced"
                  type="button"
                  onClick={() => {
                    if (!topicOpen && topicRef.current) {
                      const rect = topicRef.current.getBoundingClientRect();
                      setTopicDir(window.innerHeight - rect.bottom < 220 ? "up" : "down");
                    }
                    setTopicOpen(o => !o);
                  }}
                  aria-expanded={topicOpen}
                >
                  <span className="qb-select-label">{topicLabel}</span>
                  <ChevronDown size={16} />
                </button>
                <div className={`qb-select-menu${topicOpen ? " open" : ""}`}>
                  {TOPICS.map(t => (
                    <button
                      key={t.id}
                      type="button"
                      className={`qb-select-item${t.id === form.topic ? " qb-select-item-active" : ""}`}
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
              <label className="qb-field-label">
                Label{" "}
                <span className="qb-field-label-optional">(optional)</span>
              </label>
              <div>
                {!useCustomLabel ? (
                  <div className="qb-select-enhanced" ref={labelRef} data-dir={labelDir} data-open={labelOpen}>
                    <button
                      className="qb-select-btn-enhanced"
                      type="button"
                      onClick={() => {
                        if (!labelOpen && labelRef.current) {
                          const rect = labelRef.current.getBoundingClientRect();
                          setLabelDir(window.innerHeight - rect.bottom < 220 ? "up" : "down");
                        }
                        setLabelOpen(o => !o);
                      }}
                      aria-expanded={labelOpen}
                    >
                      <span className="qb-select-label">{form.label || "Select a label..."}</span>
                      <ChevronDown size={16} />
                    </button>
                    <div className={`qb-select-menu${labelOpen ? " open" : ""}`}>
                      {PROBLEM_LABELS.map(label => (
                        <button
                          key={label}
                          type="button"
                          className={`qb-select-item${form.label === label ? " qb-select-item-active" : ""}`}
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
                  <div className="qb-custom-label-container">
                    <input
                      className="qb-finput-enhanced"
                      placeholder="e.g. Age Problem, Sentence Error"
                      value={form.label}
                      onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                    />
                    <div className="qb-label-toggle">
                      <button
                        type="button"
                        className="qb-button-secondary"
                        onClick={() => {
                          setUseCustomLabel(false);
                          setForm(f => ({ ...f, label: "" }));
                        }}
                      >
                        Use preset label
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {confirmRemoveDraw && createPortal(
        <div className="qb-modal-overlay">
          <div className="qb-modal-content">
            <div className="qb-modal-header">
              <h3 className="qb-modal-title">Remove drawing?</h3>
            </div>
            <div className="qb-modal-body">
              <p className="qb-modal-text">This will permanently delete your drawing.</p>
            </div>
            <div className="qb-modal-footer">
              <button
                type="button"
                onClick={() => setConfirmRemoveDraw(false)}
                className="qb-button-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => { setForm(f => ({...f, solutionDraw: null})); setVisualMode(null); setConfirmRemoveDraw(false); }}
                className="qb-button-primary"
              >
                Remove
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      {error && <p className="qb-ferr">{error}</p>}
      <div className="qb-form-actions">
        <button className="qb-button-secondary" onClick={onCancel}>Cancel</button>
        <button className="qb-button-primary" onClick={handleSave} disabled={!valid}>{initialData ? "Save Changes" : "Add Question"}</button>
      </div>
    </div>
  );
}
