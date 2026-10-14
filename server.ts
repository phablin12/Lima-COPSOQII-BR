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

// Parse port from CLI args if provided (e.g. --port 3000), or fallback to process.env.PORT / 3000
let port = Number(process.env.PORT) || 3000;
const portArgIndex = process.argv.indexOf("--port");
if (portArgIndex !== -1 && process.argv[portArgIndex + 1]) {
  port = Number(process.argv[portArgIndex + 1]) || port;
}

app.use(express.json({ limit: "10mb" }));

// Initialize GoogleGenAI instance on the server
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// Helper to query Gemini with preferred model (gemini-3.1-flash-lite / gemini-3.8-flash)
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

  // Use gemini-3.1-flash-lite for fast, high-reliability response
  try {
    return await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: options.contents,
      config,
    });
  } catch (error: any) {
    console.warn("Primary model attempt failed, trying gemini-3.8-flash:", error.message);
    return await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: options.contents,
      config,
    });
  }
}

// ---------------------------------------------------------------------------
// 1. ENDPOINT: Síntese de Devolutiva / Investigação Qualitativa do Setor
// ---------------------------------------------------------------------------
app.post("/api/ai/sector-synthesis", async (req, res) => {
  try {
    const {
      sectorName,
      employeeCount,
      companyName,
      companySector,
      methodology,
      criticalDimensions,
      qualitativeContext,
      userInstructions,
    } = req.body;

    const systemInstruction = `Você é um especialista sênior em Segurança e Saúde no Trabalho (SST), Ergonomia e Psicologia Organizacional do Trabalho no Brasil (em conformidade com a NR-01 - GRO/PGR, NR-17 e COPSOQ II - BR).
Sua função é redigir um relato técnico aprofundado, coeso, profissional e humanizado da devolutiva técnica / investigação qualitativa de campo para o setor avaliado.
O texto deve:
1. Contextualizar a reunião de devolutiva com os líderes do setor e a dinâmica de trabalho.
2. Identificar e correlacionar claramente as causas organizacionais que explicam os riscos ou pontuações do setor.
3. Abordar aspectos como ritmo de trabalho, clareza de papéis, liderança, cobrança de metas, suporte social e exigências emocionais.
4. Apresentar uma análise diagnóstica que subsidie o Inventário Geral de Riscos e o Plano de Ação.
5. Manter tom estritamente técnico, imparcial, respeitoso e construtivo. Não use gírias ou clichês vazios. Escreva em parágrafos corridos bem articulados.`;

    const prompt = `Empresa: ${companyName || "Empresa Avaliada"}
Atividade/Ramo: ${companySector || "Não especificado"}
Setor/GES Avaliado: ${sectorName || "Setor Operacional"}
Colaboradores expostos no setor: ${employeeCount || 1}
Metodologia utilizada: ${methodology === "qualitative" ? "Avaliação Qualitativa do Trabalho" : "COPSOQ II - BR (Quantitativa/Qualitativa)"}

${
  criticalDimensions && criticalDimensions.length > 0
    ? `Dimensões com resultados que demandam atenção ou são críticas no COPSOQ II:
${criticalDimensions.map((d: any) => `- ${d.name} (${d.type === "positive" ? "Dimensão Protetiva" : "Dimensão Saturadora"}): Pontuação ${d.score} - Classificação: ${d.rating}`).join("\n")}`
    : "Não há dimensões com pontuação alarmante registrada até o momento; redija um diagnóstico preventivo amplo de manutenção do bem-estar e controle de sobrecarga."
}

${
  qualitativeContext?.evaluatedText
    ? `Observações preliminares de campo: ${qualitativeContext.evaluatedText}`
    : ""
}
${
  qualitativeContext?.perceptionText
    ? `Percepção relatada pelos colaboradores: ${qualitativeContext.perceptionText}`
    : ""
}
${userInstructions ? `Instruções ou apontamentos adicionais do perito/avaliador: ${userInstructions}` : ""}

Redija a Síntese Técnica de Devolutiva do setor em 3 a 5 parágrafos técnicos detalhados e formais para compor o laudo oficial:`;

    const response = await callGemini({
      contents: prompt,
      systemInstruction,
    });

    const synthesis = response.text?.trim() || "";
    return res.json({ synthesis });
  } catch (error: any) {
    console.error("Error in /api/ai/sector-synthesis:", error);
    return res.status(500).json({ error: error.message || "Erro ao gerar síntese do setor com IA." });
  }
});

// ---------------------------------------------------------------------------
// 2. ENDPOINT: Geração de Riscos Psicossociais para o Setor (Inventário GRO)
// ---------------------------------------------------------------------------
app.post("/api/ai/generate-risks", async (req, res) => {
  try {
    const {
      sectorName,
      sectorEmployees,
      companyName,
      companyActivity,
      criticalDimensions,
      sectorSynthesis,
      count = 3,
    } = req.body;

    const systemInstruction = `Você é um engenheiro de segurança do trabalho e psicólogo organizacional especialista em inventários de riscos psicossociais (NR-01 GRO/PGR e Matriz de Riscos 5x5).
Gere uma lista de ${count} riscos psicossociais rigorosamente técnicos e fundamentados para o setor informado.
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
- deadline: Prazo sugerido de implantação (ex: "Mês 1 (Imediato)", "Mês 2", "Mês 3").`;

    const prompt = `Empresa: ${companyName || "Empresa Avaliada"}
Atividade Principal: ${companyActivity || "Geral"}
Setor/GES: ${sectorName || "Setor Operacional"}
Colaboradores Expostos: ${sectorEmployees || 1}
${sectorSynthesis ? `Síntese / Devolutiva do setor: ${sectorSynthesis}` : ""}
${
  criticalDimensions && criticalDimensions.length > 0
    ? `Dimensões críticas ou desfavoráveis no setor: ${criticalDimensions.map((d: any) => `${d.name} (${d.rating})`).join(", ")}`
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

    const parsed = JSON.parse(response.text?.trim() || "[]");
    return res.json({ risks: parsed });
  } catch (error: any) {
    console.error("Error in /api/ai/generate-risks:", error);
    return res.status(500).json({ error: error.message || "Erro ao gerar inventário de riscos com IA." });
  }
});

// ---------------------------------------------------------------------------
// 3. ENDPOINT: Enriquecimento de Risco Único (Preenchimento Assistido de Risco)
// ---------------------------------------------------------------------------
app.post("/api/ai/enrich-risk", async (req, res) => {
  try {
    const { riskName, sectorName, companyName, companyActivity } = req.body;

    if (!riskName || !riskName.trim()) {
      return res.status(400).json({ error: "Nome do risco é obrigatório." });
    }

    const systemInstruction = `Você é um perito em Engenharia de Segurança e Psicologia Organizacional do Trabalho (NR-01 e COPSOQ II).
Recebendo o nome de um risco psicossocial e o setor correspondente, elabore o preenchimento técnico completo de todos os campos da ficha de inventário e plano de ação.`;

    const prompt = `Risco Psicossocial: "${riskName}"
Setor / GES: "${sectorName || "Geral"}"
Empresa: "${companyName || "Empresa"}"
Ramo: "${companyActivity || "Comércio e Serviços"}"

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
          deadline: { type: Type.STRING, description: "Prazo recomendado no cronograma (ex: Mês Corrente + 2)" },
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

    const enriched = JSON.parse(response.text?.trim() || "{}");
    return res.json({ enriched });
  } catch (error: any) {
    console.error("Error in /api/ai/enrich-risk:", error);
    return res.status(500).json({ error: error.message || "Erro ao enriquecer dados do risco com IA." });
  }
});

// ---------------------------------------------------------------------------
// 4. ENDPOINT: Cronograma e Plano de Ação Estruturado com IA
// ---------------------------------------------------------------------------
app.post("/api/ai/action-plan-schedule", async (req, res) => {
  try {
    const { companyName, companyActivity, items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Nenhum item de risco fornecido." });
    }

    const systemInstruction = `Você é um consultor líder de Gestão de Riscos Ocupacionais (GRO/PGR) especialista na metodologia 5W2H e cronogramas de implantação de medidas preventivas psicossociais.
Para cada risco fornecido, você deve estruturar o plano de ação e cronograma contendo:
- id: O mesmo ID do risco recebido.
- actionObjective: Objetivo conciso do plano de ação.
- actionProposed: Ação preventiva/corretiva articulada no modelo 5W2H (o que será executado e como).
- responsible: Cargo ou setor responsável técnico (ex: "Coordenação de RH e Gestores de Setor", "SESMT e Medicina do Trabalho", "Diretoria e Liderança Imediata").
- priority: Prioridade ("Alta", "Média" ou "Baixa"), compatível com a gravidade do risco.
- periodicity: Periodicidade do monitoramento ("Mensal", "Bimestral", "Trimestral", "Semestral").
- deadline: Prazo realista no cronograma de 12 meses (escalonando ações: "Mês 1 (Imediato)", "Mês 2", "Mês 3", "Trimestre 2", "Semestre 2").
- efficacyIndicator: Indicador objetivo de eficácia e acompanhamento contínuo.`;

    const prompt = `Empresa: ${companyName || "Empresa"}
Ramo: ${companyActivity || "Geral"}

Riscos no inventário para elaboração do plano de ação e cronograma:
${JSON.stringify(
  items.map((i: any) => ({
    id: i.id,
    riskName: i.riskName,
    sectorName: i.sectorName,
    riskLevel: i.riskLevel,
    riskScore: i.riskScore,
    currentRecommendation: i.recommendation,
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

    const plannedActions = JSON.parse(response.text?.trim() || "[]");
    return res.json({ plannedActions });
  } catch (error: any) {
    console.error("Error in /api/ai/action-plan-schedule:", error);
    return res.status(500).json({ error: error.message || "Erro ao gerar cronograma de ações com IA." });
  }
});

// ---------------------------------------------------------------------------
// Server setup with Vite middleware (Dev) or Static files (Prod)
// ---------------------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV === "production") {
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(__dirname, "dist", "index.html"));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(port, "0.0.0.0", () => {
    console.log(`Server listening on port ${port}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
