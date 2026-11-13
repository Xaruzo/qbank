import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check } from "lucide-react";
import type { CustomSelectProps } from "../../types";

interface PortalMenuCoords {
  left: number;
  width: number;
  top?: number;
  bottom?: number;
}

export default function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "Select...",
  className = "",
  style = {},
  leadIcon,
  showCheckmark = false,
  portal = false,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [direction, setDirection] = useState<"down" | "up">("down");
  const [portalCoords, setPortalCoords] = useState<PortalMenuCoords | null>(null);
  const selectRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const computePlacement = useCallback(() => {
    if (!selectRef.current) return;
    const rect = selectRef.current.getBoundingClientRect();
    const scrollParent = selectRef.current.closest(".qb-settings-users-table-wrap");
    const containerBottom = scrollParent
      ? Math.min(window.innerHeight, scrollParent.getBoundingClientRect().bottom)
      : window.innerHeight;
    const spaceBelow = (portal ? window.innerHeight : containerBottom) - rect.bottom;
    const nextDir: "down" | "up" = spaceBelow < 200 ? "up" : "down";
    setDirection(nextDir);

    if (portal) {
      setPortalCoords(
        nextDir === "up"
          ? {
              left: rect.left,
              width: rect.width,
              bottom: window.innerHeight - rect.top + 6,
            }
          : {
              left: rect.left,
              width: rect.width,
              top: rect.bottom + 6,
            }
      );
    }
  }, [portal]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: PointerEvent) => {
      const target = e.target as Node;
      if (selectRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setIsOpen(false);
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

  useEffect(() => {
    if (!isOpen || !portal) return;
    const handleRepositionOrClose = (e: Event) => {
      if (e.type === "scroll" && menuRef.current && e.target instanceof Node && menuRef.current.contains(e.target)) {
        return;
      }
      if (e.type === "scroll") {
        setIsOpen(false);
        return;
      }
      computePlacement();
    };
    window.addEventListener("scroll", handleRepositionOrClose, true);
    window.addEventListener("resize", handleRepositionOrClose);
    return () => {
      window.removeEventListener("scroll", handleRepositionOrClose, true);
      window.removeEventListener("resize", handleRepositionOrClose);
    };
  }, [isOpen, portal, computePlacement]);

  const selectedOption = options.find((opt) => opt.value === value);
  const displayText = selectedOption?.label || placeholder;

  const menuElement = (
    <div
      ref={menuRef}
      className={`qb-select-menu${isOpen ? " open" : ""}${portal ? " qb-select-menu-portal" : ""}`}
      data-dir={direction}
      style={
        portal && portalCoords
          ? {
              position: "fixed",
              left: `${portalCoords.left}px`,
              right: "auto",
              width: `${portalCoords.width}px`,
              top: portalCoords.top !== undefined ? `${portalCoords.top}px` : "auto",
              bottom: portalCoords.bottom !== undefined ? `${portalCoords.bottom}px` : "auto",
              zIndex: 9999,
            }
          : undefined
      }
    >
      <div className="qb-select-menu-scroll">
        {options.map((option) => {
          const isSelected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              className={`qb-select-item${isSelected ? " on" : ""}`}
              title={option.label}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
            >
              {option.icon && (
                <span className="qb-select-item-icon-wrap" aria-hidden="true">
                  {option.icon}
                </span>
              )}
              <span className="qb-select-item-label">{option.label}</span>
              {showCheckmark && isSelected && (
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
  );

  const portalContainer =
    portal && typeof document !== "undefined"
      ? selectRef.current?.closest(".qb") || document.body
      : null;

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
          if (!isOpen) computePlacement();
          setIsOpen((prev) => !prev);
        }}
        aria-expanded={isOpen}
        title={displayText}
      >
        <span className="qb-select-btn-lead">
          {leadIcon ? (
            <span className="qb-select-lead-icon">{leadIcon}</span>
          ) : selectedOption?.icon ? (
            <span className="qb-select-lead-icon">{selectedOption.icon}</span>
          ) : null}
          <span className="qb-select-btn-text">{displayText}</span>
        </span>
        <ChevronDown size={14} className={`qb-select-chevron${isOpen ? " is-open" : ""}`} />
      </button>
      {portal && isOpen && portalContainer ? createPortal(menuElement, portalContainer) : !portal ? menuElement : null}
    </div>
  );
}
