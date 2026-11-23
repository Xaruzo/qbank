import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  markdownToEditorHtml,
  normalizeEmphasisWhitespace,
  stripNoteFormattingForSnippet,
  markdownToPlainText,
} from "../src/utils/noteRichFormat";
import MarkdownText from "../src/views/components/MarkdownText";
import { DEFAULT_STUDY_NOTES } from "../src/models/notesModel";

describe("noteRichFormat", () => {
  it("converts rich markdown and KaTeX notes to TipTap-compatible HTML", () => {
    const html = markdownToEditorHtml(
      `### Heading\n\n**Bold**, *Italic*, <u>Underline</u>, ==Highlighted==\n\n- Bullet\n- [x] Checked\n- [ ] Unchecked\n\nInline $1/a + 1/b$ and block:\n\n$$\nx^2 + y^2 = z^2\n$$`
    );

    expect(html).toContain("<h3>Heading</h3>");
    expect(html).toContain("<strong>Bold</strong>");
    expect(html).toContain("<em>Italic</em>");
    expect(html).toContain("<u>Underline</u>");
    expect(html).toContain("<mark ");
    expect(html).toContain('data-type="taskList"');
    expect(html).toContain('data-type="taskItem" data-checked="true"');
    expect(html).toContain('data-type="taskItem" data-checked="false"');
    expect(html).toContain('data-type="math-inline"');
    expect(html).toContain('data-type="math-block"');
  });

  it("does not misinterpret currency values as inline math", () => {
    const html = markdownToEditorHtml("Budget is $50 to $100 per person.");
    expect(html).not.toContain("math-inline");
    expect(html).toContain("$50 to $100");
  });

  it("normalizes Word-style trailing/leading spaces inside bold, italic, and strike delimiters", () => {
    expect(
      normalizeEmphasisWhitespace(
        "He **UNSCRUPULOUSLY **achieves his goals by using his positions."
      )
    ).toBe("He **UNSCRUPULOUSLY** achieves his goals by using his positions.");

    expect(normalizeEmphasisWhitespace("**First** and **Second **word")).toBe(
      "**First** and **Second** word"
    );
    expect(normalizeEmphasisWhitespace("He** UNSCRUPULOUSLY** achieves")).toBe(
      "He **UNSCRUPULOUSLY** achieves"
    );
    expect(normalizeEmphasisWhitespace("He ***UNSCRUPULOUSLY ***achieves")).toBe(
      "He ***UNSCRUPULOUSLY*** achieves"
    );
    expect(normalizeEmphasisWhitespace("He *UNSCRUPULOUSLY *achieves")).toBe(
      "He *UNSCRUPULOUSLY* achieves"
    );
    expect(normalizeEmphasisWhitespace("He ~~UNSCRUPULOUSLY ~~achieves")).toBe(
      "He ~~UNSCRUPULOUSLY~~ achieves"
    );
  });

  it("keeps multiplication asterisks, bullet lists, inline code, fenced code, and LaTeX intact", () => {
    expect(normalizeEmphasisWhitespace("5 * 3 * 2 = 30 and He *fast *ran")).toBe(
      "5 * 3 * 2 = 30 and He *fast* ran"
    );
    expect(normalizeEmphasisWhitespace("* **Item 1 **text\n* **Item 2 **text")).toBe(
      "* **Item 1** text\n* **Item 2** text"
    );
    expect(normalizeEmphasisWhitespace("Use `**raw **` and $a * b$ with **real **bold")).toBe(
      "Use `**raw **` and $a * b$ with **real** bold"
    );
    expect(normalizeEmphasisWhitespace("```\nHe **UNSCRUPULOUSLY **achieves\n```")).toBe(
      "```\nHe **UNSCRUPULOUSLY **achieves\n```"
    );
    expect(normalizeEmphasisWhitespace("***")).toBe("***");
  });

  it("moves trailing spaces outside <strong> tags in editor HTML and rendered MarkdownText", () => {
    const editorHtml = markdownToEditorHtml(
      "He **UNSCRUPULOUSLY **achieves his goals by using his positions."
    );
    expect(editorHtml).toBe(
      "<p>He <strong>UNSCRUPULOUSLY</strong> achieves his goals by using his positions.</p>"
    );

    const renderedHtml = renderToStaticMarkup(
      React.createElement(MarkdownText, {
        text: "He **UNSCRUPULOUSLY **achieves his goals by using his positions.",
      })
    );
    expect(renderedHtml).toMatch(
      /<strong[^>]*class="md-strong"[^>]*>UNSCRUPULOUSLY<\/strong> achieves/
    );
    expect(renderedHtml).not.toContain("**");
  });

  it("converts all DEFAULT_STUDY_NOTES cleanly without leaving raw markdown tokens in paragraphs", () => {
    for (const note of DEFAULT_STUDY_NOTES) {
      const html = markdownToEditorHtml(note.content);
      expect(html.length).toBeGreaterThan(20);
      expect(html).not.toContain("**");
      expect(html).not.toContain("### ");
    }
  });

  it("strips markdown, HTML tags, and LaTeX cleanly for sidebar snippets and plain text copy", () => {
    const sample =
      '### Rule\n- [x] **RA 6713** <mark data-color="#facc15">Section 4</mark> $\\frac{1}{a}$';
    const snippet = stripNoteFormattingForSnippet(sample);
    expect(snippet).toBe("Rule RA 6713 Section 4 1/a");

    const plain = markdownToPlainText(sample);
    expect(plain).toContain("☑ RA 6713 Section 4");
    expect(plain).not.toContain("<mark");
    expect(plain).not.toContain("**");
  });
});
