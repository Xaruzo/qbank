# Graph Report - .  (2026-07-10)

## Corpus Check
- Corpus is ~30,689 words - fits in a single context window. You may not need a graph.

## Summary
- 171 nodes · 340 edges · 11 communities (10 shown, 1 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Main App & Question UI
- Math Symbols & Constants
- Tips & Sync Logic
- Dependencies
- Vite & Package Config
- Mock Exam Analytics
- Mock Exam History
- Markdown & Math Rendering
- Math Text Parser
- Components & Tools

## God Nodes (most connected - your core abstractions)
1. `TOPICS` - 17 edges
2. `App()` - 10 edges
3. `readPendingMap()` - 8 edges
4. `writePendingMap()` - 7 edges
5. `calculateExamMetrics()` - 7 edges
6. `parseMathText()` - 7 edges
7. `readTipsCache()` - 6 edges
8. `migrateLegacyTipsToUser()` - 6 edges
9. `MarkdownText()` - 6 edges
10. `LETTERS` - 5 edges

## Surprising Connections (you probably didn't know these)
- `createRenderer()` --references--> `react`  [EXTRACTED]
  src/views/components/MarkdownText.jsx → package.json
- `renderMathChildren()` --references--> `react`  [EXTRACTED]
  src/views/components/MarkdownText.jsx → package.json
- `App()` --calls--> `buildReviewExamFromAttempt()`  [EXTRACTED]
  src/App.jsx → src/utils/mockExamAnalytics.js
- `MockExamRunner()` --references--> `TOPICS`  [EXTRACTED]
  src/views/components/MockExamRunner.jsx → src/constants/appConstants.js
- `QuestionForm()` --references--> `TOPICS`  [EXTRACTED]
  src/views/components/QuestionForm.jsx → src/constants/appConstants.js

## Import Cycles
- None detected.

## Communities (11 total, 1 thin omitted)

### Community 0 - "Main App & Question UI"
Cohesion: 0.12
Nodes (22): App(), isResumableMockExam(), shuffleIds(), QUESTION_ADMIN_UIDS, SAMPLES, SORT_OPTIONS, TOPICS, getProfileDetails() (+14 more)

### Community 1 - "Math Symbols & Constants"
Cohesion: 0.15
Nodes (15): LETTERS, PROBLEM_LABELS, ARITHMETIC_SYMBOLS, COMMON_FRACTIONS, CURRENCY_SYMBOLS, FRACTION_TEMPLATE, MATH_SYMBOLS, MORE_FRACTIONS (+7 more)

### Community 2 - "Tips & Sync Logic"
Cohesion: 0.23
Nodes (21): applyPendingToTipsMap(), deleteRemoteTip(), dequeuePendingOperation(), enqueuePendingOperation(), fetchRemoteTipsMap(), getPendingTipsKey(), getTipsCacheKey(), isMissingQuestionTipsTableError() (+13 more)

### Community 3 - "Dependencies"
Cohesion: 0.10
Nodes (21): fabric, katex, lucide-react, dependencies, fabric, katex, lucide-react, react-dom (+13 more)

### Community 4 - "Vite & Package Config"
Cohesion: 0.11
Nodes (17): devDependencies, @types/react, @types/react-dom, vite, @vitejs/plugin-react, name, private, scripts (+9 more)

### Community 5 - "Mock Exam Analytics"
Cohesion: 0.27
Nodes (12): buildQuestionLookup(), buildReviewExamFromAttempt(), calculateExamMetrics(), createTopicBucket(), formatAttemptDate(), formatExamDuration(), toPercent(), topicMetaMap (+4 more)

### Community 6 - "Mock Exam History"
Cohesion: 0.23
Nodes (6): fetchRemoteMockExamHistory(), mergeMockExamAttempt(), mergeMockExamHistory(), normalizeMockExamAttempt(), parseTime(), sortMockExamHistory()

### Community 7 - "Markdown & Math Rendering"
Cohesion: 0.29
Nodes (9): react, react, blockComponents, createRenderer(), inlineComponents, MarkdownText(), mergeClassNames(), normalizeSingleLineDisplayMath() (+1 more)

### Community 8 - "Math Text Parser"
Cohesion: 0.39
Nodes (7): decodeMixed(), decodeSub(), decodeSuper(), FRACTION_RE, parseMathText(), SUB_MAP, SUPER_MAP

## Knowledge Gaps
- **29 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+24 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `Dependencies` to `Vite & Package Config`, `Markdown & Math Rendering`?**
  _High betweenness centrality (0.379) - this node is a cross-community bridge._
- **Why does `react` connect `Markdown & Math Rendering` to `Dependencies`?**
  _High betweenness centrality (0.356) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _29 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Main App & Question UI` be split into smaller, more focused modules?**
  _Cohesion score 0.12012012012012012 - nodes in this community are weakly interconnected._
- **Should `Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._
- **Should `Vite & Package Config` be split into smaller, more focused modules?**
  _Cohesion score 0.1111111111111111 - nodes in this community are weakly interconnected._