/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { Report, COPSOQ_DIMENSIONS, getDimensionRating } from "../types";
import { AlertCircle, Sliders, Activity, Sparkles, Loader2, Check, Wand2 } from "lucide-react";
import { SearchableSelect } from "./SearchableSelect";
import { generateSectorSynthesis } from "../aiService";

interface CopsoqEvaluationProps {
  report: Report;
  onChange: (updatedReport: Partial<Report>) => void;
}

export const CopsoqEvaluation: React.FC<CopsoqEvaluationProps> = ({ report, onChange }) => {
  const sectors = Array.isArray(report?.sectors) ? report.sectors : [];
  const sectorsRef = useRef(sectors);
  sectorsRef.current = sectors;

  const [selectedSectorId, setSelectedSectorId] = useState<string>(
    sectors.length > 0 ? sectors[0].id : ""
  );

  const [inputStrings, setInputStrings] = useState<Record<string, string>>({});
  const [isGeneratingSynthesis, setIsGeneratingSynthesis] = useState(false);
  const [synthesisError, setSynthesisError] = useState<string | null>(null);
  const [synthesisSuccess, setSynthesisSuccess] = useState(false);
  const [showCustomPrompt, setShowCustomPrompt] = useState(false);
  const [customPromptNotes, setCustomPromptNotes] = useState("");
  const successTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (successTimerRef.current !== null) {
        window.clearTimeout(successTimerRef.current);
      }
    };
  }, []);

  // Sync selected sector if the previous selected one was deleted
  const currentSector = sectors.find((s) => s.id === selectedSectorId) || sectors[0];

  useEffect(() => {
    if (currentSector && selectedSectorId !== currentSector.id) {
      setSelectedSectorId(currentSector.id);
    }
  }, [currentSector, selectedSectorId]);

  // Sync local input values whenever the active sector changes (preserve score 0!)
  useEffect(() => {
    if (currentSector) {
      const initialMap: Record<string, string> = {};
      COPSOQ_DIMENSIONS.forEach((dim) => {
        const val = currentSector.scores?.[dim.key];
        initialMap[dim.key] =
          typeof val === "number" && !Number.isNaN(val) ? String(val) : "";
      });
      setInputStrings(initialMap);
    }
  }, [currentSector?.id]);

  if (sectors.length === 0) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-100 text-center space-y-4">
        <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8" />
        </div>
        <div className="max-w-md mx-auto space-y-2">
          <h3 className="text-lg font-semibold text-slate-800">Nenhum Setor Cadastrado</h3>
          <p className="text-sm text-slate-500">
            Antes de preencher a avaliação COPSOQ II, você deve cadastrar pelo menos um setor na aba <strong>Cadastro Geral</strong>.
          </p>
        </div>
      </div>
    );
  }

  const handleScoreChange = (dimensionKey: string, value: number) => {
    if (!currentSector) return;
    const clampedValue = Math.min(4, Math.max(0, Math.round(value * 100) / 100));

    const updatedSectors = sectors.map((s) => {
      if (s.id === currentSector.id) {
        return {
          ...s,
          scores: {
            ...(s.scores || {}),
            [dimensionKey]: clampedValue,
          },
        };
      }
      return s;
    });

    onChange({ sectors: updatedSectors });
  };

  const handleClearScore = (dimensionKey: string) => {
    if (!currentSector) return;
    const updatedSectors = sectors.map((s) => {
      if (s.id === currentSector.id) {
        const newScores = { ...(s.scores || {}) };
        delete newScores[dimensionKey];
        return {
          ...s,
          scores: newScores,
        };
      }
      return s;
    });

    onChange({ sectors: updatedSectors });
  };

  const handleGeneralAnalysisChange = (value: string, targetSectorId?: string) => {
    const sectorIdToUpdate = targetSectorId || currentSector?.id;
    if (!sectorIdToUpdate) return;
    const latestSectors = Array.isArray(sectorsRef.current) ? sectorsRef.current : sectors;
    const updatedSectors = latestSectors.map((s) => {
      if (s.id === sectorIdToUpdate) {
        return {
          ...s,
          generalAnalysis: value,
        };
      }
      return s;
    });

    onChange({ sectors: updatedSectors });
  };

  const handleGenerateGeneralSynthesis = async (extraNotes?: string) => {
    if (!currentSector) return;
    const targetSectorId = currentSector.id;

    const ratedDimensions = COPSOQ_DIMENSIONS.map((dim) => {
      const val = currentSector.scores?.[dim.key];
      const hasScore = typeof val === "number" && !Number.isNaN(val);
      const { rating } = getDimensionRating(hasScore ? val : undefined, dim.type);
      const severityScore = hasScore ? (dim.type === "positive" ? 4 - val : val) : -1;
      return {
        key: dim.key,
        name: dim.name,
        score: hasScore ? val : -1,
        rating,
        type: dim.type,
        severityScore,
      };
    }).filter((d) => d.score >= 0 && d.rating !== "Não Avaliado");

    if (ratedDimensions.length === 0) {
      setSynthesisError("Preencha ao menos uma pontuação do COPSOQ II neste setor antes de gerar a síntese com IA.");
      return;
    }

    const sortedBySeverity = [...ratedDimensions].sort((a, b) => b.severityScore - a.severityScore);
    const criticalOnes = sortedBySeverity.filter((d) => d.rating !== "Favorável");

    setIsGeneratingSynthesis(true);
    setSynthesisError(null);
    setSynthesisSuccess(false);

    try {
      const text = await generateSectorSynthesis({
        sectorName: currentSector.name || "Setor Avaliado",
        employeeCount: Number(currentSector.employeeCount) || 1,
        companyName: report.companyName,
        companySector: report.companySector,
        methodology: "copsoq",
        mode: "copsoq_perception",
        allDimensions: sortedBySeverity.map(({ key, name, score, rating, type }) => ({
          key,
          name,
          score,
          rating,
          type,
        })),
        criticalDimensions: criticalOnes.map(({ key, name, score, rating, type }) => ({
          key,
          name,
          score,
          rating,
          type,
        })),
        userInstructions: typeof (extraNotes ?? customPromptNotes) === "string" ? (extraNotes ?? customPromptNotes) : "",
      });

      const safeText = typeof text === "string" ? text.trim() : "";
      if (!safeText) {
        setSynthesisError("A IA não retornou conteúdo para a síntese. Tente novamente.");
        return;
      }

      handleGeneralAnalysisChange(safeText, targetSectorId);
      setSynthesisSuccess(true);
      setShowCustomPrompt(false);
      if (successTimerRef.current !== null) {
        window.clearTimeout(successTimerRef.current);
      }
      successTimerRef.current = window.setTimeout(() => {
        successTimerRef.current = null;
        setSynthesisSuccess(false);
      }, 4000);
    } catch (err: any) {
      console.error("Erro ao gerar síntese COPSOQ com IA:", err);
      const errMessage =
        typeof err?.message === "string" && err.message.trim()
          ? err.message
          : typeof err === "string" && err.trim()
            ? err
            : "Falha ao gerar síntese com IA.";
      setSynthesisError(errMessage);
    } finally {
      setIsGeneratingSynthesis(false);
    }
  };

  const getStatusSummary = () => {
    const summary = { favoravel: 0, moderada: 0, desfavoravel: 0, naoAvaliado: 0 };
    if (!currentSector) return summary;

    COPSOQ_DIMENSIONS.forEach((dim) => {
      const score = currentSector.scores?.[dim.key];
      const { rating } = getDimensionRating(score, dim.type);
      if (rating === "Favorável") summary.favoravel++;
      else if (rating === "Moderada") summary.moderada++;
      else if (rating === "Desfavorável") summary.desfavoravel++;
      else summary.naoAvaliado++;
    });

    return summary;
  };

  const summary = getStatusSummary();

  return (
    <div className="space-y-6" id="copsoq-evaluation-container">
      {/* Seletor de Setor */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <label className="text-sm font-semibold text-slate-700 whitespace-nowrap">Setor sob Análise:</label>
          <SearchableSelect
            value={currentSector?.id || ""}
            onChange={(val) => setSelectedSectorId(val)}
            options={sectors.map((s) => ({
              value: s.id,
              label: s.name || "Setor sem nome",
              subLabel: `${s.employeeCount || 0} funcionários`
            }))}
            placeholder="Selecione o setor..."
            searchPlaceholder="Buscar setor..."
            className="w-full md:w-80"
            required
          />
        </div>
        <div className="text-xs text-slate-500">
          Método Ativo: <strong className="text-slate-800 uppercase tracking-wider">COPSOQ II-BR (0 a 4 pontos)</strong>
        </div>
      </div>

      {/* Resumo da Situação do Setor */}
      {currentSector && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-emerald-50 border border-emerald-200/70 p-4 rounded-xl flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">Dimensões Favoráveis</p>
              <h4 className="text-2xl font-extrabold text-emerald-900 mt-1 tabular-nums">{summary.favoravel}</h4>
              <p className="text-[11px] text-emerald-700 mt-0.5">Pos.: &gt; 2,66 · Neg.: ≤ 1,33</p>
            </div>
            <span className="text-[11px] bg-emerald-600 text-white px-2.5 py-1 rounded-md font-bold shrink-0">Baixo Risco</span>
          </div>

          <div className="bg-amber-50 border border-amber-200/70 p-4 rounded-xl flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-800">Dimensões Moderadas</p>
              <h4 className="text-2xl font-extrabold text-amber-950 mt-1 tabular-nums">{summary.moderada}</h4>
              <p className="text-[11px] text-amber-800 mt-0.5">Faixa intermediária: 1,34 – 2,66</p>
            </div>
            <span className="text-[11px] bg-amber-600 text-white px-2.5 py-1 rounded-md font-bold shrink-0">Atenção</span>
          </div>

          <div className="bg-rose-50 border border-rose-200/70 p-4 rounded-xl flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-rose-800">Dimensões Desfavoráveis</p>
              <h4 className="text-2xl font-extrabold text-rose-900 mt-1 tabular-nums">{summary.desfavoravel}</h4>
              <p className="text-[11px] text-rose-700 mt-0.5">Pos.: ≤ 1,33 · Neg.: &gt; 2,66</p>
            </div>
            <span className="text-[11px] bg-rose-600 text-white px-2.5 py-1 rounded-md font-bold shrink-0">Crítico</span>
          </div>
        </div>
      )}

      {/* Interface Principal: Digitação de Notas */}
      {currentSector && (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-slate-600" />
              Inserção de Pontuações de Percepção (Média do Setor)
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Insira a pontuação média obtida no COPSOQ II para cada uma das 10 dimensões listadas abaixo (escala de 0,00 a 4,00). Dimensões negativas possuem interpretação invertida automaticamente.
            </p>
          </div>

          <div className="space-y-4">
            {COPSOQ_DIMENSIONS.map((dim) => {
              const score = currentSector.scores?.[dim.key];
              const ratingObj = getDimensionRating(score, dim.type);
              const currentInputValue =
                inputStrings[dim.key] ??
                (typeof score === "number" && !Number.isNaN(score) ? String(score) : "");

              return (
                <div
                  key={dim.key}
                  className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center p-3.5 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/30 hover:bg-slate-50 transition"
                >
                  {/* Nome e Descrição */}
                  <div className="lg:col-span-6 space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="font-bold text-slate-800 text-sm">{dim.name}</h4>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        {dim.type === "positive" ? "Positivo" : "Negativo (Invertido)"}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed">{dim.description}</p>
                  </div>

                  {/* Campo de Digitação */}
                  <div className="lg:col-span-3 flex items-center gap-3">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={currentInputValue}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const raw = e.target.value;
                        setInputStrings((prev) => ({ ...prev, [dim.key]: raw }));

                        const trimmed = raw.trim();
                        if (trimmed === "") {
                          handleClearScore(dim.key);
                          return;
                        }

                        const normalized = trimmed.replace(",", ".");
                        const val = parseFloat(normalized);
                        if (!isNaN(val) && val >= 0 && val <= 4) {
                          handleScoreChange(dim.key, val);
                        }
                      }}
                      onBlur={() => {
                        const raw = inputStrings[dim.key] ?? "";
                        const trimmed = raw.trim();
                        if (trimmed === "") {
                          handleClearScore(dim.key);
                          setInputStrings((prev) => ({ ...prev, [dim.key]: "" }));
                        } else {
                          const normalized = trimmed.replace(",", ".");
                          const val = parseFloat(normalized);
                          if (!isNaN(val)) {
                            const clamped = Math.min(4, Math.max(0, Math.round(val * 100) / 100));
                            setInputStrings((prev) => ({ ...prev, [dim.key]: String(clamped) }));
                            handleScoreChange(dim.key, clamped);
                          } else {
                            handleClearScore(dim.key);
                            setInputStrings((prev) => ({ ...prev, [dim.key]: "" }));
                          }
                        }
                      }}
                      placeholder="N/A (0,00 a 4,00)"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-slate-400 focus:border-slate-400 outline-none text-sm font-semibold text-slate-800 bg-white placeholder:text-slate-400 placeholder:font-normal tabular-nums"
                    />
                    <span className="text-xs text-slate-400 font-bold shrink-0 tabular-nums">/ 4.00</span>
                  </div>

                  {/* Classificação e Badge */}
                  <div className="lg:col-span-3 flex lg:justify-end">
                    <span className={`inline-flex items-center justify-center text-xs font-bold px-3 py-1.5 rounded-lg border w-full lg:w-40 text-center ${ratingObj.bgClass}`}>
                      <span className={`w-2 h-2 rounded-full ${ratingObj.colorClass} mr-2`} />
                      {ratingObj.rating}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Análise Geral com Base na Percepção dos Colaboradores */}
          <div className="pt-6 border-t border-slate-100 space-y-3 text-left">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                  <Activity className="w-4 h-4 text-slate-600" />
                  Análise Geral do Setor (Percepção dos Trabalhadores)
                </h4>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowCustomPrompt((prev) => !prev)}
                  disabled={isGeneratingSynthesis}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer whitespace-nowrap"
                >
                  <span>{showCustomPrompt ? "Ocultar Instruções" : "Ajustar Comando"}</span>
                </button>

                {!showCustomPrompt && (
                  <button
                    key="generate-synthesis-direct"
                    type="button"
                    disabled={isGeneratingSynthesis}
                    onClick={() => handleGenerateGeneralSynthesis()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-xs transition-all cursor-pointer disabled:opacity-50 whitespace-nowrap"
                  >
                    {isGeneratingSynthesis ? (
                      <span key="loading" className="inline-flex items-center gap-1.5">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Gerando Síntese...</span>
                      </span>
                    ) : (
                      <span key="idle" className="inline-flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Gerar Síntese com IA</span>
                      </span>
                    )}
                  </button>
                )}
              </div>
            </div>

            {showCustomPrompt && (
              <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl space-y-2 text-xs">
                <label className="font-bold text-indigo-900 block">
                  Observações ou foco adicional para a IA (Opcional):
                </label>
                <textarea
                  value={customPromptNotes}
                  onChange={(e) => setCustomPromptNotes(e.target.value)}
                  placeholder="Ex: Enfatizar a percepção sobre sobrecarga nos turnos noturnos..."
                  rows={2}
                  className="w-full p-2 bg-white rounded-lg border border-indigo-200 outline-none text-slate-800 text-xs resize-y"
                />
                <div className="flex justify-end">
                  <button
                    key="generate-synthesis-custom"
                    type="button"
                    disabled={isGeneratingSynthesis}
                    onClick={() => handleGenerateGeneralSynthesis(customPromptNotes)}
                    className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg font-bold text-xs hover:bg-indigo-700 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isGeneratingSynthesis ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Wand2 className="w-3.5 h-3.5" />
                    )}
                    <span>{isGeneratingSynthesis ? "Gerando..." : "Gerar Síntese com IA"}</span>
                  </button>
                </div>
              </div>
            )}

            {synthesisSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Síntese gerada pela IA com base nos indicadores COPSOQ II deste setor!</span>
              </div>
            )}

            {synthesisError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center justify-between gap-2">
                <span>{String(synthesisError)}</span>
                <button type="button" onClick={() => setSynthesisError(null)} className="text-rose-500 hover:text-rose-700 font-bold cursor-pointer">✕</button>
              </div>
            )}

            <textarea
              value={typeof currentSector.generalAnalysis === "string" ? currentSector.generalAnalysis : ""}
              onChange={(e) => handleGeneralAnalysisChange(e.target.value)}
              placeholder="Descreva a percepção dos colaboradores neste setor ou clique em 'Gerar Síntese com IA' para elaborá-la a partir das notas do COPSOQ II."
              rows={5}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-400 focus:border-slate-400 outline-none text-sm text-slate-800 bg-white leading-relaxed resize-y"
            />
          </div>
        </div>
      )}
    </div>
  );
};
