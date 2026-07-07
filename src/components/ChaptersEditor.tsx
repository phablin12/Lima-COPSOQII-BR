/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from "react";
import { Report, ReportChapters, CustomChapter } from "../types";
import { 
  BookOpen, 
  HelpCircle, 
  Check, 
  Plus, 
  Trash2, 
  Edit3, 
  FileText, 
  Eye, 
  Code,
  Sparkles,
  ChevronRight,
  Info
} from "lucide-react";

interface ChaptersEditorProps {
  report: Report;
  onChange: (updatedReport: Partial<Report>) => void;
  assessor: {
    fantasyName: string;
    socialName: string;
    cnpj: string;
    address: string;
    phone: string;
    logo: string;
    email?: string;
    website?: string;
    technicalResponsible?: string;
    legalResponsible?: string;
  };
}

export const replaceTemplateVariables = (
  text: string, 
  report: Report, 
  assessor?: any
): string => {
  if (!text) return "";
  let result = text;
  
  const formatDateStr = (dateStr: string) => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  const variables: Record<string, string> = {
    "{empresa_cliente}": report.companyName || "",
    "{cnpj_cliente}": report.cnpj || "",
    "{endereco_cliente}": report.companyAddress || "",
    "{cidade_cliente}": report.companyCity || "",
    "{estado_cliente}": report.companyState || "",
    "{data_inicio}": formatDateStr(report.dateStart),
    "{data_fim}": formatDateStr(report.dateEnd),
    "{profissional_nome}": report.professionalName || "",
    "{profissional_cargo}": report.professionalRole || "",
    "{profissional_registro}": report.professionalReg || "",
    "{empresa_assessora}": assessor?.fantasyName || "",
    "{cnpj_assessora}": assessor?.cnpj || "",
    "{responsavel_legal}": assessor?.legalResponsible || "",
    "{responsavel_tecnico}": assessor?.technicalResponsible || "",
  };

  Object.entries(variables).forEach(([key, val]) => {
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    result = result.replace(new RegExp(escapedKey, "g"), val);
  });

  return result;
};

export const ChaptersEditor: React.FC<ChaptersEditorProps> = ({ report, onChange, assessor }) => {
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const [activeChapterId, setActiveChapterId] = useState<string>("introducao");
  const [showSavedNotification, setShowSavedNotification] = useState(false);
  
  // Custom chapters creation modal/inline state
  const [isCreatingChapter, setIsCreatingChapter] = useState(false);
  const [newChapterTitle, setNewChapterTitle] = useState("");
  
  // Custom chapter renaming
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingTitleValue, setEditingTitleValue] = useState("");

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const getChapterValue = (chapterId: string): string => {
    if (chapterId === "consideracoes") {
      return report.finalConsiderations || "";
    }
    if (["introducao", "fundamentacao", "metodologia", "referencias"].includes(chapterId)) {
      return report.chapters[chapterId as keyof ReportChapters] || "";
    }
    // Custom chapter
    const custom = (report.customChapters || []).find(c => c.id === chapterId);
    return custom ? custom.text : "";
  };

  const handleChapterTextChange = (text: string) => {
    if (activeChapterId === "consideracoes") {
      onChange({ finalConsiderations: text });
    } else if (["introducao", "fundamentacao", "metodologia", "referencias"].includes(activeChapterId)) {
      onChange({
        chapters: {
          ...report.chapters,
          [activeChapterId]: text,
        },
      });
    } else {
      // Custom chapter
      const updatedCustoms = (report.customChapters || []).map(c => {
        if (c.id === activeChapterId) {
          return { ...c, text };
        }
        return c;
      });
      onChange({ customChapters: updatedCustoms });
    }

    setShowSavedNotification(true);
    const t = setTimeout(() => setShowSavedNotification(false), 1200);
    return () => clearTimeout(t);
  };

  const getChapterTitle = (chapterId: string): string => {
    switch (chapterId) {
      case "introducao":
        return "1. Introdução do Relatório";
      case "fundamentacao":
        return "2. Fundamentação Teórica";
      case "metodologia":
        return "3. Metodologia de Avaliação";
      case "consideracoes":
        return "8. Considerações Finais";
      case "referencias":
        return "9. Referências Bibliográficas";
      default:
        const custom = (report.customChapters || []).find(c => c.id === chapterId);
        return custom ? custom.title : "Capítulo Personalizado";
    }
  };

  const getChapterTips = (chapterId: string): string => {
    switch (chapterId) {
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
      default:
        return "Capítulo personalizado livre criado pelo usuário. Use variáveis dinâmicas e formate o texto de acordo com sua necessidade.";
    }
  };

  // Add new Custom Chapter
  const handleCreateCustomChapter = () => {
    if (!newChapterTitle.trim()) return;
    const nextOrder = (report.customChapters || []).length + 10; // place at the end
    const newCh: CustomChapter = {
      id: `custom-${Date.now()}`,
      title: newChapterTitle.trim(),
      text: "Digite o texto do seu novo capítulo aqui...",
      order: nextOrder
    };
    
    onChange({
      customChapters: [...(report.customChapters || []), newCh]
    });
    
    setActiveChapterId(newCh.id);
    setIsCreatingChapter(false);
    setNewChapterTitle("");
    setActiveTab("edit");
  };

  // Delete active Custom Chapter
  const handleDeleteCustomChapter = (chapterId: string) => {
    if (!window.confirm("Deseja realmente excluir este capítulo personalizado? Esta ação não pode ser desfeita.")) return;
    const updatedCustoms = (report.customChapters || []).filter(c => c.id !== chapterId);
    onChange({ customChapters: updatedCustoms });
    setActiveChapterId("introducao");
  };

  // Rename custom chapter
  const handleSaveChapterTitle = () => {
    if (!editingTitleValue.trim()) return;
    const updatedCustoms = (report.customChapters || []).map(c => {
      if (c.id === activeChapterId) {
        return { ...c, title: editingTitleValue.trim() };
      }
      return c;
    });
    onChange({ customChapters: updatedCustoms });
    setIsEditingTitle(false);
  };

  // Insert Variable helper
  const handleInsertVariable = (variableKey: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = getChapterValue(activeChapterId);
    const before = currentText.substring(0, start);
    const after = currentText.substring(end, currentText.length);

    const updatedText = before + variableKey + after;
    handleChapterTextChange(updatedText);

    // Reposition cursor right after inserted variable
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + variableKey.length;
    }, 50);
  };

  // Available automatic variables list
  const autoVariables = [
    { key: "{empresa_cliente}", label: "Empresa Cliente (Razão)", desc: report.companyName },
    { key: "{nome_fantasia}", label: "Nome Fantasia Cliente", desc: report.companyFantasyName || report.companyName },
    { key: "{cnpj_cliente}", label: "CNPJ Cliente", desc: report.cnpj },
    { key: "{endereco_cliente}", label: "Endereço Cliente", desc: report.companyAddress || "-" },
    { key: "{cidade_cliente}", label: "Cidade Cliente", desc: report.companyCity || "-" },
    { key: "{estado_cliente}", label: "Estado Cliente", desc: report.companyState || "-" },
    { key: "{data_inicio}", label: "Data Início", desc: report.dateStart },
    { key: "{data_fim}", label: "Data Fim", desc: report.dateEnd },
    { key: "{profissional_nome}", label: "Nome Profissional SST", desc: report.professionalName },
    { key: "{profissional_cargo}", label: "Cargo Profissional", desc: report.professionalRole },
    { key: "{profissional_registro}", label: "Registro Profissional", desc: report.professionalReg },
    { key: "{empresa_assessora}", label: "Empresa Assessora", desc: assessor?.fantasyName },
    { key: "{cnpj_assessora}", label: "CNPJ Assessoria", desc: assessor?.cnpj },
    { key: "{responsavel_tecnico}", label: "Resp. Técnico", desc: assessor?.technicalResponsible },
    { key: "{responsavel_legal}", label: "Resp. Legal", desc: assessor?.legalResponsible },
  ];

  // Helper to split chapter text into professional indented paragraphs
  const renderParagraphsWithIndent = (text: string, indent: "none" | "medium" | "large") => {
    if (!text) return <p className="text-slate-400 italic">Capítulo sem texto cadastrado.</p>;
    
    // Split by single or multiple newlines
    const paras = text.split(/\n+/);
    
    // Set indent value in cm
    const indentCm = indent === "medium" ? "1.5cm" : indent === "large" ? "2.5cm" : "0cm";

    return (
      <div className="space-y-4">
        {paras.map((p, idx) => {
          const trimmed = p.trim();
          if (!trimmed) return null;
          
          // Check if paragraph starts with a list indicator
          const isList = /^(?:\d+\.|\*|-|•|a\)|b\)|c\))/i.test(trimmed);
          
          return (
            <p 
              key={idx} 
              className="text-justify text-slate-800 leading-relaxed text-sm"
              style={{ 
                textIndent: isList ? "0cm" : indentCm,
                paddingLeft: isList ? "1rem" : "0cm" 
              }}
            >
              {trimmed}
            </p>
          );
        })}
      </div>
    );
  };

  const standardMenuItems = [
    { id: "introducao", label: "1. Introdução" },
    { id: "fundamentacao", label: "2. Fundamentação Teórica" },
    { id: "metodologia", label: "3. Metodologia" },
    { id: "consideracoes", label: "8. Considerações Finais" },
    { id: "referencias", label: "9. Referências" },
  ];

  const customMenuItems = report.customChapters || [];

  return (
    <div className="space-y-6" id="chapters-editor-container">
      {/* Cabeçalho */}
      <div className="bg-white p-5 rounded-xl border border-slate-150 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-md font-semibold text-slate-800 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-slate-600" />
            Editor Profissional de Capítulos e Variáveis Ocupacionais
          </h3>
          <p className="text-xs text-slate-500">
            Adicione novos capítulos ao seu modelo de documento, use variáveis para preenchimento automático e configure o recuo padrão dos parágrafos para impressão.
          </p>
        </div>

        {/* Configuração de Recuo do Parágrafo */}
        <div className="bg-slate-50 px-4 py-2.5 rounded-lg border border-slate-200 flex items-center gap-3 shrink-0">
          <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Recuo dos Parágrafos:</span>
          <select
            value={report.paragraphIndent || "medium"}
            onChange={(e) => onChange({ paragraphIndent: e.target.value as "none" | "medium" | "large" })}
            className="bg-white border border-slate-300 rounded px-2.5 py-1 text-xs font-bold text-slate-850 outline-none focus:border-slate-500"
          >
            <option value="none">Sem Recuo (0 cm)</option>
            <option value="medium">Recuo Padrão (1.5 cm)</option>
            <option value="large">Recuo Grande (2.5 cm)</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Menu Lateral de Capítulos */}
        <div className="md:col-span-3 bg-white p-4 rounded-2xl border border-slate-150 shadow-xs h-fit space-y-4">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-3 pb-2 border-b border-slate-100 mb-2">
              Capítulos Oficiais (SST)
            </span>
            <div className="space-y-1">
              {standardMenuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveChapterId(item.id);
                    setIsEditingTitle(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-between group ${
                    activeChapterId === item.id
                      ? "bg-slate-800 text-white font-bold shadow-xs"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <span className="truncate">{item.label}</span>
                  <ChevronRight className={`w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity ${activeChapterId === item.id ? "text-white" : "text-slate-400"}`} />
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-3 pb-2 border-b border-slate-100 mb-2 flex items-center justify-between">
              <span>Capítulos Personalizados</span>
              <span className="bg-slate-100 text-slate-500 rounded px-1 text-[9px] font-bold">
                {customMenuItems.length}
              </span>
            </span>
            
            {customMenuItems.length === 0 ? (
              <p className="text-[10px] text-slate-400 italic px-3 py-1">Nenhum capítulo personalizado criado.</p>
            ) : (
              <div className="space-y-1">
                {customMenuItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveChapterId(item.id);
                      setIsEditingTitle(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-between group ${
                      activeChapterId === item.id
                        ? "bg-slate-800 text-white font-bold shadow-xs"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <span className="truncate">{item.title}</span>
                    <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400" />
                  </button>
                ))}
              </div>
            )}

            {/* Criar capítulo inline */}
            {isCreatingChapter ? (
              <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                <input
                  type="text"
                  placeholder="Nome do capítulo... Ex: Anexos"
                  value={newChapterTitle}
                  onChange={(e) => setNewChapterTitle(e.target.value)}
                  className="w-full px-2 py-1 bg-white text-xs text-slate-800 border border-slate-300 rounded focus:border-slate-500 outline-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateCustomChapter();
                  }}
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setIsCreatingChapter(false)}
                    className="text-[10px] font-bold text-slate-500 hover:text-slate-700 px-2 py-1"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleCreateCustomChapter}
                    className="text-[10px] font-bold bg-slate-800 text-white rounded px-2.5 py-1 hover:bg-slate-900"
                  >
                    Confirmar
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsCreatingChapter(true)}
                className="w-full mt-3 py-2 border border-dashed border-slate-300 hover:border-slate-500 rounded-lg text-xs font-bold text-slate-600 flex items-center justify-center gap-1.5 transition cursor-pointer hover:bg-slate-50"
              >
                <Plus className="w-4 h-4" /> Adicionar Capítulo
              </button>
            )}
          </div>
        </div>

        {/* Editor de Texto do Capítulo Ativo */}
        <div className="md:col-span-9 bg-white p-6 rounded-2xl border border-slate-150 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {isEditingTitle ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editingTitleValue}
                      onChange={(e) => setEditingTitleValue(e.target.value)}
                      className="px-2 py-1 border border-slate-300 rounded text-sm text-slate-800 font-bold focus:border-slate-500 outline-none"
                    />
                    <button
                      onClick={handleSaveChapterTitle}
                      className="bg-slate-800 text-white p-1 rounded hover:bg-slate-900"
                      title="Salvar Título"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h4 className="font-extrabold text-slate-800 text-sm">
                      {getChapterTitle(activeChapterId)}
                    </h4>
                    {activeChapterId.startsWith("custom-") && (
                      <button
                        onClick={() => {
                          setIsEditingTitle(true);
                          setEditingTitleValue(getChapterTitle(activeChapterId));
                        }}
                        className="text-slate-400 hover:text-slate-600"
                        title="Renomear Capítulo"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}

                {activeChapterId.startsWith("custom-") && !isEditingTitle && (
                  <button
                    onClick={() => handleDeleteCustomChapter(activeChapterId)}
                    className="text-rose-500 hover:text-rose-700 p-1 rounded hover:bg-rose-50 transition ml-2"
                    title="Excluir este capítulo personalizado"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-500">
                {getChapterTips(activeChapterId)}
              </p>
            </div>

            {/* Abas e Notificação */}
            <div className="flex items-center gap-2 self-start md:self-center">
              {showSavedNotification && (
                <span className="text-emerald-600 text-[10px] font-bold flex items-center gap-1 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full">
                  <Check className="w-3 h-3" /> Salvo
                </span>
              )}

              <div className="bg-slate-100 p-1 rounded-lg border border-slate-200 flex gap-1">
                <button
                  onClick={() => setActiveTab("edit")}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1 ${
                    activeTab === "edit"
                      ? "bg-white text-slate-800 shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Code className="w-3.5 h-3.5" /> Editar
                </button>
                <button
                  onClick={() => setActiveTab("preview")}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1 ${
                    activeTab === "preview"
                      ? "bg-white text-slate-800 shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" /> Pré-visualizar
                </button>
              </div>
            </div>
          </div>

          {activeTab === "edit" ? (
            <div className="space-y-4 animate-fade-in">
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={getChapterValue(activeChapterId)}
                  onChange={(e) => handleChapterTextChange(e.target.value)}
                  rows={15}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-400 focus:border-slate-400 outline-none transition text-sm text-slate-800 font-sans leading-relaxed shadow-inner"
                  placeholder="Digite o texto do seu capítulo aqui. Você pode usar os botões abaixo para preencher variáveis automáticas no meio do texto..."
                />
              </div>

              {/* Botões de Inserção de Variáveis Ocupacionais */}
              <div className="space-y-2.5 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Inserir Variáveis Automáticas (Clique para colar no texto)</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {autoVariables.map((v) => (
                    <button
                      key={v.key}
                      onClick={() => handleInsertVariable(v.key)}
                      className="text-left bg-white border border-slate-200 hover:border-slate-400 hover:bg-slate-50 p-2 rounded-lg text-[10px] font-semibold text-slate-700 shadow-2xs hover:shadow-xs transition duration-150 cursor-pointer group"
                      title={`Substitui pelo valor: "${v.desc}"`}
                    >
                      <span className="font-bold text-slate-900 group-hover:text-blue-600 block truncate">{v.key}</span>
                      <span className="text-[9px] text-slate-400 truncate block mt-0.5">{v.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl flex gap-3 text-xs text-slate-500">
                <HelpCircle className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <strong>Dica de SST:</strong> Em avaliações psicossociais, os capítulos metodológicos e fundamentais estruturam a robustez científica do relatório perante auditores fiscais do Trabalho (MTE) e avaliações periciais do INSS. Mantenha os textos atualizados de acordo com as normas.
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 max-h-[500px] overflow-y-auto shadow-inner bg-white font-serif">
                <div className="border-b border-slate-200 pb-3 mb-4 flex justify-between items-center text-xs text-slate-400 font-bold font-sans">
                  <span>MOCKUP DE IMPRESSÃO (PÁGINA DO LAUDO)</span>
                  <span className="uppercase text-slate-500 bg-slate-200 px-2 py-0.5 rounded">
                    Recuo: {report.paragraphIndent === "none" ? "Sem Recuo" : report.paragraphIndent === "large" ? "Grande (2.5cm)" : "Médio (1.5cm)"}
                  </span>
                </div>
                
                <h3 className="text-md font-extrabold text-slate-900 uppercase tracking-wide border-b border-slate-800 pb-2 mb-4 font-sans">
                  {getChapterTitle(activeChapterId)}
                </h3>
                
                {renderParagraphsWithIndent(
                  replaceTemplateVariables(getChapterValue(activeChapterId), report, assessor),
                  report.paragraphIndent || "medium"
                )}
              </div>

              <div className="bg-blue-50 border border-blue-150 p-4 rounded-xl flex gap-3 text-xs text-blue-800">
                <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <strong>Sobre o recuo do parágrafo:</strong> A pré-visualização acima reflete de forma fidedigna como os parágrafos serão recuados e como as variáveis serão processadas no relatório final para impressão PDF.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
