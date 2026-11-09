/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CustomChapter } from "./types";

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

  // If title already starts with the number (e.g. "2.2 - " or "2.2. " or "2.2 "), return as is
  const escapedNum = num.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`^${escapedNum}\\s*[-.]?\\s*`, "i");
  if (regex.test(rawTitle)) {
    return rawTitle;
  }

  return `${num}. ${rawTitle}`;
};

/**
 * Returns level of hierarchy:
 * 1 = Main chapter (e.g. 1, 2, 10, Anexo)
 * 2 = Section / continuation (e.g. 2.2, 2.3, 1.1)
 * 3 = Subsection (e.g. 2.3.1, 2.2.1)
 * 4 = Sub-subsection (e.g. 2.3.1.1)
 */
export const getChapterLevel = (ch: { level?: number; number?: string }): number => {
  if (ch.level && ch.level >= 1 && ch.level <= 4) return ch.level;
  const num = (ch.number || "").trim();
  if (!num) return 1;

  // Count dots in numbers like "2.3.1"
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
 * Automatically suggests the next logical continuation number based on existing chapters
 */
export const suggestNextNumber = (
  parentTarget: string,
  customChapters: CustomChapter[],
  type: "continuation" | "main" = "continuation"
): string => {
  if (type === "main") {
    // Find highest main chapter number
    let maxMain = 9;
    customChapters.forEach((c) => {
      const segs = parseNumberSegments(c.number);
      if (segs.length === 1 && segs[0] > maxMain) {
        maxMain = segs[0];
      }
    });
    return String(maxMain + 1);
  }

  // If continuation of a standard chapter or existing custom chapter
  let prefix = "2";
  if (parentTarget === "introducao" || parentTarget === "1") prefix = "1";
  else if (parentTarget === "fundamentacao" || parentTarget === "2") prefix = "2";
  else if (parentTarget === "metodologia" || parentTarget === "3") prefix = "3";
  else if (parentTarget === "consideracoes" || parentTarget === "8") prefix = "8";
  else if (parentTarget === "referencias" || parentTarget === "9") prefix = "9";
  else if (parentTarget.startsWith("custom-")) {
    const parentCh = customChapters.find((c) => c.id === parentTarget);
    if (parentCh?.number) {
      // Sub-branching: e.g. parent is "2.2", children will be "2.2.1", "2.2.2"
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

  // Find all existing subchapters for this prefix (e.g. 2.1, 2.2, 2.3)
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
    // For chapter 2 (Fundamentação Teórica), the main standard chapter text is 2,
    // so the next subsection is usually 2.2 or 2.1.
    return prefix === "2" ? "2.2" : `${prefix}.1`;
  }

  const maxSub = Math.max(...existingSubNums);
  return `${prefix}.${maxSub + 1}`;
};
