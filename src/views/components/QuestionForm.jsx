import React, { useEffect, useMemo, useRef, useState } from "react";
import { TOPICS, LETTERS, PROBLEM_LABELS } from "../../constants/appConstants";
import DrawCanvas from "./DrawCanvas";
import SymbolToolbar from "./SymbolToolbar";
import { handleSymbolShortcuts } from "../../utils/symbolShortcuts";
import { ChevronLeft, ChevronDown, Type, Pencil, Image } from "lucide-react";

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
  const [solMode, setSolMode] = useState(
    form.solutionUpload ? "upload"
    : form.solutionDraw && typeof form.solutionDraw === "string" && form.solutionDraw.startsWith("data:image") ? "upload"
    : form.solutionDraw ? "draw"
    : "text"
  );
  const [error, setError] = useState("");
  const [topicOpen, setTopicOpen] = useState(false);
  const topicRef = useRef(null);
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

  const handleSave = () => {
    if (!form.question.trim()) { setError("Question cannot be empty."); return; }
    if (form.choices.some(c => !c.trim())) { setError("All 4 choices are required."); return; }
    const data = { ...form };
    if (solMode === "text") {
      data.solutionDraw = null;
      data.solutionUpload = null;
    } else if (solMode === "draw") {
      data.solution = "";
      data.solutionUpload = null;
    } else if (solMode === "upload") {
      data.solution = "";
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

      <div className="qb-fsec">
        <label className="qb-flabel">Question</label>
        <textarea ref={questionRef} className="qb-fta" placeholder="Type the question here..." value={form.question}
          onChange={e => {
            const val = e.target.value;
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
            <input ref={el => { choiceRefs.current[i] = el; }} className="qb-finput" placeholder={`Choice ${LETTERS[i]}`} value={c}
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
      </div>

      <div className="qb-fsec">
        <div style={{ display:"flex", alignItems:"center", marginBottom:12 }}>
          <label className="qb-flabel" style={{ margin:0 }}>
            Solution / Explanation{" "}
            <span style={{ textTransform:"none", letterSpacing:0, fontFamily:"DM Sans,sans-serif", fontSize:11, color:"var(--text-faint)" }}>(optional)</span>
          </label>
          <div className="sol-tabs" style={{ marginLeft:"auto" }}>
            <button className={`sol-tab${solMode==="text"?" sol-on":""}`} onClick={() => setSolMode("text")} style={{ display: "flex", alignItems: "center" }}>
              <Type size={14} style={{ marginRight: 6 }} />
              Text
            </button>
            <button className={`sol-tab${solMode==="draw"?" sol-on":""}`} onClick={() => setSolMode("draw")} style={{ display: "flex", alignItems: "center" }}>
              <Pencil size={14} style={{ marginRight: 6 }} />
              Draw
            </button>
            <button className={`sol-tab${solMode==="upload"?" sol-on":""}`} onClick={() => setSolMode("upload")} style={{ display: "flex", alignItems: "center" }}>
              <Image size={14} style={{ marginRight: 6 }} />
              Upload
            </button>
          </div>
        </div>

        {solMode==="text" ? (
          <>
            <textarea ref={solutionRef} className="qb-fta" placeholder="Write the step-by-step solution here..." value={form.solution}
              onChange={e => {
                const val = e.target.value;
                setForm({...form, solution: val});
                handleSymbolShortcuts(e.target, val, v => setForm(f => ({...f, solution: v})));
              }} rows={5} />
            <SymbolToolbar
              targetRef={solutionRef}
              value={form.solution}
              onChange={v => setForm(f => ({ ...f, solution: v }))}
            />
          </>
        ) : solMode==="upload" ? (
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {form.solutionUpload ? (
              <div className="qb-upload-preview">
                <img src={form.solutionUpload} alt="uploaded solution" />
                <button type="button" className="qb-upload-remove" onClick={() => setForm(f => ({...f, solutionUpload: null}))}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            ) : (
              <label className="qb-upload-label">
                <Image size={32} />
                <span>Click to upload an image or screenshot</span>
                <span>PNG, JPG, GIF, WEBP</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/gif,image/webp"
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
        ) : (
          <DrawCanvas value={form.solutionDraw} onChange={v => setForm(f => ({...f, solutionDraw:v}))} layersHost={layersHost} />
        )}
      </div>

      <div className="qb-fsec">
        <label className="qb-flabel">Topic</label>
        <div className="qb-select" ref={topicRef}>
          <button className="qb-select-btn" type="button" onClick={() => setTopicOpen(o => !o)} aria-expanded={topicOpen}>
            <span>{topicLabel}</span>
            <ChevronDown size={16} />
          </button>
          {topicOpen && (
            <div className="qb-select-menu">
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
          )}
        </div>
      </div>

      <div className="qb-fsec">
        <label className="qb-flabel">
          Label{" "}
          <span style={{ textTransform:"none", letterSpacing:0, fontFamily:"DM Sans,sans-serif", fontSize:11, color:"var(--text-faint)" }}>(optional)</span>
        </label>
        {!useCustomLabel ? (
          <>
            <div className="qb-filter-select-wrap">
              <select
                className="qb-filter-select"
                value={form.label}
                onChange={e => {
                  const val = e.target.value;
                  if (val === "other") {
                    setUseCustomLabel(true);
                    setForm(f => ({ ...f, label: "" }));
                  } else {
                    setForm(f => ({ ...f, label: val }));
                  }
                }}
              >
                <option value="">Select a label...</option>
                {PROBLEM_LABELS.map(label => (
                  <option key={label} value={label}>{label}</option>
                ))}
                <option value="other">Other (custom)</option>
              </select>
            </div>
          </>
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

      {error && <p className="qb-ferr">{error}</p>}
      <div className="qb-factions">
        <button className="qb-fcancel" onClick={onCancel}>Cancel</button>
        <button className="qb-fsave" onClick={handleSave} disabled={!valid}>{initialData ? "Save Changes" : "Add Question"}</button>
      </div>
    </div>
  );
}
