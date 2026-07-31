import React, { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

/**
 * CustomSelect - Reusable custom dropdown component
 * Consistent styling across QBANK app
 */
export default function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "Select...",
  className = "",
  style = {},
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [direction, setDirection] = useState("down");
  const selectRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      if (selectRef.current && !selectRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    window.addEventListener("pointerdown", handleClickOutside);
    return () => window.removeEventListener("pointerdown", handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  const selectedOption = options.find(opt => opt.value === value);
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
          setIsOpen(prev => !prev);
        }}
        aria-expanded={isOpen}
      >
        <span>{displayText}</span>
        <ChevronDown size={16} />
      </button>
      <div className={`qb-select-menu${isOpen ? " open" : ""}`}>
        <div className="qb-select-menu-scroll">
          {options.map(option => (
            <button
              key={option.value}
              type="button"
              className={`qb-select-item${value === option.value ? " on" : ""}`}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
