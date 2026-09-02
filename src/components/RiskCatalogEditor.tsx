/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { CatalogRisk } from "../types";
import { BookOpen, Plus, Trash2, Edit2, Check, X, Shield, RefreshCw, ChevronDown, ChevronUp, ClipboardCheck, Calendar, Sliders } from "lucide-react";
import { DEFAULT_RISK_CATALOG } from "../defaultCatalog";
import { SearchableSelect } from "./SearchableSelect";

interface RiskCatalogEditorProps {
  catalog: CatalogRisk[];
  onUpdateCatalog: (newCatalog: CatalogRisk[]) => void;
}

const DEFAULT_NEW_RISK: Omit<CatalogRisk, "id"> = {
  name: "",
  source: "",
  possibleInjuries: "",
  defaultLevel: "Moderado",
  diseaseHistory: "Nenhum registro oficial de adoecimento até o momento.",
  existingControls: "",
  probability: 3,
  severity: 3,
  uncertainty: "Certa",
  recommendation: "",
  priority: "Média",
  responsible: "Liderança e Gestores",
  status: "Pendente",
  deadline: "A definir pela empresa",
  periodicity: "A definir pela empresa",
  monitoring: "",
  measureResults: "",
  actionObjective: "",
  actionProposed: "",
  efficacyIndicator: ""
};

export const RiskCatalogEditor: React.FC<RiskCatalogEditorProps> = ({ catalog, onUpdateCatalog }) => {
  const [newRisk, setNewRisk] = useState<Omit<CatalogRisk, "id">>({ ...DEFAULT_NEW_RISK });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingRisk, setEditingRisk] = useState<CatalogRisk | null>(null);
  const [deletingRiskId, setDeletingRiskId] = useState<string | null>(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [expandedDetailsId, setExpandedDetailsId] = useState<string | null>(null);
  const [activeFormTab, setActiveFormTab] = useState<"diagnostico" | "matriz" | "acoes">("diagnostico");

  const handleAddRisk = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRisk.name.trim()) return;

    const createdRisk: CatalogRisk = {
      ...newRisk,
      deadline: newRisk.deadline?.trim() || "A definir pela empresa",
      periodicity: newRisk.periodicity?.trim() || "A definir pela empresa",
      id: "risk-" + Date.now()
    };

    onUpdateCatalog([...catalog, createdRisk]);
    setNewRisk({ ...DEFAULT_NEW_RISK });
    setActiveFormTab("diagnostico");
  };

  const handleRemoveRisk = (id: string) => {
    onUpdateCatalog(catalog.filter((r) => r.id !== id));
  };

  const handleResetToDefault = () => {
    onUpdateCatalog(DEFAULT_RISK_CATALOG);
    setResetConfirmOpen(false);
  };

  const startEditing = (risk: CatalogRisk) => {
    setEditingId(risk.id);
    setEditingRisk({
      ...risk,
      deadline: risk.deadline || "A definir pela empresa",
      periodicity: risk.periodicity || "A definir pela empresa",
      probability: risk.probability || 3,
      severity: risk.severity || 3,
      uncertainty: risk.uncertainty || "Certa",
      priority: risk.priority || "Média",
      responsible: risk.responsible || "Liderança e Gestores",
      status: risk.status || "Pendente"
    });
  };

  const saveEdit = () => {
    if (!editingRisk || !editingRisk.name.trim()) return;

    const updatedCatalog = catalog.map((r) => {
      if (r.id === editingRisk.id) {
        return {
          ...editingRisk,
          deadline: editingRisk.deadline?.trim() || "A definir pela empresa",
          periodicity: editingRisk.periodicity?.trim() || "A definir pela empresa"
        };
      }
      return r;
    });

    onUpdateCatalog(updatedCatalog);
    setEditingId(null);
    setEditingRisk(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingRisk(null);
  };

  const getBadgeColor = (level: CatalogRisk["defaultLevel"]) => {
    switch (level) {
      case "Insignificante": return "bg-blue-50 text-blue-800 border-blue-200";
      case "Baixo": return "bg-emerald-50 text-emerald-800 border-emerald-200";
      case "Moderado": return "bg-amber-50 text-amber-800 border-amber-200";
      case "Alto": return "bg-orange-50 text-orange-800 border-orange-200";
      case "Grave": return "bg-rose-50 text-rose-800 border-rose-200";
    }
  };

  return (
    <div className="space-y-6" id="risk-catalog-editor">
      {/* Informações de Introdução */}
      <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-md font-semibold text-slate-800 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-slate-600" />
            Biblioteca e Catálogo Geral de Riscos Psicossociais
          </h3>
          <p className="text-xs text-slate-500">
            Cadastre modelos de riscos completos com diagnóstico, dados de inventário e cronograma de ações preventivas para replicação direta no inventário setorial.
          </p>
        </div>

        {resetConfirmOpen ? (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 p-2 rounded-lg text-xs">
            <span className="font-semibold text-amber-800">Deseja restaurar padrões?</span>
            <button
              type="button"
              onClick={handleResetToDefault}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-2 py-1 rounded cursor-pointer"
            >
              Sim, Restaurar
            </button>
            <button
              type="button"
              onClick={() => setResetConfirmOpen(false)}
              className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-2 py-1 rounded cursor-pointer"
            >
              Não
            </button>
          </div>
        ) : (
          <button
            onClick={() => setResetConfirmOpen(true)}
            className="flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-lg transition-all cursor-pointer w-full md:w-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Restaurar Padrões da Biblioteca
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Formulário de Cadastro */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs lg:col-span-5 h-fit space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h4 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
              <Plus className="w-4 h-4 text-slate-600" /> Cadastrar Modelo de Risco na Biblioteca
            </h4>
            <p className="text-[11px] text-slate-400 mt-1">
              Todos os campos preenchidos aqui serão replicados automaticamente ao selecionar o risco no inventário.
            </p>
          </div>

          {/* Abas de preenchimento do modelo */}
          <div className="flex border-b border-slate-200 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveFormTab("diagnostico")}
              className={`py-2 px-3 border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                activeFormTab === "diagnostico"
                  ? "border-slate-800 text-slate-900 font-bold"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              <ClipboardCheck className="w-3.5 h-3.5" /> 1. Diagnóstico
            </button>
            <button
              type="button"
              onClick={() => setActiveFormTab("matriz")}
              className={`py-2 px-3 border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                activeFormTab === "matriz"
                  ? "border-slate-800 text-slate-900 font-bold"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              <Sliders className="w-3.5 h-3.5" /> 2. Matriz 5x5
            </button>
            <button
              type="button"
              onClick={() => setActiveFormTab("acoes")}
              className={`py-2 px-3 border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                activeFormTab === "acoes"
                  ? "border-slate-800 text-slate-900 font-bold"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" /> 3. Cronograma Ações
            </button>
          </div>

          <form onSubmit={handleAddRisk} className="space-y-4">
            {activeFormTab === "diagnostico" && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Nome do Risco *</label>
                  <input
                    type="text"
                    required
                    value={newRisk.name}
                    onChange={(e) => setNewRisk({ ...newRisk, name: e.target.value })}
                    placeholder="Ex: Assédio Moral ou Condutas Ofensivas"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-slate-400 outline-none text-sm text-slate-800 bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Fonte / Causa Geradora Padrão</label>
                  <textarea
                    value={newRisk.source}
                    onChange={(e) => setNewRisk({ ...newRisk, source: e.target.value })}
                    placeholder="Ex: Cobranças abusivas, humilhações públicas ou tolerância a desvios éticos."
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-slate-400 outline-none text-sm text-slate-800 bg-white resize-y max-w-full"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Possíveis Lesões e Agravos</label>
                  <textarea
                    value={newRisk.possibleInjuries}
                    onChange={(e) => setNewRisk({ ...newRisk, possibleInjuries: e.target.value })}
                    placeholder="Ex: Transtorno de ansiedade generalizada, depressão reativa, crises de pânico."
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-slate-400 outline-none text-sm text-slate-800 bg-white resize-y max-w-full"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Histórico de Doenças / Afastamentos Padrão</label>
                  <textarea
                    value={newRisk.diseaseHistory}
                    onChange={(e) => setNewRisk({ ...newRisk, diseaseHistory: e.target.value })}
                    placeholder="Ex: Nenhum registro oficial de adoecimento até o momento."
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-slate-400 outline-none text-sm text-slate-800 bg-white resize-y max-w-full"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Medidas Preventivas / Controles Existentes</label>
                  <textarea
                    value={newRisk.existingControls}
                    onChange={(e) => setNewRisk({ ...newRisk, existingControls: e.target.value })}
                    placeholder="Ex: Código de conduta e canal de ouvidoria interno."
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-slate-400 outline-none text-sm text-slate-800 bg-white resize-y max-w-full"
                  />
                </div>
              </div>
            )}

            {activeFormTab === "matriz" && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Grau Estimado do Risco</label>
                  <SearchableSelect
                    value={newRisk.defaultLevel}
                    onChange={(val) => {
                      const level = val as CatalogRisk["defaultLevel"];
                      const prob = level === "Insignificante" ? 1 : level === "Baixo" ? 2 : level === "Moderado" ? 3 : level === "Alto" ? 4 : 5;
                      const sev = level === "Insignificante" ? 1 : level === "Baixo" ? 2 : level === "Moderado" ? 3 : level === "Alto" ? 4 : 5;
                      setNewRisk({ ...newRisk, defaultLevel: level, probability: prob, severity: sev });
                    }}
                    options={[
                      { value: "Insignificante", label: "Insignificante", subLabel: "Nível irrelevante" },
                      { value: "Baixo", label: "Baixo", subLabel: "Nível leve" },
                      { value: "Moderado", label: "Moderado", subLabel: "Nível intermediário" },
                      { value: "Alto", label: "Alto", subLabel: "Nível acentuado" },
                      { value: "Grave", label: "Grave", subLabel: "Nível severo crítico" }
                    ]}
                    placeholder="Selecione o grau de risco..."
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Probabilidade (1-5)</label>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={newRisk.probability || 3}
                      onChange={(e) => setNewRisk({ ...newRisk, probability: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800 bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Severidade (1-5)</label>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={newRisk.severity || 3}
                      onChange={(e) => setNewRisk({ ...newRisk, severity: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800 bg-white"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Estimativa de Incerteza</label>
                  <SearchableSelect
                    value={newRisk.uncertainty || "Certa"}
                    onChange={(val) => setNewRisk({ ...newRisk, uncertainty: val as any })}
                    options={[
                      { value: "Certa", label: "Estimativa Certa", subLabel: "Evidências robustas" },
                      { value: "Incerta", label: "Estimativa Incerta", subLabel: "Fatores dinâmicos" },
                      { value: "Altamente Incerta", label: "Altamente Incerta", subLabel: "Falta de dados fáticos" }
                    ]}
                    placeholder="Incerteza..."
                    required
                  />
                </div>
              </div>
            )}

            {activeFormTab === "acoes" && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Recomendação Preventiva de Controle</label>
                  <textarea
                    value={newRisk.recommendation || ""}
                    onChange={(e) => {
                      const rec = e.target.value;
                      setNewRisk({
                        ...newRisk,
                        recommendation: rec,
                        actionProposed: newRisk.actionProposed || rec
                      });
                    }}
                    placeholder="Ex: Treinamento preventivo de líderes e estabelecimento de canal de ouvidoria independente."
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-slate-400 outline-none text-sm text-slate-800 bg-white resize-y max-w-full"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Prioridade</label>
                    <SearchableSelect
                      value={newRisk.priority || "Média"}
                      onChange={(val) => setNewRisk({ ...newRisk, priority: val as any })}
                      options={[
                        { value: "Baixa", label: "Baixa" },
                        { value: "Média", label: "Média" },
                        { value: "Alta", label: "Alta" }
                      ]}
                      placeholder="Prioridade..."
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Responsável</label>
                    <input
                      type="text"
                      value={newRisk.responsible || "Liderança e Gestores"}
                      onChange={(e) => setNewRisk({ ...newRisk, responsible: e.target.value })}
                      placeholder="Ex: RH e Lideranças"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800 bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Prazo Estimado</label>
                    <input
                      type="text"
                      value={newRisk.deadline || "A definir pela empresa"}
                      onChange={(e) => setNewRisk({ ...newRisk, deadline: e.target.value })}
                      placeholder="A definir pela empresa"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800 bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Periodicidade da Ação</label>
                    <input
                      type="text"
                      value={newRisk.periodicity || "A definir pela empresa"}
                      onChange={(e) => setNewRisk({ ...newRisk, periodicity: e.target.value })}
                      placeholder="A definir pela empresa"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800 bg-white"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Objetivo Específico da Ação</label>
                  <input
                    type="text"
                    value={newRisk.actionObjective || ""}
                    onChange={(e) => setNewRisk({ ...newRisk, actionObjective: e.target.value })}
                    placeholder="Ex: Eliminar focos de atrito interpessoal e formalizar condutas éticas."
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800 bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Ação Proposta Detalhada</label>
                  <input
                    type="text"
                    value={newRisk.actionProposed || ""}
                    onChange={(e) => setNewRisk({ ...newRisk, actionProposed: e.target.value })}
                    placeholder="Ex: Realizar palestras de conscientização e instituir protocolo de apuração."
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800 bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Como Acompanhar (Monitoramento)</label>
                    <input
                      type="text"
                      value={newRisk.monitoring || ""}
                      onChange={(e) => setNewRisk({ ...newRisk, monitoring: e.target.value })}
                      placeholder="Ex: Reuniões de equipe mensais."
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800 bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Indicador de Eficácia</label>
                    <input
                      type="text"
                      value={newRisk.efficacyIndicator || ""}
                      onChange={(e) => setNewRisk({ ...newRisk, efficacyIndicator: e.target.value })}
                      placeholder="Ex: Pesquisa de clima anual."
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800 bg-white"
                    />
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-slate-800 hover:bg-slate-900 text-white font-medium text-sm py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs mt-2"
            >
              <Plus className="w-4 h-4" /> Cadastrar Modelo na Biblioteca
            </button>
          </form>
        </div>

        {/* Lista de Riscos Existentes */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h4 className="font-semibold text-slate-800 text-sm">
              Riscos e Modelos Cadastrados ({catalog.length})
            </h4>
            <span className="text-[11px] text-slate-400">Clique para expandir cronograma e inventário</span>
          </div>

          <div className="space-y-4 max-h-[640px] overflow-y-auto pr-1">
            {catalog.map((risk) => (
              <div
                key={risk.id}
                className="p-4 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition space-y-3"
              >
                {editingId === risk.id && editingRisk ? (
                  /* Modo Edição Completa */
                  <div className="space-y-3 bg-white p-4 rounded-lg border border-slate-200">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="md:col-span-2 space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Nome do Risco</label>
                        <input
                          type="text"
                          value={editingRisk.name}
                          onChange={(e) => setEditingRisk({ ...editingRisk, name: e.target.value })}
                          className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs text-slate-800 outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Grau do Risco</label>
                        <SearchableSelect
                          value={editingRisk.defaultLevel}
                          onChange={(val) => setEditingRisk({ ...editingRisk, defaultLevel: val as any })}
                          options={[
                            { value: "Insignificante", label: "Insignificante" },
                            { value: "Baixo", label: "Baixo" },
                            { value: "Moderado", label: "Moderado" },
                            { value: "Alto", label: "Alto" },
                            { value: "Grave", label: "Grave" }
                          ]}
                          placeholder="Grau"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Causa / Fonte Geradora</label>
                        <textarea
                          value={editingRisk.source}
                          onChange={(e) => setEditingRisk({ ...editingRisk, source: e.target.value })}
                          rows={2}
                          className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs text-slate-800 outline-none resize-y max-w-full"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Lesões e Agravos</label>
                        <textarea
                          value={editingRisk.possibleInjuries}
                          onChange={(e) => setEditingRisk({ ...editingRisk, possibleInjuries: e.target.value })}
                          rows={2}
                          className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs text-slate-800 outline-none resize-y max-w-full"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Histórico Doenças / Afastamentos</label>
                        <textarea
                          value={editingRisk.diseaseHistory || ""}
                          onChange={(e) => setEditingRisk({ ...editingRisk, diseaseHistory: e.target.value })}
                          rows={2}
                          className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs text-slate-800 outline-none resize-y max-w-full"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Medidas de Controle Existentes</label>
                        <textarea
                          value={editingRisk.existingControls || ""}
                          onChange={(e) => setEditingRisk({ ...editingRisk, existingControls: e.target.value })}
                          rows={2}
                          className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs text-slate-800 outline-none resize-y max-w-full"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Recomendação Preventiva (Plano de Ação)</label>
                      <textarea
                        value={editingRisk.recommendation || ""}
                        onChange={(e) => setEditingRisk({ ...editingRisk, recommendation: e.target.value, actionProposed: editingRisk.actionProposed || e.target.value })}
                        rows={2}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs text-slate-800 outline-none resize-y max-w-full"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Prioridade</label>
                        <SearchableSelect
                          value={editingRisk.priority || "Média"}
                          onChange={(val) => setEditingRisk({ ...editingRisk, priority: val as any })}
                          options={[
                            { value: "Baixa", label: "Baixa" },
                            { value: "Média", label: "Média" },
                            { value: "Alta", label: "Alta" }
                          ]}
                          placeholder="Prioridade"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Responsável</label>
                        <input
                          type="text"
                          value={editingRisk.responsible || "Liderança e Gestores"}
                          onChange={(e) => setEditingRisk({ ...editingRisk, responsible: e.target.value })}
                          className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs text-slate-800 outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Prazo Estimado</label>
                        <input
                          type="text"
                          value={editingRisk.deadline || "A definir pela empresa"}
                          onChange={(e) => setEditingRisk({ ...editingRisk, deadline: e.target.value })}
                          className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs text-slate-800 outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Periodicidade</label>
                        <input
                          type="text"
                          value={editingRisk.periodicity || "A definir pela empresa"}
                          onChange={(e) => setEditingRisk({ ...editingRisk, periodicity: e.target.value })}
                          className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs text-slate-800 outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 justify-end pt-2">
                      <button
                        type="button"
                        onClick={saveEdit}
                        className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded transition cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" /> Salvar Modelo
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="flex items-center gap-1 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded transition cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" /> Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Modo Exibição */
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-slate-400 shrink-0" />
                        <h5 className="font-bold text-slate-800 text-sm">{risk.name}</h5>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getBadgeColor(risk.defaultLevel)}`}>
                          {risk.defaultLevel}
                        </span>
                        
                        <button
                          type="button"
                          onClick={() => setExpandedDetailsId(expandedDetailsId === risk.id ? null : risk.id)}
                          className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded transition cursor-pointer"
                          title="Detalhes do Modelo"
                        >
                          {expandedDetailsId === risk.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>

                        <button
                          type="button"
                          onClick={() => startEditing(risk)}
                          className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded transition cursor-pointer"
                          title="Editar Modelo"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {deletingRiskId === risk.id ? (
                          <div className="flex items-center gap-1 bg-rose-50 border border-rose-200 p-0.5 rounded-md text-[9px]">
                            <span className="font-bold text-rose-800 px-1">Excluir?</span>
                            <button
                              type="button"
                              onClick={() => {
                                handleRemoveRisk(risk.id);
                                setDeletingRiskId(null);
                              }}
                              className="font-black text-rose-700 hover:text-rose-900 bg-rose-100/50 px-1.5 py-0.5 rounded cursor-pointer"
                            >
                              Sim
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingRiskId(null)}
                              className="font-bold text-slate-500 hover:text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded cursor-pointer"
                            >
                              Não
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDeletingRiskId(risk.id)}
                            className="p-1 text-rose-400 hover:text-rose-600 hover:bg-rose-100/50 rounded transition cursor-pointer"
                            title="Excluir Modelo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
                      <div className="bg-white p-2.5 rounded-lg border border-slate-100 space-y-1">
                        <span className="font-bold text-slate-500 text-[10px] uppercase tracking-wider block">Fonte Geradora:</span>
                        <p className="text-slate-600 leading-relaxed text-[11px] line-clamp-2">{risk.source || "Nenhuma cadastrada."}</p>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-slate-100 space-y-1">
                        <span className="font-bold text-slate-500 text-[10px] uppercase tracking-wider block">Possíveis Danos:</span>
                        <p className="text-slate-600 leading-relaxed text-[11px] line-clamp-2">{risk.possibleInjuries || "Nenhuma cadastrada."}</p>
                      </div>
                    </div>

                    {/* Detalhes estendidos do inventário e cronograma de ações */}
                    {expandedDetailsId === risk.id && (
                      <div className="mt-2 pt-2 border-t border-slate-200/60 text-xs space-y-2.5 animate-fadeIn">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                          <div className="bg-white p-2 rounded border border-slate-100">
                            <span className="font-bold text-slate-400 uppercase text-[9px] block">Controles Existentes:</span>
                            <span className="text-slate-700">{risk.existingControls || "Nenhum informado"}</span>
                          </div>
                          <div className="bg-white p-2 rounded border border-slate-100">
                            <span className="font-bold text-slate-400 uppercase text-[9px] block">Histórico de Afastamentos:</span>
                            <span className="text-slate-700">{risk.diseaseHistory || "Sem registro"}</span>
                          </div>
                        </div>

                        <div className="bg-white p-2.5 rounded-lg border border-slate-200/60 space-y-1">
                          <span className="font-bold text-slate-700 text-[10px] uppercase tracking-wider flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-emerald-600" /> Cronograma e Ação Preventiva Proposta:
                          </span>
                          <p className="text-slate-700 text-[11px]">{risk.recommendation || risk.actionProposed || "Recomendação padrão preventiva."}</p>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-[10px] text-slate-500 border-t border-slate-100">
                            <span><strong>Responsável:</strong> {risk.responsible || "Liderança e Gestores"}</span>
                            <span><strong>Prazo:</strong> {risk.deadline || "A definir pela empresa"}</span>
                            <span><strong>Periodicidade:</strong> {risk.periodicity || "A definir pela empresa"}</span>
                            <span><strong>Prioridade:</strong> {risk.priority || "Média"}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
