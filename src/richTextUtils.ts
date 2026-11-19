/**
 * Utilities for converting, sanitizing, and rendering rich HTML & legacy plain text
 * between the A4 Paginated Document Editor and Print/PDF Preview.
 */

const HTML_TAG_REGEX = /<(?:p|h1|h2|h3|ul|ol|li|div|b|strong|i|em|u|s|strike|blockquote|hr|table|span|font|br)\b[^>]*>/i;

const FONT_FAMILY_REGEX = /^[a-zA-Z0-9\s,'"-]+$/;
const CSS_COLOR_REGEX = /^(?:#[0-9a-fA-F]{3,8}|rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)|transparent|inherit|[a-zA-Z]{3,20})$/;
const CSS_LENGTH_REGEX = /^\d+(?:\.\d+)?(?:px|pt|cm|mm|em|rem|%)$/;

function copySafeStyles(source: HTMLElement, target: HTMLElement, options?: { stripPaginationMargins?: boolean }) {
  const tag = source.tagName.toUpperCase();
  const s = source.style;
  if (!s) return;

  const textAlign = s.textAlign?.toLowerCase();
  if (textAlign && ["left", "center", "right", "justify"].includes(textAlign)) {
    target.style.textAlign = textAlign;
  }

  if (s.color && CSS_COLOR_REGEX.test(s.color.trim())) {
    target.style.color = s.color.trim();
  }

  if (s.backgroundColor && CSS_COLOR_REGEX.test(s.backgroundColor.trim())) {
    target.style.backgroundColor = s.backgroundColor.trim();
  }

  if (s.fontFamily && FONT_FAMILY_REGEX.test(s.fontFamily.trim())) {
    target.style.fontFamily = s.fontFamily.trim();
  }

  if (s.fontSize && CSS_LENGTH_REGEX.test(s.fontSize.trim())) {
    target.style.fontSize = s.fontSize.trim();
  }

  if (s.marginLeft && CSS_LENGTH_REGEX.test(s.marginLeft.trim())) {
    target.style.marginLeft = s.marginLeft.trim();
  }

  if (s.paddingLeft && CSS_LENGTH_REGEX.test(s.paddingLeft.trim())) {
    target.style.paddingLeft = s.paddingLeft.trim();
  }

  if (tag === "TABLE" || tag === "TD" || tag === "TH") {
    if (s.width && CSS_LENGTH_REGEX.test(s.width.trim())) {
      target.style.width = s.width.trim();
    }
    if (tag === "TABLE" && s.borderCollapse === "collapse") {
      target.style.borderCollapse = "collapse";
    }
  }

  if (options?.stripPaginationMargins) {
    target.style.marginTop = "";
    target.style.marginBottom = "";
  }
}

export function isHtmlContent(text: string): boolean {
  if (!text) return false;
  return HTML_TAG_REGEX.test(text);
}

/**
 * Returns true if the HTML or plain text contains visible characters or a manual page break.
 */
export function hasRichTextContent(text?: string | null): boolean {
  if (!text) return false;
  if (/data-page-break/i.test(text) || /<(?:hr|table)\b/i.test(text)) return true;
  const plain = text
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\u200B/g, "")
    .trim();
  return plain.length > 0;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Converts legacy plain-text chapter strings (separated by newlines) into structured HTML paragraphs.
 * If the text is already rich HTML, returns sanitized HTML directly.
 */
export function ensureRichHtml(text: string): string {
  if (!text || !text.trim()) {
    return "<p><br></p>";
  }
  if (isHtmlContent(text)) {
    return sanitizeRichHtml(text);
  }

  const lines = text.split(/\n+/);
  const paragraphs = lines
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p>${escapeHtml(line)}</p>`);

  return paragraphs.length > 0 ? paragraphs.join("") : "<p><br></p>";
}

/**
 * Sanitizes rich HTML for safe rendering while preserving editorial formatting,
 * headings, lists, colors, highlights, tables, text alignment, and manual page breaks.
 */
export function sanitizeRichHtml(html: string): string {
  if (!html) return "";

  if (typeof window === "undefined" || typeof DOMParser === "undefined") {
    return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${html}</div>`, "text/html");
    const root = doc.body.firstElementChild;
    if (!root) return "";

    const ALLOWED_TAGS = new Set([
      "P", "BR", "B", "STRONG", "I", "EM", "U", "S", "STRIKE", "SUB", "SUP", "FONT",
      "H1", "H2", "H3", "UL", "OL", "LI", "DIV", "SPAN", "BLOCKQUOTE", "HR",
      "TABLE", "THEAD", "TBODY", "TR", "TH", "TD"
    ]);

    const cleanNode = (node: Node) => {
      const children = Array.from(node.childNodes);
      for (const child of children) {
        if (child.nodeType === Node.ELEMENT_NODE) {
          const el = child as HTMLElement;
          const tag = el.tagName.toUpperCase();

          if (!ALLOWED_TAGS.has(tag)) {
            if (tag === "SCRIPT" || tag === "STYLE" || tag === "IFRAME" || tag === "OBJECT") {
              el.remove();
              continue;
            }
            const frag = doc.createDocumentFragment();
            while (el.firstChild) {
              frag.appendChild(el.firstChild);
            }
            el.replaceWith(frag);
            continue;
          }

          const isPageBreak = el.hasAttribute("data-page-break") || el.classList.contains("a4-page-break");
          const colSpan = el.getAttribute("colspan");
          const rowSpan = el.getAttribute("rowspan");
          const fontColor = tag === "FONT" ? el.getAttribute("color") : null;
          const fontFace = tag === "FONT" ? el.getAttribute("face") : null;

          // Snapshot safe inline styles onto a detached holder before stripping raw attributes
          const tempHolder = doc.createElement("span");
          copySafeStyles(el, tempHolder);

          const attrs = Array.from(el.attributes);
          for (const attr of attrs) {
            el.removeAttribute(attr.name);
          }

          if (isPageBreak) {
            el.setAttribute("data-page-break", "true");
            el.setAttribute("contenteditable", "false");
            el.className = "a4-page-break";
            el.innerHTML = "";
            continue;
          }

          if (tempHolder.getAttribute("style")) {
            el.setAttribute("style", tempHolder.getAttribute("style") || "");
          }

          if (fontColor && CSS_COLOR_REGEX.test(fontColor.trim())) {
            el.style.color = fontColor.trim();
          }
          if (fontFace && FONT_FAMILY_REGEX.test(fontFace.trim())) {
            el.style.fontFamily = fontFace.trim();
          }
          if ((tag === "TD" || tag === "TH") && colSpan && /^\d+$/.test(colSpan)) {
            el.setAttribute("colspan", colSpan);
          }
          if ((tag === "TD" || tag === "TH") && rowSpan && /^\d+$/.test(rowSpan)) {
            el.setAttribute("rowspan", rowSpan);
          }

          cleanNode(el);
        }
      }
    };

    cleanNode(root);
    return root.innerHTML;
  } catch {
    return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  }
}

/**
 * Normalizes editor HTML before persisting: strips runtime pagination inline margins
 * while preserving user editorial styling (alignment, colors, highlights, tables, indents).
 */
export function serializeEditorHtml(containerEl: HTMLElement): string {
  const clone = containerEl.cloneNode(true) as HTMLElement;

  const allEls = clone.querySelectorAll<HTMLElement>("*");
  allEls.forEach((el) => {
    if (el.hasAttribute("data-page-break")) {
      el.removeAttribute("style");
      el.innerHTML = "";
      el.className = "a4-page-break";
      el.setAttribute("data-page-break", "true");
      el.setAttribute("contenteditable", "false");
      return;
    }

    const tempHolder = document.createElement("span");
    copySafeStyles(el, tempHolder, { stripPaginationMargins: true });
    const safeStyle = tempHolder.getAttribute("style");

    if (safeStyle) {
      el.setAttribute("style", safeStyle);
    } else {
      el.removeAttribute("style");
    }

    el.removeAttribute("data-paginated");
  });

  return clone.innerHTML;
}
