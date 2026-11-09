import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import type { CustomSelectProps } from "../../types";

export default function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "Select...",
  className = "",
  style = {},
  leadIcon,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [direction, setDirection] = useState<"down" | "up">("down");
  const selectRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: PointerEvent) => {
      if (selectRef.current && !selectRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    window.addEventListener("pointerdown", handleClickOutside);
    return () => window.removeEventListener("pointerdown", handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  const selectedOption = options.find((opt) => opt.value === value);
  const displayText = selectedOption?.label || placeholder;

  return (
    <div
      ref={selectRef}
      className={`qb-select ${className}`}
      data-dir={direction}
      data-open={isOpen}
      style={style}
    >
      <button
        className="qb-select-btn"
        type="button"
        onClick={() => {
          if (!isOpen && selectRef.current) {
            const rect = selectRef.current.getBoundingClientRect();
            setDirection(window.innerHeight - rect.bottom < 220 ? "up" : "down");
          }
          setIsOpen((prev) => !prev);
        }}
        aria-expanded={isOpen}
      >
        <span className="qb-select-btn-lead">
          {leadIcon && <span className="qb-select-lead-icon">{leadIcon}</span>}
          <span className="qb-select-btn-text">{displayText}</span>
        </span>
        <ChevronDown size={14} className={`qb-select-chevron${isOpen ? " is-open" : ""}`} />
      </button>
      <div className={`qb-select-menu${isOpen ? " open" : ""}`}>
        <div className="qb-select-menu-scroll">
          {options.map((option) => {
            const isSelected = value === option.value;
            return (
              <button
                key={option.value}
                type="button"
                className={`qb-select-item${isSelected ? " on" : ""}`}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
              >
                <span className="qb-select-item-label">{option.label}</span>
                {isSelected && (
                  <Check size={14} className="qb-select-item-check" />
                )}
                {option.count !== undefined && (
                  <span className="qb-select-count">{option.count}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
