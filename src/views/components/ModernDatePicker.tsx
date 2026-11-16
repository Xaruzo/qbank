import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { Calendar, ChevronLeft, ChevronRight, ChevronDown, X } from "lucide-react";

interface ModernDatePickerProps {
  id?: string;
  value: string;
  onChange: (nextValue: string) => void;
  placeholder?: string;
  allowClear?: boolean;
}

interface PortalCoords {
  left: number;
  width: number;
  top?: number;
  bottom?: number;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const SHORT_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const pad2 = (n: number) => String(n).padStart(2, "0");

const toIsoDate = (year: number, monthIndex: number, day: number): string =>
  `${year}-${pad2(monthIndex + 1)}-${pad2(day)}`;

const parseIsoDate = (raw: string): { year: number; month: number; day: number } | null => {
  if (!raw || typeof raw !== "string") return null;
  const match = raw.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const check = new Date(year, month, day);
  if (
    check.getFullYear() !== year ||
    check.getMonth() !== month ||
    check.getDate() !== day
  ) {
    return null;
  }
  return { year, month, day };
};

const formatDisplayDate = (raw: string): string => {
  const parsed = parseIsoDate(raw);
  if (!parsed) return "";
  const dt = new Date(parsed.year, parsed.month, parsed.day);
  return dt.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export default function ModernDatePicker({
  id,
  value,
  onChange,
  placeholder = "Select target date",
  allowClear = true,
}: ModernDatePickerProps) {
  const parsedValue = useMemo(() => parseIsoDate(value), [value]);
  const today = useMemo(() => new Date(), []);
  const todayIso = toIsoDate(today.getFullYear(), today.getMonth(), today.getDate());

  const [isOpen, setIsOpen] = useState(false);
  const [panelMode, setPanelMode] = useState<"days" | "months">("days");
  const [viewYear, setViewYear] = useState<number>(
    () => parsedValue?.year ?? today.getFullYear()
  );
  const [viewMonth, setViewMonth] = useState<number>(
    () => parsedValue?.month ?? today.getMonth()
  );
  const [coords, setCoords] = useState<PortalCoords | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const computePlacement = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const maxW = Math.min(316, Math.max(260, window.innerWidth - 24));
    const width = maxW;
    const clampedLeft = Math.max(12, Math.min(rect.left, window.innerWidth - width - 12));
    const estimatedHeight = 348;
    const spaceBelow = window.innerHeight - rect.bottom - 12;
    const spaceAbove = rect.top - 12;
    const openUp = spaceBelow < estimatedHeight && spaceAbove > spaceBelow;

    if (openUp) {
      const bottom = Math.max(12, window.innerHeight - rect.top + 8);
      setCoords({ left: clampedLeft, width, bottom });
    } else {
      const top = Math.min(rect.bottom + 8, Math.max(12, window.innerHeight - estimatedHeight - 12));
      setCoords({ left: clampedLeft, width, top });
    }
  }, []);

  const openCalendar = () => {
    const base = parseIsoDate(value);
    setViewYear(base?.year ?? today.getFullYear());
    setViewMonth(base?.month ?? today.getMonth());
    setPanelMode("days");
    computePlacement();
    setIsOpen(true);
  };

  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (popoverRef.current?.contains(target)) return;
      setIsOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };
    const onViewportChange = (e: Event) => {
      if (e.type === "scroll" && popoverRef.current && e.target instanceof Node && popoverRef.current.contains(e.target)) {
        return;
      }
      computePlacement();
    };

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onViewportChange);
    window.addEventListener("scroll", onViewportChange, true);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange, true);
    };
  }, [isOpen, computePlacement]);

  const calendarCells = useMemo(() => {
    const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const cells: Array<{
      iso: string;
      day: number;
      inCurrentMonth: boolean;
    }> = [];

    for (let i = firstWeekday - 1; i >= 0; i -= 1) {
      const d = daysInPrevMonth - i;
      const m = viewMonth === 0 ? 11 : viewMonth - 1;
      const y = viewMonth === 0 ? viewYear - 1 : viewYear;
      cells.push({ iso: toIsoDate(y, m, d), day: d, inCurrentMonth: false });
    }

    for (let d = 1; d <= daysInMonth; d += 1) {
      cells.push({ iso: toIsoDate(viewYear, viewMonth, d), day: d, inCurrentMonth: true });
    }

    const remaining = 42 - cells.length;
    for (let d = 1; d <= remaining; d += 1) {
      const m = viewMonth === 11 ? 0 : viewMonth + 1;
      const y = viewMonth === 11 ? viewYear + 1 : viewYear;
      cells.push({ iso: toIsoDate(y, m, d), day: d, inCurrentMonth: false });
    }

    return cells;
  }, [viewYear, viewMonth]);

  const stepMonth = (delta: number) => {
    let nextM = viewMonth + delta;
    let nextY = viewYear;
    if (nextM < 0) {
      nextM = 11;
      nextY -= 1;
    } else if (nextM > 11) {
      nextM = 0;
      nextY += 1;
    }
    setViewMonth(nextM);
    setViewYear(nextY);
  };

  const handleSelectDate = (iso: string) => {
    onChange(iso);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const formattedValue = formatDisplayDate(value);
  const portalTarget =
    typeof document !== "undefined"
      ? rootRef.current?.closest(".qb-settings-page-root") ||
        rootRef.current?.closest(".qb") ||
        document.body
      : null;

  const popover =
    isOpen && coords && portalTarget
      ? createPortal(
          <div
            ref={popoverRef}
            className="qb-datepicker-popover"
            role="dialog"
            aria-label="Choose target exam date"
            style={{
              position: "fixed",
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              top: coords.top !== undefined ? `${coords.top}px` : "auto",
              bottom: coords.bottom !== undefined ? `${coords.bottom}px` : "auto",
              zIndex: 9999,
            }}
          >
            {/* Header */}
            <div className="qb-datepicker-head">
              {panelMode === "days" ? (
                <>
                  <button
                    type="button"
                    className="qb-datepicker-month-switch"
                    onClick={() => setPanelMode("months")}
                    title="Switch month or year"
                  >
                    <span>
                      {MONTH_NAMES[viewMonth]} {viewYear}
                    </span>
                    <ChevronDown size={14} />
                  </button>
                  <div className="qb-datepicker-nav-group">
                    <button
                      type="button"
                      className="qb-datepicker-nav-btn"
                      onClick={() => stepMonth(-1)}
                      aria-label="Previous month"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      type="button"
                      className="qb-datepicker-nav-btn"
                      onClick={() => stepMonth(1)}
                      aria-label="Next month"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="qb-datepicker-month-switch is-active"
                    onClick={() => setPanelMode("days")}
                    title="Back to calendar days"
                  >
                    <span>Year {viewYear}</span>
                    <ChevronDown size={14} className="is-flipped" />
                  </button>
                  <div className="qb-datepicker-nav-group">
                    <button
                      type="button"
                      className="qb-datepicker-nav-btn"
                      onClick={() => setViewYear((y) => y - 1)}
                      aria-label="Previous year"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      type="button"
                      className="qb-datepicker-nav-btn"
                      onClick={() => setViewYear((y) => y + 1)}
                      aria-label="Next year"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Body */}
            {panelMode === "days" ? (
              <div className="qb-datepicker-body">
                <div className="qb-datepicker-weekdays" aria-hidden="true">
                  {WEEKDAYS.map((wd) => (
                    <span key={wd} className="qb-datepicker-weekday">
                      {wd}
                    </span>
                  ))}
                </div>
                <div className="qb-datepicker-days-grid">
                  {calendarCells.map((cell) => {
                    const isSelected = value === cell.iso;
                    const isToday = todayIso === cell.iso;
                    return (
                      <button
                        key={cell.iso}
                        type="button"
                        onClick={() => handleSelectDate(cell.iso)}
                        aria-pressed={isSelected}
                        aria-label={cell.iso}
                        className={`qb-datepicker-day${cell.inCurrentMonth ? "" : " is-outside"}${
                          isToday ? " is-today" : ""
                        }${isSelected ? " is-selected" : ""}`}
                      >
                        {cell.day}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="qb-datepicker-months-grid">
                {SHORT_MONTHS.map((label, idx) => {
                  const isCurrentViewMonth = idx === viewMonth;
                  return (
                    <button
                      key={label}
                      type="button"
                      className={`qb-datepicker-month-cell${isCurrentViewMonth ? " is-selected" : ""}`}
                      onClick={() => {
                        setViewMonth(idx);
                        setPanelMode("days");
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Footer */}
            <div className="qb-datepicker-foot">
              <button
                type="button"
                className="qb-datepicker-foot-btn"
                onClick={() => handleSelectDate(todayIso)}
              >
                Today
              </button>
              <div className="qb-datepicker-foot-right">
                {allowClear && value && (
                  <button
                    type="button"
                    className="qb-datepicker-foot-btn is-muted"
                    onClick={() => {
                      onChange("");
                      setIsOpen(false);
                    }}
                  >
                    Clear
                  </button>
                )}
                <button
                  type="button"
                  className="qb-datepicker-foot-btn is-done"
                  onClick={() => setIsOpen(false)}
                >
                  Done
                </button>
              </div>
            </div>
          </div>,
          portalTarget
        )
      : null;

  return (
    <div ref={rootRef} className="qb-datepicker-root">
      <button
        ref={triggerRef}
        id={id}
        type="button"
        className={`qb-datepicker-trigger${isOpen ? " is-open" : ""}${!formattedValue ? " is-empty" : ""}${
          allowClear && formattedValue ? " has-clear" : ""
        }`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => (isOpen ? setIsOpen(false) : openCalendar())}
      >
        <Calendar size={16} className="qb-datepicker-trigger-icon" aria-hidden="true" />
        <span className="qb-datepicker-trigger-text">
          {formattedValue || placeholder}
        </span>
        <ChevronDown
          size={15}
          className={`qb-datepicker-trigger-chevron${isOpen ? " is-open" : ""}`}
          aria-hidden="true"
        />
      </button>
      {allowClear && formattedValue && (
        <button
          type="button"
          className="qb-datepicker-clear-btn"
          aria-label="Clear selected date"
          title="Clear date"
          onClick={() => onChange("")}
        >
          <X size={13} />
        </button>
      )}
      {popover}
    </div>
  );
}
