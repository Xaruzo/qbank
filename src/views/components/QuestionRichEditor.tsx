import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { Node as TiptapNode, mergeAttributes } from "@tiptap/core";
import {
  EditorContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  useEditor,
  useEditorState,
  type NodeViewProps,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";
import katex from "katex";
import "katex/dist/katex.min.css";
import {
  Bold,
  Check,
  ChevronDown,
  Highlighter,
  Italic,
  List,
  ListOrdered,
  Redo2,
  RemoveFormatting,
  Sigma,
  Underline as UnderlineIcon,
  Undo2,
  X,
} from "lucide-react";
import {
  editorHtmlToMarkdown,
  markdownToEditorHtml,
  unwrapFencedMarkdownText,
  unwrapQuestionHtml,
} from "../../utils/noteRichFormat";
import {
  WordSmartFormattingExtension,
  clearFormattingSmart,
  setHighlightSmart,
  toggleHighlightSmart,
  toggleMarkSmart,
} from "../../utils/tiptapWordFormat";

const HIGHLIGHT_SWATCHES = [
  { id: "yellow", label: "Yellow", color: "rgba(250, 204, 21, 0.32)", chip: "#facc15" },
  { id: "amber", label: "Amber", color: "rgba(245, 158, 11, 0.30)", chip: "#f59e0b" },
  { id: "green", label: "Green", color: "rgba(52, 211, 153, 0.28)", chip: "#34d399" },
  { id: "blue", label: "Sky", color: "rgba(56, 189, 248, 0.28)", chip: "#38bdf8" },
  { id: "pink", label: "Rose", color: "rgba(244, 114, 182, 0.28)", chip: "#f472b6" },
];

const MATH_QUICK_SNIPPETS = [
  { label: "a/b", insert: "\\frac{a}{b}" },
  { label: "√x", insert: "\\sqrt{x}" },
  { label: "xⁿ", insert: "x^{2}" },
  { label: "×", insert: "\\times " },
  { label: "÷", insert: "\\div " },
  { label: "≤", insert: "\\le " },
  { label: "≥", insert: "\\ge " },
  { label: "≈", insert: "\\approx " },
  { label: "%", insert: "\\%" },
];

const INLINE_SHORTCUTS: Array<{ key: string; char: string; wordBoundary?: boolean }> = [
  { key: "+-", char: "±" },
  { key: "^0", char: "⁰" },
  { key: "^1", char: "¹" },
  { key: "^2", char: "²" },
  { key: "^3", char: "³" },
  { key: "^4", char: "⁴" },
  { key: "^5", char: "⁵" },
  { key: "^6", char: "⁶" },
  { key: "^7", char: "⁷" },
  { key: "^8", char: "⁸" },
  { key: "^9", char: "⁹" },
  { key: "^+", char: "⁺" },
  { key: "^-", char: "⁻" },
  { key: "^=", char: "⁼" },
  { key: "^(", char: "⁽" },
  { key: "^)", char: "⁾" },
  { key: "<=", char: "≤" },
  { key: ">=", char: "≥" },
  { key: "!=", char: "≠" },
  { key: "==", char: "≈" },
  { key: "sqrt", char: "√", wordBoundary: true },
  { key: "deg", char: "°", wordBoundary: true },
];

function renderKatexHtml(latex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(latex || "\\text{formula}", {
      throwOnError: false,
      displayMode,
    });
  } catch {
    return latex;
  }
}

function QMathInlineNodeView({
  node,
  updateAttributes,
  deleteNode,
  selected,
  editor,
}: NodeViewProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(node.attrs.latex || ""));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(String(node.attrs.latex || ""));
  }, [node.attrs.latex]);

  useEffect(() => {
    if (editing) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 0);
    }
  }, [editing]);

  const html = useMemo(
    () => renderKatexHtml(String(node.attrs.latex || ""), false),
    [node.attrs.latex]
  );

  const commit = () => {
    const trimmed = draft.trim();
    if (!trimmed) {
      deleteNode();
    } else {
      updateAttributes({ latex: trimmed });
    }
    setEditing(false);
  };

  return (
    <NodeViewWrapper as="span" className={`qb-math-inline-node${selected ? " is-selected" : ""}`}>
      {editing && editor.isEditable ? (
        <span
          className="qb-math-inline-editor"
          contentEditable={false}
          onClick={(e) => e.stopPropagation()}
        >
          <input
            ref={inputRef}
            type="text"
            className="qb-math-inline-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commit();
              } else if (e.key === "Escape") {
                e.preventDefault();
                setDraft(String(node.attrs.latex || ""));
                setEditing(false);
              }
            }}
            placeholder="LaTeX e.g. \frac{3}{5}"
          />
          <button type="button" className="qb-math-mini-btn is-save" onClick={commit} title="Apply">
            <Check size={12} />
          </button>
        </span>
      ) : (
        <span
          className="qb-math-inline-render"
          onClick={() => {
            if (editor.isEditable) setEditing(true);
          }}
          title={
            editor.isEditable
              ? `Formula: ${node.attrs.latex} (click to edit)`
              : String(node.attrs.latex)
          }
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}
    </NodeViewWrapper>
  );
}

function QMathBlockNodeView({
  node,
  updateAttributes,
  deleteNode,
  selected,
  editor,
}: NodeViewProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(node.attrs.latex || ""));
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setDraft(String(node.attrs.latex || ""));
  }, [node.attrs.latex]);

  useEffect(() => {
    if (editing) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 0);
    }
  }, [editing]);

  const html = useMemo(
    () => renderKatexHtml(editing ? draft : String(node.attrs.latex || ""), true),
    [editing, draft, node.attrs.latex]
  );

  const commit = () => {
    const trimmed = draft.trim();
    if (!trimmed) {
      deleteNode();
    } else {
      updateAttributes({ latex: trimmed });
    }
    setEditing(false);
  };

  return (
    <NodeViewWrapper as="div" className={`qb-math-block-node${selected ? " is-selected" : ""}`}>
      {editing && editor.isEditable ? (
        <div
          className="qb-math-block-editor"
          contentEditable={false}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="qb-math-block-editor-head">
            <span>Display Equation (LaTeX / KaTeX)</span>
            <div className="qb-math-block-editor-actions">
              <button
                type="button"
                className="qb-math-mini-btn"
                onClick={() => {
                  setDraft(String(node.attrs.latex || ""));
                  setEditing(false);
                }}
              >
                Cancel
              </button>
              <button type="button" className="qb-math-mini-btn is-save" onClick={commit}>
                Done
              </button>
            </div>
          </div>
          <textarea
            ref={textareaRef}
            className="qb-math-block-input"
            rows={2}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                commit();
              } else if (e.key === "Escape") {
                e.preventDefault();
                setDraft(String(node.attrs.latex || ""));
                setEditing(false);
              }
            }}
          />
          <div className="qb-math-block-live-preview" dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      ) : (
        <div
          className="qb-math-block-render"
          onClick={() => {
            if (editor.isEditable) setEditing(true);
          }}
          title={editor.isEditable ? "Click to edit equation" : undefined}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}
    </NodeViewWrapper>
  );
}

const QMathInlineExtension = TiptapNode.create({
  name: "mathInline",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      latex: {
        default: "x^2",
        parseHTML: (element) => element.getAttribute("data-latex") || "",
        renderHTML: (attributes) => ({
          "data-type": "math-inline",
          "data-latex": attributes.latex,
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-type="math-inline"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { "data-type": "math-inline" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(QMathInlineNodeView);
  },
});

const QMathBlockExtension = TiptapNode.create({
  name: "mathBlock",
  group: "block",
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      latex: {
        default: "\\frac{a}{b}",
        parseHTML: (element) => element.getAttribute("data-latex") || "",
        renderHTML: (attributes) => ({
          "data-type": "math-block",
          "data-latex": attributes.latex,
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="math-block"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "math-block" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(QMathBlockNodeView);
  },
});

export interface QuestionRichEditorHandle {
  focus: () => void;
  insertText: (text: string, cursorOffset?: number, selectLength?: number) => void;
  toggleBold: () => void;
  toggleItalic: () => void;
  toggleUnderline: () => void;
}

export interface QuestionRichEditorProps {
  value: string;
  onChange: (nextValue: string) => void;
  placeholder?: string;
  minHeightPx?: number;
  ariaLabel?: string;
  singleLine?: boolean;
  className?: string;
  onFocus?: () => void;
  onUnderlineChange?: (active: boolean) => void;
  onFormatChange?: (state: { bold: boolean; italic: boolean; underline: boolean }) => void;
}

const TOOLBAR_BTN_BASE =
  "inline-flex h-7 min-w-7 items-center justify-center rounded-md border border-transparent px-1.5 text-qb-muted transition-colors hover:bg-qb-surface hover:text-qb-heading cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed";

const TOOLBAR_BTN_ACTIVE =
  "border-amber-500/45 bg-amber-500/15 text-amber-400 light:border-amber-600/40 light:bg-amber-50 light:text-amber-700";

const QuestionRichEditor = forwardRef<QuestionRichEditorHandle, QuestionRichEditorProps>(
  function QuestionRichEditor(
    {
      value,
      onChange,
      placeholder = "Type here...",
      minHeightPx = 104,
      ariaLabel = "Rich text editor",
      singleLine = false,
      className = "",
      onFocus,
      onUnderlineChange,
      onFormatChange,
    },
    ref
  ) {
    const [activeHighlightColor, setActiveHighlightColor] = useState(HIGHLIGHT_SWATCHES[0].color);
    const [openPopover, setOpenPopover] = useState<null | "highlight" | "math">(null);
    const [popoverLeft, setPopoverLeft] = useState(8);
    const [mathDraft, setMathDraft] = useState("");
    const [mathAsBlock, setMathAsBlock] = useState(false);

    const wrapRef = useRef<HTMLDivElement>(null);
    const lastEmittedRef = useRef<string>(value);
    const onChangeRef = useRef(onChange);
    const onFocusRef = useRef(onFocus);
    useEffect(() => {
      onChangeRef.current = onChange;
    }, [onChange]);
    useEffect(() => {
      onFocusRef.current = onFocus;
    }, [onFocus]);

    const togglePopover = (kind: "highlight" | "math", triggerEl?: HTMLElement | null) => {
      setOpenPopover((prev) => {
        if (prev === kind) return null;
        if (triggerEl && wrapRef.current) {
          const wrapRect = wrapRef.current.getBoundingClientRect();
          const btnRect = triggerEl.getBoundingClientRect();
          const desiredWidth = kind === "math" ? 310 : 210;
          const estimatedWidth = Math.min(Math.max(150, wrapRect.width - 16), desiredWidth);
          const rawLeft = btnRect.left - wrapRect.left;
          const maxLeft = Math.max(8, wrapRect.width - estimatedWidth - 8);
          setPopoverLeft(Math.max(8, Math.min(rawLeft, maxLeft)));
        }
        return kind;
      });
    };

    const editor = useEditor({
      extensions: [
        StarterKit.configure({
          heading: false,
          code: false,
          codeBlock: false,
          horizontalRule: false,
          ...(singleLine
            ? {
                bulletList: false,
                orderedList: false,
                blockquote: false,
                hardBreak: false,
              }
            : {}),
        }),
        Highlight.configure({ multicolor: true }),
        Placeholder.configure({ placeholder }),
        WordSmartFormattingExtension,
        QMathInlineExtension,
        ...(singleLine ? [] : [QMathBlockExtension]),
      ],
      content: unwrapQuestionHtml(markdownToEditorHtml(value), { singleLine }),
      editorProps: {
        attributes: {
          "aria-label": ariaLabel,
          role: "textbox",
          "aria-multiline": singleLine ? "false" : "true",
        },
        transformPastedHTML(html) {
          return unwrapQuestionHtml(html, { singleLine });
        },
        transformPastedText(text) {
          return unwrapFencedMarkdownText(text, { singleLine });
        },
        handleKeyDown(_view, event) {
          if (singleLine && event.key === "Enter") {
            event.preventDefault();
            return true;
          }
          return false;
        },
        handleTextInput(view, from, to, text) {
          if (!text || text.length > 2) return false;
          const lookbackStart = Math.max(0, from - 6);
          const beforeText = view.state.doc.textBetween(lookbackStart, from, "\0", "\0");
          const combined = beforeText + text;

          for (const shortcut of INLINE_SHORTCUTS) {
            if (!combined.endsWith(shortcut.key)) continue;
            if (shortcut.wordBoundary) {
              const charBefore = combined.slice(0, combined.length - shortcut.key.length).slice(-1);
              if (charBefore && /[a-zA-Z]/.test(charBefore)) continue;
            }
            const charsToReplaceBefore = shortcut.key.length - text.length;
            const replaceFrom = from - charsToReplaceBefore;
            if (replaceFrom < 0) continue;
            const tr = view.state.tr.insertText(shortcut.char, replaceFrom, to);
            view.dispatch(tr);
            return true;
          }
          return false;
        },
      },
      onFocus: () => {
        onFocusRef.current?.();
      },
      onUpdate: ({ editor: ed }) => {
        const rawMd = editorHtmlToMarkdown(ed.getHTML());
        const nextMd = singleLine ? rawMd.replace(/\r?\n+/g, " ") : rawMd;
        lastEmittedRef.current = nextMd;
        onChangeRef.current(nextMd);
      },
    });

    // Sync external value edits (e.g., AI image extract, question switch, form reset)
    useEffect(() => {
      if (!editor) return;
      if (value !== lastEmittedRef.current) {
        lastEmittedRef.current = value;
        editor.commands.setContent(
          unwrapQuestionHtml(markdownToEditorHtml(value), { singleLine }),
          { emitUpdate: false }
        );
      }
    }, [editor, singleLine, value]);

    // Close popovers on outside click / Escape
    useEffect(() => {
      const onPointerDown = (e: PointerEvent) => {
        if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
          setOpenPopover(null);
        }
      };
      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          setOpenPopover(null);
        }
      };
      window.addEventListener("pointerdown", onPointerDown);
      window.addEventListener("keydown", onKeyDown);
      return () => {
        window.removeEventListener("pointerdown", onPointerDown);
        window.removeEventListener("keydown", onKeyDown);
      };
    }, []);

    const editorState = useEditorState({
      editor,
      selector: (ctx) => {
        const ed = ctx.editor;
        if (!ed) {
          return {
            isFocused: false,
            canUndo: false,
            canRedo: false,
            bold: false,
            italic: false,
            underline: false,
            highlight: false,
            highlightColor: "",
            bulletList: false,
            orderedList: false,
          };
        }
        return {
          isFocused: ed.isFocused,
          canUndo: ed.can().undo(),
          canRedo: ed.can().redo(),
          bold: ed.isActive("bold"),
          italic: ed.isActive("italic"),
          underline: ed.isActive("underline"),
          highlight: ed.isActive("highlight"),
          highlightColor: ed.getAttributes("highlight")?.color || "",
          bulletList: ed.isActive("bulletList"),
          orderedList: ed.isActive("orderedList"),
        };
      },
    });

    const isBoldActive = Boolean(editorState?.bold);
    const isItalicActive = Boolean(editorState?.italic);
    const isUnderlineActive = Boolean(editorState?.underline);
    useEffect(() => {
      onUnderlineChange?.(isUnderlineActive);
    }, [isUnderlineActive, onUnderlineChange]);
    useEffect(() => {
      if (editorState?.isFocused) {
        onFormatChange?.({
          bold: isBoldActive,
          italic: isItalicActive,
          underline: isUnderlineActive,
        });
      }
    }, [editorState?.isFocused, isBoldActive, isItalicActive, isUnderlineActive, onFormatChange]);

    useImperativeHandle(
      ref,
      () => ({
        focus: () => {
          editor?.commands.focus();
        },
        insertText: (text: string, cursorOffset = text.length, selectLength = 0) => {
          if (!editor) return;
          const { from, to } = editor.state.selection;
          const chain = editor
            .chain()
            .focus()
            .insertContentAt({ from, to }, { type: "text", text });
          if (selectLength > 0 || cursorOffset !== text.length) {
            chain.setTextSelection({
              from: from + cursorOffset,
              to: from + cursorOffset + selectLength,
            });
          }
          chain.run();
        },
        toggleBold: () => {
          toggleMarkSmart(editor, "bold");
        },
        toggleItalic: () => {
          toggleMarkSmart(editor, "italic");
        },
        toggleUnderline: () => {
          toggleMarkSmart(editor, "underline");
        },
      }),
      [editor]
    );

    const handleInsertMath = (e: React.FormEvent) => {
      e.preventDefault();
      if (!editor) return;
      const latex = mathDraft.trim();
      if (!latex) {
        setOpenPopover(null);
        return;
      }
      if (mathAsBlock) {
        editor
          .chain()
          .focus()
          .insertContent({ type: "mathBlock", attrs: { latex } })
          .run();
      } else {
        editor
          .chain()
          .focus()
          .insertContent({ type: "mathInline", attrs: { latex } })
          .run();
      }
      setMathDraft("");
      setOpenPopover(null);
    };

    const activeHighlightIndicator =
      (editorState?.highlight && editorState.highlightColor) || activeHighlightColor;

    const resolvedMinHeight = singleLine ? 40 : minHeightPx;

    return (
      <div
        ref={wrapRef}
        className={`relative rounded-lg border bg-qb-input transition-colors ${
          editorState?.isFocused
            ? "border-amber-500/55 ring-1 ring-amber-500/20"
            : "border-qb-border hover:border-qb-border-hover"
        }${className ? ` ${className}` : ""}`}
      >
        {/* Compact Docx-Style Formatting Bar (hidden on compact single-line choice inputs) */}
        {!singleLine && (
          <div
            className="flex flex-wrap items-center gap-0.5 border-b border-qb-border px-2 py-1.5"
            role="toolbar"
            aria-label={`${ariaLabel} formatting`}
          >
            <button
              type="button"
              className={TOOLBAR_BTN_BASE}
              disabled={!editorState?.canUndo}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => editor?.chain().focus().undo().run()}
              title="Undo (Ctrl+Z)"
              aria-label="Undo"
            >
              <Undo2 size={14} />
            </button>
            <button
              type="button"
              className={TOOLBAR_BTN_BASE}
              disabled={!editorState?.canRedo}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => editor?.chain().focus().redo().run()}
              title="Redo (Ctrl+Y)"
              aria-label="Redo"
            >
              <Redo2 size={14} />
            </button>

            <span className="mx-1 h-4 w-px bg-qb-border" aria-hidden="true" />

            <button
              type="button"
              className={`${TOOLBAR_BTN_BASE}${editorState?.bold ? ` ${TOOLBAR_BTN_ACTIVE}` : ""}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => toggleMarkSmart(editor, "bold")}
              title="Bold (Ctrl+B)"
              aria-label="Bold"
              aria-pressed={editorState?.bold}
            >
              <Bold size={14} />
            </button>
            <button
              type="button"
              className={`${TOOLBAR_BTN_BASE}${editorState?.italic ? ` ${TOOLBAR_BTN_ACTIVE}` : ""}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => toggleMarkSmart(editor, "italic")}
              title="Italic (Ctrl+I)"
              aria-label="Italic"
              aria-pressed={editorState?.italic}
            >
              <Italic size={14} />
            </button>
            <button
              type="button"
              className={`${TOOLBAR_BTN_BASE}${editorState?.underline ? ` ${TOOLBAR_BTN_ACTIVE}` : ""}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => toggleMarkSmart(editor, "underline")}
              title="Underline (Ctrl+U)"
              aria-label="Underline"
              aria-pressed={editorState?.underline}
            >
              <UnderlineIcon size={14} />
            </button>

            <div className="inline-flex items-center">
              <button
                type="button"
                className={`${TOOLBAR_BTN_BASE} relative${
                  editorState?.highlight ? ` ${TOOLBAR_BTN_ACTIVE}` : ""
                }`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => toggleHighlightSmart(editor, activeHighlightColor)}
                title="Highlight text"
                aria-label="Highlight text"
                aria-pressed={editorState?.highlight}
              >
                <Highlighter size={14} />
                <span
                  className="absolute bottom-0.5 left-1.5 right-1.5 h-[2.5px] rounded-full"
                  style={{ backgroundColor: activeHighlightIndicator }}
                />
              </button>
              <button
                type="button"
                className={`${TOOLBAR_BTN_BASE} min-w-5 px-0.5${
                  openPopover === "highlight" ? ` ${TOOLBAR_BTN_ACTIVE}` : ""
                }`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => togglePopover("highlight", e.currentTarget)}
                title="Highlight color"
                aria-label="Choose highlight color"
                aria-expanded={openPopover === "highlight"}
              >
                <ChevronDown size={11} />
              </button>
            </div>

            <span className="mx-1 h-4 w-px bg-qb-border" aria-hidden="true" />

            <button
              type="button"
              className={`${TOOLBAR_BTN_BASE}${editorState?.bulletList ? ` ${TOOLBAR_BTN_ACTIVE}` : ""}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
              title="Bullet list"
              aria-label="Bullet list"
              aria-pressed={editorState?.bulletList}
            >
              <List size={14} />
            </button>
            <button
              type="button"
              className={`${TOOLBAR_BTN_BASE}${editorState?.orderedList ? ` ${TOOLBAR_BTN_ACTIVE}` : ""}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
              title="Numbered list"
              aria-label="Numbered list"
              aria-pressed={editorState?.orderedList}
            >
              <ListOrdered size={14} />
            </button>

            <span className="mx-1 h-4 w-px bg-qb-border" aria-hidden="true" />

            <button
              type="button"
              className={`${TOOLBAR_BTN_BASE}${openPopover === "math" ? ` ${TOOLBAR_BTN_ACTIVE}` : ""}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => {
                setMathDraft("");
                togglePopover("math", e.currentTarget);
              }}
              title="Insert equation (KaTeX)"
              aria-label="Insert math equation"
              aria-expanded={openPopover === "math"}
            >
              <Sigma size={14} />
            </button>
            <button
              type="button"
              className={TOOLBAR_BTN_BASE}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => clearFormattingSmart(editor)}
              title="Clear formatting"
              aria-label="Clear formatting"
            >
              <RemoveFormatting size={14} />
            </button>
          </div>
        )}

        {/* Highlight Color Picker Popover */}
        {!singleLine && openPopover === "highlight" && (
          <div
            className="qb-rich-popover qb-rich-palette"
            style={{ top: 40, left: popoverLeft, zIndex: 45 }}
            role="menu"
          >
            <div className="qb-rich-popover-label">Highlight Color</div>
            <div className="qb-rich-swatch-row">
              {HIGHLIGHT_SWATCHES.map((sw) => {
                const isCur = editorState?.highlight && editorState.highlightColor === sw.color;
                return (
                  <button
                    key={sw.id}
                    type="button"
                    className={`qb-rich-swatch${isCur ? " is-selected" : ""}`}
                    style={{ backgroundColor: sw.chip }}
                    title={sw.label}
                    aria-label={`Highlight ${sw.label}`}
                    onClick={() => {
                      setActiveHighlightColor(sw.color);
                      setHighlightSmart(editor, sw.color);
                      setOpenPopover(null);
                    }}
                  />
                );
              })}
              <button
                type="button"
                className="qb-rich-swatch is-clear"
                title="Remove highlight"
                aria-label="Remove highlight"
                onClick={() => {
                  editor?.chain().focus().unsetHighlight().run();
                  setOpenPopover(null);
                }}
              >
                <X size={12} />
              </button>
            </div>
          </div>
        )}

        {/* KaTeX Math Equation Popover */}
        {!singleLine && openPopover === "math" && (
          <div
            className="qb-rich-popover qb-rich-math-popover"
            style={{ top: 40, left: popoverLeft, zIndex: 45 }}
          >
            <div className="qb-rich-math-head">
              <span className="qb-rich-popover-label">Insert Equation (KaTeX)</span>
              <div className="qb-rich-math-mode-toggle">
                <button
                  type="button"
                  className={!mathAsBlock ? "is-active" : ""}
                  onClick={() => setMathAsBlock(false)}
                >
                  Inline
                </button>
                <button
                  type="button"
                  className={mathAsBlock ? "is-active" : ""}
                  onClick={() => setMathAsBlock(true)}
                >
                  Block
                </button>
              </div>
            </div>
            <div className="qb-rich-math-chips">
              {MATH_QUICK_SNIPPETS.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  className="qb-rich-math-chip"
                  onClick={() => setMathDraft((prev) => `${prev}${s.insert}`)}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <div className="qb-rich-input-row">
              <input
                type="text"
                className="qb-rich-popover-input"
                placeholder="e.g. \frac{3}{5} \times 100"
                value={mathDraft}
                onChange={(e) => setMathDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleInsertMath(e);
                  }
                }}
                autoFocus
              />
              <button type="button" className="qb-rich-popover-apply" onClick={handleInsertMath}>
                Insert
              </button>
            </div>
            {mathDraft.trim() && (
              <div
                className="qb-rich-math-preview"
                dangerouslySetInnerHTML={{
                  __html: renderKatexHtml(mathDraft, mathAsBlock),
                }}
              />
            )}
          </div>
        )}

        {/* Live WYSIWYG Document Surface */}
        <div
          className={
            singleLine
              ? "overflow-x-auto overflow-y-hidden overscroll-auto [touch-action:pan-x_pan-y]"
              : "overflow-visible md:max-h-[380px] md:overflow-y-auto overscroll-auto touch-pan-y"
          }
          style={{ minHeight: `${resolvedMinHeight}px` }}
          onClick={() => {
            if (editor && !editor.isFocused) {
              editor.commands.focus("end");
            }
          }}
        >
          <EditorContent
            editor={editor}
            className={
              singleLine
                ? "qb-rich-editor-content [&_.ProseMirror]:px-3 [&_.ProseMirror]:py-2 [&_.ProseMirror]:min-h-[40px] [&_.ProseMirror]:text-[15px] [&_.ProseMirror]:leading-[1.45] [&_.ProseMirror]:font-normal [&_.ProseMirror_p]:!my-0 [&_.ProseMirror]:[touch-action:pan-x_pan-y]"
                : "qb-rich-editor-content [&_.ProseMirror]:px-3.5 [&_.ProseMirror]:py-2.5 [&_.ProseMirror]:min-h-[var(--qre-min-h)] [&_.ProseMirror]:text-[15px] [&_.ProseMirror]:leading-[1.6] [&_.ProseMirror]:font-normal [&_.ProseMirror>*:last-child]:mb-0 [&_.ProseMirror]:touch-pan-y"
            }
            style={{
              minHeight: `${resolvedMinHeight}px`,
              ["--qre-min-h" as string]: `${resolvedMinHeight}px`,
            }}
          />
        </div>
      </div>
    );
  }
);

export default QuestionRichEditor;
