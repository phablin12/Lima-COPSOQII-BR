/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { AiAgentConfig, Assessor } from "../types";
import { testAiAgent } from "../aiService";
import {
  Bot,
  Save,
  RotateCcw,
  Sparkles,
  Check,
  AlertCircle,
  Loader2,
  Send,
  Sliders,
  FileText,
  ClipboardList,
  ShieldAlert,
  MessageSquare,
} from "lucide-react";

interface AiAgentSettingsProps {
  assessor: Assessor;
  onUpdateAssessor: (newAssessor: Assessor) => Promise<void> | void;
}

const DEFAULT_AI_CONFIG: AiAgentConfig = {
  agentName: "Especialista SST & COPSOQ II",
  tone: "tecnico_formal",
  generalInstructions:
    "Redija em português do Brasil claro, impessoal e tecnicamente fundamentado na NR-01 (GRO/PGR), NR-17 e no instrumento COPSOQ II-BR. Respeite o sigilo e nunca cite nomes individuais de colaboradores; utilize termos consolidados ('a equipe relata', 'observou-se no setor'). Evite repetições e clichês genéricos.",
  copsoqInstructions:
    "Ao analisar as pontuações COPSOQ II (0 a 4), diferencie claramente dimensões positivas (protetivas, onde notas > 2,66 são favoráveis) de dimensões negativas (saturadoras, onde notas > 2,66 são desfavoráveis). Destaque forças da equipe antes de apontar fragilidades.",
  qualitativeInstructions:
    "Considere o porte de micro ou pequena empresa (MPE), conectando falas coletivas e rotina real observada a recomendações práticas de baixo custo e alto impacto.",
  inventoryInstructions:
    "Descreva fontes geradoras reais ligadas à organização do trabalho, metas, liderança, jornada e suporte social. Estime probabilidade e severidade de forma proporcional às evidências do setor.",
  actionPlanInstructions:
    "Estruture ações concretas no modelo 5W2H com responsáveis organizacionais claros, indicadores mensuráveis (KPIs) e prazos realistas ou 'A definir pela empresa' quando depender de deliberação diretiva.",
  referenceExamples: "",
};

export const AiAgentSettings: React.FC<AiAgentSettingsProps> = ({ assessor, onUpdateAssessor }) => {
  const [config, setConfig] = useState<AiAgentConfig>(() => ({
    ...DEFAULT_AI_CONFIG,
    ...(assessor.aiAgentConfig || {}),
  }));
  const [activeStageTab, setActiveStageTab] = useState<"copsoq" | "qualitative" | "inventory" | "action_plan">("copsoq");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Live sandbox state
  const [testPrompt, setTestPrompt] = useState(
    "Setor Logística (18 funcionários): Demandas no Trabalho 3.10 (Desfavorável), Ritmo acelerado e Burnout 2.85 (Desfavorável), Relações Interpessoais 2.95 (Favorável). Gere um breve parágrafo de percepção dos trabalhadores."
  );
  const [isTesting, setIsTesting] = useState(false);
  const [testReply, setTestReply] = useState("");
  const [testError, setTestError] = useState<string | null>(null);

  useEffect(() => {
    if (assessor.aiAgentConfig) {
      setConfig((prev) => ({
        ...DEFAULT_AI_CONFIG,
        ...prev,
        ...assessor.aiAgentConfig,
      }));
    }
  }, [assessor.aiAgentConfig]);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const updatedConfig: AiAgentConfig = {
        ...config,
        updatedAt: new Date().toISOString(),
      };
      await onUpdateAssessor({
        ...assessor,
        aiAgentConfig: updatedConfig,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = () => {
    setConfig({ ...DEFAULT_AI_CONFIG });
  };

  const handleRunTest = async () => {
    if (!testPrompt.trim()) return;
    setIsTesting(true);
    setTestError(null);
    try {
      const reply = await testAiAgent({
        prompt: testPrompt,
        stage: activeStageTab,
        agentConfig: config,
      });
      setTestReply(reply);
    } catch (err: any) {
      setTestError(err.message || "Falha ao executar teste do agente de IA.");
    } finally {
      setIsTesting(false);
    }
  };

  const stageFields: Record<
    "copsoq" | "qualitative" | "inventory" | "action_plan",
    {
      label: string;
      field: keyof AiAgentConfig;
      placeholder: string;
      icon: React.ReactNode;
      samplePrompt: string;
    }
  > = {
    copsoq: {
      label: "COPSOQ II & Devolutivas",
      field: "copsoqInstructions",
      icon: <Sliders className="w-3.5 h-3.5" />,
      placeholder: "Ex: Sempre relacione notas de Demandas e Burnout ao ritmo de picos sazonais e cite se há suporte da liderança...",
      samplePrompt:
        "Setor Logística (18 funcionários): Demandas no Trabalho 3.10 (Desfavorável), Burnout 2.85 (Desfavorável), Relações Interpessoais 2.95 (Favorável). Gere um breve parágrafo de percepção dos trabalhadores.",
    },
    qualitative: {
      label: "Avaliação Qualitativa",
      field: "qualitativeInstructions",
      icon: <MessageSquare className="w-3.5 h-3.5" />,
      placeholder: "Ex: Foque em ações viáveis para pequenas empresas, detalhando clima e pausas rápidas...",
      samplePrompt:
        "Empresa de varejo com 9 colaboradores: atendimento em balcão com picos de movimento e ausência de reuniões periódicas. Redija um parecer técnico sucinto.",
    },
    inventory: {
      label: "Inventário de Riscos",
      field: "inventoryInstructions",
      icon: <ShieldAlert className="w-3.5 h-3.5" />,
      placeholder: "Ex: Detalhe fontes geradoras associadas a metas e pausas; sugira controles alinhados à NR-01 e NR-17...",
      samplePrompt:
        "Sugira fontes geradoras e possíveis danos à saúde para o risco 'Sobrecarga Quantitativa de Trabalho' no setor Faturamento.",
    },
    action_plan: {
      label: "Plano de Ação 5W2H",
      field: "actionPlanInstructions",
      icon: <ClipboardList className="w-3.5 h-3.5" />,
      placeholder: "Ex: Priorize medidas organizacionais coletivas, defina indicadores objetivos e use prazos de 30, 60 e 90 dias...",
      samplePrompt:
        "Proponha 1 objetivo, 1 ação 5W2H e 1 indicador de eficácia para reduzir conflitos de papel no setor Administrativo.",
    },
  };

  return (
    <div className="space-y-6" id="ai-agent-settings">
      {/* Cabeçalho compacto */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Bot className="w-5 h-5 text-slate-700" />
            Agente de IA
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Diretrizes e padrões de redação aplicados automaticamente em todas as etapas com IA dos relatórios.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition cursor-pointer whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Restaurar Padrão
          </button>

          <button
            type="button"
            onClick={() => handleSave()}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-black text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {isSaving ? "Salvando..." : "Salvar Treinamento"}
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          Treinamento salvo e sincronizado. Todas as futuras gerações com IA seguirão estas instruções.
        </div>
      )}

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Coluna Esquerda: Identidade, Diretrizes Gerais e Regras por Etapa */}
        <div className="lg:col-span-7 space-y-5">
          {/* Card 1: Perfil e Diretrizes Gerais */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">Identificação do Agente</label>
                <input
                  type="text"
                  value={config.agentName || ""}
                  onChange={(e) => setConfig({ ...config, agentName: e.target.value })}
                  placeholder="Ex: Especialista SST Lima Engenharia"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800 bg-white focus:ring-2 focus:ring-slate-400 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">Tom e Estilo de Escrita</label>
                <select
                  value={config.tone || "tecnico_formal"}
                  onChange={(e) => setConfig({ ...config, tone: e.target.value as AiAgentConfig["tone"] })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800 bg-white focus:ring-2 focus:ring-slate-400 outline-none"
                >
                  <option value="tecnico_formal">Técnico e Formal (NR-01 / Pericial)</option>
                  <option value="consultivo_humanizado">Consultivo e Humanizado</option>
                  <option value="objetivo_executivo">Objetivo e Executivo</option>
                  <option value="didatico_acessivel">Técnico Didático e Acessível</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 block">
                Diretrizes Gerais de Trabalho
              </label>
              <textarea
                value={config.generalInstructions || ""}
                onChange={(e) => setConfig({ ...config, generalInstructions: e.target.value })}
                rows={4}
                placeholder="Descreva regras que o agente sempre deve obedecer: normas citadas, tamanho dos textos, termos que você usa ou evita, padrões éticos/LGPD..."
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-xs text-slate-800 bg-white leading-relaxed focus:ring-2 focus:ring-slate-400 outline-none resize-y"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 block flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                Exemplos de Referência / Modelo de Redação (Opcional)
              </label>
              <textarea
                value={config.referenceExamples || ""}
                onChange={(e) => setConfig({ ...config, referenceExamples: e.target.value })}
                rows={3}
                placeholder="Cole um trecho de texto exemplar do seu estilo de laudo para a IA aprender a estrutura e o vocabulário preferidos."
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-xs text-slate-800 bg-white leading-relaxed focus:ring-2 focus:ring-slate-400 outline-none resize-y"
              />
            </div>
          </div>

          {/* Card 2: Instruções por Etapa do Laudo */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
            <div className="flex flex-wrap gap-1.5 border-b border-slate-100 pb-3">
              {(Object.keys(stageFields) as Array<keyof typeof stageFields>).map((stageKey) => {
                const item = stageFields[stageKey];
                const isActive = activeStageTab === stageKey;
                return (
                  <button
                    key={stageKey}
                    type="button"
                    onClick={() => setActiveStageTab(stageKey)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
                      isActive
                        ? "bg-slate-900 text-white"
                        : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
                    }`}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                );
              })}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                Instruções Específicas — {stageFields[activeStageTab].label}
              </label>
              <textarea
                value={(config[stageFields[activeStageTab].field] as string) || ""}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    [stageFields[activeStageTab].field]: e.target.value,
                  })
                }
                rows={4}
                placeholder={stageFields[activeStageTab].placeholder}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-xs text-slate-800 bg-white leading-relaxed focus:ring-2 focus:ring-slate-400 outline-none resize-y"
              />
            </div>
          </div>
        </div>

        {/* Coluna Direita: Simulador ao Vivo */}
        <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-slate-200 space-y-4 lg:sticky lg:top-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              Testar Resposta do Agente
            </h3>
            <button
              type="button"
              onClick={() => setTestPrompt(stageFields[activeStageTab].samplePrompt)}
              className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer whitespace-nowrap"
            >
              Carregar exemplo da etapa
            </button>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 block">
              Cenário de Teste ({stageFields[activeStageTab].label})
            </label>
            <textarea
              value={testPrompt}
              onChange={(e) => setTestPrompt(e.target.value)}
              rows={4}
              placeholder="Digite um cenário simulado para validar como o agente responde com seu treinamento..."
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-xs text-slate-800 bg-white leading-relaxed focus:ring-2 focus:ring-slate-400 outline-none resize-y"
            />
          </div>

          <button
            type="button"
            disabled={isTesting || !testPrompt.trim()}
            onClick={handleRunTest}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition cursor-pointer disabled:opacity-50"
          >
            {isTesting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Consultando Agente...
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                Executar Teste com IA
              </>
            )}
          </button>

          {testError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{testError}</span>
            </div>
          )}

          {testReply && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Resposta Gerada
              </span>
              <div className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto">
                {testReply}
              </div>
            </div>
          )}
        </div>
      </form>
    </div>
  );
};
