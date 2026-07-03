/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Report, RiskInventoryItem } from "../types";
import { ClipboardList, Edit2, Check, X, Target, HelpCircle, User, Calendar, Shield, Bookmark, CheckSquare, Clock } from "lucide-react";

interface ActionPlanManagerProps {
  report: Report;
  onChange: (updatedReport: Partial<Report>) => void;
}

export const ActionPlanManager: React.FC<ActionPlanManagerProps> = ({ report, onChange }) => {
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  // Edit Fields State
  const [actionObjective, setActionObjective] = useState("");
  const [actionProposed, setActionProposed] = useState("");
  const [responsible, setResponsible] = useState("");
  const [priority, setPriority] = useState<RiskInventoryItem["priority"]>("Média");
  const [periodicity, setPeriodicity] = useState("");
  const [status, setStatus] = useState<RiskInventoryItem["status"]>("Pendente");
  const [efficacyIndicator, setEfficacyIndicator] = useState("");
  const [deadline, setDeadline] = useState("");

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
      {/* Cabeçalho */}
      <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-xs">
        <h3 className="text-md font-semibold text-slate-800 flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-slate-600" />
          Cronograma e Plano de Ação Preventivo (SST)
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          Gerencie e acompanhe as ações corretivas/preventivas vinculadas aos riscos detectados no laudo.
        </p>
      </div>

      {/* Lista de Cards Premium do Plano de Ação */}
      <div className="space-y-4">
        {report.riskInventory.length === 0 ? (
          <div className="bg-white p-12 text-center text-slate-400 text-sm rounded-2xl border border-slate-100">
            Nenhum plano de ação gerado ainda. Primeiro, adicione riscos ao seu <strong>Inventário de Riscos</strong>.
          </div>
        ) : (
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
                          <select
                            value={priority}
                            onChange={(e) => setPriority(e.target.value as any)}
                            className="text-xs px-2 py-1 rounded border border-slate-300 bg-white"
                          >
                            <option value="Baixa">Baixa</option>
                            <option value="Média">Média</option>
                            <option value="Alta">Alta</option>
                          </select>
                        </div>
                        <div className="flex items-center gap-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Status:</label>
                          <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value as any)}
                            className="text-xs px-2 py-1 rounded border border-slate-300 bg-white"
                          >
                            <option value="Pendente">Pendente</option>
                            <option value="Em Andamento">Em Andamento</option>
                            <option value="Concluído">Concluído</option>
                          </select>
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
                            onClick={() => saveEdit(item.id)}
                            className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                            title="Salvar Alterações"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingItemId(null)}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                            title="Cancelar Edição"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => startEditing(item)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                          title="Editar Ação"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
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
                          <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                            <Shield className="w-3.5 h-3.5 text-slate-400" /> Medida Recomendada / Ação Proposta
                          </label>
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
                            {item.actionObjective || "Objetivo Geral: Mitigar o risco psicossocial associado."}
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
    </div>
  );
};
