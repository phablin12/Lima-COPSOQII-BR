/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface MatrixItem {
  level: "Insignificante" | "Baixo" | "Moderado" | "Alto" | "Grave";
  color: "blue" | "green" | "yellow" | "orange" | "red";
  label: string;
}

export const PROBABILITY_LEVELS = [
  { value: 1, label: "Raro", desc: "Altamente improvável de ocorrer" },
  { value: 2, label: "Pouco Provável", desc: "Pode ocorrer raramente" },
  { value: 3, label: "Possível", desc: "Pode ocorrer em algumas circunstâncias" },
  { value: 4, label: "Provável", desc: "Ocorrência frequente ou provável" },
  { value: 5, label: "Muito Provável", desc: "Quase certa a ocorrência" }
];

export const SEVERITY_LEVELS = [
  { value: 1, label: "Leve", desc: "Sem lesões ou danos insignificantes à saúde" },
  { value: 2, label: "Baixa", desc: "Lesões leves reversíveis ou estresse passageiro" },
  { value: 3, label: "Moderada", desc: "Afastamento temporário ou sofrimento psíquico tratável" },
  { value: 4, label: "Alta", desc: "Afastamentos frequentes ou sofrimento psíquico grave" },
  { value: 5, label: "Extrema", desc: "Invalidez permanente ou colapso mental grave (Burnout severo)" }
];

export const getMatrixCell = (probability: number, severity: number): MatrixItem => {
  const score = probability * severity;

  // Standard professional SST 5x5 matrix
  if (score >= 20) {
    return { level: "Grave", color: "red", label: "Risco Grave (Crítico)" };
  } else if (score >= 12) {
    return { level: "Alto", color: "orange", label: "Risco Alto" };
  } else if (score >= 8 || (probability === 5 && severity === 2)) {
    return { level: "Moderado", color: "yellow", label: "Risco Moderado" };
  } else if (score >= 3) {
    return { level: "Baixo", color: "green", label: "Risco Baixo" };
  } else {
    return { level: "Insignificante", color: "blue", label: "Risco Insignificante" };
  }
};

export const getCriticidade = (probability: number, severity: number): "Certa" | "Incerta" | "Altamente Incerta" => {
  const score = probability * severity;
  if (score >= 12) {
    return "Certa";
  } else if (score >= 5) {
    return "Incerta";
  } else {
    return "Altamente Incerta";
  }
};

export const getColorClass = (color: "blue" | "green" | "yellow" | "orange" | "red"): {
  bg: string;
  text: string;
  border: string;
  dot: string;
} => {
  switch (color) {
    case "blue":
      return {
        bg: "bg-blue-50 hover:bg-blue-100",
        text: "text-blue-800",
        border: "border-blue-200",
        dot: "bg-blue-500"
      };
    case "green":
      return {
        bg: "bg-emerald-50 hover:bg-emerald-100",
        text: "text-emerald-800",
        border: "border-emerald-200",
        dot: "bg-emerald-500"
      };
    case "yellow":
      return {
        bg: "bg-amber-50 hover:bg-amber-100",
        text: "text-amber-800",
        border: "border-amber-200",
        dot: "bg-amber-500"
      };
    case "orange":
      return {
        bg: "bg-orange-50 hover:bg-orange-100",
        text: "text-orange-800",
        border: "border-orange-200",
        dot: "bg-orange-500"
      };
    case "red":
      return {
        bg: "bg-rose-50 hover:bg-rose-100",
        text: "text-rose-800",
        border: "border-rose-200",
        dot: "bg-rose-500"
      };
  }
};
