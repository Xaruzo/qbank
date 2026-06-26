import React from "react";
import { Home, ClipboardList } from "lucide-react";

export default function SideNav({ open, active, onHome, onMockExam }) {
  const iconSize = open ? 18 : 26;
  return (
    <aside className={`qb-side${open ? "" : " qb-side-collapsed"}`}>
      <div className="qb-side-inner">
        {open && (
          <div className="qb-side-block qb-side-intro">
            <span className="qb-side-kicker">Navigation</span>
            <strong className="qb-side-title">Review Center</strong>
            <p className="qb-side-copy">Move between your question dashboard and timed mock exam workspace.</p>
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
        </nav>
        {open && (
          <div className="qb-side-block qb-side-foot">
            <span className="qb-side-foot-label">Focus Mode</span>
            <span className="qb-side-foot-text">
              Use Mock Exam for a full timed run and return to Home for targeted review.
            </span>
          </div>
        )}
      </div>
    </aside>
  );
}
