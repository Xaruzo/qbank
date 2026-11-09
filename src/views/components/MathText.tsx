import React, { useMemo } from "react";
import { parseMathText } from "../../utils/parseMathText";

function Fraction({ num, den }) {
  return (
    <span className="math-frac" aria-label={`${num}/${den}`}>
      <span className="math-frac-num">{num}</span>
      <span className="math-frac-bar" aria-hidden="true" />
      <span className="math-frac-den">{den}</span>
    </span>
  );
}

export default function MathText({ text }) {
  const parts = useMemo(() => parseMathText(text), [text]);

  return (
    <>
      {parts.map((part, i) => {
        if (part.type === "text") return <React.Fragment key={i}>{part.value}</React.Fragment>;
        if (part.type === "frac") return <Fraction key={i} num={part.num} den={part.den} />;
        if (part.type === "vulgar") return <span key={i} className="math-vulgar">{part.value}</span>;
        return null;
      })}
    </>
  );
}
