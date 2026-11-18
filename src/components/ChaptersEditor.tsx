/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { Report, ReportChapters, CustomChapter } from "../types";
import { DEFAULT_CHAPTERS } from "../defaultChapters";
import { 
  BookOpen, 
  Check, 
  Plus, 
  Trash2, 
  Edit3, 
  Sparkles,
  GripVertical,
  ChevronUp,
  ChevronDown,
  X,
  Layers,
  CornerDownRight,
  RotateCcw,
  AlertTriangle
} from "lucide-react";
import { A4DocumentEditor, ContinuousChapterItem } from "./A4DocumentEditor";
import { getImageSync } from "../imageStore";
import {
  cleanChapterTitle,
  getUnifiedChapters,
  getSubtreeRange,
  syncUnifiedChapterNumbers,
  reorderUnifiedChapters,
  moveChapterUpDown,
  UnifiedChapter,
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
    "{nome_fantasia}": report.companyFantasyName || report.companyName || "",
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
  const [activeChapterId, setActiveChapterId] = useState<string>("introducao");
  const [scrollToChapterRequest, setScrollToChapterRequest] = useState<{ id: string; nonce: number } | null>(null);
  const [showSavedNotification, setShowSavedNotification] = useState(false);
  const savedTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (savedTimerRef.current !== null) {
        window.clearTimeout(savedTimerRef.current);
      }
    };
  }, []);
  
  // Custom chapters creation modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createType, setCreateType] = useState<"main" | "continuation">("main");
  const [createInsertPosition, setCreateInsertPosition] = useState<string>("after-active");
  const [createParentId, setCreateParentId] = useState<string>("fundamentacao");
  const [createTitle, setCreateTitle] = useState<string>("");

  // Deletion confirmation modal state
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string; isStandard: boolean } | null>(null);

  // Chapter editing (title) inline state
  const [isEditingMeta, setIsEditingMeta] = useState(false);
  const [editingTargetChapterId, setEditingTargetChapterId] = useState<string | null>(null);
  const [editingTitleValue, setEditingTitleValue] = useState("");

  // Drag and drop state
  const [draggedChapterId, setDraggedChapterId] = useState<string | null>(null);
  const [dragOverChapterId, setDragOverChapterId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<"before" | "after">("after");

  const customChaptersList = report.customChapters || [];
  const reportRef = useRef(report);
  reportRef.current = report;

  // Compute unified dynamic chapters
  const unifiedChapters = getUnifiedChapters(report);
  const visibleChapters = unifiedChapters.filter((c) => !c.isExcluded);
  const excludedChapters = unifiedChapters.filter((c) => c.isExcluded);

  // Fallback if active chapter was excluded or does not exist
  const activeChapter = visibleChapters.find((c) => c.id === activeChapterId) || visibleChapters[0];
  const effectiveActiveId = activeChapter ? activeChapter.id : "introducao";

  const getChapterValue = useCallback(
    (chapterId: string): string => {
      if (chapterId === "consideracoes") {
        return report.finalConsiderations || "";
      }
      if (["introducao", "fundamentacao", "metodologia", "referencias"].includes(chapterId)) {
        const chaptersObj = report.chapters || DEFAULT_CHAPTERS;
        return chaptersObj[chapterId as keyof ReportChapters] || "";
      }
      const custom = customChaptersList.find((c) => c.id === chapterId);
      return custom ? custom.text : "";
    },
    [report.finalConsiderations, report.chapters, customChaptersList]
  );

  const triggerSavedIndicator = useCallback(() => {
    setShowSavedNotification(true);
    if (savedTimerRef.current !== null) {
      window.clearTimeout(savedTimerRef.current);
    }
    savedTimerRef.current = window.setTimeout(() => {
      savedTimerRef.current = null;
      setShowSavedNotification(false);
    }, 1200);
  }, []);

  const handleChapterTextChange = useCallback(
    (targetChapterId: string, text: string) => {
      const latestReport = reportRef.current;
      if (targetChapterId === "consideracoes") {
        onChange({ finalConsiderations: text });
      } else if (["introducao", "fundamentacao", "metodologia", "referencias"].includes(targetChapterId)) {
        onChange({
          chapters: {
            ...(latestReport.chapters || DEFAULT_CHAPTERS),
            [targetChapterId]: text,
          },
        });
      } else {
        const latestCustoms = latestReport.customChapters || [];
        const updatedCustoms = latestCustoms.map((c) => {
          if (c.id === targetChapterId) {
            return { ...c, text };
          }
          return c;
        });
        onChange({ customChapters: updatedCustoms });
      }

      triggerSavedIndicator();
    },
    [onChange, triggerSavedIndicator]
  );

  const continuousChapters = useMemo<ContinuousChapterItem[]>(() => {
    return visibleChapters.map((ch) => ({
      id: ch.id,
      type: ch.type,
      number: ch.number,
      title: ch.title,
      fullTitle: ch.fullTitle,
      level: ch.level,
      value: ch.type === "phases" ? "" : getChapterValue(ch.id),
      tip: ch.tip,
    }));
  }, [visibleChapters, getChapterValue]);

  const editableVisibleChapters = useMemo(
    () => visibleChapters.filter((c) => c.type !== "phases"),
    [visibleChapters]
  );

  // Open modal with smart, validated pre-selections
  const handleOpenCreateModal = (presetParentId?: string) => {
    const firstEditableId = editableVisibleChapters[0]?.id || "introducao";
    const activeRootId = activeChapter?.rootChapterId || activeChapter?.id || "after-active";

    if (presetParentId && presetParentId !== "fases-automaticas") {
      setCreateParentId(presetParentId);
      setCreateType("continuation");
    } else {
      setCreateType("main");
      setCreateInsertPosition(activeRootId);
      if (!editableVisibleChapters.some((c) => c.id === createParentId)) {
        setCreateParentId(firstEditableId);
      }
    }
    setCreateTitle("");
    setIsCreateModalOpen(true);
  };

  // Pure planner used by both live modal preview and actual creation
  const buildInsertionPlan = useCallback(
    (rawTitle: string, forcedId?: string) => {
      const cleanTitle = cleanChapterTitle(rawTitle.trim()) || rawTitle.trim();
      const newId = forcedId || `custom-${Date.now()}`;

      // Preserve all chapters (including excluded) in their exact sequence
      const fullOrder = unifiedChapters.map((c) => c.id);
      const newOrder = [...fullOrder];
      let newCh: CustomChapter;

      if (createType === "main") {
        newCh = {
          id: newId,
          title: cleanTitle,
          text: "",
          order: (newOrder.length + 1) * 10,
          level: 1,
        };

        if (createInsertPosition === "start") {
          newOrder.unshift(newId);
        } else if (createInsertPosition === "end") {
          newOrder.push(newId);
        } else {
          const requestedId =
            createInsertPosition === "after-active" ? effectiveActiveId : createInsertPosition;
          const requestedItem = unifiedChapters.find((c) => c.id === requestedId);
          // Anchor on level-1 root so inserting a main chapter never splits a parent from its subchapters
          const anchorId =
            requestedItem && requestedItem.level > 1 && requestedItem.rootChapterId
              ? requestedItem.rootChapterId
              : requestedId;
          const anchorIdx = unifiedChapters.findIndex((c) => c.id === anchorId);

          if (anchorIdx !== -1) {
            const subtree = getSubtreeRange(unifiedChapters, anchorIdx);
            newOrder.splice(subtree.end + 1, 0, newId);
          } else {
            newOrder.push(newId);
          }
        }
      } else {
        const validParent =
          editableVisibleChapters.find((c) => c.id === createParentId) || editableVisibleChapters[0];
        const parentId = validParent ? validParent.id : "introducao";
        const nextLevel = Math.min(4, (validParent?.level || 1) + 1);

        newCh = {
          id: newId,
          title: cleanTitle,
          text: "",
          order: (newOrder.length + 1) * 10,
          parentChapterId: parentId,
          level: nextLevel,
        };

        const parentIdx = unifiedChapters.findIndex((c) => c.id === parentId);
        if (parentIdx !== -1) {
          const subtree = getSubtreeRange(unifiedChapters, parentIdx);
          newOrder.splice(subtree.end + 1, 0, newId);
        } else {
          newOrder.push(newId);
        }
      }

      const updatedCustoms = [...customChaptersList, newCh];
      const synced = syncUnifiedChapterNumbers({
        ...report,
        chaptersOrder: newOrder,
        customChapters: updatedCustoms,
      });

      const simulatedUnified = getUnifiedChapters({
        ...report,
        chaptersOrder: synced.chaptersOrder,
        customChapters: synced.customChapters,
      });
      const createdPreview = simulatedUnified.find((c) => c.id === newId);

      return { newId, synced, createdPreview };
    },
    [
      unifiedChapters,
      createType,
      createInsertPosition,
      effectiveActiveId,
      editableVisibleChapters,
      createParentId,
      customChaptersList,
      report,
    ]
  );

  const previewChapterResult = useMemo(() => {
    if (!isCreateModalOpen || !createTitle.trim()) return null;
    return buildInsertionPlan(createTitle, "preview-new-chapter").createdPreview || null;
  }, [isCreateModalOpen, createTitle, buildInsertionPlan]);

  // Create chapter and insert immediately in unified flow
  const handleConfirmCreateChapter = () => {
    if (!createTitle.trim()) return;

    const { newId, synced } = buildInsertionPlan(createTitle);

    onChange({
      chaptersOrder: synced.chaptersOrder,
      customChapters: synced.customChapters,
    });

    setActiveChapterId(newId);
    setScrollToChapterRequest({ id: newId, nonce: Date.now() });
    setIsCreateModalOpen(false);
    setCreateTitle("");
    triggerSavedIndicator();
  };

  // Request delete for standard or custom chapter
  const handleRequestDelete = (chapterId: string, title: string, isStandard: boolean) => {
    setDeleteTarget({ id: chapterId, title, isStandard });
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    const { id } = deleteTarget;

    const updatedExcluded = Array.from(new Set([...(report.excludedChapters || []), id]));
    onChange({ excludedChapters: updatedExcluded });

    if (effectiveActiveId === id) {
      const remaining = visibleChapters.filter((c) => c.id !== id && c.type !== "phases");
      if (remaining.length > 0) {
        setActiveChapterId(remaining[0].id);
      }
    }

    setDeleteTarget(null);
  };

  const handleRestoreChapter = (chapterId: string) => {
    const updated = (report.excludedChapters || []).filter((id) => id !== chapterId);
    onChange({ excludedChapters: updated });
    setActiveChapterId(chapterId);
    setScrollToChapterRequest({ id: chapterId, nonce: Date.now() });
  };

  // Start editing title
  const handleStartEditingMeta = (targetId?: string) => {
    const chId = targetId || effectiveActiveId;
    setEditingTargetChapterId(chId);

    const ch = unifiedChapters.find((c) => c.id === chId);
    if (ch) {
      setEditingTitleValue(ch.title);
      setIsEditingMeta(true);
    }
  };

  const handleSaveMeta = () => {
    const targetId = editingTargetChapterId || effectiveActiveId;
    const cleanTitle = cleanChapterTitle(editingTitleValue.trim()) || editingTitleValue.trim();
    if (!cleanTitle) return;

    if (["introducao", "fundamentacao", "metodologia", "consideracoes", "referencias"].includes(targetId)) {
      onChange({
        chapterTitles: {
          ...(report.chapterTitles || {}),
          [targetId]: cleanTitle,
        },
      });
    } else {
      const updatedCustoms = customChaptersList.map((c) => {
        if (c.id === targetId) {
          return {
            ...c,
            title: cleanTitle,
          };
        }
        return c;
      });
      onChange({ customChapters: updatedCustoms });
    }

    setIsEditingMeta(false);
  };

  // Quick reorder functions (move up/down)
  const handleMoveChapter = (chapterId: string, direction: "up" | "down", e: React.MouseEvent) => {
    e.stopPropagation();
    const { chaptersOrder, customChapters } = moveChapterUpDown(report, chapterId, direction);
    onChange({ chaptersOrder, customChapters });
    triggerSavedIndicator();
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

    const { chaptersOrder, customChapters } = reorderUnifiedChapters(
      report,
      sourceId,
      targetChapterId,
      dropPosition
    );

    onChange({ chaptersOrder, customChapters });
    triggerSavedIndicator();
  };

  const handleDragEnd = () => {
    setDraggedChapterId(null);
    setDragOverChapterId(null);
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

  // Resolve active assessor & client logos with instant cached fallback for A4 preview header
  const effectiveAssessor = {
    ...(report.evaluator || assessor),
    logo:
      (report.evaluator?.logo && report.evaluator.logo !== "[OMITTED_IMAGE_FOR_CACHE]"
        ? report.evaluator.logo
        : assessor.logo && assessor.logo !== "[OMITTED_IMAGE_FOR_CACHE]"
        ? assessor.logo
        : getImageSync("assessor_logo")) || "",
  };

  const resolvedCompanyLogo = (() => {
    if (report.companyLogo && report.companyLogo !== "[OMITTED_IMAGE_FOR_CACHE]") {
      return report.companyLogo;
    }
    try {
      const storedCompanies = localStorage.getItem("sst_psicossocial_companies");
      if (storedCompanies) {
        const companies = JSON.parse(storedCompanies);
        const match = companies.find(
          (c: any) =>
            (c.cnpj && c.cnpj === report.companyCnpj) ||
            (c.fantasyName && c.fantasyName.toLowerCase() === (report.companyName || "").toLowerCase()) ||
            (c.name && c.name.toLowerCase() === (report.companyName || "").toLowerCase())
        );
        if (match?.logo && match.logo !== "[OMITTED_IMAGE_FOR_CACHE]") {
          return match.logo;
        }
      }
    } catch {
      // ignore storage parse error
    }
    return "";
  })();

  // Render a unified row in the sidebar list
  const renderUnifiedChapterRow = (ch: UnifiedChapter) => {
    // If it's the automated phases block
    if (ch.type === "phases") {
      const isActive = effectiveActiveId === ch.id;
      const isDragged = draggedChapterId === ch.id;
      const isDragOver = dragOverChapterId === ch.id;

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
            setScrollToChapterRequest({ id: ch.id, nonce: Date.now() });
            setIsEditingMeta(false);
          }}
          className={`my-2 p-2.5 rounded-xl border border-dashed text-xs transition select-none flex items-center justify-between group cursor-pointer ${
            isActive
              ? "bg-slate-900 border-slate-900 text-white shadow-xs"
              : "bg-slate-50 border-slate-200 hover:border-slate-300"
          } ${
            isDragged ? "opacity-40 ring-2 ring-indigo-400" : ""
          } ${isDragOver && dropPosition === "before" ? "border-t-2 border-indigo-600 bg-indigo-50/50" : ""} ${
            isDragOver && dropPosition === "after" ? "border-b-2 border-indigo-600 bg-indigo-50/50" : ""
          }`}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <GripVertical
              className={`w-3.5 h-3.5 cursor-grab shrink-0 ${
                isActive ? "text-white/60 hover:text-white" : "text-slate-300 group-hover:text-slate-600"
              }`}
              title="Arraste para reposicionar as Fases Automáticas"
            />
            <span
              className={`w-10 h-5 rounded-md font-mono font-bold text-[10px] flex items-center justify-center shrink-0 ${
                isActive ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
              }`}
            >
              {ch.number}
            </span>
            <div className="leading-tight truncate">
              <span className={`font-bold block text-xs truncate ${isActive ? "text-white" : "text-slate-700"}`}>
                Fases Automáticas Tabuladas
              </span>
              <span className={`text-[10px] block truncate ${isActive ? "text-slate-300" : "text-slate-400"}`}>
                Resultados · Devolutivas · GRO · Ações
              </span>
            </div>
          </div>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={(e) => handleMoveChapter(ch.id, "up", e)}
              className={`p-1 rounded transition cursor-pointer ${
                isActive ? "text-white hover:bg-white/20" : "text-slate-400 hover:text-slate-800"
              }`}
              title="Mover para cima"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={(e) => handleMoveChapter(ch.id, "down", e)}
              className={`p-1 rounded transition cursor-pointer ${
                isActive ? "text-white hover:bg-white/20" : "text-slate-400 hover:text-slate-800"
              }`}
              title="Mover para baixo"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      );
    }

    const isActive = effectiveActiveId === ch.id;
    const isDragged = draggedChapterId === ch.id;
    const isDragOver = dragOverChapterId === ch.id;
    const level = ch.level || 1;

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
          setScrollToChapterRequest({ id: ch.id, nonce: Date.now() });
          setIsEditingMeta(false);
        }}
        className={`w-full text-left py-2 px-2.5 text-xs rounded-xl transition-all flex items-center justify-between group cursor-pointer relative select-none ${
          level >= 3
            ? "ml-4 pl-3 border-l-2 border-purple-300"
            : level === 2
            ? "ml-2 pl-3 border-l-2 border-indigo-300"
            : ""
        } ${
          isActive
            ? "bg-slate-900 text-white font-bold shadow-xs"
            : "text-slate-700 hover:bg-slate-50 font-semibold"
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
            title="Clique e arraste para reordenar o capítulo"
          />

          {/* Botão de Excluir / Lixeira À FRENTE do nome do capítulo */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleRequestDelete(ch.id, ch.fullTitle, ch.type === "standard");
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

          {/* Badge do Número Dinâmico */}
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold shrink-0 min-w-5 text-center ${
              isActive
                ? "bg-white/20 text-white"
                : level >= 3
                ? "bg-purple-100 text-purple-800"
                : level === 2
                ? "bg-indigo-100 text-indigo-800"
                : "bg-slate-100 text-slate-700"
            }`}
          >
            {ch.number}
          </span>

          {/* Nome do Capítulo */}
          <span className="truncate flex-1 font-semibold" title={ch.fullTitle}>
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
            title="Editar nome deste capítulo"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Ações Rápidas à Direita: Reordenar e Adicionar Continuação */}
        <div className="flex items-center gap-0.5 shrink-0 ml-1">
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={(e) => handleMoveChapter(ch.id, "up", e)}
              className={`p-0.5 rounded transition cursor-pointer ${
                isActive ? "text-white hover:bg-white/20" : "text-slate-400 hover:text-slate-800"
              }`}
              title="Mover para cima"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={(e) => handleMoveChapter(ch.id, "down", e)}
              className={`p-0.5 rounded transition cursor-pointer ${
                isActive ? "text-white hover:bg-white/20" : "text-slate-400 hover:text-slate-800"
              }`}
              title="Mover para baixo"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenCreateModal(ch.id);
            }}
            className={`p-1 rounded-md transition cursor-pointer ${
              isActive
                ? "text-amber-300 hover:bg-white/20"
                : "text-slate-400 hover:text-slate-800 hover:bg-slate-150"
            }`}
            title={`Adicionar continuação / subseção a este capítulo`}
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5" id="chapters-editor-container">
      {/* Cabeçalho */}
      <div className="bg-white px-5 py-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-slate-100 text-slate-800 rounded-xl">
              <BookOpen className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                Editor de Capítulos & Documento Paginado A4
              </h3>
              <p className="text-xs text-slate-500">
                Role livremente pelo laudo completo em folhas A4, navegue pelos capítulos ao lado ou alterne para a Visualização Real.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => handleOpenCreateModal()}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition shadow-xs whitespace-nowrap shrink-0 cursor-pointer self-start sm:self-center"
        >
          <Plus className="w-4 h-4 text-amber-300" />
          Adicionar Capítulo
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-5 items-start">
        {/* Menu Lateral Unificado com Drag & Drop e Numeração Dinâmica */}
        <div className="w-full lg:w-[295px] xl:w-[315px] shrink-0 lg:sticky lg:top-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <span className="text-xs font-bold text-slate-800 block">Estrutura Linear do Laudo</span>
              <span className="text-[10px] text-slate-400">Arraste para reordenar (numeração automática)</span>
            </div>
            <span className="text-xs font-mono font-semibold text-slate-500 tabular-nums">
              {visibleChapters.length} cap.
            </span>
          </div>

          {/* Lista Unificada Draggable */}
          <div className="space-y-1.5 max-h-[650px] overflow-y-auto pr-1">
            {visibleChapters.map((ch) => renderUnifiedChapterRow(ch))}
          </div>

          {/* Lista de Capítulos Oficiais Excluídos (com opção de Restaurar) */}
          {excludedChapters.length > 0 && (
            <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200/80 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-amber-900">
                <div className="flex items-center gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                  <span>Capítulos Ocultados ({excludedChapters.length})</span>
                </div>
              </div>
              <div className="space-y-1.5">
                {excludedChapters.map((ch) => (
                  <div key={ch.id} className="flex items-center justify-between gap-2 p-2 bg-white rounded-lg border border-amber-200 text-xs shadow-2xs">
                    <span className="truncate text-slate-700 font-medium">
                      {ch.title}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRestoreChapter(ch.id)}
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

        {/* Editor Paginado de Documento A4 (Estilo Google Docs / Word) */}
        <div className="flex-1 min-w-0 w-full space-y-3">
          {/* Painel Inline de Edição de Nome do Capítulo quando ativado */}
          {isEditingMeta && (
            <div className="flex flex-wrap items-center gap-2 p-3.5 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <div className="w-20 space-y-0.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Capítulo</label>
                <div className="px-2.5 py-1.5 text-xs bg-slate-100 rounded-lg font-mono font-bold text-slate-700 text-center">
                  {unifiedChapters.find((c) => c.id === editingTargetChapterId)?.number || activeChapter?.number || "•"}
                </div>
              </div>
              <div className="flex-1 min-w-[200px] space-y-0.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Título do Capítulo / Seção</label>
                <input
                  type="text"
                  value={editingTitleValue}
                  onChange={(e) => setEditingTitleValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveMeta();
                    if (e.key === "Escape") setIsEditingMeta(false);
                  }}
                  placeholder="Título da seção..."
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-bold text-slate-900 focus:ring-2 focus:ring-slate-400 outline-none"
                  autoFocus
                />
              </div>
              <div className="flex items-center gap-1.5 self-end">
                <button
                  type="button"
                  onClick={handleSaveMeta}
                  className="px-3.5 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-black transition cursor-pointer"
                >
                  Salvar Nome
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingMeta(false)}
                  className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200 transition cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          <A4DocumentEditor
            key={report.id}
            chapters={continuousChapters}
            activeChapterId={effectiveActiveId}
            scrollToChapterRequest={scrollToChapterRequest}
            onActiveChapterChange={setActiveChapterId}
            onChangeChapterText={handleChapterTextChange}
            paragraphIndent={report.paragraphIndent || "medium"}
            onChangeIndent={(indent) => onChange({ paragraphIndent: indent })}
            pageMarginCm={report.pageMargin || "2.5"}
            onChangeMargin={(margin) => onChange({ pageMargin: margin })}
            resolvePreviewText={(raw) => replaceTemplateVariables(raw, report, assessor)}
            autoVariables={autoVariables}
            report={report}
            assessor={effectiveAssessor}
            companyName={report.companyName}
            companyLogo={resolvedCompanyLogo}
            showSavedNotification={showSavedNotification}
            onEditChapterTitle={(chId) => handleStartEditingMeta(chId)}
            onDeleteChapter={(chId, fullTitle, isStandard) =>
              handleRequestDelete(chId, fullTitle, isStandard)
            }
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: Criar Novo Capítulo Oficial / Continuação                          */}
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
                  <h4 className="font-extrabold text-sm sm:text-base">Adicionar Capítulo Oficial</h4>
                  <p className="text-[11px] text-slate-300">
                    Crie um novo capítulo principal ou uma subseção vinculada ao laudo
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
                  1. O que deseja adicionar?
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setCreateType("main")}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col gap-1 ${
                      createType === "main"
                        ? "border-slate-900 bg-slate-50 ring-2 ring-slate-900/10 text-slate-900 font-bold"
                        : "border-slate-200 hover:border-slate-300 text-slate-600 bg-white"
                    }`}
                  >
                    <span className="text-xs flex items-center gap-1.5 font-bold">
                      <Layers className="w-3.5 h-3.5 text-slate-900" />
                      Novo Capítulo Principal
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      Capítulo oficial integrado à numeração geral
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCreateType("continuation")}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col gap-1 ${
                      createType === "continuation"
                        ? "border-slate-900 bg-slate-50 ring-2 ring-slate-900/10 text-slate-900 font-bold"
                        : "border-slate-200 hover:border-slate-300 text-slate-600 bg-white"
                    }`}
                  >
                    <span className="text-xs flex items-center gap-1.5 font-bold">
                      <CornerDownRight className="w-3.5 h-3.5 text-indigo-600" />
                      Subseção / Continuação
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      Subcapítulo técnico (ex: 2.1, 2.2, 2.3)
                    </span>
                  </button>
                </div>
              </div>

              {/* Opção 2A: Se for Capítulo Principal, onde inserir? */}
              {createType === "main" ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block">
                    2. Posição no Laudo
                  </label>
                  <select
                    value={createInsertPosition}
                    onChange={(e) => setCreateInsertPosition(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-slate-400"
                  >
                    <option value="after-active">Logo após o capítulo atual ({activeChapter?.title || "Atual"})</option>
                    <option value="end">No final do laudo</option>
                    <option value="start">No início do laudo (antes do primeiro capítulo)</option>
                    <optgroup label="Inserir após capítulo principal específico:">
                      {visibleChapters
                        .filter((c) => c.level === 1)
                        .map((ch) => (
                          <option key={ch.id} value={ch.id}>
                            Após {ch.fullTitle}
                          </option>
                        ))}
                    </optgroup>
                  </select>
                </div>
              ) : (
                /* Opção 2B: Se for Continuação, vincular a qual capítulo pai? */
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block">
                    2. Vincular a qual Capítulo Pai?
                  </label>
                  <select
                    value={createParentId}
                    onChange={(e) => setCreateParentId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-slate-400"
                  >
                    {editableVisibleChapters
                      .filter((c) => c.level < 4)
                      .map((ch) => (
                        <option key={ch.id} value={ch.id}>
                          {ch.level > 1 ? `${"— ".repeat(ch.level - 1)}${ch.fullTitle}` : ch.fullTitle}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {/* Opção 3: Título */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block">
                  3. Título do Capítulo / Seção
                </label>
                <input
                  type="text"
                  required
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  placeholder={createType === "main" ? "Ex: Diretrizes e Políticas de Saúde Mental" : "Ex: Síndrome de Burnout no Trabalho"}
                  className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl bg-white font-semibold text-slate-900 focus:ring-2 focus:ring-slate-400 outline-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleConfirmCreateChapter();
                  }}
                />
              </div>

              {/* Card de Pré-visualização com numeração real prevista */}
              {createTitle.trim() && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Prévia da Numeração e Título no Laudo:
                  </span>
                  <div className="font-bold text-slate-900 text-xs">
                    {previewChapterResult?.fullTitle ||
                      cleanChapterTitle(createTitle.trim()) ||
                      createTitle.trim()}
                  </div>
                  <span className="text-[10px] text-emerald-700 font-medium block">
                    ✓ Numeração e posição calculadas automaticamente no editor A4 e no sumário.
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
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1">
                <span className="font-bold block flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  Atualização Dinâmica de Numeração
                </span>
                <p className="text-[11px] leading-relaxed">
                  Este capítulo será ocultado da emissão impressa, do sumário e da edição. A numeração de todos os outros capítulos será reajustada automaticamente. Você poderá restaurá-lo a qualquer momento na seção inferior do menu.
                </p>
              </div>
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
};
