/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Report, COPSOQ_DIMENSIONS, getDimensionRating } from "../types";
import { AlertCircle, Sliders, Activity } from "lucide-react";
import { SearchableSelect } from "./SearchableSelect";

interface CopsoqEvaluationProps {
  report: Report;
  onChange: (updatedReport: Partial<Report>) => void;
}

export const CopsoqEvaluation: React.FC<CopsoqEvaluationProps> = ({ report, onChange }) => {
  const [selectedSectorId, setSelectedSectorId] = useState<string>(
    report.sectors.length > 0 ? report.sectors[0].id : ""
  );

  const [inputStrings, setInputStrings] = useState<Record<string, string>>({});

  // Sync selected sector if the previous selected one was deleted
  const currentSector = report.sectors.find((s) => s.id === selectedSectorId) || report.sectors[0];

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

  if (report.sectors.length === 0) {
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

    const updatedSectors = report.sectors.map((s) => {
      if (s.id === currentSector.id) {
        return {
          ...s,
          scores: {
            ...s.scores,
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
    const updatedSectors = report.sectors.map((s) => {
      if (s.id === currentSector.id) {
        const newScores = { ...s.scores };
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

  const handleGeneralAnalysisChange = (value: string) => {
    if (!currentSector) return;
    const updatedSectors = report.sectors.map((s) => {
      if (s.id === currentSector.id) {
        return {
          ...s,
          generalAnalysis: value,
        };
      }
      return s;
    });

    onChange({ sectors: updatedSectors });
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
          <div className="pt-6 border-t border-slate-100 space-y-2 text-left">
            <h4 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
              <Activity className="w-4 h-4 text-slate-600" />
              Análise Geral do Setor (Com base na percepção dos colaboradores avaliados)
            </h4>
            <p className="text-xs text-slate-500">
              Descreva de forma ampla a percepção e sentimentos expressados pelos colaboradores nas avaliações qualitativas ou quantitativas deste setor.
            </p>
            <textarea
              value={currentSector.generalAnalysis || ""}
              onChange={(e) => handleGeneralAnalysisChange(e.target.value)}
              placeholder="Ex: Os colaboradores deste setor relatam alto nível de companheirismo e bom relacionamento horizontal, porém demonstram cansaço e frustração acentuados com os recorrentes picos de trabalho sem compensação e a falta de clareza nas metas de entrega."
              rows={4}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-400 focus:border-slate-400 outline-none text-sm text-slate-800 bg-white"
            />
          </div>
        </div>
      )}
    </div>
  );
};
