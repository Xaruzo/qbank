import { useState, useEffect, useMemo } from "react";
import { TOPICS } from "../../constants/appConstants";
import { tipsModel, TIP_CATEGORIES, MASTERY_LEVELS } from "../../models/tipsModel";
import MarkdownText from "./MarkdownText";
import CustomSelect from "./CustomSelect";
import { TipsSkeletonLoader } from "./SkeletonLoader";
import {
  Search,
  Filter,
  Palette,
  FileText,
  Tag,
  TrendingUp,
  Image as ImageIcon,
  Paperclip,
  RefreshCw,
  X,
  RotateCcw,
  Lightbulb,
  CheckCircle2,
  BookOpen,
  BookMarked,
  ArrowRight,
  Layers,
  Sparkles,
} from "lucide-react";

export default function TipsPage({
  questions = [],
  userId,
  onBack,
  onSelectQuestion,
}) {
  const [tipsMap, setTipsMap] = useState({});
  const [tipsLoading, setTipsLoading] = useState(true);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  // Filters
  const [search, setSearch] = useState("");
  const [filterTopic, setFilterTopic] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterMastery, setFilterMastery] = useState("all");
  const [filterResource, setFilterResource] = useState("all"); // 'all' | 'saved' | 'diagram' | 'attachment' | 'notes'
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    let active = true;
    tipsModel.getAll(userId).then((map) => {
      if (!active) return;
      setTipsMap(map || {});
      setTipsLoading(false);
    }).catch(() => {
      if (active) setTipsLoading(false);
    });
    return () => {
      active = false;
    };
  }, [userId]);

  useEffect(() => {
    let active = true;

    const refreshSync = async () => {
      if (!userId) {
        if (active) setPendingSyncCount(0);
        return;
      }
      try {
        const offline = typeof navigator !== "undefined" && navigator.onLine === false;
        const count = await tipsModel.getPendingCount(userId);
        if (!active) return;
        setPendingSyncCount(count);
        if (count > 0 && !offline) {
          const map = await tipsModel.getAll(userId);
          if (!active) return;
          setTipsMap(map || {});
          const remaining = await tipsModel.getPendingCount(userId);
          if (active) setPendingSyncCount(remaining);
        }
      } catch {
        // keep polling; transient error should not crash
      }
    };

    refreshSync();
    const intervalId = window.setInterval(refreshSync, 12000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [userId]);

  // Topic resolver
  const getTopic = (id) => TOPICS.find((t) => t.id === id) || TOPICS[0];

  // Overview metrics across ALL questions
  const globalOverview = useMemo(() => {
    return questions.reduce(
      (acc, item) => {
        const tipData = tipsMap?.[item.id];
        const isObj = tipData && typeof tipData === "object";
        const hasText = !!((typeof tipData === "string" && tipData.trim()) || (isObj && tipData.text?.trim()));
        const hasCanvas = !!(isObj && tipData.canvasData);
        const hasAttachment = !!(isObj && tipData.attachmentUrl);
        const hasAnyTip = hasText || hasCanvas || hasAttachment;
        const mastery = isObj ? tipData.masteryLevel : "learning";

        if (hasAnyTip) acc.saved += 1;
        if (hasCanvas) acc.diagrams += 1;
        if (hasAttachment) acc.attachments += 1;
        if (hasText) acc.notes += 1;
        if (mastery === "mastered") acc.mastered += 1;
        if (mastery === "familiar") acc.familiar += 1;

        // Count per topic
        if (item.topic) {
          if (!acc.topicCounts[item.topic]) acc.topicCounts[item.topic] = 0;
          if (hasAnyTip) acc.topicCounts[item.topic] += 1;
        }

        return acc;
      },
      { saved: 0, diagrams: 0, attachments: 0, notes: 0, mastered: 0, familiar: 0, topicCounts: {} }
    );
  }, [questions, tipsMap]);

  // Filtering questions
  const filteredQuestions = useMemo(() => {
    const q = search.trim().toLowerCase();
    let filtered = [...questions];

    // Topic filter
    if (filterTopic !== "all") {
      filtered = filtered.filter((item) => item.topic === filterTopic);
    }

    // Text search (checks label, question text, and any tip notes)
    if (q) {
      filtered = filtered.filter((item) => {
        const label = typeof item.label === "string" ? item.label : "";
        const questionText = typeof item.question === "string" ? item.question : "";
        const tipData = tipsMap?.[item.id];
        const tipText =
          typeof tipData === "string"
            ? tipData
            : tipData && typeof tipData === "object" && typeof tipData.text === "string"
            ? tipData.text
            : "";
        return `${label} ${questionText} ${tipText}`.toLowerCase().includes(q);
      });
    }

    // Category filter
    if (filterCategory !== "all") {
      filtered = filtered.filter((item) => {
        const tipData = tipsMap?.[item.id];
        if (!tipData) return false;
        const category = typeof tipData === "object" ? tipData.category : "general";
        return category === filterCategory;
      });
    }

    // Mastery filter
    if (filterMastery !== "all") {
      filtered = filtered.filter((item) => {
        const tipData = tipsMap?.[item.id];
        if (!tipData) return false;
        const mastery = typeof tipData === "object" ? tipData.masteryLevel : "learning";
        return mastery === filterMastery;
      });
    }

    // Resource filter
    if (filterResource !== "all") {
      filtered = filtered.filter((item) => {
        const tipData = tipsMap?.[item.id];
        if (!tipData) return false;
        const isObj = typeof tipData === "object";
        const hasText = !!((typeof tipData === "string" && tipData.trim()) || (isObj && tipData.text?.trim()));
        const hasCanvas = !!(isObj && tipData.canvasData);
        const hasAttachment = !!(isObj && tipData.attachmentUrl);
        const hasAnyTip = hasText || hasCanvas || hasAttachment;

        if (filterResource === "saved") return hasAnyTip;
        if (filterResource === "diagram") return hasCanvas;
        if (filterResource === "attachment") return hasAttachment;
        if (filterResource === "notes") return hasText;
        return true;
      });
    }

    // Sort: prioritizes items with tips, attachments, canvas, notes
    return filtered.sort((a, b) => {
      const tipA = tipsMap?.[a.id];
      const tipB = tipsMap?.[b.id];
      const score = (tipData) => {
        if (!tipData) return 0;
        const isObject = typeof tipData === "object";
        const attachmentBoost = isObject && tipData.attachmentUrl ? 4 : 0;
        const imageBoost = isObject && String(tipData.attachmentType || "").startsWith("image/") ? 3 : 0;
        const canvasBoost = isObject && tipData.canvasData ? 2 : 0;
        const textBoost = (typeof tipData === "string" && tipData.trim()) || (isObject && tipData.text?.trim()) ? 1 : 0;
        return attachmentBoost + imageBoost + canvasBoost + textBoost;
      };

      const scoreDiff = score(tipB) - score(tipA);
      if (scoreDiff !== 0) return scoreDiff;
      return String(a.label || a.question || "").localeCompare(String(b.label || b.question || ""));
    });
  }, [questions, search, filterTopic, filterCategory, filterMastery, filterResource, tipsMap]);

  const tipIndexMap = useMemo(() => {
    const m = new Map();
    filteredQuestions.forEach((q, idx) => m.set(q.id, idx));
    return m;
  }, [filteredQuestions]);

  const tipColumns = useMemo(() => {
    const cols = [[], []];
    const sums = [0, 0];
    filteredQuestions.forEach((q) => {
      const tipData = tipsMap?.[q.id];
      const hasImage = !!(
        tipData &&
        typeof tipData === "object" &&
        tipData.attachmentUrl &&
        String(tipData.attachmentType || "").startsWith("image/")
      );
      const weight = hasImage ? 2 : 1;
      const col = sums[0] <= sums[1] ? 0 : 1;
      cols[col].push(q);
      sums[col] += weight;
    });
    return cols;
  }, [filteredQuestions, tipsMap]);

  // Active filter count for badge & reset
  const activeFiltersCount =
    (search.trim() ? 1 : 0) +
    (filterTopic !== "all" ? 1 : 0) +
    (filterCategory !== "all" ? 1 : 0) +
    (filterMastery !== "all" ? 1 : 0) +
    (filterResource !== "all" ? 1 : 0);

  const handleResetFilters = () => {
    setSearch("");
    setFilterTopic("all");
    setFilterCategory("all");
    setFilterMastery("all");
    setFilterResource("all");
  };

  if (tipsLoading) {
    return <TipsSkeletonLoader />;
  }

  const renderTipCard = (q, i, stretch) => {
    const t = getTopic(q.topic);
    const tipData = tipsMap?.[q.id];
    const isObj = tipData && typeof tipData === "object";
    const hasCanvas = !!(isObj && tipData.canvasData);
    const textContent = (typeof tipData === "string" && tipData.trim()) || (isObj && tipData.text?.trim()) || "";
    const hasText = !!textContent;
    const hasAttachment = !!(isObj && tipData.attachmentUrl);
    const attachmentUrl = isObj ? tipData.attachmentUrl : "";
    const attachmentType = isObj ? tipData.attachmentType : "";
    const attachmentName = isObj ? tipData.attachmentName : "";
    const hasImageAttachment = hasAttachment && String(attachmentType || "").startsWith("image/");
    const hasTip = hasText || hasCanvas || hasAttachment;

    const category = isObj ? tipData.category : "general";
    const categoryInfo = Object.values(TIP_CATEGORIES).find((c) => c.id === category) || TIP_CATEGORIES.GENERAL;

    const mastery = isObj ? tipData.masteryLevel : "learning";
    const masteryInfo = Object.values(MASTERY_LEVELS).find((m) => m.id === mastery) || MASTERY_LEVELS.LEARNING;

    return (
      <div
        key={q.id}
        className={`qb-tip-card${hasTip ? " qb-tip-card-has-content" : ""}${
          hasImageAttachment ? " qb-tip-card-has-image" : ""
        }${stretch && hasImageAttachment ? " qb-tip-card-stretch" : ""}`}
        onClick={() => onSelectQuestion(q.id)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelectQuestion(q.id);
          }
        }}
      >
        {hasImageAttachment && (
          <div className="qb-tip-card-preview">
            <img
              src={attachmentUrl}
              alt={attachmentName || q.label || "Tip attachment"}
              referrerPolicy="no-referrer"
              loading="lazy"
            />
          </div>
        )}

        {/* Card Top Zone */}
        <div className="qb-tip-card-header">
          <div className="qb-tip-card-header-left">
            <span className="qb-qnum">Tip #{String(i + 1).padStart(3, "0")}</span>
            <span className="qb-badge" style={{ color: t.color, background: `${t.color}1c`, borderColor: `${t.color}35` }}>
              {t.short}
            </span>
            <span className="qb-tip-category-tag" style={{ color: categoryInfo.color, borderColor: `${categoryInfo.color}40`, background: `${categoryInfo.color}15` }}>
              {categoryInfo.label}
            </span>
          </div>

          <div className="qb-tip-card-header-right">
            <span
              className={`qb-tip-mastery-indicator qb-mastery-${mastery}`}
              style={{ color: masteryInfo.color }}
              title={`Mastery: ${masteryInfo.label}`}
            >
              {mastery === "mastered" ? (
                <CheckCircle2 size={13} />
              ) : mastery === "familiar" ? (
                <BookMarked size={13} />
              ) : (
                <BookOpen size={13} />
              )}
              <span>{masteryInfo.label}</span>
            </span>
          </div>
        </div>

        {/* Card Body */}
        <div className="qb-tip-card-body">
          <div className="qb-tip-card-title-row">
            <h4 className="qb-tip-card-label">{q.label || "General Review Problem"}</h4>
          </div>

          <div className="qb-tip-card-question">
            <MarkdownText text={q.question} inline />
          </div>

          {/* User's quick note excerpt if available */}
          {hasText && (
            <div className="qb-tip-card-note-snippet">
              <Lightbulb size={13} className="qb-tip-snippet-icon" />
              <span className="qb-tip-snippet-text">{textContent}</span>
            </div>
          )}

          {/* Attachment filename badge */}
          {attachmentName && !hasImageAttachment && (
            <div className="qb-tip-card-file-name">
              <Paperclip size={12} />
              <span>{attachmentName}</span>
            </div>
          )}
        </div>

        {/* Card Footer */}
        <div className="qb-tip-card-footer">
          <div className="qb-tip-card-indicators">
            {hasCanvas && (
              <span className="qb-tip-badge-accent qb-badge-diagram" title="Visual whiteboard diagram attached">
                <Palette size={12} />
                Diagram
              </span>
            )}
            {hasAttachment && (
              <span className="qb-tip-badge-accent qb-badge-upload" title="File or image method uploaded">
                {hasImageAttachment ? <ImageIcon size={12} /> : <Paperclip size={12} />}
                {hasImageAttachment ? "Image" : "Document"}
              </span>
            )}
            {hasText && (
              <span className="qb-tip-badge-accent qb-badge-notes" title="Text notes and formulas attached">
                <FileText size={12} />
                Notes
              </span>
            )}
            {!hasTip && (
              <span className="qb-tip-status-empty">
                No tip yet
              </span>
            )}
          </div>

          <div className="qb-tip-card-cta">
            <span>{hasTip ? "Open Method" : "Add Tip"}</span>
            <ArrowRight size={13} />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fu">
      {/* Hero Banner for Tips & Tricks */}
      <section className="qb-tips-hero">
        <div className="qb-tips-hero-main">
          <div className="qb-tips-hero-kicker">
            <Lightbulb size={14} />
            <span>Civil Service Exam Shortcuts & Methods</span>
          </div>
          <h2 className="qb-tips-hero-title">
            Formulas, Whiteboard Diagrams & Study Cues
          </h2>
          <p className="qb-tips-hero-desc">
            Build personal solution playbooks, mnemonic tricks, and scratchpad diagrams for tricky CSC exam questions. All tips autosave and sync across your review sessions.
          </p>

          <div className="qb-tips-hero-metrics">
            <div className="qb-tips-metric-item">
              <strong>{globalOverview.saved}</strong>
              <span>Saved Tips</span>
            </div>
            <span className="qb-tips-metric-sep">·</span>
            <div className="qb-tips-metric-item">
              <strong>{globalOverview.diagrams}</strong>
              <span>Visual Diagrams</span>
            </div>
            <span className="qb-tips-metric-sep">·</span>
            <div className="qb-tips-metric-item">
              <strong>{globalOverview.attachments}</strong>
              <span>Solution Uploads</span>
            </div>
            <span className="qb-tips-metric-sep">·</span>
            <div className="qb-tips-metric-item">
              <strong>{globalOverview.mastered}</strong>
              <span>Mastered</span>
            </div>
          </div>
        </div>

        <div className="qb-tips-hero-actions">
          {onBack && (
            <button
              type="button"
              className="qb-tips-hero-btn secondary"
              onClick={onBack}
            >
              Back to Questions
            </button>
          )}
          <button
            type="button"
            className={`qb-tips-hero-btn primary${filterResource === "saved" ? " active" : ""}`}
            onClick={() => {
              setFilterResource((prev) => (prev === "saved" ? "all" : "saved"));
            }}
          >
            <Sparkles size={15} />
            {filterResource === "saved" ? "Showing Saved Tips" : "View Saved Tips Only"}
          </button>
        </div>
      </section>

      {/* Interactive Overview Filter Cards */}
      <section className="qb-tips-overview-section">
        <div className="qb-tips-overview">
          <button
            type="button"
            className={`qb-tips-overview-card${filterResource === "saved" ? " is-active" : ""}`}
            onClick={() => setFilterResource((prev) => (prev === "saved" ? "all" : "saved"))}
          >
            <div className="qb-tips-card-head">
              <span className="qb-list-label">All Saved Tips</span>
              <FileText size={16} className="qb-tips-card-icon" />
            </div>
            <strong>{globalOverview.saved}</strong>
            <p>Questions with active notes, formulas, or methods</p>
            <span className="qb-tips-card-state">
              {filterResource === "saved" ? "● Active Filter" : "Click to filter"}
            </span>
          </button>

          <button
            type="button"
            className={`qb-tips-overview-card${filterResource === "diagram" ? " is-active" : ""}`}
            onClick={() => setFilterResource((prev) => (prev === "diagram" ? "all" : "diagram"))}
          >
            <div className="qb-tips-card-head">
              <span className="qb-list-label">Visual Diagrams</span>
              <Palette size={16} className="qb-tips-card-icon" />
            </div>
            <strong>{globalOverview.diagrams}</strong>
            <p>Interactive whiteboard sketches & geometry notes</p>
            <span className="qb-tips-card-state">
              {filterResource === "diagram" ? "● Active Filter" : "Click to filter"}
            </span>
          </button>

          <button
            type="button"
            className={`qb-tips-overview-card${filterResource === "attachment" ? " is-active" : ""}`}
            onClick={() => setFilterResource((prev) => (prev === "attachment" ? "all" : "attachment"))}
          >
            <div className="qb-tips-card-head">
              <span className="qb-list-label">Uploaded Methods</span>
              <Paperclip size={16} className="qb-tips-card-icon" />
            </div>
            <strong>{globalOverview.attachments}</strong>
            <p>Uploaded photos, step-by-step PDFs, and files</p>
            <span className="qb-tips-card-state">
              {filterResource === "attachment" ? "● Active Filter" : "Click to filter"}
            </span>
          </button>

          <button
            type="button"
            className={`qb-tips-overview-card${filterMastery === "mastered" ? " is-active" : ""}`}
            onClick={() => setFilterMastery((prev) => (prev === "mastered" ? "all" : "mastered"))}
          >
            <div className="qb-tips-card-head">
              <span className="qb-list-label">Mastered Items</span>
              <CheckCircle2 size={16} className="qb-tips-card-icon qb-icon-success" />
            </div>
            <strong>{globalOverview.mastered}</strong>
            <p>Questions marked as thoroughly mastered</p>
            <span className="qb-tips-card-state">
              {filterMastery === "mastered" ? "● Active Filter" : "Click to filter"}
            </span>
          </button>
        </div>
      </section>

      {/* Subject Filter Bar */}
      <section className="qb-tips-subject-bar">
        <div className="qb-pills">
          <button
            type="button"
            className={`qb-pill${filterTopic === "all" ? " on" : ""}`}
            onClick={() => setFilterTopic("all")}
          >
            <span>All Subjects</span>
            <span className="qb-pill-count">{questions.length}</span>
          </button>

          {TOPICS.map((topic) => {
            const count = questions.filter((q) => q.topic === topic.id).length;
            const tipsCount = globalOverview.topicCounts[topic.id] || 0;
            return (
              <button
                key={topic.id}
                type="button"
                className={`qb-pill${filterTopic === topic.id ? " on" : ""}`}
                onClick={() => setFilterTopic(filterTopic === topic.id ? "all" : topic.id)}
              >
                <span className="qb-pill-dot" style={{ backgroundColor: topic.color }} />
                <span>{topic.label}</span>
                <span className="qb-pill-count">
                  {tipsCount > 0 ? `${tipsCount} tips` : count}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Main Filter & Search Control Panel */}
      <section className="qb-question-section">
        <div className="qb-list-meta qb-list-meta-tips">
          <div className="qb-list-meta-left qb-list-meta-left-tips">
            <div className="qb-tips-meta-info">
              <span className="qb-list-label">Method Library</span>
              <span className="qb-list-value">{filteredQuestions.length} Questions</span>
              {pendingSyncCount > 0 && (
                <span
                  className="qb-tip-badge qb-syncing-badge"
                  title="Changes pending cloud sync"
                >
                  <RefreshCw size={12} className="spin-fast" />
                  Syncing {pendingSyncCount}
                </span>
              )}
            </div>

            <button
              type="button"
              className={`qb-filter-toggle-btn${showFilters ? " active" : ""}`}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter size={15} />
              <span>Filter Options</span>
              {activeFiltersCount > 0 && (
                <span className="qb-filter-badge">{activeFiltersCount}</span>
              )}
            </button>

            {activeFiltersCount > 0 && (
              <button
                type="button"
                className="qb-filter-reset-btn"
                onClick={handleResetFilters}
                title="Reset all active search & filters"
              >
                <RotateCcw size={12} />
                <span>Reset ({activeFiltersCount})</span>
              </button>
            )}
          </div>

          <label className="qb-search-box qb-tips-search-box">
            <span className="qb-search-icon" aria-hidden="true">
              <Search size={17} />
            </span>
            <input
              className="qb-search"
              placeholder="Search by label, formula, question, or notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                className="qb-search-clear-btn"
                onClick={() => setSearch("")}
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </label>
        </div>

        {/* Expandable Filter Drawer */}
        {showFilters && (
          <div className="qb-tips-filters-drawer">
            <div className="qb-tips-filters-grid">
              {/* Category Filter */}
              <div className="qb-tips-filter-field">
                <label className="qb-tips-filter-label">
                  <Tag size={14} />
                  <span>Tip Category</span>
                </label>
                <CustomSelect
                  value={filterCategory}
                  onChange={setFilterCategory}
                  options={[
                    { value: "all", label: "All Categories" },
                    ...Object.values(TIP_CATEGORIES).map((cat) => ({
                      value: cat.id,
                      label: cat.label,
                    })),
                  ]}
                />
              </div>

              {/* Mastery Filter */}
              <div className="qb-tips-filter-field">
                <label className="qb-tips-filter-label">
                  <TrendingUp size={14} />
                  <span>Mastery Level</span>
                </label>
                <CustomSelect
                  value={filterMastery}
                  onChange={setFilterMastery}
                  options={[
                    { value: "all", label: "All Mastery Levels" },
                    ...Object.values(MASTERY_LEVELS).map((level) => ({
                      value: level.id,
                      label: level.label,
                    })),
                  ]}
                />
              </div>

              {/* Resource Filter */}
              <div className="qb-tips-filter-field">
                <label className="qb-tips-filter-label">
                  <Layers size={14} />
                  <span>Content Type</span>
                </label>
                <CustomSelect
                  value={filterResource}
                  onChange={setFilterResource}
                  options={[
                    { value: "all", label: "All Items" },
                    { value: "saved", label: "Has Any Tip" },
                    { value: "diagram", label: "Has Visual Diagram" },
                    { value: "attachment", label: "Has File/Image Upload" },
                    { value: "notes", label: "Has Written Notes" },
                  ]}
                />
              </div>
            </div>
          </div>
        )}

        {/* Tips Masonry Grid */}
        <div className="qb-tips-grid">
          {filteredQuestions.length === 0 ? (
            <div className="qb-tips-empty-state">
              <Lightbulb size={36} className="qb-empty-icon" />
              <h3 className="qb-empty-title">No Matching Methods Found</h3>
              <p className="qb-empty-desc">
                {activeFiltersCount > 0
                  ? "Try clearing some of your search filters to see more questions."
                  : "Start adding study tips, whiteboard sketches, or uploaded step-by-step methods."}
              </p>
              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  className="qb-empty-btn"
                  onClick={handleResetFilters}
                >
                  <RotateCcw size={14} />
                  Reset all filters
                </button>
              )}
            </div>
          ) : (
            tipColumns.map((col, ci) => (
              <div className="qb-tip-col" key={ci}>
                {col.map((q, i) =>
                  renderTipCard(q, tipIndexMap.get(q.id), i === col.length - 1)
                )}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
