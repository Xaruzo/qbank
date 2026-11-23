import { Extension, type Editor } from "@tiptap/core";

export type SmartMarkName = "bold" | "italic" | "underline" | "strike";

export type SmartMarkTarget =
  | { kind: "collapsed" }
  | { kind: "whitespace-only" }
  | { kind: "range"; from: number; to: number }
  | { kind: "word"; from: number; to: number; caret: number };

const WORD_CHAR_RE = /[\p{L}\p{N}_]/u;

/**
 * Computes a Word-style target range for inline mark commands:
 * - For non-empty selections (e.g. Windows/Word double-click selecting `"word "`),
 *   trims leading and trailing whitespace so trailing spaces don't break Markdown `**`.
 * - For whitespace-only selections, avoids applying stray marks.
 * - For a collapsed caret strictly inside an alphanumeric word (`wo|rd`),
 *   targets the whole word like Microsoft Word while preserving the caret position.
 */
export function getSmartMarkTarget(editor: Editor): SmartMarkTarget {
  const { selection, doc } = editor.state;
  const { from, to, empty } = selection;

  if (!empty) {
    let firstNonWs: number | null = null;
    let lastNonWsEnd: number | null = null;

    doc.nodesBetween(from, to, (node, pos) => {
      if (node.isText && node.text) {
        const localFrom = Math.max(0, from - pos);
        const localTo = Math.min(node.text.length, to - pos);
        if (localFrom >= localTo) return false;
        const slice = node.text.slice(localFrom, localTo);
        const firstIdx = slice.search(/\S/);
        if (firstIdx !== -1) {
          const docStart = pos + localFrom + firstIdx;
          if (firstNonWs === null) firstNonWs = docStart;
          let lastIdx = slice.length - 1;
          while (lastIdx >= 0 && /\s/.test(slice[lastIdx])) {
            lastIdx -= 1;
          }
          if (lastIdx >= 0) {
            lastNonWsEnd = pos + localFrom + lastIdx + 1;
          }
        }
        return false;
      }

      if (node.isInline && node.isAtom) {
        const atomStart = Math.max(from, pos);
        const atomEnd = Math.min(to, pos + node.nodeSize);
        if (atomStart < atomEnd) {
          if (firstNonWs === null) firstNonWs = atomStart;
          lastNonWsEnd = atomEnd;
        }
        return false;
      }

      return true;
    });

    if (firstNonWs === null || lastNonWsEnd === null || firstNonWs >= lastNonWsEnd) {
      return { kind: "whitespace-only" };
    }

    return { kind: "range", from: firstNonWs, to: lastNonWsEnd };
  }

  const { $from } = selection;
  if (!$from.parent.isTextblock) {
    return { kind: "collapsed" };
  }

  const blockStart = $from.start();
  const blockEnd = $from.end();
  if (from <= blockStart || from >= blockEnd) {
    return { kind: "collapsed" };
  }

  const charBefore = doc.textBetween(from - 1, from, "\0", "\0");
  const charAfter = doc.textBetween(from, from + 1, "\0", "\0");

  if (!WORD_CHAR_RE.test(charBefore) || !WORD_CHAR_RE.test(charAfter)) {
    return { kind: "collapsed" };
  }

  let wordFrom = from;
  while (wordFrom > blockStart) {
    const ch = doc.textBetween(wordFrom - 1, wordFrom, "\0", "\0");
    if (!ch || !WORD_CHAR_RE.test(ch)) break;
    wordFrom -= 1;
  }

  let wordTo = from;
  while (wordTo < blockEnd) {
    const ch = doc.textBetween(wordTo, wordTo + 1, "\0", "\0");
    if (!ch || !WORD_CHAR_RE.test(ch)) break;
    wordTo += 1;
  }

  if (wordFrom >= wordTo) {
    return { kind: "collapsed" };
  }

  return { kind: "word", from: wordFrom, to: wordTo, caret: from };
}

export function toggleMarkSmart(
  editor: Editor | null | undefined,
  markName: SmartMarkName
): boolean {
  if (!editor) return false;
  const target = getSmartMarkTarget(editor);

  if (target.kind === "whitespace-only") {
    editor.commands.focus();
    return true;
  }

  if (target.kind === "collapsed") {
    return editor.chain().focus().toggleMark(markName).run();
  }

  if (target.kind === "word") {
    return editor
      .chain()
      .focus()
      .setTextSelection({ from: target.from, to: target.to })
      .toggleMark(markName)
      .setTextSelection(target.caret)
      .run();
  }

  return editor
    .chain()
    .focus()
    .setTextSelection({ from: target.from, to: target.to })
    .toggleMark(markName)
    .run();
}

export function toggleHighlightSmart(
  editor: Editor | null | undefined,
  color: string
): boolean {
  if (!editor) return false;
  const target = getSmartMarkTarget(editor);

  if (target.kind === "whitespace-only") {
    editor.commands.focus();
    return true;
  }

  if (target.kind === "collapsed") {
    return editor.chain().focus().toggleHighlight({ color }).run();
  }

  if (target.kind === "word") {
    return editor
      .chain()
      .focus()
      .setTextSelection({ from: target.from, to: target.to })
      .toggleHighlight({ color })
      .setTextSelection(target.caret)
      .run();
  }

  return editor
    .chain()
    .focus()
    .setTextSelection({ from: target.from, to: target.to })
    .toggleHighlight({ color })
    .run();
}

export function setHighlightSmart(
  editor: Editor | null | undefined,
  color: string
): boolean {
  if (!editor) return false;
  const target = getSmartMarkTarget(editor);

  if (target.kind === "whitespace-only") {
    editor.commands.focus();
    return true;
  }

  if (target.kind === "collapsed") {
    return editor.chain().focus().setHighlight({ color }).run();
  }

  if (target.kind === "word") {
    return editor
      .chain()
      .focus()
      .setTextSelection({ from: target.from, to: target.to })
      .setHighlight({ color })
      .setTextSelection(target.caret)
      .run();
  }

  return editor
    .chain()
    .focus()
    .setTextSelection({ from: target.from, to: target.to })
    .setHighlight({ color })
    .run();
}

/**
 * Clears all inline marks and node formatting even when the caret is collapsed
 * (TipTap's built-in `unsetAllMarks` is a no-op on empty selections, which would
 * otherwise leave active/stored marks stuck while typing new lines).
 */
export function clearFormattingSmart(editor: Editor | null | undefined): boolean {
  if (!editor) return false;
  const { selection } = editor.state;
  const chain = editor.chain().focus();
  if (!selection.empty) {
    chain.unsetAllMarks();
  }
  return chain
    .clearNodes()
    .command(({ tr }) => {
      tr.setStoredMarks([]);
      return true;
    })
    .run();
}

export const WordSmartFormattingExtension = Extension.create({
  name: "wordSmartFormatting",
  priority: 1000,

  addKeyboardShortcuts() {
    return {
      "Mod-b": () => toggleMarkSmart(this.editor, "bold"),
      "Mod-B": () => toggleMarkSmart(this.editor, "bold"),
      "Mod-i": () => toggleMarkSmart(this.editor, "italic"),
      "Mod-I": () => toggleMarkSmart(this.editor, "italic"),
      "Mod-u": () => toggleMarkSmart(this.editor, "underline"),
      "Mod-U": () => toggleMarkSmart(this.editor, "underline"),
      "Mod-Shift-s": () => {
        if (!this.editor.schema.marks.strike) return false;
        return toggleMarkSmart(this.editor, "strike");
      },
      "Mod-Shift-S": () => {
        if (!this.editor.schema.marks.strike) return false;
        return toggleMarkSmart(this.editor, "strike");
      },
    };
  },
});
