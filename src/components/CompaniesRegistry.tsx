/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Building, Plus, Trash2, Edit2, Check, X, ShieldCheck, Copy } from "lucide-react";

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

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (isEdit) {
          setEditLogo(reader.result as string);
        } else {
          setLogo(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
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
    
    // Reset form
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
  };

  const saveEdit = () => {
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
  };

  return (
    <div className="space-y-6" id="companies-registry">
      <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-xs">
        <h3 className="text-md font-semibold text-slate-800 flex items-center gap-2">
          <Building className="w-5 h-5 text-slate-600" />
          Cadastro de Empresas Clientes
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          Registre as empresas clientes com dados separados para preenchimento ágil nos relatórios de riscos psicossociais.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* Formulário de Cadastro */}
        <form onSubmit={handleAdd} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs xl:col-span-5 h-fit space-y-4">
          <h4 className="font-semibold text-slate-800 text-sm flex items-center gap-2 border-b border-slate-100 pb-3">
            <Plus className="w-4 h-4 text-slate-600" /> Nova Empresa
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Nome Fantasia</label>
              <input
                type="text"
                required
                value={fantasyName}
                onChange={(e) => setFantasyName(e.target.value)}
                placeholder="Ex: Filial Sul"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-slate-400 outline-none text-sm text-slate-800 bg-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Razão Social</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Metalúrgica Beta Ltda"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-slate-400 outline-none text-sm text-slate-800 bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">CNPJ / CAEPF</label>
              <input
                type="text"
                required
                value={cnpj}
                onChange={(e) => setCnpj(e.target.value)}
                placeholder="Ex: 12.345.678/0001-99"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-slate-400 outline-none text-sm text-slate-800 bg-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">CNAE Principal</label>
              <input
                type="text"
                value={cnae}
                onChange={handleCnaeChange}
                placeholder="Ex: 1234-5/67"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-slate-400 outline-none text-sm text-slate-800 bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1 sm:col-span-1">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Grau de Risco</label>
              <select
                value={riskDegree}
                onChange={(e) => setRiskDegree(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-slate-400 outline-none text-sm text-slate-800 bg-white"
              >
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
              </select>
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Setor / Atividade</label>
              <input
                type="text"
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                placeholder="Ex: Produção Pesada"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-slate-400 outline-none text-sm text-slate-800 bg-white"
              />
            </div>
          </div>

          {/* Endereço Detalhado */}
          <div className="border-t border-slate-100 pt-3 space-y-4">
            <span className="text-[10px] font-black uppercase text-slate-400 block tracking-widest">Endereço da Empresa</span>
            
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="space-y-1 sm:col-span-3">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Logradouro / Endereço</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Ex: Av. das Palmeiras"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-slate-400 outline-none text-sm text-slate-800 bg-white"
                />
              </div>

              <div className="space-y-1 sm:col-span-1">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Número</label>
                <input
                  type="text"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  placeholder="Ex: 500-A"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-slate-400 outline-none text-sm text-slate-800 bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">CEP</label>
                <input
                  type="text"
                  value={cep}
                  onChange={handleCepChange}
                  placeholder="Ex: 78250-000"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-slate-400 outline-none text-sm text-slate-800 bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Bairro</label>
                <input
                  type="text"
                  value={bairro}
                  onChange={(e) => setBairro(e.target.value)}
                  placeholder="Ex: Centro"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-slate-400 outline-none text-sm text-slate-800 bg-white"
                />
              </div>

              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-8 space-y-1">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Cidade</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Cidade"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-slate-400 outline-none text-sm text-slate-800 bg-white"
                  />
                </div>
                <div className="col-span-4 space-y-1">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">UF</label>
                  <select
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full px-2 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-slate-400 outline-none text-sm text-slate-800 bg-white"
                  >
                    {ESTADOS_BRASILEIROS.map((uf) => (
                      <option key={uf} value={uf}>{uf}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-1 border-t border-slate-100 pt-3">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block">Logo da Empresa</label>
            <div className="flex items-center gap-3">
              {logo ? (
                <div className="relative w-14 h-14 border border-slate-200 rounded-lg overflow-hidden bg-slate-50 flex items-center justify-center">
                  <img src={logo} alt="Logo" className="max-w-full max-h-full object-contain" />
                  <button
                    type="button"
                    onClick={() => setLogo("")}
                    className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity text-[10px] font-bold cursor-pointer"
                  >
                    Excluir
                  </button>
                </div>
              ) : (
                <label className="w-14 h-14 border-2 border-dashed border-slate-200 hover:border-slate-400 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-50/50">
                  <Plus className="w-4 h-4 text-slate-400" />
                  <span className="text-[8px] text-slate-400 font-bold uppercase mt-0.5">Logo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleLogoUpload(e, false)}
                    className="hidden"
                  />
                </label>
              )}
              <div className="text-[10px] text-slate-400 leading-tight">
                <span className="font-bold block text-slate-500">Logo do Cliente (opcional)</span>
                Aparecerá nos cabeçalhos e na capa.
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-slate-800 hover:bg-slate-900 text-white font-medium text-xs py-2.5 uppercase tracking-wider rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Cadastrar Empresa
          </button>
        </form>

        {/* Lista de Empresas Cadastradas */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs xl:col-span-7 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <h4 className="font-semibold text-slate-800 text-sm">
              Empresas Cadastradas ({companies.length})
            </h4>
            <input
              type="text"
              placeholder="Buscar por nome, fantasia, CNPJ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-800 focus:ring-2 focus:ring-slate-400 focus:border-slate-400 outline-none w-full sm:w-64"
            />
          </div>

          {companies.length === 0 ? (
            <p className="text-sm text-slate-400 italic text-center py-10">
              Nenhuma empresa cadastrada ainda.
            </p>
          ) : (() => {
            const filteredCompanies = companies.filter((company) => {
              const q = searchQuery.toLowerCase().trim();
              if (!q) return true;
              return (
                company.name.toLowerCase().includes(q) ||
                (company.fantasyName || "").toLowerCase().includes(q) ||
                (company.cnpj || "").toLowerCase().includes(q) ||
                (company.city || "").toLowerCase().includes(q)
              );
            });

            if (filteredCompanies.length === 0) {
              return (
                <p className="text-sm text-slate-400 italic text-center py-10">
                  Nenhuma empresa corresponde à sua busca.
                </p>
              );
            }

            return (
              <div className="divide-y divide-slate-100 max-h-[750px] overflow-y-auto pr-1">
                {filteredCompanies.map((company) => (
                <div key={company.id} className="py-4 flex flex-col gap-2">
                  {editingId === company.id ? (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Nome Fantasia</label>
                          <input
                            type="text"
                            value={editFantasyName}
                            onChange={(e) => setEditFantasyName(e.target.value)}
                            className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded bg-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Razão Social</label>
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded bg-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">CNPJ / CAEPF</label>
                          <input
                            type="text"
                            value={editCnpj}
                            onChange={(e) => setEditCnpj(e.target.value)}
                            className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded bg-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">CNAE Principal</label>
                          <input
                            type="text"
                            value={editCnae}
                            onChange={handleEditCnaeChange}
                            className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded bg-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Grau de Risco</label>
                          <select
                            value={editRiskDegree}
                            onChange={(e) => setEditRiskDegree(e.target.value)}
                            className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded bg-white"
                          >
                            <option value="1">1</option>
                            <option value="2">2</option>
                            <option value="3">3</option>
                            <option value="4">4</option>
                          </select>
                        </div>
                        <div className="space-y-1 md:col-span-2">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Setor</label>
                          <input
                            type="text"
                            value={editSector}
                            onChange={(e) => setEditSector(e.target.value)}
                            className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded bg-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div className="space-y-1 md:col-span-3">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Logradouro / Rua</label>
                          <input
                            type="text"
                            value={editAddress}
                            onChange={(e) => setEditAddress(e.target.value)}
                            className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded bg-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Número</label>
                          <input
                            type="text"
                            value={editNumber}
                            onChange={(e) => setEditNumber(e.target.value)}
                            className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded bg-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">CEP</label>
                          <input
                            type="text"
                            value={editCep}
                            onChange={handleEditCepChange}
                            className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded bg-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Bairro</label>
                          <input
                            type="text"
                            value={editBairro}
                            onChange={(e) => setEditBairro(e.target.value)}
                            className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded bg-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Cidade</label>
                          <input
                            type="text"
                            value={editCity}
                            onChange={(e) => setEditCity(e.target.value)}
                            className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded bg-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">UF</label>
                          <select
                            value={editState}
                            onChange={(e) => setEditState(e.target.value)}
                            className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded bg-white"
                          >
                            {ESTADOS_BRASILEIROS.map((uf) => (
                              <option key={uf} value={uf}>{uf}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase block">Logo da Empresa</label>
                        <div className="flex items-center gap-3">
                          {editLogo ? (
                            <div className="relative w-12 h-12 border border-slate-200 rounded-lg overflow-hidden bg-white flex items-center justify-center">
                              <img src={editLogo} alt="Logo" className="max-w-full max-h-full object-contain" />
                              <button
                                type="button"
                                onClick={() => setEditLogo("")}
                                className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity text-[10px] font-bold cursor-pointer"
                              >
                                Excluir
                              </button>
                            </div>
                          ) : (
                            <label className="w-12 h-12 border-2 border-dashed border-slate-300 hover:border-slate-400 rounded-lg flex flex-col items-center justify-center cursor-pointer bg-white">
                              <Plus className="w-4 h-4 text-slate-400" />
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleLogoUpload(e, true)}
                                className="hidden"
                              />
                            </label>
                          )}
                          <span className="text-[10px] text-slate-400">Clique para alterar ou remover a logo desta empresa.</span>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          onClick={saveEdit}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Check className="w-4 h-4" /> Salvar
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <X className="w-4 h-4" /> Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-4 p-3.5 rounded-xl hover:bg-slate-50/80 border border-transparent hover:border-slate-100 transition-all">
                      {company.logo && (
                        <div className="w-12 h-12 border border-slate-150 rounded-lg overflow-hidden shrink-0 bg-slate-50 flex items-center justify-center">
                          <img src={company.logo} alt="Logo" className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                        </div>
                      )}
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {company.fantasyName && (
                            <span className="text-[10px] font-extrabold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded uppercase">
                              {company.fantasyName}
                            </span>
                          )}
                          <h5 className="font-bold text-slate-800 text-sm truncate">{company.name}</h5>
                          <span className="text-[10px] font-extrabold text-slate-500 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded uppercase shrink-0">
                            GR {company.riskDegree || 1}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-2 text-[10px] font-mono font-medium text-slate-500">
                          {company.cnpj && (
                            <span className="bg-slate-50 border border-slate-100 px-2 py-0.5 rounded">
                              CNPJ/CAEPF: {company.cnpj}
                            </span>
                          )}
                          {company.cnae && (
                            <span className="bg-slate-50 border border-slate-100 px-2 py-0.5 rounded">
                              CNAE: {company.cnae}
                            </span>
                          )}
                          {company.sector && (
                            <span className="bg-slate-50 border border-slate-100 px-2 py-0.5 rounded uppercase text-[9px] font-bold">
                              Setor: {company.sector}
                            </span>
                          )}
                        </div>

                        {(company.address || company.city) && (
                          <p className="text-xs text-slate-500 leading-tight">
                            <span className="font-semibold text-slate-700">Endereço:</span>{" "}
                            {company.address ? `${company.address}, ${company.number || "s/n"}` : ""}{" "}
                            {company.bairro ? ` - ${company.bairro}` : ""}{" "}
                            {company.city ? ` - ${company.city}/${company.state || "SP"}` : ""}{" "}
                            {company.cep ? ` (CEP: ${company.cep})` : ""}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDuplicate(company)}
                          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition cursor-pointer"
                          title="Duplicar Empresa"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => startEdit(company)}
                          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition cursor-pointer"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {deletingId === company.id ? (
                          <div className="flex items-center gap-1 bg-rose-50 border border-rose-200 p-0.5 rounded-md">
                            <span className="text-[9px] font-bold text-rose-800 px-1">Excluir?</span>
                            <button
                              type="button"
                              onClick={() => {
                                handleDelete(company.id);
                                setDeletingId(null);
                              }}
                              className="text-[9px] font-black text-rose-700 hover:text-rose-900 bg-rose-100/50 px-1.5 py-0.5 rounded cursor-pointer"
                            >
                              Sim
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingId(null)}
                              className="text-[9px] font-bold text-slate-500 hover:text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded cursor-pointer"
                            >
                              Não
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeletingId(company.id)}
                            className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            );
          })()}
        </div>

      </div>
    </div>
  );
};
