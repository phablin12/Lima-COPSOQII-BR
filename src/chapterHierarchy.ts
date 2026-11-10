/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CustomChapter, Report } from "./types";

export interface StandardChapterDefinition {
  id: string;
  number: string;
  label: string;
  tip: string;
}

export const STANDARD_CHAPTERS: StandardChapterDefinition[] = [
  {
    id: "introducao",
    number: "1",
    label: "1. Introdução",
    tip: "Apresente o escopo e justificativa legal do documento (NR-01, PGR, e GRO). Descreva o contexto de saúde mental da empresa avaliada.",
  },
  {
    id: "fundamentacao",
    number: "2",
    label: "2. Fundamentação Teórica",
    tip: "Cite os modelos científicos de estresse laboral, como o Modelo Demanda-Controle (Karasek) ou Desequilíbrio Esforço-Recompensa (Siegrist).",
  },
  {
    id: "metodologia",
    number: "3",
    label: "3. Metodologia de Avaliação",
    tip: "Explique o Copenhagen Psychosocial Questionnaire (COPSOQ II) e como os escores variam de 0 a 4 com pontos de corte técnicos.",
  },
  {
    id: "consideracoes",
    number: "8",
    label: "8. Considerações Finais",
    tip: "Conclua resumindo a importância do engajamento de líderes, periodicidade sugerida de reavaliação (12 a 24 meses) e integração ao PGR.",
  },
  {
    id: "referencias",
    number: "9",
    label: "9. Referências Bibliográficas",
    tip: "Liste as normas regulamentadoras federais, leis trabalhistas e artigos de referência científica utilizados na elaboração.",
  },
];

export const STANDARD_CHAPTER_DEFAULTS: Record<string, { title: string; tip: string }> = {
  introducao: {
    title: "Introdução",
    tip: "Apresente o escopo e justificativa legal do documento (NR-01, PGR, e GRO). Descreva o contexto de saúde mental da empresa avaliada.",
  },
  fundamentacao: {
    title: "Fundamentação Teórica",
    tip: "Cite os modelos científicos de estresse laboral, como o Modelo Demanda-Controle (Karasek) ou Desequilíbrio Esforço-Recompensa (Siegrist).",
  },
  metodologia: {
    title: "Metodologia de Avaliação",
    tip: "Explique o Copenhagen Psychosocial Questionnaire (COPSOQ II) e como os escores variam de 0 a 4 com pontos de corte técnicos.",
  },
  "fases-automaticas": {
    title: "Fases Automáticas Tabuladas",
    tip: "Resultados, Devolutivas, Inventário GRO e Cronograma de Ações tabulados automaticamente.",
  },
  consideracoes: {
    title: "Considerações Finais",
    tip: "Conclua resumindo a importância do engajamento de líderes, periodicidade sugerida de reavaliação (12 a 24 meses) e integração ao PGR.",
  },
  referencias: {
    title: "Referências Bibliográficas",
    tip: "Liste as normas regulamentadoras federais, leis trabalhistas e artigos de referência científica utilizados na elaboração.",
  },
};

/**
 * Removes any leading numbers or dashes from a title string (e.g. "1. Introdução" -> "Introdução", "2.2 - Burnout" -> "Burnout")
 */
export const cleanChapterTitle = (rawTitle?: string): string => {
  if (!rawTitle) return "";
  return rawTitle.replace(/^\d+(\.\d+)*\s*[-.:)]\s*/, "").trim();
};

/**
 * Returns the effective title of a standard chapter, respecting custom title overrides
 */
export const getStandardChapterTitle = (
  std: StandardChapterDefinition,
  customTitles?: Record<string, string>
): string => {
  if (customTitles && customTitles[std.id]) {
    return customTitles[std.id];
  }
  return std.label;
};

/**
 * Returns clean full chapter title with number prefix (without duplicates)
 */
export const getFullChapterTitle = (ch: { number?: string; title: string }): string => {
  const num = (ch.number || "").trim();
  const rawTitle = (ch.title || "").trim();
  if (!num) return rawTitle || "Capítulo sem título";
  if (!rawTitle) return num;

  const clean = cleanChapterTitle(rawTitle);
  return `${num}. ${clean || rawTitle}`;
};

/**
 * Returns level of hierarchy:
 * 1 = Main chapter (e.g. 1, 2, 10)
 * 2 = Section / continuation (e.g. 2.2, 2.3, 1.1)
 * 3 = Subsection (e.g. 2.3.1, 2.2.1)
 * 4 = Sub-subsection (e.g. 2.3.1.1)
 */
export const getChapterLevel = (ch: { level?: number; number?: string }): number => {
  if (ch.level && ch.level >= 1 && ch.level <= 4) return ch.level;
  const num = (ch.number || "").trim();
  if (!num) return 1;

  const cleanDots = num.replace(/[^0-9.]/g, "");
  const dotCount = (cleanDots.match(/\./g) || []).length;
  if (dotCount === 0) return 1;
  if (dotCount === 1) return 2;
  if (dotCount === 2) return 3;
  return 4;
};

/**
 * Detects which main standard chapter/section a custom chapter belongs to
 */
export const detectParentSection = (ch: {
  parentChapterId?: string;
  number?: string;
}): "introducao" | "fundamentacao" | "metodologia" | "consideracoes" | "referencias" | "end" => {
  if (ch.parentChapterId) {
    if (
      ["introducao", "fundamentacao", "metodologia", "consideracoes", "referencias"].includes(
        ch.parentChapterId
      )
    ) {
      return ch.parentChapterId as any;
    }
    if (ch.parentChapterId === "end") return "end";
  }

  const num = (ch.number || "").trim();
  if (num.startsWith("1.")) return "introducao";
  if (num.startsWith("2.")) return "fundamentacao";
  if (num.startsWith("3.")) return "metodologia";
  if (num.startsWith("8.")) return "consideracoes";
  if (num.startsWith("9.")) return "referencias";

  return "end";
};

/**
 * Parses numeric segments from a number string like "2.3.1" -> [2, 3, 1]
 */
export const parseNumberSegments = (numStr?: string): number[] => {
  if (!numStr) return [];
  const parts = numStr.split(".").map((p) => parseInt(p.replace(/\D/g, ""), 10));
  return parts.filter((n) => !isNaN(n));
};

/**
 * Compares two chapter numbers like "2.2", "2.3", "2.3.1", "10" for natural sorting
 */
export const compareChapterNumbers = (numA?: string, numB?: string): number => {
  const segA = parseNumberSegments(numA);
  const segB = parseNumberSegments(numB);
  const maxLen = Math.max(segA.length, segB.length);

  for (let i = 0; i < maxLen; i++) {
    const valA = segA[i] !== undefined ? segA[i] : -1;
    const valB = segB[i] !== undefined ? segB[i] : -1;
    if (valA !== valB) {
      return valA - valB;
    }
  }

  return (numA || "").localeCompare(numB || "");
};

/**
 * Unified representation of any chapter in the document
 */
export interface UnifiedChapter {
  id: string;
  type: "standard" | "custom" | "phases";
  baseId?: string;
  number: string; // Dynamically computed sequential number: "1", "2", "2.1", "8", etc.
  title: string; // Clean title without hardcoded number
  fullTitle: string; // Formatted title e.g. "1. Introdução"
  level: number; // 1 = main, 2 = sub, 3 = sub-sub
  parentChapterId?: string;
  isExcluded: boolean;
  order: number;
  tip?: string;
  text?: string;
}

/**
 * Builds the unified, linearly ordered chapter list with dynamic sequential numbers.
 * If a chapter is moved, all numbers automatically recalculate dynamically.
 */
export const getUnifiedChapters = (report: Report): UnifiedChapter[] => {
  const excluded = report.excludedChapters || [];
  const customChapters = report.customChapters || [];
  const customTitles = report.chapterTitles || {};

  // Default main chapters order
  const defaultMainOrder = [
    "introducao",
    "fundamentacao",
    "metodologia",
    "fases-automaticas",
    "consideracoes",
    "referencias",
  ];

  // Retrieve or initialize saved linear order
  let activeOrder: string[] = [];
  if (report.chaptersOrder && report.chaptersOrder.length > 0) {
    activeOrder = [...report.chaptersOrder];
  } else {
    activeOrder = [...defaultMainOrder];
  }

  // Ensure all standard chapters and phases are in activeOrder
  defaultMainOrder.forEach((id) => {
    if (!activeOrder.includes(id)) {
      activeOrder.push(id);
    }
  });

  // Ensure all custom chapters are in activeOrder
  customChapters.forEach((c) => {
    if (!activeOrder.includes(c.id)) {
      // If it has a parent, try to insert right after parent or siblings
      if (c.parentChapterId && activeOrder.includes(c.parentChapterId)) {
        const parentIdx = activeOrder.indexOf(c.parentChapterId);
        // Find last child of this parent already in activeOrder
        let insertIdx = parentIdx + 1;
        while (
          insertIdx < activeOrder.length &&
          customChapters.some((sib) => sib.id === activeOrder[insertIdx] && sib.parentChapterId === c.parentChapterId)
        ) {
          insertIdx++;
        }
        activeOrder.splice(insertIdx, 0, c.id);
      } else {
        activeOrder.push(c.id);
      }
    }
  });

  // Separate main items from subchapters to establish parent-child relationships
  // Subchapters are custom chapters that have a parentChapterId OR level >= 2
  const customMap = new Map<string, CustomChapter>();
  customChapters.forEach((c) => customMap.set(c.id, c));

  // Determine hierarchy level and parent for each chapter in activeOrder
  const itemsMeta: {
    id: string;
    type: "standard" | "custom" | "phases";
    level: number;
    parentChapterId?: string;
    title: string;
    tip?: string;
    text?: string;
    isExcluded: boolean;
  }[] = [];

  activeOrder.forEach((id) => {
    if (id === "fases-automaticas") {
      itemsMeta.push({
        id,
        type: "phases",
        level: 1,
        title: "Fases Automáticas Tabuladas",
        tip: STANDARD_CHAPTER_DEFAULTS["fases-automaticas"].tip,
        isExcluded: false,
      });
      return;
    }

    if (["introducao", "fundamentacao", "metodologia", "consideracoes", "referencias"].includes(id)) {
      const def = STANDARD_CHAPTER_DEFAULTS[id];
      const titleOverride = customTitles[id];
      const clean = cleanChapterTitle(titleOverride || def.title);
      itemsMeta.push({
        id,
        type: "standard",
        level: 1,
        title: clean || def.title,
        tip: def.tip,
        isExcluded: excluded.includes(id),
      });
      return;
    }

    // Custom chapter
    const custom = customMap.get(id);
    if (custom) {
      const lvl = custom.level || (custom.parentChapterId ? 2 : 1);
      const clean = cleanChapterTitle(custom.title);
      itemsMeta.push({
        id: custom.id,
        type: "custom",
        level: lvl,
        parentChapterId: custom.parentChapterId,
        title: clean || custom.title,
        text: custom.text,
        tip: lvl >= 2 ? `Subseção técnica vinculada.` : "Capítulo personalizado do laudo.",
        isExcluded: excluded.includes(custom.id),
      });
    }
  });

  // Calculate dynamic sequential numbering
  let mainNumber = 1;
  const parentNumberMap = new Map<string, string>();
  const parentChildCount = new Map<string, number>();

  const result: UnifiedChapter[] = [];

  // Automated phases size
  const hasRisks = report.risksRecognized !== false;
  const isQualitative = report.methodology === "qualitative";
  const phasesCount = isQualitative ? (hasRisks ? 2 : 0) : (hasRisks ? 4 : 2);

  itemsMeta.forEach((item, index) => {
    let dynamicNumber = "";

    if (item.type === "phases") {
      if (phasesCount === 0) {
        result.push({
          id: item.id,
          type: item.type,
          number: "—",
          title: "Fases Omitidas (Sem Riscos)",
          fullTitle: "Fases Omitidas (Sem Riscos)",
          level: 1,
          isExcluded: true,
          order: (index + 1) * 10,
          tip: "A empresa declarou não reconhecer riscos psicossociais nesta avaliação. Capítulos de riscos omitidos.",
        });
        return;
      }

      const startNum = mainNumber;
      const endNum = mainNumber + phasesCount - 1;
      dynamicNumber = startNum === endNum ? String(startNum) : `${startNum}–${endNum}`;
      mainNumber += phasesCount;

      const title = isQualitative
        ? "Inventário de Riscos e Plano de Ação"
        : item.title;

      result.push({
        id: item.id,
        type: item.type,
        number: dynamicNumber,
        title,
        fullTitle: `${dynamicNumber}. ${title}`,
        level: 1,
        isExcluded: false,
        order: (index + 1) * 10,
        tip: isQualitative
          ? "Inventário de Riscos GRO e Cronograma de Ações gerados para os setores com riscos."
          : item.tip,
      });
      return;
    }

    if (item.level === 1) {
      // Main chapter
      if (!item.isExcluded) {
        dynamicNumber = String(mainNumber);
        parentNumberMap.set(item.id, dynamicNumber);
        mainNumber += 1;
      } else {
        dynamicNumber = "—";
      }

      result.push({
        id: item.id,
        type: item.type,
        baseId: item.type === "standard" ? item.id : undefined,
        number: dynamicNumber,
        title: item.title,
        fullTitle: item.isExcluded ? item.title : `${dynamicNumber}. ${item.title}`,
        level: 1,
        isExcluded: item.isExcluded,
        order: (index + 1) * 10,
        tip: item.tip,
        text: item.text,
      });
    } else {
      // Subchapter (level 2 or 3)
      // Find parent's dynamic number
      let parentNum = "1";
      if (item.parentChapterId && parentNumberMap.has(item.parentChapterId)) {
        parentNum = parentNumberMap.get(item.parentChapterId)!;
      } else {
        // Fallback: use previous level 1 chapter
        const prevMain = [...result].reverse().find((r) => r.level === 1 && !r.isExcluded);
        parentNum = prevMain ? prevMain.number : "1";
      }

      const childKey = item.parentChapterId || parentNum;
      const curCount = (parentChildCount.get(childKey) || 0) + 1;
      parentChildCount.set(childKey, curCount);

      if (item.level === 3) {
        dynamicNumber = `${parentNum}.${curCount}`;
      } else {
        dynamicNumber = `${parentNum}.${curCount}`;
      }
      parentNumberMap.set(item.id, dynamicNumber);

      result.push({
        id: item.id,
        type: item.type,
        number: item.isExcluded ? "—" : dynamicNumber,
        title: item.title,
        fullTitle: item.isExcluded ? item.title : `${dynamicNumber}. ${item.title}`,
        level: item.level,
        parentChapterId: item.parentChapterId,
        isExcluded: item.isExcluded,
        order: (index + 1) * 10,
        tip: item.tip,
        text: item.text,
      });
    }
  });

  return result;
};

/**
 * Reorders chapters based on drag-and-drop and returns updated state with synchronized numbers
 */
export const reorderUnifiedChapters = (
  report: Report,
  sourceId: string,
  targetId: string,
  position: "before" | "after"
): {
  chaptersOrder: string[];
  customChapters: CustomChapter[];
} => {
  const currentList = getUnifiedChapters(report);
  const currentIds = currentList.map((c) => c.id);

  if (!currentIds.includes(sourceId) || !currentIds.includes(targetId) || sourceId === targetId) {
    return {
      chaptersOrder: currentIds,
      customChapters: report.customChapters || [],
    };
  }

  // Remove source
  const filtered = currentIds.filter((id) => id !== sourceId);
  const targetIdx = filtered.indexOf(targetId);

  const insertIdx = position === "before" ? targetIdx : targetIdx + 1;
  filtered.splice(insertIdx, 0, sourceId);

  // If a custom chapter was dragged under or adjacent to a parent, update its parentChapterId if appropriate
  const customChaptersList = [...(report.customChapters || [])];
  const sourceCustomIdx = customChaptersList.findIndex((c) => c.id === sourceId);

  // Re-generate list to synchronize numbers
  const updatedReport: Report = {
    ...report,
    chaptersOrder: filtered,
  };

  const renumberedList = getUnifiedChapters(updatedReport);
  const renumberedMap = new Map<string, string>();
  renumberedList.forEach((c) => renumberedMap.set(c.id, c.number));

  const syncedCustoms = customChaptersList.map((ch, idx) => {
    const dynNumber = renumberedMap.get(ch.id) || ch.number;
    return {
      ...ch,
      number: dynNumber,
      order: (idx + 1) * 10,
    };
  });

  return {
    chaptersOrder: filtered,
    customChapters: syncedCustoms,
  };
};

/**
 * Moves a chapter one position up or down in the unified order
 */
export const moveChapterUpDown = (
  report: Report,
  chapterId: string,
  direction: "up" | "down"
): {
  chaptersOrder: string[];
  customChapters: CustomChapter[];
} => {
  const currentList = getUnifiedChapters(report);
  const currentIds = currentList.map((c) => c.id);
  const index = currentIds.indexOf(chapterId);
  if (index === -1) {
    return {
      chaptersOrder: currentIds,
      customChapters: report.customChapters || [],
    };
  }

  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= currentIds.length) {
    return {
      chaptersOrder: currentIds,
      customChapters: report.customChapters || [],
    };
  }

  const targetId = currentIds[targetIndex];
  const pos = direction === "up" ? "before" : "after";
  return reorderUnifiedChapters(report, chapterId, targetId, pos);
};

/**
 * Automatically suggests the next logical continuation number based on existing chapters
 */
export const suggestNextNumber = (
  parentTarget: string,
  customChapters: CustomChapter[],
  type: "continuation" | "main" = "continuation"
): string => {
  if (type === "main") {
    let maxMain = 9;
    customChapters.forEach((c) => {
      const segs = parseNumberSegments(c.number);
      if (segs.length === 1 && segs[0] > maxMain) {
        maxMain = segs[0];
      }
    });
    return String(maxMain + 1);
  }

  let prefix = "2";
  if (parentTarget === "introducao" || parentTarget === "1") prefix = "1";
  else if (parentTarget === "fundamentacao" || parentTarget === "2") prefix = "2";
  else if (parentTarget === "metodologia" || parentTarget === "3") prefix = "3";
  else if (parentTarget === "consideracoes" || parentTarget === "8") prefix = "8";
  else if (parentTarget === "referencias" || parentTarget === "9") prefix = "9";
  else if (parentTarget.startsWith("custom-")) {
    const parentCh = customChapters.find((c) => c.id === parentTarget);
    if (parentCh?.number) {
      const subPrefix = parentCh.number;
      let maxChild = 0;
      customChapters.forEach((c) => {
        if (c.number && c.number.startsWith(`${subPrefix}.`)) {
          const rest = c.number.slice(subPrefix.length + 1);
          const segs = parseNumberSegments(rest);
          if (segs.length > 0 && segs[0] > maxChild) {
            maxChild = segs[0];
          }
        }
      });
      return `${subPrefix}.${maxChild + 1}`;
    }
  }

  const existingSubNums: number[] = [];
  customChapters.forEach((c) => {
    const num = (c.number || "").trim();
    if (num.startsWith(`${prefix}.`)) {
      const segs = parseNumberSegments(num);
      if (segs.length >= 2 && segs[0] === parseInt(prefix, 10)) {
        existingSubNums.push(segs[1]);
      }
    }
  });

  if (existingSubNums.length === 0) {
    return prefix === "2" ? "2.2" : `${prefix}.1`;
  }

  const maxSub = Math.max(...existingSubNums);
  return `${prefix}.${maxSub + 1}`;
};
