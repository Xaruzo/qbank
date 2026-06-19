import React from "react";
import { Home, ClipboardList } from "lucide-react";

export default function SideNav({ open, active, onHome, onMockExam }) {
  const iconSize = open ? 18 : 26;
  return (
    <aside className={`qb-side${open ? "" : " qb-side-collapsed"}`}>
      <div className="qb-side-inner">
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
      </div>
    </aside>
  );
}
