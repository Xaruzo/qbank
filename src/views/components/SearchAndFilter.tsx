import { useState, useRef, useEffect } from "react";
import {
  Search,
  SlidersHorizontal,
  ChevronDown,
  X,
  Star,
  RotateCcw,
  Tag,
  Layers,
  Calculator,
  BookOpen,
  Landmark,
  BrainCircuit,
  FileSpreadsheet,
  type LucideIcon,
} from "lucide-react";
import { TOPICS } from "../../constants/appConstants";
import type { SearchAndFilterProps, TopicDef, TopicId } from "../../types";

const TOPIC_ICONS: Record<string, LucideIcon> = {
  all: Layers,
  numerical: Calculator,
  verbal: BookOpen,
  general: Landmark,
  analytical: BrainCircuit,
  clerical: FileSpreadsheet,
};

export default function SearchAndFilter({
  search,
  onSearchChange,
  topicFilter,
  onTopicChange,
  labelFilter,
  onLabelChange,
  labelOptions,
  total,
  counts,
  filteredCount,
  favoriteCount,
  favoriteOnly = false,
  onFavoriteOnlyChange,
  onResetFilters,
}: SearchAndFilterProps) {
  const getTopicColor = (id: string) => {
    if (id === "all") return "#f5a623";
    return TOPICS.find((t: TopicDef) => t.id === id)?.color || "#f5a623";
  };
  const hasActiveFilters = Boolean(search.trim() || topicFilter !== "all" || labelFilter !== "all" || favoriteOnly);
  const activeFiltersCount = [
    search.trim(),
    topicFilter !== "all" ? topicFilter : "",
    labelFilter !== "all" ? labelFilter : "",
    favoriteOnly ? "fav" : "",
  ].filter(Boolean).length;

  const [labelFilterOpen, setLabelFilterOpen] = useState(false);
  const [labelFilterDir, setLabelFilterDir] = useState<"down" | "up">("down");
  const labelFilterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!labelFilterOpen) return;
    const handle = (e: PointerEvent) => {
      const root = labelFilterRef.current;
      if (!root) return;
      if (root.contains(e.target as Node)) return;
      setLabelFilterOpen(false);
    };
    window.addEventListener("pointerdown", handle);
    return () => window.removeEventListener("pointerdown", handle);
  }, [labelFilterOpen]);

  useEffect(() => {
    if (!labelFilterOpen) return;
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLabelFilterOpen(false);
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [labelFilterOpen]);

  return (
    <section className="qb-control-panel" aria-label="Search and Filter Questions">
      <div className="qb-section-head qb-section-head-compact">
        <div>
          <div className="qb-section-kicker">Search & Filters</div>
          <h2 className="qb-section-title">Refine & Focus Your Practice</h2>
        </div>
        <div className="qb-control-summary">
          <span className="qb-control-stat">
            <strong className="tabular-nums">{filteredCount}</strong> of <span className="tabular-nums">{total}</span> items
          </span>
          {favoriteCount > 0 && onFavoriteOnlyChange && (
            <button
              type="button"
              className={`qb-filter-fav-btn${favoriteOnly ? " on" : ""}`}
              onClick={() => onFavoriteOnlyChange(!favoriteOnly)}
              aria-pressed={favoriteOnly}
              title={favoriteOnly ? "Show all questions" : "Show starred questions only"}
            >
              <Star size={13} fill={favoriteOnly ? "currentColor" : "none"} />
              <span>Starred (<span className="tabular-nums">{favoriteCount}</span>)</span>
            </button>
          )}
          {hasActiveFilters && onResetFilters && (
            <button
              type="button"
              className="qb-filter-reset-btn"
              onClick={onResetFilters}
              title="Clear all active filters"
            >
              <RotateCcw size={12} />
              <span>Reset filters ({activeFiltersCount})</span>
            </button>
          )}
        </div>
      </div>

      <div className="qb-control-grid">
        <label className="qb-search-box">
          <span className="qb-search-icon" aria-hidden="true">
            <Search size={18} />
          </span>
          <input
            className="qb-search"
            placeholder="Search keywords, formulas, concepts, or problem text..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {search && (
            <button
              type="button"
              className="qb-search-clear-btn"
              onClick={() => onSearchChange("")}
              aria-label="Clear search text"
              title="Clear search"
            >
              <X size={15} />
            </button>
          )}
        </label>

        {labelOptions.length > 0 && (
          <div className="qb-label-filter-col" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span className="qb-filter-label">
              <Tag size={12} className="qb-filter-label-icon" aria-hidden="true" />
              <span>Problem Label</span>
            </span>
            <div className="qb-select" ref={labelFilterRef} data-dir={labelFilterDir} data-open={labelFilterOpen}>
              <button
                className="qb-select-btn"
                type="button"
                onClick={() => {
                  if (!labelFilterOpen && labelFilterRef.current) {
                    const rect = labelFilterRef.current.getBoundingClientRect();
                    setLabelFilterDir(window.innerHeight - rect.bottom < 220 ? "up" : "down");
                  }
                  setLabelFilterOpen((o) => !o);
                }}
                aria-expanded={labelFilterOpen}
              >
                <span className="qb-select-btn-lead">
                  <Tag size={14} className="qb-select-lead-icon" aria-hidden="true" />
                  <span className="qb-select-btn-text">
                    {labelFilter === "all"
                      ? "All Labels"
                      : labelOptions.find((o) => o.value === labelFilter)?.label || "All Labels"}
                  </span>
                </span>
                <ChevronDown size={15} className={`qb-select-chevron${labelFilterOpen ? " is-open" : ""}`} />
              </button>
              <div className={`qb-select-menu${labelFilterOpen ? " open" : ""}`}>
                <button
                  type="button"
                  className={`qb-select-item${labelFilter === "all" ? " on" : ""}`}
                  onClick={() => {
                    onLabelChange("all");
                    setLabelFilterOpen(false);
                  }}
                >
                  <Tag size={13} className="qb-select-item-icon" aria-hidden="true" />
                  <span className="qb-select-item-label">All Labels</span>
                </button>
                {labelOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`qb-select-item${labelFilter === option.value ? " on" : ""}`}
                    onClick={() => {
                      onLabelChange(option.value);
                      setLabelFilterOpen(false);
                    }}
                  >
                    <Tag size={13} className="qb-select-item-icon" aria-hidden="true" />
                    <span className="qb-select-item-label">{option.label}</span>
                    <span className="qb-select-count tabular-nums">({option.count})</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="qb-filter-row">
        <div className="qb-filter-row-title">
          <SlidersHorizontal size={14} />
          <span>Subject Focus</span>
        </div>
        <div className="qb-pills" role="tablist" aria-label="Subject filter tabs">
          {[
            { id: "all" as const, label: "All Subjects", count: total },
            ...TOPICS.map((t: TopicDef) => ({ id: t.id, label: t.label, count: counts[t.id] || 0 })),
          ].map((p) => {
            const isSelected = topicFilter === p.id;
            const topicCol = getTopicColor(p.id);
            const Icon = TOPIC_ICONS[p.id] || Layers;
            return (
              <button
                key={p.id}
                role="tab"
                aria-selected={isSelected}
                className={`qb-pill qb-topic-pill topic-${p.id}${isSelected ? " on" : ""}`}
                style={{
                  "--topic-color": topicCol,
                  "--topic-color-subtle": `${topicCol}16`,
                  "--topic-color-border": `${topicCol}45`,
                  "--topic-color-hover-bg": `${topicCol}2c`,
                  "--topic-color-hover-border": `${topicCol}a0`,
                  "--topic-color-glow": `${topicCol}55`,
                } as React.CSSProperties}
                onClick={() => onTopicChange(p.id as TopicId | "all")}
              >
                <Icon
                  size={14}
                  className="qb-topic-pill-icon"
                  aria-hidden="true"
                />
                <span className="qb-topic-pill-label">{p.label}</span>
                <span className="qb-pill-count tabular-nums">{p.count}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
