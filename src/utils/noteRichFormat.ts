/**
 * noteRichFormat.ts
 * Lossless bidirectional converter between CSE QBANK StudyNote Markdown+KaTeX
 * and TipTap rich-text HTML (preserving headings, bold, italic, underline,
 * strikethrough, highlights, text colors, alignments, lists, checklists,
 * links, blockquotes, code blocks, and KaTeX math nodes).
 */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function unescapeHtml(text: string): string {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function escapeAttr(text: string): string {
  return escapeHtml(text).replace(/'/g, "&#39;");
}

function sanitizeColor(raw: string): string | null {
  const val = raw.trim();
  if (
    /^#[0-9a-fA-F]{3,8}$/.test(val) ||
    /^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)$/.test(val)
  ) {
    return val;
  }
  return null;
}

function sanitizeAlign(raw: string): "left" | "center" | "right" | "justify" | null {
  const val = raw.trim().toLowerCase();
  if (val === "left" || val === "center" || val === "right" || val === "justify") {
    return val;
  }
  return null;
}

const DEFAULT_HIGHLIGHT_COLOR = "rgba(250, 204, 21, 0.32)";

function wrapInlineWithWhitespacePreserved(
  content: string,
  wrap: (core: string) => string
): string {
  if (!content) return "";
  const match = content.match(/^(\s*)([\s\S]*?)(\s*)$/);
  if (!match) return content;
  const [, lead, core, trail] = match;
  if (!core) return content;
  return `${lead}${wrap(core)}${trail}`;
}

function wrapDelimiterPair(full: string, inner: string, delim: string): string {
  const m = inner.match(/^([ \t]*)([\s\S]*?)([ \t]*)$/);
  if (!m) return full;
  const [, lead, core, trail] = m;
  if (!lead && !trail) return full;
  if (!core) return inner;
  return `${lead}${delim}${core}${delim}${trail}`;
}

function normalizeInlineEmphasisLine(line: string): string {
  if (!line || /^\s*(?:[-*_][ \t]*){3,}$/.test(line)) {
    return line;
  }

  const tokens: string[] = [];
  const hold = (segment: string) => {
    const id = `\u0001EMPH${tokens.length}\u0001`;
    tokens.push(segment);
    return id;
  };

  let body = line;
  let listPrefix = "";
  const listMatch = body.match(/^([ \t]*(?:[*+-]|\d+\.)[ \t]+(?:\[[ xX]\][ \t]+)?)(.*)$/);
  if (listMatch) {
    listPrefix = listMatch[1];
    body = listMatch[2];
  }

  // 1. Protect inline code spans
  body = body.replace(/(`+)(?:(?!\1)[^\n])+?\1/g, (m) => hold(m));

  // 2. Protect inline math $...$ (avoid matching currency like $50 and $100)
  body = body.replace(/(^|[^\\$])\$([^\s$](?:[^$\n]*?[^\s$])?)\$(?![0-9])/g, (m, lead, latex) => {
    if (!latex.trim()) return m;
    return `${lead}${hold(m.slice(lead.length))}`;
  });

  // 3. Protect Markdown link/image URL targets
  body = body.replace(/(\]\()([^)\n]+)(\))/g, (_m, open, url, close) => `${open}${hold(url)}${close}`);

  // 4. Move leading/trailing spaces out of emphasis delimiters (fixes CommonMark breaks from Word selection)
  body = body.replace(
    /(?<!\\)(?<!\*)\*\*\*(?!\*)((?:(?!\*\*\*)[^\n])*?)(?<!\\)(?<!\*)\*\*\*(?!\*)/g,
    (full, inner) => wrapDelimiterPair(full, inner, "***")
  );
  body = body.replace(
    /(?<!\\)(?<!\*)\*\*(?!\*)((?:(?!\*\*)[^\n])*?)(?<!\\)(?<!\*)\*\*(?!\*)/g,
    (full, inner) => wrapDelimiterPair(full, inner, "**")
  );
  body = body.replace(
    /(?<!\\)(?<!~)~~(?!~)((?:(?!~~)[^\n])*?)(?<!\\)(?<!~)~~(?!~)/g,
    (full, inner) => wrapDelimiterPair(full, inner, "~~")
  );
  body = body.replace(
    /(?<!\\)(?<!\+)\+\+(?!\+)((?:(?!\+\+)[^\n])*?)(?<!\\)(?<!\+)\+\+(?!\+)/g,
    (full, inner) => wrapDelimiterPair(full, inner, "++")
  );
  body = body.replace(
    /(?<!\\)(?<!=)==(?!=)((?:(?!==)[^\n])*?)(?<!\\)(?<!=)==(?!=)/g,
    (full, inner) => wrapDelimiterPair(full, inner, "==")
  );
  // Single * italic: match only when at least one delimiter is flush against non-whitespace
  // so math expressions like `2 * 3 * 4` remain untouched.
  body = body.replace(
    /(?<!\\)(?<!\*)\*(?!\*)(?!\s)((?:[^\n*]|\*{2,})*?)(?<!\\)(?<!\*)\*(?!\*)/g,
    (full, inner) => wrapDelimiterPair(full, inner, "*")
  );
  body = body.replace(
    /(?<!\\)(?<!\*)\*(?!\*)(?=\s)((?:[^\n*]|\*{2,})*?)(?<!\s)(?<!\\)(?<!\*)\*(?!\*)/g,
    (full, inner) => wrapDelimiterPair(full, inner, "*")
  );

  // Restore held tokens
  for (let pass = 0; pass < 3; pass++) {
    let changed = false;
    body = body.replace(/\u0001EMPH(\d+)\u0001/g, (_m, idx) => {
      changed = true;
      return tokens[Number(idx)] ?? "";
    });
    if (!changed) break;
  }

  return `${listPrefix}${body}`;
}

/**
 * Fixes CommonMark-invalid emphasis where leading/trailing horizontal spaces got trapped
 * inside `**...**`, `*...*`, `***...***`, `~~...~~`, `++...++`, or `==...==` (for example
 * when double-clicking a word with Windows/Word trailing-space selection before bolding).
 * Leaves fenced code blocks, inline code, LaTeX math, and multiplication `*` untouched.
 */
export function normalizeEmphasisWhitespace(source: string): string {
  if (!source || !/[*~+=]/.test(source)) return source;

  const lines = source.split(/\r?\n/);
  const out: string[] = [];
  let activeFence: string | null = null;
  let inDisplayMath = false;

  for (const line of lines) {
    const trimmed = line.trim();

    const fenceMatch = trimmed.match(/^(```|~~~)/);
    if (fenceMatch) {
      if (!activeFence) {
        activeFence = fenceMatch[1];
      } else if (trimmed.startsWith(activeFence)) {
        activeFence = null;
      }
      out.push(line);
      continue;
    }

    if (activeFence) {
      out.push(line);
      continue;
    }

    if (trimmed === "$$") {
      inDisplayMath = !inDisplayMath;
      out.push(line);
      continue;
    }

    if (trimmed.startsWith("$$") && trimmed.endsWith("$$") && trimmed.length >= 4) {
      out.push(line);
      continue;
    }

    if (trimmed.startsWith("$$") || (inDisplayMath && trimmed.endsWith("$$"))) {
      inDisplayMath = !inDisplayMath;
      out.push(line);
      continue;
    }

    if (inDisplayMath) {
      out.push(line);
      continue;
    }

    out.push(normalizeInlineEmphasisLine(line));
  }

  return out.join("\n");
}

/**
 * Converts inline Markdown + safe inline HTML tags (<u>, <mark>, <span style="color:...">)
 * + inline LaTeX ($...$) into clean HTML for TipTap.
 */
function renderInlineMarkdownToHtml(raw: string): string {
  if (!raw) return "";

  const tokens: string[] = [];
  const hold = (html: string) => {
    const id = `\u0000TOK${tokens.length}\u0000`;
    tokens.push(html);
    return id;
  };

  let text = raw;

  // 1. Preserve inline code spans first
  text = text.replace(/`([^`\n]+?)`/g, (_m, code) => {
    return hold(`<code>${escapeHtml(code)}</code>`);
  });

  // 2. Preserve inline math $...$ (avoid matching currency like $50 and $100)
  text = text.replace(/(^|[^\\$])\$([^\s$](?:[^$\n]*?[^\s$])?)\$(?![0-9])/g, (m, lead, latex) => {
    if (!latex.trim()) return m;
    return `${lead}${hold(`<span data-type="math-inline" data-latex="${escapeAttr(latex.trim())}"></span>`)}`;
  });

  // 3. Preserve safe inline HTML tags before escaping remaining text
  //    (Recursively format inner text of <u>, <mark>, <span style="color:...">, <strong>, <em>, <s>)
  const replaceInlineTag = (
    pattern: RegExp,
    builder: (match: RegExpExecArray, innerHtml: string) => string
  ) => {
    let changed = true;
    let guard = 0;
    while (changed && guard < 20) {
      changed = false;
      guard++;
      text = text.replace(pattern, (...args) => {
        changed = true;
        const full = args[0];
        const inner = args[args.length - 3];
        const execLike = args as unknown as RegExpExecArray;
        execLike[0] = full;
        return hold(builder(execLike, renderInlineMarkdownToHtml(inner)));
      });
    }
  };

  replaceInlineTag(/<u>([\s\S]*?)<\/u>/gi, (_m, innerHtml) =>
    wrapInlineWithWhitespacePreserved(innerHtml, (core) => `<u>${core}</u>`)
  );
  replaceInlineTag(
    /<mark(?:\s+data-color=["']([^"']+)["'])?(?:\s+style=["'][^"']*background-color:\s*([^;"']+)[^"']*["'])?[^>]*>([\s\S]*?)<\/mark>/gi,
    (m, innerHtml) => {
      const rawColor = m[1] || m[2] || DEFAULT_HIGHLIGHT_COLOR;
      const safe = sanitizeColor(rawColor) || DEFAULT_HIGHLIGHT_COLOR;
      return wrapInlineWithWhitespacePreserved(
        innerHtml,
        (core) =>
          `<mark data-color="${escapeAttr(safe)}" style="background-color: ${escapeAttr(safe)}">${core}</mark>`
      );
    }
  );
  replaceInlineTag(
    /<span\s+style=["'][^"']*\bcolor:\s*([^;"']+)[^"']*["'][^>]*>([\s\S]*?)<\/span>/gi,
    (m, innerHtml) => {
      const safe = sanitizeColor(m[1] || "");
      return safe
        ? wrapInlineWithWhitespacePreserved(
            innerHtml,
            (core) => `<span style="color: ${escapeAttr(safe)}">${core}</span>`
          )
        : innerHtml;
    }
  );
  replaceInlineTag(/<strong>([\s\S]*?)<\/strong>/gi, (_m, innerHtml) =>
    wrapInlineWithWhitespacePreserved(innerHtml, (core) => `<strong>${core}</strong>`)
  );
  replaceInlineTag(/<em>([\s\S]*?)<\/em>/gi, (_m, innerHtml) =>
    wrapInlineWithWhitespacePreserved(innerHtml, (core) => `<em>${core}</em>`)
  );
  replaceInlineTag(/<(?:s|del)>([\s\S]*?)<\/(?:s|del)>/gi, (_m, innerHtml) =>
    wrapInlineWithWhitespacePreserved(innerHtml, (core) => `<s>${core}</s>`)
  );

  // 4. Preserve Markdown links [label](url)
  text = text.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, label, url) => {
    const trimmedUrl = url.trim();
    const safeHref =
      /^https?:\/\//i.test(trimmedUrl) || /^mailto:/i.test(trimmedUrl) || trimmedUrl.startsWith("/") || trimmedUrl.startsWith("#")
        ? trimmedUrl
        : `https://${trimmedUrl}`;
    return hold(
      `<a href="${escapeAttr(safeHref)}" target="_blank" rel="noopener noreferrer nofollow">${renderInlineMarkdownToHtml(label)}</a>`
    );
  });

  // 5. Normalize stray whitespace inside emphasis delimiters before HTML escaping & regex formatting
  text = normalizeInlineEmphasisLine(text);

  // 6. Escape raw HTML chars in remaining plain text
  text = escapeHtml(text);

  // 7. Standard inline Markdown formatting
  // Highlight ==text==
  text = text.replace(/==([^\n=][\s\S]*?[^\n=]|[^\n=])==/g, (_m, inner) =>
    wrapInlineWithWhitespacePreserved(
      inner,
      (core) =>
        `<mark data-color="${DEFAULT_HIGHLIGHT_COLOR}" style="background-color: ${DEFAULT_HIGHLIGHT_COLOR}">${core}</mark>`
    )
  );
  // Underline ++text++
  text = text.replace(/\+\+([^\n+][\s\S]*?[^\n+]|[^\n+])\+\+/g, (_m, inner) =>
    wrapInlineWithWhitespacePreserved(inner, (core) => `<u>${core}</u>`)
  );
  // Bold + Italic ***text***
  text = text.replace(/\*\*\*([^\n*][\s\S]*?[^\n*]|[^\n*])\*\*\*/g, (_m, inner) =>
    wrapInlineWithWhitespacePreserved(inner, (core) => `<strong><em>${core}</em></strong>`)
  );
  // Bold **text**
  text = text.replace(/\*\*([^\n*][\s\S]*?[^\n*]|[^\n*])\*\*/g, (_m, inner) =>
    wrapInlineWithWhitespacePreserved(inner, (core) => `<strong>${core}</strong>`)
  );
  // Strikethrough ~~text~~
  text = text.replace(/~~([^\n~][\s\S]*?[^\n~]|[^\n~])~~/g, (_m, inner) =>
    wrapInlineWithWhitespacePreserved(inner, (core) => `<s>${core}</s>`)
  );
  // Italic *text* (avoid matching standalone bullet or math multiplication spaces)
  text = text.replace(/(^|[^*])\*([^\s*](?:[^\n*]*?[^\s*])?)\*(?!\*)/g, "$1<em>$2</em>");

  // 7. Restore held tokens (repeat up to 5 passes for nested tokens)
  for (let pass = 0; pass < 5; pass++) {
    let replaced = false;
    text = text.replace(/\u0000TOK(\d+)\u0000/g, (_m, idx) => {
      replaced = true;
      return tokens[Number(idx)] ?? "";
    });
    if (!replaced) break;
  }

  return text;
}

interface ParsedListItem {
  indent: number;
  kind: "task" | "bullet" | "ordered";
  checked: boolean;
  text: string;
}

function buildNestedListHtml(items: ParsedListItem[]): string {
  const buildLevel = (startIdx: number, baseIndent: number, kind: ParsedListItem["kind"]): { html: string; nextIdx: number } => {
    const tag = kind === "ordered" ? "ol" : "ul";
    const attrs = kind === "task" ? ' data-type="taskList"' : "";
    let out = `<${tag}${attrs}>`;
    let i = startIdx;

    while (i < items.length) {
      const item = items[i];
      if (item.indent < baseIndent) break;
      if (item.indent === baseIndent && item.kind !== kind) break;

      if (item.indent > baseIndent) {
        const sub = buildLevel(i, item.indent, item.kind);
        // Append sublist inside previous <li> if possible
        if (out.endsWith("</li>")) {
          out = `${out.slice(0, -5)}${sub.html}</li>`;
        } else {
          out += sub.html;
        }
        i = sub.nextIdx;
        continue;
      }

      const contentHtml = `<p>${renderInlineMarkdownToHtml(item.text)}</p>`;
      let liBody = contentHtml;

      // Check if subsequent items are indented children
      if (i + 1 < items.length && items[i + 1].indent > baseIndent) {
        const sub = buildLevel(i + 1, items[i + 1].indent, items[i + 1].kind);
        liBody += sub.html;
        i = sub.nextIdx;
      } else {
        i += 1;
      }

      if (kind === "task") {
        out += `<li data-type="taskItem" data-checked="${item.checked ? "true" : "false"}">${liBody}</li>`;
      } else {
        out += `<li>${liBody}</li>`;
      }
    }

    out += `</${tag}>`;
    return { html: out, nextIdx: i };
  };

  let html = "";
  let idx = 0;
  while (idx < items.length) {
    const res = buildLevel(idx, items[idx].indent, items[idx].kind);
    html += res.html;
    idx = res.nextIdx;
  }
  return html;
}

function matchListLine(line: string): ParsedListItem | null {
  const taskMatch = line.match(/^(\s*)[-*+]\s+\[([ xX])\]\s*(.*)$/);
  if (taskMatch) {
    return {
      indent: taskMatch[1].replace(/\t/g, "  ").length,
      kind: "task",
      checked: taskMatch[2].toLowerCase() === "x",
      text: taskMatch[3],
    };
  }

  const bulletMatch = line.match(/^(\s*)[-*+]\s+(.*)$/);
  if (bulletMatch) {
    return {
      indent: bulletMatch[1].replace(/\t/g, "  ").length,
      kind: "bullet",
      checked: false,
      text: bulletMatch[2],
    };
  }

  const orderedMatch = line.match(/^(\s*)\d+\.\s+(.*)$/);
  if (orderedMatch) {
    return {
      indent: orderedMatch[1].replace(/\t/g, "  ").length,
      kind: "ordered",
      checked: false,
      text: orderedMatch[2],
    };
  }

  return null;
}

/**
 * Converts Markdown + LaTeX string into TipTap-compatible HTML.
 */
export function markdownToEditorHtml(markdown: string): string {
  if (!markdown || !markdown.trim()) return "<p></p>";

  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Empty line
    if (!trimmed) {
      i += 1;
      continue;
    }

    // Fenced code block
    const fenceMatch = trimmed.match(/^(```|~~~)(.*)$/);
    if (fenceMatch) {
      const fence = fenceMatch[1];
      const lang = fenceMatch[2].trim();
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith(fence)) {
        codeLines.push(lines[i]);
        i += 1;
      }
      if (i < lines.length) i += 1;
      const langAttr = lang ? ` class="language-${escapeAttr(lang)}"` : "";
      blocks.push(`<pre><code${langAttr}>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
      continue;
    }

    // Single-line display math $$...$$
    const singleMath = trimmed.match(/^\$\$([\s\S]+?)\$\$$/);
    if (singleMath) {
      blocks.push(`<div data-type="math-block" data-latex="${escapeAttr(singleMath[1].trim())}"></div>`);
      i += 1;
      continue;
    }

    // Multi-line display math $$ ... $$
    if (trimmed === "$$" || (trimmed.startsWith("$$") && !trimmed.slice(2).includes("$$"))) {
      const mathLines: string[] = [];
      const firstRest = trimmed.slice(2).trim();
      if (firstRest) mathLines.push(firstRest);
      i += 1;
      while (i < lines.length) {
        const curTrim = lines[i].trim();
        if (curTrim.endsWith("$$")) {
          const before = curTrim.slice(0, -2).trim();
          if (before) mathLines.push(before);
          i += 1;
          break;
        }
        mathLines.push(lines[i]);
        i += 1;
      }
      blocks.push(`<div data-type="math-block" data-latex="${escapeAttr(mathLines.join("\n").trim())}"></div>`);
      continue;
    }

    // Standalone aligned block tag <p style="text-align: ...">...</p> or <h1..3 style="text-align: ...">...</h1..3>
    const alignedBlock = trimmed.match(/^<(p|h1|h2|h3)\s+style=["'][^"']*text-align:\s*([^;"']+)[^"']*["'][^>]*>([\s\S]*?)<\/\1>$/i);
    if (alignedBlock) {
      const tag = alignedBlock[1].toLowerCase();
      const align = sanitizeAlign(alignedBlock[2]);
      const inner = renderInlineMarkdownToHtml(alignedBlock[3]);
      blocks.push(align ? `<${tag} style="text-align: ${align}">${inner}</${tag}>` : `<${tag}>${inner}</${tag}>`);
      i += 1;
      continue;
    }

    // Horizontal rule
    if (/^(?:---|\*\*\*|___)\s*$/.test(trimmed)) {
      blocks.push("<hr>");
      i += 1;
      continue;
    }

    // Headings # .. ### (map ####+ to h3 for clean note hierarchy)
    const headingMatch = line.match(/^\s{0,3}(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      const level = Math.min(3, headingMatch[1].length);
      blocks.push(`<h${level}>${renderInlineMarkdownToHtml(headingMatch[2].trim())}</h${level}>`);
      i += 1;
      continue;
    }

    // Blockquote
    if (/^\s*>\s?/.test(line)) {
      const quoteLines: string[] = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        quoteLines.push(lines[i].replace(/^\s*>\s?/, ""));
        i += 1;
      }
      const innerParas = quoteLines
        .join("\n")
        .split(/\n{2,}/)
        .map((chunk) => `<p>${chunk.split("\n").map(renderInlineMarkdownToHtml).join("<br>")}</p>`)
        .join("");
      blocks.push(`<blockquote>${innerParas || "<p></p>"}</blockquote>`);
      continue;
    }

    // Lists (task / bullet / ordered)
    const firstListItem = matchListLine(line);
    if (firstListItem) {
      const items: ParsedListItem[] = [firstListItem];
      i += 1;
      while (i < lines.length) {
        const nextLine = lines[i];
        if (!nextLine.trim()) break;
        const parsed = matchListLine(nextLine);
        if (!parsed) break;
        items.push(parsed);
        i += 1;
      }
      blocks.push(buildNestedListHtml(items));
      continue;
    }

    // Normal paragraph (collect consecutive non-special lines into a single paragraph with <br>)
    const paraLines: string[] = [line];
    i += 1;
    while (i < lines.length) {
      const next = lines[i];
      const nextTrim = next.trim();
      if (
        !nextTrim ||
        /^(```|~~~|\$\$)/.test(nextTrim) ||
        /^(?:---|\*\*\*|___)\s*$/.test(nextTrim) ||
        /^\s{0,3}#{1,6}\s+/.test(next) ||
        /^\s*>\s?/.test(next) ||
        /^<(p|h1|h2|h3)\s+style=/i.test(nextTrim) ||
        matchListLine(next)
      ) {
        break;
      }
      paraLines.push(next);
      i += 1;
    }

    const paraHtml = paraLines.map((pl) => renderInlineMarkdownToHtml(pl)).join("<br>");
    blocks.push(`<p>${paraHtml}</p>`);
  }

  return blocks.length > 0 ? blocks.join("") : "<p></p>";
}

function serializeInlineNodes(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent || "";
  }
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return "";
  }

  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();

  if (tag === "br") {
    return "\n";
  }

  if (el.dataset.type === "math-inline") {
    const latex = (el.dataset.latex || el.textContent || "").trim();
    return latex ? `$${latex}$` : "";
  }

  const childrenMd = Array.from(el.childNodes).map(serializeInlineNodes).join("");

  switch (tag) {
    case "strong":
    case "b":
      return wrapInlineWithWhitespacePreserved(childrenMd, (core) => `**${core}**`);
    case "em":
    case "i":
      return wrapInlineWithWhitespacePreserved(childrenMd, (core) => `*${core}*`);
    case "u":
      return wrapInlineWithWhitespacePreserved(childrenMd, (core) => `<u>${core}</u>`);
    case "s":
    case "del":
    case "strike":
      return wrapInlineWithWhitespacePreserved(childrenMd, (core) => `~~${core}~~`);
    case "code":
      return childrenMd ? `\`${childrenMd}\`` : "";
    case "mark": {
      if (!childrenMd) return "";
      const color = el.getAttribute("data-color") || el.style.backgroundColor || DEFAULT_HIGHLIGHT_COLOR;
      const safe = sanitizeColor(color);
      const resolvedColor = !safe || safe === DEFAULT_HIGHLIGHT_COLOR ? DEFAULT_HIGHLIGHT_COLOR : safe;
      return wrapInlineWithWhitespacePreserved(
        childrenMd,
        (core) => `<mark data-color="${resolvedColor}">${core}</mark>`
      );
    }
    case "span": {
      const color = el.style?.color;
      const safe = color ? sanitizeColor(color) : null;
      if (safe && childrenMd) {
        return wrapInlineWithWhitespacePreserved(
          childrenMd,
          (core) => `<span style="color: ${safe}">${core}</span>`
        );
      }
      return childrenMd;
    }
    case "a": {
      const href = el.getAttribute("href") || "";
      return href ? `[${childrenMd || href}](${href})` : childrenMd;
    }
    default:
      return childrenMd;
  }
}

const MERGEABLE_INLINE_TAGS = new Set(["strong", "b", "em", "i", "u", "s", "del", "strike", "mark"]);

function canonicalMarkKey(el: HTMLElement): string | null {
  const tag = el.tagName.toLowerCase();
  if (!MERGEABLE_INLINE_TAGS.has(tag)) return null;
  if (tag === "b") return "strong";
  if (tag === "i") return "em";
  if (tag === "del" || tag === "strike") return "s";
  if (tag === "mark") {
    const color = el.getAttribute("data-color") || el.style?.backgroundColor || DEFAULT_HIGHLIGHT_COLOR;
    return `mark:${sanitizeColor(color) || DEFAULT_HIGHLIGHT_COLOR}`;
  }
  return tag;
}

function mergeAdjacentInlineMarks(root: HTMLElement): void {
  const children = Array.from(root.childNodes);
  for (const child of children) {
    if (child.nodeType === Node.ELEMENT_NODE) {
      mergeAdjacentInlineMarks(child as HTMLElement);
    }
  }

  let cur = root.firstChild;
  while (cur) {
    const next = cur.nextSibling;
    if (
      cur.nodeType === Node.ELEMENT_NODE &&
      next &&
      next.nodeType === Node.ELEMENT_NODE
    ) {
      const curKey = canonicalMarkKey(cur as HTMLElement);
      const nextKey = canonicalMarkKey(next as HTMLElement);
      if (curKey && curKey === nextKey) {
        while (next.firstChild) {
          cur.appendChild(next.firstChild);
        }
        root.removeChild(next);
        mergeAdjacentInlineMarks(cur as HTMLElement);
        continue;
      }
    }
    cur = next;
  }
}

function serializeListElement(listEl: HTMLElement, depth: number): string {
  const isTaskList = listEl.getAttribute("data-type") === "taskList";
  const isOrdered = listEl.tagName.toLowerCase() === "ol";
  const indent = "  ".repeat(depth);
  const lines: string[] = [];

  let orderIndex = Number(listEl.getAttribute("start") || "1") || 1;
  const listItems = Array.from(listEl.children).filter(
    (child) => child.tagName.toLowerCase() === "li"
  ) as HTMLElement[];

  for (const li of listItems) {
    const inlineParts: string[] = [];
    const nestedBlocks: string[] = [];

    const visitLiChild = (child: Node) => {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const childEl = child as HTMLElement;
        const cTag = childEl.tagName.toLowerCase();
        if (cTag === "label") {
          return;
        }
        if (cTag === "div") {
          Array.from(childEl.childNodes).forEach(visitLiChild);
          return;
        }
        if (cTag === "ul" || cTag === "ol") {
          nestedBlocks.push(serializeListElement(childEl, depth + 1));
          return;
        }
        if (cTag === "p") {
          const pText = Array.from(childEl.childNodes).map(serializeInlineNodes).join("");
          if (pText) inlineParts.push(pText);
          return;
        }
      }
      const rawText = serializeInlineNodes(child);
      if (rawText) inlineParts.push(rawText);
    };

    Array.from(li.childNodes).forEach(visitLiChild);

    const textLine = inlineParts.join(" ").trim();
    let prefix = "- ";
    if (isTaskList) {
      const checked = li.getAttribute("data-checked") === "true";
      prefix = checked ? "- [x] " : "- [ ] ";
    } else if (isOrdered) {
      prefix = `${orderIndex}. `;
      orderIndex += 1;
    }

    lines.push(`${indent}${prefix}${textLine}`);
    for (const nested of nestedBlocks) {
      if (nested) lines.push(nested);
    }
  }

  return lines.join("\n");
}

/**
 * Converts TipTap editor HTML back into clean Markdown + KaTeX text.
 */
export function editorHtmlToMarkdown(html: string): string {
  if (!html || typeof window === "undefined") return "";
  const container = document.createElement("div");
  container.innerHTML = html;
  mergeAdjacentInlineMarks(container);

  const blocks: string[] = [];

  for (const node of Array.from(container.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      const t = (node.textContent || "").trim();
      if (t) blocks.push(t);
      continue;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) continue;

    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();

    if (el.dataset.type === "math-block") {
      const latex = (el.dataset.latex || el.textContent || "").trim();
      if (latex) blocks.push(`$$\n${latex}\n$$`);
      continue;
    }

    if (tag === "hr") {
      blocks.push("---");
      continue;
    }

    if (tag === "pre") {
      const codeEl = el.querySelector("code");
      const classAttr = codeEl?.getAttribute("class") || "";
      const langMatch = classAttr.match(/language-([a-zA-Z0-9_-]+)/);
      const lang = langMatch ? langMatch[1] : "";
      const codeText = (codeEl?.textContent ?? el.textContent ?? "").replace(/\n$/, "");
      blocks.push(`\`\`\`${lang}\n${codeText}\n\`\`\``);
      continue;
    }

    if (tag === "h1" || tag === "h2" || tag === "h3") {
      const level = tag === "h1" ? "#" : tag === "h2" ? "##" : "###";
      const content = Array.from(el.childNodes).map(serializeInlineNodes).join("").trim();
      const align = sanitizeAlign(el.style?.textAlign || "");
      if (align && align !== "left") {
        blocks.push(`<${tag} style="text-align: ${align}">${content}</${tag}>`);
      } else {
        blocks.push(`${level} ${content}`);
      }
      continue;
    }

    if (tag === "blockquote") {
      const innerMd = editorHtmlToMarkdown(el.innerHTML);
      const quoted = innerMd
        .split("\n")
        .map((l) => (l.trim() ? `> ${l}` : ">"))
        .join("\n");
      blocks.push(quoted);
      continue;
    }

    if (tag === "ul" || tag === "ol") {
      const listMd = serializeListElement(el, 0);
      if (listMd) blocks.push(listMd);
      continue;
    }

    if (tag === "p") {
      const content = Array.from(el.childNodes).map(serializeInlineNodes).join("");
      const align = sanitizeAlign(el.style?.textAlign || "");
      if (!content.trim()) {
        // Keep intentional spacing only if multiple breaks
        continue;
      }
      if (align && align !== "left") {
        blocks.push(`<p style="text-align: ${align}">${content}</p>`);
      } else {
        blocks.push(content);
      }
      continue;
    }

    const fallback = Array.from(el.childNodes).map(serializeInlineNodes).join("").trim();
    if (fallback) blocks.push(fallback);
  }

  return blocks.join("\n\n").trim();
}

/**
 * Strips Markdown, HTML inline tags, and LaTeX syntax for clean sidebar note snippets.
 */
export function stripNoteFormattingForSnippet(content: string): string {
  return content
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/<\/?(?:u|mark|span|strong|em|s|del|p|h1|h2|h3)(?:\s+[^>]*)?>/gi, "")
    .replace(/^\s*[-*+]\s+\[[ xX]\]\s*/gm, "")
    .replace(/^\s{0,3}(?:#{1,6}\s*|[-*+>]\s*|\d+\.\s*)/gm, "")
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "$1/$2")
    .replace(/\\(?:rightarrow|to)\b/g, "→")
    .replace(/\\times\b/g, "×")
    .replace(/\\div\b/g, "÷")
    .replace(/\\pm\b/g, "±")
    .replace(/\\le\b/g, "≤")
    .replace(/\\ge\b/g, "≥")
    .replace(/\\approx\b/g, "≈")
    .replace(/\\neq\b/g, "≠")
    .replace(/\\cdot\b/g, "·")
    .replace(/\\%/g, "%")
    .replace(/\\[a-zA-Z]+/g, "")
    .replace(/==([\s\S]*?)==/g, "$1")
    .replace(/\+\+([\s\S]*?)\+\+/g, "$1")
    .replace(/[*_`~${}\\]+/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

/**
 * Helper used to convert HTML stored in notes back to readable plain text (for Copy Plain Text).
 */
export function markdownToPlainText(content: string): string {
  return content
    .replace(/```[^\n]*\n([\s\S]*?)```/g, "$1")
    .replace(/<\/?(?:u|mark|span|strong|em|s|del|p|h1|h2|h3)(?:\s+[^>]*)?>/gi, "")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)")
    .replace(/^\s*[-*+]\s+\[[xX]\]\s*/gm, "☑ ")
    .replace(/^\s*[-*+]\s+\[ \]\s*/gm, "☐ ")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/\*\*\*([\s\S]*?)\*\*\*/g, "$1")
    .replace(/\*\*([\s\S]*?)\*\*/g, "$1")
    .replace(/\*([\s\S]*?)\*/g, "$1")
    .replace(/~~([\s\S]*?)~~/g, "$1")
    .replace(/==([\s\S]*?)==/g, "$1")
    .replace(/\+\+([\s\S]*?)\+\+/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .trim();
}

export { unescapeHtml };
