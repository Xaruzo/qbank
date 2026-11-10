import { beforeEach, describe, expect, it, vi } from "vitest";

// Minimal storage stubs
const backingStore = new Map<string, string>();
const localStorageStub = {
  getItem: (key: string) => (backingStore.has(key) ? backingStore.get(key) ?? null : null),
  setItem: (key: string, value: string) => {
    backingStore.set(key, String(value));
  },
  removeItem: (key: string) => {
    backingStore.delete(key);
  },
};

beforeEach(() => {
  backingStore.clear();
  vi.stubGlobal("window", {
    storage: {
      get: async (key: string) => ({ value: backingStore.get(key) || null }),
      set: async (key: string, value: string) => {
        backingStore.set(key, String(value));
      },
    },
  });
  vi.stubGlobal("localStorage", localStorageStub);
});

const loadModel = async () => {
  vi.resetModules();
  const { notesModel, DEFAULT_STUDY_NOTES } = await import("../src/models/notesModel");
  return { notesModel, DEFAULT_STUDY_NOTES };
};

describe("notesModel", () => {
  it("seeds default study notes on initial load if empty", async () => {
    const { notesModel, DEFAULT_STUDY_NOTES } = await loadModel();
    const notes = await notesModel.getAll("user-1");

    expect(notes.length).toBe(DEFAULT_STUDY_NOTES.length);
    expect(notes[0].title).toBe(DEFAULT_STUDY_NOTES[0].title);
  });

  it("can add a new note and retrieve it", async () => {
    const { notesModel } = await loadModel();
    const newNote = await notesModel.save(
      {
        title: "Constitution Article VI Notes",
        content: "Legislative Department consists of Senate and House of Representatives.",
        topic: "general",
        tags: ["Constitution", "Article VI"],
        pinned: false,
      },
      "user-1"
    );

    expect(newNote).toBeDefined();
    expect(newNote.id).toBeDefined();
    expect(newNote.title).toBe("Constitution Article VI Notes");

    const all = await notesModel.getAll("user-1");
    const found = all.find((n) => n.id === newNote.id);
    expect(found).toBeDefined();
    expect(found.tags).toContain("Constitution");
  });

  it("places pinned notes at the top regardless of creation order", async () => {
    const { notesModel } = await loadModel();
    await notesModel.save(
      { title: "Unpinned Note", content: "Content 1", pinned: false },
      "user-2"
    );
    await notesModel.save(
      { title: "Pinned Note", content: "Content 2", pinned: true },
      "user-2"
    );

    const all = await notesModel.getAll("user-2");
    expect(all[0].pinned).toBe(true);
  });

  it("can toggle pin on an existing note", async () => {
    const { notesModel } = await loadModel();
    const note = await notesModel.save(
      { title: "Toggle Test", content: "Test", pinned: false },
      "user-3"
    );

    const updated = await notesModel.togglePin(note.id, "user-3");
    const found = updated.find((n) => n.id === note.id);
    expect(found.pinned).toBe(true);
  });

  it("can delete a note", async () => {
    const { notesModel } = await loadModel();
    const note = await notesModel.save(
      { title: "Delete Me", content: "Temporary", pinned: false },
      "user-4"
    );

    let all = await notesModel.getAll("user-4");
    expect(all.some((n) => n.id === note.id)).toBe(true);

    all = await notesModel.delete(note.id, "user-4");
    expect(all.some((n) => n.id === note.id)).toBe(false);
  });

  it("generates markdown export bundle", async () => {
    const { notesModel } = await loadModel();
    const notes = [
      {
        id: "1",
        title: "Math Rule",
        content: "Work formula: $1/A + 1/B = 1/T$",
        topic: "numerical" as const,
        tags: ["Math"],
        pinned: false,
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01",
      },
    ];

    const md = notesModel.exportMarkdown(notes);
    expect(md).toContain("# CSE QBANK - Personal Study Notes");
    expect(md).toContain("## Math Rule");
    expect(md).toContain("Work formula");
  });
});
