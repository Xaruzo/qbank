import { useState, useRef, useEffect, useLayoutEffect, useCallback, type KeyboardEvent as ReactKeyboardEvent } from "react";
import {
  Search,
  SlidersHorizontal,
  ChevronDown,
  X,
  Star,
  RotateCcw,
  Tag,
  Layers,
  Calculator,
  BookOpen,
  Landmark,
  BrainCircuit,
  FileSpreadsheet,
  type LucideIcon,
} from "lucide-react";
import { TOPICS } from "../../constants/appConstants";
import { computeSelectPlacement } from "../../utils/selectPlacement";
import type { MasteryFilter, SearchAndFilterProps, TopicDef, TopicId } from "../../types";

const TOPIC_ICONS: Record<string, LucideIcon> = {
  all: Layers,
  numerical: Calculator,
  verbal: BookOpen,
  general: Landmark,
  analytical: BrainCircuit,
  clerical: FileSpreadsheet,
};

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
  masteryFilter = "all",
  onMasteryChange,
  masteryCounts,
  onResetFilters,
}: SearchAndFilterProps) {
  const getTopicColor = (id: string) => {
    if (id === "all") return "#f5a623";
    return TOPICS.find((t: TopicDef) => t.id === id)?.color || "#f5a623";
  };

  const hasActiveFilters = Boolean(
    search.trim() ||
    topicFilter !== "all" ||
    labelFilter !== "all" ||
    favoriteOnly ||
    masteryFilter !== "all"
  );

  const activeFiltersCount = [
    search.trim(),
    topicFilter !== "all" ? topicFilter : "",
    labelFilter !== "all" ? labelFilter : "",
    favoriteOnly ? "fav" : "",
    masteryFilter !== "all" ? masteryFilter : "",
  ].filter(Boolean).length;

  const [labelFilterOpen, setLabelFilterOpen] = useState(false);
  const [labelFilterDir, setLabelFilterDir] = useState<"down" | "up">("down");
  const [labelFilterMaxH, setLabelFilterMaxH] = useState(312);
  const labelFilterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!labelFilterOpen) return;
    const handle = (e: PointerEvent) => {
      const root = labelFilterRef.current;
      if (!root) return;
      if (root.contains(e.target as Node)) return;
      setLabelFilterOpen(false);
    };
    window.addEventListener("pointerdown", handle);
    return () => window.removeEventListener("pointerdown", handle);
  }, [labelFilterOpen]);

  useEffect(() => {
    if (!labelFilterOpen) return;
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLabelFilterOpen(false);
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [labelFilterOpen]);

  useLayoutEffect(() => {
    if (!labelFilterOpen) return;
    const sync = () => {
      const next = computeSelectPlacement(labelFilterRef.current);
      setLabelFilterDir(next.dir);
      setLabelFilterMaxH(next.maxHeight);
    };
    sync();
    window.addEventListener("resize", sync);
    window.addEventListener("scroll", sync, true);
    return () => {
      window.removeEventListener("resize", sync);
      window.removeEventListener("scroll", sync, true);
    };
  }, [labelFilterOpen]);

  const resolvedMasteryCounts = masteryCounts || {
    all: total,
    unseen: total,
    missed: 0,
    mastered: 0,
  };

  // Strictly disable segmented glider & motion when LITE / Power-Saver or reduced motion is enabled
  const [isMotionDisabled, setIsMotionDisabled] = useState<boolean>(() => {
    if (typeof document === "undefined" || typeof window === "undefined") return false;
    const root = document.documentElement;
    const body = document.body;
    return (
      root.classList.contains("qb-lite-mode") ||
      root.classList.contains("qb-no-animations") ||
      Boolean(body?.classList.contains("qb-lite-mode")) ||
      Boolean(body?.classList.contains("qb-no-animations")) ||
      Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches)
    );
  });

  useEffect(() => {
    if (typeof document === "undefined" || typeof window === "undefined") return;
    const root = document.documentElement;
    const body = document.body;
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");

    const checkMotionPref = () => {
      setIsMotionDisabled(
        root.classList.contains("qb-lite-mode") ||
        root.classList.contains("qb-no-animations") ||
        Boolean(body?.classList.contains("qb-lite-mode")) ||
        Boolean(body?.classList.contains("qb-no-animations")) ||
        Boolean(mq?.matches)
      );
    };

    checkMotionPref();
    const observer = new MutationObserver(checkMotionPref);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    if (body) {
      observer.observe(body, { attributes: true, attributeFilter: ["class"] });
    }
    if (mq?.addEventListener) {
      mq.addEventListener("change", checkMotionPref);
    }
    return () => {
      observer.disconnect();
      if (mq?.removeEventListener) {
        mq.removeEventListener("change", checkMotionPref);
      }
    };
  }, []);

  const masteryBarRef = useRef<HTMLDivElement>(null);
  const masteryBtnRefs = useRef<Partial<Record<MasteryFilter, HTMLButtonElement | null>>>({});
  const lastNavKeyboardRef = useRef(false);
  const [gliderReady, setGliderReady] = useState(false);
  const [focusedMastery, setFocusedMastery] = useState<MasteryFilter | null>(null);
  const [gliderRect, setGliderRect] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);
  const [focusRect, setFocusRect] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);

  const measureButtonRect = useCallback((id: MasteryFilter) => {
    const container = masteryBarRef.current;
    const btn = masteryBtnRefs.current[id];
    if (!container || !btn) return null;
    const width = btn.offsetWidth;
    const height = btn.offsetHeight;
    if (width === 0 || height === 0) return null;
    return {
      left: btn.offsetLeft,
      top: btn.offsetTop,
      width,
      height,
    };
  }, []);

  useEffect(() => {
    if (!onMasteryChange || isMotionDisabled) {
      setGliderReady(false);
      return;
    }
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setGliderReady(true));
    });
    return () => {
      cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
    };
  }, [onMasteryChange, isMotionDisabled]);

  useLayoutEffect(() => {
    if (!onMasteryChange || isMotionDisabled) {
      setGliderRect(null);
      setFocusRect(null);
      return;
    }

    const syncGliders = () => {
      const nextActive = measureButtonRect(masteryFilter);
      if (nextActive) setGliderRect(nextActive);
      const nextFocus = focusedMastery ? measureButtonRect(focusedMastery) : null;
      setFocusRect(nextFocus);
    };

    let moveRaf = 0;
    if (!gliderReady) {
      syncGliders();
    } else {
      moveRaf = requestAnimationFrame(syncGliders);
    }

    const container = masteryBarRef.current;
    const resizeObserver =
      typeof ResizeObserver !== "undefined" && container
        ? new ResizeObserver(() => syncGliders())
        : null;
    if (resizeObserver && container) {
      resizeObserver.observe(container);
    }
    window.addEventListener("resize", syncGliders);
    return () => {
      if (moveRaf) cancelAnimationFrame(moveRaf);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", syncGliders);
    };
  }, [
    onMasteryChange,
    isMotionDisabled,
    gliderReady,
    masteryFilter,
    focusedMastery,
    resolvedMasteryCounts.all,
    resolvedMasteryCounts.unseen,
    resolvedMasteryCounts.missed,
    resolvedMasteryCounts.mastered,
    measureButtonRect,
  ]);

  const masteryOptions: ReadonlyArray<{ id: MasteryFilter; label: string; count: number }> = [
    { id: "all", label: "All", count: resolvedMasteryCounts.all },
    { id: "unseen", label: "Unseen", count: resolvedMasteryCounts.unseen },
    { id: "missed", label: "Missed", count: resolvedMasteryCounts.missed },
    { id: "mastered", label: "Mastered", count: resolvedMasteryCounts.mastered },
  ];

  const handleMasteryKeyDown = (e: ReactKeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    if (!onMasteryChange) return;
    let nextIndex: number | null = null;
    if (e.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % masteryOptions.length;
    } else if (e.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + masteryOptions.length) % masteryOptions.length;
    } else if (e.key === "Home") {
      nextIndex = 0;
    } else if (e.key === "End") {
      nextIndex = masteryOptions.length - 1;
    }
    if (nextIndex === null) return;
    e.preventDefault();
    lastNavKeyboardRef.current = true;
    const nextOption = masteryOptions[nextIndex];
    const nextBtn = masteryBtnRefs.current[nextOption.id];
    onMasteryChange(nextOption.id);
    if (nextBtn) {
      nextBtn.focus({ preventScroll: true });
      nextBtn.scrollIntoView({
        block: "nearest",
        inline: "nearest",
        behavior: isMotionDisabled ? "auto" : "smooth",
      });
    }
  };

  return (
    <section
      className="rounded-2xl border border-qb-border bg-qb-surface p-4 sm:p-5 space-y-4"
      aria-label="Search and Filter Questions"
    >
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pb-3.5 border-b border-qb-border">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-qb-accent">
            Search & Filters
          </div>
          <h2 className="mt-0.5 text-base sm:text-lg font-bold tracking-tight text-qb-heading">
            Refine & Focus Your Practice
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-qb-muted px-1">
            <strong className="font-bold text-qb-heading tabular-nums">{filteredCount}</strong>
            {" "}of{" "}
            <span className="tabular-nums">{total}</span> items
          </span>

          {favoriteCount > 0 && onFavoriteOnlyChange && (
            <button
              type="button"
              onClick={() => onFavoriteOnlyChange(!favoriteOnly)}
              aria-pressed={favoriteOnly}
              title={favoriteOnly ? "Show all questions" : "Show starred questions only"}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                favoriteOnly
                  ? "border-amber-500/60 bg-amber-500/15 text-amber-300 light:border-amber-600/50 light:bg-amber-500/15 light:text-amber-800"
                  : "border-qb-border bg-qb-input text-qb-mid hover:border-qb-border-hover hover:text-qb-heading"
              }`}
            >
              <Star size={13} fill={favoriteOnly ? "currentColor" : "none"} />
              <span>
                Starred (<span className="tabular-nums">{favoriteCount}</span>)
              </span>
            </button>
          )}

          {hasActiveFilters && onResetFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              title="Clear all active filters"
              className="inline-flex items-center gap-1.5 rounded-lg border border-qb-border bg-qb-input px-2.5 py-1.5 text-xs font-semibold text-qb-mid transition-colors hover:border-rose-500/40 hover:text-rose-400 light:hover:text-rose-700 cursor-pointer"
            >
              <RotateCcw size={12} />
              <span>Reset ({activeFiltersCount})</span>
            </button>
          )}
        </div>
      </div>

      {/* Search Input & Problem Label Dropdown */}
      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_240px] gap-3 items-end">
        <div className="flex flex-col gap-1.5 min-w-0">
          <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-qb-muted">
            Keyword Search
          </span>
          <label className="relative flex h-11 items-center rounded-xl border border-qb-border bg-qb-input transition-all focus-within:border-amber-500/60 focus-within:ring-2 focus-within:ring-amber-500/15">
            <span className="pointer-events-none pl-3.5 text-qb-muted" aria-hidden="true">
              <Search size={16} />
            </span>
            <input
              className="w-full h-full bg-transparent px-3 text-sm text-qb-heading placeholder:text-qb-muted/70 focus:outline-none"
              placeholder="Search keywords, formulas, concepts, or problem text..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
            />
            {search && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                aria-label="Clear search text"
                title="Clear search"
                className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-lg text-qb-muted transition-colors hover:bg-qb-surface-hover hover:text-qb-heading cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </label>
        </div>

        {labelOptions.length > 0 && (
          <div className="qb-label-filter-col flex flex-col gap-1.5 min-w-0">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.06em] text-qb-muted">
              <Tag size={11} aria-hidden="true" />
              <span>Problem Label</span>
            </span>
            <div className="qb-select" ref={labelFilterRef} data-dir={labelFilterDir} data-open={labelFilterOpen}>
              <button
                className="qb-select-btn !h-11 !min-h-[44px] !rounded-xl"
                type="button"
                onClick={() => {
                  if (!labelFilterOpen && labelFilterRef.current) {
                    const next = computeSelectPlacement(labelFilterRef.current);
                    setLabelFilterDir(next.dir);
                    setLabelFilterMaxH(next.maxHeight);
                  }
                  setLabelFilterOpen((o) => !o);
                }}
                aria-expanded={labelFilterOpen}
              >
                <span className="qb-select-btn-lead">
                  <Tag size={14} className="qb-select-lead-icon" aria-hidden="true" />
                  <span className="qb-select-btn-text">
                    {labelFilter === "all"
                      ? "All Labels"
                      : labelOptions.find((o) => o.value === labelFilter)?.label || "All Labels"}
                  </span>
                </span>
                <ChevronDown size={15} className={`qb-select-chevron${labelFilterOpen ? " is-open" : ""}`} />
              </button>
              <div className={`qb-select-menu${labelFilterOpen ? " open" : ""}`}>
                <div className="qb-select-menu-scroll" style={{ maxHeight: `${labelFilterMaxH}px` }}>
                  <button
                    type="button"
                    className={`qb-select-item${labelFilter === "all" ? " on" : ""}`}
                    onClick={() => {
                      onLabelChange("all");
                      setLabelFilterOpen(false);
                    }}
                  >
                    <Tag size={13} className="qb-select-item-icon" aria-hidden="true" />
                    <span className="qb-select-item-label">All Labels</span>
                  </button>
                  {labelOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={`qb-select-item${labelFilter === option.value ? " on" : ""}`}
                      onClick={() => {
                        onLabelChange(option.value);
                        setLabelFilterOpen(false);
                      }}
                    >
                      <Tag size={13} className="qb-select-item-icon" aria-hidden="true" />
                      <span className="qb-select-item-label">{option.label}</span>
                      <span className="qb-select-count tabular-nums">({option.count})</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Subject Focus Selector */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.06em] text-qb-muted">
          <SlidersHorizontal size={12} aria-hidden="true" />
          <span>Subject Focus</span>
        </div>
        <div
          className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2"
          role="tablist"
          aria-label="Subject filter tabs"
        >
          {[
            { id: "all" as const, label: "All Subjects", count: total },
            ...TOPICS.map((t: TopicDef) => ({ id: t.id, label: t.label, count: counts[t.id] || 0 })),
          ].map((p) => {
            const isSelected = topicFilter === p.id;
            const topicCol = getTopicColor(p.id);
            const Icon = TOPIC_ICONS[p.id] || Layers;
            return (
              <button
                key={p.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => onTopicChange(p.id as TopicId | "all")}
                style={
                  isSelected
                    ? {
                        borderColor: `${topicCol}88`,
                        backgroundColor: `${topicCol}1c`,
                      }
                    : undefined
                }
                className={`inline-flex items-center justify-between sm:justify-start gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-all duration-150 cursor-pointer ${
                  isSelected
                    ? "text-qb-heading"
                    : "border-qb-border bg-qb-input text-qb-mid hover:border-qb-border-hover hover:text-qb-heading"
                }`}
              >
                <span className="flex items-center gap-1.5 min-w-0">
                  <Icon
                    size={13}
                    style={{ color: topicCol }}
                    className="shrink-0"
                    aria-hidden="true"
                  />
                  <span className="truncate">{p.label}</span>
                </span>
                <span
                  className={`font-mono text-[11px] tabular-nums shrink-0 ${
                    isSelected ? "text-qb-heading font-bold" : "text-qb-muted"
                  }`}
                >
                  {p.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mastery Status Segmented Control */}
      {onMasteryChange && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 pt-1">
          <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-qb-muted shrink-0">
            Progress
          </span>
          <div
            ref={masteryBarRef}
            className={`qb-mastery-segmented${!isMotionDisabled && gliderRect ? " has-glider" : ""}${gliderReady ? " is-ready" : ""}`}
            role="tablist"
            aria-label="Mastery status filter"
            onPointerDown={() => {
              lastNavKeyboardRef.current = false;
              setFocusedMastery(null);
            }}
            onKeyDownCapture={() => {
              lastNavKeyboardRef.current = true;
            }}
            onBlur={(e) => {
              const nextTarget = e.relatedTarget as Node | null;
              if (!masteryBarRef.current || !nextTarget || !masteryBarRef.current.contains(nextTarget)) {
                setFocusedMastery(null);
              }
            }}
          >
            {!isMotionDisabled && gliderRect && (
              <span
                className={`qb-mastery-glider status-${masteryFilter}`}
                aria-hidden="true"
                style={{
                  top: 0,
                  left: 0,
                  width: `${gliderRect.width}px`,
                  height: `${gliderRect.height}px`,
                  transform: `translate3d(${gliderRect.left}px, ${gliderRect.top}px, 0)`,
                }}
              />
            )}
            {!isMotionDisabled && focusRect && focusedMastery && (
              <span
                className={`qb-mastery-focus-glider status-${focusedMastery}`}
                aria-hidden="true"
                style={{
                  top: 0,
                  left: 0,
                  width: `${focusRect.width}px`,
                  height: `${focusRect.height}px`,
                  transform: `translate3d(${focusRect.left}px, ${focusRect.top}px, 0)`,
                }}
              />
            )}
            {masteryOptions.map((opt, idx) => {
              const active = masteryFilter === opt.id;
              return (
                <button
                  key={opt.id}
                  ref={(el) => {
                    masteryBtnRefs.current[opt.id] = el;
                  }}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className={`qb-mastery-seg-btn status-${opt.id}${active ? " is-active" : ""}`}
                  onClick={() => {
                    lastNavKeyboardRef.current = false;
                    setFocusedMastery(null);
                    onMasteryChange(opt.id);
                    masteryBtnRefs.current[opt.id]?.scrollIntoView({
                      block: "nearest",
                      inline: "nearest",
                      behavior: isMotionDisabled ? "auto" : "smooth",
                    });
                  }}
                  onFocus={(e) => {
                    if (isMotionDisabled) return;
                    const matchesFocusVisible =
                      lastNavKeyboardRef.current || e.currentTarget.matches(":focus-visible");
                    if (matchesFocusVisible) {
                      setFocusedMastery(opt.id);
                    }
                  }}
                  onKeyDown={(e) => handleMasteryKeyDown(e, idx)}
                >
                  <span>{opt.label}</span>
                  <span className="qb-mastery-seg-count tabular-nums">{opt.count}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
