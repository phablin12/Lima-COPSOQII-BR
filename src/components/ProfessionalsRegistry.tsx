/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { User, Plus, Trash2, Edit2, Check, X } from "lucide-react";

interface Professional {
  id: string;
  name: string;
  role: string;
  reg: string;
}

interface ProfessionalsRegistryProps {
  professionals: Professional[];
  onUpdateProfessionals: (professionals: Professional[]) => void;
}

export const ProfessionalsRegistry: React.FC<ProfessionalsRegistryProps> = ({
  professionals,
  onUpdateProfessionals,
}) => {
  const [name, setName] = useState("");
  const [role, setRole] = useState("Técnico de Segurança do Trabalho");
  const [reg, setReg] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editReg, setEditReg] = useState("");

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newProf: Professional = {
      id: "prof-" + Date.now(),
      name: name.trim(),
      role: role,
      reg: reg.trim(),
    };

    onUpdateProfessionals([...professionals, newProf]);
    setName("");
    setReg("");
  };

  const handleDelete = (id: string) => {
    if (confirm("Tem certeza que deseja excluir este profissional?")) {
      onUpdateProfessionals(professionals.filter((p) => p.id !== id));
    }
  };

  const startEdit = (prof: Professional) => {
    setEditingId(prof.id);
    setEditName(prof.name);
    setEditRole(prof.role);
    setEditReg(prof.reg);
  };

  const saveEdit = () => {
    if (!editName.trim()) return;
    onUpdateProfessionals(
      professionals.map((p) =>
        p.id === editingId
          ? { ...p, name: editName.trim(), role: editRole, reg: editReg.trim() }
          : p
      )
    );
    setEditingId(null);
  };

  return (
    <div className="space-y-6" id="professionals-registry">
      <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-xs">
        <h3 className="text-md font-semibold text-slate-800 flex items-center gap-2">
          <User className="w-5 h-5 text-slate-600" />
          Cadastro de Responsáveis Técnicos (SST)
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          Registre os profissionais de saúde e segurança do trabalho para selecioná-los nos laudos e preencher as assinaturas de forma automática.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Formulador */}
        <form onSubmit={handleAdd} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs lg:col-span-4 h-fit space-y-4">
          <h4 className="font-semibold text-slate-800 text-sm flex items-center gap-2 border-b border-slate-100 pb-3">
            <Plus className="w-4 h-4 text-slate-600" /> Novo Profissional
          </h4>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Nome Completo</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Carlos de Souza Santos"
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-slate-400 outline-none text-sm text-slate-800 bg-white"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Função / Cargo Técnico</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-slate-400 outline-none text-sm text-slate-800 bg-white"
            >
              <option value="Técnico de Segurança do Trabalho">Técnico de Segurança do Trabalho</option>
              <option value="Engenheiro de Segurança do Trabalho">Engenheiro de Segurança do Trabalho</option>
              <option value="Psicólogo Organizacional">Psicólogo Organizacional</option>
              <option value="Outro">Outro Profissional de SST</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Registro Profissional</label>
            <input
              type="text"
              value={reg}
              onChange={(e) => setReg(e.target.value)}
              placeholder="Ex: MTE nº 12.345 / CREA RS-54321"
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-slate-400 outline-none text-sm text-slate-800 bg-white"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-slate-800 hover:bg-slate-900 text-white font-medium text-sm py-2 px-4 rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Cadastrar Profissional
          </button>
        </form>

        {/* Lista */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs lg:col-span-8 space-y-4">
          <h4 className="font-semibold text-slate-800 text-sm border-b border-slate-100 pb-3">
            Profissionais Cadastrados ({professionals.length})
          </h4>

          {professionals.length === 0 ? (
            <p className="text-sm text-slate-400 italic text-center py-10">
              Nenhum profissional cadastrado ainda.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto pr-1">
              {professionals.map((prof) => (
                <div key={prof.id} className="py-4 flex items-center justify-between gap-4">
                  {editingId === prof.id ? (
                    <div className="flex-1 space-y-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="px-3 py-1 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-slate-400 outline-none"
                        />
                        <select
                          value={editRole}
                          onChange={(e) => setEditRole(e.target.value)}
                          className="px-3 py-1 text-sm border border-slate-300 rounded bg-white outline-none"
                        >
                          <option value="Técnico de Segurança do Trabalho">Técnico de Segurança do Trabalho</option>
                          <option value="Engenheiro de Segurança do Trabalho">Engenheiro de Segurança do Trabalho</option>
                          <option value="Psicólogo Organizacional">Psicólogo Organizacional</option>
                          <option value="Outro">Outro Profissional de SST</option>
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editReg}
                          onChange={(e) => setEditReg(e.target.value)}
                          className="flex-1 px-3 py-1 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-slate-400 outline-none"
                          placeholder="Registro Profissional"
                        />
                        <button
                          onClick={saveEdit}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white p-1.5 rounded transition cursor-pointer"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-600 p-1.5 rounded transition cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-1">
                        <h5 className="font-bold text-slate-800 text-sm">{prof.name}</h5>
                        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                          <span>{prof.role}</span>
                          {prof.reg && (
                            <>
                              <span className="text-slate-300">|</span>
                              <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">{prof.reg}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => startEdit(prof)}
                          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition cursor-pointer"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(prof.id)}
                          className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
