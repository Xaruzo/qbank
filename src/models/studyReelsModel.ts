import { supabase, isNetworkOrFetchError } from "../utils/supabaseClient";
import { deleteStoredReelMedia, isIndexedDbReelUrl } from "../utils/reelStorage";
import type { TopicId } from "../types";

export type ReelKind = "short" | "live";
export type ReelSourceType = "lesson" | "youtube" | "video";
export type LiveStatus = "live" | "upcoming" | "replay";

export interface ReelLessonStep {
  heading: string;
  board: string;
  highlight?: string;
  durationSec: number;
}

export interface ReelQuizCheck {
  prompt: string;
  choices: string[];
  correct: number;
  explanation: string;
  linkedQuestionId?: string;
}

export interface StudyReel {
  id: string;
  kind: ReelKind;
  sourceType: ReelSourceType;
  title: string;
  description: string;
  topic: TopicId;
  label: string;
  creatorName: string;
  creatorRole: string;
  userId: string;
  userEmail?: string;
  mediaUrl?: string;
  durationSec: number;
  liveStatus?: LiveStatus;
  scheduledAt?: string | null;
  lessonSteps: ReelLessonStep[];
  quizCheck?: ReelQuizCheck | null;
  likesCount: number;
  bookmarksCount: number;
  commentsCount: number;
  createdAt: string;
  isStarter?: boolean;
}

export interface ReelComment {
  id: string;
  reelId: string;
  userId: string;
  authorName: string;
  authorRole: string;
  text: string;
  isQuestion?: boolean;
  createdAt: string;
}

const CUSTOM_REELS_KEY = "cse-study-reels-custom-v1";
const REEL_LIKES_KEY = "cse-study-reels-likes-v1";
const REEL_BOOKMARKS_KEY = "cse-study-reels-bookmarks-v1";
const REEL_REMINDERS_KEY = "cse-study-reels-reminders-v1";
const REEL_COMMENTS_KEY = "cse-study-reels-comments-v1";

export const STARTER_STUDY_REELS: StudyReel[] = [
  {
    id: "reel-analogy-country-continent",
    kind: "short",
    sourceType: "lesson",
    title: "Word Analogy in 15s: Country : Continent",
    description: "Spot the exact relationship bridge first so regional traps like Cebu : Visayas never fool you.",
    topic: "analytical",
    label: "Word Analogy",
    creatorName: "Coach Marco",
    creatorRole: "CSE Analytical Mentor",
    userId: "system",
    durationSec: 28,
    lessonSteps: [
      {
        heading: "1. Read the Pair Bridge",
        board: "**Zimbabwe : Africa :: _____ : _____**\n\nBuild a strict sentence linking the left pair:\n\n> \"Zimbabwe is a **country** located in the **continent** of Africa.\"",
        highlight: "Relationship: Country → Continent",
        durationSec: 7,
      },
      {
        heading: "2. Test Every Option Against the Exact Bridge",
        board: "- **A. Philippines : Asia** — Country → Continent ✓\n- **B. Cebu : Visayas** — Province/Island → Region ✗\n- **C. Manila : Philippines** — Capital → Country ✗\n- **D. USA : Europe** — Wrong continent ✗",
        highlight: "Reject wrong scale (city/province) & wrong facts",
        durationSec: 8,
      },
      {
        heading: "3. Lock Order & Category",
        board: "Always preserve **left-to-right direction**:\n\n`Smaller sovereign state : Parent continent`\n\nEven if two choices sound geographically related, only **one** preserves the exact hierarchy.",
        highlight: "Answer: A. Philippines : Asia",
        durationSec: 7,
      },
      {
        heading: "4. Try the Quick Check",
        board: "Test your speed right now in the **Quick Check** card before swiping to the next clip!",
        highlight: "Active recall beats passive watching",
        durationSec: 6,
      },
    ],
    quizCheck: {
      prompt: "Manila : Philippines :: Tokyo : _____",
      choices: ["Asia", "Japan", "Kyoto", "Honshu"],
      correct: 1,
      explanation: "Manila is the capital city of the country Philippines; Tokyo is the capital city of the country Japan.",
    },
    likesCount: 42,
    bookmarksCount: 19,
    commentsCount: 2,
    createdAt: "2026-11-20T09:00:00.000Z",
    isStarter: true,
  },
  {
    id: "reel-live-speed-drill",
    kind: "live",
    sourceType: "lesson",
    title: "Live CSE Coaching Board: Fast Ratios & Logic Elimination",
    description: "Interactive live review room — work through timed CSE shortcuts and post your questions in the Live Q&A.",
    topic: "numerical",
    label: "Live Coaching",
    creatorName: "Prof. Elena Reyes",
    creatorRole: "Live Review Host",
    userId: "system",
    liveStatus: "live",
    durationSec: 36,
    lessonSteps: [
      {
        heading: "Live Segment 1 · Back-Solving From Choice C",
        board: "When an Age or Ratio problem looks algebra-heavy, **plug in Choice C** first.\n\nIf the result is too high, move smaller; if too low, move larger — cutting 4 tests down to 1–2.",
        highlight: "CSE Time Target: < 45 sec per Numerical item",
        durationSec: 12,
      },
      {
        heading: "Live Segment 2 · Work Problem Shortcut",
        board: "Two workers finish alone in $a$ and $b$ hours:\n\n$$T = \\frac{a \\times b}{a + b}$$\n\nExample ($6$ hrs and $3$ hrs): $\\frac{6 \\times 3}{6 + 3} = \\frac{18}{9} = 2\\text{ hours}$.",
        highlight: "Product over Sum saves 30+ seconds",
        durationSec: 12,
      },
      {
        heading: "Live Q&A Open",
        board: "Have a tricky percentage, work, or syllogism problem?\n\nDrop it in **Live Q&A & Notes** (toggle *Ask Host*) or link your own YouTube Live stream from **Post Clip / Go Live**.",
        highlight: "Use Quick Check to verify your speed",
        durationSec: 12,
      },
    ],
    quizCheck: {
      prompt: "Pipe A fills a tank in 4 hours and Pipe B fills it in 12 hours. Together, how long will they take?",
      choices: ["2 hours", "3 hours", "4 hours", "8 hours"],
      correct: 1,
      explanation: "Using Product ÷ Sum: (4 × 12) ÷ (4 + 12) = 48 ÷ 16 = 3 hours.",
      linkedQuestionId: "s1",
    },
    likesCount: 64,
    bookmarksCount: 31,
    commentsCount: 2,
    createdAt: "2026-11-22T10:00:00.000Z",
    isStarter: true,
  },
  {
    id: "reel-numerical-percent-split",
    kind: "short",
    sourceType: "lesson",
    title: "15% of Any Number in 5 Seconds (No Calculator!)",
    description: "Split awkward percentages into 10% + half of 10% — the fastest mental math trick for CSE Numerical.",
    topic: "numerical",
    label: "Percentage",
    creatorName: "Coach Marco",
    creatorRole: "CSE Quantitative Coach",
    userId: "system",
    durationSec: 24,
    lessonSteps: [
      {
        heading: "1. Avoid Long Multiplication",
        board: "Question: **What is 15% of 88?**\n\nDo NOT multiply $0.15 \\times 88$ on scratch paper first.",
        highlight: "Use the 10% + 5% Split",
        durationSec: 6,
      },
      {
        heading: "2. Shift Decimal Once for 10%",
        board: "$10\\%$ of $88 = 8.8$\n\nNow take **half** of $10\\%$ to get $5\\%$:\n\n$5\\%$ of $88 = 8.8 \\div 2 = 4.4$",
        highlight: "10% = 8.8  |  5% = 4.4",
        durationSec: 9,
      },
      {
        heading: "3. Add Them Together",
        board: "$$8.8 + 4.4 = 13.2$$\n\nWorks for **15%, 25%, 35%, and 5%** discounts on the CSE!",
        highlight: "Answer: 13.2",
        durationSec: 9,
      },
    ],
    quizCheck: {
      prompt: "Using the 10% + 5% split, what is 15% of 64?",
      choices: ["8.6", "9.2", "9.6", "10.4"],
      correct: 2,
      explanation: "10% of 64 = 6.4; 5% of 64 = 3.2; 6.4 + 3.2 = 9.6.",
      linkedQuestionId: "s2",
    },
    likesCount: 51,
    bookmarksCount: 27,
    commentsCount: 1,
    createdAt: "2026-11-19T14:30:00.000Z",
    isStarter: true,
  },
  {
    id: "reel-clerical-alphabetical-prefixes",
    kind: "short",
    sourceType: "lesson",
    title: "Subpro Trap: Filing 'De la Cruz' vs 'Dela Torre'",
    description: "One rule clears up every surname-prefix filing question in Clerical Operations.",
    topic: "clerical",
    label: "Alphabetical Filing",
    creatorName: "Atty. Bea Santos",
    creatorRole: "CSC Clerical Specialist",
    userId: "system",
    durationSec: 24,
    lessonSteps: [
      {
        heading: "1. Treat Surname Prefixes as One Word",
        board: "Prefixes like **De, Del, De la, De los, San, St., Mac** stay attached to the surname — **ignore spaces and apostrophes**.",
        highlight: "Rule: Compress the prefix into the surname",
        durationSec: 8,
      },
      {
        heading: "2. Compress & Compare Letter-by-Letter",
        board: "- `De la Cruz` → **DELACRUZ**\n- `Dela Torre` → **DELATORRE**\n- `De Los Santos` → **DELOSSANTOS**\n- `Del Rosario` → **DELROSARIO**",
        highlight: "D-E-L-A-C comes before D-E-L-A-T",
        durationSec: 8,
      },
      {
        heading: "3. Final Filing Order",
        board: "1. **De la Cruz, Juan** (DELACRUZ)\n2. Dela Torre, Pedro (DELATORRE)\n3. De Los Santos, Maria (DELOSSANTOS)\n4. Del Rosario, Ana (DELROSARIO)",
        highlight: "Never file under 'C' or 'T'!",
        durationSec: 8,
      },
    ],
    quizCheck: {
      prompt: "Which surname should be filed FIRST alphabetically?",
      choices: ["Del Mundo, Leo", "De Leon, Ana", "De los Reyes, Mia", "Dela Cruz, Mark"],
      correct: 3,
      explanation: "Compressed forms: DELACRUZ, DELEON, DELMUNDO, DELOSREYES -> DELACRUZ ('DE-LA-C') comes before 'DE-LE', 'DEL-M', and 'DEL-O'.",
      linkedQuestionId: "s6",
    },
    likesCount: 38,
    bookmarksCount: 22,
    commentsCount: 0,
    createdAt: "2026-11-18T11:00:00.000Z",
    isStarter: true,
  },
  {
    id: "reel-verbal-number-of",
    kind: "short",
    sourceType: "lesson",
    title: "'A number of' vs 'The number of' in 20 Seconds",
    description: "Stop second-guessing this guaranteed Civil Service English grammar item.",
    topic: "verbal",
    label: "Grammar",
    creatorName: "Teacher Lian",
    creatorRole: "Verbal Reviewer",
    userId: "system",
    durationSec: 21,
    lessonSteps: [
      {
        heading: "1. Spot the Article: 'A' vs 'The'",
        board: "- **A** number of + plural noun → **PLURAL verb**\n- **The** number of + plural noun → **SINGULAR verb**",
        highlight: "Think: 'A number of' = 'Many' (Plural)",
        durationSec: 7,
      },
      {
        heading: "2. Compare Real CSE Sentences",
        board: "✓ *A number of examinees **have** arrived early.*\n\n✓ *The number of examinees **has** doubled this year.*",
        highlight: "'The number' refers to ONE count/figure",
        durationSec: 7,
      },
      {
        heading: "3. Watch Intervening Phrases",
        board: "Do not let the plural noun right before the verb trick you—check **A** vs **The** at the start of the phrase.",
        highlight: "Always check the head noun",
        durationSec: 7,
      },
    ],
    quizCheck: {
      prompt: "The number of applicants for the Civil Service Exam _____ increased.",
      choices: ["have", "has", "were", "are"],
      correct: 1,
      explanation: "'The number of' takes a singular verb ('has') because it refers to a single numerical figure.",
    },
    likesCount: 47,
    bookmarksCount: 24,
    commentsCount: 0,
    createdAt: "2026-11-17T16:15:00.000Z",
    isStarter: true,
  },
  {
    id: "reel-general-veto-rule",
    kind: "short",
    sourceType: "lesson",
    title: "1987 Constitution: How a Bill Becomes Law (30-Day Rule)",
    description: "Master Presidential Veto, pocket-veto myth, and Congress's 2/3 override.",
    topic: "general",
    label: "1987 Constitution",
    creatorName: "Atty. Bea Santos",
    creatorRole: "Constitutional Law Reviewer",
    userId: "system",
    durationSec: 24,
    lessonSteps: [
      {
        heading: "1. Presidential Action Window",
        board: "Under **Art. VI, Sec. 27**, once Congress transmits a bill, the President has **30 days** from receipt to act.",
        highlight: "No 'Pocket Veto' in the Philippines!",
        durationSec: 8,
      },
      {
        heading: "2. Three Possible Outcomes",
        board: "1. **Signs it** → Becomes law.\n2. **Vetoes & returns** with objections.\n3. **No action for 30 days** → **Becomes law automatically** as if signed.",
        highlight: "Inaction = Law after 30 days",
        durationSec: 8,
      },
      {
        heading: "3. Overriding a Veto",
        board: "Congress can override a Presidential Veto by a **2/3 vote of all members** of each House, voting separately.",
        highlight: "Override Threshold: 2/3 each House",
        durationSec: 8,
      },
    ],
    quizCheck: {
      prompt: "If the President fails to sign or veto a bill within 30 days after receipt, what happens under the 1987 Constitution?",
      choices: [
        "It is automatically pocket-vetoed",
        "It becomes law as if signed",
        "It returns to the Senate committee",
        "It expires at the end of Congress",
      ],
      correct: 1,
      explanation: "Under Art. VI, Sec. 27(1), if the President does not communicate a veto within 30 days after receipt, the bill becomes law as if signed.",
      linkedQuestionId: "s3",
    },
    likesCount: 39,
    bookmarksCount: 17,
    commentsCount: 0,
    createdAt: "2026-11-16T08:45:00.000Z",
    isStarter: true,
  },
  {
    id: "reel-live-upcoming-coaching",
    kind: "live",
    sourceType: "lesson",
    title: "Scheduled Live: Analytical Syllogisms & General Info Marathon",
    description: "Tap Remind Me to pin this upcoming live coaching session and queue your questions ahead of time.",
    topic: "analytical",
    label: "Scheduled Live",
    creatorName: "Coach Marco & Atty. Bea",
    creatorRole: "CSE Review Panel",
    userId: "system",
    liveStatus: "upcoming",
    scheduledAt: new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString(),
    durationSec: 24,
    lessonSteps: [
      {
        heading: "Upcoming Agenda · Part 1 (Analytical)",
        board: "- Venn Diagram shortcuts for **All / Some / No** syllogisms\n- Distinguishing **Assumptions** vs **Conclusions**\n- Double-blank Word Analogies",
        highlight: "Tap 'Remind Me' to bookmark this session",
        durationSec: 12,
      },
      {
        heading: "Upcoming Agenda · Part 2 (General Info)",
        board: "- RA 6713 8 Norms of Conduct\n- 1987 Constitution Bill of Rights & Three Branches\n- Live Q&A open now — post questions early!",
        highlight: "Submit questions in Live Q&A before kickoff",
        durationSec: 12,
      },
    ],
    quizCheck: {
      prompt: "Statements: All public servants are accountable. Some analysts are public servants. Which conclusion follows?",
      choices: [
        "All analysts are accountable",
        "Some analysts are accountable",
        "No analysts are accountable",
        "All accountable people are analysts",
      ],
      correct: 1,
      explanation: "Because some analysts fall inside the 'public servants' circle and all public servants are inside 'accountable', some analysts must be accountable.",
    },
    likesCount: 28,
    bookmarksCount: 15,
    commentsCount: 1,
    createdAt: "2026-11-22T07:00:00.000Z",
    isStarter: true,
  },
];

const STARTER_COMMENTS: ReelComment[] = [
  {
    id: "rc-1",
    reelId: "reel-analogy-country-continent",
    userId: "system",
    authorName: "Jessa M.",
    authorRole: "Reviewer",
    text: "Almost picked Cebu : Visayas before checking the country-to-continent scale. Building the full sentence makes it obvious!",
    createdAt: "2026-11-20T11:20:00.000Z",
  },
  {
    id: "rc-2",
    reelId: "reel-analogy-country-continent",
    userId: "system",
    authorName: "Coach Marco",
    authorRole: "CSE Analytical Mentor",
    text: "Exactly! Always say 'X is a country in the continent Y' out loud in your head when checking choices.",
    createdAt: "2026-11-20T11:45:00.000Z",
  },
  {
    id: "rc-3",
    reelId: "reel-live-speed-drill",
    userId: "system",
    authorName: "Kenji R.",
    authorRole: "Reviewer",
    text: "Does Product over Sum work if one pipe is draining instead of filling?",
    isQuestion: true,
    createdAt: "2026-11-22T10:12:00.000Z",
  },
  {
    id: "rc-4",
    reelId: "reel-live-speed-drill",
    userId: "system",
    authorName: "Prof. Elena Reyes",
    authorRole: "Live Review Host",
    text: "Great question Kenji! If Pipe B drains in b hours, switch the denominator + to −: (a × b) ÷ (b − a)!",
    createdAt: "2026-11-22T10:14:00.000Z",
  },
  {
    id: "rc-5",
    reelId: "reel-numerical-percent-split",
    userId: "system",
    authorName: "Paolo D.",
    authorRole: "Reviewer",
    text: "Used this for 35% too: (10% × 3) + half of 10%. Way faster than multiplying decimals.",
    createdAt: "2026-11-19T17:10:00.000Z",
  },
  {
    id: "rc-6",
    reelId: "reel-live-upcoming-coaching",
    userId: "system",
    authorName: "Mara T.",
    authorRole: "Reviewer",
    text: "Can we also cover Assumption vs Inference questions during the live stream?",
    isQuestion: true,
    createdAt: "2026-11-22T09:30:00.000Z",
  },
];

function readJsonArray<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeJsonArray<T>(key: string, items: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(items));
  } catch {
    // Ignore storage quota issues
  }
}

function normalizeReel(raw: Partial<StudyReel>): StudyReel {
  const now = new Date().toISOString();
  const steps = Array.isArray(raw.lessonSteps) ? raw.lessonSteps : [];
  const totalStepSec = steps.reduce((sum, s) => sum + (Number(s.durationSec) || 6), 0);
  return {
    id: raw.id || `reel_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    kind: raw.kind === "live" ? "live" : "short",
    sourceType:
      raw.sourceType === "youtube" || raw.sourceType === "video" ? raw.sourceType : "lesson",
    title: String(raw.title || "Untitled Review Reel").trim(),
    description: String(raw.description || "").trim(),
    topic: (raw.topic as TopicId) || "numerical",
    label: String(raw.label || "").trim() || "Quick Review",
    creatorName: String(raw.creatorName || "Reviewer").trim(),
    creatorRole: String(raw.creatorRole || "Reviewer").trim(),
    userId: String(raw.userId || "local_user"),
    userEmail: raw.userEmail || undefined,
    mediaUrl: raw.mediaUrl || undefined,
    durationSec: Math.max(5, Number(raw.durationSec) || totalStepSec || 30),
    liveStatus: raw.kind === "live" ? raw.liveStatus || "live" : undefined,
    scheduledAt: raw.scheduledAt || null,
    lessonSteps: steps,
    quizCheck: raw.quizCheck || null,
    likesCount: Math.max(0, Number(raw.likesCount) || 0),
    bookmarksCount: Math.max(0, Number(raw.bookmarksCount) || 0),
    commentsCount: Math.max(0, Number(raw.commentsCount) || 0),
    createdAt: raw.createdAt || now,
    isStarter: Boolean(raw.isStarter),
  };
}

function fromSupabaseRow(row: any): StudyReel {
  return normalizeReel({
    id: row.id,
    kind: row.kind,
    sourceType: row.source_type ?? row.sourceType,
    title: row.title,
    description: row.description,
    topic: row.topic,
    label: row.label,
    creatorName: row.creator_name ?? row.creatorName,
    creatorRole: row.creator_role ?? row.creatorRole,
    userId: row.user_id ?? row.userId,
    userEmail: row.user_email ?? row.userEmail,
    mediaUrl: row.media_url ?? row.mediaUrl,
    durationSec: row.duration_sec ?? row.durationSec,
    liveStatus: row.live_status ?? row.liveStatus,
    scheduledAt: row.scheduled_at ?? row.scheduledAt,
    lessonSteps: row.lesson_steps ?? row.lessonSteps,
    quizCheck: row.quiz_check ?? row.quizCheck,
    likesCount: row.likes_count ?? row.likesCount,
    bookmarksCount: row.bookmarks_count ?? row.bookmarksCount,
    commentsCount: row.comments_count ?? row.commentsCount,
    createdAt: row.created_at ?? row.createdAt,
  });
}

function mergeReels(custom: StudyReel[], remote: StudyReel[]): StudyReel[] {
  const map = new Map<string, StudyReel>();
  for (const item of [...remote, ...custom, ...STARTER_STUDY_REELS]) {
    if (!map.has(item.id)) {
      map.set(item.id, item);
    }
  }
  // Keep Live Now sessions prioritized near the top, then newest custom, then starters
  return Array.from(map.values()).sort((a, b) => {
    const aLive = a.kind === "live" && a.liveStatus === "live" ? 1 : 0;
    const bLive = b.kind === "live" && b.liveStatus === "live" ? 1 : 0;
    if (aLive !== bLive) return bLive - aLive;
    const aCustom = a.isStarter ? 0 : 1;
    const bCustom = b.isStarter ? 0 : 1;
    if (aCustom !== bCustom) return bCustom - aCustom;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export const studyReelsModel = {
  async getReels(): Promise<StudyReel[]> {
    const rawLocal = readJsonArray<StudyReel>(CUSTOM_REELS_KEY).map(normalizeReel);
    // Discard any stale browser-session blob: URLs that cannot survive page reload
    const localCustom = rawLocal.filter((r) => !r.mediaUrl?.startsWith("blob:"));
    if (localCustom.length !== rawLocal.length) {
      writeJsonArray(CUSTOM_REELS_KEY, localCustom);
    }
    let remoteReels: StudyReel[] = [];

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("study_reels")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(60);

        if (!error && Array.isArray(data)) {
          remoteReels = data.map(fromSupabaseRow);
        }
      } catch (err) {
        if (!isNetworkOrFetchError(err)) {
          console.warn("Study reels remote fetch skipped:", err);
        }
      }
    }

    return mergeReels(localCustom, remoteReels);
  },

  async createReel(
    input: Partial<StudyReel>,
    user: { id?: string; email?: string; fullName?: string; roleLabel?: string }
  ): Promise<StudyReel> {
    const record = normalizeReel({
      ...input,
      userId: user.id || "local_user",
      userEmail: user.email || undefined,
      creatorName: input.creatorName || user.fullName || "Reviewer",
      creatorRole: input.creatorRole || user.roleLabel || "Reviewer",
      isStarter: false,
      createdAt: new Date().toISOString(),
    });

    // Never persist ephemeral browser blob: URLs; idb-reel:// and https:// URLs persist locally
    const isSessionBlob = Boolean(record.mediaUrl?.startsWith("blob:"));
    const isLocalIndexedDb = isIndexedDbReelUrl(record.mediaUrl);
    if (!isSessionBlob) {
      const localCustom = readJsonArray<StudyReel>(CUSTOM_REELS_KEY).filter((r) => r.id !== record.id);
      writeJsonArray(CUSTOM_REELS_KEY, [record, ...localCustom]);
    }

    if (supabase && user.id && user.id !== "local_user" && !isSessionBlob && !isLocalIndexedDb) {
      try {
        await supabase.from("study_reels").upsert(
          {
            id: record.id,
            kind: record.kind,
            source_type: record.sourceType,
            title: record.title,
            description: record.description,
            topic: record.topic,
            label: record.label,
            creator_name: record.creatorName,
            creator_role: record.creatorRole,
            user_id: record.userId,
            user_email: record.userEmail || null,
            media_url: record.mediaUrl || null,
            duration_sec: record.durationSec,
            live_status: record.liveStatus || null,
            scheduled_at: record.scheduledAt || null,
            lesson_steps: record.lessonSteps,
            quiz_check: record.quizCheck || null,
            likes_count: record.likesCount,
            bookmarks_count: record.bookmarksCount,
            comments_count: record.commentsCount,
            created_at: record.createdAt,
          },
          { onConflict: "id" }
        );
      } catch {
        // Fallback to localStorage seamlessly if table is not created yet
      }
    }

    return record;
  },

  async deleteReel(id: string): Promise<void> {
    const existing = readJsonArray<StudyReel>(CUSTOM_REELS_KEY);
    const target = existing.find((r) => r.id === id);
    const remaining = existing.filter((r) => r.id !== id);
    writeJsonArray(CUSTOM_REELS_KEY, remaining);

    if (target?.mediaUrl) {
      await deleteStoredReelMedia(target.mediaUrl);
    }

    if (supabase) {
      try {
        await supabase.from("study_reels").delete().eq("id", id);
      } catch {
        // Ignore if table not provisioned
      }
    }
  },

  async updateLiveStatus(id: string, liveStatus: LiveStatus): Promise<void> {
    const custom = readJsonArray<StudyReel>(CUSTOM_REELS_KEY).map((r) =>
      r.id === id ? { ...r, liveStatus } : r
    );
    writeJsonArray(CUSTOM_REELS_KEY, custom);

    if (supabase) {
      try {
        await supabase.from("study_reels").update({ live_status: liveStatus }).eq("id", id);
      } catch {
        // Ignore if table not provisioned
      }
    }
  },

  getLikedIds(): Set<string> {
    return new Set(readJsonArray<string>(REEL_LIKES_KEY));
  },

  toggleLike(reelId: string): { liked: boolean; likedIds: Set<string> } {
    const ids = new Set(readJsonArray<string>(REEL_LIKES_KEY));
    const liked = !ids.has(reelId);
    if (liked) ids.add(reelId);
    else ids.delete(reelId);
    writeJsonArray(REEL_LIKES_KEY, Array.from(ids));
    return { liked, likedIds: ids };
  },

  getBookmarkedIds(): Set<string> {
    return new Set(readJsonArray<string>(REEL_BOOKMARKS_KEY));
  },

  toggleBookmark(reelId: string): { bookmarked: boolean; bookmarkedIds: Set<string> } {
    const ids = new Set(readJsonArray<string>(REEL_BOOKMARKS_KEY));
    const bookmarked = !ids.has(reelId);
    if (bookmarked) ids.add(reelId);
    else ids.delete(reelId);
    writeJsonArray(REEL_BOOKMARKS_KEY, Array.from(ids));
    return { bookmarked, bookmarkedIds: ids };
  },

  getReminderIds(): Set<string> {
    return new Set(readJsonArray<string>(REEL_REMINDERS_KEY));
  },

  toggleReminder(reelId: string): { reminded: boolean; reminderIds: Set<string> } {
    const ids = new Set(readJsonArray<string>(REEL_REMINDERS_KEY));
    const reminded = !ids.has(reelId);
    if (reminded) ids.add(reelId);
    else ids.delete(reelId);
    writeJsonArray(REEL_REMINDERS_KEY, Array.from(ids));
    return { reminded, reminderIds: ids };
  },

  getCommentsForReels(): Record<string, ReelComment[]> {
    const stored = readJsonArray<ReelComment>(REEL_COMMENTS_KEY);
    const map: Record<string, ReelComment[]> = {};
    const seen = new Set<string>();
    for (const c of [...STARTER_COMMENTS, ...stored]) {
      if (seen.has(c.id)) continue;
      seen.add(c.id);
      if (!map[c.reelId]) map[c.reelId] = [];
      map[c.reelId].push(c);
    }
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }
    return map;
  },

  addComment(input: Omit<ReelComment, "id" | "createdAt">): ReelComment {
    const record: ReelComment = {
      ...input,
      id: `rc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    const stored = readJsonArray<ReelComment>(REEL_COMMENTS_KEY);
    writeJsonArray(REEL_COMMENTS_KEY, [...stored, record]);
    return record;
  },

  deleteComment(commentId: string): void {
    const stored = readJsonArray<ReelComment>(REEL_COMMENTS_KEY).filter((c) => c.id !== commentId);
    writeJsonArray(REEL_COMMENTS_KEY, stored);
  },
};
