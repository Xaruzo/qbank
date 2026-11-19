/**
 * remarkUnderline.ts
 * Lightweight remark plugin supporting:
 * - ++underline++ and <u>underline</u>
 * - ==highlight== and <mark data-color="...">highlight</mark>
 * - <span style="color: ...">colored text</span>
 */

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

const DEFAULT_MARK_COLOR = "rgba(250, 204, 21, 0.32)";

function splitInlinePatterns(text: string) {
  const parts: any[] = [];
  const re = /\+\+(.+?)\+\+|==(.+?)==/g;
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      parts.push({ type: "text", value: text.slice(last, m.index) });
    }
    if (m[1] !== undefined) {
      parts.push({
        type: "text",
        value: m[1],
        data: { hName: "u", hProperties: {} },
      });
    } else if (m[2] !== undefined) {
      parts.push({
        type: "text",
        value: m[2],
        data: {
          hName: "mark",
          hProperties: {
            className: ["md-mark"],
            style: `background-color: ${DEFAULT_MARK_COLOR}`,
          },
        },
      });
    }
    last = m.index + m[0].length;
  }

  if (last < text.length) {
    parts.push({ type: "text", value: text.slice(last) });
  }
  return parts;
}

function wrapHtmlTagPairs(node: any) {
  if (!Array.isArray(node?.children) || node.children.length === 0) return;

  for (const child of node.children) {
    wrapHtmlTagPairs(child);
  }

  const out: any[] = [];
  let i = 0;
  while (i < node.children.length) {
    const cur = node.children[i];
    if (cur?.type === "html" && typeof cur.value === "string") {
      const openMatch = cur.value
        .trim()
        .match(/^<(u|mark|span)(\s+[^>]*)?>$/i);
      if (openMatch) {
        const tagName = openMatch[1].toLowerCase();
        const attrs = openMatch[2] || "";
        const closeTag = `</${tagName}>`;
        let closeIdx = -1;
        let depth = 1;

        for (let j = i + 1; j < node.children.length; j++) {
          const candidate = node.children[j];
          if (candidate?.type === "html" && typeof candidate.value === "string") {
            const valLower = candidate.value.trim().toLowerCase();
            if (new RegExp(`^<${tagName}(\\s|>)`).test(valLower)) depth++;
            if (valLower === closeTag) {
              depth--;
              if (depth === 0) {
                closeIdx = j;
                break;
              }
            }
          }
        }

        if (closeIdx !== -1) {
          const innerChildren = node.children.slice(i + 1, closeIdx);
          const hProperties: Record<string, any> = {};

          if (tagName === "mark") {
            const colorMatch =
              attrs.match(/data-color=["']([^"']+)["']/i) ||
              attrs.match(/background-color:\s*([^;"']+)/i);
            const safe = sanitizeColor(colorMatch?.[1] || "") || DEFAULT_MARK_COLOR;
            hProperties.className = ["md-mark"];
            hProperties.style = `background-color: ${safe}`;
          } else if (tagName === "span") {
            const colorMatch = attrs.match(/\bcolor:\s*([^;"']+)/i);
            const safe = sanitizeColor(colorMatch?.[1] || "");
            if (safe) {
              hProperties.style = `color: ${safe}`;
            }
          }

          out.push({
            type: "richInlineSpan",
            children: innerChildren,
            data: {
              hName: tagName,
              hProperties,
            },
          });
          i = closeIdx + 1;
          continue;
        }
      }
    }

    out.push(cur);
    i++;
  }

  node.children = out;
}

export default function remarkUnderline() {
  return (tree: any) => {
    const replacements: Array<{ parent: any; index: number; children: any[] }> = [];

    function walk(node: any, index: number | null, parent: any) {
      if (node.type === "text" && typeof node.value === "string") {
        const parts = splitInlinePatterns(node.value);
        if (parts.length > 1 || (parts.length === 1 && parts[0].data)) {
          replacements.push({ parent, index: index ?? 0, children: parts });
        }
      }
      if (Array.isArray(node.children)) {
        node.children.forEach((c: any, i: number) => walk(c, i, node));
      }
    }

    walk(tree, null, null);

    for (const { parent, index, children } of replacements.reverse()) {
      if (parent && Array.isArray(parent.children)) {
        parent.children.splice(index, 1, ...children);
      }
    }

    wrapHtmlTagPairs(tree);
  };
}
