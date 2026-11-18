/**
 * Utilities for converting, sanitizing, and rendering rich HTML & legacy plain text
 * between the A4 Paginated Document Editor and Print/PDF Preview.
 */

const HTML_TAG_REGEX = /<(?:p|h1|h2|h3|ul|ol|li|div|b|strong|i|em|u|br)\b[^>]*>/i;

export function isHtmlContent(text: string): boolean {
  if (!text) return false;
  return HTML_TAG_REGEX.test(text);
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
 * headings, lists, text alignment, and manual page breaks.
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
      "P", "BR", "B", "STRONG", "I", "EM", "U", "S",
      "H1", "H2", "H3", "UL", "OL", "LI", "DIV", "SPAN", "BLOCKQUOTE", "HR"
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
            // Unwrap disallowed tags preserving text content
            const frag = doc.createDocumentFragment();
            while (el.firstChild) {
              frag.appendChild(el.firstChild);
            }
            el.replaceWith(frag);
            continue;
          }

          // Clean attributes
          const isPageBreak = el.hasAttribute("data-page-break") || el.classList.contains("a4-page-break");
          const textAlign = el.style?.textAlign;
          const attrs = Array.from(el.attributes);
          for (const attr of attrs) {
            el.removeAttribute(attr.name);
          }

          if (isPageBreak) {
            el.setAttribute("data-page-break", "true");
            el.setAttribute("contenteditable", "false");
            el.className = "a4-page-break";
            // Keep marker clean
            el.innerHTML = "";
            continue;
          }

          if (textAlign && ["left", "center", "right", "justify"].includes(textAlign)) {
            el.style.textAlign = textAlign;
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
 * so stored HTML remains completely clean and portable.
 */
export function serializeEditorHtml(containerEl: HTMLElement): string {
  const clone = containerEl.cloneNode(true) as HTMLElement;

  // Strip temporary pagination inline margin/padding applied by layout engine
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

    // Preserve only text-align if present
    const align = el.style?.textAlign;
    el.removeAttribute("style");
    if (align && ["left", "center", "right", "justify"].includes(align)) {
      el.style.textAlign = align;
    }
    el.removeAttribute("data-paginated");
  });

  return clone.innerHTML;
}
