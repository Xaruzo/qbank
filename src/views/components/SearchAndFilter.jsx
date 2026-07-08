import React from "react";
import { Search, SlidersHorizontal } from "lucide-react";
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
          <label className="qb-filter-wrap qb-filter-card">
            <span className="qb-filter-label">Problem Label</span>
            <div className="qb-filter-select-wrap">
              <select className="qb-filter-select" value={labelFilter} onChange={e => onLabelChange(e.target.value)}>
                <option value="all">All Labels</option>
                {labelOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label} ({option.count})
                  </option>
                ))}
              </select>
            </div>
          </label>
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
