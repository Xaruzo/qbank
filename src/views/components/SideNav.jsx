import React from "react";
import { Home, ClipboardList, Lightbulb } from "lucide-react";

export default function SideNav({ open, active, onHome, onMockExam, onTips }) {
  const iconSize = open ? 18 : 26;
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
          <button
            type="button"
            className={`qb-nav-item${active === "home" ? " on" : ""}`}
            onClick={onHome}
            title="Home"
          >
            <Home size={iconSize} />
            <span className="qb-nav-text">Home</span>
          </button>
          <button
            type="button"
            className={`qb-nav-item${active === "mock" ? " on" : ""}`}
            onClick={onMockExam}
            title="Mock Exam"
          >
            <ClipboardList size={iconSize} />
            <span className="qb-nav-text">Mock Exam</span>
          </button>
          <button
            type="button"
            className={`qb-nav-item${active === "tips" ? " on" : ""}`}
            onClick={onTips}
            title="Tips & Tricks"
          >
            <Lightbulb size={iconSize} />
            <span className="qb-nav-text">Tips</span>
          </button>
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
