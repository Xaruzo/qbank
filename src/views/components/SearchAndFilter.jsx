import React from "react";
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
}) {
  const getTopicColor = id => TOPICS.find(t => t.id===id)?.color || "inherit";

  return (
    <>
      <input 
        className="qb-search" 
        placeholder="Search questions, labels, choices, or solutions..." 
        value={search} 
        onChange={e => onSearchChange(e.target.value)} 
      />
      {labelOptions.length > 0 && (
        <label className="qb-filter-wrap">
          <span className="qb-filter-label">Problem Label</span>
          <select className="qb-filter-select" value={labelFilter} onChange={e => onLabelChange(e.target.value)}>
            <option value="all">All Labels</option>
            {labelOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label} ({option.count})
              </option>
            ))}
          </select>
        </label>
      )}
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
    </>
  );
}
