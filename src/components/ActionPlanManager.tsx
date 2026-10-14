/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Report, RiskInventoryItem } from "../types";
import { ClipboardList, Edit2, Check, X, Trash2, Target, HelpCircle, User, Calendar, Shield, Bookmark, CheckSquare, Clock, Sparkles, Wand2, Loader2, AlertCircle } from "lucide-react";
import { SearchableSelect } from "./SearchableSelect";
import { generateActionPlanSchedule, ActionPlanScheduleItem, enrichRiskItem } from "../aiService";

interface ActionPlanManagerProps {
  report: Report;
  onChange: (updatedReport: Partial<Report>) => void;
}

export const ActionPlanManager: React.FC<ActionPlanManagerProps> = ({ report, onChange }) => {
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);

  // AI Schedule Modal and States
  const [showAIScheduleModal, setShowAIScheduleModal] = useState(false);
  const [isGeneratingAISchedule, setIsGeneratingAISchedule] = useState(false);
  const [aiScheduleError, setAiScheduleError] = useState<string | null>(null);
  const [aiScheduleSuccess, setAiScheduleSuccess] = useState(false);
  const [proposedSchedule, setProposedSchedule] = useState<ActionPlanScheduleItem[]>([]);
  const [selectedScheduleIds, setSelectedScheduleIds] = useState<string[]>([]);
  const [isOptimizingSingle, setIsOptimizingSingle] = useState(false);

  const handleDeleteItem = (id: string) => {
    onChange({
      riskInventory: report.riskInventory.filter((item) => item.id !== id)
    });
  };

  // Edit Fields State
  const [actionObjective, setActionObjective] = useState("");
  const [actionProposed, setActionProposed] = useState("");
  const [responsible, setResponsible] = useState("");
  const [priority, setPriority] = useState<RiskInventoryItem["priority"]>("Média");
  const [periodicity, setPeriodicity] = useState("");
  const [status, setStatus] = useState<RiskInventoryItem["status"]>("Pendente");
  const [efficacyIndicator, setEfficacyIndicator] = useState("");
  const [deadline, setDeadline] = useState("");

  const handleGenerateAISchedule = async () => {
    if (report.riskInventory.length === 0) return;
    setIsGeneratingAISchedule(true);
    setAiScheduleError(null);

    try {
      const planned = await generateActionPlanSchedule({
        companyName: report.companyName,
        companyActivity: report.companySector,
        items: report.riskInventory.map((item) => {
          const sect = report.sectors.find((s) => s.id === item.sectorId);
          return {
            id: item.id,
            riskName: item.riskName,
            sectorName: sect ? sect.name : "Geral",
            riskLevel: item.riskLevel,
            riskScore: item.riskScore,
            recommendation: item.recommendation || item.actionProposed,
          };
        }),
      });

      setProposedSchedule(planned);
      setSelectedScheduleIds(planned.map((p) => p.id));
    } catch (err: any) {
      console.error(err);
      setAiScheduleError(err.message || "Erro ao gerar cronograma e plano de ação com IA.");
    } finally {
      setIsGeneratingAISchedule(false);
    }
  };

  const handleApplyAISchedule = () => {
    const updatedInventory = report.riskInventory.map((item) => {
      const match = proposedSchedule.find((p) => p.id === item.id);
      if (match && selectedScheduleIds.includes(item.id)) {
        return {
          ...item,
          actionObjective: match.actionObjective,
          actionProposed: match.actionProposed,
          recommendation: match.actionProposed,
          responsible: match.responsible,
          priority: match.priority,
          periodicity: match.periodicity,
          deadline: match.deadline,
          efficacyIndicator: match.efficacyIndicator,
        };
      }
      return item;
    });

    onChange({ riskInventory: updatedInventory });
    setShowAIScheduleModal(false);
    setAiScheduleSuccess(true);
    setTimeout(() => setAiScheduleSuccess(false), 5000);
  };

  const handleOptimizeSingleItemWithAI = async (item: RiskInventoryItem) => {
    setIsOptimizingSingle(true);
    try {
      const sect = report.sectors.find((s) => s.id === item.sectorId);
      const enriched = await enrichRiskItem({
        riskName: item.riskName,
        sectorName: sect ? sect.name : "Geral",
        companyName: report.companyName,
        companyActivity: report.companySector,
      });

      if (enriched) {
        if (enriched.actionObjective) setActionObjective(enriched.actionObjective);
        if (enriched.actionProposed) setActionProposed(enriched.actionProposed);
        if (enriched.priority) setPriority(enriched.priority);
        if (enriched.periodicity) setPeriodicity(enriched.periodicity);
        if (enriched.efficacyIndicator) setEfficacyIndicator(enriched.efficacyIndicator);
        if (enriched.deadline) setDeadline(enriched.deadline);
      }
    } catch (err: any) {
      console.error("Erro ao otimizar ação com IA:", err);
    } finally {
      setIsOptimizingSingle(false);
    }
  };

  const startEditing = (item: RiskInventoryItem) => {
    setEditingItemId(item.id);
    setActionObjective(item.actionObjective || "");
    setActionProposed(item.actionProposed || item.recommendation || "");
    setResponsible(item.responsible || "Liderança e Gestores");
    setPriority(item.priority || "Média");
    setPeriodicity(item.periodicity || "Mensal");
    setStatus(item.status || "Pendente");
    setEfficacyIndicator(item.efficacyIndicator || "Feedbacks formais periódicos");
    setDeadline(item.deadline || "Mês Corrente + 3");
  };

  const saveEdit = (id: string) => {
    const updatedInventory = report.riskInventory.map((item) => {
      if (item.id === id) {
        return {
          ...item,
          actionObjective: actionObjective.trim(),
          actionProposed: actionProposed.trim(),
          recommendation: actionProposed.trim(), // Keep preventive recommendation synced
          responsible: responsible.trim(),
          priority,
          periodicity: periodicity.trim(),
          status,
          efficacyIndicator: efficacyIndicator.trim(),
          deadline: deadline.trim(),
        };
      }
      return item;
    });

    onChange({ riskInventory: updatedInventory });
    setEditingItemId(null);
  };

  const getSectorName = (sectorId: string) => {
    const s = report.sectors.find((sect) => sect.id === sectorId);
    return s ? s.name : "Setor não identificado";
  };

  const getPriorityBadge = (p: RiskInventoryItem["priority"]) => {
    switch (p) {
      case "Alta":
        return "bg-rose-50 text-rose-800 border-rose-200";
      case "Média":
        return "bg-amber-50 text-amber-800 border-amber-200";
      case "Baixa":
        return "bg-blue-50 text-blue-800 border-blue-200";
    }
  };

  const getStatusBadge = (s: RiskInventoryItem["status"]) => {
    switch (s) {
      case "Concluído":
        return "bg-emerald-50 text-emerald-800 border-emerald-200";
      case "Em Andamento":
        return "bg-orange-50 text-orange-800 border-orange-200";
      case "Pendente":
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="space-y-6" id="action-plan-manager">
      {/* Título e Botão IA */}
      <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-md font-semibold text-slate-800 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-slate-600" />
            Cronograma e Plano de Ação (5W2H)
          </h3>
          <p className="text-xs text-slate-500">
            Gerencie e acompanhe as ações corretivas/preventivas vinculadas aos riscos detectados no laudo.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setShowAIScheduleModal(true);
            if (proposedSchedule.length === 0) {
              handleGenerateAISchedule();
            }
          }}
          disabled={report.riskInventory.length === 0}
          className="flex items-center justify-center gap-1.5 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 px-4 py-2.5 rounded-lg transition-all cursor-pointer shadow-xs disabled:opacity-50"
          title="Estruturar cronograma escalonado e plano de ação 5W2H para todos os riscos do inventário com IA"
        >
          <Sparkles className="w-4 h-4 text-amber-300" />
          Gerar Cronograma e Plano 5W2H com IA
        </button>
      </div>

      {aiScheduleSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          Cronograma de 12 meses e Plano de Ação 5W2H atualizados com sucesso pela Inteligência Artificial!
        </div>
      )}

      {/* Lista do Plano de Ação */}
      <div className="space-y-4">
        {report.riskInventory.length === 0 ? (
          <div className="bg-white p-12 text-center text-slate-400 text-sm rounded-2xl border border-slate-100">
            Nenhum plano de ação gerado ainda. Primeiro, adicione riscos ao seu <strong>Inventário de Riscos</strong>.
          </div>
        ) : (
          /* Visualização de Cards Individuais */
          report.riskInventory.map((item) => {
            const isEditing = editingItemId === item.id;

            return (
              <div
                key={item.id}
                className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden ${
                  isEditing ? "border-slate-300 ring-2 ring-slate-100" : "border-slate-100 hover:border-slate-200 shadow-xs"
                }`}
              >
                {/* Header do Card */}
                <div className="bg-slate-50/50 px-6 py-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] bg-slate-800 text-white font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider">
                        Setor: {getSectorName(item.sectorId)}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        Risco Associado: {item.riskName}
                      </span>
                    </div>
                  </div>

                  {/* Badges de Gestão e Controles */}
                  <div className="flex items-center gap-2 self-start md:self-center">
                    {isEditing ? (
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Prioridade:</label>
                          <SearchableSelect
                            value={priority}
                            onChange={(val) => setPriority(val as any)}
                            options={[
                              { value: "Baixa", label: "Baixa" },
                              { value: "Média", label: "Média" },
                              { value: "Alta", label: "Alta" }
                            ]}
                            placeholder="Prioridade"
                            className="w-28"
                            required
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Status:</label>
                          <SearchableSelect
                            value={status}
                            onChange={(val) => setStatus(val as any)}
                            options={[
                              { value: "Pendente", label: "Pendente" },
                              { value: "Em Andamento", label: "Em Andamento" },
                              { value: "Concluído", label: "Concluído" }
                            ]}
                            placeholder="Status"
                            className="w-36"
                            required
                          />
                        </div>
                      </div>
                    ) : (
                      <>
                        <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-extrabold uppercase ${getPriorityBadge(item.priority)}`}>
                          Prioridade: {item.priority}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-extrabold uppercase ${getStatusBadge(item.status)}`}>
                          Status: {item.status}
                        </span>
                      </>
                    )}

                    {/* Botões de Ação */}
                    <div className="ml-2 pl-2 border-l border-slate-200 flex items-center gap-1">
                      {isEditing ? (
                        <>
                          <button
                            type="button"
                            onClick={() => saveEdit(item.id)}
                            className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                            title="Salvar Alterações"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingItemId(null)}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                            title="Cancelar Edição"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => startEditing(item)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                            title="Editar Ação"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {deletingItemId === item.id ? (
                            <div className="flex items-center gap-1 bg-rose-50 border border-rose-200 p-0.5 rounded-md">
                              <span className="text-[9px] font-bold text-rose-800 px-1">Excluir?</span>
                              <button
                                type="button"
                                onClick={() => {
                                  handleDeleteItem(item.id);
                                  setDeletingItemId(null);
                                }}
                                className="text-[9px] font-black text-rose-700 hover:text-rose-900 bg-rose-100/50 px-1.5 py-0.5 rounded cursor-pointer"
                              >
                                Sim
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingItemId(null)}
                                className="text-[9px] font-bold text-slate-500 hover:text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded cursor-pointer"
                              >
                                Não
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setDeletingItemId(item.id)}
                              className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                              title="Excluir Risco e Ação"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Conteúdo do Card */}
                <div className="p-6">
                  {isEditing ? (
                    <div className="space-y-4 text-xs">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                            <Target className="w-3.5 h-3.5 text-slate-400" /> Objetivo da Ação
                          </label>
                          <input
                            type="text"
                            value={actionObjective}
                            onChange={(e) => setActionObjective(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-slate-400"
                            placeholder="Ex: Minimizar danos e cansaço mental."
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                              <Shield className="w-3.5 h-3.5 text-slate-400" /> Medida Recomendada / Ação Proposta
                            </label>
                            <button
                              type="button"
                              disabled={isOptimizingSingle}
                              onClick={() => handleOptimizeSingleItemWithAI(item)}
                              className="text-[10px] font-bold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2 py-0.5 rounded flex items-center gap-1 transition cursor-pointer disabled:opacity-50"
                              title="Preencher objetivo, ação, prazos e indicadores com IA para este risco"
                            >
                              {isOptimizingSingle ? (
                                <>
                                  <Loader2 className="w-3 h-3 animate-spin text-purple-600" />
                                  Otimizando...
                                </>
                              ) : (
                                <>
                                  <Sparkles className="w-3 h-3 text-purple-600" />
                                  Otimizar com IA
                                </>
                              )}
                            </button>
                          </div>
                          <textarea
                            value={actionProposed}
                            onChange={(e) => setActionProposed(e.target.value)}
                            rows={1}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-slate-400 resize-none"
                            placeholder="Ex: Oferecer horários alternativos e pausas programadas."
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                            <User className="w-3.5 h-3.5 text-slate-400" /> Responsável
                          </label>
                          <input
                            type="text"
                            value={responsible}
                            onChange={(e) => setResponsible(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" /> Periodicidade
                          </label>
                          <input
                            type="text"
                            value={periodicity}
                            onChange={(e) => setPeriodicity(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                            <CheckSquare className="w-3.5 h-3.5 text-slate-400" /> Indicador de Eficácia
                          </label>
                          <input
                            type="text"
                            value={efficacyIndicator}
                            onChange={(e) => setEfficacyIndicator(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" /> Prazo Final
                          </label>
                          <input
                            type="text"
                            value={deadline}
                            onChange={(e) => setDeadline(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 text-sm">
                      {/* Lado Esquerdo: Ações Principais (Objetivo e Proposta) */}
                      <div className="md:col-span-7 space-y-4">
                        <div className="space-y-1.5">
                          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
                            <Target className="w-3.5 h-3.5 text-slate-400" /> Objetivo Estratégico da Ação
                          </span>
                          <p className="text-slate-800 font-semibold bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                            {item.actionObjective || `Mitigar os impactos decorrentes de ${item.riskName}.`}
                          </p>
                        </div>

                        <div className="space-y-1.5">
                          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
                            <Shield className="w-3.5 h-3.5 text-slate-400" /> Detalhamento da Ação Proposta / Medida de Controle
                          </span>
                          <p className="text-slate-700 leading-relaxed bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                            {item.actionProposed || item.recommendation}
                          </p>
                        </div>
                      </div>

                      {/* Lado Direito: Atributos de Gestão/Cronograma */}
                      <div className="md:col-span-5 bg-slate-50/30 p-4 rounded-xl border border-slate-100 space-y-3.5 text-xs">
                        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                              <User className="w-3 h-3 text-slate-400" /> Responsável
                            </span>
                            <span className="font-bold text-slate-800 block">
                              {item.responsible || "Liderança e Gestão de Pessoas"}
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

                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                              <CheckSquare className="w-3 h-3 text-slate-400" /> Indicador de Eficácia
                            </span>
                            <span className="font-medium text-slate-600 block">
                              {item.efficacyIndicator || "Reavaliação anual"}
                            </span>
                          </div>

                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" /> Prazo Limite
                            </span>
                            <span className="font-extrabold text-slate-900 block bg-slate-100/80 px-2 py-0.5 rounded-md w-fit">
                              {item.deadline || "Mês Corrente + 3"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL: Cronograma e Plano de Ação 5W2H com IA */}
      {showAIScheduleModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-5xl w-full p-6 shadow-2xl border border-slate-150 max-h-[92vh] flex flex-col my-auto animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-150 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-sm shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    Cronograma e Plano de Ação 5W2H com Inteligência Artificial
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    A IA estrutura automaticamente os objetivos, planos de ação 5W2H, responsáveis, cronograma escalonado e indicadores de eficácia.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAIScheduleModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="py-4 space-y-4 overflow-y-auto flex-1 pr-1 text-xs">
              {/* Barra de Ação Superior */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs text-slate-600">
                  <span>
                    Total de Riscos no Inventário: <strong className="text-slate-900 font-bold">{report.riskInventory.length}</strong>
                  </span>
                  <span className="mx-2 text-slate-300">•</span>
                  <span className="text-slate-500">
                    A IA escalona os prazos ao longo do cronograma anual priorizando os riscos mais severos.
                  </span>
                </div>

                <button
                  type="button"
                  disabled={isGeneratingAISchedule}
                  onClick={handleGenerateAISchedule}
                  className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50 shrink-0"
                >
                  {isGeneratingAISchedule ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Gerando Cronograma...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4" />
                      {proposedSchedule.length > 0 ? "Regerar Cronograma com IA" : "Gerar Cronograma 5W2H com IA"}
                    </>
                  )}
                </button>
              </div>

              {/* Erro */}
              {aiScheduleError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  {aiScheduleError}
                </div>
              )}

              {/* Loading */}
              {isGeneratingAISchedule && (
                <div className="py-14 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">Elaborando Cronograma Anual e Plano 5W2H...</h4>
                    <p className="text-slate-500 text-xs mt-1">
                      Distribuindo prazos, definindo responsáveis técnicos e formulando ações preventivas alinhadas à NR-01.
                    </p>
                  </div>
                </div>
              )}

              {/* Lista do Cronograma e Ações Propostas */}
              {!isGeneratingAISchedule && proposedSchedule.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-1">
                    <span className="font-bold text-slate-800 text-xs">
                      Ações Estruturadas ({selectedScheduleIds.length} de {proposedSchedule.length} selecionadas):
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedScheduleIds.length === proposedSchedule.length) {
                          setSelectedScheduleIds([]);
                        } else {
                          setSelectedScheduleIds(proposedSchedule.map((p) => p.id));
                        }
                      }}
                      className="text-indigo-600 hover:text-indigo-800 font-bold text-xs cursor-pointer"
                    >
                      {selectedScheduleIds.length === proposedSchedule.length ? "Desmarcar Todas" : "Selecionar Todas"}
                    </button>
                  </div>

                  <div className="space-y-3">
                    {proposedSchedule.map((action) => {
                      const isSelected = selectedScheduleIds.includes(action.id);
                      const originalItem = report.riskInventory.find((r) => r.id === action.id);
                      const sectorName = originalItem ? getSectorName(originalItem.sectorId) : "";

                      return (
                        <div
                          key={action.id}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedScheduleIds(selectedScheduleIds.filter((id) => id !== action.id));
                            } else {
                              setSelectedScheduleIds([...selectedScheduleIds, action.id]);
                            }
                          }}
                          className={`p-4 rounded-xl border transition-all cursor-pointer ${
                            isSelected
                              ? "bg-indigo-50/40 border-indigo-300 ring-1 ring-indigo-200"
                              : "bg-white border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 flex-1">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}} // handled by parent click
                                className="mt-1 h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                              />
                              <div className="space-y-2 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-[10px] bg-slate-800 text-white font-extrabold px-2 py-0.5 rounded uppercase">
                                    Setor: {sectorName}
                                  </span>
                                  <span className="text-xs font-bold text-slate-900">
                                    {originalItem?.riskName || "Risco Psicossocial"}
                                  </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] pt-1">
                                  <div className="space-y-1">
                                    <span className="font-bold text-slate-500 flex items-center gap-1">
                                      <Target className="w-3 h-3 text-slate-400" /> Objetivo:
                                    </span>
                                    <p className="text-slate-800 bg-white p-2 rounded-lg border border-slate-200">
                                      {action.actionObjective}
                                    </p>
                                  </div>

                                  <div className="space-y-1">
                                    <span className="font-bold text-slate-500 flex items-center gap-1">
                                      <Shield className="w-3 h-3 text-slate-400" /> Ação Proposta (5W2H):
                                    </span>
                                    <p className="text-slate-800 bg-white p-2 rounded-lg border border-slate-200">
                                      {action.actionProposed}
                                    </p>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[10px]">
                                  <div className="bg-white/80 p-1.5 rounded border border-slate-200">
                                    <span className="text-slate-400 block font-semibold uppercase">Responsável:</span>
                                    <span className="font-bold text-slate-800">{action.responsible}</span>
                                  </div>
                                  <div className="bg-white/80 p-1.5 rounded border border-slate-200">
                                    <span className="text-slate-400 block font-semibold uppercase">Prioridade:</span>
                                    <span className="font-bold text-slate-800">{action.priority}</span>
                                  </div>
                                  <div className="bg-white/80 p-1.5 rounded border border-slate-200">
                                    <span className="text-slate-400 block font-semibold uppercase">Periodicidade:</span>
                                    <span className="font-bold text-slate-800">{action.periodicity}</span>
                                  </div>
                                  <div className="bg-indigo-50 p-1.5 rounded border border-indigo-200">
                                    <span className="text-indigo-600 block font-bold uppercase">Prazo Cronograma:</span>
                                    <span className="font-extrabold text-indigo-900">{action.deadline}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-4 border-t border-slate-150 flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setShowAIScheduleModal(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition cursor-pointer text-xs"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={selectedScheduleIds.length === 0}
                onClick={handleApplyAISchedule}
                className="px-5 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold transition shadow-xs cursor-pointer text-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                Aplicar {selectedScheduleIds.length} {selectedScheduleIds.length === 1 ? "Ação" : "Ações"} ao Cronograma
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
