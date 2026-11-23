import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Editor, Node as TiptapNode, mergeAttributes } from "@tiptap/core";
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
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import katex from "katex";
import "katex/dist/katex.min.css";
import {
  Undo2,
  Redo2,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Highlighter,
  Code,
  FileCode2,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Minus,
  Link2,
  Unlink,
  RemoveFormatting,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Sigma,
  Search,
  X,
  ArrowUp,
  ArrowDown,
  Replace,
  Check,
  Palette,
} from "lucide-react";
import { editorHtmlToMarkdown, markdownToEditorHtml } from "../../utils/noteRichFormat";
import {
  WordSmartFormattingExtension,
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
  { id: "purple", label: "Violet", color: "rgba(167, 139, 250, 0.30)", chip: "#a78bfa" },
];

const TEXT_COLOR_SWATCHES = [
  { id: "default", label: "Default", color: "", chip: "currentColor" },
  { id: "amber", label: "Amber", color: "#f59e0b", chip: "#f59e0b" },
  { id: "sky", label: "Sky Blue", color: "#0ea5e9", chip: "#0ea5e9" },
  { id: "emerald", label: "Emerald", color: "#10b981", chip: "#10b981" },
  { id: "violet", label: "Violet", color: "#8b5cf6", chip: "#8b5cf6" },
  { id: "rose", label: "Rose", color: "#f43f5e", chip: "#f43f5e" },
  { id: "muted", label: "Muted", color: "#94a3b8", chip: "#94a3b8" },
];

const MATH_QUICK_SNIPPETS = [
  { label: "a/b", insert: "\\frac{a}{b}" },
  { label: "√x", insert: "\\sqrt{x}" },
  { label: "xⁿ", insert: "x^{2}" },
  { label: "×", insert: "\\times " },
  { label: "÷", insert: "\\div " },
  { label: "→", insert: "\\rightarrow " },
  { label: "≤", insert: "\\le " },
  { label: "≥", insert: "\\ge " },
  { label: "≈", insert: "\\approx " },
  { label: "%", insert: "\\%" },
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

/* ── Custom TipTap KaTeX NodeViews ── */
function MathInlineNodeView({ node, updateAttributes, deleteNode, selected, editor }: NodeViewProps) {
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

  const html = useMemo(() => renderKatexHtml(String(node.attrs.latex || ""), false), [node.attrs.latex]);

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
            placeholder="LaTeX e.g. x^2 + y^2"
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
          title={editor.isEditable ? `Formula: ${node.attrs.latex} (click to edit)` : String(node.attrs.latex)}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}
    </NodeViewWrapper>
  );
}

function MathBlockNodeView({ node, updateAttributes, deleteNode, selected, editor }: NodeViewProps) {
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

  const html = useMemo(() => renderKatexHtml(editing ? draft : String(node.attrs.latex || ""), true), [editing, draft, node.attrs.latex]);

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
        <div className="qb-math-block-editor" contentEditable={false} onClick={(e) => e.stopPropagation()}>
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
          <div
            className="qb-math-block-live-preview"
            dangerouslySetInnerHTML={{ __html: html }}
          />
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

const MathInlineExtension = TiptapNode.create({
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
    return ReactNodeViewRenderer(MathInlineNodeView);
  },
});

const MathBlockExtension = TiptapNode.create({
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
    return ReactNodeViewRenderer(MathBlockNodeView);
  },
});

export interface NoteRichEditorProps {
  noteKey: string;
  markdown: string;
  readOnly?: boolean;
  onChangeMarkdown: (nextMarkdown: string) => void;
  onScroll?: (el: HTMLElement) => void;
  editorScrollRef?: React.RefObject<HTMLDivElement>;
}

export default function NoteRichEditor({
  noteKey,
  markdown,
  readOnly = false,
  onChangeMarkdown,
  onScroll,
  editorScrollRef,
}: NoteRichEditorProps) {
  const [activeHighlightColor, setActiveHighlightColor] = useState(HIGHLIGHT_SWATCHES[0].color);
  const [openPopover, setOpenPopover] = useState<
    null | "heading" | "highlight" | "color" | "align" | "link" | "math"
  >(null);
  const [popoverLeft, setPopoverLeft] = useState<number>(8);

  const [linkUrl, setLinkUrl] = useState("");
  const [mathDraft, setMathDraft] = useState("");
  const [mathAsBlock, setMathAsBlock] = useState(false);

  // Find & Replace state
  const [findOpen, setFindOpen] = useState(false);
  const [findQuery, setFindQuery] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [activeMatchIdx, setActiveMatchIdx] = useState(0);

  const [toolbarScroll, setToolbarScroll] = useState({ left: false, right: false });

  const toolbarRef = useRef<HTMLDivElement>(null);
  const toolbarScrollRef = useRef<HTMLDivElement>(null);
  const findInputRef = useRef<HTMLInputElement>(null);
  const lastEmittedMdRef = useRef<string>(markdown);
  const lastLoadedKeyRef = useRef<string>(noteKey);

  const updateToolbarScroll = useCallback(() => {
    const el = toolbarScrollRef.current;
    if (!el) {
      setToolbarScroll({ left: false, right: false });
      return;
    }
    const maxScrollLeft = el.scrollWidth - el.clientWidth;
    const nextLeft = el.scrollLeft > 4;
    const nextRight = maxScrollLeft > 4 && el.scrollLeft < maxScrollLeft - 4;
    setToolbarScroll((prev) =>
      prev.left === nextLeft && prev.right === nextRight
        ? prev
        : { left: nextLeft, right: nextRight }
    );
  }, []);

  const scrollToolbarBy = (direction: "left" | "right") => {
    const el = toolbarScrollRef.current;
    if (!el) return;
    const step = Math.max(140, Math.round(el.clientWidth * 0.65));
    el.scrollBy({
      left: direction === "right" ? step : -step,
      behavior: "smooth",
    });
  };

  const togglePopover = (
    kind: "heading" | "highlight" | "color" | "align" | "link" | "math",
    triggerEl?: HTMLElement | null
  ) => {
    setOpenPopover((prev) => {
      if (prev === kind) return null;
      if (triggerEl && toolbarRef.current) {
        const wrapRect = toolbarRef.current.getBoundingClientRect();
        const btnRect = triggerEl.getBoundingClientRect();
        const desiredWidth =
          kind === "math"
            ? 310
            : kind === "link"
              ? 290
              : kind === "highlight" || kind === "color"
                ? 228
                : 170;
        const estimatedWidth = Math.min(Math.max(140, wrapRect.width - 16), desiredWidth);
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
        heading: { levels: [1, 2, 3] },
        link: {
          openOnClick: false,
          autolink: true,
          defaultProtocol: "https",
        },
      }),
      Highlight.configure({ multicolor: true }),
      TaskList,
      TaskItem.configure({
        nested: true,
        onReadOnlyChecked: () => true,
      }),
      TextStyle,
      Color,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Placeholder.configure({
        placeholder: "Start writing your study note... Highlight text to format or use the toolbar above.",
      }),
      WordSmartFormattingExtension,
      MathInlineExtension,
      MathBlockExtension,
    ],
    content: markdownToEditorHtml(markdown),
    editable: !readOnly,
    onUpdate: ({ editor: ed }) => {
      const nextMd = editorHtmlToMarkdown(ed.getHTML());
      lastEmittedMdRef.current = nextMd;
      onChangeMarkdown(nextMd);
    },
  });

  // Sync readOnly toggle
  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!readOnly);
    if (readOnly) {
      setOpenPopover(null);
      setFindOpen(false);
    }
  }, [editor, readOnly]);

  // Sync external note changes or Markdown source edits into TipTap without triggering loops
  useEffect(() => {
    if (!editor) return;
    const keyChanged = noteKey !== lastLoadedKeyRef.current;
    const externalMdChanged = markdown !== lastEmittedMdRef.current;
    if (keyChanged || externalMdChanged) {
      lastLoadedKeyRef.current = noteKey;
      lastEmittedMdRef.current = markdown;
      editor.commands.setContent(markdownToEditorHtml(markdown), { emitUpdate: false });
      setOpenPopover(null);
    }
  }, [editor, noteKey, markdown]);

  // Close popovers on outside click / Escape; support Ctrl/Cmd+F and Ctrl/Cmd+K
  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setOpenPopover(null);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (readOnly) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "f") {
        if (editor?.isFocused || toolbarRef.current?.contains(document.activeElement)) {
          e.preventDefault();
          setFindOpen(true);
          setTimeout(() => findInputRef.current?.focus(), 0);
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        if (editor?.isFocused) {
          e.preventDefault();
          const currentHref = editor.getAttributes("link")?.href || "";
          setLinkUrl(currentHref);
          setOpenPopover((prev) => (prev === "link" ? null : "link"));
        }
      } else if (e.key === "Escape") {
        setOpenPopover(null);
      }
    };

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [editor, readOnly]);

  useEffect(() => {
    if (readOnly) {
      setToolbarScroll({ left: false, right: false });
      return;
    }
    const el = toolbarScrollRef.current;
    if (!el) return;

    updateToolbarScroll();
    const rafId = window.requestAnimationFrame(updateToolbarScroll);

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(updateToolbarScroll);
      ro.observe(el);
    }
    window.addEventListener("resize", updateToolbarScroll);

    return () => {
      window.cancelAnimationFrame(rafId);
      ro?.disconnect();
      window.removeEventListener("resize", updateToolbarScroll);
    };
  }, [readOnly, editor, updateToolbarScroll]);

  const editorState = useEditorState({
    editor,
    selector: (ctx) => {
      const ed = ctx.editor;
      if (!ed) {
        return {
          canUndo: false,
          canRedo: false,
          bold: false,
          italic: false,
          underline: false,
          strike: false,
          code: false,
          codeBlock: false,
          highlight: false,
          highlightColor: "",
          textColor: "",
          bulletList: false,
          orderedList: false,
          taskList: false,
          blockquote: false,
          link: false,
          headingLevel: 0,
          align: "left",
        };
      }
      const align = ed.isActive({ textAlign: "center" })
        ? "center"
        : ed.isActive({ textAlign: "right" })
          ? "right"
          : ed.isActive({ textAlign: "justify" })
            ? "justify"
            : "left";
      const headingLevel = ed.isActive("heading", { level: 1 })
        ? 1
        : ed.isActive("heading", { level: 2 })
          ? 2
          : ed.isActive("heading", { level: 3 })
            ? 3
            : 0;
      return {
        canUndo: ed.can().undo(),
        canRedo: ed.can().redo(),
        bold: ed.isActive("bold"),
        italic: ed.isActive("italic"),
        underline: ed.isActive("underline"),
        strike: ed.isActive("strike"),
        code: ed.isActive("code"),
        codeBlock: ed.isActive("codeBlock"),
        highlight: ed.isActive("highlight"),
        highlightColor: ed.getAttributes("highlight")?.color || "",
        textColor: ed.getAttributes("textStyle")?.color || "",
        bulletList: ed.isActive("bulletList"),
        orderedList: ed.isActive("orderedList"),
        taskList: ed.isActive("taskList"),
        blockquote: ed.isActive("blockquote"),
        link: ed.isActive("link"),
        headingLevel,
        align,
      };
    },
  });

  // Compute text matches in ProseMirror doc for Find & Replace
  const findMatches = useMemo(() => {
    if (!editor || !findOpen || !findQuery.trim()) return [] as Array<{ from: number; to: number }>;
    const q = findQuery.toLowerCase();
    const matches: Array<{ from: number; to: number }> = [];
    editor.state.doc.descendants((node, pos) => {
      if (!node.isText || !node.text) return;
      const lower = node.text.toLowerCase();
      let idx = 0;
      while ((idx = lower.indexOf(q, idx)) !== -1) {
        matches.push({ from: pos + idx, to: pos + idx + q.length });
        idx += q.length;
      }
    });
    return matches;
  }, [editor, findOpen, findQuery, markdown]);

  useEffect(() => {
    if (findMatches.length === 0) {
      setActiveMatchIdx(0);
    } else if (activeMatchIdx >= findMatches.length) {
      setActiveMatchIdx(0);
    }
  }, [findMatches.length, activeMatchIdx]);

  const jumpToMatch = (nextIdx: number) => {
    if (!editor || findMatches.length === 0) return;
    const wrapped = (nextIdx + findMatches.length) % findMatches.length;
    setActiveMatchIdx(wrapped);
    const m = findMatches[wrapped];
    editor.chain().focus().setTextSelection({ from: m.from, to: m.to }).scrollIntoView().run();
  };

  const handleReplaceCurrent = () => {
    if (!editor || findMatches.length === 0) return;
    const m = findMatches[activeMatchIdx] || findMatches[0];
    editor
      .chain()
      .focus()
      .insertContentAt({ from: m.from, to: m.to }, replaceText)
      .run();
  };

  const handleReplaceAll = () => {
    if (!editor || findMatches.length === 0) return;
    const tr = editor.state.tr;
    // Apply backwards so positions remain valid
    for (let i = findMatches.length - 1; i >= 0; i--) {
      const m = findMatches[i];
      tr.insertText(replaceText, m.from, m.to);
    }
    editor.view.dispatch(tr);
    editor.commands.focus();
  };

  const handleApplyLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editor) return;
    const trimmed = linkUrl.trim();
    if (!trimmed) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      setOpenPopover(null);
      return;
    }
    const normalized =
      /^https?:\/\//i.test(trimmed) || /^mailto:/i.test(trimmed) || trimmed.startsWith("/") || trimmed.startsWith("#")
        ? trimmed
        : `https://${trimmed}`;
    editor.chain().focus().extendMarkRange("link").setLink({ href: normalized }).run();
    setOpenPopover(null);
  };

  const handleInsertMath = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editor) return;
    const latex = mathDraft.trim();
    if (!latex) return;
    if (mathAsBlock) {
      editor.chain().focus().insertContent({ type: "mathBlock", attrs: { latex } }).run();
    } else {
      editor.chain().focus().insertContent({ type: "mathInline", attrs: { latex } }).run();
    }
    setMathDraft("");
    setOpenPopover(null);
  };

  if (!editor) return null;

  const headingLabel =
    editorState?.headingLevel === 1
      ? "H1"
      : editorState?.headingLevel === 2
        ? "H2"
        : editorState?.headingLevel === 3
          ? "H3"
          : "Text";

  const activeAlignIcon =
    editorState?.align === "center" ? (
      <AlignCenter size={15} />
    ) : editorState?.align === "right" ? (
      <AlignRight size={15} />
    ) : editorState?.align === "justify" ? (
      <AlignJustify size={15} />
    ) : (
      <AlignLeft size={15} />
    );

  const activeHighlightIndicator = editorState?.highlightColor || activeHighlightColor;

  return (
    <div className={`qb-rich-editor-root${readOnly ? " is-readonly" : ""}`}>
      {!readOnly && (
        <div className="qb-rich-toolbar-wrap" ref={toolbarRef}>
          <div className="qb-rich-toolbar-scroll-shell">
            {toolbarScroll.left && (
              <button
                type="button"
                className="qb-rich-scroll-arrow is-left"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => scrollToolbarBy("left")}
                aria-label="Scroll formatting tools left"
                title="Scroll tools left"
              >
                <ChevronLeft size={16} />
              </button>
            )}
            <div
              ref={toolbarScrollRef}
              className="qb-rich-toolbar"
              role="toolbar"
              aria-label="Rich text formatting tools"
              onScroll={updateToolbarScroll}
            >
            {/* 1. Undo / Redo */}
            <div className="qb-note-fmt-group">
              <button
                type="button"
                className="qb-note-fmt-btn"
                onClick={() => editor.chain().focus().undo().run()}
                disabled={!editorState?.canUndo}
                title="Undo (Ctrl/Cmd + Z)"
                aria-label="Undo"
              >
                <Undo2 size={15} />
              </button>
              <button
                type="button"
                className="qb-note-fmt-btn"
                onClick={() => editor.chain().focus().redo().run()}
                disabled={!editorState?.canRedo}
                title="Redo (Ctrl/Cmd + Shift + Z)"
                aria-label="Redo"
              >
                <Redo2 size={15} />
              </button>
            </div>

            <div className="qb-note-fmt-sep" />

            {/* 2. Text Hierarchy (Paragraph / H1 / H2 / H3) */}
            <div className="qb-note-fmt-group">
              <button
                type="button"
                className={`qb-note-fmt-btn qb-rich-dropdown-btn${editorState?.headingLevel ? " is-active" : ""}${openPopover === "heading" ? " is-open" : ""}`}
                onClick={(e) => togglePopover("heading", e.currentTarget)}
                title="Text style & headings"
                aria-expanded={openPopover === "heading"}
              >
                <span className="qb-rich-heading-tag">{headingLabel}</span>
                <ChevronDown size={12} className="qb-rich-chevron" />
              </button>
            </div>

            <div className="qb-note-fmt-sep" />

            {/* 3. Inline Formatting */}
            <div className="qb-note-fmt-group">
              <button
                type="button"
                className={`qb-note-fmt-btn${editorState?.bold ? " is-active" : ""}`}
                onClick={() => toggleMarkSmart(editor, "bold")}
                title="Bold (Ctrl/Cmd + B)"
                aria-label="Bold"
                aria-pressed={editorState?.bold}
              >
                <Bold size={15} />
              </button>
              <button
                type="button"
                className={`qb-note-fmt-btn${editorState?.italic ? " is-active" : ""}`}
                onClick={() => toggleMarkSmart(editor, "italic")}
                title="Italic (Ctrl/Cmd + I)"
                aria-label="Italic"
                aria-pressed={editorState?.italic}
              >
                <Italic size={15} />
              </button>
              <button
                type="button"
                className={`qb-note-fmt-btn${editorState?.underline ? " is-active" : ""}`}
                onClick={() => toggleMarkSmart(editor, "underline")}
                title="Underline (Ctrl/Cmd + U)"
                aria-label="Underline"
                aria-pressed={editorState?.underline}
              >
                <Underline size={15} />
              </button>
              <button
                type="button"
                className={`qb-note-fmt-btn${editorState?.strike ? " is-active" : ""}`}
                onClick={() => toggleMarkSmart(editor, "strike")}
                title="Strikethrough (Ctrl/Cmd + Shift + S)"
                aria-label="Strikethrough"
                aria-pressed={editorState?.strike}
              >
                <Strikethrough size={15} />
              </button>
              <button
                type="button"
                className={`qb-note-fmt-btn${editorState?.code ? " is-active" : ""}`}
                onClick={() => editor.chain().focus().toggleCode().run()}
                title="Inline Code (Ctrl/Cmd + E)"
                aria-label="Inline code"
                aria-pressed={editorState?.code}
              >
                <Code size={15} />
              </button>
            </div>

            <div className="qb-note-fmt-sep" />

            {/* 4. Highlighter & Text Color */}
            <div className="qb-note-fmt-group">
              <div className="qb-rich-split-btn">
                <button
                  type="button"
                  className={`qb-note-fmt-btn qb-rich-split-main${editorState?.highlight ? " is-active" : ""}`}
                  onClick={() => toggleHighlightSmart(editor, activeHighlightColor)}
                  title="Highlight text"
                  aria-label="Highlight text"
                  aria-pressed={editorState?.highlight}
                >
                  <Highlighter size={14} />
                  <span
                    className="qb-rich-color-bar"
                    style={{ backgroundColor: activeHighlightIndicator }}
                  />
                </button>
                <button
                  type="button"
                  className={`qb-note-fmt-btn qb-rich-split-caret${openPopover === "highlight" ? " is-open" : ""}`}
                  onClick={(e) => togglePopover("highlight", e.currentTarget)}
                  title="Choose highlight color"
                  aria-label="Choose highlight color"
                  aria-expanded={openPopover === "highlight"}
                >
                  <ChevronDown size={11} className="qb-rich-chevron" />
                </button>
              </div>

              <button
                type="button"
                className={`qb-note-fmt-btn qb-rich-color-btn${editorState?.textColor ? " is-active" : ""}`}
                onClick={(e) => togglePopover("color", e.currentTarget)}
                title="Text color"
                aria-label="Text color"
                aria-expanded={openPopover === "color"}
              >
                <Palette size={14} />
                {editorState?.textColor && (
                  <span
                    className="qb-rich-color-bar"
                    style={{ backgroundColor: editorState.textColor }}
                  />
                )}
              </button>
            </div>

            <div className="qb-note-fmt-sep" />

            {/* 5. Lists & Checklists */}
            <div className="qb-note-fmt-group">
              <button
                type="button"
                className={`qb-note-fmt-btn${editorState?.bulletList ? " is-active" : ""}`}
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                title="Bullet list"
                aria-label="Bullet list"
                aria-pressed={editorState?.bulletList}
              >
                <List size={15} />
              </button>
              <button
                type="button"
                className={`qb-note-fmt-btn${editorState?.orderedList ? " is-active" : ""}`}
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                title="Numbered list"
                aria-label="Numbered list"
                aria-pressed={editorState?.orderedList}
              >
                <ListOrdered size={15} />
              </button>
              <button
                type="button"
                className={`qb-note-fmt-btn${editorState?.taskList ? " is-active" : ""}`}
                onClick={() => editor.chain().focus().toggleTaskList().run()}
                title="Interactive checklist"
                aria-label="Checklist"
                aria-pressed={editorState?.taskList}
              >
                <CheckSquare size={15} />
              </button>
            </div>

            <div className="qb-note-fmt-sep" />

            {/* 6. Quote, Code Block, Divider, Link, Math */}
            <div className="qb-note-fmt-group">
              <button
                type="button"
                className={`qb-note-fmt-btn${editorState?.blockquote ? " is-active" : ""}`}
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                title="Quote / Callout"
                aria-label="Blockquote"
                aria-pressed={editorState?.blockquote}
              >
                <Quote size={14} />
              </button>
              <button
                type="button"
                className={`qb-note-fmt-btn${editorState?.codeBlock ? " is-active" : ""}`}
                onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                title="Code block"
                aria-label="Code block"
                aria-pressed={editorState?.codeBlock}
              >
                <FileCode2 size={14} />
              </button>
              <button
                type="button"
                className="qb-note-fmt-btn"
                onClick={() => editor.chain().focus().setHorizontalRule().run()}
                title="Insert horizontal divider"
                aria-label="Insert divider"
              >
                <Minus size={14} />
              </button>
              <button
                type="button"
                className={`qb-note-fmt-btn${editorState?.link ? " is-active" : ""}`}
                onClick={(e) => {
                  const href = editor.getAttributes("link")?.href || "";
                  setLinkUrl(href);
                  togglePopover("link", e.currentTarget);
                }}
                title="Insert or edit link (Ctrl/Cmd + K)"
                aria-label="Insert link"
                aria-pressed={editorState?.link}
              >
                <Link2 size={14} />
              </button>
              <button
                type="button"
                className="qb-note-fmt-btn qb-note-fmt-math"
                onClick={(e) => {
                  setMathDraft("");
                  togglePopover("math", e.currentTarget);
                }}
                title="Insert KaTeX math equation"
                aria-label="Insert math formula"
              >
                <Sigma size={14} />
              </button>
            </div>

            <div className="qb-note-fmt-sep" />

            {/* 7. Alignment, Clear Formatting, Find & Replace */}
            <div className="qb-note-fmt-group">
              <button
                type="button"
                className={`qb-note-fmt-btn${editorState?.align !== "left" ? " is-active" : ""}`}
                onClick={(e) => togglePopover("align", e.currentTarget)}
                title="Text alignment"
                aria-label="Text alignment"
                aria-expanded={openPopover === "align"}
              >
                {activeAlignIcon}
              </button>
              <button
                type="button"
                className="qb-note-fmt-btn"
                onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
                title="Clear formatting"
                aria-label="Clear formatting"
              >
                <RemoveFormatting size={14} />
              </button>
              <button
                type="button"
                className={`qb-note-fmt-btn${findOpen ? " is-active" : ""}`}
                onClick={() => {
                  setFindOpen((prev) => {
                    const next = !prev;
                    if (next) setTimeout(() => findInputRef.current?.focus(), 0);
                    return next;
                  });
                }}
                title="Find & Replace (Ctrl/Cmd + F)"
                aria-label="Find and replace"
                aria-pressed={findOpen}
              >
                <Search size={14} />
              </button>
            </div>
            </div>
            {toolbarScroll.right && (
              <button
                type="button"
                className="qb-rich-scroll-arrow is-right"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => scrollToolbarBy("right")}
                aria-label="Scroll formatting tools right"
                title="More formatting tools"
              >
                <ChevronRight size={16} />
              </button>
            )}
          </div>

          {/* Floating Popovers rendered outside scrolling toolbar so nothing ever clips */}
          {openPopover === "heading" && (
            <div className="qb-rich-popover qb-rich-menu" style={{ left: popoverLeft }} role="menu">
              <button
                type="button"
                className={`qb-rich-menu-item${editorState?.headingLevel === 0 ? " is-active" : ""}`}
                onClick={() => {
                  editor.chain().focus().setParagraph().run();
                  setOpenPopover(null);
                }}
              >
                <span className="qb-rich-preview-body">Normal Text</span>
              </button>
              <button
                type="button"
                className={`qb-rich-menu-item${editorState?.headingLevel === 1 ? " is-active" : ""}`}
                onClick={() => {
                  editor.chain().focus().toggleHeading({ level: 1 }).run();
                  setOpenPopover(null);
                }}
              >
                <span className="qb-rich-preview-h1">Heading 1</span>
              </button>
              <button
                type="button"
                className={`qb-rich-menu-item${editorState?.headingLevel === 2 ? " is-active" : ""}`}
                onClick={() => {
                  editor.chain().focus().toggleHeading({ level: 2 }).run();
                  setOpenPopover(null);
                }}
              >
                <span className="qb-rich-preview-h2">Heading 2</span>
              </button>
              <button
                type="button"
                className={`qb-rich-menu-item${editorState?.headingLevel === 3 ? " is-active" : ""}`}
                onClick={() => {
                  editor.chain().focus().toggleHeading({ level: 3 }).run();
                  setOpenPopover(null);
                }}
              >
                <span className="qb-rich-preview-h3">Heading 3</span>
              </button>
            </div>
          )}

          {openPopover === "highlight" && (
            <div className="qb-rich-popover qb-rich-palette" style={{ left: popoverLeft }} role="menu">
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
                    editor.chain().focus().unsetHighlight().run();
                    setOpenPopover(null);
                  }}
                >
                  <X size={12} />
                </button>
              </div>
            </div>
          )}

          {openPopover === "color" && (
            <div className="qb-rich-popover qb-rich-palette" style={{ left: popoverLeft }} role="menu">
              <div className="qb-rich-popover-label">Text Color</div>
              <div className="qb-rich-swatch-row">
                {TEXT_COLOR_SWATCHES.map((sw) => {
                  const isCur = (editorState?.textColor || "") === sw.color;
                  return (
                    <button
                      key={sw.id}
                      type="button"
                      className={`qb-rich-swatch${sw.id === "default" ? " is-default" : ""}${isCur ? " is-selected" : ""}`}
                      style={sw.id === "default" ? undefined : { backgroundColor: sw.chip }}
                      title={sw.label}
                      aria-label={`Text color ${sw.label}`}
                      onClick={() => {
                        if (!sw.color) {
                          editor.chain().focus().unsetColor().run();
                        } else {
                          editor.chain().focus().setColor(sw.color).run();
                        }
                        setOpenPopover(null);
                      }}
                    >
                      {sw.id === "default" ? "A" : null}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {openPopover === "link" && (
            <form
              className="qb-rich-popover qb-rich-form-popover"
              style={{ left: popoverLeft }}
              onSubmit={handleApplyLink}
            >
              <div className="qb-rich-popover-label">Insert Link</div>
              <div className="qb-rich-input-row">
                <input
                  type="url"
                  className="qb-rich-popover-input"
                  placeholder="https://example.com"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  autoFocus
                />
                <button type="submit" className="qb-rich-popover-apply">
                  Apply
                </button>
                {editorState?.link && (
                  <button
                    type="button"
                    className="qb-rich-popover-icon-btn"
                    onClick={() => {
                      editor.chain().focus().unsetLink().run();
                      setOpenPopover(null);
                    }}
                    title="Remove link"
                    aria-label="Remove link"
                  >
                    <Unlink size={13} />
                  </button>
                )}
              </div>
            </form>
          )}

          {openPopover === "math" && (
            <form
              className="qb-rich-popover qb-rich-math-popover"
              style={{ left: popoverLeft }}
              onSubmit={handleInsertMath}
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
                  placeholder="e.g. \frac{1}{a} + \frac{1}{b} = \frac{1}{T}"
                  value={mathDraft}
                  onChange={(e) => setMathDraft(e.target.value)}
                  autoFocus
                />
                <button type="submit" className="qb-rich-popover-apply">
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
            </form>
          )}

          {openPopover === "align" && (
            <div
              className="qb-rich-popover qb-rich-align-popover"
              style={{ left: popoverLeft }}
              role="menu"
            >
              <button
                type="button"
                className={`qb-note-fmt-btn${editorState?.align === "left" ? " is-active" : ""}`}
                onClick={() => {
                  editor.chain().focus().setTextAlign("left").run();
                  setOpenPopover(null);
                }}
                title="Align left"
                aria-label="Align left"
              >
                <AlignLeft size={15} />
              </button>
              <button
                type="button"
                className={`qb-note-fmt-btn${editorState?.align === "center" ? " is-active" : ""}`}
                onClick={() => {
                  editor.chain().focus().setTextAlign("center").run();
                  setOpenPopover(null);
                }}
                title="Align center"
                aria-label="Align center"
              >
                <AlignCenter size={15} />
              </button>
              <button
                type="button"
                className={`qb-note-fmt-btn${editorState?.align === "right" ? " is-active" : ""}`}
                onClick={() => {
                  editor.chain().focus().setTextAlign("right").run();
                  setOpenPopover(null);
                }}
                title="Align right"
                aria-label="Align right"
              >
                <AlignRight size={15} />
              </button>
              <button
                type="button"
                className={`qb-note-fmt-btn${editorState?.align === "justify" ? " is-active" : ""}`}
                onClick={() => {
                  editor.chain().focus().setTextAlign("justify").run();
                  setOpenPopover(null);
                }}
                title="Justify"
                aria-label="Justify"
              >
                <AlignJustify size={15} />
              </button>
            </div>
          )}

          {/* Inline Find & Replace Strip */}
          {findOpen && (
            <div className="qb-rich-find-bar">
              <div className="qb-rich-find-group">
                <Search size={13} className="qb-rich-find-ico" />
                <input
                  ref={findInputRef}
                  type="text"
                  className="qb-rich-find-input"
                  placeholder="Find in note..."
                  value={findQuery}
                  onChange={(e) => {
                    setFindQuery(e.target.value);
                    setActiveMatchIdx(0);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      jumpToMatch(e.shiftKey ? activeMatchIdx - 1 : activeMatchIdx + 1);
                    } else if (e.key === "Escape") {
                      setFindOpen(false);
                    }
                  }}
                />
                <span className="qb-rich-find-count tabular-nums">
                  {findQuery.trim()
                    ? findMatches.length > 0
                      ? `${activeMatchIdx + 1}/${findMatches.length}`
                      : "0/0"
                    : ""}
                </span>
                <button
                  type="button"
                  className="qb-rich-find-nav-btn"
                  onClick={() => jumpToMatch(activeMatchIdx - 1)}
                  disabled={findMatches.length === 0}
                  title="Previous match"
                >
                  <ArrowUp size={13} />
                </button>
                <button
                  type="button"
                  className="qb-rich-find-nav-btn"
                  onClick={() => jumpToMatch(activeMatchIdx + 1)}
                  disabled={findMatches.length === 0}
                  title="Next match"
                >
                  <ArrowDown size={13} />
                </button>
              </div>

              <div className="qb-rich-find-group">
                <Replace size={13} className="qb-rich-find-ico" />
                <input
                  type="text"
                  className="qb-rich-find-input"
                  placeholder="Replace with..."
                  value={replaceText}
                  onChange={(e) => setReplaceText(e.target.value)}
                />
                <button
                  type="button"
                  className="qb-rich-find-action-btn"
                  onClick={handleReplaceCurrent}
                  disabled={findMatches.length === 0}
                >
                  Replace
                </button>
                <button
                  type="button"
                  className="qb-rich-find-action-btn"
                  onClick={handleReplaceAll}
                  disabled={findMatches.length === 0}
                >
                  All
                </button>
                <button
                  type="button"
                  className="qb-rich-find-nav-btn"
                  onClick={() => setFindOpen(false)}
                  title="Close find bar"
                  aria-label="Close find and replace"
                >
                  <X size={13} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Rich Text Scrollable Surface */}
      <div
        ref={editorScrollRef}
        className="qb-rich-editor-scroll"
        onScroll={(e) => onScroll?.(e.currentTarget)}
      >
        <EditorContent editor={editor} className="qb-rich-editor-content" />
      </div>
    </div>
  );
}
