/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Report, Sector, COPSOQ_DIMENSIONS, getDimensionRating } from "../types";
import { AlertTriangle, MessageSquare, ClipboardCheck, Users, HelpCircle } from "lucide-react";

interface TechnicalAnalysisProps {
  report: Report;
  onChange: (updatedReport: Partial<Report>) => void;
}

export const TechnicalAnalysis: React.FC<TechnicalAnalysisProps> = ({ report, onChange }) => {
  const [selectedSectorId, setSelectedSectorId] = useState<string>(
    report.sectors.length > 0 ? report.sectors[0].id : ""
  );

  const currentSector = report.sectors.find((s) => s.id === selectedSectorId) || report.sectors[0];

  if (report.sectors.length === 0) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-100 text-center space-y-4">
        <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto">
          <AlertTriangle className="w-8 h-8 text-amber-500" />
        </div>
        <div className="max-w-md mx-auto space-y-2">
          <h3 className="text-lg font-semibold text-slate-800">Nenhum Setor Cadastrado</h3>
          <p className="text-sm text-slate-500">
            Cadastre os setores na aba <strong>Informações Gerais</strong> e insira suas notas na aba <strong>Avaliação COPSOQ II</strong> antes de realizar a análise técnica.
          </p>
        </div>
      </div>
    );
  }

  // Ensure currentSector is active
  if (currentSector && selectedSectorId !== currentSector.id) {
    setSelectedSectorId(currentSector.id);
  }

  const handleSynthesisChange = (text: string) => {
    const updatedSectors = report.sectors.map((s) => {
      if (s.id === currentSector.id) {
        return {
          ...s,
          devolvedSynthesis: text,
        };
      }
      return s;
    });

    onChange({ sectors: updatedSectors });
  };

  // Get moderate and unfavorable dimensions for the current sector
  const getCriticalDimensions = (sector: Sector) => {
    return COPSOQ_DIMENSIONS.map((dim) => {
      const score = sector.scores[dim.key] ?? 0.0;
      const ratingInfo = getDimensionRating(score, dim.type);
      return {
        ...dim,
        score,
        rating: ratingInfo.rating,
        colorClass: ratingInfo.colorClass,
        bgClass: ratingInfo.bgClass,
      };
    }).filter((dim) => dim.rating !== "Favorável" && dim.rating !== "Não Avaliado" && dim.score > 0);
  };

  const criticalDimensions = currentSector ? getCriticalDimensions(currentSector) : [];

  return (
    <div className="space-y-6" id="technical-analysis-container">
      {/* Seletor de Setor para Devolutiva */}
      <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-md font-semibold text-slate-800 flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-600" />
            Análise de Devolutiva Técnica com Líderes
          </h3>
          <p className="text-xs text-slate-500">
            Selecione o setor para visualizar as dimensões que necessitam de investigação qualitativa e digite a síntese de campo.
          </p>
        </div>

        <select
          value={selectedSectorId}
          onChange={(e) => setSelectedSectorId(e.target.value)}
          className="w-full md:w-80 px-3 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-800 bg-white focus:ring-2 focus:ring-slate-400 focus:border-slate-400 outline-none"
        >
          {report.sectors.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.employeeCount} funcionários)
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Dimensões Percebidas / Alertas */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs lg:col-span-5 space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h4 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Riscos Identificados na Avaliação COPSOQ II
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              Fatores com classificação <strong>Moderada</strong> ou <strong>Desfavorável</strong> que foram sinalizados pelos colaboradores deste setor:
            </p>
          </div>

          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
            {criticalDimensions.length === 0 ? (
              <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl text-center space-y-2">
                <p className="text-xs font-bold text-emerald-800">TUDO SOB CONTROLE</p>
                <p className="text-xs text-emerald-600">
                  Todas as dimensões deste setor estão na zona <strong>Favorável</strong>. Nenhuma investigação técnica de desvios é explicitamente obrigatória.
                </p>
              </div>
            ) : (
              criticalDimensions.map((dim) => (
                <div key={dim.key} className="p-3.5 rounded-xl border border-slate-100 bg-slate-50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800 text-xs">{dim.name}</span>
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${dim.bgClass}`}>
                      {dim.rating} ({dim.score.toFixed(2)})
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    {dim.description}
                  </p>
                  <span className={`inline-block text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                    dim.type === "positive" ? "bg-sky-50 text-sky-700 border border-sky-200" : "bg-purple-50 text-purple-700 border border-purple-200"
                  }`}>
                    Dimensão {dim.type === "positive" ? "Protetiva" : "Saturadora"}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Síntese Diagnóstica / Devolutiva */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs lg:col-span-7 space-y-6">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-slate-600" />
                Síntese da Investigação Qualitativa (Devolutiva)
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Com base na reunião com os líderes do setor <strong>{currentSector.name}</strong>, registre abaixo quais foram as causas/percepções reais que justificam as notas do COPSOQ II.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Relato da Devolutiva e Diagnóstico de Campo
              </label>
              <textarea
                value={currentSector.devolvedSynthesis}
                onChange={(e) => handleSynthesisChange(e.target.value)}
                placeholder="Ex: Em reunião de devolutiva realizada no dia XX/XX com a liderança do setor, constatou-se que as notas desfavoráveis em 'Liderança' e 'Conflito de Papéis' se correlacionam à recente fusão de duas equipes de vendas. Os supervisores relatam ambiguidade sobre quem aprova os descontos, e que há ruídos na distribuição de metas. Em relação a 'Demandas', foi apontado um aumento no tempo de atendimento por falta de treinamento na nova plataforma CRM..."
                rows={10}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-400 focus:border-slate-400 outline-none transition text-sm text-slate-800 font-sans leading-relaxed"
              />
            </div>

            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex gap-3">
              <ClipboardCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h5 className="text-xs font-bold text-blue-900 uppercase">Utilidade deste texto:</h5>
                <p className="text-[11px] text-blue-700 leading-relaxed">
                  Este texto preenche o Capítulo de <strong>Análise Técnica dos Riscos</strong> no relatório final. Ele correlaciona os dados brutos numéricos à realidade fática do ambiente de trabalho coletada diretamente com a chefia.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
