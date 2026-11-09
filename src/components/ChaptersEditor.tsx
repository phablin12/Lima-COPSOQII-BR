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
  Eye, 
  Code,
  Sparkles,
  ChevronRight,
  Info,
  GripVertical,
  ChevronUp,
  ChevronDown,
  X,
  Layers,
  CornerDownRight,
  FileText,
  RotateCcw,
  AlertTriangle
} from "lucide-react";
import { SearchableSelect } from "./SearchableSelect";
import {
  STANDARD_CHAPTERS,
  getStandardChapterTitle,
  getFullChapterTitle,
  getChapterLevel,
  detectParentSection,
  suggestNextNumber,
  compareChapterNumbers
} from "../chapterHierarchy";

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
  
  const activeAssessor = report.evaluator || assessor;
  
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
    "{empresa_assessora}": activeAssessor?.fantasyName || "",
    "{cnpj_assessora}": activeAssessor?.cnpj || "",
    "{responsavel_legal}": activeAssessor?.legalResponsible || "",
    "{responsavel_tecnico}": activeAssessor?.technicalResponsible || "",
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
  
  // Custom chapters creation modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createType, setCreateType] = useState<"continuation" | "main">("continuation");
  const [createParentId, setCreateParentId] = useState<string>("fundamentacao");
  const [createNumber, setCreateNumber] = useState<string>("2.2");
  const [createTitle, setCreateTitle] = useState<string>("");

  // Deletion modal state
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string; isStandard: boolean } | null>(null);

  // Chapter editing (number & title) modal/inline state
  const [isEditingMeta, setIsEditingMeta] = useState(false);
  const [editingTargetChapterId, setEditingTargetChapterId] = useState<string | null>(null);
  const [editingNumberValue, setEditingNumberValue] = useState("");
  const [editingTitleValue, setEditingTitleValue] = useState("");

  // Drag and drop state
  const [draggedChapterId, setDraggedChapterId] = useState<string | null>(null);
  const [dragOverChapterId, setDragOverChapterId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<"before" | "after">("after");

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const customChaptersList = report.customChapters || [];

  const isChapterExcluded = (chapterId: string): boolean => {
    return (report.excludedChapters || []).includes(chapterId);
  };

  const getChapterValue = (chapterId: string): string => {
    if (chapterId === "consideracoes") {
      return report.finalConsiderations || "";
    }
    if (["introducao", "fundamentacao", "metodologia", "referencias"].includes(chapterId)) {
      return report.chapters[chapterId as keyof ReportChapters] || "";
    }
    // Custom chapter
    const custom = customChaptersList.find(c => c.id === chapterId);
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
      const updatedCustoms = customChaptersList.map(c => {
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
    const std = STANDARD_CHAPTERS.find(s => s.id === chapterId);
    if (std) return getStandardChapterTitle(std, report.chapterTitles);

    const custom = customChaptersList.find(c => c.id === chapterId);
    if (custom) return getFullChapterTitle(custom);

    return "Capítulo";
  };

  const getChapterTips = (chapterId: string): string => {
    const std = STANDARD_CHAPTERS.find(s => s.id === chapterId);
    if (std) return std.tip;

    const custom = customChaptersList.find(c => c.id === chapterId);
    if (custom) {
      const level = getChapterLevel(custom);
      if (level >= 2) {
        return `Subseção técnica (${custom.number || "continuação"}). Detalhe evidências qualitativas, modelos científicos ou diretrizes específicas deste tema.`;
      }
      return "Capítulo personalizado do laudo. Utilize variáveis dinâmicas e parágrafos técnicos de acordo com as necessidades da empresa.";
    }

    return "Edite o texto deste capítulo e use as variáveis automáticas abaixo.";
  };

  // Open modal with smart pre-selections
  const handleOpenCreateModal = (presetParentId?: string) => {
    const targetParent = presetParentId || (activeChapterId.startsWith("custom-") ? activeChapterId : "fundamentacao");
    setCreateParentId(targetParent);
    setCreateType("continuation");
    const suggested = suggestNextNumber(targetParent, customChaptersList, "continuation");
    setCreateNumber(suggested);
    setCreateTitle("");
    setIsCreateModalOpen(true);
  };

  // When parent or type changes in modal, recalculate suggested number
  const handleParentChange = (newParent: string) => {
    setCreateParentId(newParent);
    const suggested = suggestNextNumber(newParent, customChaptersList, createType);
    setCreateNumber(suggested);
  };

  const handleTypeChange = (newType: "continuation" | "main") => {
    setCreateType(newType);
    const suggested = suggestNextNumber(createParentId, customChaptersList, newType);
    setCreateNumber(suggested);
  };

  // Create chapter and insert immediately after parent/target
  const handleConfirmCreateChapter = () => {
    if (!createTitle.trim()) return;

    const level = getChapterLevel({ number: createNumber });
    const cleanNumber = createNumber.trim();
    
    // Determine parent chapter id
    let parentSection = detectParentSection({ parentChapterId: createParentId, number: cleanNumber });
    if (createType === "main") {
      parentSection = "end";
    }

    // Calculate insertion order: place immediately after parent/target chapter
    let targetOrder = 1000;
    if (createParentId.startsWith("custom-")) {
      const parentCh = customChaptersList.find(c => c.id === createParentId);
      if (parentCh) {
        targetOrder = parentCh.order + 1;
      }
    } else {
      const baseOrders: Record<string, number> = {
        introducao: 110,
        fundamentacao: 210,
        metodologia: 310,
        consideracoes: 810,
        referencias: 910,
      };
      const base = baseOrders[createParentId] || 950;
      // find highest order in this section
      const siblings = customChaptersList.filter(c => detectParentSection(c) === createParentId);
      if (siblings.length > 0) {
        const maxSib = Math.max(...siblings.map(s => s.order));
        targetOrder = maxSib + 1;
      } else {
        targetOrder = base;
      }
    }

    const newCh: CustomChapter = {
      id: `custom-${Date.now()}`,
      number: cleanNumber,
      title: createTitle.trim(),
      text: "Digite o texto da sua nova seção/capítulo aqui...",
      order: targetOrder,
      parentChapterId: parentSection,
      level,
    };

    // Re-index orders to keep clean spacing
    const updatedCustoms = [...customChaptersList, newCh].sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return compareChapterNumbers(a.number, b.number);
    }).map((ch, idx) => ({ ...ch, order: (idx + 1) * 10 }));

    onChange({ customChapters: updatedCustoms });
    setActiveChapterId(newCh.id);
    setIsCreateModalOpen(false);
    setCreateTitle("");
    setActiveTab("edit");
  };

  // Request delete for standard or custom chapter
  const handleRequestDelete = (chapterId: string, title: string, isStandard: boolean) => {
    setDeleteTarget({ id: chapterId, title, isStandard });
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    const { id, isStandard } = deleteTarget;

    if (isStandard) {
      const updatedExcluded = Array.from(new Set([...(report.excludedChapters || []), id]));
      onChange({ excludedChapters: updatedExcluded });

      if (activeChapterId === id) {
        const nextStd = STANDARD_CHAPTERS.find(s => !updatedExcluded.includes(s.id));
        if (nextStd) {
          setActiveChapterId(nextStd.id);
        } else if (customChaptersList.length > 0) {
          setActiveChapterId(customChaptersList[0].id);
        }
      }
    } else {
      const updatedCustoms = customChaptersList.filter(c => c.id !== id);
      onChange({ customChapters: updatedCustoms });

      if (activeChapterId === id) {
        const nextStd = STANDARD_CHAPTERS.find(s => !isChapterExcluded(s.id));
        if (nextStd) {
          setActiveChapterId(nextStd.id);
        } else if (updatedCustoms.length > 0) {
          setActiveChapterId(updatedCustoms[0].id);
        }
      }
    }

    setDeleteTarget(null);
  };

  const handleRestoreStandardChapter = (chapterId: string) => {
    const updated = (report.excludedChapters || []).filter(id => id !== chapterId);
    onChange({ excludedChapters: updated });
    setActiveChapterId(chapterId);
  };

  // Start editing metadata (number & title for custom, title for standard)
  const handleStartEditingMeta = (targetId?: string) => {
    const chId = targetId || activeChapterId;
    setEditingTargetChapterId(chId);

    const std = STANDARD_CHAPTERS.find(s => s.id === chId);
    if (std) {
      setEditingNumberValue(std.number);
      setEditingTitleValue(report.chapterTitles?.[std.id] || std.label);
      setIsEditingMeta(true);
      return;
    }

    const custom = customChaptersList.find(c => c.id === chId);
    if (custom) {
      setEditingNumberValue(custom.number || "");
      setEditingTitleValue(custom.title || "");
      setIsEditingMeta(true);
      return;
    }
  };

  const handleSaveMeta = () => {
    const targetId = editingTargetChapterId || activeChapterId;
    const cleanTitle = editingTitleValue.trim();
    if (!cleanTitle) return;

    const std = STANDARD_CHAPTERS.find(s => s.id === targetId);
    if (std) {
      onChange({
        chapterTitles: {
          ...(report.chapterTitles || {}),
          [std.id]: cleanTitle,
        },
      });
      setIsEditingMeta(false);
      return;
    }

    const cleanNum = editingNumberValue.trim();
    const level = getChapterLevel({ number: cleanNum });
    const parentSection = detectParentSection({ number: cleanNum });

    const updatedCustoms = customChaptersList.map(c => {
      if (c.id === targetId) {
        return {
          ...c,
          number: cleanNum,
          title: cleanTitle,
          level,
          parentChapterId: parentSection,
        };
      }
      return c;
    });

    onChange({ customChapters: updatedCustoms });
    setIsEditingMeta(false);
  };

  // Quick reorder functions (move up/down)
  const handleMoveChapter = (chapterId: string, direction: "up" | "down", e: React.MouseEvent) => {
    e.stopPropagation();
    const sorted = [...customChaptersList].sort((a, b) => a.order - b.order);
    const index = sorted.findIndex(c => c.id === chapterId);
    if (index === -1) return;

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sorted.length) return;

    // Swap items
    const temp = sorted[index];
    sorted[index] = sorted[targetIndex];
    sorted[targetIndex] = temp;

    const reordered = sorted.map((item, idx) => ({
      ...item,
      order: (idx + 1) * 10
    }));

    onChange({ customChapters: reordered });
  };

  // HTML5 Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, chapterId: string) => {
    e.dataTransfer.setData("text/plain", chapterId);
    e.dataTransfer.effectAllowed = "move";
    setDraggedChapterId(chapterId);
  };

  const handleDragOver = (e: React.DragEvent, targetChapterId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (draggedChapterId === targetChapterId) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    const isTopHalf = offsetY < rect.height / 2;
    const pos = isTopHalf ? "before" : "after";

    setDragOverChapterId(targetChapterId);
    setDropPosition(pos);
  };

  const handleDragLeave = () => {
    setDragOverChapterId(null);
  };

  const handleDrop = (e: React.DragEvent, targetChapterId: string) => {
    e.preventDefault();
    const sourceId = draggedChapterId || e.dataTransfer.getData("text/plain");
    setDraggedChapterId(null);
    setDragOverChapterId(null);

    if (!sourceId || sourceId === targetChapterId) return;

    const sorted = [...customChaptersList].sort((a, b) => a.order - b.order);
    const sourceItem = sorted.find(c => c.id === sourceId);
    if (!sourceItem) return;

    const filtered = sorted.filter(c => c.id !== sourceId);
    const targetIdx = filtered.findIndex(c => c.id === targetChapterId);

    if (targetIdx === -1) {
      filtered.push(sourceItem);
    } else {
      const insertIdx = dropPosition === "before" ? targetIdx : targetIdx + 1;
      filtered.splice(insertIdx, 0, sourceItem);
    }

    // Re-index all orders
    const reordered = filtered.map((item, idx) => ({
      ...item,
      order: (idx + 1) * 10
    }));

    onChange({ customChapters: reordered });
    setShowSavedNotification(true);
    setTimeout(() => setShowSavedNotification(false), 1500);
  };

  const handleDragEnd = () => {
    setDraggedChapterId(null);
    setDragOverChapterId(null);
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

    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + variableKey.length;
    }, 50);
  };

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

  const renderParagraphsWithIndent = (text: string, indent: "none" | "medium" | "large") => {
    if (!text) return <p className="text-slate-400 italic">Capítulo sem texto cadastrado.</p>;
    const paras = text.split(/\n+/);
    const indentCm = indent === "medium" ? "1.5cm" : indent === "large" ? "2.5cm" : "0cm";

    return (
      <div className="space-y-4">
        {paras.map((p, idx) => {
          const trimmed = p.trim();
          if (!trimmed) return null;
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

  // Helper to get custom chapters belonging to a specific section, sorted by order
  const getSubchaptersForSection = (sectionId: string): CustomChapter[] => {
    return customChaptersList
      .filter(ch => detectParentSection(ch) === sectionId)
      .sort((a, b) => {
        if (a.order !== b.order) return a.order - b.order;
        return compareChapterNumbers(a.number, b.number);
      });
  };

  const endCustomChapters = customChaptersList
    .filter(ch => detectParentSection(ch) === "end")
    .sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return compareChapterNumbers(a.number, b.number);
    });

  const activeCustomChapter = customChaptersList.find(c => c.id === activeChapterId);

  return (
    <div className="space-y-6" id="chapters-editor-container">
      {/* Cabeçalho */}
      <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-slate-100 text-slate-800 rounded-xl">
              <BookOpen className="w-5 h-5" />
            </span>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              Editor Profissional de Capítulos & Estrutura do Laudo
            </h3>
          </div>
          <p className="text-xs text-slate-500 max-w-2xl">
            Crie capítulos principais ou subseções contínuas (ex: 2.2, 2.3, 2.3.1). Arraste e solte os capítulos para reordenar livremente o laudo.
          </p>
        </div>

        {/* Controles de Topo: Recuo e Botão Adicionar */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">Recuo:</span>
            <SearchableSelect
              value={report.paragraphIndent || "medium"}
              onChange={(val) => onChange({ paragraphIndent: val as "none" | "medium" | "large" })}
              options={[
                { value: "none", label: "Sem Recuo (0cm)" },
                { value: "medium", label: "Padrão ABNT (1.5cm)" },
                { value: "large", label: "Amplo (2.5cm)" }
              ]}
              placeholder="Recuo"
              className="w-40"
              required
            />
          </div>

          <button
            type="button"
            onClick={() => handleOpenCreateModal()}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4 text-amber-300" />
            Adicionar Capítulo / Continuação
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Menu Lateral Unificado com Drag & Drop e Hierarquia */}
        <div className="lg:col-span-4 bg-white p-4 rounded-2xl border border-slate-150 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <span className="text-xs font-bold text-slate-800 block">Estrutura do Laudo</span>
              <span className="text-[10px] text-slate-400">Arraste os itens para reordenar</span>
            </div>
            <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
              {STANDARD_CHAPTERS.filter(s => !isChapterExcluded(s.id)).length + customChaptersList.length} itens
            </span>
          </div>

          {/* Lista Completa Hierárquica */}
          <div className="space-y-1.5 max-h-[750px] overflow-y-auto pr-1">
            {/* Seção 1: Introdução */}
            {renderStandardSection("introducao", STANDARD_CHAPTERS[0])}

            {/* Seção 2: Fundamentação Teórica (Onde o usuário mais usa continuações 2.2, 2.3, 2.3.1) */}
            {renderStandardSection("fundamentacao", STANDARD_CHAPTERS[1])}

            {/* Seção 3: Metodologia */}
            {renderStandardSection("metodologia", STANDARD_CHAPTERS[2])}

            {/* Divisor Visual de Fases Automáticas */}
            <div className="my-2 p-2.5 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-[10px] text-slate-500 flex items-center gap-2">
              <Layers className="w-4 h-4 text-slate-400 shrink-0" />
              <div className="leading-tight">
                <span className="font-bold text-slate-700 block">Fases Automáticas Tabuladas</span>
                4. Resultados • 5. Devolutivas • 6. Inventário GRO • 7. Cronograma
              </div>
            </div>

            {/* Seção 8: Considerações Finais */}
            {renderStandardSection("consideracoes", STANDARD_CHAPTERS[3])}

            {/* Seção 9: Referências Bibliográficas */}
            {renderStandardSection("referencias", STANDARD_CHAPTERS[4])}

            {/* Capítulos Finais / Independentes (ex: 10. Anexos) */}
            {endCustomChapters.length > 0 && (
              <div className="pt-2 border-t border-slate-100 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 block">
                  Capítulos Adicionais / Anexos
                </span>
                {endCustomChapters.map((ch) => renderCustomChapterItem(ch))}
              </div>
            )}
          </div>

          {/* Lista de Capítulos Oficiais Excluídos (com opção de Restaurar) */}
          {STANDARD_CHAPTERS.filter(s => isChapterExcluded(s.id)).length > 0 && (
            <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200/80 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-amber-900">
                <div className="flex items-center gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                  <span>Capítulos Ocultados ({STANDARD_CHAPTERS.filter(s => isChapterExcluded(s.id)).length})</span>
                </div>
              </div>
              <div className="space-y-1.5">
                {STANDARD_CHAPTERS.filter(s => isChapterExcluded(s.id)).map((std) => (
                  <div key={std.id} className="flex items-center justify-between gap-2 p-2 bg-white rounded-lg border border-amber-200 text-xs shadow-2xs">
                    <span className="truncate text-slate-700 font-medium">
                      {getStandardChapterTitle(std, report.chapterTitles)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRestoreStandardChapter(std.id)}
                      className="flex items-center gap-1 px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-md text-[10px] font-bold transition shrink-0 cursor-pointer"
                      title="Restaurar este capítulo ao laudo"
                    >
                      <RotateCcw className="w-3 h-3" /> Restaurar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Botão de Adição Rápida */}
          <button
            type="button"
            onClick={() => handleOpenCreateModal()}
            className="w-full py-2.5 border-2 border-dashed border-slate-200 hover:border-slate-400 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center justify-center gap-1.5 transition cursor-pointer hover:bg-slate-50"
          >
            <Plus className="w-4 h-4" /> Adicionar Capítulo / Continuação
          </button>
        </div>

        {/* Editor de Texto do Capítulo Ativo */}
        <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-150 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1 min-w-0 flex-1">
              {/* Header do capítulo ativo com edição de título/número */}
              {isEditingMeta ? (
                <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  {activeCustomChapter ? (
                    <div className="w-28 space-y-0.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Número</label>
                      <input
                        type="text"
                        value={editingNumberValue}
                        onChange={(e) => setEditingNumberValue(e.target.value)}
                        placeholder="Ex: 2.2"
                        className="w-full px-2.5 py-1 text-xs border border-slate-300 rounded-lg bg-white font-mono font-bold"
                      />
                    </div>
                  ) : (
                    <div className="w-20 space-y-0.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Capítulo</label>
                      <div className="px-2.5 py-1 text-xs bg-slate-200/80 rounded-lg font-mono font-bold text-slate-700 text-center">
                        {editingNumberValue || "•"}
                      </div>
                    </div>
                  )}
                  <div className="flex-1 min-w-[200px] space-y-0.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Título do Capítulo / Seção</label>
                    <input
                      type="text"
                      value={editingTitleValue}
                      onChange={(e) => setEditingTitleValue(e.target.value)}
                      placeholder="Título da seção..."
                      className="w-full px-2.5 py-1 text-xs border border-slate-300 rounded-lg bg-white font-bold text-slate-900"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 self-end">
                    <button
                      type="button"
                      onClick={handleSaveMeta}
                      className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-black transition cursor-pointer"
                    >
                      Salvar
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingMeta(false)}
                      className="px-2.5 py-1.5 bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-300 transition cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-extrabold text-slate-900 text-base">
                      {getChapterTitle(activeChapterId)}
                    </h4>

                    {/* Botões Universais de Edição e Exclusão no Capítulo Ativo */}
                    <div className="flex items-center gap-1.5 ml-2">
                      <button
                        type="button"
                        onClick={() => handleStartEditingMeta(activeChapterId)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition cursor-pointer"
                        title="Alterar título deste capítulo"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                        <span>Editar Nome</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const isStd = STANDARD_CHAPTERS.some(s => s.id === activeChapterId);
                          handleRequestDelete(activeChapterId, getChapterTitle(activeChapterId), isStd);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 border border-rose-200/60 rounded-lg transition cursor-pointer"
                        title="Excluir este capítulo do laudo"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        <span>Excluir Capítulo</span>
                      </button>
                    </div>
                  </div>

                  {activeCustomChapter && (
                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-mono font-bold">
                        Prefixo: {activeCustomChapter.number || "Sem numeração"}
                      </span>
                      <span>• Nível {activeCustomChapter.level || getChapterLevel(activeCustomChapter)}</span>
                      <span>• Seção: {detectParentSection(activeCustomChapter)}</span>
                    </div>
                  )}
                </div>
              )}

              <p className="text-xs text-slate-500 pt-0.5">
                {getChapterTips(activeChapterId)}
              </p>
            </div>

            {/* Alternância de Abas: Editar vs Pré-visualizar */}
            <div className="flex items-center gap-2 self-start md:self-center shrink-0">
              {showSavedNotification && (
                <span className="text-emerald-600 text-[10px] font-bold flex items-center gap-1 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full animate-in fade-in">
                  <Check className="w-3 h-3" /> Salvo
                </span>
              )}

              <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex gap-1">
                <button
                  type="button"
                  onClick={() => setActiveTab("edit")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    activeTab === "edit"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Code className="w-3.5 h-3.5" /> Editar
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("preview")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    activeTab === "preview"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" /> Visualizar
                </button>
              </div>
            </div>
          </div>

          {activeTab === "edit" ? (
            <div className="space-y-4">
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={getChapterValue(activeChapterId)}
                  onChange={(e) => handleChapterTextChange(e.target.value)}
                  rows={15}
                  className="w-full px-4 py-3.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-400 focus:border-slate-400 outline-none transition text-sm text-slate-800 font-sans leading-relaxed shadow-xs"
                  placeholder="Digite o texto técnico do seu capítulo aqui. Use as variáveis automáticas abaixo para preenchimento dinâmico dos dados cadastrais..."
                />
              </div>

              {/* Botões de Inserção de Variáveis Ocupacionais */}
              <div className="space-y-2.5 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Inserir Variáveis Automáticas no Texto (Clique para colar)</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {autoVariables.map((v) => (
                    <button
                      key={v.key}
                      type="button"
                      onClick={() => handleInsertVariable(v.key)}
                      className="text-left bg-white border border-slate-200 hover:border-slate-400 hover:bg-slate-50 p-2 rounded-lg text-[10px] font-semibold text-slate-700 shadow-2xs hover:shadow-xs transition duration-150 cursor-pointer group"
                      title={`Substitui pelo valor real: "${v.desc}"`}
                    >
                      <span className="font-bold text-slate-900 group-hover:text-indigo-600 block truncate">{v.key}</span>
                      <span className="text-[9px] text-slate-400 truncate block mt-0.5">{v.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl flex gap-3 text-xs text-slate-500">
                <HelpCircle className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <strong>Dica de SST:</strong> Em laudos psicossociais, os capítulos de fundamentação e metodologia sustentam a validade científica das análises. Utilize subseções numeradas (como 2.2, 2.3, 2.3.1) para separar os temas como Karasek, Siegrist, COPSOQ II e diretrizes de intervenção.
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 max-h-[500px] overflow-y-auto shadow-xs bg-white font-serif">
                <div className="border-b border-slate-200 pb-3 mb-4 flex justify-between items-center text-xs text-slate-400 font-bold font-sans">
                  <span>PRÉVIA DE IMPRESSÃO DO LAUDO</span>
                  <span className="uppercase text-slate-600 bg-slate-200/80 px-2 py-0.5 rounded text-[10px]">
                    Recuo: {report.paragraphIndent === "none" ? "Sem Recuo" : report.paragraphIndent === "large" ? "Grande (2.5cm)" : "Padrão ABNT (1.5cm)"}
                  </span>
                </div>
                
                <h3 className="text-base font-extrabold text-slate-900 uppercase tracking-wide border-b border-slate-800 pb-2 mb-4 font-sans">
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
                  <strong>Formatação garantida:</strong> Esta visualização reproduz exatamente os parágrafos recuados, o título hierárquico e as variáveis preenchidas como aparecerão no PDF gerado.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: Criar Novo Capítulo / Continuação (2.2, 2.3, 2.3.1, etc.) */}
      {/* ========================================================================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-white/10 rounded-xl">
                  <Sparkles className="w-5 h-5 text-amber-300" />
                </span>
                <div>
                  <h4 className="font-extrabold text-sm sm:text-base">Adicionar Capítulo ou Continuação</h4>
                  <p className="text-[11px] text-slate-300">
                    Defina se é uma subseção (ex: 2.2, 2.3, 2.3.1) ou um novo capítulo principal
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 text-xs">
              {/* Opção 1: Tipo de Capítulo */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block">
                  1. Tipo de Seção
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleTypeChange("continuation")}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col gap-1 ${
                      createType === "continuation"
                        ? "border-slate-900 bg-slate-50 ring-2 ring-slate-900/10 text-slate-900 font-bold"
                        : "border-slate-200 hover:border-slate-300 text-slate-600 bg-white"
                    }`}
                  >
                    <span className="text-xs flex items-center gap-1.5 font-bold">
                      <CornerDownRight className="w-3.5 h-3.5 text-indigo-600" />
                      Continuação / Subseção
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      Ex: 2.2, 2.3, 2.3.1, 1.1...
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTypeChange("main")}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col gap-1 ${
                      createType === "main"
                        ? "border-slate-900 bg-slate-50 ring-2 ring-slate-900/10 text-slate-900 font-bold"
                        : "border-slate-200 hover:border-slate-300 text-slate-600 bg-white"
                    }`}
                  >
                    <span className="text-xs flex items-center gap-1.5 font-bold">
                      <Layers className="w-3.5 h-3.5 text-slate-600" />
                      Novo Capítulo Principal
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      Ex: 10, Anexo I, Documentos...
                    </span>
                  </button>
                </div>
              </div>

              {/* Opção 2: Vincular ao Capítulo Pai (se for continuação) */}
              {createType === "continuation" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block">
                    2. Vincular / Continuar de Qual Capítulo?
                  </label>
                  <select
                    value={createParentId}
                    onChange={(e) => handleParentChange(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-slate-400"
                  >
                    <optgroup label="Capítulos Oficiais">
                      {STANDARD_CHAPTERS.map(std => (
                        <option key={std.id} value={std.id}>
                          {std.label}
                        </option>
                      ))}
                    </optgroup>
                    {customChaptersList.length > 0 && (
                      <optgroup label="Subseções Existentes (para ramificar ex: 2.3.1)">
                        {customChaptersList.map(ch => (
                          <option key={ch.id} value={ch.id}>
                            {getFullChapterTitle(ch)}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>
              )}

              {/* Opção 3: Numeração / Prefixo da Continuação */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                    {createType === "continuation" ? "3. Numeração da Continuação" : "2. Numeração do Capítulo"}
                  </label>
                  <span className="text-[10px] text-slate-400 font-medium">Você pode alterar livremente</span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={createNumber}
                    onChange={(e) => setCreateNumber(e.target.value)}
                    placeholder="Ex: 2.2 ou 2.3.1"
                    className="w-36 px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-mono font-bold text-slate-900 focus:ring-2 focus:ring-slate-400 outline-none"
                  />
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {createType === "continuation" ? (
                      <>
                        {["2.2", "2.3", "2.3.1", "1.1", "3.1"].map((sug) => (
                          <button
                            key={sug}
                            type="button"
                            onClick={() => setCreateNumber(sug)}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-mono font-bold transition cursor-pointer"
                          >
                            {sug}
                          </button>
                        ))}
                      </>
                    ) : (
                      <>
                        {["10", "Anexo I", "Anexo II"].map((sug) => (
                          <button
                            key={sug}
                            type="button"
                            onClick={() => setCreateNumber(sug)}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold transition cursor-pointer"
                          >
                            {sug}
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Opção 4: Título */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block">
                  {createType === "continuation" ? "4. Título da Continuação / Subseção" : "3. Título do Capítulo"}
                </label>
                <input
                  type="text"
                  required
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  placeholder="Ex: Síndrome de Burnout no Trabalho e Sobrecarga Laboral"
                  className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl bg-white font-semibold text-slate-900 focus:ring-2 focus:ring-slate-400 outline-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleConfirmCreateChapter();
                  }}
                />
              </div>

              {/* Card de Pré-visualização do resultado */}
              {createTitle && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Prévia do Título no Laudo:
                  </span>
                  <div className="font-bold text-slate-900 text-xs">
                    {createNumber.trim() ? `${createNumber.trim()}. ` : ""}{createTitle.trim()}
                  </div>
                  <span className="text-[10px] text-emerald-700 font-medium block">
                    ✓ Ficará posicionado logo após o capítulo selecionado e você poderá arrastar a qualquer momento.
                  </span>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-slate-100 p-4 bg-slate-50 flex items-center justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!createTitle.trim()}
                onClick={handleConfirmCreateChapter}
                className="px-5 py-2 bg-slate-900 hover:bg-black disabled:opacity-50 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                Criar e Começar a Escrever
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal de Confirmação de Exclusão de Capítulo */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-rose-50/60">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-rose-100 text-rose-700 rounded-xl">
                  <Trash2 className="w-5 h-5" />
                </span>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm sm:text-base">
                    Excluir Capítulo do Laudo
                  </h4>
                  <span className="text-[11px] text-rose-700 font-semibold">
                    Confirmação de exclusão
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <p className="text-xs text-slate-600 leading-relaxed">
                Tem certeza que deseja excluir o capítulo <strong className="text-slate-900">"{deleteTarget.title}"</strong>?
              </p>
              {deleteTarget.isStandard ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1">
                  <span className="font-bold block flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    Capítulo Oficial do Laudo
                  </span>
                  <p className="text-[11px] leading-relaxed">
                    Este capítulo será ocultado da emissão impressa, do sumário e da edição. Caso precise utilizá-lo novamente, você poderá restaurá-lo a qualquer momento na seção inferior do menu.
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-1">
                  <span className="font-bold text-slate-700 block">Capítulo Personalizado:</span>
                  <p className="text-[11px] leading-relaxed">
                    O texto redigido e a numeração desta seção serão removidos do laudo.
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                Sim, Excluir Capítulo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Helper to render a standard chapter row with its custom children
  function renderStandardSection(sectionId: string, std: { id: string; label: string; number: string }) {
    const isExcluded = isChapterExcluded(sectionId);
    const subchapters = getSubchaptersForSection(sectionId);

    // If this standard chapter is excluded
    if (isExcluded) {
      if (subchapters.length === 0) return null;
      return (
        <div key={sectionId} className="space-y-1 pl-2">
          {subchapters.map((ch) => renderCustomChapterItem(ch))}
        </div>
      );
    }

    const isActive = activeChapterId === sectionId;
    const currentTitle = report.chapterTitles?.[std.id] || std.label;
    const displayTitle = currentTitle.replace(/^\d+\.\s*/, "");

    return (
      <div key={sectionId} className="space-y-1">
        <div
          onClick={() => {
            setActiveChapterId(sectionId);
            setIsEditingMeta(false);
          }}
          className={`w-full text-left px-2.5 py-2 text-xs rounded-xl transition-all flex items-center justify-between group cursor-pointer ${
            isActive
              ? "bg-slate-900 text-white font-bold shadow-xs"
              : "text-slate-700 hover:bg-slate-50 font-semibold"
          }`}
        >
          <div className="flex items-center gap-1.5 truncate min-w-0 flex-1">
            {/* Botão de Excluir / Lixeira À FRENTE do nome do capítulo */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleRequestDelete(sectionId, currentTitle, true);
              }}
              className={`p-1 rounded-md transition shrink-0 ${
                isActive 
                  ? "text-rose-300 hover:text-white hover:bg-white/20" 
                  : "text-rose-500 hover:text-rose-700 hover:bg-rose-50"
              }`}
              title="Excluir este capítulo do laudo"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>

            {/* Badge do Número */}
            <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-mono font-bold shrink-0 ${
              isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
            }`}>
              {std.number}
            </span>

            {/* Nome do Capítulo */}
            <span className="truncate flex-1 font-semibold" title={currentTitle}>
              {displayTitle}
            </span>

            {/* Botão de Editar Título */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleStartEditingMeta(sectionId);
              }}
              className={`p-1 rounded-md transition shrink-0 ${
                isActive 
                  ? "text-slate-300 hover:text-white hover:bg-white/20" 
                  : "text-slate-400 hover:text-slate-800 hover:bg-slate-150"
              }`}
              title="Editar título do capítulo"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-1 shrink-0 ml-1">
            {/* Botão de adicionar continuação direta */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenCreateModal(sectionId);
              }}
              className={`p-1 rounded-md transition ${
                isActive ? "text-amber-300 hover:bg-white/20" : "text-slate-400 hover:text-slate-800 hover:bg-slate-150"
              }`}
              title={`Adicionar continuação ao capítulo ${std.number} (ex: ${std.number}.2)`}
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isActive ? "text-white rotate-90" : "text-slate-400"}`} />
          </div>
        </div>

        {/* Subcapítulos pertencentes a esta seção */}
        {subchapters.length > 0 && (
          <div className="space-y-1 pl-2">
            {subchapters.map((ch) => renderCustomChapterItem(ch))}
          </div>
        )}
      </div>
    );
  }

  // Helper to render a draggable custom chapter item
  function renderCustomChapterItem(ch: CustomChapter) {
    const isActive = activeChapterId === ch.id;
    const isDragged = draggedChapterId === ch.id;
    const isDragOver = dragOverChapterId === ch.id;
    const level = ch.level || getChapterLevel(ch);

    return (
      <div
        key={ch.id}
        draggable={true}
        onDragStart={(e) => handleDragStart(e, ch.id)}
        onDragOver={(e) => handleDragOver(e, ch.id)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, ch.id)}
        onDragEnd={handleDragEnd}
        onClick={() => {
          setActiveChapterId(ch.id);
          setIsEditingMeta(false);
        }}
        className={`w-full text-left py-1.5 px-2 text-xs rounded-xl transition-all flex items-center justify-between group cursor-pointer relative select-none ${
          level >= 3 ? "ml-3 pl-2.5 border-l-2 border-purple-300" : level === 2 ? "ml-1.5 pl-2.5 border-l-2 border-indigo-300" : ""
        } ${
          isActive
            ? "bg-slate-900 text-white font-bold shadow-xs"
            : "text-slate-700 hover:bg-slate-50 font-medium"
        } ${isDragged ? "opacity-40 ring-2 ring-indigo-400" : ""} ${
          isDragOver && dropPosition === "before" ? "border-t-2 border-indigo-600 bg-indigo-50/50" : ""
        } ${
          isDragOver && dropPosition === "after" ? "border-b-2 border-indigo-600 bg-indigo-50/50" : ""
        }`}
      >
        <div className="flex items-center gap-1.5 truncate min-w-0 flex-1">
          {/* Grip Icon para Drag and Drop */}
          <GripVertical
            className={`w-3.5 h-3.5 shrink-0 cursor-grab active:cursor-grabbing ${
              isActive ? "text-white/60 hover:text-white" : "text-slate-300 group-hover:text-slate-600"
            }`}
            title="Clique e arraste para reordenar"
          />

          {/* Botão de Excluir / Lixeira À FRENTE do nome do capítulo */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleRequestDelete(ch.id, getFullChapterTitle(ch), false);
            }}
            className={`p-1 rounded-md transition shrink-0 ${
              isActive 
                ? "text-rose-300 hover:text-white hover:bg-white/20" 
                : "text-rose-500 hover:text-rose-700 hover:bg-rose-50"
            }`}
            title="Excluir este capítulo do laudo"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          {/* Badge do Número (ex: 2.2, 2.3, 2.3.1) */}
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold shrink-0 ${
            isActive
              ? "bg-white/20 text-white"
              : level >= 3
              ? "bg-purple-100 text-purple-800"
              : level === 2
              ? "bg-indigo-100 text-indigo-800"
              : "bg-slate-100 text-slate-700"
          }`}>
            {ch.number || "•"}
          </span>

          {/* Título do Capítulo */}
          <span className="truncate flex-1" title={getFullChapterTitle(ch)}>
            {ch.title}
          </span>

          {/* Botão de Editar Título */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleStartEditingMeta(ch.id);
            }}
            className={`p-1 rounded-md transition shrink-0 ${
              isActive 
                ? "text-slate-300 hover:text-white hover:bg-white/20" 
                : "text-slate-400 hover:text-slate-800 hover:bg-slate-150"
            }`}
            title="Editar número e título da seção"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Ações Rápidas no Hover: Mover e Subseção */}
        <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
          <button
            type="button"
            onClick={(e) => handleMoveChapter(ch.id, "up", e)}
            className={`p-0.5 rounded transition ${isActive ? "text-white hover:bg-white/20" : "text-slate-400 hover:text-slate-800"}`}
            title="Mover para cima"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => handleMoveChapter(ch.id, "down", e)}
            className={`p-0.5 rounded transition ${isActive ? "text-white hover:bg-white/20" : "text-slate-400 hover:text-slate-800"}`}
            title="Mover para baixo"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenCreateModal(ch.id);
            }}
            className={`p-0.5 rounded transition ${isActive ? "text-amber-300 hover:bg-white/20" : "text-slate-400 hover:text-indigo-600"}`}
            title={`Adicionar subseção filha (ex: ${ch.number ? ch.number + ".1" : "sub"})`}
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }
};
