/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Report, Sector, COPSOQ_DIMENSIONS, getDimensionRating } from "../types";
import { AlertCircle, ChartBar, HelpCircle, Save, Sliders, TrendingUp, Activity } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ReferenceLine } from "recharts";

interface CopsoqEvaluationProps {
  report: Report;
  onChange: (updatedReport: Partial<Report>) => void;
}

export const CopsoqEvaluation: React.FC<CopsoqEvaluationProps> = ({ report, onChange }) => {
  const [selectedSectorId, setSelectedSectorId] = useState<string>(
    report.sectors.length > 0 ? report.sectors[0].id : ""
  );

  const [activeTab, setActiveTab] = useState<"input" | "charts">("input");

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
            Antes de preencher as notas da avaliação COPSOQ II, você deve cadastrar pelo menos um setor na aba <strong>Informações Gerais</strong>.
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
    const summary = { favoravel: 0, moderada: 0, desfavoravel: 0 };
    if (!currentSector) return summary;

    COPSOQ_DIMENSIONS.forEach((dim) => {
      const score = currentSector.scores[dim.key] ?? 0;
      const { rating } = getDimensionRating(score, dim.type);
      if (rating === "Favorável") summary.favoravel++;
      else if (rating === "Moderada") summary.moderada++;
      else if (rating === "Desfavorável") summary.desfavoravel++;
    });

    return summary;
  };

  const summary = getStatusSummary();

  // Prepare data for Recharts Bar Chart
  const chartData = COPSOQ_DIMENSIONS.map((dim) => {
    const score = currentSector ? (currentSector.scores[dim.key] ?? 0) : 0;
    const ratingObj = getDimensionRating(score, dim.type);
    return {
      name: dim.name,
      score: score,
      rating: ratingObj.rating,
      color: ratingObj.rating === "Favorável" ? "#10b981" : ratingObj.rating === "Moderada" ? "#f59e0b" : ratingObj.rating === "Desfavorável" ? "#f43f5e" : "#cbd5e1",
      type: dim.type === "positive" ? "Positiva" : "Negativa"
    };
  });

  return (
    <div className="space-y-6" id="copsoq-evaluation-container">
      {/* Seletor de Setor e Abas */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <label className="text-sm font-semibold text-slate-700 whitespace-nowrap">Setor sob Análise:</label>
          <select
            value={selectedSectorId}
            onChange={(e) => setSelectedSectorId(e.target.value)}
            className="w-full md:w-80 px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-800 bg-white focus:ring-2 focus:ring-slate-400 focus:border-slate-400 outline-none"
          >
            {report.sectors.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.employeeCount} funcionários)
              </option>
            ))}
          </select>
        </div>

        <div className="flex border border-slate-200 rounded-lg p-0.5 w-full md:w-auto">
          <button
            onClick={() => setActiveTab("input")}
            className={`flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer ${
              activeTab === "input"
                ? "bg-slate-800 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Sliders className="w-3.5 h-3.5" /> Inserir Notas (0 a 4)
          </button>
          <button
            onClick={() => setActiveTab("charts")}
            className={`flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer ${
              activeTab === "charts"
                ? "bg-slate-800 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <ChartBar className="w-3.5 h-3.5" /> Gráficos de Resultados
          </button>
        </div>
      </div>

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
              <h4 className="text-2xl font-extrabold text-amber-900 mt-1">{summary.moderada}</h4>
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
      {currentSector && activeTab === "input" && (
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
              const score = currentSector.scores[dim.key] ?? 0;
              const ratingObj = getDimensionRating(score, dim.type);

              return (
                <div
                  key={dim.key}
                  className="p-4 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/30 transition grid grid-cols-1 lg:grid-cols-12 gap-4 items-center"
                >
                  {/* Nome e Info da Dimensão */}
                  <div className="lg:col-span-4 space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-slate-800 text-sm">{dim.name}</h4>
                      <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                        dim.type === "positive" 
                          ? "bg-sky-50 text-sky-800 border border-sky-200" 
                          : "bg-purple-50 text-purple-800 border border-purple-200"
                      }`}>
                        {dim.type === "positive" ? "Positiva" : "Negativa"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">{dim.description}</p>
                  </div>

                  {/* Controle de Nota (Slider ou Input) */}
                  <div className="lg:col-span-5 flex items-center gap-4">
                    <input
                      type="range"
                      min="0"
                      max="4"
                      step="0.01"
                      value={score}
                      onChange={(e) => handleScoreChange(dim.key, parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-slate-800"
                    />
                    
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        max="4"
                        step="0.1"
                        value={score === 0 ? "" : score}
                        placeholder="0.0"
                        onChange={(e) => handleScoreChange(dim.key, parseFloat(e.target.value) || 0)}
                        className="w-16 px-2 py-1 border border-slate-200 rounded text-center text-sm font-semibold text-slate-800 focus:ring-1 focus:ring-slate-400 outline-none"
                      />
                      <span className="text-xs text-slate-400">/ 4.00</span>
                    </div>
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
              onChange={(e) => handleGeneralAnalysisChange(e.target.value)}
              placeholder="Ex: Os colaboradores deste setor relatam alto nível de companheirismo e bom relacionamento horizontal, porém demonstram cansaço e frustração acentuados com os recorrentes picos de trabalho sem compensação e a falta de clareza nas metas de entrega."
              rows={4}
              className="w-full px-4 py-3 rounded-xl border border-slate-250 focus:ring-2 focus:ring-slate-400 focus:border-slate-400 outline-none text-sm text-slate-800 bg-white"
            />
          </div>
        </div>
      )}

      {/* Interface Principal: Gráficos de Resultados */}
      {currentSector && activeTab === "charts" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Gráfico de Barras */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs lg:col-span-8 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  <ChartBar className="w-5 h-5 text-slate-600" />
                  Visualização Gráfica do Setor: {currentSector.name}
                </h3>
                <p className="text-xs text-slate-500">
                  Pontuações médias por dimensão em escala de 0 a 4. As linhas pontilhadas indicam as faixas de corte da COPSOQ II.
                </p>
              </div>
            </div>

            <div className="h-96 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 10, right: 30, left: 140, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={true} stroke="#f1f5f9" />
                  <XAxis type="number" domain={[0, 4]} tickCount={5} stroke="#64748b" fontSize={11} />
                  <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={11} width={135} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-3 border border-slate-100 shadow-lg rounded-xl text-xs space-y-1">
                            <p className="font-bold text-slate-800">{data.name}</p>
                            <p className="text-slate-500">Tipo: <span className="font-semibold">{data.type}</span></p>
                            <p className="text-slate-800">Pontuação: <span className="font-bold text-slate-900">{data.score.toFixed(2)}</span></p>
                            <p className="flex items-center gap-1.5 mt-1 font-semibold">
                              Situação: 
                              <span className={`px-2 py-0.5 rounded text-[10px] ${
                                data.rating === "Favorável" ? "bg-emerald-50 text-emerald-800" : data.rating === "Moderada" ? "bg-amber-50 text-amber-800" : "bg-rose-50 text-rose-800"
                              }`}>{data.rating}</span>
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  {/* Linhas de Referência dos Limites de Escala */}
                  <ReferenceLine x={2.33} stroke="#f43f5e" strokeDasharray="3 3" label={{ value: 'Corte Risco', fill: '#f43f5e', position: 'top', fontSize: 9 }} />
                  <ReferenceLine x={3.66} stroke="#10b981" strokeDasharray="3 3" label={{ value: 'Corte Favorável', fill: '#10b981', position: 'top', fontSize: 9 }} />
                  
                  <Bar dataKey="score" radius={[0, 4, 4, 0]} barSize={16}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Legenda do Gráfico */}
            <div className="flex flex-wrap justify-center gap-6 pt-4 border-t border-slate-100 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded bg-rose-500" />
                <span className="text-slate-600 font-medium">Desfavorável (&lt; 2,34) - Requer Intervenção</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded bg-amber-500" />
                <span className="text-slate-600 font-medium">Moderada (2,34 - 3,66) - Requer Monitoramento</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded bg-emerald-500" />
                <span className="text-slate-600 font-medium">Favorável (&gt; 3,66) - Baixo/Inexistente Risco</span>
              </div>
            </div>

            {/* Análise Geral da Percepção dos Colaboradores no painel de resultados */}
            <div className="pt-6 border-t border-slate-150 space-y-3 text-left">
              <h4 className="font-semibold text-slate-800 text-xs uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-slate-500" />
                Análise Geral do Setor com base na percepção dos colaboradores
              </h4>
              <textarea
                value={currentSector.generalAnalysis || ""}
                onChange={(e) => handleGeneralAnalysisChange(e.target.value)}
                placeholder="Insira aqui uma análise geral sobre o setor com base na percepção dos colaboradores avaliados (queixas, sentimentos, feedbacks colhidos)..."
                rows={4}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-400 focus:border-slate-400 outline-none text-xs text-slate-800 bg-slate-50/50"
              />
            </div>
          </div>

          {/* Dicas e Recomendações em Função do Perfil */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-slate-800 text-white p-6 rounded-2xl space-y-4">
              <h4 className="font-bold flex items-center gap-2 text-sm text-slate-100">
                <TrendingUp className="w-4 h-4 text-amber-400" />
                Diretrizes de Análise Técnica
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Após analisar as pontuações e gerar estes gráficos, os técnicos de SST utilizam os dados como insumos para a fase qualitativa.
              </p>
              <div className="bg-slate-700/50 p-3.5 rounded-xl border border-slate-600 text-xs text-slate-200 leading-relaxed">
                <strong>Próximo Passo:</strong> Vá para a aba de <strong>Análise Técnica</strong> para documentar a devolutiva com a liderança do setor <strong>{currentSector.name}</strong>, focando nos riscos moderados e desfavoráveis indicados em campo.
              </div>
            </div>

            {/* Quadro de Fatores Críticos do Setor */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-3">
              <h4 className="font-semibold text-slate-800 text-sm">Fatores Críticos Detectados</h4>
              <p className="text-xs text-slate-500 leading-relaxed">Dimensões que requerem intervenção ou monitoramento imediato:</p>
              
              <div className="space-y-2 pt-2">
                {chartData.filter(d => d.rating !== "Favorável").length === 0 ? (
                  <p className="text-xs text-emerald-600 font-medium bg-emerald-50 p-3 rounded-lg text-center">
                    Excelente! Nenhuma dimensão registrou risco moderado ou desfavorável neste setor.
                  </p>
                ) : (
                  chartData.filter(d => d.rating !== "Favorável").map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 bg-slate-50 text-xs">
                      <span className="font-semibold text-slate-700">{item.name}</span>
                      <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                        item.rating === "Desfavorável" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"
                      }`}>
                        {item.rating} ({item.score.toFixed(2)})
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
