/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Report, COPSOQ_DIMENSIONS, getDimensionRating } from "../types";
import { AlertCircle, HelpCircle, Save, Sliders, Activity, BookOpen, ClipboardList, UserCheck, CheckCircle2 } from "lucide-react";
import { SearchableSelect } from "./SearchableSelect";

interface CopsoqEvaluationProps {
  report: Report;
  onChange: (updatedReport: Partial<Report>) => void;
}

export const CopsoqEvaluation: React.FC<CopsoqEvaluationProps> = ({ report, onChange }) => {
  const [selectedSectorId, setSelectedSectorId] = useState<string>(
    report.sectors.length > 0 ? report.sectors[0].id : ""
  );

  const isQualitative = report.methodology === "qualitative";

  // Sync selected sector if the previous selected one was deleted
  const currentSector = report.sectors.find((s) => s.id === selectedSectorId) || report.sectors[0];

  if (report.sectors.length === 0) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-100 text-center space-y-4">
        <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8" />
        </div>
        <div className="max-w-md mx-auto space-y-2">
          <h3 className="text-lg font-semibold text-slate-800">Nenhum Setor Cadastrado</h3>
          <p className="text-sm text-slate-500">
            Antes de preencher a avaliação {isQualitative ? "qualitativa" : "COPSOQ II"}, você deve cadastrar pelo menos um setor na aba <strong>Cadastro Geral</strong>.
          </p>
        </div>
      </div>
    );
  }

  // Ensure currentSector is active
  if (currentSector && selectedSectorId !== currentSector.id) {
    setSelectedSectorId(currentSector.id);
  }

  const handleScoreChange = (dimensionKey: string, value: number) => {
    // Clamp score between 0 and 4
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

  const handleQualitativeChange = (
    field: "qualitativeEvaluatedText" | "qualitativePerceptionText" | "qualitativeConclusionText" | "generalAnalysis",
    value: string
  ) => {
    if (!currentSector) return;

    const updatedSectors = report.sectors.map((s) => {
      if (s.id === currentSector.id) {
        return {
          ...s,
          [field]: value,
        };
      }
      return s;
    });

    onChange({ sectors: updatedSectors });
  };

  const getStatusSummary = () => {
    const summary = { favoravel: 0, moderada: 0, desfavoravel: 0 };
    if (!currentSector) return summary;

    COPSOQ_DIMENSIONS.forEach((dim) => {
      const score = currentSector.scores?.[dim.key] ?? 0;
      const { rating } = getDimensionRating(score, dim.type);
      if (rating === "Favorável") summary.favoravel++;
      else if (rating === "Moderada") summary.moderada++;
      else if (rating === "Desfavorável") summary.desfavoravel++;
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
            value={selectedSectorId}
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
        <div className="text-xs text-slate-400">
          Método Ativo: <strong className="text-slate-700 uppercase tracking-wider">{isQualitative ? "Avaliação Qualitativa" : "COPSOQ II-BR"}</strong>
        </div>
      </div>

      {/* Condicional de Metodologia */}
      {isQualitative ? (
        /* ======================== WORKSPACE METODOLOGIA QUALITATIVA ======================== */
        <div className="space-y-6">
          {/* Banner Informativo */}
          <div className="bg-amber-50 border border-amber-200/50 p-4 rounded-2xl flex gap-3.5 text-slate-700 text-xs">
            <ClipboardList className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">Escritório de Elaboração Qualitativa (NR-01)</h4>
              <p className="leading-relaxed">
                Nesta metodologia focada em micro e pequenas empresas, não inserimos notas matemáticas para as dimensões. 
                Utilize o ambiente de texto abaixo para registrar o escopo técnico do que foi observado, a percepção real dos colaboradores colhida nas entrevistas e a conclusão para o setor.
              </p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-6">
            {/* Bloco 1: O que foi Avaliado */}
            <div className="space-y-2 text-left">
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-slate-500" />
                1. O que foi Avaliado / Escopo da Observação
              </h4>
              <p className="text-[11px] text-slate-450 font-medium">
                Descreva quais elementos físicos, organizacionais ou de rotina foram analisados no ambiente deste setor.
              </p>
              <textarea
                value={currentSector.qualitativeEvaluatedText || ""}
                onChange={(e) => handleQualitativeChange("qualitativeEvaluatedText", e.target.value)}
                placeholder="Ex: Foram avaliados os postos de trabalho de atendimento presencial, as ferramentas de informática e software utilizadas, o fluxo de demandas diárias, o nível de ruído ambiental e a distribuição física de mesas do setor de expedição."
                rows={4}
                className="w-full px-4 py-3 rounded-xl border border-slate-250 focus:ring-2 focus:ring-slate-400 focus:border-slate-400 outline-none text-sm text-slate-800 bg-white"
              />
            </div>

            {/* Bloco 2: Percepção do Colaborador (Entrevista) */}
            <div className="space-y-2 text-left pt-4 border-t border-slate-100">
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-slate-500" />
                2. Percepção dos Colaboradores (Diálogo / Entrevistas)
              </h4>
              <p className="text-[11px] text-slate-455 font-medium">
                Adicione o que os funcionários relataram durante as conversas individuais e coletivas sobre o clima e estresse laboral.
              </p>
              <textarea
                value={currentSector.qualitativePerceptionText || ""}
                onChange={(e) => handleQualitativeChange("qualitativePerceptionText", e.target.value)}
                placeholder="Ex: Os colaboradores relatam sentimento de união e apoio mútuo muito forte na equipe. Porém, manifestam exaustão mental em relação aos picos de demandas no fim do mês e certa frustração por não entenderem claramente os critérios de promoção."
                rows={4}
                className="w-full px-4 py-3 rounded-xl border border-slate-250 focus:ring-2 focus:ring-slate-400 focus:border-slate-400 outline-none text-sm text-slate-800 bg-white"
              />
            </div>

            {/* Bloco 3: Conclusão do Setor */}
            <div className="space-y-2 text-left pt-4 border-t border-slate-100">
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-slate-500" />
                3. Conclusão Técnica e Recomendações do Setor
              </h4>
              <p className="text-[11px] text-slate-450 font-medium">
                Formalize o parecer final de SST para este setor, resumindo o nível de riscos psicossociais e medidas recomendadas.
              </p>
              <textarea
                value={currentSector.qualitativeConclusionText || ""}
                onChange={(e) => handleQualitativeChange("qualitativeConclusionText", e.target.value)}
                placeholder="Ex: Conclui-se que o setor apresenta riscos psicossociais controlados, com picos de tensão toleráveis. Recomenda-se implementar pausas regulares de 10 minutos a cada duas horas e estruturar conversas de alinhamento com a gestão."
                rows={4}
                className="w-full px-4 py-3 rounded-xl border border-slate-250 focus:ring-2 focus:ring-slate-400 focus:border-slate-400 outline-none text-sm text-slate-800 bg-white"
              />
            </div>
          </div>
        </div>
      ) : (
        /* ======================== WORKSPACE METODOLOGIA COPSOQ CLÁSSICA ======================== */
        <>
          {/* Resumo da Situação do Setor */}
          {currentSector && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">Dimensões Favoráveis</p>
                  <h4 className="text-2xl font-extrabold text-emerald-900 mt-1">{summary.favoravel}</h4>
                </div>
                <span className="text-xs bg-emerald-500 text-white px-2.5 py-1 rounded-full font-semibold">&gt; 3.66</span>
              </div>

              <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-amber-800">Dimensões Moderadas</p>
                  <h4 className="text-2xl font-extrabold text-amber-950 mt-1">{summary.moderada}</h4>
                </div>
                <span className="text-xs bg-amber-500 text-white px-2.5 py-1 rounded-full font-semibold">2.34 - 3.66</span>
              </div>

              <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-rose-800">Dimensões Desfavoráveis</p>
                  <h4 className="text-2xl font-extrabold text-rose-900 mt-1">{summary.desfavoravel}</h4>
                </div>
                <span className="text-xs bg-rose-500 text-white px-2.5 py-1 rounded-full font-semibold">0.00 - 2.33</span>
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
                  Insira a pontuação média obtida no COPSOQ II para cada uma das 10 dimensões listadas abaixo. Valores variam de 0,00 a 4,00.
                </p>
              </div>

              <div className="space-y-4">
                {COPSOQ_DIMENSIONS.map((dim) => {
                  const score = currentSector.scores?.[dim.key] ?? 0;
                  const ratingObj = getDimensionRating(score, dim.type);

                  return (
                    <div
                      key={dim.key}
                      className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center p-3.5 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/30 hover:bg-slate-50 transition"
                    >
                      {/* Nome e Descrição */}
                      <div className="lg:col-span-6 space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="font-bold text-slate-800 text-sm">{dim.name}</h4>
                          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                            {dim.type === "positive" ? "Positivo" : "Negativo"}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-medium leading-relaxed">{dim.description}</p>
                      </div>

                      {/* Campo de Digitação */}
                      <div className="lg:col-span-3 flex items-center gap-3">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="4"
                          required
                          value={score === 0 ? "" : score}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            handleScoreChange(dim.key, isNaN(val) ? 0 : val);
                          }}
                          placeholder="Pontuação (0.00 a 4.00)"
                          className="w-full px-3 py-2 rounded-lg border border-slate-250 focus:ring-2 focus:ring-slate-450 focus:border-slate-450 outline-none text-sm font-semibold text-slate-800 bg-white placeholder:text-slate-350"
                        />
                        <span className="text-xs text-slate-400 font-bold shrink-0">/ 4.00</span>
                      </div>

                      {/* Classificação e Badge */}
                      <div className="lg:col-span-3 flex lg:justify-end">
                        <span className={`inline-flex items-center justify-center text-xs font-bold px-4 py-1.5 rounded-full border w-full lg:w-40 text-center ${ratingObj.bgClass}`}>
                          <span className={`w-2 h-2 rounded-full ${ratingObj.colorClass} mr-2`} />
                          {ratingObj.rating}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Análise Geral com Base na Percepção dos Colaboradores */}
              <div className="pt-6 border-t border-slate-150 space-y-2 text-left">
                <h4 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                  <Activity className="w-4 h-4 text-slate-650" />
                  Análise Geral do Setor (Com base na percepção dos colaboradores avaliados)
                </h4>
                <p className="text-xs text-slate-500">
                  Descreva de forma ampla a percepção e sentimentos expressados pelos colaboradores nas avaliações qualitativas ou quantitativas deste setor.
                </p>
                <textarea
                  value={currentSector.generalAnalysis || ""}
                  onChange={(e) => handleQualitativeChange("generalAnalysis", e.target.value)}
                  placeholder="Ex: Os colaboradores deste setor relatam alto nível de companheirismo e bom relacionamento horizontal, porém demonstram cansaço e frustração acentuados com os recorrentes picos de trabalho sem compensação e a falta de clareza nas metas de entrega."
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl border border-slate-250 focus:ring-2 focus:ring-slate-400 focus:border-slate-400 outline-none text-sm text-slate-800 bg-white"
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
