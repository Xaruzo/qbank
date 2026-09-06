import React, { useEffect } from "react";
import { Home, ClipboardList, Lightbulb } from "lucide-react";

const NAV_ITEMS = [
  { id: "home", label: "Home", title: "Home", icon: Home },
  { id: "mock", label: "Mock Exam", title: "Mock Exam", icon: ClipboardList },
  { id: "tips", label: "Tips", title: "Tips & Tricks", icon: Lightbulb },
];

/**
 * Desktop navigation.
 * - variant "rail" (wide screens): persistent collapsed/expandable rail.
 * - variant "overlay" (compact screens): YouTube-style temporary drawer that
 *   floats above the content with a scrim, so it never reserves or blocks
 *   center page width. The header's hamburger button already becomes an X
 *   (close) control while the drawer is open, so no separate close button is
 *   rendered here. Also closes on scrim tap, Escape, or navigation.
 */
export default function SideNav({ variant = "rail", open, active, onHome, onMockExam, onTips, onClose }) {
  useEffect(() => {
    if (variant !== "overlay" || !open) return undefined;
    const handleKey = (e) => {
      if (e.key === "Escape" && onClose) onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [variant, open, onClose]);

  if (variant === "overlay") {
    if (!open) return null;
    const closeAfter = (navigate) => () => {
      navigate();
      if (onClose) onClose();
    };
    return (
      <div className="qb-mnav-ov" onClick={onClose}>
        <aside
          className="qb-mnav-card"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
          onClick={(e) => e.stopPropagation()}
        >
          {/* No close button inside the drawer on purpose: the header's
              hamburger button already toggles to an X (close) icon while the
              drawer is open (see Header.jsx qb-hdr-menu-btn), so a second
              close control here would be redundant. Scrim click, Escape,
              and navigation all close the drawer as well. */}
          <div className="qb-side-block qb-side-intro">
            <span className="qb-side-kicker">Workspace</span>
            <strong className="qb-side-title">Study Center</strong>
            <p className="qb-side-copy">Switch between your main bank, mock exam area, and study tips.</p>
          </div>
          <nav className="qb-side-nav">
            {NAV_ITEMS.map(({ id, label, title, icon: Icon }) => (
              <button
                key={id}
                type="button"
                className={`qb-nav-item${active === id ? " on" : ""}`}
                title={title}
                onClick={closeAfter(id === "home" ? onHome : id === "mock" ? onMockExam : onTips)}
              >
                <Icon size={18} />
                <span className="qb-nav-text">{label}</span>
              </button>
            ))}
          </nav>
          <div className="qb-side-block qb-side-foot">
            <span className="qb-side-foot-label">Quick Note</span>
            <span className="qb-side-foot-text">
              Use Mock Exam for timed practice and return to Home for targeted review.
            </span>
          </div>
        </aside>
      </div>
    );
  }

  const iconSize = open ? 18 : 26;
  const handlers = { home: onHome, mock: onMockExam, tips: onTips };
  return (
    <aside className={`qb-side${open ? "" : " qb-side-collapsed"}`}>
      <div className="qb-side-inner">
        {open && (
          <div className="qb-side-block qb-side-intro">
            <span className="qb-side-kicker">Workspace</span>
            <strong className="qb-side-title">Study Center</strong>
            <p className="qb-side-copy">Switch between your main bank, mock exam area, and study tips.</p>
          </div>
        )}
        <nav className="qb-side-nav">
          {NAV_ITEMS.map(({ id, label, title, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className={`qb-nav-item${active === id ? " on" : ""}`}
              onClick={handlers[id]}
              title={title}
            >
              <Icon size={iconSize} />
              <span className="qb-nav-text">{label}</span>
            </button>
          ))}
        </nav>
        {open && (
          <div className="qb-side-block qb-side-foot">
            <span className="qb-side-foot-label">Quick Note</span>
            <span className="qb-side-foot-text">
              Use Mock Exam for timed practice and return to Home for targeted review.
            </span>
          </div>
        )}
      </div>
    </aside>
  );
}
