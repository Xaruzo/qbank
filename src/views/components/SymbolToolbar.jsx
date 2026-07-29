import React, { useEffect, useRef, useState } from "react";
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

export default function SymbolToolbar({ targetRef, value, onChange, disabled }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef(null);

  useEffect(() => {
    if (!moreOpen) return;
    const handle = (e) => {
      if (moreRef.current?.contains(e.target)) return;
      setMoreOpen(false);
    };
    window.addEventListener("mousedown", handle);
    return () => window.removeEventListener("mousedown", handle);
  }, [moreOpen]);

  const insert = (text, cursorOffset, selectLength = 0) => {
    if (disabled) return;
    const el = targetRef?.current;
    if (!el) return;
    insertAtCursor(el, text, value ?? "", onChange, cursorOffset, selectLength);
  };

  const insertUnderline = () => {
    if (disabled) return;
    const el = targetRef?.current;
    if (!el) return;
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

  return (
    <div className={`sym-tb${disabled ? " sym-tb-off" : ""}`}>
      <span className="sym-tb-label">Insert</span>

      <div className="sym-tb-group">
        {ARITHMETIC_SYMBOLS.map(({ symbol, title }) => (
          <SymbolButton key={symbol} symbol={symbol} title={title} onClick={(s) => insert(s)} />
        ))}
      </div>

      <div className="sym-tb-sep" />

      <div className="sym-tb-group">
        <button
          type="button"
          className="sym-tb-btn"
          title="Underline"
          style={{ textDecoration: "underline", fontFamily: "Arial, sans-serif", fontSize: 15 }}
          onMouseDown={(e) => e.preventDefault()}
          onClick={insertUnderline}
        >
          U
        </button>
      </div>

      <div className="sym-tb-sep" />

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
          >
            <ChevronDown size={14} />
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
