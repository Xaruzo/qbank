import React from "react";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import remarkUnderline from "../../utils/remarkUnderline";
import MathText from "./MathText";

function mergeClassNames(...names) {
  return names.filter(Boolean).join(" ");
}

function renderMathChildren(children) {
  return React.Children.map(children, (child, index) => {
    if (typeof child === "string") {
      return <MathText key={`math-${index}`} text={child} />;
    }

    if (!React.isValidElement(child)) {
      return child;
    }

    const className = child.props?.className;
    if (typeof className === "string" && className.includes("katex")) {
      return child;
    }

    if (child.type === "code" || child.type === "pre") {
      return React.cloneElement(child, { key: child.key ?? index });
    }

    return React.cloneElement(child, {
      key: child.key ?? index,
      children: renderMathChildren(child.props.children),
    });
  });
}

function createRenderer(tag, className) {
  return function MarkdownNode({ children, className: extraClassName, ...props }) {
    return React.createElement(
      tag,
      {
        ...props,
        className: mergeClassNames(className, extraClassName),
      },
      renderMathChildren(children)
    );
  };
}

function autoWrapLatex(source) {
  const lines = source.split(/\r?\n/);
  const out = [];
  let fenced = false;

  for (const line of lines) {
    const fenceMatch = line.match(/^\s*(```|~~~)/);
    if (fenceMatch) fenced = !fenced;

    if (!fenced) {
      const trimmed = line.trim();
      if (trimmed.startsWith("$$") && trimmed.endsWith("$$")) {
        out.push(line);
        continue;
      }
      if (!line.includes("$") && /\\[a-zA-Z]+/.test(line)) {
        out.push(`$${line}$`);
        continue;
      }
    }

    out.push(line);
  }

  return out.join("\n");
}

function normalizeSingleLineDisplayMath(source) {
  const lines = source.split(/\r?\n/);
  const out = [];
  let fenced = false;

  for (const line of lines) {
    const fenceMatch = line.match(/^\s*(```|~~~)/);
    if (fenceMatch) fenced = !fenced;

    if (!fenced) {
      const m = line.match(/^\s*\$\$([\s\S]*?)\$\$\s*$/);
      if (m && !m[1].includes("\n")) {
        const inner = m[1].trim();
        out.push("$$");
        out.push(inner);
        out.push("$$");
        continue;
      }
    }

    out.push(line);
  }

  return out.join("\n");
}

const blockComponents = {
  p: createRenderer("p", "md-p"),
  h1: createRenderer("h1", "md-h1"),
  h2: createRenderer("h2", "md-h2"),
  h3: createRenderer("h3", "md-h3"),
  h4: createRenderer("h4", "md-h4"),
  ul: createRenderer("ul", "md-ul"),
  ol: createRenderer("ol", "md-ol"),
  li: createRenderer("li", "md-li"),
  blockquote: createRenderer("blockquote", "md-blockquote"),
  strong: createRenderer("strong", "md-strong"),
  em: createRenderer("em", "md-em"),
  u: createRenderer("u", "md-u"),
  del: createRenderer("del", "md-del"),
  a({ children, className, ...props }) {
    return (
      <a
        {...props}
        className={mergeClassNames("md-link", className)}
        target="_blank"
        rel="noreferrer"
      >
        {renderMathChildren(children)}
      </a>
    );
  },
  hr(props) {
    return <hr {...props} className="md-hr" />;
  },
  table({ children, className, ...props }) {
    return (
      <div className="md-table-wrap">
        <table {...props} className={mergeClassNames("md-table", className)}>
          {renderMathChildren(children)}
        </table>
      </div>
    );
  },
  thead: createRenderer("thead", "md-thead"),
  tbody: createRenderer("tbody", "md-tbody"),
  tr: createRenderer("tr", "md-tr"),
  th: createRenderer("th", "md-th"),
  td: createRenderer("td", "md-td"),
  code({ children, className, ...props }) {
    return (
      <code {...props} className={mergeClassNames("md-code", className)}>
        {children}
      </code>
    );
  },
  pre({ children, className, ...props }) {
    return (
      <pre {...props} className={mergeClassNames("md-pre", className)}>
        {children}
      </pre>
    );
  },
};

const inlineComponents = {
  p({ children }) {
    return <>{renderMathChildren(children)}</>;
  },
  h1: createRenderer("span", "md-inline-heading"),
  h2: createRenderer("span", "md-inline-heading"),
  h3: createRenderer("span", "md-inline-heading"),
  h4: createRenderer("span", "md-inline-heading"),
  ul: createRenderer("span", "md-inline-group"),
  ol: createRenderer("span", "md-inline-group"),
  li({ children }) {
    return <span className="md-inline-item">• {renderMathChildren(children)}</span>;
  },
  blockquote: createRenderer("span", "md-inline-quote"),
  strong: createRenderer("strong", "md-strong"),
  em: createRenderer("em", "md-em"),
  u: createRenderer("u", "md-u"),
  del: createRenderer("del", "md-del"),
  a({ children, className, ...props }) {
    return (
      <a
        {...props}
        className={mergeClassNames("md-link", className)}
        target="_blank"
        rel="noreferrer"
      >
        {renderMathChildren(children)}
      </a>
    );
  },
  hr() {
    return <span className="md-inline-rule">---</span>;
  },
  table: createRenderer("span", "md-inline-group"),
  thead: createRenderer("span", "md-inline-group"),
  tbody: createRenderer("span", "md-inline-group"),
  tr: createRenderer("span", "md-inline-item"),
  th: createRenderer("strong", "md-inline-table-head"),
  td: createRenderer("span", "md-inline-table-cell"),
  code({ children, className, ...props }) {
    return (
      <code {...props} className={mergeClassNames("md-code", className)}>
        {children}
      </code>
    );
  },
};

function MarkdownText({ text, className, inline = false }) {
  const raw = typeof text === "string" ? text : "";
  const source = inline ? raw : normalizeSingleLineDisplayMath(autoWrapLatex(raw));
  const RootTag = inline ? "span" : "div";

  return (
    <RootTag className={mergeClassNames(inline ? "md md-inline-root" : "md md-root", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks, remarkMath, remarkUnderline]}
        rehypePlugins={[rehypeKatex]}
        components={inline ? inlineComponents : blockComponents}
      >
        {source}
      </ReactMarkdown>
    </RootTag>
  );
}

// Memoized: only re-renders when text/className/inline actually change. The
// question list re-renders on every search keystroke — without memo, each
// visible card would re-run the full remark/KaTeX pipeline for identical text.
export default React.memo(MarkdownText);
