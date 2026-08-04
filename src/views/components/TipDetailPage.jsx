import React, { useEffect, useRef, useState } from "react";
import { tipsModel, TIP_CATEGORIES, MASTERY_LEVELS } from "../../models/tipsModel";
import MarkdownText from "./MarkdownText";
import DrawCanvas from "./DrawCanvas";
import CustomSelect from "./CustomSelect";
import FileUploadZone from "./FileUploadZone";
import { ChevronLeft, Palette, Tag, TrendingUp, Paperclip, BookOpen, BookMarked, CheckCircle2 } from "lucide-react";
import usePlainTextCopy from "../../utils/usePlainTextCopy";

export default function TipDetailPage({
  question,
  userId,
  onBack,
  onOpenQuestion,
}) {
  const [activeTab, setActiveTab] = useState("diagram");
  const [tipText, setTipText] = useState("");
  const [canvasData, setCanvasData] = useState(null);
  const [category, setCategory] = useState("general");
  const [masteryLevel, setMasteryLevel] = useState("learning");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [attachmentType, setAttachmentType] = useState("");
  const [attachmentName, setAttachmentName] = useState("");
  const canvasLayersRef = useRef(null);
  const copyAreaRef = useRef(null);
  usePlainTextCopy(copyAreaRef);

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
        setAttachmentUrl(tipData.attachmentUrl || "");
        setAttachmentType(tipData.attachmentType || "");
        setAttachmentName(tipData.attachmentName || "");
      } else if (typeof tipData === "string") {
        // Legacy string format
        setTipText(tipData);
        setCanvasData(null);
        setCategory("general");
        setMasteryLevel("learning");
        setAttachmentUrl("");
        setAttachmentType("");
        setAttachmentName("");
      } else {
        setTipText("");
        setCanvasData(null);
        setCategory("general");
        setMasteryLevel("learning");
        setAttachmentUrl("");
        setAttachmentType("");
        setAttachmentName("");
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
        attachmentUrl,
        attachmentType,
        attachmentName,
        lastReviewed: new Date().toISOString(),
      }, userId).catch(() => {});
    }, 350);
    return () => window.clearTimeout(timeoutId);
  }, [question.id, tipText, canvasData, category, masteryLevel, attachmentUrl, attachmentType, attachmentName, userId]);

  const categoryInfo = Object.values(TIP_CATEGORIES).find(c => c.id === category) || TIP_CATEGORIES.GENERAL;
  const masteryInfo = Object.values(MASTERY_LEVELS).find(m => m.id === masteryLevel) || MASTERY_LEVELS.LEARNING;
  const hasContent = !!(tipText.trim() || canvasData);

  return (
    <div className="fu" ref={copyAreaRef}>
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
          <CustomSelect
            value={category}
            onChange={setCategory}
            options={Object.values(TIP_CATEGORIES).map(cat => ({
              value: cat.id,
              label: cat.label,
            }))}
          />
        </div>

        {/* Mastery Level Selector */}
        <div className="qb-fsec" style={{ marginBottom: 18 }}>
          <label className="qb-flabel" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <TrendingUp size={16} />
            Mastery Level
          </label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {Object.values(MASTERY_LEVELS).map(level => {
              const IconComponent = level.icon === 'BookOpen' ? BookOpen : level.icon === 'BookMarked' ? BookMarked : CheckCircle2;
              return (
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
                  <IconComponent size={16} />
                  <span>{level.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab System */}
        <div className="qb-tabs" style={{ marginBottom: 18 }}>
          <button
            type="button"
            className={`qb-tab${activeTab === "diagram" ? " qb-tab-active" : ""}`}
            onClick={() => setActiveTab("diagram")}
          >
            <Palette size={16} />
            <span>Visual Diagram</span>
            {canvasData && <span className="qb-tab-badge">●</span>}
          </button>
          <button
            type="button"
            className={`qb-tab${activeTab === "attachment" ? " qb-tab-active" : ""}`}
            onClick={() => setActiveTab("attachment")}
          >
            <Paperclip size={16} />
            <span>Upload Method</span>
          </button>
        </div>

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

        {/* Attachment Tab Content */}
        {activeTab === "attachment" && (
          <div style={{ marginBottom: 18 }}>
            <div className="qb-sol" style={{ marginTop: 0, marginBottom: 18 }}>
              <div className="qb-sol-title">Upload Your Own Method</div>
              <div className="qb-sol-body">
                <MarkdownText text={"Upload images, PDFs, Word docs, or Excel files with your step-by-step solving methods.\n\n**Supported:** Images (PNG, JPG, GIF, WebP), Documents (PDF, DOCX, DOC, TXT), Spreadsheets (XLSX, XLS)"} />
              </div>
            </div>

            <FileUploadZone
              file={attachmentUrl ? { url: attachmentUrl, type: attachmentType, name: attachmentName } : null}
              onFileUploaded={(fileData) => {
                setAttachmentUrl(fileData.url);
                setAttachmentType(fileData.type);
                setAttachmentName(fileData.name);
              }}
              onRemoveFile={() => {
                setAttachmentUrl("");
                setAttachmentType("");
                setAttachmentName("");
              }}
            />

            {!attachmentUrl && (
              <p className="qb-hint" style={{ marginTop: 12 }}>
                Drag & drop a file, paste a URL, or browse to upload your method
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
              setAttachmentUrl("");
              setAttachmentType("");
              setAttachmentName("");
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
