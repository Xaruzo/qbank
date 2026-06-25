export const TOPICS = [
  { id: "numerical",  label: "Numerical",  short: "NUM", color: "#f5a623" },
  { id: "verbal",     label: "Verbal",     short: "VRB", color: "#22d3ee" },
  { id: "general",    label: "Gen. Info",  short: "GEN", color: "#a78bfa" },
  { id: "analytical", label: "Analytical", short: "ANA", color: "#34d399" },
  { id: "filipino",   label: "Filipino",   short: "FIL", color: "#fb7185" },
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

export const LETTERS = ["A", "B", "C", "D"];
export const KEY = "cse-qbank-v1";
export const FAVORITES_KEY = "cse-qbank-favorites-v1";
export const THEME_KEY = "cse-theme";
export const MOCK_EXAM_HISTORY_KEY = "cse-mock-exam-history-v1";

export const SAMPLES = [
  { id:"s1", topic:"numerical",  label:"Rate Problem", question:"If 6 machines can produce 540 units in one hour, how many units can 8 machines produce in the same time?", choices:["680","700","720","740"], correct:2, solution:"540 ÷ 6 = 90 units per machine per hour\n90 × 8 = 720 units\n\nAnswer: C. 720", solutionDraw:null, dateAdded:new Date().toISOString(), favorite:false },
  { id:"s2", topic:"numerical",  label:"Percentage Problem", question:"What is 15% of 88?", choices:["12.5","13.2","14.0","11.8"], correct:1, solution:"10% of 88 = 8.8\n5% of 88 = 4.4\n8.8 + 4.4 = 13.2\n\nAnswer: B. 13.2", solutionDraw:null, dateAdded:new Date().toISOString(), favorite:false },
  { id:"s3", topic:"general",    label:"Government Term", question:"What do you call it when the President refuses to sign a proposed bill?", choices:["Amnesty","Impeachment","Veto","Adjournment"], correct:2, solution:"Veto is the constitutional power of the President to reject a bill passed by Congress.\n\nUnder the 1987 Philippine Constitution (Art. VI, Sec. 27), the President has 30 days to sign or veto. Failure to act makes it law by inaction.\n\nAnswer: C. Veto", solutionDraw:null, dateAdded:new Date().toISOString(), favorite:false },
  { id:"s4", topic:"analytical", label:"Number Series", question:"What is the next number in the series? 5, 11, 23, 47, 95, ___", choices:["191","190","192","193"], correct:0, solution:"Pattern: each term = (previous × 2) + 1\n\n5×2+1=11 ✓  11×2+1=23 ✓\n23×2+1=47 ✓  47×2+1=95 ✓\n95×2+1=191\n\nAnswer: A. 191", solutionDraw:null, dateAdded:new Date().toISOString(), favorite:false },
  { id:"s5", topic:"verbal",     label:"Vocabulary", question:"The word BENEVOLENT most nearly means:", choices:["Charitable","Hostile","Indifferent","Arrogant"], correct:0, solution:"Benevolent = well-meaning and kindly.\nFrom Latin: bene (well) + volens (wishing).\n\nSynonyms: charitable, generous, philanthropic\nAntonyms: malevolent, hostile, cruel\n\nAnswer: A. Charitable", solutionDraw:null, dateAdded:new Date().toISOString(), favorite:false },
];
