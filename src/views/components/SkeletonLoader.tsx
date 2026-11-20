const Bar = ({ w, h, extra = {} }) => (
  <div className="qb-skel-bar" style={{ width: w, height: h, ...extra }} />
);

const Chip = ({ w = 130, h = 34, br = 999, extra = {} }) => (
  <span className="qb-skel-chip" style={{ width: w, height: h, borderRadius: br, ...extra }} />
);

const SKEL_STATS = [0, 1, 2, 3, 4, 5];
const SKEL_QUESTIONS = [0, 1, 2, 3];

export default function SkeletonLoader() {
  return (
    <div className="fu qb-dashboard qb-skeleton" aria-hidden="true">
      <section className="qb-list-hero qb-skel-hero">
        <div className="qb-list-hero-main">
          {Bar({ w: "128px", h: "10px" })}
          {Bar({ w: "min(420px, 85%)", h: "36px", extra: { maxWidth: "85%" } })}
          {Bar({ w: "min(360px, 62%)", h: "15px", extra: { maxWidth: "62%" } })}
          <div className="qb-skel-chips">
            <Chip w={130} />
            <Chip w={120} />
            <Chip w={150} />
          </div>
        </div>
        <div className="qb-list-hero-side">
          <div className="qb-list-hero-panel qb-skel-panel">
            {Bar({ w: "64px", h: "9px" })}
            {Bar({ w: "56px", h: "30px" })}
            {Bar({ w: "100%", h: "13px" })}
          </div>
          <div className="qb-list-hero-panel qb-skel-panel">
            {Bar({ w: "56px", h: "9px" })}
            {Bar({ w: "56px", h: "30px" })}
            {Bar({ w: "100%", h: "13px" })}
          </div>
        </div>
      </section>

      <div className="qb-skel-stats">
        {SKEL_STATS.map((i) => (
          <div className="qb-stat qb-skel-stat" key={i}>
            {Bar({ w: "52px", h: "10px" })}
            {Bar({ w: "88px", h: "15px" })}
            <div className="qb-skel-stat-n">
              {Bar({ w: "52px", h: "30px" })}
            </div>
            {Bar({ w: "72%", h: "12px" })}
          </div>
        ))}
      </div>

      <div className="qb-skel-control">
        <div className="qb-skel-control-row">
          {Bar({ w: "min(420px, 100%)", h: "46px", extra: { maxWidth: "100%", borderRadius: 18 } })}
          <Chip w={200} h={46} br={18} />
          <Chip w={170} h={46} br={18} />
        </div>
      </div>

      <section className="qb-question-section">
        <div className="qb-list-meta">
          <div className="qb-list-meta-left">
            {Bar({ w: "88px", h: "14px" })}
            {Bar({ w: "72px", h: "14px" })}
          </div>
          <div className="qb-list-meta-right">
            <Chip w={110} h={34} br={10} />
          </div>
        </div>

        <div className="qb-question-stack">
          {SKEL_QUESTIONS.map((i) => (
            <div className="qb-qcard qb-skel-card" key={i}>
              <div className="qb-qcard-top">
                {Bar({ w: "92px", h: "12px" })}
                {Chip({ w: 46, h: 22, br: 6 })}
              </div>
              <div className="qb-qcard-body">
                {Bar({ w: "min(320px, 55%)", h: "16px", extra: { maxWidth: "55%" } })}
                {Bar({ w: "92%", h: "13px" })}
                {Bar({ w: "78%", h: "13px" })}
              </div>
              <div className="qb-qcard-foot">
                <Chip w={96} h={24} />
                <Chip w={96} h={24} />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export function MockSkeletonLoader() {
  return (
    <div className="fu qb-mock-page qb-skeleton" aria-hidden="true">
      <div className="qb-section-head qb-mock-page-head">
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {Bar({ w: "120px", h: "10px" })}
          {Bar({ w: "min(430px, 75%)", h: "26px", extra: { maxWidth: "75%" } })}
        </div>
        <Chip w={150} h={34} br={999} />
      </div>

      <div className="qb-mock-insights">
        {[0, 1, 2, 3].map((i) => (
          <div className="qb-mock-mini-card qb-skel-panel" key={i}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              {Bar({ w: "80px", h: "10px" })}
              {Chip({ w: 44, h: 18, br: 999 })}
            </div>
            {Bar({ w: "68px", h: "26px" })}
            {Bar({ w: "100%", h: "6px", extra: { borderRadius: 999 } })}
            {Bar({ w: "90px", h: "10px" })}
          </div>
        ))}
      </div>

      <div className="qb-det-card qb-mock-hero-card">
        <div className="qb-exam-card">
          <div className="qb-mock-hero-top">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {Bar({ w: "170px", h: "20px" })}
              {Bar({ w: "min(430px, 92%)", h: "13px", extra: { maxWidth: "92%" } })}
              {Bar({ w: "min(380px, 78%)", h: "13px", extra: { maxWidth: "78%" } })}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              <Chip w={130} h={28} />
              <Chip w={120} h={28} />
              <Chip w={140} h={28} />
            </div>
          </div>

          <div className="qb-mock-blueprint">
            {[0, 1, 2].map((i) => (
              <div className="qb-mock-blueprint-card qb-skel-panel" key={i}>
                {Bar({ w: "52px", h: "9px" })}
                {Bar({ w: "72%", h: "16px" })}
                {Bar({ w: "92%", h: "12px" })}
                {Bar({ w: "62%", h: "12px" })}
              </div>
            ))}
          </div>

          <div className="qb-mock-hero-actions">
            <Chip w={190} h={44} br={10} />
            <Chip w={170} h={44} br={10} />
          </div>
        </div>
      </div>

      <div className="qb-mock-history">
        <div className="qb-det-card qb-mock-history-list">
          <div className="qb-mock-section-head">
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {Bar({ w: "110px", h: "9px" })}
              {Bar({ w: "86px", h: "20px" })}
              {Bar({ w: "min(360px, 70%)", h: "12px", extra: { maxWidth: "70%" } })}
            </div>
            <Chip w={96} h={26} />
          </div>
          <div className="qb-mock-attempts">
            {[0, 1, 2].map((i) => (
              <div className="qb-mock-attempt-card qb-skel-panel" key={i} style={{ cursor: "default" }}>
                <div className="qb-mock-attempt-top">
                  {Bar({ w: "110px", h: "12px" })}
                  {Bar({ w: "52px", h: "22px" })}
                </div>
                {Bar({ w: "140px", h: "13px" })}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Chip w={100} h={24} />
                  <Chip w={90} h={24} />
                  <Chip w={120} h={24} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function TipsSkeletonLoader() {
  return (
    <div className="fu qb-skeleton" aria-hidden="true">
      <div className="qb-section-head" style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {Bar({ w: "110px", h: "10px" })}
          {Bar({ w: "160px", h: "26px" })}
        </div>
      </div>

      <section className="qb-question-section">
        <div className="qb-list-meta qb-list-meta-tips" style={{ marginBottom: 14 }}>
          <div className="qb-list-meta-left qb-list-meta-left-tips">
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              {Bar({ w: "100px", h: "14px" })}
              {Bar({ w: "76px", h: "14px" })}
              <Chip w={104} h={34} br={8} />
            </div>
          </div>
          <label className="qb-search-box qb-tips-search-box" style={{ pointerEvents: "none" }}>
            <span className="qb-search-icon" aria-hidden="true">
              <div className="qb-skel-bar" style={{ width: 18, height: 18, borderRadius: 6 }} />
            </span>
            <div className="qb-skel-bar" style={{ width: "60%", height: 14, margin: "0 16px 0 46px" }} />
          </label>
        </div>

        <div className="qb-question-stack">
          {SKEL_QUESTIONS.map((i) => (
            <div className="qb-qcard qb-skel-card" key={i}>
              <div className="qb-qcard-top">
                {Bar({ w: "92px", h: "12px" })}
                {Chip({ w: 46, h: 22, br: 6 })}
              </div>
              <div className="qb-qcard-body">
                {Bar({ w: "min(320px, 55%)", h: "16px", extra: { maxWidth: "55%" } })}
                {Bar({ w: "92%", h: "13px" })}
                {Bar({ w: "78%", h: "13px" })}
              </div>
              <div className="qb-qcard-foot">
                <Chip w={120} h={24} />
                <Chip w={96} h={24} />
                <Chip w={90} h={24} />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

const MY_QUESTIONS_SKELETON_CARDS = [
  { stemWidths: ["88%", "56%"], choiceWidths: ["64%", "52%", "72%", "48%"], hasSolution: true },
  { stemWidths: ["94%", "42%"], choiceWidths: ["58%", "68%", "48%", "62%"], hasSolution: false },
  { stemWidths: ["80%", "66%"], choiceWidths: ["66%", "54%", "60%", "56%"], hasSolution: false },
];

export function MyQuestionsSkeletonLoader() {
  return (
    <div
      className="flex flex-col gap-4"
      role="status"
      aria-busy="true"
      aria-label="Loading personal questions"
    >
      <span className="sr-only">Loading your personal questions...</span>
      {MY_QUESTIONS_SKELETON_CARDS.map((card, idx) => (
        <div
          key={idx}
          aria-hidden="true"
          className="pointer-events-none flex flex-col gap-4 rounded-2xl border border-qb-border bg-qb-surface p-4 @sm:p-5 @2xl:p-6"
        >
          {/* Card Header Metadata & Action Bar */}
          <div className="flex flex-col gap-3 border-b border-qb-border/70 pb-3.5 @2xl:flex-row @2xl:items-center @2xl:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <span className="qb-skel-bar h-3.5 w-24" />
              <span className="qb-skel-bar h-3.5 w-28" />
              <span className="qb-skel-bar h-3.5 w-20" />
            </div>
            <div className="flex items-center gap-2">
              <span className="qb-skel-bar h-9 flex-1 @sm:w-36 @sm:flex-none" />
              <span className="qb-skel-bar h-9 w-16" />
              <span className="qb-skel-bar h-9 w-9 shrink-0" />
            </div>
          </div>

          {/* Question Stem Lines */}
          <div className="flex flex-col gap-2 py-0.5">
            <div className="qb-skel-bar h-4" style={{ width: card.stemWidths[0] }} />
            <div className="qb-skel-bar h-4" style={{ width: card.stemWidths[1] }} />
          </div>

          {/* Choices Grid (1 col mobile/compact, 2 col @xl+) */}
          <div className="grid grid-cols-1 gap-2.5 @xl:grid-cols-2">
            {card.choiceWidths.map((choiceW, cIdx) => (
              <div
                key={cIdx}
                className="flex items-center gap-2.5 rounded-xl border border-qb-border bg-qb-input px-3 py-2.5"
              >
                <span className="qb-skel-bar h-6 w-6 shrink-0" />
                <span className="qb-skel-bar h-3.5" style={{ width: choiceW }} />
              </div>
            ))}
          </div>

          {/* Optional Solution Box Placeholder on First Card */}
          {card.hasSolution && (
            <div className="flex flex-col gap-2 rounded-xl border border-qb-border bg-qb-input p-3.5">
              <span className="qb-skel-bar h-3 w-36" />
              <span className="qb-skel-bar h-3.5 w-[82%]" />
            </div>
          )}

          {/* Footer Date & Attribution */}
          <div className="flex items-center justify-between border-t border-qb-border/70 pt-3">
            <span className="qb-skel-bar h-3 w-28" />
            <span className="qb-skel-bar h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}


