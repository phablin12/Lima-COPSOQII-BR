/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { Report } from "../types";
import { AlertTriangle, MessageSquare, ClipboardCheck, Users, Sparkles, Loader2, Check, Wand2 } from "lucide-react";
import { SearchableSelect } from "./SearchableSelect";
import { generateSectorSynthesis } from "../aiService";

interface TechnicalAnalysisProps {
  report: Report;
  onChange: (updatedReport: Partial<Report>) => void;
}

export const TechnicalAnalysis: React.FC<TechnicalAnalysisProps> = ({ report, onChange }) => {
  const sectors = Array.isArray(report?.sectors) ? report.sectors : [];
  const sectorsRef = useRef(sectors);
  sectorsRef.current = sectors;

  const [selectedSectorId, setSelectedSectorId] = useState<string>(
    sectors.length > 0 ? sectors[0].id : ""
  );

  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSuccess, setAiSuccess] = useState(false);
  const [showPromptNotes, setShowPromptNotes] = useState(false);
  const [promptNotes, setPromptNotes] = useState("");
  const successTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (successTimerRef.current !== null) {
        window.clearTimeout(successTimerRef.current);
      }
    };
  }, []);

  const currentSector = sectors.find((s) => s.id === selectedSectorId) || sectors[0];

  useEffect(() => {
    if (currentSector && selectedSectorId !== currentSector.id) {
      setSelectedSectorId(currentSector.id);
    }
  }, [currentSector, selectedSectorId]);

  if (sectors.length === 0) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-100 text-center space-y-4">
        <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto">
          <AlertTriangle className="w-8 h-8 text-amber-500" />
        </div>
        <div className="max-w-md mx-auto space-y-2">
          <h3 className="text-lg font-semibold text-slate-800">Nenhum Setor Cadastrado</h3>
          <p className="text-sm text-slate-500">
            Cadastre os setores na aba <strong>Cadastro Geral</strong> antes de registrar a avaliação qualitativa.
          </p>
        </div>
      </div>
    );
  }

  const handleQualitativeFieldChange = (
    field: "qualitativeEvaluatedText" | "qualitativePerceptionText" | "qualitativeConclusionText",
    text: string,
    targetSectorId?: string
  ) => {
    const sectorIdToUpdate = targetSectorId || currentSector?.id;
    if (!sectorIdToUpdate) return;
    const latestSectors = Array.isArray(sectorsRef.current) ? sectorsRef.current : sectors;
    const updatedSectors = latestSectors.map((s) => {
      if (s.id === sectorIdToUpdate) {
        return {
          ...s,
          [field]: text,
        };
      }
      return s;
    });
    onChange({ sectors: updatedSectors });
  };

  const handleGenerateAISynthesis = async (customInstructions?: string) => {
    if (!currentSector) return;
    const targetSectorId = currentSector.id;
    setIsGeneratingAI(true);
    setAiError(null);
    setAiSuccess(false);

    try {
      const text = await generateSectorSynthesis({
        sectorName: currentSector.name || "Setor Avaliado",
        employeeCount: Number(currentSector.employeeCount) || 1,
        companyName: report.companyName,
        companySector: report.companySector,
        methodology: "qualitative",
        mode: "qualitative",
        qualitativeContext: {
          evaluatedText: currentSector.qualitativeEvaluatedText,
          perceptionText: currentSector.qualitativePerceptionText,
        },
        userInstructions: typeof (customInstructions ?? promptNotes) === "string" ? (customInstructions ?? promptNotes) : "",
      });

      const safeText = typeof text === "string" ? text.trim() : "";
      if (!safeText) {
        setAiError("A IA não retornou conteúdo para o parecer. Tente novamente.");
        return;
      }

      handleQualitativeFieldChange("qualitativeConclusionText", safeText, targetSectorId);
      setAiSuccess(true);
      setShowPromptNotes(false);
      if (successTimerRef.current !== null) {
        window.clearTimeout(successTimerRef.current);
      }
      successTimerRef.current = window.setTimeout(() => {
        successTimerRef.current = null;
        setAiSuccess(false);
      }, 4000);
    } catch (err: any) {
      console.error(err);
      const errMessage =
        typeof err?.message === "string" && err.message.trim()
          ? err.message
          : typeof err === "string" && err.trim()
            ? err
            : "Erro ao conectar com a Inteligência Artificial.";
      setAiError(errMessage);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  return (
    <div className="space-y-6" id="technical-analysis-container">
      {/* Seletor de Setor para Avaliação Qualitativa */}
      <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-md font-semibold text-slate-800 flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-600" />
            Investigação Qualitativa do Trabalho (MPE)
          </h3>
          <p className="text-xs text-slate-500">
            Selecione o setor para registrar o escopo observado, percepção dos colaboradores e parecer técnico.
          </p>
        </div>

        <SearchableSelect
          value={currentSector?.id || ""}
          onChange={(val) => setSelectedSectorId(val)}
          options={report.sectors.map((s) => ({
            value: s.id,
            label: s.name,
            subLabel: `${s.employeeCount} funcionários`
          }))}
          placeholder="Selecione o setor..."
          searchPlaceholder="Buscar setor..."
          className="w-full md:w-80"
          required
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Guia de Entrevista / Orientações */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs lg:col-span-4 space-y-5 h-fit text-left">
          <div className="border-b border-slate-100 pb-3 flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-indigo-600" />
            <h4 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider">
              Orientações de Avaliação
            </h4>
          </div>

          <div className="space-y-4 text-xs text-slate-600 leading-relaxed">
            <p>
              A <strong>Avaliação Qualitativa</strong> é indicada para Micro e Pequenas Empresas (MPE), nas quais o diagnóstico qualitativo estruturado substitui a amostragem estatística do COPSOQ II.
            </p>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-2">
              <p className="font-bold text-slate-800">Como proceder em campo:</p>
              <ul className="list-disc list-inside space-y-1 text-slate-600">
                <li>Observe a rotina real de trabalho no ambiente;</li>
                <li>Realize entrevistas coletivas ou individuais;</li>
                <li>Incentive relatos espontâneos e seguros;</li>
                <li>Trate as respostas de forma consolidada e confidencial.</li>
              </ul>
            </div>

            <div className="bg-amber-50 border border-amber-200/70 p-3.5 rounded-xl space-y-2 text-amber-900">
              <p className="font-bold">Confidencialidade (LGPD / Ética SST):</p>
              <p className="text-amber-800">
                Preserve a identidade individual dos colaboradores nas redações. Use expressões consolidadas como "a equipe relata" ou "observou-se no grupo".
              </p>
            </div>
          </div>
        </div>

        {/* Painel de Edição de Textos */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs lg:col-span-8 space-y-5 text-left">
          <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-slate-600" />
                Elaboração Qualitativa: <span className="text-indigo-600 font-black">{currentSector.name}</span>
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Descreva o cenário identificado durante as observações de campo e diálogos com o setor.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowPromptNotes((prev) => !prev)}
                disabled={isGeneratingAI}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer whitespace-nowrap"
                title="Adicionar instruções específicas para a IA"
              >
                <span>{showPromptNotes ? "Ocultar Instruções" : "Personalizar Prompt"}</span>
              </button>
              {!showPromptNotes && (
                <button
                  key="generate-parecer-direct"
                  type="button"
                  disabled={isGeneratingAI}
                  onClick={() => handleGenerateAISynthesis()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-xs transition-all cursor-pointer disabled:opacity-50 whitespace-nowrap"
                  title="Elaborar Parecer Técnico Conclusivo com Inteligência Artificial"
                >
                  {isGeneratingAI ? (
                    <span key="loading" className="inline-flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Gerando Parecer...</span>
                    </span>
                  ) : (
                    <span key="idle" className="inline-flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Gerar Parecer com IA</span>
                    </span>
                  )}
                </button>
              )}
            </div>
          </div>

          {showPromptNotes && (
            <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl space-y-2 text-xs">
              <label className="font-bold text-indigo-900 block">
                Instruções ou Observações Adicionais para a IA (Opcional):
              </label>
              <textarea
                value={promptNotes}
                onChange={(e) => setPromptNotes(e.target.value)}
                placeholder="Ex: Enfatizar a sobrecarga no atendimento ao balcão e sugerir rodízio de pausas..."
                rows={2}
                className="w-full p-2 bg-white rounded-lg border border-indigo-200 outline-none text-slate-800 text-xs resize-y"
              />
              <div className="flex justify-end">
                <button
                  key="generate-parecer-custom"
                  type="button"
                  disabled={isGeneratingAI}
                  onClick={() => handleGenerateAISynthesis(promptNotes)}
                  className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg font-bold text-xs hover:bg-indigo-700 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isGeneratingAI ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                  <span>{isGeneratingAI ? "Gerando Parecer..." : "Gerar Parecer com Estas Instruções"}</span>
                </button>
              </div>
            </div>
          )}

          {aiSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Parecer técnico qualitativo gerado com sucesso pela Inteligência Artificial!</span>
            </div>
          )}

          {aiError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center justify-between">
              <span>{String(aiError)}</span>
              <button type="button" onClick={() => setAiError(null)} className="text-rose-500 hover:text-rose-700 font-bold ml-2 cursor-pointer">✕</button>
            </div>
          )}

          <div className="space-y-5">
            {/* Campo 1: O que foi avaliado */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                1. O que foi Avaliado / Escopo da Observação
              </label>
              <textarea
                value={currentSector.qualitativeEvaluatedText || ""}
                onChange={(e) => handleQualitativeFieldChange("qualitativeEvaluatedText", e.target.value)}
                placeholder="Ex: Foram avaliadas as condições físicas e organizacionais do setor de atendimento, interações com a chefia, ritmo de trabalho e grau de autonomia na tomada de decisões."
                rows={4}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-400 focus:border-slate-400 outline-none transition text-xs text-slate-800 font-sans leading-relaxed bg-white resize-y"
              />
            </div>

            {/* Campo 2: Percepção do colaborador */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                2. Percepção dos Colaboradores (Diálogos e Entrevistas)
              </label>
              <textarea
                value={currentSector.qualitativePerceptionText || ""}
                onChange={(e) => handleQualitativeFieldChange("qualitativePerceptionText", e.target.value)}
                placeholder="Ex: Os colaboradores relataram bom relacionamento com colegas, porém apontaram ritmo elevado em horários de pico e necessidade de feedbacks mais estruturados."
                rows={4}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-400 focus:border-slate-400 outline-none transition text-xs text-slate-800 font-sans leading-relaxed bg-white resize-y"
              />
            </div>

            {/* Campo 3: Conclusão do setor */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                3. Conclusão Técnica e Parecer do Avaliador
              </label>
              <textarea
                value={currentSector.qualitativeConclusionText || ""}
                onChange={(e) => handleQualitativeFieldChange("qualitativeConclusionText", e.target.value)}
                placeholder="Ex: Conclui-se que o setor apresenta fatores psicossociais sob controle, recomendando-se rituais semanais de alinhamento e pausas programadas nos picos de demanda."
                rows={5}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-400 focus:border-slate-400 outline-none transition text-xs text-slate-800 font-sans leading-relaxed bg-white resize-y"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
