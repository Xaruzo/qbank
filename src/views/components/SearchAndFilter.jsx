import React, { useState, useRef, useEffect } from "react";
import { Search, SlidersHorizontal, ChevronDown } from "lucide-react";
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
}) {
  const getTopicColor = id => TOPICS.find(t => t.id===id)?.color || "inherit";
  const activeFilters = [search.trim(), topicFilter !== "all" ? topicFilter : "", labelFilter !== "all" ? labelFilter : ""].filter(Boolean).length;
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
    <section className="qb-control-panel">
      <div className="qb-section-head qb-section-head-compact">
        <div>
          <div className="qb-section-kicker">Search and Filter</div>
          <h2 className="qb-section-title">Find questions quickly and narrow the list.</h2>
        </div>
        <div className="qb-control-summary">
          <span>{filteredCount} shown</span>
          <span>{favoriteCount} favorites</span>
          <span>{activeFilters} active filters</span>
        </div>
      </div>

      <div className="qb-control-grid">
        <label className="qb-search-box">
          <span className="qb-search-icon" aria-hidden="true">
            <Search size={18} />
          </span>
          <input 
            className="qb-search" 
            placeholder="Search questions, labels, choices, or solutions..." 
            value={search} 
            onChange={e => onSearchChange(e.target.value)} 
          />
        </label>

        {labelOptions.length > 0 && (
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
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
          <SlidersHorizontal size={16} />
          <span>Topic focus</span>
        </div>
        <div className="qb-pills">
          {[{ id:"all", label:`All (${total})` }, ...TOPICS.map(t => ({ id:t.id, label:`${t.label} (${counts[t.id]||0})` }))].map(p => (
            <button 
              key={p.id} 
              className={`qb-pill${topicFilter===p.id?" on":""}`}
              style={topicFilter===p.id && p.id!=="all" ? { color:getTopicColor(p.id), borderColor:`${getTopicColor(p.id)}55` } : {}}
              onClick={() => onTopicChange(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
