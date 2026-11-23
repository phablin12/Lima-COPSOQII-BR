import express from "express";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Dev server must run on port 3000 unless explicitly overridden via --port (or PORT in production)
let port = process.env.NODE_ENV === "production" ? Number(process.env.PORT) || 3000 : 3000;
const portArgIndex = process.argv.indexOf("--port");
if (portArgIndex !== -1 && process.argv[portArgIndex + 1]) {
  port = Number(process.argv[portArgIndex + 1]) || port;
}

app.use(express.json({ limit: "10mb" }));

// Lazy GoogleGenAI client initialization so server startup never fails or warns before requests arrive
let aiClient: GoogleGenAI | null = null;
function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

type AgentStage = "copsoq" | "qualitative" | "inventory" | "action_plan";

interface SanitizedAgentConfig {
  agentName: string;
  tone: string;
  generalInstructions: string;
  copsoqInstructions: string;
  qualitativeInstructions: string;
  inventoryInstructions: string;
  actionPlanInstructions: string;
  referenceExamples: string;
}

function sanitizeAgentConfig(raw: any): SanitizedAgentConfig {
  const safeStr = (val: unknown, maxLen: number) =>
    typeof val === "string" ? val.trim().slice(0, maxLen) : "";

  return {
    agentName: safeStr(raw?.agentName, 120),
    tone: safeStr(raw?.tone, 60),
    generalInstructions: safeStr(raw?.generalInstructions, 4000),
    copsoqInstructions: safeStr(raw?.copsoqInstructions, 3000),
    qualitativeInstructions: safeStr(raw?.qualitativeInstructions, 3000),
    inventoryInstructions: safeStr(raw?.inventoryInstructions, 3000),
    actionPlanInstructions: safeStr(raw?.actionPlanInstructions, 3000),
    referenceExamples: safeStr(raw?.referenceExamples, 4000),
  };
}

function getToneDescription(tone: string): string {
  switch (tone) {
    case "consultivo_humanizado":
      return "Tom consultivo, acolhedor e humanizado, mantendo rigor técnico e clareza para líderes e RH.";
    case "objetivo_executivo":
      return "Tom direto, executivo e objetivo, priorizando síntese concisa, evidências e aplicabilidade imediata.";
    case "didatico_acessivel":
      return "Tom técnico-didático e acessível, explicando conceitos psicossociais com clareza para empresas de todos os portes.";
    case "tecnico_formal":
    default:
      return "Tom estritamente técnico, pericial, formal e fundamentado na NR-01 (GRO/PGR), NR-17 e COPSOQ II-BR.";
  }
}

function buildAgentTrainingBlock(agentConfigRaw: any, stage?: AgentStage): string {
  const cfg = sanitizeAgentConfig(agentConfigRaw);
  const parts: string[] = [];

  if (cfg.agentName) {
    parts.push(`Identidade configurada do agente: ${cfg.agentName}.`);
  }
  if (cfg.tone) {
    parts.push(`Estilo de comunicação definido pelo usuário: ${getToneDescription(cfg.tone)}`);
  }
  if (cfg.generalInstructions) {
    parts.push(`Diretrizes Gerais Treinadas pelo Usuário:\n${cfg.generalInstructions}`);
  }

  if (stage === "copsoq" && cfg.copsoqInstructions) {
    parts.push(`Instruções Específicas para Etapa COPSOQ II (Percepção):\n${cfg.copsoqInstructions}`);
  } else if (stage === "qualitative" && cfg.qualitativeInstructions) {
    parts.push(`Instruções Específicas para Avaliação Qualitativa (MPE):\n${cfg.qualitativeInstructions}`);
  } else if (stage === "inventory" && cfg.inventoryInstructions) {
    parts.push(`Instruções Específicas para Inventário de Riscos (GRO/PGR):\n${cfg.inventoryInstructions}`);
  } else if (stage === "action_plan" && cfg.actionPlanInstructions) {
    parts.push(`Instruções Específicas para Plano de Ação 5W2H:\n${cfg.actionPlanInstructions}`);
  }

  if (cfg.referenceExamples) {
    parts.push(`Exemplos e Padrões de Redação Preferidos pelo Usuário:\n${cfg.referenceExamples}`);
  }

  if (parts.length === 0) return "";
  return `\n\n--- TREINAMENTO PERSONALIZADO DO AGENTE ---\nSiga rigorosamente estas preferências definidas pelo usuário (desde que não violem fatos dos dados fornecidos):\n${parts.join("\n\n")}`;
}

function stripJsonFences(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("```")) {
    return trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  }
  return trimmed;
}

function formatGeminiError(error: any): { status: number; message: string } {
  const rawMessage = String(error?.message || error || "");
  const lower = rawMessage.toLowerCase();

  if (lower.includes("api_key") || lower.includes("api key") || lower.includes("unauthorized") || lower.includes("401")) {
    return { status: 401, message: "Chave de API do Gemini ausente ou inválida no ambiente do servidor." };
  }
  if (lower.includes("403") || lower.includes("permission") || lower.includes("forbidden")) {
    return { status: 403, message: "Acesso negado ao serviço de IA. Verifique as permissões da chave no servidor." };
  }
  if (lower.includes("429") || lower.includes("quota") || lower.includes("rate limit") || lower.includes("resource_exhausted")) {
    return { status: 429, message: "Limite temporário de requisições da IA atingido. Aguarde alguns segundos e tente novamente." };
  }
  if (lower.includes("404") || lower.includes("not found")) {
    return { status: 502, message: "Modelo de IA indisponível no provedor. Tente novamente em instantes." };
  }
  return { status: 500, message: rawMessage || "Erro ao consultar o serviço de IA." };
}

// Helper to query Gemini using current supported free-tier models (gemini-4-hydrogen / gemini-3.1-flash-lite)
async function callGemini(options: {
  contents: any;
  systemInstruction?: string;
  responseMimeType?: string;
  responseSchema?: any;
}) {
  const config: any = {};
  if (options.systemInstruction) {
    config.systemInstruction = options.systemInstruction;
  }
  if (options.responseMimeType) {
    config.responseMimeType = options.responseMimeType;
  }
  if (options.responseSchema) {
    config.responseSchema = options.responseSchema;
  }

  const ai = getAiClient();
  try {
    return await ai.models.generateContent({
      model: "gemini-4-hydrogen",
      contents: options.contents,
      config,
    });
  } catch (primaryError: any) {
    console.warn("Primary model (gemini-4-hydrogen) failed, falling back to gemini-3.1-flash-lite:", primaryError?.message);
    return await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: options.contents,
      config,
    });
  }
}

// ---------------------------------------------------------------------------
// 0. ENDPOINT: Health Check da IA (sem expor segredos)
// ---------------------------------------------------------------------------
app.get("/api/ai/health", (_req, res) => {
  res.json({ configured: Boolean(process.env.GEMINI_API_KEY) });
});

// ---------------------------------------------------------------------------
// 1. ENDPOINT: Síntese COPSOQ / Investigação Qualitativa do Setor
// ---------------------------------------------------------------------------
app.post("/api/ai/sector-synthesis", async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "Chave GEMINI_API_KEY não configurada no servidor." });
    }
    const {
      sectorName,
      employeeCount,
      companyName,
      companySector,
      methodology,
      mode = methodology === "qualitative" ? "qualitative" : "copsoq_perception",
      allDimensions,
      criticalDimensions,
      qualitativeContext,
      userInstructions,
      agentConfig,
    } = req.body ?? {};

    if (!sectorName || typeof sectorName !== "string" || !sectorName.trim()) {
      return res.status(400).json({ error: "Nome do setor é obrigatório." });
    }

    const safeSectorName = sectorName.trim().slice(0, 200);
    const safeCompanyName =
      typeof companyName === "string" && companyName.trim() ? companyName.trim().slice(0, 200) : "Empresa Avaliada";
    const safeCompanySector =
      typeof companySector === "string" && companySector.trim() ? companySector.trim().slice(0, 200) : "Não especificado";
    const safeEmployeeCount = Number.isFinite(Number(employeeCount))
      ? Math.max(1, Math.min(100000, Math.round(Number(employeeCount))))
      : 1;

    const safeAllDims = Array.isArray(allDimensions) ? allDimensions.slice(0, 20) : [];
    const safeCriticalDims = Array.isArray(criticalDimensions) ? criticalDimensions.slice(0, 20) : [];
    const safeEvalText =
      typeof qualitativeContext?.evaluatedText === "string" ? qualitativeContext.evaluatedText.slice(0, 3000) : "";
    const safePercepText =
      typeof qualitativeContext?.perceptionText === "string" ? qualitativeContext.perceptionText.slice(0, 3000) : "";
    const safeInstructions = typeof userInstructions === "string" ? userInstructions.slice(0, 2000) : "";

    const stage: AgentStage = methodology === "qualitative" ? "qualitative" : "copsoq";
    const trainingBlock = buildAgentTrainingBlock(agentConfig, stage);

    const isCopsoqPerception = mode === "copsoq_perception";

    const systemInstruction = isCopsoqPerception
      ? `Você é um especialista sênior em Segurança e Saúde no Trabalho (SST), Ergonomia e Psicologia Organizacional do Trabalho no Brasil (NR-01 GRO/PGR, NR-17 e COPSOQ II-BR).
Sua função é redigir a Análise Geral da Percepção dos Trabalhadores do setor a partir de TODAS as dimensões avaliadas no COPSOQ II-BR.
O texto deve:
1. Traduzir fielmente os indicadores numéricos (0 a 4 pontos) na percepção vivenciada pelos trabalhadores no dia a dia do setor.
2. Destacar primeiro os pontos fortes / fatores protetivos (dimensões classificadas como Favorável) que sustentam a saúde e engajamento da equipe.
3. Analisar com precisão os pontos de atenção e fragilidades (dimensões Moderadas e Desfavoráveis, ordenadas das mais críticas às intermediárias), relacionando dimensões positivas baixas e dimensões negativas elevadas (ex: Demandas, Conflito Trabalho-Família, Burnout e Estresse).
4. Manter linguagem técnica, objetiva, coesa, imparcial e sem clichês, em 2 a 4 parágrafos corridos prontos para compor o campo "Análise Geral do Setor" do laudo.`
      : `Você é um especialista sênior em Segurança e Saúde no Trabalho (SST), Ergonomia e Psicologia Organizacional do Trabalho no Brasil (em conformidade com a NR-01 - GRO/PGR e NR-17).
Sua função é redigir um parecer técnico aprofundado, coeso, profissional e humanizado para a investigação qualitativa de campo (MPE) do setor avaliado.
O texto deve:
1. Contextualizar o escopo avaliado e a dinâmica real de trabalho observada no setor.
2. Identificar e correlacionar claramente os fatores organizacionais e a percepção relatada pelos trabalhadores.
3. Abordar aspectos como ritmo de trabalho, clareza de papéis, liderança, cobrança de metas, suporte social e exigências emocionais.
4. Apresentar uma análise diagnóstica conclusiva que subsidie o Inventário Geral de Riscos (GRO) e o Plano de Ação.
5. Manter tom técnico, imparcial, respeitoso e construtivo, em parágrafos corridos bem articulados.${trainingBlock}`;

    const fullSystemInstruction = isCopsoqPerception ? `${systemInstruction}${trainingBlock}` : systemInstruction;

    const dimensionsToDisplay = safeAllDims.length > 0 ? safeAllDims : safeCriticalDims;

    const prompt = `Empresa: ${safeCompanyName}
Atividade/Ramo: ${safeCompanySector}
Setor/GES Avaliado: ${safeSectorName}
Colaboradores expostos no setor: ${safeEmployeeCount}
Metodologia utilizada: ${
      methodology === "qualitative" ? "Avaliação Qualitativa do Trabalho (MPE)" : "COPSOQ II - BR (Quantitativa/Qualitativa)"
    }

${
  dimensionsToDisplay.length > 0
    ? `${isCopsoqPerception ? "Resultados completos do COPSOQ II-BR por dimensão:" : "Dimensões com resultados que demandam atenção ou são críticas no COPSOQ II (ordenadas por gravidade):"}
${dimensionsToDisplay
  .map(
    (d: any) =>
      `- ${String(d?.name || "").slice(0, 100)} (${
        d?.type === "positive" ? "Dimensão Positiva/Protetiva" : "Dimensão Negativa/Invertida"
      }): Pontuação ${d?.score ?? "N/A"} / 4,00 — Classificação: ${String(d?.rating || "").slice(0, 40)}`
  )
  .join("\n")}`
    : "Não há dimensões com pontuação crítica registrada até o momento; redija um diagnóstico preventivo amplo de manutenção do bem-estar e controle de sobrecarga."
}

${safeEvalText ? `Observações preliminares de campo: ${safeEvalText}` : ""}
${safePercepText ? `Percepção relatada pelos colaboradores: ${safePercepText}` : ""}
${safeInstructions ? `Instruções específicas do perito/avaliador para esta geração: ${safeInstructions}` : ""}

${
  isCopsoqPerception
    ? "Redija a Análise Geral da Percepção dos Trabalhadores deste setor em 2 a 4 parágrafos técnicos corridos:"
    : "Redija a Conclusão Técnica e Parecer Preliminar do setor em 3 a 5 parágrafos técnicos formais para compor o laudo oficial:"
}`;

    const response = await callGemini({
      contents: prompt,
      systemInstruction: fullSystemInstruction,
    });

    const synthesis = response.text?.trim() || "";
    return res.json({ synthesis });
  } catch (error: any) {
    console.error("Error in /api/ai/sector-synthesis:", error);
    const formatted = formatGeminiError(error);
    return res.status(formatted.status).json({ error: formatted.message });
  }
});

// ---------------------------------------------------------------------------
// 2. ENDPOINT: Geração de Riscos Psicossociais para o Setor (Inventário GRO)
// ---------------------------------------------------------------------------
app.post("/api/ai/generate-risks", async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "Chave GEMINI_API_KEY não configurada no servidor." });
    }
    const {
      sectorName,
      sectorEmployees,
      companyName,
      companyActivity,
      criticalDimensions,
      sectorSynthesis,
      count = 3,
      agentConfig,
    } = req.body ?? {};

    if (!sectorName || typeof sectorName !== "string" || !sectorName.trim()) {
      return res.status(400).json({ error: "Setor alvo é obrigatório para gerar riscos." });
    }

    const parsedCount = Number(count);
    const safeCount = Number.isFinite(parsedCount) ? Math.min(10, Math.max(1, Math.round(parsedCount))) : 3;
    const safeSectorName = sectorName.trim().slice(0, 200);
    const safeEmployees = Number.isFinite(Number(sectorEmployees))
      ? Math.max(1, Math.min(100000, Math.round(Number(sectorEmployees))))
      : 1;
    const safeCompanyName =
      typeof companyName === "string" && companyName.trim() ? companyName.trim().slice(0, 200) : "Empresa Avaliada";
    const safeActivity =
      typeof companyActivity === "string" && companyActivity.trim() ? companyActivity.trim().slice(0, 200) : "Geral";
    const safeSynthesis = typeof sectorSynthesis === "string" ? sectorSynthesis.slice(0, 3000) : "";
    const safeDims = Array.isArray(criticalDimensions) ? criticalDimensions.slice(0, 20) : [];

    const trainingBlock = buildAgentTrainingBlock(agentConfig, "inventory");

    const systemInstruction = `Você é um engenheiro de segurança do trabalho e psicólogo organizacional especialista em inventários de riscos psicossociais (NR-01 GRO/PGR e Matriz de Riscos 5x5).
Gere uma lista de ${safeCount} riscos psicossociais rigorosamente técnicos e fundamentados para o setor informado.
Para cada risco, defina com precisão técnica:
- riskName: Nome técnico claro do risco psicossocial.
- sourcesField: Perigos, fontes geradoras e circunstâncias organizacionais específicas.
- possibleInjuries: Possíveis danos à saúde e agravos mentais/físicos (ex: Burnout, TAG, depressão, cefaleias tensionais, distúrbios osteomusculares por sobrecarga mental).
- existingControls: Controles administrativos/organizacionais sugeridos como baseline ou existentes.
- probability: Grau de probabilidade de 1 (Muito Baixa) a 5 (Muito Alta).
- severity: Grau de severidade de 1 (Leve) a 5 (Catastrófica).
- recommendation: Diretriz técnica de recomendação preventiva imediata.
- actionObjective: Objetivo claro da medida a ser adotada no plano de ação.
- actionProposed: Ação preventiva/corretiva concreta (5W2H) detalhando como implementar.
- priority: "Alta", "Média" ou "Baixa".
- periodicity: Frequência de monitoramento ("Mensal", "Bimestral", "Trimestral", "Semestral").
- efficacyIndicator: Indicador ou métrica de eficácia (KPI).
- deadline: Prazo sugerido ("A definir pela empresa" ou prazo realista se especificado nas diretrizes).${trainingBlock}`;

    const prompt = `Empresa: ${safeCompanyName}
Atividade Principal: ${safeActivity}
Setor/GES: ${safeSectorName}
Colaboradores Expostos: ${safeEmployees}
${safeSynthesis ? `Análise / Parecer técnico do setor: ${safeSynthesis}` : ""}
${
  safeDims.length > 0
    ? `Dimensões críticas ou desfavoráveis no setor: ${safeDims
        .map((d: any) => `${String(d?.name || "").slice(0, 100)} (${String(d?.rating || "").slice(0, 40)})`)
        .join(", ")}`
    : ""
}

Gere uma lista de riscos psicossociais estruturados para o inventário do setor.`;

    const response = await callGemini({
      contents: prompt,
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            riskName: { type: Type.STRING },
            sourcesField: { type: Type.STRING },
            possibleInjuries: { type: Type.STRING },
            existingControls: { type: Type.STRING },
            probability: { type: Type.INTEGER },
            severity: { type: Type.INTEGER },
            recommendation: { type: Type.STRING },
            actionObjective: { type: Type.STRING },
            actionProposed: { type: Type.STRING },
            priority: { type: Type.STRING },
            periodicity: { type: Type.STRING },
            efficacyIndicator: { type: Type.STRING },
            deadline: { type: Type.STRING },
          },
          required: [
            "riskName",
            "sourcesField",
            "possibleInjuries",
            "existingControls",
            "probability",
            "severity",
            "recommendation",
            "actionObjective",
            "actionProposed",
            "priority",
            "periodicity",
            "efficacyIndicator",
            "deadline",
          ],
        },
      },
    });

    const parsed = JSON.parse(stripJsonFences(response.text || "[]"));
    return res.json({ risks: parsed });
  } catch (error: any) {
    console.error("Error in /api/ai/generate-risks:", error);
    const formatted = formatGeminiError(error);
    return res.status(formatted.status).json({ error: formatted.message });
  }
});

// ---------------------------------------------------------------------------
// 3. ENDPOINT: Enriquecimento de Risco Único (Preenchimento Assistido de Risco)
// ---------------------------------------------------------------------------
app.post("/api/ai/enrich-risk", async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "Chave GEMINI_API_KEY não configurada no servidor." });
    }
    const { riskName, sectorName, companyName, companyActivity, agentConfig } = req.body ?? {};

    if (!riskName || typeof riskName !== "string" || !riskName.trim()) {
      return res.status(400).json({ error: "Nome do risco é obrigatório." });
    }

    const trainingBlock = buildAgentTrainingBlock(agentConfig, "inventory");

    const systemInstruction = `Você é um perito em Engenharia de Segurança e Psicologia Organizacional do Trabalho (NR-01 e COPSOQ II).
Recebendo o nome de um risco psicossocial e o setor correspondente, elabore o preenchimento técnico completo de todos os campos da ficha de inventário e plano de ação.${trainingBlock}`;

    const prompt = `Risco Psicossocial: "${riskName.trim().slice(0, 200)}"
Setor / GES: "${typeof sectorName === "string" && sectorName.trim() ? sectorName.trim().slice(0, 150) : "Geral"}"
Empresa: "${typeof companyName === "string" && companyName.trim() ? companyName.trim().slice(0, 200) : "Empresa"}"
Ramo: "${typeof companyActivity === "string" && companyActivity.trim() ? companyActivity.trim().slice(0, 200) : "Comércio e Serviços"}"

Elabore a caracterização técnica do risco e diretrizes de controle.`;

    const response = await callGemini({
      contents: prompt,
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          sourcesField: { type: Type.STRING, description: "Perigos, fontes e circunstâncias geradoras do risco." },
          possibleInjuries: { type: Type.STRING, description: "Possíveis agravos, danos e repercussões psicossociais na saúde." },
          existingControls: { type: Type.STRING, description: "Medidas organizacionais recomendadas ou verificadas." },
          probability: { type: Type.INTEGER, description: "Probabilidade recomendada na matriz 5x5 (1 a 5)." },
          severity: { type: Type.INTEGER, description: "Severidade recomendada na matriz 5x5 (1 a 5)." },
          recommendation: { type: Type.STRING, description: "Diretriz preventiva recomendada para o laudo." },
          actionObjective: { type: Type.STRING, description: "Objetivo no Plano de Ação." },
          actionProposed: { type: Type.STRING, description: "Ação 5W2H proposta detalhando como mitigar o risco." },
          priority: { type: Type.STRING, description: "'Alta', 'Média' ou 'Baixa'" },
          periodicity: { type: Type.STRING, description: "Periodicidade de acompanhamento (ex: Mensal, Trimestral)" },
          efficacyIndicator: { type: Type.STRING, description: "Indicador de eficácia / métrica de acompanhamento" },
          deadline: { type: Type.STRING, description: "Prazo sugerido (ex: 'A definir pela empresa' ou '30 dias')" },
        },
        required: [
          "sourcesField",
          "possibleInjuries",
          "existingControls",
          "probability",
          "severity",
          "recommendation",
          "actionObjective",
          "actionProposed",
          "priority",
          "periodicity",
          "efficacyIndicator",
          "deadline",
        ],
      },
    });

    const enriched = JSON.parse(stripJsonFences(response.text || "{}"));
    return res.json({ enriched });
  } catch (error: any) {
    console.error("Error in /api/ai/enrich-risk:", error);
    const formatted = formatGeminiError(error);
    return res.status(formatted.status).json({ error: formatted.message });
  }
});

// ---------------------------------------------------------------------------
// 4. ENDPOINT: Cronograma e Plano de Ação Estruturado com IA
// ---------------------------------------------------------------------------
app.post("/api/ai/action-plan-schedule", async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "Chave GEMINI_API_KEY não configurada no servidor." });
    }
    const { companyName, companyActivity, items, agentConfig } = req.body ?? {};

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Nenhum item de risco fornecido." });
    }

    const safeItems = items.slice(0, 60);
    const safeCompanyName =
      typeof companyName === "string" && companyName.trim() ? companyName.trim().slice(0, 200) : "Empresa";
    const safeActivity =
      typeof companyActivity === "string" && companyActivity.trim() ? companyActivity.trim().slice(0, 200) : "Geral";

    const trainingBlock = buildAgentTrainingBlock(agentConfig, "action_plan");

    const systemInstruction = `Você é um consultor líder de Gestão de Riscos Ocupacionais (GRO/PGR) especialista na metodologia 5W2H e cronogramas de implantação de medidas preventivas psicossociais.
Para cada risco fornecido, você deve estruturar o plano de ação e cronograma contendo:
- id: O mesmo ID do risco recebido.
- actionObjective: Objetivo conciso do plano de ação.
- actionProposed: Ação preventiva/corretiva articulada no modelo 5W2H (o que será executado e como).
- responsible: Cargo ou setor responsável técnico (ex: "Coordenação de RH e Gestores de Setor", "SESMT e Medicina do Trabalho", "Diretoria e Liderança Imediata").
- priority: Prioridade ("Alta", "Média" ou "Baixa"), compatível com a gravidade do risco.
- periodicity: Periodicidade do monitoramento ("Mensal", "Bimestral", "Trimestral", "Semestral").
- deadline: Prazo realista no cronograma ("30 dias", "60 dias", "90 dias", "A definir pela empresa" ou trimestre compatível com a prioridade).
- efficacyIndicator: Indicador objetivo de eficácia e acompanhamento contínuo.${trainingBlock}`;

    const prompt = `Empresa: ${safeCompanyName}
Ramo: ${safeActivity}

Riscos no inventário para elaboração do plano de ação e cronograma:
${JSON.stringify(
  safeItems.map((i: any) => ({
    id: String(i?.id || ""),
    riskName: String(i?.riskName || "").slice(0, 160),
    sectorName: String(i?.sectorName || "Geral").slice(0, 120),
    riskLevel: String(i?.riskLevel || "Moderado").slice(0, 40),
    riskScore: Number(i?.riskScore) || 0,
    currentRecommendation: String(i?.recommendation || "").slice(0, 300),
  })),
  null,
  2
)}

Elabore o plano de ação e cronograma 5W2H para todos esses riscos:`;

    const response = await callGemini({
      contents: prompt,
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            actionObjective: { type: Type.STRING },
            actionProposed: { type: Type.STRING },
            responsible: { type: Type.STRING },
            priority: { type: Type.STRING },
            periodicity: { type: Type.STRING },
            deadline: { type: Type.STRING },
            efficacyIndicator: { type: Type.STRING },
          },
          required: [
            "id",
            "actionObjective",
            "actionProposed",
            "responsible",
            "priority",
            "periodicity",
            "deadline",
            "efficacyIndicator",
          ],
        },
      },
    });

    const plannedActions = JSON.parse(stripJsonFences(response.text || "[]"));
    return res.json({ plannedActions });
  } catch (error: any) {
    console.error("Error in /api/ai/action-plan-schedule:", error);
    const formatted = formatGeminiError(error);
    return res.status(formatted.status).json({ error: formatted.message });
  }
});

// ---------------------------------------------------------------------------
// 5. ENDPOINT: Simulação / Teste ao Vivo do Agente de IA Treinado
// ---------------------------------------------------------------------------
app.post("/api/ai/test-agent", async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "Chave GEMINI_API_KEY não configurada no servidor." });
    }
    const { prompt, stage = "copsoq", agentConfig } = req.body ?? {};

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return res.status(400).json({ error: "Informe um comando ou cenário para testar o agente." });
    }

    const validStage: AgentStage =
      stage === "qualitative" || stage === "inventory" || stage === "action_plan" ? stage : "copsoq";

    const trainingBlock = buildAgentTrainingBlock(agentConfig, validStage);
    const systemInstruction = `Você é o Agente Especialista em SST Psicossocial (NR-01 GRO/PGR, NR-17 e COPSOQ II-BR) integrado à plataforma.${trainingBlock}`;

    const response = await callGemini({
      contents: prompt.trim().slice(0, 3000),
      systemInstruction,
    });

    return res.json({ reply: response.text?.trim() || "" });
  } catch (error: any) {
    console.error("Error in /api/ai/test-agent:", error);
    const formatted = formatGeminiError(error);
    return res.status(formatted.status).json({ error: formatted.message });
  }
});

// ---------------------------------------------------------------------------
// Server setup with Vite middleware (Dev) or Static files (Prod)
// ---------------------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV === "production") {
    app.use(express.static("dist"));
    app.get("*", (_req, res) => {
      res.sendFile(path.resolve(__dirname, "dist", "index.html"));
    });
  } else {
    // Start Vite creation concurrently so port 3000 binds immediately without timing out health checks
    const vitePromise = createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    vitePromise.catch((err) => {
      console.error("Failed to initialize Vite dev server:", err);
    });

    app.use(async (req, res, next) => {
      try {
        const vite = await vitePromise;
        return vite.middlewares(req, res, next);
      } catch (err) {
        next(err);
      }
    });
  }

  app.listen(port, "0.0.0.0", () => {
    console.log(`Server listening on port ${port}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
