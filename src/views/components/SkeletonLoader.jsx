import React from "react";

const bar = (width, height, extra) => (
  <div className="qb-skel-bar" style={{ width, height, ...extra }} />
);

const SKEL_STATS = [0, 1, 2, 3, 4];
const SKEL_QUESTIONS = [0, 1, 2, 3];

export default function SkeletonLoader() {
  return (
    <div className="fu qb-dashboard qb-skeleton" aria-hidden="true">
      <section className="qb-list-hero qb-skel-hero">
        <div className="qb-list-hero-main">
          {bar("128px", "10px")}
          {bar("min(420px, 85%)", "36px", { maxWidth: "85%" })}
          {bar("min(360px, 62%)", "15px", { maxWidth: "62%" })}
          <div className="qb-skel-chips">
            <span className="qb-skel-chip" />
            <span className="qb-skel-chip" />
            <span className="qb-skel-chip" />
          </div>
        </div>
        <div className="qb-list-hero-side">
          <div className="qb-list-hero-panel qb-skel-panel">
            {bar("64px", "9px")}
            {bar("56px", "30px")}
            {bar("100%", "13px")}
          </div>
          <div className="qb-list-hero-panel qb-skel-panel">
            {bar("56px", "9px")}
            {bar("56px", "30px")}
            {bar("100%", "13px")}
          </div>
        </div>
      </section>

      <div className="qb-skel-stats">
        {SKEL_STATS.map((i) => (
          <div className="qb-stat qb-skel-stat" key={i}>
            {bar("52px", "10px")}
            {bar("88px", "15px")}
            <div className="qb-skel-stat-n">
              {bar("52px", "30px")}
            </div>
            {bar("72%", "12px")}
          </div>
        ))}
      </div>

      <div className="qb-skel-control">
        <div className="qb-skel-control-row">
          {bar("min(420px, 100%)", "46px", { maxWidth: "100%" })}
          <span className="qb-skel-chip qb-skel-chip-wide" />
          <span className="qb-skel-chip qb-skel-chip-wide" />
        </div>
      </div>

      <section className="qb-question-section">
        <div className="qb-list-meta">
          <div className="qb-list-meta-left">
            {bar("88px", "14px")}
            {bar("72px", "14px")}
          </div>
          <div className="qb-list-meta-right">
            {bar("90px", "34px")}
          </div>
        </div>

        <div className="qb-question-stack">
          {SKEL_QUESTIONS.map((i) => (
            <div className="qb-qcard qb-skel-card" key={i}>
              <div className="qb-qcard-top">
                {bar("92px", "12px")}
                {bar("46px", "22px")}
              </div>
              <div className="qb-qcard-body">
                {bar("min(320px, 55%)", "16px", { maxWidth: "55%" })}
                {bar("92%", "13px")}
                {bar("78%", "13px")}
              </div>
              <div className="qb-qcard-foot">
                <span className="qb-skel-chip qb-skel-chip-small" />
                <span className="qb-skel-chip qb-skel-chip-small" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
