/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { CatalogRisk } from "../types";
import { BookOpen, Plus, Trash2, Edit2, Check, X, Shield, RefreshCw } from "lucide-react";
import { DEFAULT_RISK_CATALOG } from "../defaultCatalog";

interface RiskCatalogEditorProps {
  catalog: CatalogRisk[];
  onUpdateCatalog: (newCatalog: CatalogRisk[]) => void;
}

export const RiskCatalogEditor: React.FC<RiskCatalogEditorProps> = ({ catalog, onUpdateCatalog }) => {
  const [newRisk, setNewRisk] = useState<Omit<CatalogRisk, "id">>({
    name: "",
    source: "",
    possibleInjuries: "",
    defaultLevel: "Moderado"
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingRisk, setEditingRisk] = useState<CatalogRisk | null>(null);
  const [deletingRiskId, setDeletingRiskId] = useState<string | null>(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  const handleAddRisk = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRisk.name.trim()) return;

    const createdRisk: CatalogRisk = {
      ...newRisk,
      id: "risk-" + Date.now()
    };

    onUpdateCatalog([...catalog, createdRisk]);
    setNewRisk({
      name: "",
      source: "",
      possibleInjuries: "",
      defaultLevel: "Moderado"
    });
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
    setEditingRisk({ ...risk });
  };

  const saveEdit = () => {
    if (!editingRisk || !editingRisk.name.trim()) return;

    const updatedCatalog = catalog.map((r) => {
      if (r.id === editingRisk.id) {
        return editingRisk;
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
            Catálogo Geral de Riscos Psicossociais
          </h3>
          <p className="text-xs text-slate-500">
            Cadastre e edite os tipos de riscos psicossociais, fontes geradoras padrão e possíveis agravos à saúde do colaborador.
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
            <RefreshCw className="w-3.5 h-3.5" /> Restaurar Padrões
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Formulário de Cadastro */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs lg:col-span-4 h-fit space-y-6">
          <h4 className="font-semibold text-slate-800 text-sm flex items-center gap-2 border-b border-slate-100 pb-3">
            <Plus className="w-4 h-4 text-slate-600" /> Cadastrar Novo Risco no Catálogo
          </h4>

          <form onSubmit={handleAddRisk} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Nome do Risco</label>
              <input
                type="text"
                required
                value={newRisk.name}
                onChange={(e) => setNewRisk({ ...newRisk, name: e.target.value })}
                placeholder="Ex: Assédio Psicológico Organizacional"
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-slate-400 outline-none text-sm text-slate-800 bg-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Fonte / Causa Geradora Padrão</label>
              <textarea
                value={newRisk.source}
                onChange={(e) => setNewRisk({ ...newRisk, source: e.target.value })}
                placeholder="Ex: Falta de canais de ouvidoria estruturados, tolerância de desvios éticos na gestão, cobranças abusivas."
                rows={3}
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-slate-400 outline-none text-sm text-slate-800 bg-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Possíveis Lesões e Agravos</label>
              <textarea
                value={newRisk.possibleInjuries}
                onChange={(e) => setNewRisk({ ...newRisk, possibleInjuries: e.target.value })}
                placeholder="Ex: Transtorno depressivo, ansiedade crônica, ideação de autoextermínio, estresse pós-traumático."
                rows={3}
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-slate-400 outline-none text-sm text-slate-800 bg-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Grau Estimado do Risco</label>
              <select
                value={newRisk.defaultLevel}
                onChange={(e) => setNewRisk({ ...newRisk, defaultLevel: e.target.value as any })}
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-slate-400 outline-none text-sm text-slate-800 bg-white"
              >
                <option value="Insignificante">Insignificante</option>
                <option value="Baixo">Baixo</option>
                <option value="Moderado">Moderado</option>
                <option value="Alto">Alto</option>
                <option value="Grave">Grave</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full bg-slate-800 hover:bg-slate-900 text-white font-medium text-sm py-2 px-4 rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Cadastrar no Catálogo
            </button>
          </form>
        </div>

        {/* Lista de Riscos Existentes */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs lg:col-span-8 space-y-4">
          <h4 className="font-semibold text-slate-800 text-sm border-b border-slate-100 pb-3">
            Lista de Riscos Cadastrados ({catalog.length})
          </h4>

          <div className="space-y-4 max-h-[580px] overflow-y-auto pr-1">
            {catalog.map((risk) => (
              <div
                key={risk.id}
                className="p-4 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition space-y-3"
              >
                {editingId === risk.id && editingRisk ? (
                  /* Modo Edição */
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-2 space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Nome do Risco</label>
                        <input
                          type="text"
                          value={editingRisk.name}
                          onChange={(e) => setEditingRisk({ ...editingRisk, name: e.target.value })}
                          className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs text-slate-800 focus:ring-1 focus:ring-slate-400 outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Grau do Risco</label>
                        <select
                          value={editingRisk.defaultLevel}
                          onChange={(e) => setEditingRisk({ ...editingRisk, defaultLevel: e.target.value as any })}
                          className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs text-slate-800 bg-white outline-none"
                        >
                          <option value="Insignificante">Insignificante</option>
                          <option value="Baixo">Baixo</option>
                          <option value="Moderado">Moderado</option>
                          <option value="Alto">Alto</option>
                          <option value="Grave">Grave</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Causa / Fonte Geradora</label>
                      <textarea
                        value={editingRisk.source}
                        onChange={(e) => setEditingRisk({ ...editingRisk, source: e.target.value })}
                        rows={2}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs text-slate-800 outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Lesões e Agravos</label>
                      <textarea
                        value={editingRisk.possibleInjuries}
                        onChange={(e) => setEditingRisk({ ...editingRisk, possibleInjuries: e.target.value })}
                        rows={2}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs text-slate-800 outline-none"
                      />
                    </div>

                    <div className="flex gap-2 justify-end pt-2">
                      <button
                        onClick={saveEdit}
                        className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded transition cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" /> Salvar
                      </button>
                      <button
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
                        <Shield className="w-4 h-4 text-slate-400" />
                        <h5 className="font-bold text-slate-800 text-sm">{risk.name}</h5>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getBadgeColor(risk.defaultLevel)}`}>
                          {risk.defaultLevel}
                        </span>
                        
                        <button
                          onClick={() => startEditing(risk)}
                          className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded transition cursor-pointer"
                          title="Editar"
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
                            onClick={() => setDeletingRiskId(risk.id)}
                            className="p-1 text-rose-400 hover:text-rose-600 hover:bg-rose-100/50 rounded transition cursor-pointer"
                            title="Excluir"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1">
                      <div className="bg-white p-2.5 rounded-lg border border-slate-100/80 space-y-1">
                        <span className="font-bold text-slate-500 text-[10px] uppercase tracking-wider block">Fonte / Causa Geradora:</span>
                        <p className="text-slate-600 leading-relaxed text-[11px]">{risk.source || "Nenhuma cadastrada."}</p>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-slate-100/80 space-y-1">
                        <span className="font-bold text-slate-500 text-[10px] uppercase tracking-wider block">Possíveis Lesões / Danos à Saúde:</span>
                        <p className="text-slate-600 leading-relaxed text-[11px]">{risk.possibleInjuries || "Nenhuma cadastrada."}</p>
                      </div>
                    </div>
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
