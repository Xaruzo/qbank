import React, { useEffect, useRef, useState } from "react";
import { tipsModel } from "../../models/tipsModel";
import MarkdownText from "./MarkdownText";
import SymbolToolbar from "./SymbolToolbar";
import { handleSymbolShortcuts } from "../../utils/symbolShortcuts";
import { ChevronLeft } from "lucide-react";

export default function TipDetailPage({
  question,
  userId,
  onBack,
  onOpenQuestion,
}) {
  const [tipText, setTipText] = useState("");
  const tipRef = useRef(null);

  useEffect(() => {
    let active = true;
    tipsModel.getAll(userId).then((map) => {
      if (!active) return;
      setTipText(typeof map?.[question.id] === "string" ? map[question.id] : "");
    });
    return () => {
      active = false;
    };
  }, [question.id, userId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      tipsModel.setTip(question.id, tipText, userId).catch(() => {});
    }, 350);
    return () => window.clearTimeout(timeoutId);
  }, [question.id, tipText, userId]);

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

        <div className="qb-factions">
          <button className="qb-fcancel" onClick={() => onOpenQuestion(question.id)}>
            Open Question
          </button>
          <button
            className="qb-del-btn"
            onClick={() => {
              setTipText("");
              tipsModel.deleteTip(question.id, userId).catch(() => {});
            }}
          >
            Clear Tip
          </button>
        </div>

        {!!tipText.trim() && (
          <div className="qb-sol">
            <div className="qb-sol-title">Tip / Method</div>
            <div className="qb-sol-body">
              <MarkdownText text={tipText} />
            </div>
          </div>
        )}

        {!tipText.trim() && <p className="qb-hint">Type your note above to see the saved display preview here</p>}
      </div>
    </div>
  );
}
