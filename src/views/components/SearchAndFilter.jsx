import { useState, useRef, useEffect } from "react";
import { Search, SlidersHorizontal, ChevronDown, X, Star, RotateCcw } from "lucide-react";
import { TOPICS } from "../../constants/appConstants";

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
}) {
  const getTopicColor = id => TOPICS.find(t => t.id===id)?.color || "inherit";
  const hasActiveFilters = Boolean(search.trim() || topicFilter !== "all" || labelFilter !== "all" || favoriteOnly);
  const activeFiltersCount = [search.trim(), topicFilter !== "all" ? topicFilter : "", labelFilter !== "all" ? labelFilter : "", favoriteOnly ? "fav" : ""].filter(Boolean).length;
  const [labelFilterOpen, setLabelFilterOpen] = useState(false);
  const [labelFilterDir, setLabelFilterDir] = useState("down");
  const labelFilterRef = useRef(null);

  useEffect(() => {
    if (!labelFilterOpen) return;
    const handle = (e) => {
      const root = labelFilterRef.current;
      if (!root) return;
      if (root.contains(e.target)) return;
      setLabelFilterOpen(false);
    };
    window.addEventListener("pointerdown", handle);
    return () => window.removeEventListener("pointerdown", handle);
  }, [labelFilterOpen]);

  useEffect(() => {
    if (!labelFilterOpen) return;
    const handle = (e) => {
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
            <strong>{filteredCount}</strong> of {total} items
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
              <span>Starred ({favoriteCount})</span>
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
            onChange={e => onSearchChange(e.target.value)} 
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
          <div className="qb-label-filter-col" style={{ display:"flex", flexDirection:"column", gap:6 }}>
            <span className="qb-filter-label">Problem Label</span>
            <div className="qb-select" ref={labelFilterRef} data-dir={labelFilterDir} data-open={labelFilterOpen}>
              <button className="qb-select-btn" type="button" onClick={() => {
                if (!labelFilterOpen && labelFilterRef.current) {
                  const rect = labelFilterRef.current.getBoundingClientRect();
                  setLabelFilterDir(window.innerHeight - rect.bottom < 220 ? "up" : "down");
                }
                setLabelFilterOpen(o => !o);
              }} aria-expanded={labelFilterOpen}>
                <span>{labelFilter === "all" ? "All Labels" : (labelOptions.find(o => o.value === labelFilter)?.label || "All Labels")}</span>
                <ChevronDown size={16} />
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
                  All Labels
                </button>
                {labelOptions.map(option => (
                  <button
                    key={option.value}
                    type="button"
                    className={`qb-select-item${labelFilter === option.value ? " on" : ""}`}
                    onClick={() => {
                      onLabelChange(option.value);
                      setLabelFilterOpen(false);
                    }}
                  >
                    {option.label} ({option.count})
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
          {[{ id:"all", label:"All Subjects", count: total }, ...TOPICS.map(t => ({ id:t.id, label:t.label, count: counts[t.id]||0 }))].map(p => {
            const isSelected = topicFilter === p.id;
            const topicCol = getTopicColor(p.id);
            return (
              <button 
                key={p.id} 
                role="tab"
                aria-selected={isSelected}
                className={`qb-pill${isSelected ? " on" : ""}`}
                style={isSelected && p.id !== "all" ? { borderColor: `${topicCol}66`, color: topicCol } : {}}
                onClick={() => onTopicChange(p.id)}
              >
                {p.id !== "all" && (
                  <span
                    className="qb-pill-dot"
                    style={{ backgroundColor: topicCol }}
                    aria-hidden="true"
                  />
                )}
                <span>{p.label}</span>
                <span className="qb-pill-count">{p.count}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
