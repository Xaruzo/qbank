import React from "react";
import { TOPICS } from "../../constants/appConstants";

export default function Stats({ total, counts }) {
  return (
    <div className="qb-stats">
      <div className="qb-stat"><span className="qb-stat-n">{total}</span><span className="qb-stat-l">Total</span></div>
      {TOPICS.map(t => (
        <div className="qb-stat" key={t.id}>
          <span className="qb-stat-n" style={{ color:t.color }}>{counts[t.id]||0}</span>
          <span className="qb-stat-l">{t.short}</span>
        </div>
      ))}
    </div>
  );
}
