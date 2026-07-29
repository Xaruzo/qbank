import React, { useEffect, useRef, useState } from "react";
import { tipsModel, TIP_CATEGORIES, MASTERY_LEVELS } from "../../models/tipsModel";
import MarkdownText from "./MarkdownText";
import SymbolToolbar from "./SymbolToolbar";
import DrawCanvas from "./DrawCanvas";
import { handleSymbolShortcuts } from "../../utils/symbolShortcuts";
import { ChevronLeft, FileText, Palette, Tag, TrendingUp } from "lucide-react";

export default function TipDetailPage({
  question,
  userId,
  onBack,
  onOpenQuestion,
}) {
  const [activeTab, setActiveTab] = useState("text");
  const [tipText, setTipText] = useState("");
  const [canvasData, setCanvasData] = useState(null);
  const [category, setCategory] = useState("general");
  const [masteryLevel, setMasteryLevel] = useState("learning");
  const tipRef = useRef(null);
  const canvasLayersRef = useRef(null);

  useEffect(() => {
    let active = true;
    tipsModel.getAll(userId).then((map) => {
      if (!active) return;
      const tipData = map?.[question.id];
      if (tipData && typeof tipData === "object") {
        setTipText(typeof tipData.text === "string" ? tipData.text : "");
        setCanvasData(tipData.canvasData || null);
        setCategory(tipData.category || "general");
        setMasteryLevel(tipData.masteryLevel || "learning");
      } else if (typeof tipData === "string") {
        // Legacy string format
        setTipText(tipData);
        setCanvasData(null);
        setCategory("general");
        setMasteryLevel("learning");
      } else {
        setTipText("");
        setCanvasData(null);
        setCategory("general");
        setMasteryLevel("learning");
      }
    });
    return () => {
      active = false;
    };
  }, [question.id, userId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      tipsModel.setTip(question.id, {
        text: tipText,
        canvasData,
        category,
        masteryLevel,
        lastReviewed: new Date().toISOString(),
      }, userId).catch(() => {});
    }, 350);
    return () => window.clearTimeout(timeoutId);
  }, [question.id, tipText, canvasData, category, masteryLevel, userId]);

  const categoryInfo = Object.values(TIP_CATEGORIES).find(c => c.id === category) || TIP_CATEGORIES.GENERAL;
  const masteryInfo = Object.values(MASTERY_LEVELS).find(m => m.id === masteryLevel) || MASTERY_LEVELS.LEARNING;
  const hasContent = !!(tipText.trim() || canvasData);

  return (
    <div className="fu">
      <div className="qb-form-hdr">
        <button className="qb-back" onClick={onBack} style={{ display: "flex", alignItems: "center" }}>
          <ChevronLeft size={16} style={{ marginRight: 4 }} />
          Back to Tips
        </button>
        <h2 className="qb-form-title">Tip Detail</h2>
      </div>

      <div className="qb-det-card">
        {question.label && <div className="qb-det-label">{question.label}</div>}
        <div className="qb-det-q">
          <MarkdownText text={question.question} />
        </div>

        {/* Category Selector */}
        <div className="qb-fsec" style={{ marginTop: 18, marginBottom: 18 }}>
          <label className="qb-flabel" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Tag size={16} />
            Tip Category
          </label>
          <select
            className="qb-finput"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={{ cursor: "pointer" }}
          >
            {Object.values(TIP_CATEGORIES).map(cat => (
              <option key={cat.id} value={cat.id}>{cat.label}</option>
            ))}
          </select>
        </div>

        {/* Mastery Level Selector */}
        <div className="qb-fsec" style={{ marginBottom: 18 }}>
          <label className="qb-flabel" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <TrendingUp size={16} />
            Mastery Level
          </label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {Object.values(MASTERY_LEVELS).map(level => (
              <button
                key={level.id}
                type="button"
                onClick={() => setMasteryLevel(level.id)}
                className="qb-mastery-btn"
                data-active={masteryLevel === level.id}
                style={{
                  flex: "1 1 auto",
                  minWidth: 120,
                  padding: "10px 16px",
                  borderRadius: 10,
                  border: masteryLevel === level.id ? `2px solid ${level.color}` : "1px solid var(--border)",
                  background: masteryLevel === level.id ? `${level.color}15` : "var(--surface-h)",
                  color: masteryLevel === level.id ? level.color : "inherit",
                  fontWeight: masteryLevel === level.id ? 600 : 400,
                  cursor: "pointer",
                  transition: "all 0.2s",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <span>{level.icon}</span>
                <span>{level.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab System */}
        <div className="qb-tabs" style={{ marginBottom: 18 }}>
          <button
            type="button"
            className={`qb-tab${activeTab === "text" ? " qb-tab-active" : ""}`}
            onClick={() => setActiveTab("text")}
          >
            <FileText size={16} />
            <span>Text Notes</span>
          </button>
          <button
            type="button"
            className={`qb-tab${activeTab === "diagram" ? " qb-tab-active" : ""}`}
            onClick={() => setActiveTab("diagram")}
          >
            <Palette size={16} />
            <span>Visual Diagram</span>
            {canvasData && <span className="qb-tab-badge">●</span>}
          </button>
        </div>

        {/* Text Tab Content */}
        {activeTab === "text" && (
          <>
            <div className="qb-sol" style={{ marginTop: 0, marginBottom: 18 }}>
              <div className="qb-sol-title">Instructions</div>
              <div className="qb-sol-body">
                <MarkdownText text={"Write the formula, shortcut, or recall method you want to remember for this problem.\n\nUse this area for your own personal solving steps, not the full official solution."} />
              </div>
            </div>

            <div className="qb-fsec" style={{ padding: 0, border: "none", background: "transparent" }}>
              <label className="qb-flabel">Tip / Method</label>
              <textarea
                ref={tipRef}
                className="qb-fta"
                placeholder="Example: Use work-rate formula, isolate the unit rate first, then multiply by total time..."
                value={tipText}
                onChange={(e) => {
                  const val = e.target.value;
                  setTipText(val);
                  handleSymbolShortcuts(e.target, val, (v) => setTipText(v));
                }}
                rows={7}
              />
              <SymbolToolbar targetRef={tipRef} value={tipText} onChange={setTipText} />
            </div>

            {!!tipText.trim() && (
              <div className="qb-sol" style={{ marginTop: 18 }}>
                <div className="qb-sol-title">Preview</div>
                <div className="qb-sol-body">
                  <MarkdownText text={tipText} />
                </div>
              </div>
            )}

            {!tipText.trim() && <p className="qb-hint">Type your note above to see the saved display preview here</p>}
          </>
        )}

        {/* Diagram Tab Content */}
        {activeTab === "diagram" && (
          <div style={{ marginBottom: 18 }}>
            <div className="qb-sol" style={{ marginTop: 0, marginBottom: 18 }}>
              <div className="qb-sol-title">Visual Diagram Instructions</div>
              <div className="qb-sol-body">
                <MarkdownText text={"Draw diagrams, formulas, graphs, or visual aids to help you remember this problem's solution method.\n\n**Tools:** Pen, shapes, text, fractions, math symbols, long division, and more."} />
              </div>
            </div>

            <div style={{ position: "relative" }}>
              <DrawCanvas
                value={canvasData}
                onChange={(data) => setCanvasData(data)}
                layersHost={canvasLayersRef.current}
              />
            </div>

            {/* Layers Panel Container */}
            <div ref={canvasLayersRef} style={{ marginTop: 12 }} />

            {!canvasData && (
              <p className="qb-hint" style={{ marginTop: 12 }}>
                Use the drawing tools above to create visual study aids for this question
              </p>
            )}
          </div>
        )}

        <div className="qb-factions">
          <button className="qb-fcancel" onClick={() => onOpenQuestion(question.id)}>
            Open Question
          </button>
          <button
            className="qb-del-btn"
            onClick={() => {
              setTipText("");
              setCanvasData(null);
              setCategory("general");
              setMasteryLevel("learning");
              tipsModel.deleteTip(question.id, userId).catch(() => {});
            }}
          >
            Clear All
          </button>
        </div>
      </div>
    </div>
  );
}
