import { useEffect, useRef, useState, useCallback } from "react";
import { TOPICS } from "../../constants/appConstants";
import { tipsModel, TIP_CATEGORIES, MASTERY_LEVELS } from "../../models/tipsModel";
import MarkdownText from "./MarkdownText";
import DrawCanvas from "./DrawCanvas";
import CustomSelect from "./CustomSelect";
import FileUploadZone from "./FileUploadZone";
import {
  ChevronLeft,
  Palette,
  Tag,
  TrendingUp,
  Paperclip,
  BookOpen,
  BookMarked,
  CheckCircle2,
  FileText,
  Save,
  Trash2,
  ExternalLink,
  Sparkles,
} from "lucide-react";
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
  const [attachmentPath, setAttachmentPath] = useState("");
  const [tipLoaded, setTipLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState(null);
  const [layersHostEl, setLayersHostEl] = useState(null);

  const copyAreaRef = useRef(null);
  const pendingSaveRef = useRef(null);
  const hasUserEditedRef = useRef(false);
  usePlainTextCopy(copyAreaRef);

  const topicObj = TOPICS.find((t) => t.id === question?.topic) || TOPICS[0];

  useEffect(() => {
    let active = true;
    tipsModel
      .getAll(userId)
      .then((map) => {
        if (!active) return;
        if (!hasUserEditedRef.current) {
          const tipData = map?.[question.id];
          if (tipData && typeof tipData === "object") {
            setTipText(typeof tipData.text === "string" ? tipData.text : "");
            setCanvasData(tipData.canvasData || null);
            setCategory(tipData.category || "general");
            setMasteryLevel(tipData.masteryLevel || "learning");
            setAttachmentUrl(tipData.attachmentUrl || "");
            setAttachmentType(tipData.attachmentType || "");
            setAttachmentName(tipData.attachmentName || "");
            setAttachmentPath(tipData.attachmentPath || "");
            if (tipData.attachmentUrl) {
              setActiveTab("attachment");
            } else if (tipData.canvasData) {
              setActiveTab("diagram");
            } else if (tipData.text?.trim()) {
              setActiveTab("notes");
            }
          } else if (typeof tipData === "string") {
            setTipText(tipData);
            setCanvasData(null);
            setCategory("general");
            setMasteryLevel("learning");
            setAttachmentUrl("");
            setAttachmentType("");
            setAttachmentName("");
            setAttachmentPath("");
            setActiveTab("notes");
          } else {
            setTipText("");
            setCanvasData(null);
            setCategory("general");
            setMasteryLevel("learning");
            setAttachmentUrl("");
            setAttachmentType("");
            setAttachmentName("");
            setAttachmentPath("");
            setActiveTab("diagram");
          }
        }
        setTipLoaded(true);
      })
      .catch(() => {
        if (!active) return;
        if (!hasUserEditedRef.current) {
          setTipText("");
          setCanvasData(null);
          setCategory("general");
          setMasteryLevel("learning");
          setAttachmentUrl("");
          setAttachmentType("");
          setAttachmentName("");
          setAttachmentPath("");
          setActiveTab("diagram");
        }
        setTipLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [question.id, userId]);

  const buildTipPayload = useCallback(() => ({
    text: tipText,
    canvasData,
    category,
    masteryLevel,
    attachmentUrl,
    attachmentType,
    attachmentName,
    attachmentPath,
    lastReviewed: new Date().toISOString(),
  }), [
    tipText,
    canvasData,
    category,
    masteryLevel,
    attachmentUrl,
    attachmentType,
    attachmentName,
    attachmentPath,
  ]);

  // Debounced autosave
  useEffect(() => {
    if (!tipLoaded) return;
    const payload = buildTipPayload();
    pendingSaveRef.current = { questionId: question.id, userId, payload };

    const timeoutId = window.setTimeout(() => {
      pendingSaveRef.current = null;
      setIsSaving(true);
      tipsModel
        .setTip(question.id, payload, userId)
        .then(() => {
          setIsSaving(false);
          setLastSavedTime(new Date());
        })
        .catch(() => {
          setIsSaving(false);
        });
    }, 400);

    return () => window.clearTimeout(timeoutId);
  }, [tipLoaded, question.id, userId, buildTipPayload]);

  // Flush pending save on unmount
  useEffect(() => {
    return () => {
      const pending = pendingSaveRef.current;
      if (!pending) return;
      pendingSaveRef.current = null;
      tipsModel.setTip(pending.questionId, pending.payload, pending.userId).catch(() => {});
    };
  }, []);

  const handleClearAll = () => {
    if (window.confirm("Are you sure you want to clear this tip, notes, and scratchpad diagram?")) {
      hasUserEditedRef.current = true;
      setTipText("");
      setCanvasData(null);
      setCategory("general");
      setMasteryLevel("learning");
      setAttachmentUrl("");
      setAttachmentType("");
      setAttachmentName("");
      setAttachmentPath("");
      tipsModel.deleteTip(question.id, userId).catch(() => {});
    }
  };

  return (
    <div className="fu qb-tip-detail-container" ref={copyAreaRef}>
      {/* Top Navigation Bar */}
      <div className="qb-tip-detail-header">
        <button
          type="button"
          className="qb-tip-back-btn"
          onClick={onBack}
        >
          <ChevronLeft size={18} />
          <span>Back to Tips Library</span>
        </button>

        <div className="qb-tip-detail-header-meta">
          <span
            className="qb-badge"
            style={{
              color: topicObj.color,
              background: `${topicObj.color}1c`,
              borderColor: `${topicObj.color}35`,
            }}
          >
            {topicObj.label}
          </span>
          <div className="qb-tip-save-status">
            {isSaving ? (
              <span className="qb-saving-indicator">
                <span className="qb-pulse-dot" />
                <span>Autosaving...</span>
              </span>
            ) : lastSavedTime ? (
              <span className="qb-saved-indicator">
                <Save size={13} />
                <span>Autosaved</span>
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* Main Container Card */}
      <div className="qb-tip-detail-card">
        {/* Problem Statement Box */}
        <div className="qb-tip-question-box">
          <div className="qb-tip-question-top">
            <span className="qb-qnum">Item Method Studio</span>
            {question.label && (
              <span className="qb-tip-question-label">{question.label}</span>
            )}
          </div>
          <div className="qb-tip-question-text">
            <MarkdownText text={question.question} />
          </div>
        </div>

        {/* Configuration Row: Category & Mastery Level */}
        <div className="qb-tip-config-grid">
          {/* Category Selector */}
          <div className="qb-tip-config-item">
            <label className="qb-tip-field-label">
              <Tag size={15} />
              <span>Solution Category</span>
            </label>
            <CustomSelect
              value={category}
              onChange={(value) => {
                hasUserEditedRef.current = true;
                setCategory(value);
              }}
              options={Object.values(TIP_CATEGORIES).map((cat) => ({
                value: cat.id,
                label: cat.label,
              }))}
            />
          </div>

          {/* Mastery Level Buttons */}
          <div className="qb-tip-config-item">
            <label className="qb-tip-field-label">
              <TrendingUp size={15} />
              <span>Mastery Progress</span>
            </label>
            <div className="qb-mastery-group">
              {Object.values(MASTERY_LEVELS).map((level) => {
                const isSelected = masteryLevel === level.id;
                const IconComponent =
                  level.icon === "BookOpen"
                    ? BookOpen
                    : level.icon === "BookMarked"
                    ? BookMarked
                    : CheckCircle2;
                return (
                  <button
                    key={level.id}
                    type="button"
                    onClick={() => {
                      hasUserEditedRef.current = true;
                      setMasteryLevel(level.id);
                    }}
                    className={`qb-mastery-btn${isSelected ? " active" : ""}`}
                    style={{
                      borderColor: isSelected ? level.color : "var(--border)",
                      color: isSelected ? level.color : "var(--text-muted)",
                      background: isSelected ? `${level.color}15` : "var(--input-bg)",
                    }}
                  >
                    <IconComponent size={14} />
                    <span>{level.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Workspace Segmented Tabs */}
        <div className="qb-tip-tabs-bar">
          <button
            type="button"
            className={`qb-tip-tab-item${activeTab === "diagram" ? " active" : ""}`}
            onClick={() => setActiveTab("diagram")}
          >
            <Palette size={16} />
            <span>Visual Scratchpad & Diagram</span>
            {canvasData && <span className="qb-tab-has-dot" title="Has diagram data" />}
          </button>

          <button
            type="button"
            className={`qb-tip-tab-item${activeTab === "notes" ? " active" : ""}`}
            onClick={() => setActiveTab("notes")}
          >
            <FileText size={16} />
            <span>Formulas & Written Notes</span>
            {tipText.trim() && <span className="qb-tab-has-dot" title="Has notes" />}
          </button>

          <button
            type="button"
            className={`qb-tip-tab-item${activeTab === "attachment" ? " active" : ""}`}
            onClick={() => setActiveTab("attachment")}
          >
            <Paperclip size={16} />
            <span>Solution Files & Attachments</span>
            {attachmentUrl && <span className="qb-tab-has-dot" title="Has uploaded attachment" />}
          </button>
        </div>

        {/* Tab 1: Visual Diagram */}
        {activeTab === "diagram" && (
          <div className="qb-tip-tab-content">
            <div className="qb-tip-instruction-box">
              <Sparkles size={16} className="qb-instruction-icon" />
              <div>
                <strong>Interactive Canvas:</strong> Sketch formulas, geometric diagrams, long division, or Venn diagrams. Use the shape, math symbol, and pen tools below.
              </div>
            </div>

            <div className="qb-tip-canvas-wrapper">
              <DrawCanvas
                value={canvasData}
                onChange={(data) => {
                  hasUserEditedRef.current = true;
                  setCanvasData(data);
                }}
                layersHost={layersHostEl}
              />
            </div>

            {/* Container where Fabric layers panel is portaled */}
            <div ref={setLayersHostEl} className="qb-tip-canvas-layers-host" />
          </div>
        )}

        {/* Tab 2: Formulas & Written Notes */}
        {activeTab === "notes" && (
          <div className="qb-tip-tab-content">
            <div className="qb-tip-instruction-box">
              <FileText size={16} className="qb-instruction-icon" />
              <div>
                <strong>Study Cues & Formulas:</strong> Write shorthand methods, mnemonics (e.g. PEMDAS, FOIL), conversion factors, or grammar rules. Supports Markdown and equations.
              </div>
            </div>

            <div className="qb-tip-notes-layout">
              <div className="qb-tip-notes-input-pane">
                <label className="qb-tip-field-label">
                  <span>Quick Notes Editor</span>
                </label>
                <textarea
                  className="qb-tip-notes-textarea"
                  value={tipText}
                  onChange={(e) => {
                    hasUserEditedRef.current = true;
                    setTipText(e.target.value);
                  }}
                  placeholder="Example: Work & Rate formula: Total Work = Rate × Time. When two workers combine: 1/A + 1/B = 1/Total..."
                  rows={8}
                />
              </div>

              {tipText.trim() && (
                <div className="qb-tip-notes-preview-pane">
                  <label className="qb-tip-field-label">
                    <span>Formatted Study Card Preview</span>
                  </label>
                  <div className="qb-tip-notes-preview-card">
                    <MarkdownText text={tipText} />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Uploaded Solution */}
        {activeTab === "attachment" && (
          <div className="qb-tip-tab-content">
            <div className="qb-tip-instruction-box">
              <Paperclip size={16} className="qb-instruction-icon" />
              <div>
                <strong>Reference Uploads:</strong> Attach handwritten solution photos, PDF guides, or reference sheets. Supported formats: PNG, JPG, GIF, WebP, PDF, DOCX, XLSX.
              </div>
            </div>

            <FileUploadZone
              currentFile={
                attachmentUrl
                  ? {
                      url: attachmentUrl,
                      type: attachmentType,
                      name: attachmentName,
                      path: attachmentPath,
                    }
                  : null
              }
              userId={userId}
              onFileUploaded={(fileData) => {
                hasUserEditedRef.current = true;
                setAttachmentUrl(fileData.url);
                setAttachmentType(fileData.type);
                setAttachmentName(fileData.name);
                setAttachmentPath(fileData.path || "");
              }}
              onRemoveFile={() => {
                hasUserEditedRef.current = true;
                setAttachmentUrl("");
                setAttachmentType("");
                setAttachmentName("");
                setAttachmentPath("");
              }}
            />
          </div>
        )}

        {/* Footer Actions */}
        <div className="qb-tip-detail-footer">
          <button
            type="button"
            className="qb-tip-action-btn secondary"
            onClick={() => onOpenQuestion(question.id)}
          >
            <ExternalLink size={15} />
            <span>Practice Question in Bank</span>
          </button>

          <button
            type="button"
            className="qb-tip-action-btn danger"
            onClick={handleClearAll}
            title="Remove notes and clear scratchpad"
          >
            <Trash2 size={14} />
            <span>Clear This Tip</span>
          </button>
        </div>
      </div>
    </div>
  );
}
