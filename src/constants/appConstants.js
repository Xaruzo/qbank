export const TOPICS = [
  { id: "numerical",  label: "Numerical",  short: "NUM", color: "#f5a623" },
  { id: "verbal",     label: "Verbal",     short: "VRB", color: "#22d3ee" },
  { id: "general",    label: "Gen. Info",  short: "GEN", color: "#a78bfa" },
  { id: "analytical", label: "Analytical", short: "ANA", color: "#34d399" },
  { id: "clerical",   label: "Clerical",   short: "CLE", color: "#f43f5e" },
];

export const SORT_OPTIONS = [
  { value: "favorites", label: "Favorites First" },
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "label-a-z", label: "Problem Label A-Z" },
  { value: "label-z-a", label: "Problem Label Z-A" },
  { value: "a-z", label: "Question A-Z" },
  { value: "z-a", label: "Question Z-A" },
];

export const LETTERS = ["A", "B", "C", "D", "E"];
export const PROBLEM_LABELS = [
  "Age Problem",
  "Percentage",
  "Ratio",
  "Decimal",
  "Reading Comprehension",
  "Vocabulary",
  "Logical Reasoning",
  "Alphabetical Filing",
  "Spelling",
  "Clerical Procedures",
];

export const QUESTION_ADMIN_UIDS = [
  "c2125743-6423-4be5-8edd-891ca6c313e7",
  "5bd1e1a1-4d54-409f-aa7b-a171133ccf8c",
];

export const KEY = "cse-qbank-v1";
export const FAVORITES_KEY = "cse-qbank-favorites-v1";
export const TIPS_KEY = "cse-qbank-tips-v1";
export const THEME_KEY = "cse-theme";
export const MOCK_EXAM_HISTORY_KEY = "cse-mock-exam-history-v1";

// Official Civil Service Commission (CSC) Examination Presets
export const EXAM_PRESETS = {
  professional: {
    id: "professional",
    name: "Professional Level",
    shortName: "Professional",
    totalItems: 170,
    durationMs: (3 * 60 + 10) * 60 * 1000, // 3h 10m = 190 min
    durationLabel: "3h 10m",
    targetTopics: ["numerical", "verbal", "general", "analytical"],
    excludedTopics: ["clerical"],
    badge: "170 Items • 3h 10m",
    targetAudience: "For 2nd Level (Professional/Technical) positions in government",
    description: "Full-length CSE Professional simulation. Includes Analytical Ability (syllogisms, assumptions, logical reasoning, and data interpretation).",
    subjects: [
      { id: "numerical", name: "Numerical Ability", desc: "Basic operations, word problems, number series" },
      { id: "verbal", name: "Verbal Ability", desc: "Grammar, vocabulary, paragraph organization, reading comprehension" },
      { id: "general", name: "General Information", desc: "Philippine Constitution, RA 6713, peace & human rights" },
      { id: "analytical", name: "Analytical Ability", desc: "Syllogisms, assumptions, logical reasoning, data interpretation" },
    ],
  },
  subprofessional: {
    id: "subprofessional",
    name: "Subprofessional Level",
    shortName: "Subprofessional",
    totalItems: 165,
    durationMs: (2 * 60 + 40) * 60 * 1000, // 2h 40m = 160 min
    durationLabel: "2h 40m",
    targetTopics: ["numerical", "verbal", "general", "clerical"],
    excludedTopics: ["analytical"],
    badge: "165 Items • 2h 40m",
    targetAudience: "For 1st Level (Clerical/Trades/Crafts/Custodial) positions in government",
    description: "Full-length CSE Subprofessional simulation. Replaces Analytical Ability with Clerical Operations (alphabetizing, filing rules, spelling, office procedures).",
    subjects: [
      { id: "numerical", name: "Numerical Ability", desc: "Basic operations, fractions, decimals, percentage, word problems" },
      { id: "verbal", name: "Verbal Ability", desc: "Grammar, vocabulary, paragraph organization, reading comprehension" },
      { id: "general", name: "General Information", desc: "Philippine Constitution, RA 6713, peace & human rights" },
      { id: "clerical", name: "Clerical Operations", desc: "Alphabetizing, filing rules, spelling, office communications" },
    ],
  },
};

export const SAMPLES = [
  { id:"s1", topic:"numerical",  label:"Rate Problem", question:"If 6 machines can produce 540 units in one hour, how many units can 8 machines produce in the same time?", choices:["680","700","720","740"], correct:2, solution:"540 ÷ 6 = 90 units per machine per hour\n90 × 8 = 720 units\n\nAnswer: C. 720", solutionDraw:null, dateAdded:new Date().toISOString(), favorite:false },
  { id:"s2", topic:"numerical",  label:"Percentage Problem", question:"What is 15% of 88?", choices:["12.5","13.2","14.0","11.8"], correct:1, solution:"10% of 88 = 8.8\n5% of 88 = 4.4\n8.8 + 4.4 = 13.2\n\nAnswer: B. 13.2", solutionDraw:null, dateAdded:new Date().toISOString(), favorite:false },
  { id:"s3", topic:"general",    label:"Government Term", question:"What do you call it when the President refuses to sign a proposed bill?", choices:["Amnesty","Impeachment","Veto","Adjournment"], correct:2, solution:"Veto is the constitutional power of the President to reject a bill passed by Congress.\n\nUnder the 1987 Philippine Constitution (Art. VI, Sec. 27), the President has 30 days to sign or veto. Failure to act makes it law by inaction.\n\nAnswer: C. Veto", solutionDraw:null, dateAdded:new Date().toISOString(), favorite:false },
  { id:"s4", topic:"analytical", label:"Number Series", question:"What is the next number in the series? 5, 11, 23, 47, 95, ___", choices:["191","190","192","193"], correct:0, solution:"Pattern: each term = (previous × 2) + 1\n\n5×2+1=11 ✓  11×2+1=23 ✓\n23×2+1=47 ✓  47×2+1=95 ✓\n95×2+1=191\n\nAnswer: A. 191", solutionDraw:null, dateAdded:new Date().toISOString(), favorite:false },
  { id:"s5", topic:"verbal",     label:"Vocabulary", question:"The word BENEVOLENT most nearly means:", choices:["Charitable","Hostile","Indifferent","Arrogant"], correct:0, solution:"Benevolent = well-meaning and kindly.\nFrom Latin: bene (well) + volens (wishing).\n\nSynonyms: charitable, generous, philanthropic\nAntonyms: malevolent, hostile, cruel\n\nAnswer: A. Charitable", solutionDraw:null, dateAdded:new Date().toISOString(), favorite:false },
  { id:"s6", topic:"clerical",   label:"Alphabetical Filing", question:"According to standard rules of alphabetical indexing for filing, which of the following names should be filed FIRST?\n1. De la Cruz, Juan\n2. Del Rosario, Ana\n3. De Los Santos, Maria\n4. Dela Torre, Pedro", choices:["De la Cruz, Juan","Del Rosario, Ana","De Los Santos, Maria","Dela Torre, Pedro"], correct:0, solution:"Standard Filing Rule for Surnames with Prefixes (De, Del, De la, San, St.):\nPrefixes are considered part of the surname and indexed as one word without spaces:\n\n1. DELACRUZ (De la Cruz, Juan)\n2. DELATORRE (Dela Torre, Pedro)\n3. DELOSSANTOS (De Los Santos, Maria)\n4. DELROSARIO (Del Rosario, Ana)\n\nComparing letter-by-letter, 'DELACRUZ' comes before 'DELATORRE'. Therefore, 'De la Cruz, Juan' is filed first.\n\nAnswer: A. De la Cruz, Juan", solutionDraw:null, dateAdded:new Date().toISOString(), favorite:false },
  { id:"s7", topic:"clerical",   label:"Spelling", question:"Which of the following words is correctly spelled?", choices:["Bureaucracy","Beurocracy","Burocracy","Bureaucrasy"], correct:0, solution:"The correct spelling is 'Bureaucracy' (b-u-r-e-a-u-c-r-a-c-y).\n\nDerived from French 'bureau' (desk/office) and Greek '-kratia' (rule/power).\n\nAnswer: A. Bureaucracy", solutionDraw:null, dateAdded:new Date().toISOString(), favorite:false },
];

