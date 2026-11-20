import { useState, useEffect, useRef } from "react";
import { TOPICS } from "../../constants/appConstants";
import {
  Check,
  ChevronDown,
  Layers,
  Calculator,
  BookOpen,
  Landmark,
  BrainCircuit,
  FileSpreadsheet,
  type LucideIcon,
} from "lucide-react";
import type { StatsProps, TopicDef, TopicId } from "../../types";
import CountUp from "./CountUp";

interface StatItem {
  id: TopicId | "all";
  label: string;
  short: string;
  value: number;
  color: string;
  percent: number;
}

const TOPIC_ICONS: Record<string, LucideIcon> = {
  all: Layers,
  numerical: Calculator,
  verbal: BookOpen,
  general: Landmark,
  analytical: BrainCircuit,
  clerical: FileSpreadsheet,
};

export default function Stats({
  total,
  counts,
  topicFilter = "all",
  onSelectTopic,
}: StatsProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isCompactViewport, setIsCompactViewport] = useState(() =>
    typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(max-width: 900px)").matches
      : false
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
      { threshold: 0.12 }
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
      short: "ALL",
      value: total,
      color: "#f5a623",
      percent: 100,
    },
    ...TOPICS.map((topic: TopicDef): StatItem => {
      const val = counts[topic.id] || 0;
      const pct = total > 0 ? Math.round((val / total) * 100) : 0;
      return {
        id: topic.id,
        label: topic.label,
        short: topic.short || topic.label.slice(0, 3).toUpperCase(),
        value: val,
        color: topic.color,
        percent: pct,
      };
    }),
  ];

  const activeItem = statItems.find((item) => item.id === topicFilter) || statItems[0];
  const showCards = !isCompactViewport || compactExpanded;

  return (
    <section ref={sectionRef} className="space-y-3" aria-label="Topic Coverage Overview">
      {isCompactViewport ? (
        <div className="rounded-2xl border border-qb-border bg-qb-surface">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-qb-surface-hover rounded-2xl"
            onClick={() => setCompactExpanded((prev) => !prev)}
            aria-expanded={compactExpanded}
          >
            <div className="min-w-0 flex flex-col gap-0.5">
              <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-qb-muted">
                Topic Distribution
              </span>
              <span className="truncate text-sm text-qb-mid">
                <strong className="font-bold text-qb-heading">{activeItem.label}</strong>
                <span aria-hidden="true" className="mx-1.5 text-qb-muted">·</span>
                <span className="tabular-nums text-qb-muted">{activeItem.value} items</span>
              </span>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-qb-border bg-qb-input px-2.5 py-1.5 text-xs font-semibold text-qb-heading">
              <span>{compactExpanded ? "Hide" : "Topics"}</span>
              <ChevronDown
                size={14}
                className={`transition-transform duration-150 ${compactExpanded ? "rotate-180" : ""}`}
              />
            </span>
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-end justify-between gap-2 px-0.5">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-qb-accent">
              Topic Distribution
            </div>
            <h2 className="mt-0.5 text-lg font-bold tracking-tight text-qb-heading">
              Civil Service Exam Subject Breakdown
            </h2>
          </div>
          <p className="text-xs font-medium text-qb-muted">
            Select any subject card to filter the question feed
          </p>
        </div>
      )}

      {showCards && (
        <div
          className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2.5 sm:gap-3"
          role="list"
        >
          {statItems.map((item) => {
            const isActive = topicFilter === item.id;
            const Icon = TOPIC_ICONS[item.id] || Layers;
            return (
              <button
                type="button"
                role="listitem"
                key={item.id}
                onClick={() => onSelectTopic && onSelectTopic(item.id)}
                aria-pressed={isActive}
                title={`Filter by ${item.label}`}
                className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border p-3.5 sm:p-4 text-left transition-all duration-150 cursor-pointer ${
                  isActive
                    ? "border-amber-500/60 bg-amber-500/[0.08] light:border-amber-600/55 light:bg-amber-500/[0.08]"
                    : "border-qb-border bg-qb-surface hover:border-qb-border-hover hover:bg-qb-surface-hover"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="inline-flex h-7 w-7 items-center justify-center rounded-lg border"
                    style={{
                      color: item.color,
                      backgroundColor: `${item.color}16`,
                      borderColor: `${item.color}36`,
                    }}
                  >
                    <Icon size={14} aria-hidden="true" />
                  </span>
                  {isActive ? (
                    <span
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-qb-accent"
                      aria-label="Active filter"
                    >
                      <Check size={12} strokeWidth={2.8} />
                      Active
                    </span>
                  ) : (
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-qb-muted">
                      {item.short}
                    </span>
                  )}
                </div>

                <div className="mt-3">
                  <div className="text-2xl sm:text-[26px] font-extrabold leading-none tracking-tight text-qb-heading tabular-nums">
                    <CountUp end={isVisible ? item.value : 0} duration={1100} />
                  </div>
                  <div className="mt-1.5 truncate text-[13px] font-semibold text-qb-mid">
                    {item.label}
                  </div>
                </div>

                <div className="mt-3 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-medium text-qb-muted">
                    <span>{item.id === "all" ? "Full bank" : "Share"}</span>
                    <span className="font-mono font-semibold text-qb-heading tabular-nums">
                      <CountUp end={isVisible ? item.percent : 0} suffix="%" duration={1100} />
                    </span>
                  </div>
                  <div
                    className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800/70 light:bg-slate-200"
                    aria-hidden="true"
                  >
                    <div
                      className="h-full rounded-full transition-all duration-500 ease-out"
                      style={{
                        width: isVisible ? `${Math.max(item.percent, 4)}%` : "0%",
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
