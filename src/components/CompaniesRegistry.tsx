/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Building, Plus, Trash2, Edit2, Check, X, ShieldCheck } from "lucide-react";

interface Company {
  id: string;
  name: string;
  cnpj: string;
  address?: string;
  riskDegree?: number;
  cnae?: string;
  logo?: string; // Base64 logo
}

interface CompaniesRegistryProps {
  companies: Company[];
  onUpdateCompanies: (companies: Company[]) => void;
}

export const CompaniesRegistry: React.FC<CompaniesRegistryProps> = ({
  companies,
  onUpdateCompanies,
}) => {
  const [name, setName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [address, setAddress] = useState("");
  const [riskDegree, setRiskDegree] = useState<string>("1");
  const [cnae, setCnae] = useState("");
  const [logo, setLogo] = useState<string>("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCnpj, setEditCnpj] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editRiskDegree, setEditRiskDegree] = useState<string>("1");
  const [editCnae, setEditCnae] = useState("");
  const [editLogo, setEditLogo] = useState<string>("");

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

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newCompany: Company = {
      id: "comp-" + Date.now(),
      name: name.trim(),
      cnpj: cnpj.trim(),
      address: address.trim(),
      riskDegree: parseInt(riskDegree) || 1,
      cnae: cnae.trim(),
      logo: logo || undefined,
    };

    onUpdateCompanies([...companies, newCompany]);
    setName("");
    setCnpj("");
    setAddress("");
    setRiskDegree("1");
    setCnae("");
    setLogo("");
  };

  const handleDelete = (id: string) => {
    if (confirm("Tem certeza que deseja excluir esta empresa?")) {
      onUpdateCompanies(companies.filter((c) => c.id !== id));
    }
  };

  const startEdit = (company: Company) => {
    setEditingId(company.id);
    setEditName(company.name);
    setEditCnpj(company.cnpj);
    setEditAddress(company.address || "");
    setEditRiskDegree((company.riskDegree || 1).toString());
    setEditCnae(company.cnae || "");
    setEditLogo(company.logo || "");
  };

  const saveEdit = () => {
    if (!editName.trim()) return;
    onUpdateCompanies(
      companies.map((c) =>
        c.id === editingId
          ? {
              ...c,
              name: editName.trim(),
              cnpj: editCnpj.trim(),
              address: editAddress.trim(),
              riskDegree: parseInt(editRiskDegree) || 1,
              cnae: editCnae.trim(),
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
          Registre as empresas uma única vez para poder selecioná-las e preencher automaticamente os dados do laudo psicossocial.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Formulador */}
        <form onSubmit={handleAdd} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs lg:col-span-4 h-fit space-y-4">
          <h4 className="font-semibold text-slate-800 text-sm flex items-center gap-2 border-b border-slate-100 pb-3">
            <Plus className="w-4 h-4 text-slate-600" /> Nova Empresa
          </h4>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Razão Social</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Metalúrgica Beta S/A"
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-slate-400 outline-none text-sm text-slate-800 bg-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">CNPJ</label>
              <input
                type="text"
                value={cnpj}
                onChange={(e) => setCnpj(e.target.value)}
                placeholder="Ex: 12.345.678/0001-99"
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-slate-400 outline-none text-sm text-slate-800 bg-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">CNAE Principal</label>
              <input
                type="text"
                value={cnae}
                onChange={handleCnaeChange}
                placeholder="Ex: 1234-5/67"
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-slate-400 outline-none text-sm text-slate-800 bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Grau de Risco</label>
              <select
                value={riskDegree}
                onChange={(e) => setRiskDegree(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-slate-400 outline-none text-sm text-slate-800 bg-white"
              >
                <option value="1">Grau de Risco 1</option>
                <option value="2">Grau de Risco 2</option>
                <option value="3">Grau de Risco 3</option>
                <option value="4">Grau de Risco 4</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Endereço Completo</label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Ex: Av. das Indústrias, 1500 - Bloco B, Porto Alegre - RS"
              rows={2}
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-slate-400 outline-none text-sm text-slate-800 bg-white resize-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block">Logo da Empresa (Capa e Relatórios)</label>
            <div className="flex items-center gap-3">
              {logo ? (
                <div className="relative w-16 h-16 border border-slate-200 rounded-lg overflow-hidden bg-slate-50 flex items-center justify-center">
                  <img src={logo} alt="Logo" className="max-w-full max-h-full object-contain" />
                  <button
                    type="button"
                    onClick={() => setLogo("")}
                    className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity text-xs"
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
            className="w-full bg-slate-800 hover:bg-slate-900 text-white font-medium text-sm py-2 px-4 rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Cadastrar Empresa
          </button>
        </form>

        {/* Lista */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs lg:col-span-8 space-y-4">
          <h4 className="font-semibold text-slate-800 text-sm border-b border-slate-100 pb-3">
            Empresas Cadastradas ({companies.length})
          </h4>

          {companies.length === 0 ? (
            <p className="text-sm text-slate-400 italic text-center py-10">
              Nenhuma empresa cadastrada ainda.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto pr-1">
              {companies.map((company) => (
                <div key={company.id} className="py-4 flex flex-col gap-2">
                  {editingId === company.id ? (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Razão Social</label>
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded bg-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">CNPJ</label>
                          <input
                            type="text"
                            value={editCnpj}
                            onChange={(e) => setEditCnpj(e.target.value)}
                            className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded bg-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">CNAE Principal</label>
                          <input
                            type="text"
                            value={editCnae}
                            onChange={handleEditCnaeChange}
                            className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded bg-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Grau de Risco</label>
                          <select
                            value={editRiskDegree}
                            onChange={(e) => setEditRiskDegree(e.target.value)}
                            className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded bg-white"
                          >
                            <option value="1">Grau de Risco 1</option>
                            <option value="2">Grau de Risco 2</option>
                            <option value="3">Grau de Risco 3</option>
                            <option value="4">Grau de Risco 4</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Endereço Completo</label>
                        <input
                          type="text"
                          value={editAddress}
                          onChange={(e) => setEditAddress(e.target.value)}
                          className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded bg-white"
                        />
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
                                className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity text-[10px]"
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
                    <div className="flex items-start justify-between gap-4 p-3 rounded-xl hover:bg-slate-50/80 border border-transparent hover:border-slate-100 transition-all">
                      {company.logo && (
                        <div className="w-12 h-12 border border-slate-150 rounded-lg overflow-hidden shrink-0 bg-slate-50 flex items-center justify-center">
                          <img src={company.logo} alt="Logo" className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                        </div>
                      )}
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h5 className="font-bold text-slate-800 text-sm truncate">{company.name}</h5>
                          <span className="text-[10px] font-extrabold text-slate-500 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded uppercase shrink-0">
                            GR {company.riskDegree || 1}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-2 text-[10px] font-mono font-medium text-slate-500">
                          {company.cnpj && (
                            <span className="bg-slate-100 px-2 py-0.5 rounded">
                              CNPJ: {company.cnpj}
                            </span>
                          )}
                          {company.cnae && (
                            <span className="bg-slate-100 px-2 py-0.5 rounded">
                              CNAE: {company.cnae}
                            </span>
                          )}
                        </div>

                        {company.address && (
                          <p className="text-xs text-slate-500 leading-tight">
                            <span className="font-semibold text-slate-700">Endereço:</span> {company.address}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => startEdit(company)}
                          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition cursor-pointer"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(company.id)}
                          className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
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
