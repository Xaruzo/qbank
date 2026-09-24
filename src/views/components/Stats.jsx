import React from "react";
import { TOPICS } from "../../constants/appConstants";
import { Check } from "lucide-react";

export default function Stats({ total, counts, topicFilter = "all", onSelectTopic }) {
  const statItems = [
    {
      id: "all",
      label: "All Questions",
      short: "TOTAL",
      value: total,
      color: "var(--text-heading)",
      note: "Full bank",
      percent: 100,
    },
    ...TOPICS.map((topic) => {
      const val = counts[topic.id] || 0;
      const pct = total > 0 ? Math.round((val / total) * 100) : 0;
      return {
        id: topic.id,
        label: topic.label,
        short: topic.short,
        value: val,
        color: topic.color,
        note: "Bank share",
        percent: pct,
      };
    }),
  ];

  return (
    <section className="qb-stats-wrap" aria-label="Topic Coverage Overview">
      <div className="qb-section-head">
        <div>
          <div className="qb-section-kicker">Topic Distribution</div>
          <h2 className="qb-section-title">Civil Service Exam Subject Breakdown</h2>
        </div>
        <div className="qb-section-note">Click any topic card to filter questions instantly.</div>
      </div>
      <div className="qb-stats" role="list">
        {statItems.map((item) => {
          const isActive = topicFilter === item.id;
          return (
            <button
              type="button"
              role="listitem"
              key={item.id}
              className={`qb-stat${isActive ? " is-active" : ""}`}
              style={{ "--stat-accent": item.color }}
              onClick={() => onSelectTopic && onSelectTopic(item.id)}
              aria-pressed={isActive}
              title={`Filter by ${item.label}`}
            >
              <div className="qb-stat-top">
                <span className="qb-stat-l">{item.short}</span>
                {isActive && (
                  <span className="qb-stat-active-pill" aria-label="Active filter">
                    <Check size={11} strokeWidth={3} /> Active
                  </span>
                )}
              </div>
              <span className="qb-stat-n">{item.value}</span>
              <span className="qb-stat-name">{item.label}</span>
              <div className="qb-stat-meta-row">
                <span className="qb-stat-note">{item.note}</span>
                <span className="qb-stat-pct">{item.percent}%</span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
