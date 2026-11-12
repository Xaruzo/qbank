import { useState, useEffect, useRef } from "react";
import {
  ArrowRight,
  Clock,
  Award,
  BookOpen,
  ChevronDown,
  Moon,
  Sun,
  LogIn,
  FileCheck2,
  Sparkles,
  Zap,
  Edit3,
  Check,
} from "lucide-react";
import brandLogo from "../../assets/logo.png";
import AppleHeroCanvas from "./AppleHeroCanvas";
import type { LandingPageProps, TopicId } from "../../types";
import { TOPICS } from "../../constants/appConstants";
import CountUp from "./CountUp";

export default function LandingPage({
  isDark,
  onToggleTheme,
  onStartReview,
  onSignIn,
  onStartMock,
  onNavigateToTips,
  totalQuestions = 0,
  isAuthenticated = false,
  profile = null,
}: LandingPageProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [selectedTopicPreview, setSelectedTopicPreview] = useState<TopicId>("numerical");
  const [shadedChoice, setShadedChoice] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"booklet" | "scratchpad">("booklet");
  const [simTimerSeconds, setSimTimerSeconds] = useState<number>(67);

  // Live ticking simulation timer for authentic exam room feel
  useEffect(() => {
    const timer = setInterval(() => {
      setSimTimerSeconds((prev) => (prev > 1 ? prev - 1 : 67));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const sampleQuestions: Record<
    TopicId,
    {
      label: string;
      code: string;
      question: string;
      choices: string[];
      correctIndex: number;
      explanation: string;
      scratchpadNote: string;
    }
  > = {
    numerical: {
      label: "Rate & Proportion (No Calculator)",
      code: "NUM-042",
      question:
        "If 6 machines can produce 540 units in one hour, how many units can 8 machines produce in the same time at the same operational rate?",
      choices: ["680 units", "700 units", "720 units", "740 units"],
      correctIndex: 2,
      explanation:
        "Step 1: Calculate unit rate per machine: 540 ÷ 6 = 90 units/machine/hr.\nStep 2: Multiply by 8 machines: 8 × 90 = 720 units.\nCorrect answer is C (720 units). Mental math tip: (8 × 9) × 10 = 72 × 10 = 720.",
      scratchpadNote:
        "Scratchpad math:\n540 / 6 = 90 per machine\n8 * 90 = 720 units\nTime spent: ~32s (Well within 67s limit)",
    },
    verbal: {
      label: "Vocabulary in Context",
      code: "VRB-118",
      question:
        "The committee recognized the civil servant for her BENEVOLENT handling of indigenous land settlement claims. The word BENEVOLENT most nearly means:",
      choices: [
        "Charitable, humane, and kind",
        "Hostile and antagonistic",
        "Strictly formal and indifferent",
        "Unnecessarily arrogant",
      ],
      correctIndex: 0,
      explanation:
        "Etymology: Latin 'bene' (well/good) + 'volens' (wishing). Synonyms: kind, philanthropic, compassionate, altruistic. Choice A is correct.",
      scratchpadNote:
        "Root check:\nbene = good (benefit, benefactor)\nvol = will/wish (volunteer)\n-> wishing well / kind",
    },
    general: {
      label: "1987 Philippine Constitution & RA 6713",
      code: "GEN-019",
      question:
        "Under Section 27, Article VI of the 1987 Philippine Constitution, within how many days must the President act on a bill passed by Congress before it automatically lapses into law?",
      choices: ["15 calendar days", "30 calendar days", "45 calendar days", "60 calendar days"],
      correctIndex: 1,
      explanation:
        "Article VI, Section 27(1): The President has thirty (30) days from receipt to sign or veto. If no action is taken within 30 days, the bill becomes law as if signed.",
      scratchpadNote:
        "Constitutional Rule:\n30 days = President action period\nNo action within 30d = Lapses into law\n(Distinguish from 90 days for certain treaties)",
    },
    analytical: {
      label: "Number Series & Pattern Deduction",
      code: "ANA-085",
      question:
        "Determine the missing number in the sequence: 5, 11, 23, 47, 95, [ ? ]",
      choices: ["191", "190", "189", "193"],
      correctIndex: 0,
      explanation:
        "Method 1: Difference doubles each time: +6, +12, +24, +48, +96. 95 + 96 = 191.\nMethod 2: Multiply by 2 and add 1: (5×2)+1=11; (11×2)+1=23; (23×2)+1=47; (47×2)+1=95; (95×2)+1=191.",
      scratchpadNote:
        "+6, +12, +24, +48, +96\n95 + 96 = 191\nAlternatively: 95 * 2 + 1 = 190 + 1 = 191",
    },
    clerical: {
      label: "Alphabetical Indexing Rules (Subpro)",
      code: "CLE-034",
      question:
        "According to standard CSC alphabetical indexing rules for civil registries, how is the surname 'De la Cruz, Juan' correctly indexed?",
      choices: [
        "Cruz, Juan De la",
        "DELACRUZ, Juan",
        "De, Juan la Cruz",
        "La Cruz, Juan De",
      ],
      correctIndex: 1,
      explanation:
        "Rule on Prefixes: Surnames with prefixes like De, Del, De la, San, Santa, and Van are treated as one single unit without spaces when indexing. Hence 'DELACRUZ, Juan'.",
      scratchpadNote:
        "CSC Filing Rule:\nPrefixes stay united with the surname:\nDe la Cruz -> DELACRUZ\nSan Jose -> SANJOSE",
    },
    strategy: {
      label: "Pacing Strategy Target",
      code: "STR-001",
      question:
        "In the 170-item CSC Professional Exam with 190 minutes total time, what is the optimal pacing budget per question to leave 15 minutes for review?",
      choices: [
        "35 seconds per item",
        "60 to 65 seconds per item",
        "90 seconds per item",
        "120 seconds per item",
      ],
      correctIndex: 1,
      explanation:
        "190 minutes minus 15 min review = 175 working minutes = 10,500 seconds ÷ 170 items = ~61.7 seconds per item. Target 60-65 seconds per question.",
      scratchpadNote:
        "190m - 15m buffer = 175m\n175 * 60 = 10,500 sec\n10,500 / 170 = 61.7 sec/item\nTarget pace = ~62s",
    },
    all: {
      label: "CSC Examination Benchmark",
      code: "OVR-100",
      question:
        "What is the official minimum passing score mandated by the Civil Service Commission (CSC) for both Professional and Subprofessional examinations?",
      choices: ["75.00%", "80.00%", "85.00%", "90.00%"],
      correctIndex: 1,
      explanation:
        "The Civil Service Commission mandates a General Rating of at least 80.00% across the examination to obtain civil service eligibility.",
      scratchpadNote:
        "Passing mark: 80.00%\nMust be attained across all sections\nGrants lifetime civil service eligibility",
    },
  };

  const currentPreview = sampleQuestions[selectedTopicPreview] || sampleQuestions.numerical;

  const faqs = [
    {
      q: "What is the official passing score for the Philippine Civil Service Exam?",
      a: "The Civil Service Commission (CSC) mandates a minimum General Rating of 80.00%. While there is no separate passing cutoff per subtest, examinees must perform consistently across Numerical, Verbal, General Information, and Analytical (or Clerical) to reach the 80% mark.",
    },
    {
      q: "What is the difference between Professional and Subprofessional levels?",
      a: "The Professional Level consists of 170 items (3 hours 10 minutes) and qualifies you for both 1st and 2nd level (technical, supervisory, and executive) government positions; it includes Analytical Ability. The Subprofessional Level consists of 165 items (2 hours 40 minutes) for 1st level (clerical, trades, administrative) posts, replacing Analytical Ability with Clerical Operations.",
    },
    {
      q: "Are calculators allowed during the exam?",
      a: "No calculators of any kind are permitted inside the examination room. You may only use the blank spaces inside your test booklet for scratch calculations. QBANK includes an interactive drawing canvas scratchpad on every question so you practice calculating fractions and algebraic ratios by hand.",
    },
    {
      q: "Does QBANK work without internet?",
      a: "Yes. QBANK is built as an offline-first Progressive Web App (PWA). All questions, solutions, timers, and personal notes are cached directly in your browser or device storage. You can practice in transit or in areas without an internet connection, and your progress syncs to the cloud when you reconnect.",
    },
    {
      q: "What do I need to bring on CSC examination day?",
      a: "You must bring: (1) Notice of School Assignment or Application Receipt, (2) One valid government-issued ID (e.g. PhilID, Passport, UMID, Driver's License), (3) Lead Pencils No. 2 with clean erasers, (4) Black ballpoint pens for your examinee sheet, and (5) A clear transparent plastic envelope for your belongings.",
    },
  ];

  return (
    <div className={`qb-landing-root${isDark ? "" : " light"}`}>
      {/* Fixed Full-Screen Apple-style Frame-by-Frame WebP Canvas Scrubbing & Living Animation */}
      <AppleHeroCanvas scrollTargetRef={scrollRef} isDark={isDark} />

      {/* ── Top Bar Contract (1 Wordmark — 4 Nav Links — 1 Primary Action) ── */}
      <header className="qb-landing-nav">
        <div className="qb-landing-nav-inner">
          <div className="qb-landing-brand">
            <img src={brandLogo} alt="QBANK logo" className="qb-landing-logo-img" />
            <span className="qb-landing-brand-title">CSE QBANK</span>
          </div>

          <nav className="qb-landing-menu-links">
            <a href="#presets" className="qb-landing-link">
              Exam Presets
            </a>
            <a href="#curriculum" className="qb-landing-link">
              5 Subjects
            </a>
            <a href="#doctrine" className="qb-landing-link">
              Study Doctrine
            </a>
            <a href="#faq" className="qb-landing-link">
              Exam Day FAQ
            </a>
          </nav>

          <div className="qb-landing-nav-actions">
            <button
              type="button"
              className="qb-landing-icon-btn"
              onClick={onToggleTheme}
              title={isDark ? "Switch to light theme" : "Switch to dark theme"}
              aria-label="Toggle theme"
            >
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {isAuthenticated ? (
              <button
                type="button"
                className="qb-landing-btn-primary"
                onClick={onStartReview}
              >
                <span>Workspace</span>
                <ArrowRight size={14} />
              </button>
            ) : (
              <button
                type="button"
                className="qb-landing-btn-primary"
                onClick={onSignIn}
              >
                <span>Sign In</span>
                <LogIn size={14} />
              </button>
            )}
          </div>
        </div>
      </header>

      <div ref={scrollRef} className="qb-landing-scroll">
      {/* ── Hero Section with Atmospheric Background Animation & Human Craftsmanship ── */}
      <section className="qb-landing-hero">

        {/* Measured Gradient Scrim for WCAG AA Contrast */}
        <div className="qb-landing-hero-scrim" aria-hidden="true" />

        <div className="qb-landing-hero-container">
          {/* Zero-Pill Editorial Kicker */}
          <div className="qb-landing-editorial-kicker">
            <span>Republic of the Philippines</span>
            <span aria-hidden="true">·</span>
            <span>Civil Service Commission (CSC)</span>
            <span aria-hidden="true">·</span>
            <span>Career Service Examination (CSE)</span>
          </div>

          {/* Balanced Display Headline */}
          <h1 className="qb-landing-hero-title">
            Built for the 80% passing mark.
            <br />
            Paced for the 67-second question.
          </h1>

          <p className="qb-landing-hero-desc">
            The Philippine Civil Service Exam is an unforgiving test of speed and mental endurance:
            <strong> 170 items in 190 minutes with zero calculators allowed</strong>. QBANK is an
            independent, offline-first study reviewer with handwritten scratchpads, official CSC
            topic weights, and realistic timed simulations.
          </p>

          {/* Action CTAs */}
          <div className="qb-landing-hero-ctas">
            <button
              type="button"
              className="qb-landing-cta-primary"
              onClick={() => (onStartMock ? onStartMock("professional") : onStartReview())}
            >
              <Zap size={16} />
              <span>Simulate 170-Item Timed Exam</span>
              <ArrowRight size={15} />
            </button>

            <button
              type="button"
              className="qb-landing-cta-secondary"
              onClick={onStartReview}
            >
              <BookOpen size={16} />
              <span>Browse Question Bank</span>
            </button>

            {!isAuthenticated && (
              <button
                type="button"
                className="qb-landing-cta-tertiary"
                onClick={onSignIn}
              >
                <span>Save Progress (Sign In)</span>
              </button>
            )}
          </div>

          {/* Quantitative Metrics Strip with Scroll-Triggered Counters */}
          <div className="qb-landing-metrics-strip">
            <div className="qb-landing-metric-item">
              <span className="qb-landing-metric-val">
                <CountUp end={170} duration={1400} /> / <CountUp end={165} duration={1400} />
              </span>
              <span className="qb-landing-metric-label">Official Item Limits</span>
            </div>
            <div className="qb-landing-metric-divider" />
            <div className="qb-landing-metric-item">
              <span className="qb-landing-metric-val">
                <CountUp end={80} decimals={2} suffix="%" duration={1500} />
              </span>
              <span className="qb-landing-metric-label">CSC Passing Benchmark</span>
            </div>
            <div className="qb-landing-metric-divider" />
            <div className="qb-landing-metric-item">
              <span className="qb-landing-metric-val">
                <CountUp end={67} suffix="s" duration={1200} />
              </span>
              <span className="qb-landing-metric-label">Average Time Per Item</span>
            </div>
            <div className="qb-landing-metric-divider" />
            <div className="qb-landing-metric-item">
              <span className="qb-landing-metric-val">
                <CountUp end={5} suffix=" Subjects" duration={1200} />
              </span>
              <span className="qb-landing-metric-label">Full CSC Coverage</span>
            </div>
            {totalQuestions > 0 && (
              <>
                <div className="qb-landing-metric-divider" />
                <div className="qb-landing-metric-item">
                  <span className="qb-landing-metric-val">
                    <CountUp end={totalQuestions} suffix="+" duration={1600} />
                  </span>
                  <span className="qb-landing-metric-label">Practice Items</span>
                </div>
              </>
            )}
          </div>

          {/* ── Interactive Examinee's Desk & OMR Scantron Simulation Card ── */}
          <div className="qb-landing-desk-card">
            {/* Booklet Header */}
            <div className="qb-landing-desk-head">
              <div className="qb-landing-desk-meta">
                <span className="qb-desk-tag">CSC FORM NO. 100-A</span>
                <span aria-hidden="true" className="qb-desk-sep">·</span>
                <span className="qb-desk-booklet">TEST BOOKLET NO: 2026-CSE</span>
                <span aria-hidden="true" className="qb-desk-sep">·</span>
                <span className="qb-desk-category" title={currentPreview.label}>
                  {currentPreview.label}
                </span>
              </div>

              {/* Live Ticking Pacing Gauge */}
              <div className="qb-landing-pacing-gauge">
                <Clock size={14} className="qb-clock-icon" />
                <span className="qb-pacing-time tabular-nums">
                  Item Pace: 00:{simTimerSeconds < 10 ? `0${simTimerSeconds}` : simTimerSeconds}
                </span>
                <span className="qb-pacing-target">/ 01:07 target</span>
              </div>
            </div>

            {/* Subject Selector Tabs */}
            <div className="qb-landing-subject-selector">
              {TOPICS.map((top) => {
                const isActive = selectedTopicPreview === top.id;
                return (
                  <button
                    key={top.id}
                    type="button"
                    className={`qb-subj-btn${isActive ? " active" : ""}`}
                    onClick={() => {
                      setSelectedTopicPreview(top.id as TopicId);
                      setShadedChoice(null);
                      setShowExplanation(false);
                    }}
                  >
                    <span>{top.short || top.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Mode Switcher: Test Question vs. Handwritten Scratchpad */}
            <div className="qb-desk-tab-bar">
              <button
                type="button"
                className={`qb-desk-tab${activeTab === "booklet" ? " active" : ""}`}
                onClick={() => setActiveTab("booklet")}
              >
                <FileCheck2 size={14} />
                <span>Question Booklet & OMR Bubbles</span>
              </button>
              <button
                type="button"
                className={`qb-desk-tab${activeTab === "scratchpad" ? " active" : ""}`}
                onClick={() => setActiveTab("scratchpad")}
              >
                <Edit3 size={14} />
                <span>Handwritten Scratchpad (No-Calc Work)</span>
              </button>
            </div>

            {/* Interactive Question Body */}
            <div className="qb-desk-body">
              {activeTab === "booklet" ? (
                <>
                  <div className="qb-desk-q-row">
                    <span className="qb-desk-q-num">{currentPreview.code}</span>
                    <p className="qb-desk-q-text">{currentPreview.question}</p>
                  </div>

                  {/* OMR Bubble Sheet simulation (Click to shade lead pencil) */}
                  <div className="qb-omr-container">
                    <div className="qb-omr-lead-hint">
                      <span>Shade your answer with Lead Pencil No. 2:</span>
                    </div>

                    <div className="qb-omr-choices-grid">
                      {currentPreview.choices.map((choice, i) => {
                        const letter = String.fromCharCode(65 + i);
                        const isShaded = shadedChoice === i;
                        const isCorrect = i === currentPreview.correctIndex;

                        return (
                          <div
                            key={i}
                            className={`qb-omr-row${isShaded ? " is-shaded" : ""}${
                              showExplanation && isCorrect ? " is-correct-bubble" : ""
                            }`}
                            onClick={() => {
                              setShadedChoice(i);
                              setShowExplanation(true);
                            }}
                            role="button"
                            tabIndex={0}
                          >
                            <div className="qb-omr-bubble" title={`Shade ${letter}`}>
                              <span className="qb-omr-letter">{letter}</span>
                            </div>
                            <span className="qb-omr-text">{choice}</span>
                            {showExplanation && isCorrect && (
                              <Check size={16} className="qb-omr-check" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Solution Reveal & Walkthrough */}
                  <div className="qb-desk-foot">
                    <button
                      type="button"
                      className="qb-desk-reveal-btn"
                      onClick={() => setShowExplanation(!showExplanation)}
                    >
                      <Sparkles size={14} />
                      <span>{showExplanation ? "Hide Solution" : "Reveal CSC Solution Key"}</span>
                    </button>

                    <button
                      type="button"
                      className="qb-desk-drill-btn"
                      onClick={onStartReview}
                    >
                      <span>Drill in Workspace</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>

                  {showExplanation && (
                    <div className="qb-desk-solution-box">
                      <div className="qb-desk-solution-head">
                        <Award size={14} />
                        <span>Official Solution & Speed Technique</span>
                      </div>
                      <p className="qb-desk-solution-body">{currentPreview.explanation}</p>
                    </div>
                  )}
                </>
              ) : (
                /* Handwritten Scratchpad View */
                <div className="qb-scratchpad-view">
                  <div className="qb-scratchpad-paper">
                    <div className="qb-scratchpad-header">
                      <span>EXAMINEE SCRATCH WORK · NO CALCULATORS ALLOWED</span>
                      <span className="qb-scratchpad-pencil">
                        <Edit3 size={12} className="qb-scratchpad-pencil-icon" style={{ display: "inline-block", verticalAlign: "-1px", marginRight: 4 }} />
                        Yellow HB / No. 2
                      </span>
                    </div>
                    <pre className="qb-scratchpad-handwriting">{currentPreview.scratchpadNote}</pre>
                  </div>
                  <p className="qb-scratchpad-caption">
                    QBANK includes an interactive drawing canvas on every item so you can solve
                    algebra, ratios, and fractions by hand without relying on forbidden calculators.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Official CSC Examination Presets Section ── */}
      <section id="presets" className="qb-landing-section">
        <div className="qb-landing-section-head">
          <div className="qb-landing-section-kicker">Standardized Formats</div>
          <h2 className="qb-landing-section-title">Official CSC Examination Presets</h2>
          <p className="qb-landing-section-sub">
            Built to strictly match the time limits, item counts, and passing criteria mandated by
            the Civil Service Commission.
          </p>
        </div>

        <div className="qb-landing-presets-grid">
          {/* Professional Preset */}
          <div className="qb-landing-preset-card pro">
            <div className="qb-preset-level-tag">2nd Level · Professional</div>
            <h3 className="qb-landing-preset-title">CSC Professional Examination</h3>
            <p className="qb-landing-preset-desc">
              Qualifies passers for both 1st and 2nd Level (technical, scientific, executive, and
              supervisory) government positions nationwide.
            </p>

            {/* White Text Preset Metadata */}
            <div className="qb-preset-meta-row">
              <span className="qb-preset-meta-text">
                <CountUp end={170} suffix=" items" duration={1300} /> · 3h 10m ·{" "}
                <CountUp end={80} suffix="% passing" duration={1400} />
              </span>
            </div>

            <div className="qb-landing-preset-specs-list">
              <div className="qb-landing-preset-spec">
                <FileCheck2 size={16} />
                <span>
                  <strong>170 Items Total</strong> (Analytical Ability included)
                </span>
              </div>
              <div className="qb-landing-preset-spec">
                <Clock size={16} />
                <span>
                  <strong>190 Minutes</strong> (Pace target: ~67 seconds per item)
                </span>
              </div>
              <div className="qb-landing-preset-spec">
                <Award size={16} />
                <span>
                  <strong>80.00% General Rating</strong> required cutoff
                </span>
              </div>
            </div>

            <div className="qb-landing-preset-subjects">
              <span className="qb-subj-tag">Numerical (40)</span>
              <span className="qb-subj-tag">Verbal (50)</span>
              <span className="qb-subj-tag">General Info (20)</span>
              <span className="qb-subj-tag accent">Analytical Ability (40)</span>
            </div>

            <button
              type="button"
              className="qb-landing-preset-btn"
              onClick={() => (onStartMock ? onStartMock("professional") : onStartReview())}
            >
              <span>Simulate 170-Item Professional Exam</span>
              <ArrowRight size={15} />
            </button>
          </div>

          {/* Subprofessional Preset */}
          <div className="qb-landing-preset-card subpro">
            <div className="qb-preset-level-tag sub">1st Level · Subprofessional</div>
            <h3 className="qb-landing-preset-title">CSC Subprofessional Examination</h3>
            <p className="qb-landing-preset-desc">
              Qualifies passers for 1st Level (clerical, secretarial, trades, crafts, and custodial)
              career service positions in government agencies.
            </p>

            {/* White Text Preset Metadata */}
            <div className="qb-preset-meta-row">
              <span className="qb-preset-meta-text">
                <CountUp end={165} suffix=" items" duration={1300} /> · 2h 40m ·{" "}
                <CountUp end={80} suffix="% passing" duration={1400} />
              </span>
            </div>

            <div className="qb-landing-preset-specs-list">
              <div className="qb-landing-preset-spec">
                <FileCheck2 size={16} />
                <span>
                  <strong>165 Items Total</strong> (Clerical Operations included)
                </span>
              </div>
              <div className="qb-landing-preset-spec">
                <Clock size={16} />
                <span>
                  <strong>160 Minutes</strong> (Pace target: ~58 seconds per item)
                </span>
              </div>
              <div className="qb-landing-preset-spec">
                <Award size={16} />
                <span>
                  <strong>80.00% General Rating</strong> required cutoff
                </span>
              </div>
            </div>

            <div className="qb-landing-preset-subjects">
              <span className="qb-subj-tag">Numerical (40)</span>
              <span className="qb-subj-tag">Verbal (50)</span>
              <span className="qb-subj-tag">General Info (20)</span>
              <span className="qb-subj-tag rose">Clerical Operations (40)</span>
            </div>

            <button
              type="button"
              className="qb-landing-preset-btn"
              onClick={() => (onStartMock ? onStartMock("subprofessional") : onStartReview())}
            >
              <span>Simulate 165-Item Subprofessional Exam</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </section>

      {/* ── Curriculum & Subject Coverage ── */}
      <section id="curriculum" className="qb-landing-section alt-bg">
        <div className="qb-landing-section-head">
          <div className="qb-landing-section-kicker">Complete Syllabus</div>
          <h2 className="qb-landing-section-title">All 5 Civil Service Subject Areas</h2>
          <p className="qb-landing-section-sub">
            Engineered around the exact problem distributions and statutory mandates of the
            Philippine Civil Service.
          </p>
        </div>

        <div className="qb-curriculum-grid">
          <div className="qb-curriculum-card">
            <div className="qb-curr-header">
              <span className="qb-curr-index">01</span>
              <span className="qb-curr-badge num">Numerical Ability</span>
            </div>
            <h4 className="qb-curr-title">Mental Math & Ratios</h4>
            <p className="qb-curr-desc">
              Basic operations, fractions, percentages, work rates, age problems, mixture problems,
              and number series solved without calculators.
            </p>
            <div className="qb-curr-footer">
              <span>Weight: 30–40 items</span>
              <span aria-hidden="true">·</span>
              <span>English & Filipino</span>
            </div>
          </div>

          <div className="qb-curriculum-card">
            <div className="qb-curr-header">
              <span className="qb-curr-index">02</span>
              <span className="qb-curr-badge vrb">Verbal Ability</span>
            </div>
            <h4 className="qb-curr-title">Grammar & Reading Comprehension</h4>
            <p className="qb-curr-desc">
              Vocabulary in context, correct usage, sentence completion, identifying sentence
              errors, paragraph organization, and reading passages.
            </p>
            <div className="qb-curr-footer">
              <span>Weight: 40–50 items</span>
              <span aria-hidden="true">·</span>
              <span>Highest point density</span>
            </div>
          </div>

          <div className="qb-curriculum-card">
            <div className="qb-curr-header">
              <span className="qb-curr-index">03</span>
              <span className="qb-curr-badge gen">General Information</span>
            </div>
            <h4 className="qb-curr-title">1987 Constitution & RA 6713</h4>
            <p className="qb-curr-desc">
              1987 Philippine Constitution, Code of Conduct & Ethical Standards for Public
              Officials (RA 6713), Human Rights declarations, and Environmental laws.
            </p>
            <div className="qb-curr-footer">
              <span>Weight: 20 items</span>
              <span aria-hidden="true">·</span>
              <span>High statutory accuracy</span>
            </div>
          </div>

          <div className="qb-curriculum-card">
            <div className="qb-curr-header">
              <span className="qb-curr-index">04</span>
              <span className="qb-curr-badge ana">Analytical Ability</span>
            </div>
            <h4 className="qb-curr-title">Logical Deduction (Pro Only)</h4>
            <p className="qb-curr-desc">
              Syllogisms, assumptions and conclusions, analogy, word association, and data
              interpretation from charts and tables.
            </p>
            <div className="qb-curr-footer">
              <span>Professional Level</span>
              <span aria-hidden="true">·</span>
              <span>40 items</span>
            </div>
          </div>

          <div className="qb-curriculum-card">
            <div className="qb-curr-header">
              <span className="qb-curr-index">05</span>
              <span className="qb-curr-badge cle">Clerical Operations</span>
            </div>
            <h4 className="qb-curr-title">Filing Rules & Office Procedures</h4>
            <p className="qb-curr-desc">
              Alphabetical indexing rules, compound surname filing, proofreading, spelling, and
              administrative government communications.
            </p>
            <div className="qb-curr-footer">
              <span>Subprofessional Level</span>
              <span aria-hidden="true">·</span>
              <span>40 items</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Examinee Study Doctrine (Human Guidance, Not AI Slop) ── */}
      <section id="doctrine" className="qb-landing-section">
        <div className="qb-landing-section-head">
          <div className="qb-landing-section-kicker">Topnotcher Strategy</div>
          <h2 className="qb-landing-section-title">The 3-Pass Exam Room Doctrine</h2>
          <p className="qb-landing-section-sub">
            Passing is determined by pacing discipline and mistake mitigation, not brute memorization.
          </p>
        </div>

        <div className="qb-doctrine-grid">
          <div className="qb-doctrine-step">
            <div className="qb-doctrine-num">PASS 01</div>
            <h4 className="qb-doctrine-title">The Immediate 30-Second Sweep</h4>
            <p className="qb-doctrine-text">
              Answer all high-confidence vocabulary, Philippine Constitution, and quick grammar
              questions immediately. If an item requires complex calculation, flag it and move on.
              Never stay stuck on a single item.
            </p>
            <div className="qb-doctrine-foot">Target: 70–80 easy items secured in 40 minutes</div>
          </div>

          <div className="qb-doctrine-step">
            <div className="qb-doctrine-num">PASS 02</div>
            <h4 className="qb-doctrine-title">Handwritten Scratch Calculations</h4>
            <p className="qb-doctrine-text">
              Tackle algebra, work rates, ratio & proportion, and reading comprehension passages. Use
              the margins of your booklet for scratch math, rounding decimals to simplify division.
            </p>
            <div className="qb-doctrine-foot">Target: ~60–65s per calculation item</div>
          </div>

          <div className="qb-doctrine-step">
            <div className="qb-doctrine-num">PASS 03</div>
            <h4 className="qb-doctrine-title">Mistake Isolation & OMR Shading Check</h4>
            <p className="qb-doctrine-text">
              Verify your OMR bubble sheet alignment: ensure question 42 on your test matches item 42
              on your Scantron. Make educated guesses on remaining items—there is no negative marking
              penalty on the CSC exam.
            </p>
            <div className="qb-doctrine-foot">Final 15 minutes: Zero blank bubbles left</div>
          </div>
        </div>
      </section>

      {/* ── Frequently Asked Questions ── */}
      <section id="faq" className="qb-landing-section alt-bg">
        <div className="qb-landing-section-head">
          <div className="qb-landing-section-kicker">Clear Guidance</div>
          <h2 className="qb-landing-section-title">Frequently Asked Questions</h2>
          <p className="qb-landing-section-sub">
            Practical answers to common Civil Service examination and reviewer inquiries.
          </p>
        </div>

        <div className="qb-landing-faq-container">
          {faqs.map((faq, index) => {
            const isOpen = activeFaq === index;
            return (
              <div
                key={index}
                className={`qb-landing-faq-item${isOpen ? " is-open" : ""}`}
                onClick={() => toggleFaq(index)}
              >
                <button
                  type="button"
                  className="qb-landing-faq-q"
                  aria-expanded={isOpen}
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    size={18}
                    className={`qb-landing-faq-arrow${isOpen ? " rotated" : ""}`}
                  />
                </button>
                {isOpen && (
                  <div className="qb-landing-faq-a">
                    <p>{faq.a}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Bottom Call to Action ── */}
      <section
        className="qb-landing-banner"
      >
        <div className="qb-landing-banner-overlay" />
        <div className="qb-landing-banner-inner">
          <h2 className="qb-landing-banner-title">
            Begin your civil service exam preparation today.
          </h2>
          <p className="qb-landing-banner-sub">
            Free, offline-ready, and built to the authentic 80.00% benchmark.
          </p>
          <div className="qb-landing-banner-actions">
            <button
              type="button"
              className="qb-landing-cta-primary"
              onClick={onStartReview}
            >
              <span>Launch Question Bank Now</span>
              <ArrowRight size={15} />
            </button>

            {!isAuthenticated && (
              <button
                type="button"
                className="qb-landing-cta-secondary"
                onClick={onSignIn}
              >
                <LogIn size={15} />
                <span>Sign In to Cloud Sync</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ── Quiet Editorial Footer ── */}
      <footer className="qb-landing-footer">
        <div className="qb-landing-footer-inner">
          <div className="qb-landing-footer-col">
            <div className="qb-landing-brand">
              <img src={brandLogo} alt="QBANK logo" className="qb-landing-logo-img sm" />
              <span className="qb-landing-brand-title">CSE QBANK</span>
            </div>
            <p className="qb-landing-footer-desc">
              Independent study reviewer for Philippine Civil Service examinees. Developed to foster
              tactile calculation skills and time management discipline.
            </p>
          </div>

          <div className="qb-landing-footer-col">
            <h5 className="qb-landing-footer-heading">Review Modules</h5>
            <button type="button" className="qb-landing-footer-link" onClick={onStartReview}>
              Question Bank
            </button>
            <button
              type="button"
              className="qb-landing-footer-link"
              onClick={() => (onStartMock ? onStartMock("professional") : onStartReview())}
            >
              170-Item Professional Drill
            </button>
            <button
              type="button"
              className="qb-landing-footer-link"
              onClick={() => (onStartMock ? onStartMock("subprofessional") : onStartReview())}
            >
              165-Item Subprofessional Drill
            </button>
            <button
              type="button"
              className="qb-landing-footer-link"
              onClick={() => (onNavigateToTips ? onNavigateToTips() : onStartReview())}
            >
              Examinee Study Tips
            </button>
          </div>

          <div className="qb-landing-footer-col">
            <h5 className="qb-landing-footer-heading">Access & Account</h5>
            {!isAuthenticated ? (
              <button type="button" className="qb-landing-footer-link" onClick={onSignIn}>
                Sign In / Register
              </button>
            ) : (
              <button type="button" className="qb-landing-footer-link" onClick={onStartReview}>
                Logged in as {profile?.fullName || "Reviewer"}
              </button>
            )}
          </div>
        </div>

        <div className="qb-landing-footer-bottom">
          <p>
            © {new Date().getFullYear()} CSE QBANK. Independent study reviewer. Not affiliated with
            the Philippine Civil Service Commission (CSC).
          </p>
        </div>
      </footer>
      </div>
    </div>
  );
}
