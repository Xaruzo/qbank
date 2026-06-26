import React from "react";
import { TOPICS } from "../../constants/appConstants";

export default function Stats({ total, counts }) {
  const statItems = [
    {
      id: "total",
      label: "Question Bank",
      short: "TOTAL",
      value: total,
      color: "var(--text-heading)",
      note: "All saved questions",
    },
    ...TOPICS.map((topic) => ({
      id: topic.id,
      label: topic.label,
      short: topic.short,
      value: counts[topic.id] || 0,
      color: topic.color,
      note: "Topic coverage",
    })),
  ];

  return (
    <section className="qb-stats-wrap">
      <div className="qb-section-head">
        <div>
          <div className="qb-section-kicker">Coverage Overview</div>
          <h2 className="qb-section-title">Track your study mix at a glance.</h2>
        </div>
        <div className="qb-section-note">Balanced review becomes easier when topic volume is visible.</div>
      </div>
      <div className="qb-stats">
        {statItems.map((item) => (
          <div className="qb-stat" key={item.id} style={{ "--stat-accent": item.color }}>
            <span className="qb-stat-l">{item.short}</span>
            <span className="qb-stat-n">{item.value}</span>
            <span className="qb-stat-name">{item.label}</span>
            <span className="qb-stat-note">{item.note}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
