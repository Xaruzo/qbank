/**
 * notesModel.ts
 * Strongly typed persistence and operations for reviewer study notes and scratchpad.
 * Works seamlessly offline via localStorage and window.storage, scoped to userId when signed in.
 */
import { storageModel } from "./storageModel";
import { NOTES_KEY } from "../constants/appConstants";
import type { StudyNote, TopicId } from "../types";

const getNotesKey = (userId: string | null): string => (userId ? `${NOTES_KEY}:${userId}` : NOTES_KEY);

export const DEFAULT_STUDY_NOTES: StudyNote[] = [
  {
    id: "note-csc-matrix",
    title: "CSC Examination Quick Reference & Passing Matrix",
    topic: "strategy",
    tags: ["Passing Rate", "Exam Rules", "Checklist"],
    pinned: true,
    color: "amber",
    content: `### Civil Service Examination (CSE) Passing Standard

- **Passing Grade**: Must obtain at least **80.00%** general rating.
- **Professional Level**:
  - Total Items: **170 items**
  - Time Limit: **3 hours and 10 minutes** (190 mins)
  - Scope: Numerical, Verbal, General Information, and **Analytical Ability** (Syllogisms, Assumptions, Data Interpretation).
- **Subprofessional Level**:
  - Total Items: **165 items**
  - Time Limit: **2 hours and 40 minutes** (160 mins)
  - Scope: Numerical, Verbal, General Information, and **Clerical Operations** (Alphabetical Filing, Clerical Procedures).

### Exam Day Essentials Checklist
- [x] Valid Philippine Government ID (Passport, PRC, UMID, Driver's License, PhilID)
- [x] Original Notice of School Assignment (e-NOSA or verification slip)
- [x] Black ballpen only (no gel pens or friction pens)
- [ ] Arrive at least 1 hour before testing time (gates close at 7:30 AM)
- [ ] No electronic gadgets or smartwatches permitted in the testing room`,
    createdAt: "2026-03-01T08:00:00.000Z",
    updatedAt: "2026-03-01T08:00:00.000Z",
  },
  {
    id: "note-ra6713",
    title: "RA 6713: Code of Conduct & Ethical Standards (High Yield)",
    topic: "general",
    tags: ["Gen Info", "Philippine Law", "Ethics"],
    pinned: true,
    color: "purple",
    content: `### 8 Norms of Conduct of Public Officials and Employees (Sec. 4)
1. **Commitment to public interest** — Always uphold public interest over personal interest.
2. **Professionalism** — Perform duties with highest degree of excellence, professionalism, intelligence and skill.
3. **Justness and sincerity** — Remain true to the people at all times; do not discriminate.
4. **Political neutrality** — Serve everyone without bias regardless of party affiliation or religious belief.
5. **Responsiveness to the public** — Extend prompt, courteous, and adequate service.
6. **Nationalism and patriotism** — Maintain allegiance to the Republic and the Filipino people.
7. **Commitment to democracy** — Maintain the supremacy of civilian authority over military.
8. **Simple living** — Modest lives appropriate to positions; avoid ostentatious display of wealth.

### Duties of Public Officials (Sec. 5)
- **Act promptly on letters and requests**: within **15 working days** from receipt.
- **Submit annual performance reports**: within **45 working days** from the end of the year.
- **Process documents and papers expeditiously**: must contain not more than 3 signatories unless authorized.
- **Act immediately on the public's personal transactions**: attend to callers promptly.`,
    createdAt: "2026-03-02T09:30:00.000Z",
    updatedAt: "2026-03-02T09:30:00.000Z",
  },
  {
    id: "note-math-shortcuts",
    title: "Numerical Ability Formulas & Fast Problem-Solving Shortcuts",
    topic: "numerical",
    tags: ["Formulas", "Work Problems", "Ratios"],
    pinned: false,
    color: "amber",
    content: `### 1. Work Problem Formula
If worker $A$ completes a job in $a$ hours and worker $B$ in $b$ hours:
$$\\frac{1}{a} + \\frac{1}{b} = \\frac{1}{T} \\implies T = \\frac{a \\times b}{a + b}$$

### 2. Distance, Speed & Time
$$d = r \\times t \\quad \\text{and} \\quad \\text{Average Speed} = \\frac{\\text{Total Distance}}{\\text{Total Time}}$$
*Warning*: Never just average the two speeds if distances or times differ!

### 3. Percent Change
$$\\text{Percent Increase / Decrease} = \\frac{\\text{New Value} - \\text{Original Value}}{\\text{Original Value}} \\times 100\\%$$

### 4. Age Problems Fast Setup
- Let current age of person $X$ be $x$.
- "In $n$ years": $x + n$
- "$n$ years ago": $x - n$
- *Tip*: Substitute multiple-choice answers backwards starting from choice C.`,
    createdAt: "2026-03-03T10:15:00.000Z",
    updatedAt: "2026-03-03T10:15:00.000Z",
  },
  {
    id: "note-grammar-rules",
    title: "Verbal Ability: Common Civil Service Grammar & Subject-Verb Traps",
    topic: "verbal",
    tags: ["Grammar", "Subject-Verb", "Vocabulary"],
    pinned: false,
    color: "blue",
    content: `### 1. "A number of" vs "The number of"
- **A number of** + plural noun $\\rightarrow$ **PLURAL verb**
  - *Example*: "A number of examinees **have** passed the test."
- **The number of** + plural noun $\\rightarrow$ **SINGULAR verb**
  - *Example*: "The number of examinees **has** increased."

### 2. Correlative Conjunctions
- In **either... or** and **neither... nor**, the verb agrees with the **closer subject**:
  - "Neither the supervisor nor the **staff members are** available."
  - "Neither the staff members nor the **supervisor is** available."

### 3. Intervening Phrases (Ignore Them!)
Phrases like *as well as, along with, together with, in addition to, accompanied by* do **not** change the number of the subject:
- "The Director, along with his assistants, **is** attending the convention."`,
    createdAt: "2026-03-04T11:00:00.000Z",
    updatedAt: "2026-03-04T11:00:00.000Z",
  },
  {
    id: "note-filing-rules",
    title: "Clerical Operations: Standard Alphabetical Filing Rules",
    topic: "clerical",
    tags: ["Filing", "Subprofessional", "Procedures"],
    pinned: false,
    color: "rose",
    content: `### CSC Standard Alphabetical Filing Rules
1. **Order of Units (Names of Persons)**:
   - Unit 1: Surname (Last Name)
   - Unit 2: First Name (Given Name)
   - Unit 3: Middle Name or Initial
   - *Example*: "Maria Santos Cruz" becomes **Cruz, Maria Santos**.

2. **Prefixes**:
   - Foreign or local prefixes (De, Del, Dela, San, Sta., Von, Mc, Mac, O') are treated as part of the surname:
   - "Juan Dela Cruz" $\\rightarrow$ **Dela Cruz, Juan** (filed under D).
   - "Ana San Jose" $\\rightarrow$ **San Jose, Ana** (filed under S).

3. **Hyphenated Names**:
   - Hyphenated surnames are considered **one single indexing unit**:
   - "Lourdes Gomez-Rivera" $\\rightarrow$ **Gomez-Rivera, Lourdes**.

4. **Seniority and Titles**:
   - Titles (Dr., Engr., Atty.) and suffixes (Jr., Sr., III) are indexed last:
   - **Reyes, Roberto Jr. (Atty.)**`,
    createdAt: "2026-03-05T14:20:00.000Z",
    updatedAt: "2026-03-05T14:20:00.000Z",
  },
];

export interface SaveNoteInput {
  id?: string | null;
  title?: string;
  content?: string;
  topic?: TopicId;
  tags?: string[];
  pinned?: boolean;
  color?: "default" | "amber" | "purple" | "blue" | "emerald" | "rose";
}

export const notesModel = {
  /**
   * Loads all notes for the user or guest. Seeds initial notes if empty.
   */
  async getAll(userId: string | null = null): Promise<StudyNote[]> {
    const key = getNotesKey(userId);
    let raw: string | null = null;

    try {
      raw = await storageModel.getLocal(key);
    } catch (e) {
      console.warn("Failed to read notes from storage:", e);
    }

    if (!raw && userId) {
      try {
        const legacyAuth = localStorage.getItem("cse-qbank-system-user-auth");
        if (legacyAuth) {
          const sysUser = JSON.parse(legacyAuth);
          if (sysUser?.email && sysUser.email !== userId) {
            const emailRaw = await storageModel.getLocal(getNotesKey(sysUser.email));
            if (emailRaw) {
              raw = emailRaw;
              await storageModel.setLocal(key, emailRaw);
            }
          }
        }
      } catch (_) {}

      if (!raw) {
        try {
          raw = await storageModel.getLocal(NOTES_KEY);
        } catch (_) {}
      }
    }

    if (!raw) {
      await this.saveAll(DEFAULT_STUDY_NOTES, userId);
      return DEFAULT_STUDY_NOTES;
    }

    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return this.sortNotes(parsed);
      }
      return DEFAULT_STUDY_NOTES;
    } catch {
      return DEFAULT_STUDY_NOTES;
    }
  },

  /**
   * Sorts notes: pinned first, then by updated timestamp descending.
   */
  sortNotes(notes: StudyNote[]): StudyNote[] {
    return [...notes].sort((a, b) => {
      if (a.pinned !== b.pinned) {
        return a.pinned ? -1 : 1;
      }
      const timeB = Date.parse(b.updatedAt || b.createdAt || "0");
      const timeA = Date.parse(a.updatedAt || a.createdAt || "0");
      return timeB - timeA;
    });
  },

  /**
   * Saves array of notes.
   */
  async saveAll(notes: StudyNote[], userId: string | null = null): Promise<StudyNote[]> {
    const key = getNotesKey(userId);
    const sorted = this.sortNotes(notes);
    try {
      await storageModel.set(key, JSON.stringify(sorted));
      if (!userId) {
        try {
          localStorage.setItem(NOTES_KEY, JSON.stringify(sorted));
        } catch (_) {}
      }
    } catch (e) {
      console.error("Failed to save notes:", e);
    }
    return sorted;
  },

  /**
   * Saves (adds or updates) a single note.
   */
  async save(noteData: SaveNoteInput, userId: string | null = null): Promise<StudyNote> {
    const all = await this.getAll(userId);
    const now = new Date().toISOString();
    let updated: StudyNote[];

    if (noteData.id) {
      updated = all.map((item) =>
        item.id === noteData.id
          ? {
              ...item,
              ...noteData,
              title: noteData.title ?? item.title,
              content: noteData.content ?? item.content,
              topic: noteData.topic ?? item.topic,
              tags: noteData.tags ?? item.tags,
              pinned: noteData.pinned ?? item.pinned,
              color: noteData.color ?? item.color,
              updatedAt: now,
            }
          : item
      );
    } else {
      const newNote: StudyNote = {
        id: `note-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        title: noteData.title || "Untitled Note",
        content: noteData.content || "",
        topic: noteData.topic || "general",
        tags: Array.isArray(noteData.tags) ? noteData.tags : [],
        pinned: Boolean(noteData.pinned),
        color: noteData.color || "default",
        createdAt: now,
        updatedAt: now,
      };
      updated = [newNote, ...all];
    }

    const saved = await this.saveAll(updated, userId);
    return saved.find((n) => n.id === (noteData.id || updated[0].id))!;
  },

  /**
   * Deletes a note by ID.
   */
  async delete(id: string, userId: string | null = null): Promise<StudyNote[]> {
    const all = await this.getAll(userId);
    const filtered = all.filter((n) => n.id !== id);
    await this.saveAll(filtered, userId);
    return filtered;
  },

  /**
   * Toggles the pinned status of a note.
   */
  async togglePin(id: string, userId: string | null = null): Promise<StudyNote[]> {
    const all = await this.getAll(userId);
    const updated = all.map((n) =>
      n.id === id ? { ...n, pinned: !n.pinned, updatedAt: new Date().toISOString() } : n
    );
    return await this.saveAll(updated, userId);
  },

  /**
   * Exports all notes as a readable Markdown document bundle.
   */
  exportMarkdown(notes: StudyNote[]): string {
    const header = `# CSE QBANK - Personal Study Notes & Reviewer Reference\nGenerated on ${new Date().toLocaleDateString()}\n\n---\n\n`;
    const bodies = notes
      .map(
        (note) =>
          `## ${note.title}\n**Topic**: ${note.topic.toUpperCase()} | **Tags**: ${
            note.tags?.join(", ") || "None"
          } | **Last Updated**: ${new Date(note.updatedAt || note.createdAt).toLocaleString()}\n\n${
            note.content
          }\n\n---`
      )
      .join("\n\n");
    return header + bodies;
  },
};
