/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AiAgentConfig } from "./types";

let activeAiAgentConfig: AiAgentConfig | undefined;

export function setActiveAiAgentConfig(config?: AiAgentConfig) {
  activeAiAgentConfig = config;
}

export function getActiveAiAgentConfig(): AiAgentConfig | undefined {
  return activeAiAgentConfig;
}

export interface DimensionSummaryPayload {
  key: string;
  name: string;
  score: number;
  rating: string;
  type: string;
}

export interface SectorSynthesisRequest {
  sectorName: string;
  employeeCount: number;
  companyName?: string;
  companySector?: string;
  methodology?: "copsoq" | "qualitative";
  mode?: "copsoq_perception" | "qualitative";
  allDimensions?: DimensionSummaryPayload[];
  criticalDimensions?: DimensionSummaryPayload[];
  qualitativeContext?: {
    evaluatedText?: string;
    perceptionText?: string;
  };
  userInstructions?: string;
  agentConfig?: AiAgentConfig;
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
  agentConfig?: AiAgentConfig;
}

export interface EnrichRiskRequest {
  riskName: string;
  sectorName: string;
  companyName?: string;
  companyActivity?: string;
  agentConfig?: AiAgentConfig;
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
  agentConfig?: AiAgentConfig;
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

async function postAiJson<T>(url: string, body: Record<string, any>, fallbackError: string): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...body,
      agentConfig: body.agentConfig ?? activeAiAgentConfig,
    }),
  });

  const text = await res.text();
  let data: any = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = {};
    }
  }

  if (!res.ok) {
    const serverMsg =
      typeof data?.error === "string"
        ? data.error
        : typeof data?.message === "string"
          ? data.message
          : "";
    throw new Error(serverMsg || `${fallbackError} (HTTP ${res.status})`);
  }

  return data as T;
}

/**
 * Calls server API to generate technical synthesis or COPSOQ worker perception for a sector
 */
export async function generateSectorSynthesis(
  params: SectorSynthesisRequest
): Promise<string> {
  const data = await postAiJson<{ synthesis?: unknown }>(
    "/api/ai/sector-synthesis",
    params,
    "Falha na comunicação com a IA para síntese do setor."
  );
  return typeof data?.synthesis === "string" ? data.synthesis : "";
}

/**
 * Calls server API to generate psychosocial risks for a sector
 */
export async function generateSectorRisks(
  params: GenerateRisksRequest
): Promise<GeneratedRiskItem[]> {
  const data = await postAiJson<{ risks?: GeneratedRiskItem[] }>(
    "/api/ai/generate-risks",
    params,
    "Falha na comunicação com a IA para gerar inventário de riscos."
  );
  return data.risks || [];
}

/**
 * Calls server API to enrich a single risk item
 */
export async function enrichRiskItem(
  params: EnrichRiskRequest
): Promise<GeneratedRiskItem> {
  const data = await postAiJson<{ enriched: GeneratedRiskItem }>(
    "/api/ai/enrich-risk",
    params,
    "Falha na comunicação com a IA para detalhar o risco."
  );
  return data.enriched;
}

/**
 * Calls server API to generate 5W2H schedule and action plan for risk items
 */
export async function generateActionPlanSchedule(
  params: ActionPlanScheduleRequest
): Promise<ActionPlanScheduleItem[]> {
  const data = await postAiJson<{ plannedActions?: ActionPlanScheduleItem[] }>(
    "/api/ai/action-plan-schedule",
    params,
    "Falha na comunicação com a IA para o cronograma e plano de ação."
  );
  return data.plannedActions || [];
}

/**
 * Calls server API to test the trained AI agent with a sample prompt
 */
export async function testAiAgent(params: {
  prompt: string;
  stage: "copsoq" | "qualitative" | "inventory" | "action_plan";
  agentConfig?: AiAgentConfig;
}): Promise<string> {
  const data = await postAiJson<{ reply?: string }>(
    "/api/ai/test-agent",
    params,
    "Falha na comunicação ao testar o agente de IA."
  );
  return data.reply || "";
}
