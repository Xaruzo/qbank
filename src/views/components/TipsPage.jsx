import React, { useEffect, useMemo, useState } from "react";
import { TOPICS } from "../../constants/appConstants";
import { tipsModel, TIP_CATEGORIES, MASTERY_LEVELS } from "../../models/tipsModel";
import MathText from "./MathText";
import CustomSelect from "./CustomSelect";
import { TipsSkeletonLoader } from "./SkeletonLoader";
import { Search, Filter, Palette, FileText, Tag, TrendingUp, Image as ImageIcon, Paperclip, RefreshCw } from "lucide-react";

export default function TipsPage({
  questions,
  userId,
  onSelectQuestion,
}) {
  const [tipsMap, setTipsMap] = useState({});
  const [tipsLoading, setTipsLoading] = useState(true);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterMastery, setFilterMastery] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    let active = true;
    setTipsLoading(true);
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
        // keep polling; a transient failure should not break the page
      }
    };

    refreshSync();
    const intervalId = window.setInterval(refreshSync, 12000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [userId]);

  const filteredQuestions = useMemo(() => {
    const q = search.trim().toLowerCase();
    let filtered = [...questions];

    // Text search
    if (q) {
      filtered = filtered.filter((item) => {
        const label = typeof item.label === "string" ? item.label : "";
        const questionText = typeof item.question === "string" ? item.question : "";
        return `${label} ${questionText}`.toLowerCase().includes(q);
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
  }, [questions, search, tipsMap, filterCategory, filterMastery]);

  const getTopic = (id) => TOPICS.find((t) => t.id === id) || TOPICS[0];

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

  const activeFiltersCount = (filterCategory !== "all" ? 1 : 0) + (filterMastery !== "all" ? 1 : 0);
  const overview = useMemo(() => {
    return filteredQuestions.reduce((acc, item) => {
      const tipData = tipsMap?.[item.id];
      const hasTip = !!(tipData && (
        (typeof tipData === "string" && tipData.trim()) ||
        (typeof tipData === "object" && (tipData.text?.trim() || tipData.canvasData || tipData.attachmentUrl))
      ));
      const hasAttachment = !!(tipData && typeof tipData === "object" && tipData.attachmentUrl);
      const hasImage = !!(tipData && typeof tipData === "object" && String(tipData.attachmentType || "").startsWith("image/"));
      const hasDiagram = !!(tipData && typeof tipData === "object" && tipData.canvasData);

      if (hasTip) acc.saved += 1;
      if (hasAttachment) acc.attachments += 1;
      if (hasImage) acc.images += 1;
      if (hasDiagram) acc.diagrams += 1;
      return acc;
    }, { saved: 0, attachments: 0, images: 0, diagrams: 0 });
  }, [filteredQuestions, tipsMap]);

  if (tipsLoading) {
    return <TipsSkeletonLoader />;
  }

  const renderTipCard = (q, i, stretch) => {
    const t = getTopic(q.topic);
    const tipData = tipsMap?.[q.id];
    const hasTip = !!(tipData && (
      (typeof tipData === "string" && tipData.trim()) ||
      (typeof tipData === "object" && (tipData.text?.trim() || tipData.canvasData || tipData.attachmentUrl))
    ));
    const hasCanvas = !!(tipData && typeof tipData === "object" && tipData.canvasData);
    const hasText = !!(tipData && (
      (typeof tipData === "string" && tipData.trim()) ||
      (typeof tipData === "object" && tipData.text?.trim())
    ));
    const category = tipData && typeof tipData === "object" ? tipData.category : "general";
    const categoryInfo = Object.values(TIP_CATEGORIES).find(c => c.id === category) || TIP_CATEGORIES.GENERAL;
    const mastery = tipData && typeof tipData === "object" ? tipData.masteryLevel : "learning";
    const masteryInfo = Object.values(MASTERY_LEVELS).find(m => m.id === mastery) || MASTERY_LEVELS.LEARNING;
    const hasAttachment = !!(tipData && typeof tipData === "object" && tipData.attachmentUrl);
    const attachmentUrl = tipData && typeof tipData === "object" ? tipData.attachmentUrl : "";
    const attachmentType = tipData && typeof tipData === "object" ? tipData.attachmentType : "";
    const attachmentName = tipData && typeof tipData === "object" ? tipData.attachmentName : "";
    const hasImageAttachment = hasAttachment && String(attachmentType || "").startsWith("image/");

    return (
      <div
        key={q.id}
        className={`qb-tip-card${hasTip ? " qb-tip-card-has-content" : ""}${hasImageAttachment ? " qb-tip-card-has-image" : ""}${stretch && hasImageAttachment ? " qb-tip-card-stretch" : ""}`}
        onClick={() => onSelectQuestion(q.id)}
      >
        {hasImageAttachment && (
          <div className="qb-tip-card-preview">
            <img src={attachmentUrl} alt={attachmentName || q.label || "Tip attachment"} />
          </div>
        )}

        <div className="qb-qcard-top">
          <div className="qb-qcard-top-left">
            <span className="qb-qnum">Tip {String(i + 1).padStart(3, "0")}</span>
            <span className="qb-badge" style={{ color: t.color, background: `${t.color}20` }}>
              {t.short}
            </span>
            {hasAttachment && !hasImageAttachment && (
              <span className="qb-tip-badge" style={{ background: "#2563eb14", color: "#60a5fa", border: "1px solid #2563eb33" }}>
                <Paperclip size={12} />
                Upload
              </span>
            )}
          </div>
        </div>
        <div className="qb-qcard-body">
          <div className="qb-qcard-heading">
            <span className="qb-qcard-label">{q.label || "General Review"}</span>
          </div>
          <span className="qb-qtext qb-tip-card-question">
            <MathText text={q.question} />
          </span>
          {attachmentName && !hasImageAttachment && (
            <div className="qb-tip-card-file-name">{attachmentName}</div>
          )}
        </div>
        <div className="qb-qcard-foot">
          <div className="qb-qcard-meta">
            <span className="qb-qcard-meta-chip">{t.label}</span>
            {hasTip && (
              <>
                <span
                  className="qb-tip-badge"
                  style={{
                    background: `${categoryInfo.color}20`,
                    color: categoryInfo.color,
                    border: `1px solid ${categoryInfo.color}40`,
                  }}
                  title={categoryInfo.label}
                >
                  <Tag size={12} />
                  {categoryInfo.label}
                </span>
                <span
                  className="qb-tip-badge"
                  style={{
                    background: `${masteryInfo.color}20`,
                    color: masteryInfo.color,
                    border: `1px solid ${masteryInfo.color}40`,
                  }}
                  title={masteryInfo.label}
                >
                  <span style={{ fontSize: 11 }}>{masteryInfo.icon}</span>
                  {masteryInfo.label}
                </span>
                {hasText && (
                  <span
                    className="qb-tip-badge"
                    style={{
                      background: "#3b82f620",
                      color: "#3b82f6",
                      border: "1px solid #3b82f640",
                    }}
                    title="Has text notes"
                  >
                    <FileText size={12} />
                    Notes
                  </span>
                )}
                {hasAttachment && (
                  <span
                    className="qb-tip-badge"
                    style={{
                      background: "#0ea5e920",
                      color: "#0ea5e9",
                      border: "1px solid #0ea5e940",
                    }}
                    title={hasImageAttachment ? "Has uploaded image" : "Has uploaded file"}
                  >
                    {hasImageAttachment ? <ImageIcon size={12} /> : <Paperclip size={12} />}
                    {hasImageAttachment ? "Image" : "File"}
                  </span>
                )}
                {hasCanvas && (
                  <span
                    className="qb-tip-badge"
                    style={{
                      background: "#8b5cf620",
                      color: "#8b5cf6",
                      border: "1px solid #8b5cf640",
                    }}
                    title="Has visual diagram"
                  >
                    <Palette size={12} />
                    Diagram
                  </span>
                )}
              </>
            )}
          </div>
          <span className="qb-qcard-open">{hasTip ? "Open Tip" : "Add Tip"}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="fu">
      <div className="qb-section-head" style={{ marginBottom: 24 }}>
        <div>
          <span className="qb-section-kicker">Tips Workspace</span>
          <h2 className="qb-section-title">Tips & Tricks</h2>
          <p className="qb-list-hero-copy" style={{ marginTop: 10, maxWidth: 720 }}>
            A lighter review view for reminders, tense cues, formulas, and uploaded reference images without repeating the full home feed.
          </p>
        </div>
      </div>

      <section className="qb-question-section" style={{ marginBottom: 14 }}>
        <div className="qb-list-meta qb-list-meta-tips">
          <div className="qb-list-meta-left qb-list-meta-left-tips">
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span className="qb-list-label">Tip Library</span>
              <span className="qb-list-value">{filteredQuestions.length} shown</span>
              {pendingSyncCount > 0 && (
                <span
                  className="qb-tip-badge"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    background: "#f59e0b20",
                    color: "#f59e0b",
                    border: "1px solid #f59e0b40",
                    animation: pendingSyncCount > 0 && navigator.onLine !== false ? "qb-sync-pulse 1.6s ease-in-out infinite" : "none",
                  }}
                  title="Changes waiting to sync to Supabase - they will upload automatically when the connection is ready"
                >
                  <RefreshCw size={12} />
                  Syncing {pendingSyncCount} change{pendingSyncCount > 1 ? "s" : ""}
                </span>
              )}
            </div>
            <button
              className="qb-filter-toggle"
              onClick={() => setShowFilters(!showFilters)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: showFilters ? "var(--accent)" : "var(--surface-h)",
                color: showFilters ? "#fff" : "inherit",
                cursor: "pointer",
                position: "relative",
                flexShrink: 0,
              }}
            >
              <Filter size={16} />
              <span>Filters</span>
              {activeFiltersCount > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: -6,
                    right: -6,
                    background: "#ef4444",
                    color: "#fff",
                    borderRadius: "50%",
                    width: 20,
                    height: 20,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>
          <label className="qb-search-box qb-tips-search-box">
            <span className="qb-search-icon" aria-hidden="true">
              <Search size={18} />
            </span>
            <input
              className="qb-search"
              placeholder="Search by label or question..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="qb-filters-panel" style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              {/* Category Filter */}
              <div style={{ flex: "1 1 200px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, marginBottom: 8, opacity: 0.85 }}>
                  <Tag size={14} />
                  Category
                </label>
                <CustomSelect
                  value={filterCategory}
                  onChange={setFilterCategory}
                  options={[
                    { value: "all", label: "All Categories" },
                    ...Object.values(TIP_CATEGORIES).map(cat => ({
                      value: cat.id,
                      label: cat.label,
                    }))
                  ]}
                />
              </div>

              {/* Mastery Filter */}
              <div style={{ flex: "1 1 200px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, marginBottom: 8, opacity: 0.85 }}>
                  <TrendingUp size={14} />
                  Mastery Level
                </label>
                <CustomSelect
                  value={filterMastery}
                  onChange={setFilterMastery}
                  options={[
                    { value: "all", label: "All Levels" },
                    ...Object.values(MASTERY_LEVELS).map(level => ({
                      value: level.id,
                      label: level.label,
                    }))
                  ]}
                />
              </div>

              {/* Clear Filters Button */}
              {activeFiltersCount > 0 && (
                <div style={{ flex: "0 0 auto", display: "flex", alignItems: "flex-end" }}>
                  <button
                    className="qb-fcancel"
                    onClick={() => {
                      setFilterCategory("all");
                      setFilterMastery("all");
                    }}
                    style={{ padding: "8px 16px" }}
                  >
                    Clear Filters
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="qb-tips-overview">
          <div className="qb-tips-overview-card">
            <span className="qb-list-label">Saved Tips</span>
            <strong>{overview.saved}</strong>
            <p>Questions that already have notes, diagrams, or uploads.</p>
          </div>
          <div className="qb-tips-overview-card">
            <span className="qb-list-label">Uploads</span>
            <strong>{overview.attachments}</strong>
            <p>Attached files or references stored inside your tip space.</p>
          </div>
          <div className="qb-tips-overview-card">
            <span className="qb-list-label">Images</span>
            <strong>{overview.images}</strong>
            <p>Image-based memory aids that can be scanned quickly while reviewing.</p>
          </div>
          <div className="qb-tips-overview-card">
            <span className="qb-list-label">Diagrams</span>
            <strong>{overview.diagrams}</strong>
            <p>Visual sketches and whiteboard diagrams linked to question methods.</p>
          </div>
        </div>

        <div className="qb-tips-grid">
          {filteredQuestions.length === 0 ? (
            <div className="qb-empty">
              <div className="qb-empty-t">No results found</div>
              <div className="qb-empty-s">Try adjusting your search.</div>
            </div>
          ) : (
            tipColumns.map((col, ci) => (
              <div className="qb-tip-col" key={ci}>
                {col.map((q, i) => renderTipCard(q, tipIndexMap.get(q.id), i === col.length - 1))}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}