/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Report, Sector } from "../types";
import { Building, Calendar, User, ShieldAlert, Plus, Trash2, Edit2, Users, FileCheck2, ToggleLeft, CheckCircle2 } from "lucide-react";

interface GeneralInfoFormProps {
  report: Report;
  onChange: (updatedReport: Partial<Report>) => void;
  companies?: {
    id: string;
    name: string;
    cnpj: string;
    address?: string;
    riskDegree?: number;
    cnae?: string;
    logo?: string;
  }[];
  professionals?: { id: string; name: string; role: string; reg: string }[];
}

export const GeneralInfoForm: React.FC<GeneralInfoFormProps> = ({
  report,
  onChange,
  companies = [],
  professionals = [],
}) => {
  const [newSectorName, setNewSectorName] = useState("");
  const [newSectorEmployees, setNewSectorEmployees] = useState<string>("");
  const [newSectorRespondents, setNewSectorRespondents] = useState<string>("");
  const [newSectorRecognized, setNewSectorRecognized] = useState(true);

  const [editingSectorId, setEditingSectorId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingEmployees, setEditingEmployees] = useState<string>("");
  const [editingRespondents, setEditingRespondents] = useState<string>("");
  const [editingRecognized, setEditingRecognized] = useState(true);

  const handleAddField = (field: keyof Report, value: any) => {
    onChange({ [field]: value });
  };

  const handleSelectCompany = (companyId: string) => {
    const chosen = companies.find((c) => c.id === companyId);
    if (chosen) {
      onChange({
        companyName: chosen.name,
        cnpj: chosen.cnpj,
        companyAddress: chosen.address || "",
        companyRiskDegree: chosen.riskDegree || 1,
        companyCnae: chosen.cnae || "",
        companyLogo: chosen.logo || "",
      });
    }
  };

  const handleSelectProfessional = (profId: string) => {
    const chosen = professionals.find((p) => p.id === profId);
    if (chosen) {
      onChange({
        professionalName: chosen.name,
        professionalRole: chosen.role as any,
        professionalReg: chosen.reg,
      });
    }
  };

  const handleAddSector = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSectorName.trim()) return;

    const empCount = parseInt(newSectorEmployees) || 0;
    const respCount = parseInt(newSectorRespondents) || 0;

    const newSector: Sector = {
      id: "sector-" + Date.now(),
      name: newSectorName.trim(),
      employeeCount: Math.max(1, empCount),
      respondentsCount: respCount,
      risksRecognized: newSectorRecognized,
      scores: {
        influencia: 0,
        significado: 0,
        relacoes: 0,
        lideranca: 0,
        satisfacao: 0,
        valores: 0,
        saude: 0,
        demandas: 0,
        conflitos: 0,
        burnout: 0,
      },
      devolvedSynthesis: "",
    };

    onChange({
      sectors: [...report.sectors, newSector],
    });

    setNewSectorName("");
    setNewSectorEmployees("");
    setNewSectorRespondents("");
    setNewSectorRecognized(true);
  };

  const handleRemoveSector = (id: string) => {
    if (confirm("Tem certeza que deseja remover este setor? Isso excluirá seus dados de avaliação e registros no inventário de riscos.")) {
      const updatedSectors = report.sectors.filter((s) => s.id !== id);
      const updatedInventory = report.riskInventory.filter((item) => item.sectorId !== id);
      onChange({
        sectors: updatedSectors,
        riskInventory: updatedInventory,
      });
    }
  };

  const startEditingSector = (sector: Sector) => {
    setEditingSectorId(sector.id);
    setEditingName(sector.name);
    setEditingEmployees(sector.employeeCount.toString());
    setEditingRespondents((sector.respondentsCount ?? 0).toString());
    setEditingRecognized(sector.risksRecognized ?? true);
  };

  const handleSaveSectorEdit = (id: string) => {
    if (!editingName.trim()) return;
    const empCount = parseInt(editingEmployees) || 0;
    const respCount = parseInt(editingRespondents) || 0;

    const updatedSectors = report.sectors.map((s) => {
      if (s.id === id) {
        return {
          ...s,
          name: editingName.trim(),
          employeeCount: Math.max(1, empCount),
          respondentsCount: respCount,
          risksRecognized: editingRecognized,
        };
      }
      return s;
    });

    onChange({ sectors: updatedSectors });
    setEditingSectorId(null);
  };

  // Helper to calculate participation percentage
  const getPercentageStr = (respondents: number | undefined, employees: number) => {
    if (!respondents || employees <= 0) return "0%";
    const pct = (respondents / employees) * 100;
    return `${pct.toFixed(1)}%`;
  };

  return (
    <div className="space-y-8" id="general-info-container">
      {/* Opções Globais do Relatório */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
        <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
          <FileCheck2 className="w-5 h-5 text-slate-600" />
          Configurações Gerais do Laudo
        </h3>
        <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-100">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-slate-700">Reconhecimento Geral de Riscos</h4>
            <p className="text-xs text-slate-500">
              Caso a empresa não reconheça nenhum risco psicossocial nas devolutivas, ative este controle para omitir os capítulos de Inventário de Riscos (NR-01) e Plano de Ação no laudo final.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer select-none">
            <input
              type="checkbox"
              checked={report.risksRecognized !== false}
              onChange={(e) => handleAddField("risksRecognized", e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-800"></div>
            <span className="ml-3 text-xs font-bold text-slate-700 uppercase">
              {report.risksRecognized !== false ? "Reconhece Riscos" : "Sem Riscos"}
            </span>
          </label>
        </div>
      </div>

      {/* Dados da Empresa */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-3">
          <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Building className="w-5 h-5 text-slate-600" />
            Dados da Empresa Avaliada
          </h3>

          {companies.length > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 font-medium">Auto-preencher:</span>
              <select
                onChange={(e) => handleSelectCompany(e.target.value)}
                defaultValue=""
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-white outline-none focus:ring-1 focus:ring-slate-400"
              >
                <option value="" disabled>Selecione uma empresa salva...</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-600">Razão Social / Nome da Empresa</label>
            <input
              type="text"
              value={report.companyName}
              onChange={(e) => handleAddField("companyName", e.target.value)}
              placeholder="Ex: Indústrias Metalúrgicas Alfa S/A"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-400 focus:border-slate-400 outline-none transition text-slate-800 bg-white"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-600">CNPJ da Empresa</label>
            <input
              type="text"
              value={report.cnpj}
              onChange={(e) => handleAddField("cnpj", e.target.value)}
              placeholder="Ex: 00.000.000/0001-00"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-400 focus:border-slate-400 outline-none transition text-slate-800 bg-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-600">CNAE Principal</label>
            <input
              type="text"
              value={report.companyCnae || ""}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "").slice(0, 7);
                let masked = digits;
                if (digits.length > 4 && digits.length <= 5) {
                  masked = `${digits.slice(0, 4)}-${digits.slice(4)}`;
                } else if (digits.length > 5) {
                  masked = `${digits.slice(0, 4)}-${digits.slice(4, 5)}/${digits.slice(5)}`;
                }
                handleAddField("companyCnae", masked);
              }}
              placeholder="Ex: 1234-5/67"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-400 focus:border-slate-400 outline-none transition text-slate-800 bg-white"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-600">Grau de Risco</label>
            <select
              value={report.companyRiskDegree || "1"}
              onChange={(e) => handleAddField("companyRiskDegree", parseInt(e.target.value) || 1)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-400 focus:border-slate-400 outline-none transition text-slate-800 bg-white"
            >
              <option value="1">Grau de Risco 1</option>
              <option value="2">Grau de Risco 2</option>
              <option value="3">Grau de Risco 3</option>
              <option value="4">Grau de Risco 4</option>
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-600">Endereço Completo</label>
          <input
            type="text"
            value={report.companyAddress || ""}
            onChange={(e) => handleAddField("companyAddress", e.target.value)}
            placeholder="Ex: Av. das Indústrias, 1500 - Bloco B, Porto Alegre - RS"
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-400 focus:border-slate-400 outline-none transition text-slate-800 bg-white"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-600 block">Logo do Cliente (Laudo Atual)</label>
          <div className="flex items-center gap-3">
            {report.companyLogo ? (
              <div className="relative w-16 h-16 border border-slate-200 rounded-lg overflow-hidden bg-slate-50 flex items-center justify-center">
                <img src={report.companyLogo} alt="Logo Cliente" className="max-w-full max-h-full object-contain" />
                <button
                  type="button"
                  onClick={() => handleAddField("companyLogo", "")}
                  className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity text-xs cursor-pointer"
                >
                  Remover
                </button>
              </div>
            ) : (
              <label className="w-16 h-16 border-2 border-dashed border-slate-200 hover:border-slate-400 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-50/50">
                <Plus className="w-5 h-5 text-slate-400" />
                <span className="text-[9px] text-slate-400 font-bold uppercase mt-1">Enviar</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const r = new FileReader();
                      r.onloadend = () => {
                        handleAddField("companyLogo", r.result as string);
                      };
                      r.readAsDataURL(file);
                    }
                  }}
                  className="hidden"
                />
              </label>
            )}
            <div className="text-xs text-slate-400">
              <span className="font-bold block text-slate-500">Logomarca do Cliente</span>
              Selecione uma imagem para figurar no cabeçalho e na capa das páginas geradas para este laudo.
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-600 block">Design da Folha de Rosto (Capa Customizada)</label>
          <div className="flex items-center gap-3">
            {report.coverImage ? (
              <div className="relative w-16 h-16 border border-slate-200 rounded-lg overflow-hidden bg-slate-50 flex items-center justify-center">
                <img src={report.coverImage} alt="Capa do Relatório" className="max-w-full max-h-full object-contain" />
                <button
                  type="button"
                  onClick={() => handleAddField("coverImage", "")}
                  className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity text-xs cursor-pointer"
                >
                  Remover
                </button>
              </div>
            ) : (
              <label className="w-16 h-16 border-2 border-dashed border-slate-200 hover:border-slate-400 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-50/50">
                <Plus className="w-5 h-5 text-slate-400" />
                <span className="text-[9px] text-slate-400 font-bold uppercase mt-1">Enviar</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const r = new FileReader();
                      r.onloadend = () => {
                        handleAddField("coverImage", r.result as string);
                      };
                      r.readAsDataURL(file);
                    }
                  }}
                  className="hidden"
                />
              </label>
            )}
            <div className="text-xs text-slate-400">
              <span className="font-bold block text-slate-500">Imagem da Folha de Rosto (Opcional)</span>
              Envie o design da sua folha de rosto. Caso não envie, o sistema gerará uma folha de rosto textual padrão altamente corporativa.
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-600 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-slate-400" />
              Data de Início da Avaliação
            </label>
            <input
              type="date"
              value={report.dateStart}
              onChange={(e) => handleAddField("dateStart", e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-400 focus:border-slate-400 outline-none transition text-slate-800 bg-white"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-600 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-slate-400" />
              Data de Conclusão da Avaliação
            </label>
            <input
              type="date"
              value={report.dateEnd}
              onChange={(e) => handleAddField("dateEnd", e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-400 focus:border-slate-400 outline-none transition text-slate-800 bg-white"
            />
          </div>
        </div>
      </div>

      {/* Dados do Responsável Técnico */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-3">
          <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <User className="w-5 h-5 text-slate-600" />
            Dados do Responsável Técnico (SST)
          </h3>

          {professionals.length > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 font-medium">Auto-preencher:</span>
              <select
                onChange={(e) => handleSelectProfessional(e.target.value)}
                defaultValue=""
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-white outline-none focus:ring-1 focus:ring-slate-400"
              >
                <option value="" disabled>Selecione um profissional salvo...</option>
                {professionals.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-1 md:col-span-1">
            <label className="text-sm font-medium text-slate-600">Nome do Profissional</label>
            <input
              type="text"
              value={report.professionalName}
              onChange={(e) => handleAddField("professionalName", e.target.value)}
              placeholder="Ex: Carlos de Souza Santos"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-400 focus:border-slate-400 outline-none transition text-slate-800 bg-white"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-600">Cargo / Função Técnica</label>
            <select
              value={report.professionalRole}
              onChange={(e) => onChange({ professionalRole: e.target.value as any })}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-400 focus:border-slate-400 outline-none transition text-slate-800 bg-white"
            >
              <option value="Técnico de Segurança do Trabalho">Técnico de Segurança do Trabalho</option>
              <option value="Engenheiro de Segurança do Trabalho">Engenheiro de Segurança do Trabalho</option>
              <option value="Psicólogo Organizacional">Psicólogo Organizacional</option>
              <option value="Outro">Outro Profissional de SST</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-600">Registro Profissional (MTE/CREA/CRP)</label>
            <input
              type="text"
              value={report.professionalReg}
              onChange={(e) => handleAddField("professionalReg", e.target.value)}
              placeholder="Ex: MTE nº 12.345 / CREA RS-54321"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-400 focus:border-slate-400 outline-none transition text-slate-800 bg-white"
            />
          </div>
        </div>
      </div>

      {/* Setores / GHEs Avaliados */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-slate-600" />
            Setores, Funções ou Grupos de Exposição (GES/GHE)
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Cadastre os setores ou grupos homogêneos de exposição que participaram da avaliação psicossocial, especificando funcionários expostos e respondentes.
          </p>
        </div>

        {/* Formulário para Novo Setor */}
        <form onSubmit={handleAddSector} className="bg-slate-50 p-4 rounded-xl border border-slate-100 grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
          <div className="space-y-1 lg:col-span-4">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Identificação do Setor / GES</label>
            <input
              type="text"
              required
              value={newSectorName}
              onChange={(e) => setNewSectorName(e.target.value)}
              placeholder="Ex: Setor Administrativo (Faturamento e RH)"
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-slate-400 bg-white outline-none text-sm text-slate-800"
            />
          </div>

          <div className="grid grid-cols-3 gap-3 items-end lg:col-span-8">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                <Users className="w-3 h-3 text-slate-400" /> N.º Func.
              </label>
              <input
                type="number"
                min="1"
                value={newSectorEmployees}
                onChange={(e) => setNewSectorEmployees(e.target.value)}
                placeholder="Ex: 10"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-slate-400 bg-white outline-none text-sm text-slate-800"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                <Users className="w-3 h-3 text-slate-400" /> N.º Respond.
              </label>
              <input
                type="number"
                min="0"
                value={newSectorRespondents}
                onChange={(e) => setNewSectorRespondents(e.target.value)}
                placeholder="Ex: 8"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-slate-400 bg-white outline-none text-sm text-slate-800"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block text-center">Reconhece riscos?</label>
              <button
                type="button"
                onClick={() => setNewSectorRecognized(!newSectorRecognized)}
                className={`w-full font-bold text-xs py-2 px-3 rounded-lg border transition-all cursor-pointer ${
                  newSectorRecognized
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : "bg-slate-100 border-slate-200 text-slate-500"
                }`}
              >
                {newSectorRecognized ? "Sim" : "Não"}
              </button>
            </div>
          </div>

          <div className="lg:col-span-12 flex justify-end">
            <button
              type="submit"
              className="bg-slate-800 hover:bg-slate-900 text-white font-medium text-sm py-2 px-6 rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Cadastrar Setor
            </button>
          </div>
        </form>

        {/* Lista de Setores Cadastrados */}
        <div className="overflow-hidden border border-slate-100 rounded-xl">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Nome do Setor / GES / GHE</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider w-36 text-center">N.º Colaboradores</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider w-36 text-center">N.º Respondentes</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider w-32 text-center">Participação (%)</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider w-32 text-center">Reconhece Riscos?</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider w-28 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {report.sectors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-400 text-sm">
                    Nenhum setor cadastrado ainda. Use o formulário acima para adicionar os setores avaliados.
                  </td>
                </tr>
              ) : (
                report.sectors.map((sector) => (
                  <tr key={sector.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      {editingSectorId === sector.id ? (
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="w-full px-3 py-1 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-slate-400 outline-none text-slate-800"
                        />
                      ) : (
                        <span className="font-semibold text-slate-800 text-sm">{sector.name}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {editingSectorId === sector.id ? (
                        <input
                          type="number"
                          min="1"
                          value={editingEmployees}
                          onChange={(e) => setEditingEmployees(e.target.value)}
                          className="w-20 px-2 py-1 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-slate-400 outline-none text-center text-slate-800"
                        />
                      ) : (
                        <span className="text-slate-600 text-sm bg-slate-100 px-2.5 py-1 rounded-full font-mono font-semibold">
                          {sector.employeeCount}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {editingSectorId === sector.id ? (
                        <input
                          type="number"
                          min="0"
                          value={editingRespondents}
                          onChange={(e) => setEditingRespondents(e.target.value)}
                          className="w-20 px-2 py-1 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-slate-400 outline-none text-center text-slate-800"
                        />
                      ) : (
                        <span className="text-slate-600 text-sm bg-slate-100 px-2.5 py-1 rounded-full font-mono font-semibold">
                          {sector.respondentsCount ?? 0}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-xs text-slate-500 font-bold bg-slate-50 border border-slate-100 px-2 py-1 rounded">
                        {getPercentageStr(sector.respondentsCount, sector.employeeCount)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {editingSectorId === sector.id ? (
                        <button
                          type="button"
                          onClick={() => setEditingRecognized(!editingRecognized)}
                          className={`text-xs px-2.5 py-1 border rounded font-semibold ${
                            editingRecognized
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : "bg-slate-100 text-slate-500 border-slate-200"
                          }`}
                        >
                          {editingRecognized ? "Sim" : "Não"}
                        </button>
                      ) : (
                        <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded border ${
                          sector.risksRecognized !== false
                            ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                            : "bg-slate-100 text-slate-400 border-slate-200"
                        }`}>
                          {sector.risksRecognized !== false ? "Sim" : "Não"}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {editingSectorId === sector.id ? (
                          <>
                            <button
                              onClick={() => handleSaveSectorEdit(sector.id)}
                              className="text-xs font-medium text-emerald-600 hover:text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded hover:bg-emerald-100 transition cursor-pointer"
                            >
                              Salvar
                            </button>
                            <button
                              onClick={() => setEditingSectorId(null)}
                              className="text-xs font-medium text-slate-500 hover:text-slate-700 bg-slate-100 px-2.5 py-1 rounded hover:bg-slate-200 transition cursor-pointer"
                            >
                              Cancelar
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => startEditingSector(sector)}
                              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition cursor-pointer"
                              title="Editar Setor"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleRemoveSector(sector.id)}
                              className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                              title="Excluir Setor"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
