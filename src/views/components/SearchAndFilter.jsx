import React from "react";
import { TOPICS } from "../../constants/appConstants";

export default function SearchAndFilter({
  search,
  onSearchChange,
  topicFilter,
  onTopicChange,
  total,
  counts,
}) {
  const getTopicColor = id => TOPICS.find(t => t.id===id)?.color || "inherit";

  return (
    <>
      <input 
        className="qb-search" 
        placeholder="Search questions, choices, or solutions..." 
        value={search} 
        onChange={e => onSearchChange(e.target.value)} 
      />
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
