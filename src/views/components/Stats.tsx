import { useState, useEffect, useRef } from "react";
import { TOPICS } from "../../constants/appConstants";
import { Check, ChevronDown } from "lucide-react";
import type { StatsProps, TopicDef, TopicId } from "../../types";
import CountUp from "./CountUp";

interface StatItem {
  id: TopicId | "all";
  label: string;
  short: string;
  value: number;
  color: string;
  note: string;
  percent: number;
}

export default function Stats({
  total,
  counts,
  topicFilter = "all",
  onSelectTopic,
}: StatsProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isCompactViewport, setIsCompactViewport] = useState(() =>
    typeof window !== "undefined" && window.matchMedia ? window.matchMedia("(max-width: 900px)").matches : false
  );
  const [compactExpanded, setCompactExpanded] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia("(max-width: 900px)");
    const sync = () => setIsCompactViewport(mql.matches);
    sync();
    if (mql.addEventListener) mql.addEventListener("change", sync);
    else mql.addListener(sync);
    return () => {
      if (mql.removeEventListener) mql.removeEventListener("change", sync);
      else mql.removeListener(sync);
    };
  }, []);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (sectionRef.current) observer.unobserve(sectionRef.current);
        }
      },
      { threshold: 0.15 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const statItems: StatItem[] = [
    {
      id: "all",
      label: "All Questions",
      short: "TOTAL",
      value: total,
      color: "var(--text-heading)",
      note: "Full bank",
      percent: 100,
    },
    ...TOPICS.map((topic: TopicDef): StatItem => {
      const val = counts[topic.id] || 0;
      const pct = total > 0 ? Math.round((val / total) * 100) : 0;
      return {
        id: topic.id,
        label: topic.label,
        short: topic.short || topic.label.slice(0, 4).toUpperCase(),
        value: val,
        color: topic.color,
        note: "Bank share",
        percent: pct,
      };
    }),
  ];

  const activeItem = statItems.find((item) => item.id === topicFilter) || statItems[0];
  const showCards = !isCompactViewport || compactExpanded;

  return (
    <section ref={sectionRef} className="qb-stats-wrap" aria-label="Topic Coverage Overview">
      {isCompactViewport ? (
        <div className="qb-stats-compact-bar">
          <button
            type="button"
            className="qb-stats-collapse-toggle"
            onClick={() => setCompactExpanded((prev) => !prev)}
            aria-expanded={compactExpanded}
          >
            <div className="qb-stats-compact-lead">
              <span className="qb-section-kicker">Topic Distribution</span>
              <span className="qb-stats-compact-summary">
                <strong>{activeItem.label}</strong>
                <span aria-hidden="true"> · </span>
                <span className="tabular-nums">{activeItem.value} items</span>
              </span>
            </div>
            <span className="qb-stats-collapse-action">
              <span>{compactExpanded ? "Hide" : "Topics"}</span>
              <ChevronDown
                size={15}
                className={`qb-stats-collapse-chevron${compactExpanded ? " is-open" : ""}`}
              />
            </span>
          </button>
        </div>
      ) : (
        <div className="qb-section-head">
          <div>
            <div className="qb-section-kicker">Topic Distribution</div>
            <h2 className="qb-section-title">Civil Service Exam Subject Breakdown</h2>
          </div>
          <div className="qb-section-note">Click any topic card to filter questions instantly.</div>
        </div>
      )}

      {showCards && (
        <div className="qb-stats" role="list">
          {statItems.map((item) => {
            const isActive = topicFilter === item.id;
            return (
              <button
                type="button"
                role="listitem"
                key={item.id}
                className={`qb-stat${isActive ? " is-active" : ""}`}
                style={{ "--stat-accent": item.color } as React.CSSProperties}
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
                <span className="qb-stat-n tabular-nums">
                  <CountUp end={isVisible ? item.value : 0} duration={1200} />
                </span>
                <span className="qb-stat-name">{item.label}</span>
                <div className="qb-stat-meter-container">
                  <div className="qb-stat-meter-header">
                    <span className="qb-stat-meter-label">
                      {item.id === "all" ? "Total Bank" : `${item.value} items`}
                    </span>
                    <span className="qb-stat-meter-badge tabular-nums">
                      <CountUp end={isVisible ? item.percent : 0} suffix="%" duration={1200} />
                    </span>
                  </div>
                  <div className="qb-stat-meter-track" aria-hidden="true">
                    <div
                      className="qb-stat-meter-bar"
                      style={{
                        width: isVisible ? `${Math.max(item.percent, 3)}%` : "0%",
                        backgroundColor: item.color,
                      }}
                    />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
