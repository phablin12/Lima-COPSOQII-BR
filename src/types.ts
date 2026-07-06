/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Sector {
  id: string;
  name: string;
  employeeCount: number;
  respondentsCount?: number; // Number of employees who responded
  risksRecognized?: boolean; // Whether the company/sector recognizes risks in the devolution
  scores: Record<string, number>; // dimensionKey -> score (0 to 4)
  devolvedSynthesis: string; // Synth for moderate/unfavorable risks during devolution with leaders
}

export interface CatalogRisk {
  id: string;
  name: string;
  source: string;
  possibleInjuries: string;
  defaultLevel: "Insignificante" | "Baixo" | "Moderado" | "Alto" | "Grave";
  existingControls?: string; // Existing preventive controls
  recommendation?: string; // Recommended controls
}

export interface RiskInventoryItem {
  id: string;
  sectorId: string; // Association with Sector
  riskName: string; // Pulled from catalog or custom
  exposedCount: number;
  type: "Psicossocial"; // Locked/Default
  sourcesField: string; // Fontes encontradas em campo
  possibleInjuries: string; // Possíveis lesões / agravos
  diseaseHistory: string; // Histórico de doenças
  existingControls: string; // Medidas de controle existentes
  
  // Matrix 5x5 Assessment
  probability: number; // 1 to 5
  severity: number; // 1 to 5
  riskScore: number; // probability * severity (1 to 25)
  riskLevel: "Insignificante" | "Baixo" | "Moderado" | "Alto" | "Grave";
  color: "blue" | "green" | "yellow" | "orange" | "red";
  uncertainty: "Certa" | "Incerta" | "Altamente Incerta";

  // Control recommendations and actions
  recommendation: string; // Recomendação preventiva
  priority: "Baixa" | "Média" | "Alta";
  responsible: string; // Quem fará (ex: líderes, empresa, gestores)
  status: "Pendente" | "Em Andamento" | "Concluído";
  deadline: string; // Quando será feito / Prazo (Mês/Ano ou data)
  monitoring: string; // Como acompanhar
  measureResults: string; // Como aferir resultados

  // Action Plan Fields (synchronized/extended)
  actionObjective: string; // Objetivo da ação
  actionProposed: string; // Ação proposta
  periodicity: string; // Periodicidade
  efficacyIndicator: string; // Indicador de eficácia
}

export interface ReportChapters {
  introducao: string;
  fundamentacao: string;
  metodologia: string;
  referencias: string;
}

export interface Report {
  id: string;
  companyName: string;
  cnpj: string;
  companyAddress?: string; // Full Address
  companyRiskDegree?: number; // Risk level: 1, 2, 3, or 4
  companyCnae?: string; // Main CNAE: 0000-0/00
  companyLogo?: string; // Base64 logo of the assessed company
  companyFantasyName?: string;
  companyNumber?: string;
  companySector?: string;
  companyCep?: string;
  companyBairro?: string;
  companyCity?: string;
  companyState?: string;
  coverImage?: string; // Base64 cover page image (optional)
  dateStart: string;
  dateEnd: string;
  professionalName: string;
  professionalRole: "Técnico de Segurança do Trabalho" | "Engenheiro de Segurança do Trabalho" | "Psicólogo Organizacional" | "Outro";
  professionalReg: string; // CREA, MTE, CRP, etc.
  
  sectors: Sector[];
  riskInventory: RiskInventoryItem[];
  chapters: ReportChapters;
  finalConsiderations: string;
  risksRecognized?: boolean; // Whether the company recognizes the risks (influences chapter 6 & 7 rendering)
  createdAt: string;
  updatedAt: string;
}

export interface DimensionDefinition {
  key: string;
  name: string;
  type: "positive" | "negative";
  description: string;
}

export const COPSOQ_DIMENSIONS: DimensionDefinition[] = [
  {
    key: "influencia",
    name: "Influência e Desenvolvimento",
    type: "positive",
    description: "Grau de influência sobre as tarefas, margem de manobra e possibilidades de desenvolvimento no trabalho."
  },
  {
    key: "significado",
    name: "Significado e Compromisso",
    type: "positive",
    description: "Sentido atribuído ao trabalho e o grau de compromisso ou envolvimento com a atividade laboral."
  },
  {
    key: "relacoes",
    name: "Relações Interpessoais",
    type: "positive",
    description: "Qualidade do apoio social de colegas e chefias, sentimento de comunidade e colaboração técnica."
  },
  {
    key: "lideranca",
    name: "Liderança",
    type: "positive",
    description: "Qualidade da liderança exercida pelos superiores diretos, clareza de papel laboral e previsibilidade."
  },
  {
    key: "satisfacao",
    name: "Satisfação no Trabalho",
    type: "positive",
    description: "Grau de satisfação geral com as condições de trabalho, remuneração e perspectivas profissionais."
  },
  {
    key: "valores",
    name: "Valores no Local de Trabalho",
    type: "positive",
    description: "Presença de confiança mútua, justiça, respeito às regras e igualdade de tratamento na empresa."
  },
  {
    key: "saude",
    name: "Saúde Geral",
    type: "positive",
    description: "Percepção subjetiva de saúde física, mental e bem-estar geral reportado pelos colaboradores."
  },
  {
    key: "demandas",
    name: "Demandas no Trabalho",
    type: "negative",
    description: "Exigências quantitativas, cognitivas, emocionais e ritmo acelerado de execução de tarefas."
  },
  {
    key: "conflitos",
    name: "Conflitos Família e Trabalho",
    type: "negative",
    description: "Impacto das exigências temporais ou de energia do trabalho sobre a vida familiar e pessoal."
  },
  {
    key: "burnout",
    name: "Burnout e Estresse",
    type: "negative",
    description: "Sintomas cognitivos e comportamentais de estresse e esgotamento profissional percebidos."
  }
];

export const getDimensionRating = (score: number, type: "positive" | "negative" = "positive"): {
  rating: "Favorável" | "Moderada" | "Desfavorável" | "Não Avaliado";
  colorClass: string;
  bgClass: string;
  textColor: string;
} => {
  if (score <= 0 || score === undefined) {
    return {
      rating: "Não Avaliado",
      colorClass: "bg-slate-300",
      bgClass: "bg-slate-100 text-slate-500 border-slate-200",
      textColor: "text-slate-400"
    };
  }

  if (type === "positive") {
    // maior que 2,66 são favoráveis, 1.34 à 2,66 Moderado e 0 à 1,33 Desfavorável
    if (score > 2.66) {
      return {
        rating: "Favorável",
        colorClass: "bg-emerald-500",
        bgClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
        textColor: "text-emerald-700"
      };
    } else if (score >= 1.34) {
      return {
        rating: "Moderada",
        colorClass: "bg-amber-500",
        bgClass: "bg-amber-50 text-amber-800 border-amber-200",
        textColor: "text-amber-700"
      };
    } else {
      return {
        rating: "Desfavorável",
        colorClass: "bg-rose-500",
        bgClass: "bg-rose-50 text-rose-800 border-rose-200",
        textColor: "text-rose-700"
      };
    }
  } else {
    // negative: de 0 à 1,33 pontos favorável, moderado de 1,34 à 2,66 e maior que 2,66 desfavorável.
    if (score <= 1.33) {
      return {
        rating: "Favorável",
        colorClass: "bg-emerald-500",
        bgClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
        textColor: "text-emerald-700"
      };
    } else if (score <= 2.66) {
      return {
        rating: "Moderada",
        colorClass: "bg-amber-500",
        bgClass: "bg-amber-50 text-amber-800 border-amber-200",
        textColor: "text-amber-700"
      };
    } else {
      return {
        rating: "Desfavorável",
        colorClass: "bg-rose-500",
        bgClass: "bg-rose-50 text-rose-800 border-rose-200",
        textColor: "text-rose-700"
      };
    }
  }
};
