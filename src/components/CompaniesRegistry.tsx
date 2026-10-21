/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Building, Plus, Trash2, Edit2, Check, X, Copy, Search, MapPin, ShieldAlert, Sparkles } from "lucide-react";
import { compressImage } from "../imageUtils";

interface Company {
  id: string;
  fantasyName?: string; // Nome Fantasia
  name: string; // Razão Social
  cnpj: string; // CNPJ / CAEPF
  cnae?: string;
  riskDegree?: number;
  address?: string; // Logradouro / Endereço
  number?: string; // Número
  sector?: string; // Setor / Atividade
  cep?: string; // CEP
  bairro?: string; // Bairro
  city?: string; // Cidade
  state?: string; // Estado (UF)
  logo?: string; // Base64 logo
}

interface CompaniesRegistryProps {
  companies: Company[];
  onUpdateCompanies: (companies: Company[]) => void;
}

const ESTADOS_BRASILEIROS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", 
  "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", 
  "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

export const CompaniesRegistry: React.FC<CompaniesRegistryProps> = ({
  companies,
  onUpdateCompanies,
}) => {
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Form states for creating
  const [fantasyName, setFantasyName] = useState("");
  const [name, setName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [cnae, setCnae] = useState("");
  const [riskDegree, setRiskDegree] = useState<string>("1");
  const [address, setAddress] = useState("");
  const [number, setNumber] = useState("");
  const [sector, setSector] = useState("");
  const [cep, setCep] = useState("");
  const [bairro, setBairro] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("SP");
  const [logo, setLogo] = useState<string>("");

  // Edit states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFantasyName, setEditFantasyName] = useState("");
  const [editName, setEditName] = useState("");
  const [editCnpj, setEditCnpj] = useState("");
  const [editCnae, setEditCnae] = useState("");
  const [editRiskDegree, setEditRiskDegree] = useState<string>("1");
  const [editAddress, setEditAddress] = useState("");
  const [editNumber, setEditNumber] = useState("");
  const [editSector, setEditSector] = useState("");
  const [editCep, setEditCep] = useState("");
  const [editBairro, setEditBairro] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editState, setEditState] = useState("SP");
  const [editLogo, setEditLogo] = useState<string>("");

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const handleDuplicate = (company: Company) => {
    const duplicatedCompany: Company = {
      ...company,
      id: "comp-" + Date.now(),
      name: `${company.name} (Cópia)`,
      fantasyName: company.fantasyName ? `${company.fantasyName} (Cópia)` : undefined,
    };
    onUpdateCompanies([...companies, duplicatedCompany]);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file, 300, 300, 0.75);
        if (isEdit) {
          setEditLogo(compressed);
        } else {
          setLogo(compressed);
        }
      } catch (err) {
        console.error("Erro ao processar imagem de logo:", err);
      }
    }
  };

  const formatCnae = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 7);
    if (digits.length <= 4) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
    return `${digits.slice(0, 4)}-${digits.slice(4, 5)}/${digits.slice(5)}`;
  };

  const handleCnaeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCnae(formatCnae(e.target.value));
  };

  const handleEditCnaeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditCnae(formatCnae(e.target.value));
  };

  const formatCep = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 8);
    if (digits.length <= 5) return digits;
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  };

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCep(formatCep(e.target.value));
  };

  const handleEditCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditCep(formatCep(e.target.value));
  };

  const resetAddForm = () => {
    setFantasyName("");
    setName("");
    setCnpj("");
    setCnae("");
    setRiskDegree("1");
    setAddress("");
    setNumber("");
    setSector("");
    setCep("");
    setBairro("");
    setCity("");
    setState("SP");
    setLogo("");
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newCompany: Company = {
      id: "comp-" + Date.now(),
      fantasyName: fantasyName.trim(),
      name: name.trim(),
      cnpj: cnpj.trim(),
      cnae: cnae.trim(),
      riskDegree: parseInt(riskDegree) || 1,
      address: address.trim(),
      number: number.trim(),
      sector: sector.trim(),
      cep: cep.trim(),
      bairro: bairro.trim(),
      city: city.trim(),
      state: state,
      logo: logo || undefined,
    };

    onUpdateCompanies([...companies, newCompany]);
    resetAddForm();
    setIsAddModalOpen(false);
  };

  const handleDelete = (id: string) => {
    onUpdateCompanies(companies.filter((c) => c.id !== id));
  };

  const startEdit = (company: Company) => {
    setEditingId(company.id);
    setEditFantasyName(company.fantasyName || "");
    setEditName(company.name);
    setEditCnpj(company.cnpj);
    setEditCnae(company.cnae || "");
    setEditRiskDegree((company.riskDegree || 1).toString());
    setEditAddress(company.address || "");
    setEditNumber(company.number || "");
    setEditSector(company.sector || "");
    setEditCep(company.cep || "");
    setEditBairro(company.bairro || "");
    setEditCity(company.city || "");
    setEditState(company.state || "SP");
    setEditLogo(company.logo || "");
    setIsEditModalOpen(true);
  };

  const saveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;

    onUpdateCompanies(
      companies.map((c) =>
        c.id === editingId
          ? {
              ...c,
              fantasyName: editFantasyName.trim(),
              name: editName.trim(),
              cnpj: editCnpj.trim(),
              cnae: editCnae.trim(),
              riskDegree: parseInt(editRiskDegree) || 1,
              address: editAddress.trim(),
              number: editNumber.trim(),
              sector: editSector.trim(),
              cep: editCep.trim(),
              bairro: editBairro.trim(),
              city: editCity.trim(),
              state: editState,
              logo: editLogo || undefined,
            }
          : c
      )
    );
    setEditingId(null);
    setIsEditModalOpen(false);
  };

  const filteredCompanies = companies.filter((company) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      company.name.toLowerCase().includes(q) ||
      (company.fantasyName || "").toLowerCase().includes(q) ||
      (company.cnpj || "").toLowerCase().includes(q) ||
      (company.city || "").toLowerCase().includes(q) ||
      (company.sector || "").toLowerCase().includes(q)
    );
  });

  const getRiskDegreeBadge = (gr?: number) => {
    const val = gr || 1;
    switch (val) {
      case 1:
        return "bg-blue-50 text-blue-700 border-blue-200";
      case 2:
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case 3:
        return "bg-amber-50 text-amber-700 border-amber-200";
      case 4:
        return "bg-rose-50 text-rose-700 border-rose-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="space-y-6" id="companies-registry">
      {/* Header com Ação Principal e Busca */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-slate-100 text-slate-700 rounded-xl">
              <Building className="w-5 h-5" />
            </span>
            <h3 className="text-lg font-bold text-slate-800">
              Cadastro de Empresas Clientes
            </h3>
          </div>
          <p className="text-xs text-slate-500 max-w-xl">
            Registre e gerencie as empresas clientes com dados completos de SST, CNAE, grau de risco e identidade visual para auto-preenchimento nos laudos.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            resetAddForm();
            setIsAddModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          Cadastrar Nova Empresa
        </button>
      </div>

      {/* Lista Principal de Empresas Cadastradas (Layout Amplo e Espaçoso) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
        {/* Barra de Busca e Métricas */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <span>Empresas Registradas</span>
            <span className="bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full text-[11px] font-mono">
              {companies.length}
            </span>
          </div>

          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por razão social, fantasia, CNPJ, cidade..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:ring-2 focus:ring-slate-400 focus:border-slate-400 outline-none transition bg-slate-50/50 focus:bg-white"
            />
          </div>
        </div>

        {/* Listagem de Empresas */}
        {companies.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto border border-slate-100">
              <Building className="w-8 h-8" />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h4 className="text-sm font-bold text-slate-800">Nenhuma empresa cadastrada</h4>
              <p className="text-xs text-slate-500">
                Cadastre sua primeira empresa cliente clicando no botão abaixo para agilizar a emissão dos relatórios de riscos psicossociais.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                resetAddForm();
                setIsAddModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Cadastrar Nova Empresa
            </button>
          </div>
        ) : filteredCompanies.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <p className="text-sm text-slate-600 font-semibold">Nenhuma empresa encontrada para &quot;{searchQuery}&quot;</p>
            <p className="text-xs text-slate-400">Verifique os termos digitados ou limpe o campo de busca.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3.5">
            {filteredCompanies.map((company) => (
              <div
                key={company.id}
                className="p-4 sm:p-5 rounded-xl border border-slate-200/80 hover:border-slate-300 bg-white hover:bg-slate-50/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Logo e Dados Principais */}
                <div className="flex items-start gap-4 min-w-0 flex-1">
                  <div className="w-14 h-14 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center shrink-0 overflow-hidden">
                    {company.logo ? (
                      <img
                        src={company.logo}
                        alt={company.name}
                        className="max-w-full max-h-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <Building className="w-6 h-6 text-slate-400" />
                    )}
                  </div>

                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h4 className="font-bold text-slate-900 text-sm sm:text-base leading-snug">
                        {company.fantasyName || company.name}
                      </h4>
                      {company.fantasyName && (
                        <span className="text-xs text-slate-500 font-medium">
                          • {company.name}
                        </span>
                      )}
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${getRiskDegreeBadge(company.riskDegree)}`}>
                        Grau de Risco {company.riskDegree || 1}
                      </span>
                    </div>

                    {/* Tags Fiscais */}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 font-mono">
                      {company.cnpj && (
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200/60 font-semibold text-[11px]">
                          CNPJ: {company.cnpj}
                        </span>
                      )}
                      {company.cnae && (
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200/60 text-[11px]">
                          CNAE: {company.cnae}
                        </span>
                      )}
                      {company.sector && (
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200/60 text-[11px] font-sans font-medium">
                          Atividade: {company.sector}
                        </span>
                      )}
                    </div>

                    {/* Endereço */}
                    {(company.address || company.city) && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 pt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">
                          {company.address ? `${company.address}, ${company.number || "s/n"}` : ""}
                          {company.bairro ? ` - ${company.bairro}` : ""}
                          {company.city ? ` • ${company.city}/${company.state || "SP"}` : ""}
                          {company.cep ? ` (CEP: ${company.cep})` : ""}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Ações */}
                <div className="flex items-center gap-1.5 self-end md:self-center shrink-0 border-t md:border-t-0 pt-2 md:pt-0 w-full md:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => handleDuplicate(company)}
                    className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer flex items-center gap-1 text-xs font-semibold"
                    title="Duplicar Empresa"
                  >
                    <Copy className="w-4 h-4" />
                    <span className="hidden sm:inline">Duplicar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => startEdit(company)}
                    className="p-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition cursor-pointer flex items-center gap-1 text-xs font-semibold"
                    title="Editar Empresa"
                  >
                    <Edit2 className="w-4 h-4" />
                    <span>Editar</span>
                  </button>

                  {deletingId === company.id ? (
                    <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 p-1 rounded-lg">
                      <span className="text-[10px] font-bold text-rose-800 px-1">Excluir?</span>
                      <button
                        type="button"
                        onClick={() => {
                          handleDelete(company.id);
                          setDeletingId(null);
                        }}
                        className="text-[10px] font-bold text-white bg-rose-600 hover:bg-rose-700 px-2 py-0.5 rounded cursor-pointer transition"
                      >
                        Sim
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingId(null)}
                        className="text-[10px] font-bold text-slate-600 hover:text-slate-800 bg-slate-200 px-2 py-0.5 rounded cursor-pointer transition"
                      >
                        Não
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setDeletingId(company.id)}
                      className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer flex items-center gap-1 text-xs font-semibold"
                      title="Excluir Empresa"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="hidden sm:inline">Excluir</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* POPUP MODAL: Cadastrar Nova Empresa */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-white/10 rounded-xl">
                  <Building className="w-5 h-5 text-amber-300" />
                </span>
                <div>
                  <h4 className="font-extrabold text-sm sm:text-base">Cadastrar Nova Empresa</h4>
                  <p className="text-[11px] text-slate-300">
                    Preencha os dados completos da empresa cliente para os laudos de SST
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body (Scrollable Form) */}
            <form onSubmit={handleAdd} className="overflow-y-auto flex-1 p-6 space-y-6 text-xs">
              {/* Seção 1: Identificação */}
              <div className="space-y-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block border-b border-slate-100 pb-1">
                  1. Identificação Básica
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Nome Fantasia</label>
                    <input
                      type="text"
                      required
                      value={fantasyName}
                      onChange={(e) => setFantasyName(e.target.value)}
                      placeholder="Ex: Filial Sul / Metalúrgica Beta"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-400 outline-none text-xs text-slate-800 bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Razão Social</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: Metalúrgica Beta Indústria Ltda"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-400 outline-none text-xs text-slate-800 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Seção 2: Dados Fiscais e Enquadramento */}
              <div className="space-y-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block border-b border-slate-100 pb-1">
                  2. Dados Fiscais & Grau de Risco
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">CNPJ / CAEPF</label>
                    <input
                      type="text"
                      required
                      value={cnpj}
                      onChange={(e) => setCnpj(e.target.value)}
                      placeholder="Ex: 12.345.678/0001-99"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-400 outline-none text-xs text-slate-800 bg-white font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">CNAE Principal</label>
                    <input
                      type="text"
                      value={cnae}
                      onChange={handleCnaeChange}
                      placeholder="Ex: 1234-5/67"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-400 outline-none text-xs text-slate-800 bg-white font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1 sm:col-span-1">
                    <label className="text-xs font-semibold text-slate-700">Grau de Risco (NR-04)</label>
                    <select
                      value={riskDegree}
                      onChange={(e) => setRiskDegree(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-400 outline-none text-xs text-slate-800 bg-white font-semibold"
                    >
                      <option value="1">Grau 1 (Baixo)</option>
                      <option value="2">Grau 2 (Médio)</option>
                      <option value="3">Grau 3 (Alto)</option>
                      <option value="4">Grau 4 (Muito Alto)</option>
                    </select>
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-700">Setor / Atividade Principal</label>
                    <input
                      type="text"
                      value={sector}
                      onChange={(e) => setSector(e.target.value)}
                      placeholder="Ex: Indústria Metalúrgica e Usinagem"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-400 outline-none text-xs text-slate-800 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Seção 3: Endereço da Empresa */}
              <div className="space-y-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block border-b border-slate-100 pb-1">
                  3. Endereço da Unidade
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="space-y-1 sm:col-span-3">
                    <label className="text-xs font-semibold text-slate-700">Logradouro / Rua / Avenida</label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Ex: Av. dos Trabalhadores"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-400 outline-none text-xs text-slate-800 bg-white"
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-1">
                    <label className="text-xs font-semibold text-slate-700">Número</label>
                    <input
                      type="text"
                      value={number}
                      onChange={(e) => setNumber(e.target.value)}
                      placeholder="Ex: 500-A"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-400 outline-none text-xs text-slate-800 bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Bairro</label>
                    <input
                      type="text"
                      value={bairro}
                      onChange={(e) => setBairro(e.target.value)}
                      placeholder="Ex: Distrito Industrial"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-400 outline-none text-xs text-slate-800 bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">CEP</label>
                    <input
                      type="text"
                      value={cep}
                      onChange={handleCepChange}
                      placeholder="Ex: 78250-000"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-400 outline-none text-xs text-slate-800 bg-white font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-8 space-y-1">
                      <label className="text-xs font-semibold text-slate-700">Cidade</label>
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Cidade"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-400 outline-none text-xs text-slate-800 bg-white"
                      />
                    </div>
                    <div className="col-span-4 space-y-1">
                      <label className="text-xs font-semibold text-slate-700">UF</label>
                      <select
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        className="w-full px-2 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-400 outline-none text-xs text-slate-800 bg-white"
                      >
                        {ESTADOS_BRASILEIROS.map((uf) => (
                          <option key={uf} value={uf}>{uf}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Seção 4: Logo da Empresa */}
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <label className="text-xs font-semibold text-slate-700 block">Logomarca do Cliente</label>
                <div className="flex items-center gap-4">
                  {logo ? (
                    <div className="relative w-16 h-16 border border-slate-200 rounded-xl overflow-hidden bg-slate-50 flex items-center justify-center shrink-0">
                      <img src={logo} alt="Logo Preview" className="max-w-full max-h-full object-contain" />
                      <button
                        type="button"
                        onClick={() => setLogo("")}
                        className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity text-[10px] font-bold cursor-pointer"
                      >
                        Excluir
                      </button>
                    </div>
                  ) : (
                    <label className="w-16 h-16 border-2 border-dashed border-slate-200 hover:border-slate-400 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-50/50 shrink-0">
                      <Plus className="w-5 h-5 text-slate-400" />
                      <span className="text-[9px] text-slate-400 font-bold uppercase mt-1">Logo</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleLogoUpload(e, false)}
                        className="hidden"
                      />
                    </label>
                  )}
                  <div className="text-[11px] text-slate-400 leading-tight">
                    <span className="font-bold block text-slate-600">Identidade Visual da Empresa</span>
                    A logomarca aparecerá nos cabeçalhos e na capa dos laudos gerados para esta organização.
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="border-t border-slate-100 pt-4 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  Salvar Empresa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* POPUP MODAL: Editar Empresa */}
      {/* ========================================================================= */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-white/10 rounded-xl">
                  <Edit2 className="w-5 h-5 text-indigo-300" />
                </span>
                <div>
                  <h4 className="font-extrabold text-sm sm:text-base">Editar Empresa</h4>
                  <p className="text-[11px] text-slate-300">
                    Atualize os dados cadastrais da empresa cliente
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setIsEditModalOpen(false);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body (Scrollable Form) */}
            <form onSubmit={saveEdit} className="overflow-y-auto flex-1 p-6 space-y-6 text-xs">
              {/* Seção 1: Identificação */}
              <div className="space-y-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block border-b border-slate-100 pb-1">
                  1. Identificação Básica
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Nome Fantasia</label>
                    <input
                      type="text"
                      required
                      value={editFantasyName}
                      onChange={(e) => setEditFantasyName(e.target.value)}
                      placeholder="Ex: Filial Sul"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-400 outline-none text-xs text-slate-800 bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Razão Social</label>
                    <input
                      type="text"
                      required
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Ex: Metalúrgica Beta Ltda"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-400 outline-none text-xs text-slate-800 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Seção 2: Dados Fiscais e Enquadramento */}
              <div className="space-y-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block border-b border-slate-100 pb-1">
                  2. Dados Fiscais & Grau de Risco
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">CNPJ / CAEPF</label>
                    <input
                      type="text"
                      required
                      value={editCnpj}
                      onChange={(e) => setEditCnpj(e.target.value)}
                      placeholder="Ex: 12.345.678/0001-99"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-400 outline-none text-xs text-slate-800 bg-white font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">CNAE Principal</label>
                    <input
                      type="text"
                      value={editCnae}
                      onChange={handleEditCnaeChange}
                      placeholder="Ex: 1234-5/67"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-400 outline-none text-xs text-slate-800 bg-white font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1 sm:col-span-1">
                    <label className="text-xs font-semibold text-slate-700">Grau de Risco (NR-04)</label>
                    <select
                      value={editRiskDegree}
                      onChange={(e) => setEditRiskDegree(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-400 outline-none text-xs text-slate-800 bg-white font-semibold"
                    >
                      <option value="1">Grau 1 (Baixo)</option>
                      <option value="2">Grau 2 (Médio)</option>
                      <option value="3">Grau 3 (Alto)</option>
                      <option value="4">Grau 4 (Muito Alto)</option>
                    </select>
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-700">Setor / Atividade Principal</label>
                    <input
                      type="text"
                      value={editSector}
                      onChange={(e) => setEditSector(e.target.value)}
                      placeholder="Ex: Produção e Usinagem"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-400 outline-none text-xs text-slate-800 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Seção 3: Endereço da Empresa */}
              <div className="space-y-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block border-b border-slate-100 pb-1">
                  3. Endereço da Unidade
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="space-y-1 sm:col-span-3">
                    <label className="text-xs font-semibold text-slate-700">Logradouro / Rua / Avenida</label>
                    <input
                      type="text"
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                      placeholder="Ex: Av. das Palmeiras"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-400 outline-none text-xs text-slate-800 bg-white"
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-1">
                    <label className="text-xs font-semibold text-slate-700">Número</label>
                    <input
                      type="text"
                      value={editNumber}
                      onChange={(e) => setEditNumber(e.target.value)}
                      placeholder="Ex: 500-A"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-400 outline-none text-xs text-slate-800 bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Bairro</label>
                    <input
                      type="text"
                      value={editBairro}
                      onChange={(e) => setEditBairro(e.target.value)}
                      placeholder="Ex: Centro"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-400 outline-none text-xs text-slate-800 bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">CEP</label>
                    <input
                      type="text"
                      value={editCep}
                      onChange={handleEditCepChange}
                      placeholder="Ex: 78250-000"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-400 outline-none text-xs text-slate-800 bg-white font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-8 space-y-1">
                      <label className="text-xs font-semibold text-slate-700">Cidade</label>
                      <input
                        type="text"
                        value={editCity}
                        onChange={(e) => setEditCity(e.target.value)}
                        placeholder="Cidade"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-400 outline-none text-xs text-slate-800 bg-white"
                      />
                    </div>
                    <div className="col-span-4 space-y-1">
                      <label className="text-xs font-semibold text-slate-700">UF</label>
                      <select
                        value={editState}
                        onChange={(e) => setEditState(e.target.value)}
                        className="w-full px-2 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-400 outline-none text-xs text-slate-800 bg-white"
                      >
                        {ESTADOS_BRASILEIROS.map((uf) => (
                          <option key={uf} value={uf}>{uf}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Seção 4: Logo da Empresa */}
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <label className="text-xs font-semibold text-slate-700 block">Logomarca do Cliente</label>
                <div className="flex items-center gap-4">
                  {editLogo ? (
                    <div className="relative w-16 h-16 border border-slate-200 rounded-xl overflow-hidden bg-slate-50 flex items-center justify-center shrink-0">
                      <img src={editLogo} alt="Logo Preview" className="max-w-full max-h-full object-contain" />
                      <button
                        type="button"
                        onClick={() => setEditLogo("")}
                        className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity text-[10px] font-bold cursor-pointer"
                      >
                        Excluir
                      </button>
                    </div>
                  ) : (
                    <label className="w-16 h-16 border-2 border-dashed border-slate-200 hover:border-slate-400 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-50/50 shrink-0">
                      <Plus className="w-5 h-5 text-slate-400" />
                      <span className="text-[9px] text-slate-400 font-bold uppercase mt-1">Logo</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleLogoUpload(e, true)}
                        className="hidden"
                      />
                    </label>
                  )}
                  <div className="text-[11px] text-slate-400 leading-tight">
                    <span className="font-bold block text-slate-600">Identidade Visual da Empresa</span>
                    A logomarca aparecerá nos cabeçalhos e na capa dos laudos gerados para esta organização.
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="border-t border-slate-100 pt-4 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setIsEditModalOpen(false);
                  }}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
