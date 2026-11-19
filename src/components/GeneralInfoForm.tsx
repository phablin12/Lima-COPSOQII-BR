/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Report, Sector, Assessor } from "../types";
import { DEFAULT_CHAPTERS, DEFAULT_QUALITATIVE_METODOLOGIA } from "../defaultChapters";
import {
  Building,
  Calendar,
  User,
  ShieldAlert,
  Plus,
  Trash2,
  Edit2,
  Users,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { compressImage } from "../imageUtils";
import { SearchableSelect } from "./SearchableSelect";

const ESTADOS_BRASILEIROS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO",
  "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI",
  "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

interface GeneralInfoFormProps {
  report: Report;
  onChange: (updatedReport: Partial<Report>) => void;
  companies?: {
    id: string;
    fantasyName?: string;
    name: string;
    cnpj: string;
    cnae?: string;
    riskDegree?: number;
    address?: string;
    number?: string;
    sector?: string;
    cep?: string;
    bairro?: string;
    city?: string;
    state?: string;
    logo?: string;
  }[];
  professionals?: { id: string; name: string; role: string; reg: string }[];
  evaluators?: Assessor[];
  defaultAssessor?: Assessor;
}

export const GeneralInfoForm: React.FC<GeneralInfoFormProps> = ({
  report,
  onChange,
  companies = [],
  professionals = [],
  evaluators = [],
  defaultAssessor,
}) => {
  const [newSectorName, setNewSectorName] = useState("");
  const [newSectorEmployees, setNewSectorEmployees] = useState<string>("");
  const [newSectorRecognized, setNewSectorRecognized] = useState(true);

  const [editingSectorId, setEditingSectorId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingEmployees, setEditingEmployees] = useState<string>("");
  const [editingRecognized, setEditingRecognized] = useState(true);
  const [deletingSectorId, setDeletingSectorId] = useState<string | null>(null);
  const [showCompanyOverride, setShowCompanyOverride] = useState(false);

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
        companyFantasyName: chosen.fantasyName || "",
        companyNumber: chosen.number || "",
        companySector: chosen.sector || "",
        companyCep: chosen.cep || "",
        companyBairro: chosen.bairro || "",
        companyCity: chosen.city || "",
        companyState: chosen.state || "MT",
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

    const newSector: Sector = {
      id: "sector-" + Date.now(),
      name: newSectorName.trim(),
      employeeCount: Math.max(1, empCount),
      risksRecognized: newSectorRecognized,
      scores: {},
    };

    const updatedSectors = [...report.sectors, newSector];
    const hasAnyRecognized = updatedSectors.some((s) => s.risksRecognized !== false);

    onChange({
      sectors: updatedSectors,
      risksRecognized: hasAnyRecognized,
    });

    setNewSectorName("");
    setNewSectorEmployees("");
    setNewSectorRecognized(true);
  };

  const handleRemoveSector = (id: string) => {
    const updatedSectors = report.sectors.filter((s) => s.id !== id);
    const updatedInventory = report.riskInventory.filter((item) => item.sectorId !== id);
    const hasAnyRecognized = updatedSectors.length > 0 ? updatedSectors.some((s) => s.risksRecognized !== false) : true;
    onChange({
      sectors: updatedSectors,
      riskInventory: updatedInventory,
      risksRecognized: hasAnyRecognized,
    });
  };

  const startEditingSector = (sector: Sector) => {
    setEditingSectorId(sector.id);
    setEditingName(sector.name);
    setEditingEmployees(sector.employeeCount.toString());
    setEditingRecognized(sector.risksRecognized ?? true);
  };

  const handleSaveSectorEdit = (id: string) => {
    if (!editingName.trim()) return;
    const empCount = parseInt(editingEmployees) || 0;
    const finalCount = Math.max(1, empCount);

    const updatedSectors = report.sectors.map((s) => {
      if (s.id === id) {
        return {
          ...s,
          name: editingName.trim(),
          employeeCount: finalCount,
          risksRecognized: editingRecognized,
        };
      }
      return s;
    });

    const updatedInventory = (report.riskInventory || [])
      .filter((item) => !(item.sectorId === id && !editingRecognized))
      .map((item) => (item.sectorId === id ? { ...item, exposedCount: finalCount } : item));

    const hasAnyRecognized = updatedSectors.some((s) => s.risksRecognized !== false);

    onChange({
      sectors: updatedSectors,
      riskInventory: updatedInventory,
      risksRecognized: hasAnyRecognized,
    });
    setEditingSectorId(null);
  };

  const currentEvaluator = report.evaluator || defaultAssessor;

  const handleSelectEvaluator = (evaluatorId: string) => {
    if (evaluatorId === "matriz" || !evaluatorId) {
      onChange({ evaluator: undefined });
    } else {
      const chosen = evaluators.find((e) => e.id === evaluatorId);
      if (chosen) {
        onChange({ evaluator: chosen });
      }
    }
  };

  return (
    <div className="space-y-5" id="general-info-container">
      {/* Barra compacta contextual da Empresa & Metodologia (sem repetição de formulários completos por padrão) */}
      <div className="bg-white rounded-xl border border-slate-200 px-5 py-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {report.companyLogo ? (
              <img
                src={report.companyLogo}
                alt=""
                className="w-8 h-8 rounded-lg object-contain border border-slate-200 bg-white shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                <Building className="w-4 h-4" />
              </div>
            )}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
                <span className="text-sm font-bold text-slate-900 truncate">
                  {report.companyFantasyName || report.companyName}
                </span>
                <span className="text-xs text-slate-400">·</span>
                <span className="text-xs font-mono text-slate-500">
                  {report.cnpj || "CNPJ não informado"}
                </span>
                <span className="text-xs text-slate-400">·</span>
                <span className="text-xs font-semibold text-indigo-700">
                  {report.methodology === "qualitative" ? "Avaliação Qualitativa (MPE)" : "COPSOQ II-BR"}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowCompanyOverride(!showCompanyOverride)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition cursor-pointer whitespace-nowrap shrink-0"
          >
            {showCompanyOverride ? "Ocultar dados da empresa" : "Editar empresa / método"}
            {showCompanyOverride ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Edição opcional colapsável da Empresa / Metodologia */}
        {showCompanyOverride && (
          <div className="mt-4 pt-4 border-t border-slate-100 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
              {companies.length > 0 && (
                <div className="md:col-span-5 space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Trocar Empresa Cadastrada</label>
                  <SearchableSelect
                    value={
                      companies.find(
                        (c) =>
                          (c.cnpj && report.cnpj && c.cnpj.replace(/\D/g, "") === report.cnpj.replace(/\D/g, "")) ||
                          c.name === report.companyName
                      )?.id || ""
                    }
                    onChange={(val) => handleSelectCompany(val)}
                    options={companies.map((c) => ({
                      value: c.id,
                      label: c.fantasyName || c.name,
                      subLabel: c.cnpj ? `CNPJ: ${c.cnpj}` : undefined,
                    }))}
                    placeholder="Selecione uma empresa..."
                    searchPlaceholder="Buscar empresa..."
                  />
                </div>
              )}

              <div className={companies.length > 0 ? "md:col-span-4 space-y-1" : "md:col-span-6 space-y-1"}>
                <label className="text-xs font-semibold text-slate-600">Metodologia do Laudo</label>
                <select
                  value={report.methodology || "copsoq"}
                  onChange={(e) => {
                    const next = e.target.value as "copsoq" | "qualitative";
                    const updatedChapters = { ...report.chapters };
                    updatedChapters.metodologia =
                      next === "qualitative" ? DEFAULT_QUALITATIVE_METODOLOGIA : DEFAULT_CHAPTERS.metodologia;
                    onChange({ methodology: next, chapters: updatedChapters });
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-slate-400 outline-none"
                >
                  <option value="copsoq">COPSOQ II-BR (Quantitativa)</option>
                  <option value="qualitative">Avaliação Qualitativa (MPE)</option>
                </select>
              </div>

              <div className="md:col-span-3 space-y-1">
                <label className="text-xs font-semibold text-slate-600">Grau de Risco</label>
                <select
                  value={report.companyRiskDegree || "1"}
                  onChange={(e) => handleAddField("companyRiskDegree", parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-slate-400 outline-none"
                >
                  <option value="1">Grau 1</option>
                  <option value="2">Grau 2</option>
                  <option value="3">Grau 3</option>
                  <option value="4">Grau 4</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Razão Social</label>
                <input
                  type="text"
                  value={report.companyName}
                  onChange={(e) => handleAddField("companyName", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-800 bg-white outline-none focus:ring-2 focus:ring-slate-400"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Nome Fantasia</label>
                <input
                  type="text"
                  value={report.companyFantasyName || ""}
                  onChange={(e) => handleAddField("companyFantasyName", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-800 bg-white outline-none focus:ring-2 focus:ring-slate-400"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">CNPJ / CAEPF</label>
                <input
                  type="text"
                  value={report.cnpj}
                  onChange={(e) => handleAddField("cnpj", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-800 bg-white outline-none focus:ring-2 focus:ring-slate-400"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">CNAE Principal</label>
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
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-800 bg-white outline-none focus:ring-2 focus:ring-slate-400"
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-medium text-slate-600">Ramo / Atividade</label>
                <input
                  type="text"
                  value={report.companySector || ""}
                  onChange={(e) => handleAddField("companySector", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-800 bg-white outline-none focus:ring-2 focus:ring-slate-400"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Logradouro</label>
                <input
                  type="text"
                  value={report.companyAddress || ""}
                  onChange={(e) => handleAddField("companyAddress", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-800 bg-white outline-none focus:ring-2 focus:ring-slate-400"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">Nº</label>
                  <input
                    type="text"
                    value={report.companyNumber || ""}
                    onChange={(e) => handleAddField("companyNumber", e.target.value)}
                    className="w-full px-2.5 py-2 rounded-lg border border-slate-200 text-xs text-slate-800 bg-white outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">Cidade</label>
                  <input
                    type="text"
                    value={report.companyCity || ""}
                    onChange={(e) => handleAddField("companyCity", e.target.value)}
                    className="w-full px-2.5 py-2 rounded-lg border border-slate-200 text-xs text-slate-800 bg-white outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">UF</label>
                  <select
                    value={report.companyState || "MT"}
                    onChange={(e) => handleAddField("companyState", e.target.value)}
                    className="w-full px-2 py-2 rounded-lg border border-slate-200 text-xs text-slate-800 bg-white outline-none"
                  >
                    {ESTADOS_BRASILEIROS.map((uf) => (
                      <option key={uf} value={uf}>{uf}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1">
              {report.companyLogo ? (
                <div className="relative w-12 h-12 border border-slate-200 rounded-lg overflow-hidden bg-slate-50 flex items-center justify-center shrink-0">
                  <img src={report.companyLogo} alt="Logo Cliente" className="max-w-full max-h-full object-contain" />
                  <button
                    type="button"
                    onClick={() => handleAddField("companyLogo", "")}
                    className="absolute inset-0 bg-black/55 text-white flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity text-[10px] font-bold cursor-pointer"
                  >
                    Remover
                  </button>
                </div>
              ) : (
                <label className="w-12 h-12 border border-dashed border-slate-300 hover:border-slate-500 rounded-lg flex flex-col items-center justify-center cursor-pointer transition bg-slate-50 shrink-0">
                  <Plus className="w-4 h-4 text-slate-400" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        try {
                          const compressed = await compressImage(file, 300, 300, 0.8);
                          handleAddField("companyLogo", compressed);
                        } catch (err) {
                          console.error("Erro ao comprimir logo do cliente:", err);
                        }
                      }
                    }}
                    className="hidden"
                  />
                </label>
              )}
              <span className="text-xs text-slate-500">Logomarca da empresa cliente (exibida na capa e cabeçalho A4)</span>
            </div>
          </div>
        )}
      </div>

      {/* Grid Principal de Cards Operacionais */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Card 1: Empresa Avaliadora & Período */}
        <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-slate-200 flex flex-col justify-between gap-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-slate-600" />
                Empresa Avaliadora
              </h3>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 block">Unidade Responsável</label>
              <SearchableSelect
                value={report.evaluator?.id || "matriz"}
                onChange={(val) => handleSelectEvaluator(val)}
                options={[
                  { value: "matriz", label: defaultAssessor?.fantasyName || "Empresa Matriz (Padrão)", subLabel: "Configuração principal" },
                  ...evaluators.map((ev) => ({
                    value: ev.id,
                    label: ev.fantasyName || ev.socialName,
                    subLabel: ev.cnpj ? `CNPJ: ${ev.cnpj}` : undefined,
                  })),
                ]}
                placeholder="Selecione a empresa avaliadora..."
                required
              />
            </div>

            {currentEvaluator && (
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className="w-10 h-10 border border-slate-200 rounded-lg overflow-hidden bg-white flex items-center justify-center shrink-0">
                  {currentEvaluator.logo ? (
                    <img src={currentEvaluator.logo} alt="Logo" className="max-w-full max-h-full object-contain p-0.5" />
                  ) : (
                    <Building className="w-4 h-4 text-slate-400" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-800 truncate">{currentEvaluator.fantasyName}</div>
                  <div className="text-[11px] text-slate-500 truncate">
                    {currentEvaluator.cnpj} {currentEvaluator.city ? `· ${currentEvaluator.city}-${currentEvaluator.state}` : ""}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Data de Início
              </label>
              <input
                type="date"
                value={report.dateStart}
                onChange={(e) => handleAddField("dateStart", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-slate-400 outline-none text-xs font-medium text-slate-800 bg-white tabular-nums"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Data de Conclusão
              </label>
              <input
                type="date"
                value={report.dateEnd}
                onChange={(e) => handleAddField("dateEnd", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-slate-400 outline-none text-xs font-medium text-slate-800 bg-white tabular-nums"
              />
            </div>
          </div>
        </div>

        {/* Card 2: Responsável Técnico (SST) */}
        <div className="lg:col-span-7 bg-white p-5 rounded-xl border border-slate-200 flex flex-col justify-between gap-4">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-2.5 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <User className="w-4 h-4 text-slate-600" />
                Responsável Técnico (SST)
              </h3>

              {professionals.length > 0 && (
                <div className="w-full sm:w-64">
                  <SearchableSelect
                    value={
                      professionals.find(
                        (p) =>
                          (p.reg && report.professionalReg && p.reg === report.professionalReg && p.name === report.professionalName) ||
                          p.name === report.professionalName
                      )?.id || ""
                    }
                    onChange={(val) => handleSelectProfessional(val)}
                    options={professionals.map((p) => ({
                      value: p.id,
                      label: p.name,
                      subLabel: `${p.role} · ${p.reg}`,
                    }))}
                    placeholder="Selecionar profissional salvo..."
                    searchPlaceholder="Buscar profissional..."
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-semibold text-slate-600">Nome Completo do Profissional</label>
                <input
                  type="text"
                  value={report.professionalName}
                  onChange={(e) => handleAddField("professionalName", e.target.value)}
                  placeholder="Ex: Carlos de Souza Santos"
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-slate-400 outline-none text-sm text-slate-800 bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Cargo / Função Técnica</label>
                <SearchableSelect
                  value={report.professionalRole}
                  onChange={(val) => onChange({ professionalRole: val as any })}
                  options={[
                    { value: "Técnico de Segurança do Trabalho", label: "Técnico de Segurança do Trabalho" },
                    { value: "Engenheiro de Segurança do Trabalho", label: "Engenheiro de Segurança do Trabalho" },
                    { value: "Psicólogo Organizacional", label: "Psicólogo Organizacional" },
                    { value: "Outro", label: "Outro Profissional de SST" },
                  ]}
                  placeholder="Selecione o cargo..."
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Registro (MTE / CREA / CRP)</label>
                <input
                  type="text"
                  value={report.professionalReg}
                  onChange={(e) => handleAddField("professionalReg", e.target.value)}
                  placeholder="Ex: MTE nº 12.345 / CREA-MT"
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-slate-400 outline-none text-sm text-slate-800 bg-white"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Card 3: Cadastro dos Setores / GES */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-slate-600" />
            Setores e Grupos de Exposição Similar (GES)
          </h3>
          <span className="text-xs font-mono font-semibold text-slate-500 tabular-nums">
            {report.sectors.length} {report.sectors.length === 1 ? "setor" : "setores"} ·{" "}
            {report.sectors.reduce((acc, s) => acc + (s.employeeCount || 0), 0)} trabalhadores
          </span>
        </div>

        {/* Formulário inline para Novo Setor */}
        <form onSubmit={handleAddSector} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="space-y-1 md:col-span-5">
            <label className="text-xs font-semibold text-slate-600">Nome do Setor / GES</label>
            <input
              type="text"
              required
              value={newSectorName}
              onChange={(e) => setNewSectorName(e.target.value)}
              placeholder="Ex: Administrativo (Faturamento e RH)"
              className="w-full px-3.5 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-slate-400 bg-white outline-none text-sm text-slate-800"
            />
          </div>

          <div className="space-y-1 md:col-span-2">
            <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-slate-400" /> Trabalhadores
            </label>
            <input
              type="number"
              min="1"
              required
              value={newSectorEmployees}
              onChange={(e) => setNewSectorEmployees(e.target.value)}
              placeholder="Ex: 12"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-slate-400 bg-white outline-none text-sm text-slate-800 tabular-nums"
            />
          </div>

          <div className="space-y-1 md:col-span-2">
            <label className="text-xs font-semibold text-slate-600 block">Reconhece Riscos?</label>
            <button
              type="button"
              onClick={() => setNewSectorRecognized(!newSectorRecognized)}
              className={`w-full font-bold text-xs py-2 px-3 rounded-lg border transition cursor-pointer ${
                newSectorRecognized
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : "bg-slate-100 border-slate-200 text-slate-500"
              }`}
            >
              {newSectorRecognized ? "Sim" : "Não"}
            </button>
          </div>

          <div className="md:col-span-3">
            <button
              type="submit"
              className="w-full bg-slate-900 hover:bg-black text-white font-bold text-xs py-2.5 px-4 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" /> Adicionar Setor
            </button>
          </div>
        </form>

        {/* Tabela de Setores */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-2.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider">Setor / GES</th>
                <th className="px-4 py-2.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider w-40 text-center">Trabalhadores</th>
                <th className="px-4 py-2.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider w-36 text-center">Reconhece Riscos</th>
                <th className="px-4 py-2.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider w-28 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {report.sectors.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-400 text-xs">
                    Nenhum setor cadastrado. Adicione os setores avaliados no formulário acima.
                  </td>
                </tr>
              ) : (
                report.sectors.map((sector) => (
                  <tr key={sector.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3">
                      {editingSectorId === sector.id ? (
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-400 outline-none text-slate-800"
                        />
                      ) : (
                        <span className="font-semibold text-slate-800 text-sm">{sector.name}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {editingSectorId === sector.id ? (
                        <input
                          type="number"
                          min="1"
                          value={editingEmployees}
                          onChange={(e) => setEditingEmployees(e.target.value)}
                          className="w-20 px-2 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-400 outline-none text-center text-slate-800 tabular-nums"
                        />
                      ) : (
                        <span className="text-slate-700 text-sm font-mono font-semibold tabular-nums">
                          {sector.employeeCount}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {editingSectorId === sector.id ? (
                        <button
                          type="button"
                          onClick={() => setEditingRecognized(!editingRecognized)}
                          className={`text-xs px-2.5 py-1 border rounded-lg font-semibold cursor-pointer ${
                            editingRecognized
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : "bg-slate-100 text-slate-500 border-slate-200"
                          }`}
                        >
                          {editingRecognized ? "Sim" : "Não"}
                        </button>
                      ) : (
                        <span
                          className={`inline-flex items-center text-xs font-bold px-2.5 py-0.5 rounded-md border ${
                            sector.risksRecognized !== false
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-slate-100 text-slate-500 border-slate-200"
                          }`}
                        >
                          {sector.risksRecognized !== false ? "Sim" : "Não"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1.5">
                        {editingSectorId === sector.id ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleSaveSectorEdit(sector.id)}
                              className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg hover:bg-emerald-100 transition cursor-pointer"
                            >
                              Salvar
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingSectorId(null)}
                              className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg hover:bg-slate-200 transition cursor-pointer"
                            >
                              Cancelar
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => startEditingSector(sector)}
                              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                              title="Editar Setor"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            {deletingSectorId === sector.id ? (
                              <div className="flex items-center gap-1 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded-lg">
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleRemoveSector(sector.id);
                                    setDeletingSectorId(null);
                                  }}
                                  className="text-[11px] font-bold text-rose-700 hover:text-rose-900 px-1 cursor-pointer"
                                >
                                  Sim
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeletingSectorId(null)}
                                  className="text-[11px] font-semibold text-slate-500 hover:text-slate-700 px-1 cursor-pointer"
                                >
                                  Não
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setDeletingSectorId(sector.id)}
                                className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                title="Excluir Setor"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
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
