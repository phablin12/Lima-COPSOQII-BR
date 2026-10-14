/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SectorSynthesisRequest {
  sectorName: string;
  employeeCount: number;
  companyName?: string;
  companySector?: string;
  methodology?: "copsoq" | "qualitative";
  criticalDimensions?: Array<{
    key: string;
    name: string;
    score: number;
    rating: string;
    type: string;
  }>;
  qualitativeContext?: {
    evaluatedText?: string;
    perceptionText?: string;
  };
  userInstructions?: string;
}

export interface GeneratedRiskItem {
  riskName: string;
  sourcesField: string;
  possibleInjuries: string;
  existingControls: string;
  probability: number;
  severity: number;
  recommendation: string;
  actionObjective: string;
  actionProposed: string;
  priority: "Alta" | "Média" | "Baixa";
  periodicity: string;
  efficacyIndicator: string;
  deadline: string;
}

export interface GenerateRisksRequest {
  sectorName: string;
  sectorEmployees: number;
  companyName?: string;
  companyActivity?: string;
  criticalDimensions?: any[];
  sectorSynthesis?: string;
  count?: number;
}

export interface EnrichRiskRequest {
  riskName: string;
  sectorName: string;
  companyName?: string;
  companyActivity?: string;
}

export interface ActionPlanScheduleRequest {
  companyName?: string;
  companyActivity?: string;
  items: Array<{
    id: string;
    riskName: string;
    sectorName: string;
    riskLevel?: string;
    riskScore?: number;
    recommendation?: string;
  }>;
}

export interface ActionPlanScheduleItem {
  id: string;
  actionObjective: string;
  actionProposed: string;
  responsible: string;
  priority: "Alta" | "Média" | "Baixa";
  periodicity: string;
  deadline: string;
  efficacyIndicator: string;
}

/**
 * Calls server API to generate technical synthesis for a sector
 */
export async function generateSectorSynthesis(
  params: SectorSynthesisRequest
): Promise<string> {
  const res = await fetch("/api/ai/sector-synthesis", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Falha na comunicação com a IA para síntese do setor.");
  }

  const data = await res.json();
  return data.synthesis || "";
}

/**
 * Calls server API to generate psychosocial risks for a sector
 */
export async function generateSectorRisks(
  params: GenerateRisksRequest
): Promise<GeneratedRiskItem[]> {
  const res = await fetch("/api/ai/generate-risks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Falha na comunicação com a IA para gerar inventário de riscos.");
  }

  const data = await res.json();
  return data.risks || [];
}

/**
 * Calls server API to enrich a single risk item
 */
export async function enrichRiskItem(
  params: EnrichRiskRequest
): Promise<GeneratedRiskItem> {
  const res = await fetch("/api/ai/enrich-risk", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Falha na comunicação com a IA para detalhar o risco.");
  }

  const data = await res.json();
  return data.enriched;
}

/**
 * Calls server API to generate 5W2H schedule and action plan for risk items
 */
export async function generateActionPlanSchedule(
  params: ActionPlanScheduleRequest
): Promise<ActionPlanScheduleItem[]> {
  const res = await fetch("/api/ai/action-plan-schedule", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Falha na comunicação com a IA para o cronograma e plano de ação.");
  }

  const data = await res.json();
  return data.plannedActions || [];
}
