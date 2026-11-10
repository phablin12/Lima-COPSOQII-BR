/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Report, COPSOQ_DIMENSIONS, getDimensionRating } from "../types";
import { UnifiedChapter } from "../chapterHierarchy";
import { Target, Shield, User, Clock, Calendar, CheckSquare } from "lucide-react";
import { getMatrixCell, PROBABILITY_LEVELS, SEVERITY_LEVELS } from "../matrixUtils";

interface ReportPhasesProps {
  ch: UnifiedChapter;
  report: Report;
  isQualitative: boolean;
  hasRecognizedRisks: boolean;
  renderHeader: (title: string) => React.ReactNode;
}

const getPriorityColorPrint = (priority: string) => {
  switch (priority) {
    case "Alta": return "bg-rose-100 text-rose-800 border-rose-300 print:bg-red-100 print:text-red-900";
    case "Média": return "bg-amber-100 text-amber-800 border-amber-300 print:bg-yellow-100 print:text-yellow-900";
    case "Baixa": return "bg-blue-100 text-blue-800 border-blue-300 print:bg-blue-50 print:text-blue-900";
    default: return "bg-slate-100 text-slate-800";
  }
};

const getStatusColorPrint = (status: string) => {
  switch (status) {
    case "Concluído": return "bg-emerald-100 text-emerald-800 border-emerald-300 print:bg-emerald-50 print:text-emerald-900";
    case "Em Andamento": return "bg-orange-100 text-orange-800 border-orange-300 print:bg-orange-50 print:text-orange-900";
    case "Pendente": return "bg-slate-100 text-slate-700 border-slate-300 print:bg-slate-50 print:text-slate-800";
    default: return "bg-slate-100 text-slate-800";
  }
};

export const ReportPhases: React.FC<ReportPhasesProps> = ({
  ch,
  report,
  isQualitative,
  hasRecognizedRisks,
  renderHeader,
}) => {
  const phasesStart = parseInt(ch.number.split("–")[0], 10) || 4;
  const inventoryChapterNum = isQualitative ? phasesStart : phasesStart + 2;
  const actionPlanChapterNum = isQualitative ? phasesStart + 1 : phasesStart + 3;

  return (
    <React.Fragment key={ch.id}>
      {!isQualitative && (
        <>
          {/* --- FASE 1: APRESENTAÇÃO DOS RESULTADOS (COPSOQ) --- */}
          <div
            data-print-section="true"
            data-print-page-target="fases-resultados"
            className="space-y-6 print:pt-12 page-break-before"
          >
            {renderHeader(`${phasesStart}. Resultados Tabulados`)}
            <h3 className="text-lg font-extrabold text-slate-900 border-b-2 border-slate-800 pb-2 uppercase tracking-wide">
              {phasesStart}. Apresentação dos Resultados
            </h3>

            <p className="text-sm text-slate-700">
              Abaixo estão detalhados os resultados numéricos médios tabulados por setor avaliado. Para cada setor, apresenta-se a pontuação obtida na escala COPSOQ II de 0,00 a 4,00 pontos.
            </p>

            {report.sectors.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Nenhum dado setorial cadastrado no relatório.</p>
            ) : (
              <div className="space-y-8">
                {report.sectors.map((sector) => (
                  <div
                    key={sector.id}
                    data-print-subpage-target={`sector-result-${sector.id}`}
                    className="p-5 border border-slate-200 rounded-xl space-y-4 print:p-0 print:border-none"
                  >
                    <div className="bg-slate-100 p-3 rounded-lg flex flex-wrap items-center justify-between print:bg-white print:border-b print:rounded-none px-0 pb-2 gap-2">
                      <span className="font-extrabold text-sm text-slate-900 uppercase">Setor: {sector.name}</span>
                      <div className="flex gap-4 text-xs font-semibold text-slate-600">
                        <span>Expostos: {sector.employeeCount} func.</span>
                      </div>
                    </div>

                    <table className="w-full border-collapse border border-slate-200 text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                          <th className="p-2 border border-slate-200 text-left">Dimensão do COPSOQ II</th>
                          <th className="p-2 border border-slate-200 text-center w-24">Tipo</th>
                          <th className="p-2 border border-slate-200 text-center w-28">Pontuação</th>
                          <th className="p-2 border border-slate-200 text-center w-36">Classificação Técnica</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {COPSOQ_DIMENSIONS.map((dim) => {
                          const score = sector.scores?.[dim.key] ?? 0;
                          const ratingInfo = getDimensionRating(score, dim.type);

                          return (
                            <tr key={dim.key} className="hover:bg-slate-50/50 print:hover:bg-transparent">
                              <td className="p-2 border border-slate-200 font-medium">{dim.name}</td>
                              <td className="p-2 border border-slate-200 text-center uppercase text-[9px] font-bold text-slate-400">
                                {dim.type === "positive" ? "Positiva" : "Negativa"}
                              </td>
                              <td className="p-2 border border-slate-200 text-center font-bold text-slate-800 font-mono">
                                {score === 0 ? "N/A" : score.toFixed(2)}
                              </td>
                              <td className={`p-2 border border-slate-200 text-center font-bold text-[10px] uppercase ${ratingInfo.bgClass}`}>
                                {ratingInfo.rating}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    {sector.generalAnalysis && (
                      <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs text-justify leading-relaxed print:bg-white print:border-l-4 print:border-slate-400 print:rounded-none">
                        <strong className="text-slate-800 uppercase text-[9px] tracking-wider block mb-1">Análise Geral da Percepção dos Colaboradores:</strong>
                        <span className="text-slate-700 italic">{sector.generalAnalysis}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* --- FASE 2: ANÁLISE TÉCNICA DOS RISCOS E DEVOLUTIVAS --- */}
          <div
            data-print-section="true"
            data-print-page-target="fases-devolutivas"
            className="space-y-6 print:pt-12 page-break-before"
          >
            {renderHeader(`${phasesStart + 1}. Análise de Campo e Devolutivas`)}
            <h3 className="text-lg font-extrabold text-slate-900 border-b-2 border-slate-800 pb-2 uppercase tracking-wide">
              {phasesStart + 1}. Análise Técnica dos Riscos e Devolutivas
            </h3>
            <p className="text-sm text-slate-700">
              Abaixo estão registradas as conclusões qualitativas das sessões de devolutiva mantidas com a liderança de cada setor. O escopo foca especificamente no cruzamento dos riscos percebidos desfavoráveis/moderados com o ambiente real de trabalho.
            </p>

            {report.sectors.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Nenhum dado cadastrado.</p>
            ) : (
              <div className="space-y-6">
                {report.sectors.map((sector) => {
                  const critical = COPSOQ_DIMENSIONS.map((d) => {
                    const score = sector.scores?.[d.key] ?? 0.0;
                    const rat = getDimensionRating(score, d.type);
                    return { name: d.name, score, rating: rat.rating };
                  }).filter((d) => d.rating !== "Favorável" && d.rating !== "Não Avaliado" && d.score > 0);

                  return (
                    <div
                      key={sector.id}
                      data-print-subpage-target={`sector-devolutiva-${sector.id}`}
                      className="p-5 border border-slate-200 rounded-xl space-y-3 print:p-0 print:border-none print:pb-6"
                    >
                      <h4 className="font-extrabold text-sm text-slate-900 border-b border-slate-100 pb-1.5 uppercase">
                        Diagnóstico de Campo: {sector.name}
                      </h4>

                      <div className="flex flex-wrap gap-2 text-[10px] items-center">
                        <strong className="text-slate-500 uppercase tracking-wider">Fatores Investigados:</strong>
                        {critical.length === 0 ? (
                          <span className="text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                            Nenhum desvio detectado
                          </span>
                        ) : (
                          critical.map((c, i) => (
                            <span key={i} className={`px-2 py-0.5 rounded border font-semibold ${
                              c.rating === "Desfavorável" ? "bg-rose-50 text-rose-800 border-rose-200" : "bg-amber-50 text-amber-800 border-amber-200"
                            }`}>
                              {c.name} ({c.score.toFixed(2)})
                            </span>
                          ))
                        )}
                      </div>

                      <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 text-xs text-justify leading-relaxed text-slate-700 whitespace-pre-wrap print:bg-white print:border-l-4 print:border-slate-400 print:rounded-none">
                        {sector.devolvedSynthesis ? (
                          sector.devolvedSynthesis
                        ) : (
                          <span className="text-slate-400 italic">
                            Ainda não foi preenchido o relatório técnico de devolutiva para este setor.
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* --- INVENTÁRIO E PLANO DE AÇÃO --- */}
      {hasRecognizedRisks ? (
        <>
          {/* --- INVENTÁRIO DOS RISCOS --- */}
          <div
            data-print-section="true"
            data-print-page-target="fases-inventario"
            className="space-y-4 print:pt-12 page-break-before"
          >
            {renderHeader(`${inventoryChapterNum}. Inventário de Riscos GRO`)}
            <h3 className="text-lg font-extrabold text-slate-900 border-b-2 border-slate-800 pb-2 uppercase tracking-wide">
              {inventoryChapterNum}. Inventário de Riscos Psicossociais
            </h3>
            <p className="text-sm text-slate-700">
              Abaixo estão estruturados de forma sistemática os riscos psicossociais evidenciados em campo, incluindo as fontes geradoras, as populações expostas, as medidas preventivas existentes e a respectiva avaliação de severidade e probabilidade através da matriz 5x5.
            </p>

            {report.riskInventory.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-6 text-center border border-dashed rounded-lg">
                Nenhum risco registrado no inventário.
              </p>
            ) : (
              <div className="space-y-8">
                {report.sectors.filter((s) => s.risksRecognized !== false).map((sector) => {
                  const sectorRisks = report.riskInventory.filter(r => r.sectorId === sector.id);
                  if (sectorRisks.length === 0) return null;

                  return (
                    <div
                      key={sector.id}
                      data-print-subpage-target={`sector-inventory-${sector.id}`}
                      className="space-y-4"
                    >
                      <div className="bg-slate-900 text-white px-4 py-2.5 rounded-xl border border-slate-850 flex items-center justify-between gap-4 print:bg-slate-900 print:text-white print-avoid-break-after">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                          <h4 className="text-[10px] font-black uppercase tracking-wider">
                            Setor / GES: {sector.name}
                          </h4>
                        </div>
                        <div className="text-[9px] font-bold text-slate-300 uppercase">
                          {sector.employeeCount || 0} colaboradores expostos
                        </div>
                      </div>

                      <div className="space-y-4">
                        {sectorRisks.map((item) => {
                          return (
                            <div key={item.id} className="border border-slate-300 rounded-xl overflow-hidden shadow-xs bg-white text-slate-800 text-xs print:break-inside-avoid print:border-slate-350">
                              {/* Header */}
                              <div className="bg-slate-100 border-b border-slate-300 px-4 py-2 flex flex-row justify-between items-center gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="w-2.5 h-2.5 rounded bg-slate-400 inline-block"></span>
                                  <h5 className="font-extrabold uppercase tracking-wide text-slate-700 text-xs">
                                    INVENTÁRIO DE RISCOS PSICOSSOCIAIS - {sector.name.toUpperCase()}
                                  </h5>
                                </div>
                              </div>

                              {/* Row 1: Bullet and Risk Name */}
                              <div className="border-b border-slate-300 px-4 py-2 bg-slate-50/50 flex items-center gap-2 font-bold text-sm text-slate-900">
                                <span className="w-2 h-2 bg-slate-700 rounded-xs"></span>
                                <span>{item.riskName}</span>
                              </div>

                              {/* Row 2: Exposição */}
                              <div className="border-b border-slate-300 px-4 py-2 grid grid-cols-2 gap-2 text-left">
                                <div>
                                  <span className="font-extrabold text-slate-500 block text-[10px] uppercase tracking-wider">Trabalhadores Expostos (GES)</span>
                                  <span className="text-slate-800 font-semibold">{sector.employeeCount || item.exposedCount || 1} funcionários</span>
                                </div>
                                <div>
                                  <span className="font-extrabold text-slate-500 block text-[10px] uppercase tracking-wider">Frequência de Exposição</span>
                                  <span className="text-slate-800 font-semibold">Contínua / Habitual</span>
                                </div>
                              </div>

                              {/* Row 3: Perigos, fontes e circunstâncias */}
                              <div className="border-b border-slate-300 px-4 py-2 text-left">
                                <span className="font-extrabold text-slate-500 block text-[10px] uppercase tracking-wider">Perigos, Fontes e Circunstâncias:</span>
                                <span className="text-slate-700 font-medium leading-relaxed block mt-0.5 whitespace-pre-line">{item.sourcesField || "Não registrado."}</span>
                              </div>

                              {/* Row 4: Metodologia */}
                              <div className="border-b border-slate-300 px-4 py-2 text-left">
                                <span className="font-extrabold text-slate-500 block text-[10px] uppercase tracking-wider">Metodologia:</span>
                                <span className="text-slate-700 font-medium block mt-0.5">Critério Qualitativo baseado na metodologia do COPSOQ e Matriz de Riscos Psicossociais 5x5.</span>
                              </div>

                              {/* Row 5: Medidas administrativas ou de organização do trabalho */}
                              <div className="border-b border-slate-300 px-4 py-2 text-left">
                                <span className="font-extrabold text-slate-500 block text-[10px] uppercase tracking-wider">Medidas administrativas ou de organização do trabalho (Controles Existentes):</span>
                                <span className="text-slate-700 font-medium leading-relaxed block mt-0.5 whitespace-pre-line">{item.existingControls || "Não evidenciado."}</span>
                              </div>

                              {/* Row 6: Descrição do Agente Nocivo */}
                              <div className="border-b border-slate-300 px-4 py-2 text-left">
                                <span className="font-extrabold text-slate-500 block text-[10px] uppercase tracking-wider">Descrição do Agente Nocivo / Fator de Risco:</span>
                                <span className="text-slate-700 font-medium block mt-0.5">{item.riskName} (Risco Psicossocial Organizacional)</span>
                              </div>

                              {/* Row 7: Possíveis danos à saúde */}
                              <div className="border-b border-slate-300 px-4 py-2 text-left">
                                <span className="font-extrabold text-slate-500 block text-[10px] uppercase tracking-wider">Possíveis danos à saúde:</span>
                                <span className="text-slate-700 font-medium leading-relaxed block mt-0.5 whitespace-pre-line">{item.possibleInjuries || "Não registrado."}</span>
                              </div>

                              {/* Row 8: Histórico de doenças / Queixas de adoecimento */}
                              {item.diseaseHistory && (
                                <div className="border-b border-slate-300 px-4 py-2 text-left">
                                  <span className="font-extrabold text-slate-500 block text-[10px] uppercase tracking-wider">Histórico de doenças / Queixas de adoecimento:</span>
                                  <span className="text-slate-700 font-medium leading-relaxed block mt-0.5 whitespace-pre-line">{item.diseaseHistory}</span>
                                </div>
                              )}

                              {/* Row 9: Probabilidade, Severidade, Nível do Risco */}
                              <div className="border-b border-slate-300 grid grid-cols-3">
                                <div className="px-4 py-2 border-r border-slate-300 flex flex-col justify-center bg-slate-50/50 text-left">
                                  <span className="font-extrabold text-slate-500 text-[10px] uppercase tracking-wider block">Probabilidade</span>
                                  <span className="text-xs font-black text-slate-800">
                                    {PROBABILITY_LEVELS[item.probability - 1]?.label || item.probability}
                                  </span>
                                </div>
                                <div className="px-4 py-2 border-r border-slate-300 flex flex-col justify-center bg-slate-50/50 text-left">
                                  <span className="font-extrabold text-slate-500 text-[10px] uppercase tracking-wider block">Severidade</span>
                                  <span className="text-xs font-black text-slate-800">
                                    {SEVERITY_LEVELS[item.severity - 1]?.label || item.severity}
                                  </span>
                                </div>
                                <div className={`px-4 py-2 flex flex-col justify-center text-white text-left ${
                                  item.color === "red"
                                    ? "bg-rose-600 print:bg-rose-600"
                                    : item.color === "orange"
                                    ? "bg-amber-500 print:bg-amber-500"
                                    : item.color === "yellow"
                                    ? "bg-yellow-500 text-slate-900 print:bg-yellow-500 print:text-slate-900"
                                    : item.color === "blue"
                                    ? "bg-blue-500 print:bg-blue-500"
                                    : "bg-emerald-600 print:bg-emerald-600"
                                }`}>
                                  <span className="font-extrabold text-[10px] uppercase tracking-wider block opacity-90">Nível do Risco / Perigo</span>
                                  <span className="text-xs font-black uppercase">
                                    Nível {item.riskLevel} (Score {item.riskScore})
                                  </span>
                                </div>
                              </div>

                              {/* Row 10: Estimativa and 5x5 Matrix Grid */}
                              <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 text-left">
                                <div className="px-4 py-3 border-r border-slate-300 space-y-2 flex flex-col justify-between">
                                  <div>
                                    <span className="font-extrabold text-slate-500 block text-[10px] uppercase tracking-wider">Estimativa:</span>
                                    <span className="text-slate-850 font-bold text-xs">{item.uncertainty || "Certa"}</span>
                                  </div>
                                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs space-y-1 mt-2">
                                    <span className="font-extrabold text-slate-600 block uppercase text-[9px] tracking-wider">Medida Preventiva Recomendada (PGR):</span>
                                    <p className="text-slate-700 leading-relaxed font-semibold italic">"{item.recommendation}"</p>
                                  </div>
                                </div>
                                <div className="p-3 bg-slate-50/50 flex flex-col items-center justify-center border-t md:border-t-0 print:border-t-0 border-slate-300 print:bg-white">
                                  <span className="font-extrabold text-slate-500 block text-[8px] uppercase tracking-wider mb-1.5">Matriz de Avaliação 5x5</span>
                                  <div className="grid grid-cols-6 gap-0.5 max-w-[200px] w-full text-[7px] font-bold text-center">
                                    <div className="text-[5px] text-slate-400 flex items-center justify-center font-bold">S \ P</div>
                                    {[1, 2, 3, 4, 5].map(p => (
                                      <div key={p} className="text-slate-400 flex items-center justify-center font-bold">P{p}</div>
                                    ))}

                                    {[5, 4, 3, 2, 1].map((s) => (
                                      <React.Fragment key={s}>
                                        <div className="text-slate-400 flex items-center justify-center font-bold">S{s}</div>
                                        {[1, 2, 3, 4, 5].map((p) => {
                                          const cell = getMatrixCell(p, s);
                                          const isActive = item.probability === p && item.severity === s;
                                          
                                          let cellBg = "bg-slate-200 text-slate-500";
                                          if (isActive) {
                                            cellBg = cell.color === "red"
                                              ? "bg-rose-500 text-white"
                                              : cell.color === "orange"
                                              ? "bg-amber-500 text-white"
                                              : cell.color === "yellow"
                                              ? "bg-yellow-400 text-slate-900"
                                              : cell.color === "blue"
                                              ? "bg-blue-400 text-white"
                                              : "bg-emerald-500 text-white";
                                          } else {
                                            cellBg = cell.color === "red"
                                              ? "bg-rose-50/50 text-rose-300"
                                              : cell.color === "orange"
                                              ? "bg-amber-50/50 text-amber-300"
                                              : cell.color === "yellow"
                                              ? "bg-yellow-50/50 text-yellow-500/70"
                                              : cell.color === "blue"
                                              ? "bg-blue-50/50 text-blue-300"
                                              : "bg-emerald-50/50 text-emerald-300";
                                          }

                                          return (
                                            <div
                                              key={p}
                                              className={`h-4.5 flex items-center justify-center rounded-xs border border-white/20 font-black font-mono ${cellBg}`}
                                            >
                                              {p * s}
                                            </div>
                                          );
                                        })}
                                      </React.Fragment>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* Fallback para riscos sem setor mapeado */}
                {report.riskInventory.filter(item => !report.sectors.some(s => s.id === item.sectorId)).length > 0 && (
                  <div className="space-y-4">
                    <div className="bg-slate-900 text-white px-4 py-2.5 rounded-xl border border-slate-850 flex items-center justify-between gap-4 print-avoid-break-after">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                        <h4 className="text-[10px] font-black uppercase tracking-wider">
                          Setor não identificado
                        </h4>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {report.riskInventory
                        .filter(item => !report.sectors.some(s => s.id === item.sectorId))
                        .map((item) => (
                          <div key={item.id} className="border border-slate-300 rounded-xl overflow-hidden shadow-xs bg-white text-slate-800 text-xs print:break-inside-avoid print:border-slate-350">
                            <div className="bg-slate-100 border-b border-slate-300 px-4 py-2 flex flex-row justify-between items-center gap-2">
                              <h5 className="font-extrabold uppercase tracking-wide text-slate-700 text-xs">
                                INVENTÁRIO DE RISCOS PSICOSSOCIAIS - SETOR NÃO IDENTIFICADO
                              </h5>
                            </div>
                            <div className="border-b border-slate-300 px-4 py-2 bg-slate-50/50 flex items-center gap-2 font-bold text-sm text-slate-900">
                              <span>{item.riskName}</span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* --- FASE 4: CRONOGRAMA E PLANO DE AÇÃO --- */}
          <div
            data-print-section="true"
            data-print-page-target="fases-cronograma"
            className="space-y-4 print:pt-12 page-break-before"
          >
            {renderHeader(`${actionPlanChapterNum}. Cronograma e Plano de Ação`)}
            <h3 className="text-lg font-extrabold text-slate-900 border-b-2 border-slate-800 pb-2 uppercase tracking-wide">
              {actionPlanChapterNum}. Cronograma e Plano de Ação
            </h3>
            <p className="text-sm text-slate-700">
              Com base no inventário técnico de riscos psicossociais, estabeleceram-se as seguintes ações integradas com objetivo, responsáveis, prioridade, prazos e indicadores de eficácia, conforme as diretrizes do PGR.
            </p>

            {report.riskInventory.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-6 text-center border border-dashed rounded-lg">
                Nenhum plano de ação registrado.
              </p>
            ) : (
              <div className="space-y-8">
                {report.sectors.filter((s) => s.risksRecognized !== false).map((sector) => {
                  const sectorRisks = report.riskInventory.filter(r => r.sectorId === sector.id);
                  if (sectorRisks.length === 0) return null;

                  return (
                    <div
                      key={sector.id}
                      data-print-subpage-target={`sector-action-${sector.id}`}
                      className="space-y-4"
                    >
                      <div className="bg-slate-900 text-white px-4 py-2.5 rounded-xl border border-slate-850 flex items-center justify-between gap-4 print:bg-slate-900 print:text-white print-avoid-break-after">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                          <h4 className="text-[10px] font-black uppercase tracking-wider">
                            Plano de Ação • Setor: {sector.name}
                          </h4>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {sectorRisks.map((item) => {
                          return (
                            <div key={item.id} className="border border-slate-300 rounded-2xl overflow-hidden shadow-xs print:shadow-none bg-white text-slate-800 text-xs print:break-inside-avoid print:border-slate-350">
                              {/* Header do Card */}
                              <div className="bg-slate-50/50 px-6 py-4 border-b border-slate-300 flex flex-row items-center justify-between gap-3">
                                <div className="space-y-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-[10px] bg-slate-800 text-white font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider">
                                      Setor: {sector.name}
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                      Risco Associado: {item.riskName}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-extrabold uppercase ${getPriorityColorPrint(item.priority)}`}>
                                    Prioridade: {item.priority}
                                  </span>
                                  <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-extrabold uppercase ${getStatusColorPrint(item.status)}`}>
                                    Status: {item.status}
                                  </span>
                                </div>
                              </div>

                              {/* Conteúdo do Card */}
                              <div className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-12 print:grid-cols-12 gap-6 text-sm">
                                  {/* Lado Esquerdo: Ações Principais */}
                                  <div className="md:col-span-7 print:col-span-7 space-y-4">
                                    <div className="space-y-1.5">
                                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
                                        <Target className="w-3.5 h-3.5 text-slate-400" /> Objetivo Estratégico da Ação
                                      </span>
                                      <p className="text-slate-850 font-semibold bg-slate-50/50 p-3 rounded-xl border border-slate-150">
                                        {item.actionObjective || `Mitigar os impactos decorrentes de ${item.riskName}.`}
                                      </p>
                                    </div>

                                    <div className="space-y-1.5">
                                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
                                        <Shield className="w-3.5 h-3.5 text-slate-400" /> Detalhamento da Ação Proposta / Medida de Controle
                                      </span>
                                      <p className="text-slate-750 leading-relaxed bg-slate-50/50 p-3 rounded-xl border border-slate-150">
                                        {item.actionProposed || item.recommendation}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Lado Direito: Atributos de Gestão/Cronograma */}
                                  <div className="md:col-span-5 print:col-span-5 bg-slate-50/30 p-4 rounded-xl border border-slate-150 space-y-3.5 text-xs print:bg-white">
                                    <div className="space-y-3">
                                      <div className="space-y-1">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                                          <User className="w-3 h-3 text-slate-400" /> Responsável
                                        </span>
                                        <span className="font-bold text-slate-800 block">
                                          {item.responsible || "Liderança e Gestão de Pessoas"}
                                        </span>
                                      </div>

                                      <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-150/60">
                                        <div className="space-y-1">
                                          <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                                            <Clock className="w-3 h-3 text-slate-400" /> Prazo
                                          </span>
                                          <span className="font-extrabold text-slate-900 block bg-slate-100/80 px-2 py-0.5 rounded-md w-fit text-[11px]">
                                            {item.deadline || "Mês Corrente + 3"}
                                          </span>
                                        </div>

                                        <div className="space-y-1">
                                          <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                                            <Calendar className="w-3 h-3 text-slate-400" /> Periodicidade
                                          </span>
                                          <span className="font-semibold text-slate-700 block">
                                            {item.periodicity || "Mensal"}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Indicador de Eficácia */}
                                <div className="mt-4 pt-4 border-t border-slate-150 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-slate-50/40 px-4 py-3 rounded-xl border border-slate-150 print:bg-white print:border-slate-300">
                                  <div className="flex items-center gap-1.5 text-slate-500 font-extrabold uppercase text-[10px] tracking-wider shrink-0">
                                    <CheckSquare className="w-3.5 h-3.5 text-slate-400 shrink-0" /> Indicador de Eficácia Recomendado
                                  </div>
                                  <div className="font-bold text-slate-800 leading-relaxed bg-white/65 px-3 py-1 rounded-lg border border-slate-150/50 print:bg-transparent print:border-none print:p-0">
                                    {item.efficacyIndicator || "Reavaliação anual"}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-2 print:hidden">
          <h4 className="font-bold text-slate-700 text-sm">Omissão de Capítulos de Riscos</h4>
          <p className="text-xs text-slate-500 max-w-lg mx-auto">
            Como definido nas Configurações Gerais do Laudo, a empresa declarou não reconhecer riscos psicossociais nesta avaliação. Portanto, os capítulos de Inventário e Plano de Ação foram omitidos e os capítulos subsequentes foram reordenados de forma automatizada.
          </p>
        </div>
      )}
    </React.Fragment>
  );
};
