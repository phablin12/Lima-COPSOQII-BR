/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Building, Plus, Trash2, Edit2, Check, X, ShieldCheck, Copy, Upload, Mail, Phone, Link as LinkIcon, User, MapPin } from "lucide-react";
import { compressImage } from "../imageUtils";
import { Assessor } from "../types";

interface EvaluatorsRegistryProps {
  evaluators: Assessor[];
  onUpdateEvaluators: (evaluators: Assessor[]) => void;
}

const ESTADOS_BRASILEIROS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", 
  "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", 
  "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

export const EvaluatorsRegistry: React.FC<EvaluatorsRegistryProps> = ({
  evaluators,
  onUpdateEvaluators,
}) => {
  // Form states for creating
  const [fantasyName, setFantasyName] = useState("");
  const [socialName, setSocialName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [stateReg, setStateReg] = useState("");
  const [municipalReg, setMunicipalReg] = useState("");
  const [cep, setCep] = useState("");
  const [address, setAddress] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("SP");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [technicalResponsible, setTechnicalResponsible] = useState("");
  const [technicalResponsibleReg, setTechnicalResponsibleReg] = useState("");
  const [legalResponsible, setLegalResponsible] = useState("");
  const [legalResponsibleCpf, setLegalResponsibleCpf] = useState("");
  const [logo, setLogo] = useState("");

  // Edit states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFantasyName, setEditFantasyName] = useState("");
  const [editSocialName, setEditSocialName] = useState("");
  const [editCnpj, setEditCnpj] = useState("");
  const [editStateReg, setEditStateReg] = useState("");
  const [editMunicipalReg, setEditMunicipalReg] = useState("");
  const [editCep, setEditCep] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editNeighborhood, setEditNeighborhood] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editState, setEditState] = useState("SP");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editWebsite, setEditWebsite] = useState("");
  const [editTechnicalResponsible, setEditTechnicalResponsible] = useState("");
  const [editTechnicalResponsibleReg, setEditTechnicalResponsibleReg] = useState("");
  const [editLegalResponsible, setEditLegalResponsible] = useState("");
  const [editLegalResponsibleCpf, setEditLegalResponsibleCpf] = useState("");
  const [editLogo, setEditLogo] = useState("");

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const handleDuplicate = (evaluator: Assessor) => {
    const duplicated: Assessor = {
      ...evaluator,
      id: "eval-" + Date.now(),
      fantasyName: `${evaluator.fantasyName} (Cópia)`,
      socialName: `${evaluator.socialName} (Cópia)`,
    };
    onUpdateEvaluators([...evaluators, duplicated]);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file, 300, 300, 0.8);
        if (isEdit) {
          setEditLogo(compressed);
        } else {
          setLogo(compressed);
        }
      } catch (err) {
        console.error("Erro ao comprimir logo:", err);
      }
    }
  };

  const formatCep = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 8);
    if (digits.length <= 5) return digits;
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  };

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean) => {
    const val = formatCep(e.target.value);
    if (isEdit) {
      setEditCep(val);
    } else {
      setCep(val);
    }
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fantasyName.trim() || !socialName.trim() || !cnpj.trim()) return;

    const newEvaluator: Assessor = {
      id: "eval-" + Date.now(),
      fantasyName: fantasyName.trim(),
      socialName: socialName.trim(),
      cnpj: cnpj.trim(),
      stateReg: stateReg.trim(),
      municipalReg: municipalReg.trim(),
      cep: cep.trim(),
      address: address.trim(),
      neighborhood: neighborhood.trim(),
      city: city.trim(),
      state: state,
      phone: phone.trim(),
      email: email.trim(),
      website: website.trim(),
      technicalResponsible: technicalResponsible.trim(),
      technicalResponsibleReg: technicalResponsibleReg.trim(),
      legalResponsible: legalResponsible.trim(),
      legalResponsibleCpf: legalResponsibleCpf.trim(),
      logo: logo || "",
    };

    onUpdateEvaluators([...evaluators, newEvaluator]);

    // Reset Form
    setFantasyName("");
    setSocialName("");
    setCnpj("");
    setStateReg("");
    setMunicipalReg("");
    setCep("");
    setAddress("");
    setNeighborhood("");
    setCity("");
    setState("SP");
    setPhone("");
    setEmail("");
    setWebsite("");
    setTechnicalResponsible("");
    setTechnicalResponsibleReg("");
    setLegalResponsible("");
    setLegalResponsibleCpf("");
    setLogo("");
  };

  const startEdit = (evaluator: Assessor) => {
    setEditingId(evaluator.id);
    setEditFantasyName(evaluator.fantasyName);
    setEditSocialName(evaluator.socialName);
    setEditCnpj(evaluator.cnpj);
    setEditStateReg(evaluator.stateReg || "");
    setEditMunicipalReg(evaluator.municipalReg || "");
    setEditCep(evaluator.cep || "");
    setEditAddress(evaluator.address);
    setEditNeighborhood(evaluator.neighborhood || "");
    setEditCity(evaluator.city || "");
    setEditState(evaluator.state || "SP");
    setEditPhone(evaluator.phone);
    setEditEmail(evaluator.email || "");
    setEditWebsite(evaluator.website || "");
    setEditTechnicalResponsible(evaluator.technicalResponsible || "");
    setEditTechnicalResponsibleReg(evaluator.technicalResponsibleReg || "");
    setEditLegalResponsible(evaluator.legalResponsible || "");
    setEditLegalResponsibleCpf(evaluator.legalResponsibleCpf || "");
    setEditLogo(evaluator.logo || "");
  };

  const saveEdit = () => {
    if (!editFantasyName.trim() || !editSocialName.trim() || !editCnpj.trim()) return;

    onUpdateEvaluators(
      evaluators.map((ev) =>
        ev.id === editingId
          ? {
              ...ev,
              fantasyName: editFantasyName.trim(),
              socialName: editSocialName.trim(),
              cnpj: editCnpj.trim(),
              stateReg: editStateReg.trim(),
              municipalReg: editMunicipalReg.trim(),
              cep: editCep.trim(),
              address: editAddress.trim(),
              neighborhood: editNeighborhood.trim(),
              city: editCity.trim(),
              state: editState,
              phone: editPhone.trim(),
              email: editEmail.trim(),
              website: editWebsite.trim(),
              technicalResponsible: editTechnicalResponsible.trim(),
              technicalResponsibleReg: editTechnicalResponsibleReg.trim(),
              legalResponsible: editLegalResponsible.trim(),
              legalResponsibleCpf: editLegalResponsibleCpf.trim(),
              logo: editLogo,
            }
          : ev
      )
    );
    setEditingId(null);
  };

  const filteredEvaluators = evaluators.filter((e) => {
    const q = searchQuery.toLowerCase();
    return (
      e.fantasyName.toLowerCase().includes(q) ||
      e.socialName.toLowerCase().includes(q) ||
      e.cnpj.toLowerCase().includes(q) ||
      (e.technicalResponsible || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6" id="evaluators-registry">
      <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-xs text-left">
        <h3 className="text-md font-semibold text-slate-800 flex items-center gap-2">
          <Building className="w-5 h-5 text-slate-600" />
          Cadastro de Empresas Avaliadoras (Responsáveis)
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          Gerencie o banco de dados de empresas de assessoria de saúde e segurança do trabalho responsáveis pela emissão técnica dos relatórios.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* Formulário de Cadastro / Edição */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs xl:col-span-5 h-fit text-left">
          {editingId ? (
            <div className="space-y-4">
              <h4 className="font-semibold text-slate-800 text-sm flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-amber-500" /> Editar Empresa Avaliadora
                </span>
                <button
                  onClick={() => setEditingId(null)}
                  className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </h4>

              <div className="space-y-4">
                {/* Identificação */}
                <div className="space-y-2.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Identificação</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-600 uppercase">Nome Fantasia *</label>
                      <input
                        type="text"
                        required
                        value={editFantasyName}
                        onChange={(e) => setEditFantasyName(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-1 focus:ring-slate-400 outline-none text-xs text-slate-800 bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-600 uppercase">Razão Social *</label>
                      <input
                        type="text"
                        required
                        value={editSocialName}
                        onChange={(e) => setEditSocialName(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-1 focus:ring-slate-400 outline-none text-xs text-slate-800 bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-600 uppercase">CNPJ *</label>
                      <input
                        type="text"
                        required
                        value={editCnpj}
                        onChange={(e) => setEditCnpj(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-1 focus:ring-slate-400 outline-none text-xs text-slate-800 bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-600 uppercase">Insc. Estadual</label>
                      <input
                        type="text"
                        value={editStateReg}
                        onChange={(e) => setEditStateReg(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-1 focus:ring-slate-400 outline-none text-xs text-slate-800 bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-600 uppercase">Insc. Municipal</label>
                      <input
                        type="text"
                        value={editMunicipalReg}
                        onChange={(e) => setEditMunicipalReg(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-1 focus:ring-slate-400 outline-none text-xs text-slate-800 bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Localização */}
                <div className="space-y-2.5 pt-2 border-t border-slate-50">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Endereço</span>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="space-y-1 sm:col-span-1">
                      <label className="text-[10px] font-semibold text-slate-600 uppercase">CEP</label>
                      <input
                        type="text"
                        value={editCep}
                        onChange={(e) => handleCepChange(e, true)}
                        placeholder="78300-000"
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-1 focus:ring-slate-400 outline-none text-xs text-slate-800 bg-white"
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-3">
                      <label className="text-[10px] font-semibold text-slate-600 uppercase">Endereço Completo</label>
                      <input
                        type="text"
                        value={editAddress}
                        onChange={(e) => setEditAddress(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-1 focus:ring-slate-400 outline-none text-xs text-slate-800 bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-600 uppercase">Bairro</label>
                      <input
                        type="text"
                        value={editNeighborhood}
                        onChange={(e) => setEditNeighborhood(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-1 focus:ring-slate-400 outline-none text-xs text-slate-800 bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-600 uppercase">Cidade</label>
                      <input
                        type="text"
                        value={editCity}
                        onChange={(e) => setEditCity(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-1 focus:ring-slate-400 outline-none text-xs text-slate-800 bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-600 uppercase">UF</label>
                      <select
                        value={editState}
                        onChange={(e) => setEditState(e.target.value)}
                        className="w-full px-2 py-2 rounded-lg border border-slate-200 focus:ring-1 focus:ring-slate-400 outline-none text-xs text-slate-800 bg-white"
                      >
                        {ESTADOS_BRASILEIROS.map((uf) => (
                          <option key={uf} value={uf}>{uf}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Contato */}
                <div className="space-y-2.5 pt-2 border-t border-slate-50">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Contato</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-600 uppercase">Telefone</label>
                      <input
                        type="text"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-1 focus:ring-slate-400 outline-none text-xs text-slate-800 bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-600 uppercase">E-mail</label>
                      <input
                        type="email"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-1 focus:ring-slate-400 outline-none text-xs text-slate-800 bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-600 uppercase">Website</label>
                      <input
                        type="text"
                        value={editWebsite}
                        onChange={(e) => setEditWebsite(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-1 focus:ring-slate-400 outline-none text-xs text-slate-800 bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Responsáveis */}
                <div className="space-y-2.5 pt-2 border-t border-slate-50">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Responsáveis</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-600 uppercase">Resp. Técnico Principal</label>
                      <input
                        type="text"
                        value={editTechnicalResponsible}
                        onChange={(e) => setEditTechnicalResponsible(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-1 focus:ring-slate-400 outline-none text-xs text-slate-800 bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-600 uppercase">Registro Classe (Ex: CREA)</label>
                      <input
                        type="text"
                        value={editTechnicalResponsibleReg}
                        onChange={(e) => setEditTechnicalResponsibleReg(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-1 focus:ring-slate-400 outline-none text-xs text-slate-800 bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-600 uppercase">Representante Legal</label>
                      <input
                        type="text"
                        value={editLegalResponsible}
                        onChange={(e) => setEditLegalResponsible(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-1 focus:ring-slate-400 outline-none text-xs text-slate-800 bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-600 uppercase">CPF do Resp. Legal</label>
                      <input
                        type="text"
                        value={editLegalResponsibleCpf}
                        onChange={(e) => setEditLegalResponsibleCpf(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-1 focus:ring-slate-400 outline-none text-xs text-slate-800 bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Logo */}
                <div className="space-y-2 pt-2 border-t border-slate-50">
                  <label className="text-[10px] font-semibold text-slate-600 uppercase block">Logomarca Oficial</label>
                  <div className="flex items-center gap-3">
                    {editLogo ? (
                      <div className="relative w-12 h-12 border border-slate-200 rounded-lg overflow-hidden bg-slate-50 flex items-center justify-center">
                        <img src={editLogo} alt="Logo" className="max-w-full max-h-full object-contain p-1" />
                        <button
                          type="button"
                          onClick={() => setEditLogo("")}
                          className="absolute inset-0 bg-rose-600/80 text-white flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity text-[10px] font-black cursor-pointer uppercase"
                        >
                          Remover
                        </button>
                      </div>
                    ) : (
                      <label className="w-12 h-12 border border-dashed border-slate-300 hover:border-slate-400 rounded-lg flex flex-col items-center justify-center cursor-pointer transition bg-slate-50 shrink-0">
                        <Upload className="w-4 h-4 text-slate-450" />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleLogoUpload(e, true)}
                          className="hidden"
                        />
                      </label>
                    )}
                    <span className="text-[10px] text-slate-400 font-medium">Selecione o arquivo para atualizar a logo.</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-3">
                  <button
                    type="button"
                    onClick={saveEdit}
                    className="flex-1 px-4 py-2 bg-slate-900 hover:bg-slate-850 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-4 h-4" /> Salvar Edições
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-700 font-extrabold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Cadastro de Nova Empresa Avaliadora */
            <form onSubmit={handleAdd} className="space-y-4">
              <h4 className="font-semibold text-slate-800 text-sm flex items-center gap-2 border-b border-slate-100 pb-3">
                <Plus className="w-4 h-4 text-slate-600" /> Nova Empresa Avaliadora
              </h4>

              <div className="space-y-4">
                {/* Identificação */}
                <div className="space-y-2.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Identificação</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-600 uppercase">Nome Fantasia *</label>
                      <input
                        type="text"
                        required
                        value={fantasyName}
                        onChange={(e) => setFantasyName(e.target.value)}
                        placeholder="Ex: Assessoria Filial"
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-1 focus:ring-slate-400 outline-none text-xs text-slate-800 bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-600 uppercase">Razão Social *</label>
                      <input
                        type="text"
                        required
                        value={socialName}
                        onChange={(e) => setSocialName(e.target.value)}
                        placeholder="Ex: Assessoria de SST Ltda"
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-1 focus:ring-slate-400 outline-none text-xs text-slate-800 bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-600 uppercase">CNPJ *</label>
                      <input
                        type="text"
                        required
                        value={cnpj}
                        onChange={(e) => setCnpj(e.target.value)}
                        placeholder="Ex: 00.000.000/0001-00"
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-1 focus:ring-slate-400 outline-none text-xs text-slate-800 bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-600 uppercase">Insc. Estadual</label>
                      <input
                        type="text"
                        value={stateReg}
                        onChange={(e) => setStateReg(e.target.value)}
                        placeholder="Isento ou nº"
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-1 focus:ring-slate-400 outline-none text-xs text-slate-800 bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-600 uppercase">Insc. Municipal</label>
                      <input
                        type="text"
                        value={municipalReg}
                        onChange={(e) => setMunicipalReg(e.target.value)}
                        placeholder="Isento ou nº"
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-1 focus:ring-slate-400 outline-none text-xs text-slate-800 bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Localização */}
                <div className="space-y-2.5 pt-2 border-t border-slate-50">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Endereço</span>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="space-y-1 sm:col-span-1">
                      <label className="text-[10px] font-semibold text-slate-600 uppercase">CEP</label>
                      <input
                        type="text"
                        value={cep}
                        onChange={(e) => handleCepChange(e, false)}
                        placeholder="78300-000"
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-1 focus:ring-slate-400 outline-none text-xs text-slate-800 bg-white"
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-3">
                      <label className="text-[10px] font-semibold text-slate-600 uppercase">Endereço Completo</label>
                      <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Av. Brasil, 120, Centro"
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-1 focus:ring-slate-400 outline-none text-xs text-slate-800 bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-600 uppercase">Bairro</label>
                      <input
                        type="text"
                        value={neighborhood}
                        onChange={(e) => setNeighborhood(e.target.value)}
                        placeholder="Ex: Centro"
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-1 focus:ring-slate-400 outline-none text-xs text-slate-800 bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-600 uppercase">Cidade</label>
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Tangará da Serra"
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-1 focus:ring-slate-400 outline-none text-xs text-slate-800 bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-600 uppercase">UF</label>
                      <select
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        className="w-full px-2 py-2 rounded-lg border border-slate-200 focus:ring-1 focus:ring-slate-400 outline-none text-xs text-slate-800 bg-white"
                      >
                        {ESTADOS_BRASILEIROS.map((uf) => (
                          <option key={uf} value={uf}>{uf}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Contato */}
                <div className="space-y-2.5 pt-2 border-t border-slate-50">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Contato</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-600 uppercase">Telefone</label>
                      <input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="(65) 99999-9999"
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-1 focus:ring-slate-400 outline-none text-xs text-slate-800 bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-600 uppercase">E-mail</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="contato@assessoria.com.br"
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-1 focus:ring-slate-400 outline-none text-xs text-slate-800 bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-600 uppercase">Website</label>
                      <input
                        type="text"
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        placeholder="www.assessoria.com.br"
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-1 focus:ring-slate-400 outline-none text-xs text-slate-800 bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Responsáveis */}
                <div className="space-y-2.5 pt-2 border-t border-slate-50">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Responsáveis</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-600 uppercase">Resp. Técnico Principal</label>
                      <input
                        type="text"
                        value={technicalResponsible}
                        onChange={(e) => setTechnicalResponsible(e.target.value)}
                        placeholder="Nome do profissional"
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-1 focus:ring-slate-400 outline-none text-xs text-slate-800 bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-600 uppercase">Registro Classe (Ex: CREA)</label>
                      <input
                        type="text"
                        value={technicalResponsibleReg}
                        onChange={(e) => setTechnicalResponsibleReg(e.target.value)}
                        placeholder="CREA-MT 12345"
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-1 focus:ring-slate-400 outline-none text-xs text-slate-800 bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-600 uppercase">Representante Legal</label>
                      <input
                        type="text"
                        value={legalResponsible}
                        onChange={(e) => setLegalResponsible(e.target.value)}
                        placeholder="Representante Legal"
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-1 focus:ring-slate-400 outline-none text-xs text-slate-800 bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-600 uppercase">CPF do Resp. Legal</label>
                      <input
                        type="text"
                        value={legalResponsibleCpf}
                        onChange={(e) => setLegalResponsibleCpf(e.target.value)}
                        placeholder="000.000.000-00"
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-1 focus:ring-slate-400 outline-none text-xs text-slate-800 bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Logo */}
                <div className="space-y-2 pt-2 border-t border-slate-50">
                  <label className="text-[10px] font-semibold text-slate-600 uppercase block">Logomarca Oficial</label>
                  <div className="flex items-center gap-3">
                    {logo ? (
                      <div className="relative w-12 h-12 border border-slate-200 rounded-lg overflow-hidden bg-slate-50 flex items-center justify-center">
                        <img src={logo} alt="Logo" className="max-w-full max-h-full object-contain p-1" />
                        <button
                          type="button"
                          onClick={() => setLogo("")}
                          className="absolute inset-0 bg-rose-600/85 text-white flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity text-[10px] font-black cursor-pointer uppercase"
                        >
                          Remover
                        </button>
                      </div>
                    ) : (
                      <label className="w-12 h-12 border-2 border-dashed border-slate-300 hover:border-slate-400 rounded-lg flex flex-col items-center justify-center cursor-pointer transition bg-slate-50 shrink-0">
                        <Upload className="w-4 h-4 text-slate-400" />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleLogoUpload(e, false)}
                          className="hidden"
                        />
                      </label>
                    )}
                    <span className="text-[10px] text-slate-400 font-medium">Carregar logotipo oficial da empresa avaliadora.</span>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition duration-200 flex items-center justify-center gap-1.5 cursor-pointer shadow-md mt-4"
              >
                <Plus className="w-4 h-4" /> Cadastrar Avaliadora
              </button>
            </form>
          )}
        </div>

        {/* Listagem de Empresas Avaliadoras */}
        <div className="xl:col-span-7 space-y-4 text-left">
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <input
              type="text"
              placeholder="Buscar por fantasia, razão social, CNPJ ou RT..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-4 py-2 text-xs rounded-lg border border-slate-200 outline-none focus:ring-1 focus:ring-slate-400 w-full sm:max-w-xs bg-slate-50/50"
            />
            <span className="text-[11px] text-slate-400 font-bold shrink-0">
              {filteredEvaluators.length} empresa(s) cadastrada(s)
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {filteredEvaluators.length === 0 ? (
              <div className="bg-white p-12 rounded-xl border border-slate-100 text-center space-y-2">
                <Building className="w-8 h-8 text-slate-300 mx-auto" />
                <h5 className="font-bold text-slate-700 text-xs uppercase tracking-wider">Nenhuma Empresa Avaliadora Cadastrada</h5>
                <p className="text-[11px] text-slate-400">Insira uma nova empresa no formulário ao lado para começar.</p>
              </div>
            ) : (
              filteredEvaluators.map((ev) => (
                <div
                  key={ev.id}
                  className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs hover:shadow-sm transition-all relative flex flex-col md:flex-row md:items-start justify-between gap-4"
                >
                  <div className="flex items-start gap-4">
                    {/* Logomarca */}
                    <div className="w-14 h-14 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden flex items-center justify-center shrink-0">
                      {ev.logo ? (
                        <img src={ev.logo} alt="Logo" className="max-w-full max-h-full object-contain p-1" />
                      ) : (
                        <Building className="w-6 h-6 text-slate-300" />
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <div>
                        <h4 className="font-extrabold text-slate-800 text-sm leading-tight flex items-center gap-1.5">
                          {ev.fantasyName}
                          <span className="text-[9px] bg-slate-100 text-slate-500 font-extrabold px-1.5 py-0.5 rounded uppercase font-mono border border-slate-200">
                            CNPJ: {ev.cnpj}
                          </span>
                        </h4>
                        <span className="text-[11px] font-bold text-slate-450 block leading-tight">
                          {ev.socialName}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-[11px] font-medium text-slate-500">
                        {ev.address && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{ev.address}, {ev.city} - {ev.state}</span>
                          </div>
                        )}
                        {ev.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{ev.phone}</span>
                          </div>
                        )}
                        {ev.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{ev.email}</span>
                          </div>
                        )}
                        {ev.technicalResponsible && (
                          <div className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>RT: {ev.technicalResponsible} ({ev.technicalResponsibleReg || "Sem registro"})</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-1 md:self-start md:mt-1 self-end">
                    <button
                      onClick={() => startEdit(ev)}
                      className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-150 rounded-lg transition-colors cursor-pointer"
                      title="Editar"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDuplicate(ev)}
                      className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-150 rounded-lg transition-colors cursor-pointer"
                      title="Duplicar"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeletingId(ev.id)}
                      className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Confirmação de exclusão */}
                  {deletingId === ev.id && (
                    <div className="absolute inset-0 bg-white/95 rounded-2xl flex flex-col items-center justify-center p-4 border border-rose-100 z-10 text-center animate-fade-in">
                      <p className="text-xs font-black text-rose-950 uppercase tracking-wider mb-2">Excluir Empresa Avaliadora?</p>
                      <p className="text-[11px] text-slate-500 mb-4 max-w-sm leading-snug">
                        Esta ação é irreversível e removerá todos os dados desta empresa do banco de dados do sistema.
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            onUpdateEvaluators(evaluators.filter((e) => e.id !== ev.id));
                            setDeletingId(null);
                          }}
                          className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[10px] uppercase tracking-widest rounded-lg cursor-pointer shadow-xs"
                        >
                          Confirmar Exclusão
                        </button>
                        <button
                          onClick={() => setDeletingId(null)}
                          className="px-4 py-1.5 border border-slate-200 hover:bg-slate-100 text-slate-600 font-extrabold text-[10px] uppercase tracking-widest rounded-lg cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
