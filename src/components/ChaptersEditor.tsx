/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Report, ReportChapters } from "../types";
import { BookOpen, HelpCircle, Save, Check } from "lucide-react";

interface ChaptersEditorProps {
  report: Report;
  onChange: (updatedReport: Partial<Report>) => void;
}

export const ChaptersEditor: React.FC<ChaptersEditorProps> = ({ report, onChange }) => {
  const [activeChapter, setActiveChapter] = useState<keyof ReportChapters | "consideracoes">("introducao");
  const [showSavedNotification, setShowSavedNotification] = useState(false);

  const handleChapterTextChange = (text: string) => {
    if (activeChapter === "consideracoes") {
      onChange({ finalConsiderations: text });
    } else {
      onChange({
        chapters: {
          ...report.chapters,
          [activeChapter]: text,
        },
      });
    }

    // Show temporary feedback
    setShowSavedNotification(true);
    setTimeout(() => setShowSavedNotification(false), 1500);
  };

  const getChapterValue = (): string => {
    if (activeChapter === "consideracoes") {
      return report.finalConsiderations;
    }
    return report.chapters[activeChapter];
  };

  const getChapterTitle = (key: typeof activeChapter): string => {
    switch (key) {
      case "introducao":
        return "1. Introdução do Relatório";
      case "fundamentacao":
        return "2. Fundamentação Teórica e Metodológica";
      case "metodologia":
        return "3. Metodologia de Avaliação";
      case "consideracoes":
        return "8. Considerações Finais";
      case "referencias":
        return "9. Referências Bibliográficas";
    }
  };

  const getChapterTips = (key: typeof activeChapter): string => {
    switch (key) {
      case "introducao":
        return "Apresente o escopo e justificativa legal do documento (NR-01, PGR, e GRO). Descreva o contexto de saúde mental da empresa avaliada.";
      case "fundamentacao":
        return "Cite os modelos científicos de estresse laboral, como o Modelo Demanda-Controle (Karasek) ou Desequilíbrio Esforço-Recompensa (Siegrist).";
      case "metodologia":
        return "Explique o Copenhagen Psychosocial Questionnaire (COPSOQ II) e como os escores variam de 0 a 4 com pontos de corte técnicos.";
      case "consideracoes":
        return "Conclua resumindo a importância do engajamento de líderes, periodicidade sugerida de reavaliação (12 a 24 meses) e integração ao PGR.";
      case "referencias":
        return "Liste as normas regulamentadoras federais, leis trabalhistas e artigos de referência científica utilizados na elaboração.";
    }
  };

  const menuItems: { key: typeof activeChapter; label: string }[] = [
    { key: "introducao", label: "1. Introdução" },
    { key: "fundamentacao", label: "2. Fundamentação" },
    { key: "metodologia", label: "3. Metodologia" },
    { key: "consideracoes", label: "8. Considerações Finais" },
    { key: "referencias", label: "9. Referências" },
  ];

  return (
    <div className="space-y-6" id="chapters-editor-container">
      {/* Cabeçalho */}
      <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-xs flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-md font-semibold text-slate-800 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-slate-600" />
            Configuração dos Capítulos Padrão (Modelo de Documento)
          </h3>
          <p className="text-xs text-slate-500">
            Abaixo estão os textos padrão do modelo do relatório. Você pode editá-los e personalizá-los livremente para cada documento gerado.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Menu Lateral de Capítulos */}
        <div className="md:col-span-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-xs h-fit space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-3 pb-2 border-b border-slate-100 mb-2">
            Capítulos do Relatório
          </span>
          {menuItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setActiveChapter(item.key)}
              className={`w-full text-left px-3 py-2.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                activeChapter === item.key
                  ? "bg-slate-800 text-white font-bold"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Editor de Texto do Capítulo Ativo */}
        <div className="md:col-span-9 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="font-bold text-slate-800 text-sm">
                {getChapterTitle(activeChapter)}
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                {getChapterTips(activeChapter)}
              </p>
            </div>

            {showSavedNotification && (
              <span className="text-emerald-600 text-xs font-bold flex items-center gap-1 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full shrink-0">
                <Check className="w-3.5 h-3.5" /> Salvo localmente
              </span>
            )}
          </div>

          <div className="space-y-4">
            <textarea
              value={getChapterValue()}
              onChange={(e) => handleChapterTextChange(e.target.value)}
              rows={16}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-400 focus:border-slate-400 outline-none transition text-sm text-slate-800 font-sans leading-relaxed shadow-inner"
              placeholder="Digite aqui o texto do seu capítulo..."
            />

            <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl flex gap-3 text-xs text-slate-500">
              <HelpCircle className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <strong>Dica de SST:</strong> Em avaliações psicossociais, os capítulos metodológicos e fundamentais estruturam a robustez científica do relatório perante auditores fiscais do Trabalho (MTE) e avaliações periciais do INSS. Mantenha os textos atualizados de acordo com as normas.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
