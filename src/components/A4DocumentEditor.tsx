/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Undo2,
  Redo2,
  Eye,
  Edit3,
  Check,
  Sparkles,
  ChevronDown,
  SeparatorHorizontal,
  ZoomIn,
  ZoomOut,
  Printer,
  Trash2,
  TableProperties,
  Highlighter,
  Baseline,
  RemoveFormatting,
  Table as TableIcon,
  Minus,
  IndentIncrease,
  IndentDecrease,
} from "lucide-react";
import { Report } from "../types";
import { UnifiedChapter } from "../chapterHierarchy";
import { ReportPhases } from "./ReportPhases";
import { ensureRichHtml, hasRichTextContent, sanitizeRichHtml, serializeEditorHtml } from "../richTextUtils";

// Exact A4 dimensions at 96 DPI (210mm x 297mm)
const A4_WIDTH = 794;
const A4_HEIGHT = 1123;
const PAGE_GAP = 24;
const PAGE_STEP = A4_HEIGHT + PAGE_GAP;

const MARGIN_PX_MAP: Record<"1.5" | "2.0" | "2.5" | "3.0", number> = {
  "1.5": 57,  // ~1.5 cm
  "2.0": 76,  // ~2.0 cm
  "2.5": 94,  // ~2.5 cm
  "3.0": 113, // ~3.0 cm
};

const INDENT_CSS_MAP: Record<"none" | "medium" | "large", string> = {
  none: "0cm",
  medium: "1.5cm",
  large: "2.5cm",
};

const DOC_FONT_CSS_MAP: Record<"Inter" | "Arial" | "Calibri" | "Times New Roman" | "Georgia", string> = {
  Inter: '"Inter", ui-sans-serif, system-ui, sans-serif',
  Arial: 'Arial, Helvetica, sans-serif',
  Calibri: 'Calibri, "Segoe UI", Arial, sans-serif',
  "Times New Roman": '"Times New Roman", Times, serif',
  Georgia: 'Georgia, Cambria, "Times New Roman", serif',
};

const TEXT_COLORS = [
  { label: "Preto Padrão", value: "#1e293b" },
  { label: "Preto Absoluto", value: "#000000" },
  { label: "Cinza Grafite", value: "#475569" },
  { label: "Azul Institucional", value: "#1d4ed8" },
  { label: "Verde SST", value: "#047857" },
  { label: "Âmbar Alerta", value: "#b45309" },
  { label: "Vermelho Crítico", value: "#b91c1c" },
  { label: "Roxo Técnico", value: "#6d28d9" },
];

const HIGHLIGHT_COLORS = [
  { label: "Sem destaque", value: "transparent" },
  { label: "Amarelo", value: "#fef08a" },
  { label: "Verde suave", value: "#bbf7d0" },
  { label: "Azul suave", value: "#bfdbfe" },
  { label: "Rosa suave", value: "#fecdd3" },
  { label: "Cinza suave", value: "#e2e8f0" },
];

const ZOOM_PRESETS: Array<{ value: "fit" | "0.75" | "0.9" | "1" | "1.15" | "1.25" | "1.4"; label: string }> = [
  { value: "0.75", label: "75%" },
  { value: "0.9", label: "90%" },
  { value: "1", label: "100%" },
  { value: "1.15", label: "115%" },
  { value: "1.25", label: "125%" },
  { value: "1.4", label: "140%" },
];

export interface AutoVariable {
  key: string;
  label: string;
  desc?: string;
}

export interface ContinuousChapterItem {
  id: string;
  type: "standard" | "custom" | "phases";
  number: string;
  title: string;
  fullTitle: string;
  level: number;
  value: string;
  tip?: string;
}

interface A4DocumentEditorProps {
  chapters: ContinuousChapterItem[];
  activeChapterId: string;
  scrollToChapterRequest: { id: string; nonce: number } | null;
  onActiveChapterChange: (chapterId: string) => void;
  onChangeChapterText: (chapterId: string, newHtml: string) => void;
  paragraphIndent: "none" | "medium" | "large";
  onChangeIndent: (indent: "none" | "medium" | "large") => void;
  pageMarginCm: "1.5" | "2.0" | "2.5" | "3.0";
  onChangeMargin: (margin: "1.5" | "2.0" | "2.5" | "3.0") => void;
  documentFont?: "Inter" | "Arial" | "Calibri" | "Times New Roman" | "Georgia";
  onChangeDocumentFont?: (font: "Inter" | "Arial" | "Calibri" | "Times New Roman" | "Georgia") => void;
  documentFontSize?: "12px" | "13.5px" | "14.5px" | "16px";
  onChangeDocumentFontSize?: (size: "12px" | "13.5px" | "14.5px" | "16px") => void;
  documentLineHeight?: "1.35" | "1.5" | "1.65" | "1.85" | "2.0";
  onChangeDocumentLineHeight?: (lh: "1.35" | "1.5" | "1.65" | "1.85" | "2.0") => void;
  resolvePreviewText: (rawHtml: string) => string;
  autoVariables: AutoVariable[];
  report: Report;
  assessor: {
    fantasyName: string;
    logo?: string;
  };
  companyName: string;
  companyLogo?: string;
  showSavedNotification?: boolean;
  onEditChapterTitle?: (chapterId: string) => void;
  onDeleteChapter?: (chapterId: string, fullTitle: string, isStandard: boolean) => void;
}

interface ChapterEditableBodyProps {
  chapterId: string;
  value: string;
  indentCss: string;
  docFontCss: string;
  docSizeCss: string;
  docLineHeightCss: string;
  hasSubchapters?: boolean;
  onChangeValue: (chapterId: string, cleanHtml: string) => void;
  onFocusChapter: (chapterId: string, editorEl: HTMLDivElement) => void;
  onSelectionActivity: (chapterId: string, editorEl: HTMLDivElement) => void;
  onRequestLayout: () => void;
  registerEditorRef: (chapterId: string, el: HTMLDivElement | null) => void;
  setLastEmittedExternal: (chapterId: string, html: string) => void;
  getLastEmittedExternal: (chapterId: string) => string;
}

const ChapterEditableBody = React.memo<ChapterEditableBodyProps>(
  ({
    chapterId,
    value,
    indentCss,
    docFontCss,
    docSizeCss,
    docLineHeightCss,
    hasSubchapters = false,
    onChangeValue,
    onFocusChapter,
    onSelectionActivity,
    onRequestLayout,
    registerEditorRef,
    setLastEmittedExternal,
    getLastEmittedExternal,
  }) => {
    const localRef = useRef<HTMLDivElement | null>(null);

    const setRefs = useCallback(
      (el: HTMLDivElement | null) => {
        localRef.current = el;
        registerEditorRef(chapterId, el);
      },
      [chapterId, registerEditorRef]
    );

    const syncEmptyAttr = (editorEl: HTMLDivElement) => {
      const isTextEmpty =
        !editorEl.textContent?.trim() && !editorEl.querySelector("[data-page-break]");
      editorEl.setAttribute("data-empty", isTextEmpty ? "true" : "false");
    };

    // Sync initial or external value changes without disrupting cursor
    useEffect(() => {
      const editorEl = localRef.current;
      if (!editorEl) return;

      const normalizedHtml = ensureRichHtml(value);
      const lastEmitted = getLastEmittedExternal(chapterId);

      if (editorEl.innerHTML === "") {
        editorEl.innerHTML = normalizedHtml;
        syncEmptyAttr(editorEl);
        setLastEmittedExternal(chapterId, normalizedHtml);
        onRequestLayout();
        return;
      }

      if (value !== lastEmitted && normalizedHtml !== lastEmitted) {
        // Never overwrite DOM while the user is actively typing inside this chapter
        if (document.activeElement === editorEl) {
          return;
        }
        const currentClean = serializeEditorHtml(editorEl);
        if (normalizedHtml !== currentClean) {
          editorEl.innerHTML = normalizedHtml;
          syncEmptyAttr(editorEl);
          setLastEmittedExternal(chapterId, normalizedHtml);
          onRequestLayout();
        }
      } else {
        syncEmptyAttr(editorEl);
      }
    }, [chapterId, value, onRequestLayout, setLastEmittedExternal, getLastEmittedExternal]);

    const emitLocalChange = () => {
      const editorEl = localRef.current;
      if (!editorEl) return;
      syncEmptyAttr(editorEl);
      const cleanHtml = serializeEditorHtml(editorEl);
      setLastEmittedExternal(chapterId, cleanHtml);
      onChangeValue(chapterId, cleanHtml);
      onRequestLayout();
    };

    const handleInput = () => {
      const editorEl = localRef.current;
      if (!editorEl) return;

      if (editorEl.innerHTML.trim() === "" || editorEl.innerHTML === "<br>") {
        editorEl.innerHTML = "<p><br></p>";
        try {
          const sel = window.getSelection();
          const p = editorEl.firstElementChild;
          if (sel && p) {
            const r = document.createRange();
            r.setStart(p, 0);
            r.collapse(true);
            sel.removeAllRanges();
            sel.addRange(r);
          }
        } catch {
          // ignore range selection fallback
        }
      }

      emitLocalChange();
    };

    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      const breakEl = target.closest("[data-page-break='true']");
      if (breakEl) {
        e.preventDefault();
        e.stopPropagation();
        breakEl.remove();
        emitLocalChange();
        return;
      }
      if (localRef.current) {
        onSelectionActivity(chapterId, localRef.current);
      }
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
      e.preventDefault();
      const plain = e.clipboardData.getData("text/plain");
      if (!plain) return;

      document.execCommand("defaultParagraphSeparator", false, "p");
      const lines = plain.split(/\r?\n/);
      if (lines.length === 1) {
        document.execCommand("insertText", false, lines[0]);
      } else {
        const htmlSnippet = lines
          .map((line) => {
            const escaped = line
              .replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;");
            return escaped.trim() ? `<p>${escaped}</p>` : "<p><br></p>";
          })
          .join("");
        document.execCommand("insertHTML", false, htmlSnippet);
      }
      emitLocalChange();
    };

    return (
      <div
        ref={setRefs}
        data-chapter-editor={chapterId}
        data-has-subchapters={hasSubchapters ? "true" : "false"}
        contentEditable={true}
        suppressContentEditableWarning={true}
        onFocus={() => localRef.current && onFocusChapter(chapterId, localRef.current)}
        onInput={handleInput}
        onKeyUp={() => localRef.current && onSelectionActivity(chapterId, localRef.current)}
        onMouseUp={() => localRef.current && onSelectionActivity(chapterId, localRef.current)}
        onClick={handleClick}
        onPaste={handlePaste}
        style={
          {
            "--doc-indent": indentCss,
            "--doc-font": docFontCss,
            "--doc-size": docSizeCss,
            "--doc-line-height": docLineHeightCss,
          } as React.CSSProperties
        }
        className={`a4-doc-content outline-none cursor-text ${
          hasSubchapters ? "min-h-[16px]" : "min-h-[110px]"
        }`}
      />
    );
  }
);

ChapterEditableBody.displayName = "ChapterEditableBody";

interface ChapterPreviewBodyProps {
  rawValue: string;
  indentCss: string;
  docFontCss: string;
  docSizeCss: string;
  docLineHeightCss: string;
  resolvePreviewText: (rawHtml: string) => string;
}

const ChapterPreviewBody = React.memo<ChapterPreviewBodyProps>(
  ({ rawValue, indentCss, docFontCss, docSizeCss, docLineHeightCss, resolvePreviewText }) => {
    const cleanHtml = useMemo(() => {
      const resolved = resolvePreviewText(ensureRichHtml(rawValue));
      return sanitizeRichHtml(resolved);
    }, [rawValue, resolvePreviewText]);

    return (
      <div
        style={
          {
            "--doc-indent": indentCss,
            "--doc-font": docFontCss,
            "--doc-size": docSizeCss,
            "--doc-line-height": docLineHeightCss,
          } as React.CSSProperties
        }
        className="a4-doc-content min-h-[20px]"
        dangerouslySetInnerHTML={{ __html: cleanHtml }}
      />
    );
  }
);

ChapterPreviewBody.displayName = "ChapterPreviewBody";

export const A4DocumentEditor: React.FC<A4DocumentEditorProps> = ({
  chapters,
  activeChapterId,
  scrollToChapterRequest,
  onActiveChapterChange,
  onChangeChapterText,
  paragraphIndent,
  onChangeIndent,
  pageMarginCm,
  onChangeMargin,
  documentFont = "Inter",
  onChangeDocumentFont,
  documentFontSize = "13.5px",
  onChangeDocumentFontSize,
  documentLineHeight = "1.65",
  onChangeDocumentLineHeight,
  resolvePreviewText,
  autoVariables,
  report,
  assessor,
  companyName,
  companyLogo,
  showSavedNotification = false,
  onEditChapterTitle,
  onDeleteChapter,
}) => {
  const [viewMode, setViewMode] = useState<"edit" | "preview">("edit");
  const [zoomMode, setZoomMode] = useState<"fit" | "0.75" | "0.9" | "1" | "1.15" | "1.25" | "1.4">("fit");
  const [containerWidth, setContainerWidth] = useState<number>(960);
  const [pageCount, setPageCount] = useState<number>(1);
  const [currentVisiblePage, setCurrentVisiblePage] = useState<number>(1);
  const [chapterPageMap, setChapterPageMap] = useState<Record<string, number>>({});
  const [showVariablesMenu, setShowVariablesMenu] = useState<boolean>(false);
  const [showColorMenu, setShowColorMenu] = useState<boolean>(false);
  const [showHighlightMenu, setShowHighlightMenu] = useState<boolean>(false);
  const [showTableMenu, setShowTableMenu] = useState<boolean>(false);

  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    strike: false,
    align: "justify" as "left" | "center" | "right" | "justify",
    block: "p" as "p" | "h1" | "h2" | "h3" | "blockquote",
    ul: false,
    ol: false,
  });

  const viewportRef = useRef<HTMLDivElement>(null);
  const stackWrapperRef = useRef<HTMLDivElement>(null);
  const stackRef = useRef<HTMLDivElement>(null);
  const flowRef = useRef<HTMLDivElement>(null);
  const variablesMenuRef = useRef<HTMLDivElement>(null);
  const colorMenuRef = useRef<HTMLDivElement>(null);
  const highlightMenuRef = useRef<HTMLDivElement>(null);
  const tableMenuRef = useRef<HTMLDivElement>(null);

  const editorRefsMap = useRef<Map<string, HTMLDivElement>>(new Map());
  const lastEmittedByChapterRef = useRef<Map<string, string>>(new Map());
  const focusedChapterIdRef = useRef<string>(activeChapterId);
  const savedRangeRef = useRef<{ chapterId: string; range: Range } | null>(null);

  const pageCountRef = useRef<number>(1);
  const layoutRafRef = useRef<number | null>(null);
  const layoutDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollSyncRafRef = useRef<number | null>(null);
  const programmaticScrollUntilRef = useRef<number>(0);
  const isPaginatingRef = useRef<boolean>(false);
  const lastHandledScrollNonceRef = useRef<number>(0);

  const marginPx = MARGIN_PX_MAP[pageMarginCm] || 76;
  const indentCss = INDENT_CSS_MAP[paragraphIndent] || "1.5cm";
  const docFontCss = DOC_FONT_CSS_MAP[documentFont] || DOC_FONT_CSS_MAP.Inter;
  const docSizeCss = documentFontSize || "13.5px";
  const docLineHeightCss = documentLineHeight || "1.65";

  const isQualitative = report.methodology === "qualitative";
  const hasRecognizedRisks =
    report.sectors.length > 0
      ? report.sectors.some((s) => s.risksRecognized !== false)
      : report.risksRecognized !== false;

  const activeChapter = useMemo(
    () => chapters.find((c) => c.id === activeChapterId) || chapters[0],
    [chapters, activeChapterId]
  );

  const chaptersSignature = useMemo(
    () => chapters.map((c) => `${c.id}:${c.level}:${c.fullTitle}`).join("|"),
    [chapters]
  );

  // Responsive scale calculation so A4 fills wide screens crisply without clipping
  const scale = useMemo(() => {
    if (zoomMode !== "fit") {
      return parseFloat(zoomMode);
    }
    const available = Math.max(320, containerWidth - 48);
    return Math.min(1.22, Math.max(0.45, Number((available / A4_WIDTH).toFixed(3))));
  }, [zoomMode, containerWidth]);

  // Observe outer viewport width
  useEffect(() => {
    const el = viewportRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;

    const updateWidth = () => setContainerWidth(el.clientWidth);
    updateWidth();

    const ro = new ResizeObserver(updateWidth);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Close popovers on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (variablesMenuRef.current && !variablesMenuRef.current.contains(target)) {
        setShowVariablesMenu(false);
      }
      if (colorMenuRef.current && !colorMenuRef.current.contains(target)) {
        setShowColorMenu(false);
      }
      if (highlightMenuRef.current && !highlightMenuRef.current.contains(target)) {
        setShowHighlightMenu(false);
      }
      if (tableMenuRef.current && !tableMenuRef.current.contains(target)) {
        setShowTableMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const registerEditorRef = useCallback((chapterId: string, el: HTMLDivElement | null) => {
    if (el) {
      editorRefsMap.current.set(chapterId, el);
    } else {
      editorRefsMap.current.delete(chapterId);
    }
  }, []);

  const setLastEmittedExternal = useCallback((chapterId: string, html: string) => {
    lastEmittedByChapterRef.current.set(chapterId, html);
  }, []);

  const getLastEmittedExternal = useCallback((chapterId: string) => {
    return lastEmittedByChapterRef.current.get(chapterId) || "";
  }, []);

  // Full Continuous A4 Pagination Layout Engine across all chapters
  const runPaginationLayout = useCallback(() => {
    const flowEl = flowRef.current;
    const stackEl = stackRef.current;
    const viewportEl = viewportRef.current;
    if (!flowEl || !stackEl) return;

    const currentScale = scale || 1;
    const maxPrintableHeight = A4_HEIGHT - marginPx * 2;

    // Capture current viewport scroll and visual anchor element BEFORE resetting pagination margins
    const prevScrollTop = viewportEl ? viewportEl.scrollTop : 0;
    let anchorEl: HTMLElement | null = null;
    let beforeAnchorTop = 0;

    if (viewportEl) {
      const activeEl = document.activeElement as HTMLElement | null;
      if (activeEl && flowEl.contains(activeEl)) {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0 && activeEl.contains(sel.anchorNode)) {
          let curr: Node | null = sel.anchorNode;
          while (curr && curr !== activeEl) {
            if (curr.parentNode === activeEl && curr.nodeType === Node.ELEMENT_NODE) {
              anchorEl = curr as HTMLElement;
              break;
            }
            curr = curr.parentNode;
          }
        }
        if (!anchorEl) {
          anchorEl = activeEl.closest("section[data-chapter-block]") as HTMLElement | null;
        }
      }

      if (!anchorEl) {
        const vpTop = viewportEl.getBoundingClientRect().top;
        const sections = Array.from(
          flowEl.querySelectorAll(":scope > section[data-chapter-block]")
        ) as HTMLElement[];
        for (const sec of sections) {
          if (sec.getBoundingClientRect().bottom > vpTop + 20) {
            anchorEl = sec;
            break;
          }
        }
      }

      if (anchorEl) {
        beforeAnchorTop = anchorEl.getBoundingClientRect().top;
      }
    }

    isPaginatingRef.current = true;

    const getRelTop = (node: HTMLElement) => {
      const sTop = stackEl.getBoundingClientRect().top;
      return (node.getBoundingClientRect().top - sTop) / currentScale;
    };

    const getRelBottom = (node: HTMLElement) => {
      const sTop = stackEl.getBoundingClientRect().top;
      return (node.getBoundingClientRect().bottom - sTop) / currentScale;
    };

    // 1. Reset previously injected pagination spacing across all chapters
    const resetTargets = flowEl.querySelectorAll<HTMLElement>("[data-paginated='true']");
    resetTargets.forEach((node) => {
      node.style.marginTop = "";
      node.style.marginBottom = "";
      node.removeAttribute("data-paginated");
    });

    // Synchronous reflow after clearing pagination offsets
    void flowEl.offsetHeight;

    let highestPageIndex = 0;
    let maxContentBottom = marginPx + 120;
    const nextChapterPageMap: Record<string, number> = {};

    const pushElementTopTo = (el: HTMLElement, targetY: number) => {
      const currentTop = getRelTop(el);
      const delta = targetY - currentTop;
      if (delta > 0.5) {
        const prevMt = parseFloat(window.getComputedStyle(el).marginTop) || 0;
        el.style.marginTop = `${prevMt + delta}px`;
        el.setAttribute("data-paginated", "true");
        const verifiedTop = getRelTop(el);
        const residual = targetY - verifiedTop;
        if (residual > 0.5) {
          el.style.marginTop = `${prevMt + delta + residual}px`;
        }
      }
    };

    const paginateBlock = (el: HTMLElement, keepWithNextPx = 0) => {
      let elTop = getRelTop(el);
      let elBottom = getRelBottom(el);
      const elHeight = Math.max(0, elBottom - elTop);

      let elPage = Math.max(highestPageIndex, Math.floor(Math.max(0, elTop) / PAGE_STEP));
      const sheetTop = elPage * PAGE_STEP + marginPx;
      const sheetBottom = elPage * PAGE_STEP + A4_HEIGHT - marginPx;

      if (elTop < sheetTop - 0.5) {
        pushElementTopTo(el, sheetTop);
        elTop = getRelTop(el);
        elBottom = getRelBottom(el);
      }

      if (
        elBottom + keepWithNextPx > sheetBottom + 1 &&
        elTop > sheetTop + 6 &&
        elHeight + keepWithNextPx <= maxPrintableHeight - 8
      ) {
        const nextPageTop = (elPage + 1) * PAGE_STEP + marginPx;
        pushElementTopTo(el, nextPageTop);
        elBottom = getRelBottom(el);
        highestPageIndex = Math.max(highestPageIndex, elPage + 1);
      } else {
        highestPageIndex = Math.max(
          highestPageIndex,
          Math.floor(Math.max(0, elBottom - 1) / PAGE_STEP)
        );
      }

      maxContentBottom = Math.max(maxContentBottom, elBottom);
    };

    const paginateRichFlowContainer = (containerEl: HTMLElement) => {
      const children = Array.from(containerEl.children) as HTMLElement[];

      for (let i = 0; i < children.length; i++) {
        const el = children[i];
        if (!el) continue;

        const isBreak = el.hasAttribute("data-page-break") || el.classList.contains("a4-page-break");

        if (isBreak) {
          const breakTop = getRelTop(el);
          const breakPage = Math.max(highestPageIndex, Math.floor(Math.max(0, breakTop) / PAGE_STEP));
          const nextPageStart = (breakPage + 1) * PAGE_STEP + marginPx;
          const breakBottom = getRelBottom(el);
          const spaceNeeded = Math.max(0, nextPageStart - breakBottom);

          el.style.marginBottom = `${spaceNeeded}px`;
          el.setAttribute("data-paginated", "true");

          highestPageIndex = breakPage + 1;
          maxContentBottom = Math.max(maxContentBottom, nextPageStart + 24);
          continue;
        }

        const tag = el.tagName.toUpperCase();

        if ((tag === "UL" || tag === "OL") && el.children.length > 1) {
          let elTop = getRelTop(el);
          let elPage = Math.max(highestPageIndex, Math.floor(Math.max(0, elTop) / PAGE_STEP));
          const ulSheetTop = elPage * PAGE_STEP + marginPx;
          if (elTop < ulSheetTop - 0.5) {
            pushElementTopTo(el, ulSheetTop);
          }

          const listItems = Array.from(el.children) as HTMLElement[];
          for (const li of listItems) {
            let liTop = getRelTop(li);
            let liBottom = getRelBottom(li);
            const liPage = Math.max(highestPageIndex, Math.floor(Math.max(0, liTop) / PAGE_STEP));
            const liCeiling = liPage * PAGE_STEP + marginPx;
            const liFloor = liPage * PAGE_STEP + A4_HEIGHT - marginPx;

            if (liTop < liCeiling - 0.5) {
              pushElementTopTo(li, liCeiling);
              liTop = getRelTop(li);
              liBottom = getRelBottom(li);
            }

            if (liBottom > liFloor + 1 && liTop > liCeiling + 4) {
              const nextTop = (liPage + 1) * PAGE_STEP + marginPx;
              pushElementTopTo(li, nextTop);
              liBottom = getRelBottom(li);
              highestPageIndex = Math.max(highestPageIndex, liPage + 1);
            }
            maxContentBottom = Math.max(maxContentBottom, liBottom);
          }

          const endBottom = getRelBottom(el);
          highestPageIndex = Math.max(
            highestPageIndex,
            Math.floor(Math.max(0, endBottom - 1) / PAGE_STEP)
          );
          maxContentBottom = Math.max(maxContentBottom, endBottom);
        } else {
          const keepNext = tag === "H1" || tag === "H2" || tag === "H3" ? 42 : 0;
          paginateBlock(el, keepNext);
        }
      }
    };

    const chapterSections = Array.from(
      flowEl.querySelectorAll(":scope > section[data-chapter-block]")
    ) as HTMLElement[];

    for (let secIdx = 0; secIdx < chapterSections.length; secIdx++) {
      const sec = chapterSections[secIdx];
      const chId = sec.getAttribute("data-chapter-block") || "";
      const chLevel = parseInt(sec.getAttribute("data-chapter-level") || "1", 10);

      // Level-1 main chapters (after the very first) start cleanly at the top of a new A4 page
      if (secIdx > 0 && chLevel === 1) {
        const curSecTop = getRelTop(sec);
        const curSecPage = Math.floor(Math.max(0, curSecTop) / PAGE_STEP);
        const targetPage = Math.max(highestPageIndex + 1, curSecPage);
        pushElementTopTo(sec, targetPage * PAGE_STEP + marginPx);
        highestPageIndex = targetPage;
      } else {
        // Subchapters flow inline, ensuring heading stays out of top margin and never stranded at page bottom
        const secHeading = sec.querySelector<HTMLElement>(":scope > [data-flow-heading='true']");
        if (secHeading) {
          const hTop = getRelTop(secHeading);
          const hBottom = getRelBottom(secHeading);
          const hPage = Math.max(highestPageIndex, Math.floor(Math.max(0, hTop) / PAGE_STEP));
          const sheetTop = hPage * PAGE_STEP + marginPx;
          const sheetBottom = hPage * PAGE_STEP + A4_HEIGHT - marginPx;

          if (hTop < sheetTop - 0.5) {
            pushElementTopTo(sec, sheetTop);
          } else if (hBottom + 48 > sheetBottom + 1 && hTop > sheetTop + 8) {
            const nextPageTop = (hPage + 1) * PAGE_STEP + marginPx;
            pushElementTopTo(sec, nextPageTop);
            highestPageIndex = Math.max(highestPageIndex, hPage + 1);
          }
        }
      }

      const secStartPage = Math.floor(Math.max(0, getRelTop(sec)) / PAGE_STEP) + 1;
      if (chId) {
        nextChapterPageMap[chId] = secStartPage;
      }

      if (chId === "fases-automaticas") {
        if (viewMode === "edit") {
          paginateBlock(sec);
        } else {
          // Paginate automated phases sections & inner cards in Visualização Real
          const phaseSections = Array.from(
            sec.querySelectorAll("[data-print-section='true']")
          ) as HTMLElement[];
          if (phaseSections.length === 0) {
            paginateBlock(sec);
          } else {
            for (let pIdx = 0; pIdx < phaseSections.length; pIdx++) {
              const pSec = phaseSections[pIdx];
              if (pIdx > 0) {
                const targetPage = Math.max(
                  highestPageIndex + 1,
                  Math.floor(Math.max(0, getRelTop(pSec)) / PAGE_STEP)
                );
                pushElementTopTo(pSec, targetPage * PAGE_STEP + marginPx);
                highestPageIndex = targetPage;
              }

              const pChildren = Array.from(pSec.children) as HTMLElement[];
              for (const child of pChildren) {
                const subTargets = Array.from(
                  child.querySelectorAll(":scope > [data-print-subpage-target]")
                ) as HTMLElement[];
                if (subTargets.length > 0) {
                  for (const sub of subTargets) {
                    const subHeight = Math.max(0, getRelBottom(sub) - getRelTop(sub));
                    if (subHeight <= maxPrintableHeight - 10) {
                      paginateBlock(sub);
                    } else {
                      // Paginate sector header, tables, or cards individually
                      const innerParts = Array.from(sub.children) as HTMLElement[];
                      for (const part of innerParts) {
                        const nestedCards = part.classList.contains("space-y-4")
                          ? (Array.from(part.children) as HTMLElement[])
                          : [];
                        if (nestedCards.length > 0) {
                          for (const card of nestedCards) {
                            paginateBlock(card);
                          }
                        } else {
                          paginateBlock(part);
                        }
                      }
                    }
                  }
                } else {
                  paginateBlock(child);
                }
              }
            }
          }
        }
      } else {
        const headingEl = sec.querySelector<HTMLElement>(":scope > [data-flow-heading='true']");
        if (headingEl) {
          maxContentBottom = Math.max(maxContentBottom, getRelBottom(headingEl));
        }

        const docContentEl = sec.querySelector<HTMLElement>(":scope > .a4-doc-content");
        if (docContentEl) {
          paginateRichFlowContainer(docContentEl);
        }
      }
    }

    const bottomPageIndex = Math.floor(Math.max(0, maxContentBottom - 1) / PAGE_STEP);
    const computedPages = Math.max(1, Math.max(highestPageIndex, bottomPageIndex) + 1);
    const newStackHeight = computedPages * A4_HEIGHT + Math.max(0, computedPages - 1) * PAGE_GAP;

    // Synchronously update stack heights before restoring scrollTop so new pages never get clamped
    stackEl.style.height = `${newStackHeight}px`;
    if (stackWrapperRef.current) {
      stackWrapperRef.current.style.height = `${newStackHeight * currentScale}px`;
    }

    if (viewportEl) {
      if (anchorEl && anchorEl.isConnected) {
        const afterAnchorTop = anchorEl.getBoundingClientRect().top;
        const drift = afterAnchorTop - beforeAnchorTop;
        const targetScroll = Math.max(0, prevScrollTop + drift);
        if (Math.abs(viewportEl.scrollTop - targetScroll) > 0.5) {
          viewportEl.scrollTop = targetScroll;
        }
      } else if (Math.abs(viewportEl.scrollTop - prevScrollTop) > 0.5) {
        viewportEl.scrollTop = prevScrollTop;
      }
    }

    requestAnimationFrame(() => {
      isPaginatingRef.current = false;
    });

    if (computedPages !== pageCountRef.current) {
      pageCountRef.current = computedPages;
      setPageCount(computedPages);
    }

    setChapterPageMap((prev) => {
      const prevKeys = Object.keys(prev);
      const nextKeys = Object.keys(nextChapterPageMap);
      if (
        prevKeys.length === nextKeys.length &&
        nextKeys.every((k) => prev[k] === nextChapterPageMap[k])
      ) {
        return prev;
      }
      return nextChapterPageMap;
    });
  }, [viewMode, scale, marginPx]);

  const schedulePaginationLayout = useCallback(
    (immediate = false) => {
      if (layoutDebounceRef.current !== null) {
        clearTimeout(layoutDebounceRef.current);
        layoutDebounceRef.current = null;
      }
      if (layoutRafRef.current !== null) {
        cancelAnimationFrame(layoutRafRef.current);
        layoutRafRef.current = null;
      }

      const queueRaf = () => {
        layoutRafRef.current = requestAnimationFrame(() => {
          layoutRafRef.current = null;
          runPaginationLayout();
        });
      };

      if (immediate) {
        queueRaf();
      } else {
        layoutDebounceRef.current = setTimeout(() => {
          layoutDebounceRef.current = null;
          queueRaf();
        }, 160);
      }
    },
    [runPaginationLayout]
  );

  const requestDebouncedLayout = useCallback(() => {
    schedulePaginationLayout(false);
  }, [schedulePaginationLayout]);

  // Re-run layout immediately when structural chapter order/titles, view mode, margins, indent, typography, or zoom changes
  useEffect(() => {
    schedulePaginationLayout(true);
  }, [
    chaptersSignature,
    pageMarginCm,
    paragraphIndent,
    docFontCss,
    docSizeCss,
    docLineHeightCss,
    scale,
    viewMode,
    schedulePaginationLayout,
  ]);

  useEffect(() => {
    return () => {
      if (layoutDebounceRef.current !== null) clearTimeout(layoutDebounceRef.current);
      if (layoutRafRef.current !== null) cancelAnimationFrame(layoutRafRef.current);
      if (scrollSyncRafRef.current !== null) cancelAnimationFrame(scrollSyncRafRef.current);
    };
  }, []);

  // Scroll smoothly to requested chapter ONLY when a new navigation nonce arrives
  useEffect(() => {
    if (!scrollToChapterRequest) return;
    if (scrollToChapterRequest.nonce === lastHandledScrollNonceRef.current) return;
    lastHandledScrollNonceRef.current = scrollToChapterRequest.nonce;

    const targetId = scrollToChapterRequest.id;

    // Clear stale selection pointing to another chapter so toolbar commands target the new chapter
    if (savedRangeRef.current && savedRangeRef.current.chapterId !== targetId) {
      savedRangeRef.current = null;
    }
    focusedChapterIdRef.current = targetId;

    let cancelled = false;
    let innerRafId = 0;

    const rafId = requestAnimationFrame(() => {
      if (cancelled) return;
      runPaginationLayout();

      innerRafId = requestAnimationFrame(() => {
        if (cancelled) return;
        const viewportEl = viewportRef.current;
        const flowEl = flowRef.current;
        if (!viewportEl || !flowEl) return;

        const targetSec = flowEl.querySelector<HTMLElement>(
          `:scope > section[data-chapter-block="${CSS.escape(targetId)}"]`
        );
        if (!targetSec) return;

        const viewportRect = viewportEl.getBoundingClientRect();
        const secRect = targetSec.getBoundingClientRect();
        const targetTop = Math.max(
          0,
          viewportEl.scrollTop + (secRect.top - viewportRect.top) - 24
        );

        programmaticScrollUntilRef.current = Date.now() + 650;
        viewportEl.scrollTo({ top: targetTop, behavior: "smooth" });

        // Focus the chapter editor when in edit mode without triggering native jump-scroll
        if (viewMode === "edit") {
          const ed = editorRefsMap.current.get(targetId);
          if (ed) {
            try {
              if (ed.innerHTML.trim() === "" || ed.innerHTML === "<br>") {
                ed.innerHTML = "<p><br></p>";
              }
              ed.focus({ preventScroll: true });
              const sel = window.getSelection();
              if (sel) {
                const alreadyInside =
                  sel.rangeCount > 0 && ed.contains(sel.getRangeAt(0).commonAncestorContainer);
                if (!alreadyInside) {
                  const r = document.createRange();
                  const targetNode = ed.lastElementChild || ed;
                  r.selectNodeContents(targetNode);
                  r.collapse(false);
                  sel.removeAllRanges();
                  sel.addRange(r);
                  savedRangeRef.current = { chapterId: targetId, range: r.cloneRange() };
                }
              }
            } catch {
              // ignore focus/selection fallback
            }
          }
        }
      });
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      if (innerRafId) cancelAnimationFrame(innerRafId);
    };
  }, [scrollToChapterRequest, viewMode, runPaginationLayout]);

  // Track visible page & active chapter while user scrolls freely through the full report
  const handleViewportScroll = useCallback(() => {
    if (isPaginatingRef.current) return;
    if (scrollSyncRafRef.current !== null) return;
    scrollSyncRafRef.current = requestAnimationFrame(() => {
      scrollSyncRafRef.current = null;
      if (isPaginatingRef.current) return;

      const viewportEl = viewportRef.current;
      const stackEl = stackRef.current;
      const flowEl = flowRef.current;
      if (!viewportEl || !stackEl || !flowEl) return;

      const vpRect = viewportEl.getBoundingClientRect();
      const stackRect = stackEl.getBoundingClientRect();
      const currentScale = scale || 1;

      const viewMidUnscaled = (vpRect.top + vpRect.height * 0.28 - stackRect.top) / currentScale;
      const visPage = Math.max(1, Math.min(pageCountRef.current, Math.floor(Math.max(0, viewMidUnscaled) / PAGE_STEP) + 1));
      setCurrentVisiblePage(visPage);

      if (Date.now() < programmaticScrollUntilRef.current) return;

      // Never switch active chapter away from an actively focused chapter editor while it remains visible
      const activeEl = document.activeElement as HTMLElement | null;
      if (activeEl && flowEl.contains(activeEl)) {
        const focusedSection = activeEl.closest("section[data-chapter-block]") as HTMLElement | null;
        if (focusedSection) {
          const fr = focusedSection.getBoundingClientRect();
          if (fr.bottom > vpRect.top + 24 && fr.top < vpRect.bottom - 24) {
            return;
          }
        }
      }

      const sections = Array.from(
        flowEl.querySelectorAll(":scope > section[data-chapter-block]")
      ) as HTMLElement[];
      if (sections.length === 0) return;

      const triggerY = vpRect.top + 110;
      let detectedId = sections[0].getAttribute("data-chapter-block") || "";

      for (const sec of sections) {
        const r = sec.getBoundingClientRect();
        if (r.top <= triggerY) {
          detectedId = sec.getAttribute("data-chapter-block") || detectedId;
        } else {
          break;
        }
      }

      if (detectedId && detectedId !== activeChapterId) {
        onActiveChapterChange(detectedId);
      }
    });
  }, [scale, activeChapterId, onActiveChapterChange]);

  // Save selection with chapter ownership
  const saveSelectionForChapter = useCallback((chapterId: string, editorEl: HTMLDivElement) => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (editorEl.contains(range.commonAncestorContainer)) {
      savedRangeRef.current = { chapterId, range: range.cloneRange() };
      focusedChapterIdRef.current = chapterId;
    }
  }, []);

  const updateToolbarStateForEditor = useCallback(
    (chapterId: string, editorEl: HTMLDivElement) => {
      if (viewMode !== "edit") return;
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const anchor = sel.anchorNode;
      if (!anchor || !editorEl.contains(anchor)) return;

      saveSelectionForChapter(chapterId, editorEl);

      let bold = false;
      let italic = false;
      let underline = false;
      let strike = false;
      let ul = false;
      let ol = false;
      let align: "left" | "center" | "right" | "justify" = "justify";
      let block: "p" | "h1" | "h2" | "h3" | "blockquote" = "p";

      try {
        bold = document.queryCommandState("bold");
        italic = document.queryCommandState("italic");
        underline = document.queryCommandState("underline");
        strike = document.queryCommandState("strikeThrough");
        ul = document.queryCommandState("insertUnorderedList");
        ol = document.queryCommandState("insertOrderedList");

        if (document.queryCommandState("justifyCenter")) align = "center";
        else if (document.queryCommandState("justifyRight")) align = "right";
        else if (document.queryCommandState("justifyLeft")) align = "left";
        else if (document.queryCommandState("justifyFull")) align = "justify";
      } catch {
        // Ignore queryCommandState errors on detached nodes
      }

      let curr: Node | null = anchor;
      while (curr && curr !== editorEl) {
        if (curr.nodeType === Node.ELEMENT_NODE) {
          const el = curr as HTMLElement;
          const tag = el.tagName.toUpperCase();
          if (tag === "H1") block = "h1";
          else if (tag === "H2") block = "h2";
          else if (tag === "H3") block = "h3";
          else if (tag === "BLOCKQUOTE") block = "blockquote";

          if (el.style?.textAlign) {
            const ta = el.style.textAlign.toLowerCase();
            if (ta === "left" || ta === "center" || ta === "right" || ta === "justify") {
              align = ta;
            }
          }
        }
        curr = curr.parentNode;
      }

      setActiveFormats({ bold, italic, underline, strike, align, block, ul, ol });
    },
    [viewMode, saveSelectionForChapter]
  );

  const focusChapterEditorAtEnd = useCallback(
    (chapterId: string) => {
      if (viewMode !== "edit") return;
      const el = editorRefsMap.current.get(chapterId);
      if (!el) return;

      if (el.innerHTML.trim() === "" || el.innerHTML === "<br>") {
        el.innerHTML = "<p><br></p>";
      }

      try {
        el.focus({ preventScroll: true });
      } catch {
        el.focus();
      }

      const sel = window.getSelection();
      if (sel) {
        const alreadyInside =
          sel.rangeCount > 0 && el.contains(sel.getRangeAt(0).commonAncestorContainer);
        if (!alreadyInside) {
          try {
            const range = document.createRange();
            const targetNode = el.lastElementChild || el;
            range.selectNodeContents(targetNode);
            range.collapse(false);
            sel.removeAllRanges();
            sel.addRange(range);
            savedRangeRef.current = { chapterId, range: range.cloneRange() };
          } catch {
            // ignore caret placement fallback
          }
        } else {
          saveSelectionForChapter(chapterId, el);
        }
      }

      focusedChapterIdRef.current = chapterId;
      onActiveChapterChange(chapterId);
      updateToolbarStateForEditor(chapterId, el);
    },
    [viewMode, saveSelectionForChapter, onActiveChapterChange, updateToolbarStateForEditor]
  );

  // Listen for selection changes inside any active chapter editor
  useEffect(() => {
    const handleSelChange = () => {
      if (viewMode !== "edit") return;
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const anchor = sel.anchorNode;
      if (!anchor) return;

      for (const [chId, editorEl] of editorRefsMap.current.entries()) {
        if (editorEl.contains(anchor)) {
          updateToolbarStateForEditor(chId, editorEl);
          break;
        }
      }
    };

    document.addEventListener("selectionchange", handleSelChange);
    return () => document.removeEventListener("selectionchange", handleSelChange);
  }, [viewMode, updateToolbarStateForEditor]);

  // Resolve target editable chapter & restore cursor selection
  const resolveTargetEditor = useCallback((): { chapterId: string; editorEl: HTMLDivElement } | null => {
    if (savedRangeRef.current) {
      const { chapterId, range } = savedRangeRef.current;
      const el = editorRefsMap.current.get(chapterId);
      if (el && el.contains(range.commonAncestorContainer)) {
        try {
          el.focus({ preventScroll: true });
        } catch {
          el.focus();
        }
        const sel = window.getSelection();
        if (sel) {
          sel.removeAllRanges();
          sel.addRange(range);
        }
        return { chapterId, editorEl: el };
      }
    }

    const candidates = [
      focusedChapterIdRef.current,
      activeChapterId,
      chapters.find((c) => c.type !== "phases")?.id || "",
    ];

    for (const id of candidates) {
      if (!id) continue;
      const el = editorRefsMap.current.get(id);
      if (el) {
        try {
          el.focus({ preventScroll: true });
        } catch {
          el.focus();
        }
        return { chapterId: id, editorEl: el };
      }
    }

    return null;
  }, [activeChapterId, chapters]);

  const emitChapterEditorChange = useCallback(
    (chapterId: string, editorEl: HTMLDivElement) => {
      const isTextEmpty =
        !editorEl.textContent?.trim() && !editorEl.querySelector("[data-page-break]");
      editorEl.setAttribute("data-empty", isTextEmpty ? "true" : "false");
      const cleanHtml = serializeEditorHtml(editorEl);
      lastEmittedByChapterRef.current.set(chapterId, cleanHtml);
      onChangeChapterText(chapterId, cleanHtml);
      schedulePaginationLayout(true);
    },
    [onChangeChapterText, schedulePaginationLayout]
  );

  const execFormatCommand = (command: string, val?: string) => {
    if (viewMode !== "edit") return;
    const target = resolveTargetEditor();
    if (!target) return;

    try {
      document.execCommand("defaultParagraphSeparator", false, "p");
      document.execCommand(command, false, val);
    } catch (e) {
      console.warn("Formatting command error:", command, e);
    }

    updateToolbarStateForEditor(target.chapterId, target.editorEl);
    emitChapterEditorChange(target.chapterId, target.editorEl);
  };

  const setBlockType = (tag: "p" | "h1" | "h2" | "h3" | "blockquote") => {
    if (viewMode !== "edit") return;
    const target = resolveTargetEditor();
    if (!target) return;

    try {
      document.execCommand("defaultParagraphSeparator", false, "p");
      document.execCommand("formatBlock", false, `<${tag}>`);
    } catch {
      document.execCommand("formatBlock", false, tag);
    }

    updateToolbarStateForEditor(target.chapterId, target.editorEl);
    emitChapterEditorChange(target.chapterId, target.editorEl);
  };

  const handleInsertTable = (rows: number, cols: number) => {
    if (viewMode !== "edit") return;
    setShowTableMenu(false);
    const target = resolveTargetEditor();
    if (!target) return;

    const headerCells = Array.from({ length: cols }, (_, c) => `<th>Coluna ${c + 1}</th>`).join("");
    const bodyRows = Array.from({ length: Math.max(1, rows - 1) }, () => {
      const cells = Array.from({ length: cols }, () => "<td><br></td>").join("");
      return `<tr>${cells}</tr>`;
    }).join("");

    const tableHtml = `<table><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table><p><br></p>`;

    try {
      document.execCommand("insertHTML", false, tableHtml);
    } catch {
      target.editorEl.insertAdjacentHTML("beforeend", tableHtml);
    }

    updateToolbarStateForEditor(target.chapterId, target.editorEl);
    emitChapterEditorChange(target.chapterId, target.editorEl);
  };

  const handleStepZoom = (direction: -1 | 1) => {
    const numericSteps = [0.75, 0.9, 1, 1.15, 1.25, 1.4];
    const current = zoomMode === "fit" ? scale : parseFloat(zoomMode);
    if (direction === 1) {
      const next = numericSteps.find((s) => s > current + 0.02) ?? 1.4;
      setZoomMode(String(next) as typeof zoomMode);
    } else {
      const prev = [...numericSteps].reverse().find((s) => s < current - 0.02) ?? 0.75;
      setZoomMode(String(prev) as typeof zoomMode);
    }
  };

  const handleInsertPageBreak = () => {
    if (viewMode !== "edit") return;
    const target = resolveTargetEditor();
    if (!target) return;

    const { chapterId, editorEl } = target;
    const sel = window.getSelection();

    const breakEl = document.createElement("div");
    breakEl.setAttribute("data-page-break", "true");
    breakEl.setAttribute("contenteditable", "false");
    breakEl.className = "a4-page-break";

    const nextParagraph = document.createElement("p");
    nextParagraph.innerHTML = "<br>";

    let inserted = false;
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      if (editorEl.contains(range.commonAncestorContainer)) {
        let topBlock: HTMLElement | null = null;
        let curr: Node | null = range.startContainer;
        while (curr && curr !== editorEl) {
          if (curr.parentNode === editorEl && curr.nodeType === Node.ELEMENT_NODE) {
            topBlock = curr as HTMLElement;
            break;
          }
          curr = curr.parentNode;
        }

        if (topBlock) {
          topBlock.after(breakEl);
          breakEl.after(nextParagraph);
        } else {
          editorEl.appendChild(breakEl);
          editorEl.appendChild(nextParagraph);
        }
        inserted = true;
      }
    }

    if (!inserted) {
      editorEl.appendChild(breakEl);
      editorEl.appendChild(nextParagraph);
    }

    try {
      const newRange = document.createRange();
      newRange.setStart(nextParagraph, 0);
      newRange.collapse(true);
      sel?.removeAllRanges();
      sel?.addRange(newRange);
      savedRangeRef.current = { chapterId, range: newRange.cloneRange() };
    } catch {
      // ignore caret placement error
    }

    emitChapterEditorChange(chapterId, editorEl);

    setTimeout(() => {
      nextParagraph.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 60);
  };

  const handleInsertVariable = (variableKey: string) => {
    if (viewMode !== "edit") return;
    setShowVariablesMenu(false);
    const target = resolveTargetEditor();
    if (!target) return;

    const { chapterId, editorEl } = target;
    const sel = window.getSelection();

    if (sel && sel.rangeCount > 0 && editorEl.contains(sel.getRangeAt(0).commonAncestorContainer)) {
      try {
        document.execCommand("insertText", false, variableKey);
      } catch {
        const range = sel.getRangeAt(0);
        range.deleteContents();
        const textNode = document.createTextNode(variableKey);
        range.insertNode(textNode);
        range.setStartAfter(textNode);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    } else {
      const lastP = editorEl.lastElementChild;
      if (lastP && lastP.tagName !== "DIV") {
        lastP.appendChild(document.createTextNode(" " + variableKey));
      } else {
        const p = document.createElement("p");
        p.textContent = variableKey;
        editorEl.appendChild(p);
      }
    }

    updateToolbarStateForEditor(chapterId, editorEl);
    emitChapterEditorChange(chapterId, editorEl);
  };

  const handleFocusChapter = useCallback(
    (chapterId: string, editorEl: HTMLDivElement) => {
      focusedChapterIdRef.current = chapterId;
      if (chapterId !== activeChapterId) {
        onActiveChapterChange(chapterId);
      }
      updateToolbarStateForEditor(chapterId, editorEl);
    },
    [activeChapterId, onActiveChapterChange, updateToolbarStateForEditor]
  );

  // Determine which chapter owns each A4 page for real preview footer & edit guides
  const getChapterTitleForPage = useCallback(
    (pageNum: number): string => {
      let matched = chapters[0]?.fullTitle || "Laudo Técnico";
      for (const ch of chapters) {
        const startPage = chapterPageMap[ch.id];
        if (startPage !== undefined && startPage <= pageNum) {
          matched = ch.fullTitle;
        }
      }
      return matched;
    },
    [chapters, chapterPageMap]
  );

  const totalStackHeight = pageCount * A4_HEIGHT + Math.max(0, pageCount - 1) * PAGE_GAP;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
      {/* 1. CABEÇALHO DO DOCUMENTO COMPLETO E CAPÍTULO ATIVO */}
      <div className="px-4 sm:px-5 py-3 border-b border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <span className="px-2 py-0.5 bg-slate-900 text-white font-mono text-xs font-bold rounded tabular-nums shrink-0">
            {activeChapter?.number || "•"}
          </span>
          <h4
            className="font-bold text-slate-900 text-sm sm:text-base truncate"
            title={activeChapter?.fullTitle || "Documento Completo"}
          >
            {activeChapter?.title || "Documento Completo"}
          </h4>
        </div>

        {/* Status + Toggle Modo Edição / Visualização Real */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 tabular-nums">
            <span>
              Pág. {currentVisiblePage} de {pageCount}
            </span>
            {showSavedNotification && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-emerald-600 font-semibold inline-flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Salvo
                </span>
              </>
            )}
          </div>

          <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex items-center gap-1">
            <button
              type="button"
              onClick={() => setViewMode("edit")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                viewMode === "edit"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              Modo Edição
            </button>
            <button
              type="button"
              onClick={() => setViewMode("preview")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                viewMode === "preview"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              Visualização Real
            </button>
          </div>
        </div>
      </div>

      {/* 2. BARRA DE FERRAMENTAS ESTILO WORD / GOOGLE DOCS (TOOLBAR) */}
      <div className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-xs border-b border-slate-200 px-3 py-2 flex flex-col gap-1.5">
        {/* Linha 1: Edição & Formatação Rica */}
        <div className="flex flex-wrap items-center gap-1">
          {viewMode === "edit" ? (
            <>
              {/* Desfazer / Refazer */}
              <div className="flex items-center gap-0.5 pr-1.5 border-r border-slate-200">
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    execFormatCommand("undo");
                  }}
                  className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white transition cursor-pointer"
                  title="Desfazer (Ctrl+Z)"
                >
                  <Undo2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    execFormatCommand("redo");
                  }}
                  className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white transition cursor-pointer"
                  title="Refazer (Ctrl+Y)"
                >
                  <Redo2 className="w-4 h-4" />
                </button>
              </div>

              {/* Estilo do Parágrafo / Título */}
              <div className="pr-1.5 border-r border-slate-200">
                <select
                  value={activeFormats.block}
                  onChange={(e) =>
                    setBlockType(e.target.value as "p" | "h1" | "h2" | "h3" | "blockquote")
                  }
                  className="px-2 py-1 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-800 outline-none focus:border-slate-400 cursor-pointer"
                  title="Estilo de texto (Parágrafo, Títulos ou Citação)"
                >
                  <option value="p">Texto Normal</option>
                  <option value="h1">Título 1</option>
                  <option value="h2">Título 2</option>
                  <option value="h3">Título 3</option>
                  <option value="blockquote">Citação</option>
                </select>
              </div>

              {/* Negrito, Itálico, Sublinhado, Tachado */}
              <div className="flex items-center gap-0.5 pr-1.5 border-r border-slate-200">
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    execFormatCommand("bold");
                  }}
                  className={`p-1.5 rounded-lg transition cursor-pointer ${
                    activeFormats.bold
                      ? "bg-slate-900 text-white shadow-2xs"
                      : "text-slate-700 hover:bg-white"
                  }`}
                  title="Negrito (Ctrl+B)"
                >
                  <Bold className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    execFormatCommand("italic");
                  }}
                  className={`p-1.5 rounded-lg transition cursor-pointer ${
                    activeFormats.italic
                      ? "bg-slate-900 text-white shadow-2xs"
                      : "text-slate-700 hover:bg-white"
                  }`}
                  title="Itálico (Ctrl+I)"
                >
                  <Italic className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    execFormatCommand("underline");
                  }}
                  className={`p-1.5 rounded-lg transition cursor-pointer ${
                    activeFormats.underline
                      ? "bg-slate-900 text-white shadow-2xs"
                      : "text-slate-700 hover:bg-white"
                  }`}
                  title="Sublinhado (Ctrl+U)"
                >
                  <Underline className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    execFormatCommand("strikeThrough");
                  }}
                  className={`p-1.5 rounded-lg transition cursor-pointer ${
                    activeFormats.strike
                      ? "bg-slate-900 text-white shadow-2xs"
                      : "text-slate-700 hover:bg-white"
                  }`}
                  title="Tachado"
                >
                  <Strikethrough className="w-4 h-4" />
                </button>
              </div>

              {/* Cor do Texto e Cor de Destaque (Marca-texto) */}
              <div className="flex items-center gap-0.5 pr-1.5 border-r border-slate-200">
                <div className="relative" ref={colorMenuRef}>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setShowColorMenu((v) => !v);
                      setShowHighlightMenu(false);
                      setShowTableMenu(false);
                    }}
                    className="p-1.5 rounded-lg text-slate-700 hover:bg-white transition cursor-pointer flex items-center gap-0.5"
                    title="Cor do texto"
                  >
                    <Baseline className="w-4 h-4" />
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </button>
                  {showColorMenu && (
                    <div className="absolute left-0 top-full mt-1.5 p-2 bg-white rounded-xl border border-slate-200 shadow-xl z-40 w-44">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5 px-1">
                        Cor do Texto
                      </span>
                      <div className="grid grid-cols-4 gap-1.5">
                        {TEXT_COLORS.map((c) => (
                          <button
                            key={c.value}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setShowColorMenu(false);
                              execFormatCommand("foreColor", c.value);
                            }}
                            title={c.label}
                            style={{ backgroundColor: c.value }}
                            className="w-8 h-7 rounded-md border border-slate-200 hover:scale-105 transition cursor-pointer"
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="relative" ref={highlightMenuRef}>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setShowHighlightMenu((v) => !v);
                      setShowColorMenu(false);
                      setShowTableMenu(false);
                    }}
                    className="p-1.5 rounded-lg text-slate-700 hover:bg-white transition cursor-pointer flex items-center gap-0.5"
                    title="Cor de destaque (marca-texto)"
                  >
                    <Highlighter className="w-4 h-4" />
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </button>
                  {showHighlightMenu && (
                    <div className="absolute left-0 top-full mt-1.5 p-2 bg-white rounded-xl border border-slate-200 shadow-xl z-40 w-44">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5 px-1">
                        Marca-Texto
                      </span>
                      <div className="grid grid-cols-3 gap-1.5">
                        {HIGHLIGHT_COLORS.map((c) => (
                          <button
                            key={c.value}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setShowHighlightMenu(false);
                              execFormatCommand("hiliteColor", c.value);
                            }}
                            title={c.label}
                            style={{
                              backgroundColor: c.value === "transparent" ? "#ffffff" : c.value,
                            }}
                            className="h-7 rounded-md border border-slate-300 hover:scale-105 transition cursor-pointer text-[10px] font-bold text-slate-500 flex items-center justify-center"
                          >
                            {c.value === "transparent" ? "×" : ""}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    execFormatCommand("removeFormat");
                  }}
                  className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white transition cursor-pointer"
                  title="Limpar formatação do trecho selecionado"
                >
                  <RemoveFormatting className="w-4 h-4" />
                </button>
              </div>

              {/* Alinhamento: Esquerda, Centro, Direita, Justificado */}
              <div className="flex items-center gap-0.5 pr-1.5 border-r border-slate-200">
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    execFormatCommand("justifyLeft");
                  }}
                  className={`p-1.5 rounded-lg transition cursor-pointer ${
                    activeFormats.align === "left"
                      ? "bg-slate-900 text-white shadow-2xs"
                      : "text-slate-700 hover:bg-white"
                  }`}
                  title="Alinhar à Esquerda"
                >
                  <AlignLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    execFormatCommand("justifyCenter");
                  }}
                  className={`p-1.5 rounded-lg transition cursor-pointer ${
                    activeFormats.align === "center"
                      ? "bg-slate-900 text-white shadow-2xs"
                      : "text-slate-700 hover:bg-white"
                  }`}
                  title="Centralizar"
                >
                  <AlignCenter className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    execFormatCommand("justifyRight");
                  }}
                  className={`p-1.5 rounded-lg transition cursor-pointer ${
                    activeFormats.align === "right"
                      ? "bg-slate-900 text-white shadow-2xs"
                      : "text-slate-700 hover:bg-white"
                  }`}
                  title="Alinhar à Direita"
                >
                  <AlignRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    execFormatCommand("justifyFull");
                  }}
                  className={`p-1.5 rounded-lg transition cursor-pointer ${
                    activeFormats.align === "justify"
                      ? "bg-slate-900 text-white shadow-2xs"
                      : "text-slate-700 hover:bg-white"
                  }`}
                  title="Justificar"
                >
                  <AlignJustify className="w-4 h-4" />
                </button>
              </div>

              {/* Listas e Recuos */}
              <div className="flex items-center gap-0.5 pr-1.5 border-r border-slate-200">
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    execFormatCommand("insertUnorderedList");
                  }}
                  className={`p-1.5 rounded-lg transition cursor-pointer ${
                    activeFormats.ul
                      ? "bg-slate-900 text-white shadow-2xs"
                      : "text-slate-700 hover:bg-white"
                  }`}
                  title="Lista com Marcadores"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    execFormatCommand("insertOrderedList");
                  }}
                  className={`p-1.5 rounded-lg transition cursor-pointer ${
                    activeFormats.ol
                      ? "bg-slate-900 text-white shadow-2xs"
                      : "text-slate-700 hover:bg-white"
                  }`}
                  title="Lista Numerada"
                >
                  <ListOrdered className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    execFormatCommand("outdent");
                  }}
                  className="p-1.5 rounded-lg text-slate-700 hover:bg-white transition cursor-pointer"
                  title="Diminuir recuo"
                >
                  <IndentDecrease className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    execFormatCommand("indent");
                  }}
                  className="p-1.5 rounded-lg text-slate-700 hover:bg-white transition cursor-pointer"
                  title="Aumentar recuo"
                >
                  <IndentIncrease className="w-4 h-4" />
                </button>
              </div>

              {/* Inserções: Tabela, Linha Divisória, Quebra de Página, Variáveis */}
              <div className="flex items-center gap-1">
                <div className="relative" ref={tableMenuRef}>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setShowTableMenu((v) => !v);
                      setShowColorMenu(false);
                      setShowHighlightMenu(false);
                    }}
                    className="px-2 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-white border border-transparent hover:border-slate-200 transition flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                    title="Inserir tabela no texto"
                  >
                    <TableIcon className="w-3.5 h-3.5 text-slate-600" />
                    <span className="hidden xl:inline">Tabela</span>
                  </button>
                  {showTableMenu && (
                    <div className="absolute left-0 top-full mt-1.5 p-2 bg-white rounded-xl border border-slate-200 shadow-xl z-40 w-44 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block px-1.5 pb-1 border-b border-slate-100">
                        Inserir Tabela
                      </span>
                      {[
                        { rows: 3, cols: 2, label: "2 colunas × 3 linhas" },
                        { rows: 4, cols: 3, label: "3 colunas × 4 linhas" },
                        { rows: 4, cols: 4, label: "4 colunas × 4 linhas" },
                      ].map((t) => (
                        <button
                          key={t.label}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleInsertTable(t.rows, t.cols);
                          }}
                          className="w-full text-left px-2 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition cursor-pointer"
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    execFormatCommand("insertHorizontalRule");
                  }}
                  className="p-1.5 rounded-lg text-slate-700 hover:bg-white transition cursor-pointer"
                  title="Inserir linha divisória horizontal"
                >
                  <Minus className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleInsertPageBreak();
                  }}
                  className="px-2 py-1.5 rounded-lg text-xs font-semibold text-slate-800 bg-white border border-slate-200 hover:border-slate-400 hover:bg-slate-100 transition flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer shadow-2xs"
                  title="Inserir Quebra de Página Manual (nova folha A4 abaixo)"
                >
                  <SeparatorHorizontal className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="hidden sm:inline">Quebra de Página</span>
                </button>

                <div className="relative" ref={variablesMenuRef}>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setShowVariablesMenu((v) => !v);
                    }}
                    className="px-2 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-white border border-transparent hover:border-slate-200 transition flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                    title="Inserir variáveis dinâmicas do cadastro"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Variáveis</span>
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </button>

                  {showVariablesMenu && (
                    <div className="absolute right-0 sm:left-0 top-full mt-1.5 w-72 bg-white rounded-xl border border-slate-200 shadow-xl z-40 p-2 max-h-80 overflow-y-auto space-y-1">
                      <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                        Clique para inserir no texto
                      </div>
                      {autoVariables.map((v) => (
                        <button
                          key={v.key}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleInsertVariable(v.key);
                          }}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-50 transition flex items-center justify-between gap-2 cursor-pointer"
                        >
                          <div className="min-w-0">
                            <span className="font-mono text-[11px] font-bold text-slate-900 block truncate">
                              {v.key}
                            </span>
                            <span className="text-[10px] text-slate-500 block truncate">
                              {v.label}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 text-xs text-slate-600 px-1 py-1">
              <Printer className="w-4 h-4 text-slate-700 shrink-0" />
              <span className="font-semibold text-slate-800 whitespace-nowrap">
                Visualização de Conteúdo A4
              </span>
              <span aria-hidden="true">·</span>
              <span className="text-slate-500 hidden md:inline">
                Prévia das folhas e variáveis preenchidas. Para Capa, Sumário e PDF oficial use Visualizar Laudo.
              </span>
            </div>
          )}
        </div>

        {/* Linha 2: Personalização Tipográfica do Documento, Página A4 e Zoom */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-slate-200/70">
          <div className="flex flex-wrap items-center gap-2">
            {onChangeDocumentFont && (
              <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-600">
                <span className="hidden sm:inline">Fonte:</span>
                <select
                  value={documentFont}
                  onChange={(e) =>
                    onChangeDocumentFont(
                      e.target.value as "Inter" | "Arial" | "Calibri" | "Times New Roman" | "Georgia"
                    )
                  }
                  className="px-2 py-1 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-800 outline-none focus:border-slate-400 cursor-pointer"
                  title="Fonte padrão dos textos do laudo"
                >
                  <option value="Inter">Inter (Moderna)</option>
                  <option value="Arial">Arial (ABNT)</option>
                  <option value="Calibri">Calibri</option>
                  <option value="Times New Roman">Times New Roman (ABNT)</option>
                  <option value="Georgia">Georgia</option>
                </select>
              </label>
            )}

            {onChangeDocumentFontSize && (
              <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-600">
                <span className="hidden sm:inline">Tam.:</span>
                <select
                  value={documentFontSize}
                  onChange={(e) =>
                    onChangeDocumentFontSize(
                      e.target.value as "12px" | "13.5px" | "14.5px" | "16px"
                    )
                  }
                  className="px-2 py-1 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-800 outline-none focus:border-slate-400 cursor-pointer tabular-nums"
                  title="Tamanho base da fonte do documento"
                >
                  <option value="12px">10 pt</option>
                  <option value="13.5px">11 pt (Padrão)</option>
                  <option value="14.5px">12 pt (ABNT)</option>
                  <option value="16px">13 pt</option>
                </select>
              </label>
            )}

            {onChangeDocumentLineHeight && (
              <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-600">
                <span className="hidden sm:inline">Entrelinhas:</span>
                <select
                  value={documentLineHeight}
                  onChange={(e) =>
                    onChangeDocumentLineHeight(
                      e.target.value as "1.35" | "1.5" | "1.65" | "1.85" | "2.0"
                    )
                  }
                  className="px-2 py-1 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-800 outline-none focus:border-slate-400 cursor-pointer tabular-nums"
                  title="Espaçamento entre linhas do texto"
                >
                  <option value="1.35">1,15 (Compacto)</option>
                  <option value="1.5">1,5 (ABNT)</option>
                  <option value="1.65">1,65 (Padrão)</option>
                  <option value="1.85">1,85 (Confortável)</option>
                  <option value="2.0">2,0 (Duplo)</option>
                </select>
              </label>
            )}

            <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-600">
              <span className="hidden sm:inline">Margens:</span>
              <select
                value={pageMarginCm}
                onChange={(e) => onChangeMargin(e.target.value as "1.5" | "2.0" | "2.5" | "3.0")}
                className="px-2 py-1 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-800 outline-none focus:border-slate-400 cursor-pointer"
                title="Configurar margens internas da folha A4"
              >
                <option value="1.5">Estreita (1,5 cm)</option>
                <option value="2.0">Moderada (2,0 cm)</option>
                <option value="2.5">Normal (2,5 cm)</option>
                <option value="3.0">Ampla (3,0 cm)</option>
              </select>
            </label>

            <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-600">
              <span className="hidden sm:inline">Recuo:</span>
              <select
                value={paragraphIndent}
                onChange={(e) => onChangeIndent(e.target.value as "none" | "medium" | "large")}
                className="px-2 py-1 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-800 outline-none focus:border-slate-400 cursor-pointer"
                title="Recuo inicial de parágrafo (ABNT)"
              >
                <option value="none">Sem Recuo</option>
                <option value="medium">ABNT (1,5 cm)</option>
                <option value="large">Amplo (2,5 cm)</option>
              </select>
            </label>
          </div>

          <div className="flex items-center gap-1 ml-auto">
            <button
              type="button"
              onClick={() => handleStepZoom(-1)}
              className="p-1 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
              title="Diminuir zoom"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <select
              value={zoomMode}
              onChange={(e) =>
                setZoomMode(
                  e.target.value as "fit" | "0.75" | "0.9" | "1" | "1.15" | "1.25" | "1.4"
                )
              }
              className="px-2 py-1 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-800 outline-none focus:border-slate-400 cursor-pointer tabular-nums"
              title="Escala de visualização da folha A4"
            >
              <option value="fit">Ajustar ({Math.round(scale * 100)}%)</option>
              {ZOOM_PRESETS.map((z) => (
                <option key={z.value} value={z.value}>
                  {z.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => handleStepZoom(1)}
              className="p-1 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
              title="Aumentar zoom"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. ÁREA DE TRABALHO CONTÍNUA COM FOLHAS A4 EMPILHADAS (SCROLL LIVRE DO LAUDO COMPLETO) */}
      <div
        ref={viewportRef}
        onScroll={handleViewportScroll}
        style={{ overflowAnchor: "none" }}
        className="bg-[#e5e7eb] py-6 px-4 sm:px-6 overflow-y-auto overflow-x-auto h-[calc(100vh-172px)] min-h-[680px] flex justify-center"
      >
        <div
          ref={stackWrapperRef}
          style={{
            width: `${A4_WIDTH * scale}px`,
            height: `${totalStackHeight * scale}px`,
            position: "relative",
            flexShrink: 0,
          }}
        >
          <div
            ref={stackRef}
            onClick={(e) => {
              if (viewMode !== "edit") return;
              if (e.target !== stackRef.current && e.target !== flowRef.current) return;
              const editableChapters = chapters.filter((c) => c.type !== "phases");
              const lastEditable = editableChapters[editableChapters.length - 1];
              if (lastEditable) {
                focusChapterEditorAtEnd(lastEditable.id);
              }
            }}
            style={{
              width: `${A4_WIDTH}px`,
              height: `${totalStackHeight}px`,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
              position: "relative",
            }}
          >
            {/* CAMADA 1: FOLHAS A4 EMPILHADAS (210mm x 297mm / 794px x 1123px) */}
            {Array.from({ length: pageCount }).map((_, idx) => {
              const sheetTop = idx * PAGE_STEP;
              const pageNum = idx + 1;
              const sheetChapterTitle = getChapterTitleForPage(pageNum);

              return (
                <div
                  key={idx}
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    top: `${sheetTop}px`,
                    left: 0,
                    width: `${A4_WIDTH}px`,
                    height: `${A4_HEIGHT}px`,
                  }}
                  className="bg-white border border-slate-300/80 shadow-[0_2px_8px_rgba(15,23,42,0.08),0_12px_28px_rgba(15,23,42,0.06)] pointer-events-none select-none"
                >
                  {/* Guias visuais de margem no Modo Edição */}
                  {viewMode === "edit" && (
                    <>
                      <div
                        style={{
                          position: "absolute",
                          top: `${marginPx}px`,
                          left: `${marginPx}px`,
                          right: `${marginPx}px`,
                          bottom: `${marginPx}px`,
                        }}
                        className="border border-dashed border-slate-200/90"
                      />

                      <div
                        style={{ top: `${marginPx - 12}px`, left: `${marginPx - 12}px` }}
                        className="absolute w-3 h-3 border-r border-b border-slate-300"
                      />
                      <div
                        style={{ top: `${marginPx - 12}px`, right: `${marginPx - 12}px` }}
                        className="absolute w-3 h-3 border-l border-b border-slate-300"
                      />
                      <div
                        style={{ bottom: `${marginPx - 12}px`, left: `${marginPx - 12}px` }}
                        className="absolute w-3 h-3 border-r border-t border-slate-300"
                      />
                      <div
                        style={{ bottom: `${marginPx - 12}px`, right: `${marginPx - 12}px` }}
                        className="absolute w-3 h-3 border-l border-t border-slate-300"
                      />

                      <div
                        style={{
                          position: "absolute",
                          top: `${Math.max(12, marginPx - 24)}px`,
                          left: `${marginPx}px`,
                          right: `${marginPx}px`,
                        }}
                        className="flex items-center justify-between text-[10px] text-slate-400 font-medium tabular-nums gap-4"
                      >
                        <span className="truncate">{sheetChapterTitle} · Margem {pageMarginCm} cm</span>
                        <span className="shrink-0">Página {pageNum} de {pageCount}</span>
                      </div>
                    </>
                  )}

                  {/* Cabeçalho e Rodapé institucionais reais na Visualização Real */}
                  {viewMode === "preview" && (
                    <>
                      <div
                        style={{
                          position: "absolute",
                          top: "10px",
                          left: `${marginPx}px`,
                          right: `${marginPx}px`,
                          height: `${Math.max(32, marginPx - 20)}px`,
                        }}
                        className="border-b border-slate-200 flex items-center justify-between gap-4 pb-1"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {assessor.logo && assessor.logo !== "[OMITTED_IMAGE_FOR_CACHE]" ? (
                            <img
                              src={assessor.logo}
                              alt="Logo Assessora"
                              className="h-7 max-w-[85px] object-contain"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wide truncate">
                              {assessor.fantasyName}
                            </span>
                          )}
                          {assessor.logo && companyLogo && (
                            <div className="h-5 w-px bg-slate-200" />
                          )}
                          {companyLogo && companyLogo !== "[OMITTED_IMAGE_FOR_CACHE]" && (
                            <img
                              src={companyLogo}
                              alt="Logo Cliente"
                              className="h-7 max-w-[85px] object-contain"
                              referrerPolicy="no-referrer"
                            />
                          )}
                        </div>
                        <div className="text-right min-w-0">
                          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block truncate">
                            Diagnóstico de Riscos Psicossociais
                          </span>
                          <span className="text-[10px] font-semibold text-slate-600 block truncate">
                            {companyName || "Empresa Avaliada"}
                          </span>
                        </div>
                      </div>

                      <div
                        style={{
                          position: "absolute",
                          bottom: "14px",
                          left: `${marginPx}px`,
                          right: `${marginPx}px`,
                        }}
                        className="border-t border-slate-100 pt-1.5 flex items-center justify-between gap-4 text-[10px] text-slate-400 tabular-nums"
                      >
                        <span className="truncate">{sheetChapterTitle}</span>
                        <span className="shrink-0 font-medium">
                          Página {pageNum} de {pageCount}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              );
            })}

            {/* CAMADA 2: DOCUMENTO COMPLETO CONTÍNUO SOBRE AS FOLHAS A4 */}
            <div
              ref={flowRef}
              style={{
                position: "relative",
                zIndex: 10,
                width: `${A4_WIDTH}px`,
                paddingTop: `${marginPx}px`,
                paddingLeft: `${marginPx}px`,
                paddingRight: `${marginPx}px`,
                paddingBottom: `${marginPx}px`,
              }}
            >
              {chapters.map((ch, chIdx) => {
                if (ch.type === "phases") {
                  const unifiedPhase: UnifiedChapter = {
                    id: ch.id,
                    type: "phases",
                    number: ch.number,
                    title: ch.title,
                    fullTitle: ch.fullTitle,
                    level: 1,
                    isExcluded: false,
                    order: 0,
                    tip: ch.tip,
                  };

                  return (
                    <section
                      key={ch.id}
                      data-chapter-block={ch.id}
                      data-chapter-level={1}
                      className="w-full"
                    >
                      {viewMode === "edit" ? (
                        <div
                          data-flow-heading="true"
                          className="rounded-xl border border-slate-200 bg-slate-50/80 p-5 space-y-3 select-none"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                              <span className="p-2 rounded-lg bg-slate-900 text-white shrink-0">
                                <TableProperties className="w-4 h-4" />
                              </span>
                              <div>
                                <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
                                  {ch.fullTitle}
                                </h3>
                                <p className="text-xs text-slate-500">
                                  Seções automáticas (tabelas de Setores, COPSOQ, Matriz GRO e Plano de Ação): para alterar textos ou ações destes capítulos, edite diretamente nas abas superiores correspondentes. Os capítulos de texto livre ficam logo abaixo.
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setViewMode("preview")}
                              className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-slate-400 text-xs font-semibold text-slate-800 transition whitespace-nowrap shrink-0 cursor-pointer"
                            >
                              Ver Tabelas Reais
                            </button>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-200/80 text-xs">
                            <div>
                              <span className="text-[10px] font-semibold text-slate-400 uppercase block">
                                Metodologia
                              </span>
                              <span className="font-bold text-slate-800">
                                {isQualitative ? "Qualitativa GRO" : "COPSOQ II + GRO"}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] font-semibold text-slate-400 uppercase block">
                                Setores no Escopo
                              </span>
                              <span className="font-bold text-slate-800 tabular-nums">
                                {report.sectors.length} {report.sectors.length === 1 ? "setor" : "setores"}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] font-semibold text-slate-400 uppercase block">
                                Riscos Mapeados
                              </span>
                              <span className="font-bold text-slate-800 tabular-nums">
                                {hasRecognizedRisks ? report.riskInventory.length : 0}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] font-semibold text-slate-400 uppercase block">
                                Posição no Laudo
                              </span>
                              <span className="font-bold text-slate-800 tabular-nums">
                                Cap. {ch.number}
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-8">
                          <ReportPhases
                            ch={unifiedPhase}
                            report={report}
                            isQualitative={isQualitative}
                            hasRecognizedRisks={hasRecognizedRisks}
                            renderHeader={() => null}
                          />
                        </div>
                      )}
                    </section>
                  );
                }

                const isSubchapter = ch.level >= 2;
                const nextCh = chIdx + 1 < chapters.length ? chapters[chIdx + 1] : null;
                const prevCh = chIdx > 0 ? chapters[chIdx - 1] : null;
                const hasSubchapters = Boolean(nextCh && nextCh.level > ch.level);
                const hasOwnText = hasRichTextContent(ch.value);
                const isTitleOnlyParent = hasSubchapters && !hasOwnText;
                const prevWasTitleOnlyParent = Boolean(
                  prevCh &&
                    ch.level > prevCh.level &&
                    prevCh.type !== "phases" &&
                    !hasRichTextContent(prevCh.value)
                );

                return (
                  <section
                    key={ch.id}
                    data-chapter-block={ch.id}
                    data-chapter-level={ch.level}
                    onClick={(e) => {
                      if (viewMode !== "edit") return;
                      const target = e.target as HTMLElement;
                      if (
                        target.closest("[data-chapter-editor]") ||
                        target.closest("button") ||
                        target.closest("a") ||
                        target.closest("input")
                      ) {
                        return;
                      }
                      focusChapterEditorAtEnd(ch.id);
                    }}
                    className={`w-full ${
                      isSubchapter ? (prevWasTitleOnlyParent ? "pt-1" : "pt-4") : ""
                    }`}
                  >
                    {/* Título do capítulo ou subcapítulo integrado ao fluxo da página A4 */}
                    <div
                      data-flow-heading="true"
                      className={`group/heading flex items-start justify-between gap-3 select-none ${
                        isTitleOnlyParent ? "mb-1" : "mb-3"
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        {ch.level === 1 ? (
                          <h3 className="text-[17px] font-extrabold text-slate-900 border-b-2 border-slate-800 pb-2 uppercase tracking-wide">
                            {ch.fullTitle}
                          </h3>
                        ) : ch.level === 2 ? (
                          <h4 className="text-[14.5px] font-bold text-slate-900 border-b border-slate-200 pb-1 uppercase tracking-wide">
                            {ch.fullTitle}
                          </h4>
                        ) : (
                          <h5 className="text-[13.5px] font-bold text-slate-800 tracking-wide">
                            {ch.fullTitle}
                          </h5>
                        )}
                      </div>

                      {viewMode === "edit" && (
                        <div className="flex items-center gap-0.5 opacity-0 group-hover/heading:opacity-100 focus-within:opacity-100 transition-opacity shrink-0 pt-0.5">
                          {onEditChapterTitle && (
                            <button
                              type="button"
                              onClick={() => onEditChapterTitle(ch.id)}
                              className="p-1 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded transition cursor-pointer"
                              title="Editar título do capítulo"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {onDeleteChapter && (
                            <button
                              type="button"
                              onClick={() =>
                                onDeleteChapter(ch.id, ch.fullTitle, ch.type === "standard")
                              }
                              className="p-1 text-rose-400 hover:text-rose-700 hover:bg-rose-50 rounded transition cursor-pointer"
                              title="Excluir capítulo"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {viewMode === "edit" ? (
                      <ChapterEditableBody
                        key={`${report.id}:${ch.id}`}
                        chapterId={ch.id}
                        value={ch.value}
                        indentCss={indentCss}
                        docFontCss={docFontCss}
                        docSizeCss={docSizeCss}
                        docLineHeightCss={docLineHeightCss}
                        hasSubchapters={hasSubchapters}
                        onChangeValue={onChangeChapterText}
                        onFocusChapter={handleFocusChapter}
                        onSelectionActivity={updateToolbarStateForEditor}
                        onRequestLayout={requestDebouncedLayout}
                        registerEditorRef={registerEditorRef}
                        setLastEmittedExternal={setLastEmittedExternal}
                        getLastEmittedExternal={getLastEmittedExternal}
                      />
                    ) : hasOwnText ? (
                      <ChapterPreviewBody
                        rawValue={ch.value}
                        indentCss={indentCss}
                        docFontCss={docFontCss}
                        docSizeCss={docSizeCss}
                        docLineHeightCss={docLineHeightCss}
                        resolvePreviewText={resolvePreviewText}
                      />
                    ) : null}
                  </section>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Inline styling for page-break divider bars inside edit vs preview modes */}
      <style>{`
        .a4-doc-content .a4-page-break {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          height: ${viewMode === "edit" ? "26px" : "0px"};
          margin-top: ${viewMode === "edit" ? "8px" : "0px"};
          cursor: ${viewMode === "edit" ? "pointer" : "default"};
          user-select: none;
        }
        ${
          viewMode === "edit"
            ? `
        .a4-doc-content[data-empty="true"] {
          position: relative;
        }
        .a4-doc-content[data-empty="true"][data-has-subchapters="false"]::before {
          content: "Digite o texto deste capítulo aqui...";
          position: absolute;
          left: var(--doc-indent, 1.5cm);
          top: 0;
          color: #94a3b8;
          pointer-events: none;
          font-style: italic;
        }
        .a4-doc-content[data-empty="true"][data-has-subchapters="true"] p {
          margin-bottom: 0 !important;
          min-height: 14px !important;
          line-height: 1.15 !important;
        }
        .a4-doc-content[data-empty="true"][data-has-subchapters="true"]:focus::before {
          content: "Texto introdutório opcional...";
          position: absolute;
          left: var(--doc-indent, 1.5cm);
          top: 0;
          font-size: 12px;
          line-height: 1.15;
          color: #cbd5e1;
          pointer-events: none;
          font-style: italic;
        }
        .a4-doc-content .a4-page-break::before {
          content: "Quebra de Página Manual · Clique para remover";
          display: block;
          width: 100%;
          text-align: center;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: #6366f1;
          border-top: 1.5px dashed #a5b4fc;
          padding-top: 4px;
          transition: color 0.15s, border-color 0.15s;
        }
        .a4-doc-content .a4-page-break:hover::before {
          content: "× Remover Quebra de Página";
          color: #dc2626;
          border-top-color: #fca5a5;
        }
        `
            : `
        .a4-doc-content .a4-page-break {
          opacity: 0;
          overflow: hidden;
          pointer-events: none;
        }
        `
        }
      `}</style>
    </div>
  );
};
