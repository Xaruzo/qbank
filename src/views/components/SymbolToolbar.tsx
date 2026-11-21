import { useEffect, useRef, useState } from "react";
import type React from "react";
import { ChevronDown } from "lucide-react";
import {
  ARITHMETIC_SYMBOLS,
  COMMON_FRACTIONS,
  MORE_FRACTIONS,
  CURRENCY_SYMBOLS,
  MATH_SYMBOLS,
  FRACTION_TEMPLATE,
} from "../../constants/mathSymbols";
import { insertAtCursor } from "../../utils/insertAtCursor";
import type { QuestionRichEditorHandle } from "./QuestionRichEditor";

function SymbolButton({ symbol, title, onClick }) {
  return (
    <button
      type="button"
      className="sym-tb-btn"
      title={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => onClick(symbol)}
    >
      {symbol}
    </button>
  );
}

interface SymbolToolbarProps {
  targetRef?: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
  richEditorRef?: React.RefObject<QuestionRichEditorHandle | null>;
  value?: string;
  onChange?: (next: string) => void;
  disabled?: boolean;
  showInlineFormats?: boolean;
  isBoldActive?: boolean;
  isItalicActive?: boolean;
  isUnderlineActive?: boolean;
}

export default function SymbolToolbar({
  targetRef,
  richEditorRef,
  value = "",
  onChange,
  disabled = false,
  showInlineFormats = false,
  isBoldActive = false,
  isItalicActive = false,
  isUnderlineActive = false,
}: SymbolToolbarProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!moreOpen) return;
    const handle = (e) => {
      if (moreRef.current?.contains(e.target)) return;
      setMoreOpen(false);
    };
    window.addEventListener("mousedown", handle);
    return () => window.removeEventListener("mousedown", handle);
  }, [moreOpen]);

  const insert = (text: string, cursorOffset?: number, selectLength = 0) => {
    if (disabled) return;
    if (richEditorRef?.current) {
      richEditorRef.current.insertText(text, cursorOffset, selectLength);
      return;
    }
    const el = targetRef?.current;
    if (!el || !onChange) return;
    insertAtCursor(el, text, value ?? "", onChange, cursorOffset, selectLength);
  };

  const insertUnderline = () => {
    if (disabled) return;
    if (richEditorRef?.current) {
      richEditorRef.current.toggleUnderline();
      return;
    }
    const el = targetRef?.current;
    if (!el || !onChange) return;
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? start;
    if (start !== end) {
      const selected = value.slice(start, end);
      const newValue = value.slice(0, start) + "++" + selected + "++" + value.slice(end);
      onChange(newValue);
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(start + 2, end + 2);
      });
    } else {
      insertAtCursor(el, "++text++", value ?? "", onChange, 2, 4);
    }
  };

  const activeFormatClass =
    " !border-amber-500/60 !bg-amber-500/18 !text-amber-400 light:!border-amber-600/50 light:!bg-amber-100 light:!text-amber-700";

  return (
    <div className={`sym-tb${disabled ? " sym-tb-off" : ""}`}>
      <span className="sym-tb-label">Insert</span>

      <div className="sym-tb-group">
        {ARITHMETIC_SYMBOLS.map(({ symbol, title }) => (
          <SymbolButton key={symbol} symbol={symbol} title={title} onClick={(s) => insert(s)} />
        ))}
      </div>

      {showInlineFormats && (
        <>
          <div className="sym-tb-group">
            {richEditorRef && (
              <>
                <button
                  type="button"
                  className={`sym-tb-btn${isBoldActive ? activeFormatClass : ""}`}
                  title="Bold (Ctrl+B)"
                  aria-pressed={isBoldActive}
                  style={{ fontWeight: 800, fontFamily: "Arial, sans-serif", fontSize: 15 }}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    if (!disabled) richEditorRef.current?.toggleBold();
                  }}
                >
                  B
                </button>
                <button
                  type="button"
                  className={`sym-tb-btn${isItalicActive ? activeFormatClass : ""}`}
                  title="Italic (Ctrl+I)"
                  aria-pressed={isItalicActive}
                  style={{ fontStyle: "italic", fontFamily: "Georgia, serif", fontSize: 15 }}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    if (!disabled) richEditorRef.current?.toggleItalic();
                  }}
                >
                  I
                </button>
              </>
            )}
            <button
              type="button"
              className={`sym-tb-btn${isUnderlineActive ? activeFormatClass : ""}`}
              title="Underline (Ctrl+U)"
              aria-pressed={richEditorRef ? isUnderlineActive : undefined}
              style={{ textDecoration: "underline", fontFamily: "Arial, sans-serif", fontSize: 15 }}
              onMouseDown={(e) => e.preventDefault()}
              onClick={insertUnderline}
            >
              U
            </button>
          </div>

          <div className="sym-tb-sep" />
        </>
      )}

      <div className="sym-tb-group">
        {COMMON_FRACTIONS.map(({ symbol, title }) => (
          <SymbolButton key={symbol} symbol={symbol} title={title} onClick={(s) => insert(s)} />
        ))}
        <div className="sym-tb-more" ref={moreRef}>
          <button
            type="button"
            className={`sym-tb-btn sym-tb-more-btn${moreOpen ? " on" : ""}`}
            title="More fractions"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setMoreOpen((o) => !o)}
            aria-expanded={moreOpen}
          >
            <ChevronDown size={14} className={`sym-tb-chevron qb-select-chevron${moreOpen ? " is-open" : ""}`} />
          </button>
          {moreOpen && (
            <div className="sym-tb-menu">
              {MORE_FRACTIONS.map(({ symbol, title }) => (
                <button
                  key={symbol}
                  type="button"
                  className="sym-tb-menu-item"
                  title={title}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    insert(symbol);
                    setMoreOpen(false);
                  }}
                >
                  {symbol}
                </button>
              ))}
              <button
                type="button"
                className="sym-tb-menu-item sym-tb-menu-template"
                title={FRACTION_TEMPLATE.title}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  insert(FRACTION_TEMPLATE.text, FRACTION_TEMPLATE.cursorOffset, FRACTION_TEMPLATE.selectLength);
                  setMoreOpen(false);
                }}
              >
                0/0
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="sym-tb-sep" />

      <div className="sym-tb-group">
        {CURRENCY_SYMBOLS.map(({ symbol, title }) => (
          <SymbolButton key={symbol} symbol={symbol} title={title} onClick={(s) => insert(s)} />
        ))}
      </div>

      <div className="sym-tb-sep" />

      <div className="sym-tb-group">
        {MATH_SYMBOLS.map(({ symbol, title }) => (
          <SymbolButton key={symbol} symbol={symbol} title={title} onClick={(s) => insert(s)} />
        ))}
      </div>
    </div>
  );
}
