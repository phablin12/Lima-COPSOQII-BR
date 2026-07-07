/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Building, 
  Globe, 
  Upload, 
  Check, 
  Trash2, 
  Mail, 
  Phone, 
  Link as LinkIcon, 
  User, 
  FileText, 
  MapPin, 
  Settings,
  Sparkles
} from "lucide-react";
import { compressImage } from "../imageUtils";

interface CompanyCustomizationProps {
  assessor: {
    fantasyName: string;
    socialName: string;
    cnpj: string;
    address: string;
    phone: string;
    logo: string;
    favicon?: string;
    siteName?: string;
    defaultCoverImage?: string;
    email?: string;
    website?: string;
    technicalResponsible?: string;
    technicalResponsibleReg?: string;
    stateReg?: string;
    municipalReg?: string;
    cep?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    legalResponsible?: string;
    legalResponsibleCpf?: string;
  };
  onUpdateAssessor: (newAssessor: any) => void;
}

export const CompanyCustomization: React.FC<CompanyCustomizationProps> = ({
  assessor,
  onUpdateAssessor,
}) => {
  // Navigation tab inside Minha Empresa
  const [activeSubTab, setActiveSubTab] = useState<"cadastro" | "sistema">("cadastro");

  // State bindings for all fields
  const [fantasyName, setFantasyName] = useState(assessor.fantasyName || "");
  const [socialName, setSocialName] = useState(assessor.socialName || "");
  const [cnpj, setCnpj] = useState(assessor.cnpj || "");
  const [address, setAddress] = useState(assessor.address || "");
  const [phone, setPhone] = useState(assessor.phone || "");
  const [logo, setLogo] = useState(assessor.logo || "");
  const [favicon, setFavicon] = useState(assessor.favicon || "");
  const [siteName, setSiteName] = useState(assessor.siteName || "SST Psicossocial");
  const [defaultCoverImage, setDefaultCoverImage] = useState(assessor.defaultCoverImage || "");
  
  // New fields
  const [email, setEmail] = useState(assessor.email || "");
  const [website, setWebsite] = useState(assessor.website || "");
  const [technicalResponsible, setTechnicalResponsible] = useState(assessor.technicalResponsible || "");
  const [technicalResponsibleReg, setTechnicalResponsibleReg] = useState(assessor.technicalResponsibleReg || "");
  const [stateReg, setStateReg] = useState(assessor.stateReg || "");
  const [municipalReg, setMunicipalReg] = useState(assessor.municipalReg || "");
  const [cep, setCep] = useState(assessor.cep || "");
  const [neighborhood, setNeighborhood] = useState(assessor.neighborhood || "");
  const [city, setCity] = useState(assessor.city || "");
  const [state, setState] = useState(assessor.state || "");
  const [legalResponsible, setLegalResponsible] = useState(assessor.legalResponsible || "");
  const [legalResponsibleCpf, setLegalResponsibleCpf] = useState(assessor.legalResponsibleCpf || "");

  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "success">("idle");

  // Keep state in sync with prop changes
  useEffect(() => {
    setFantasyName(assessor.fantasyName || "");
    setSocialName(assessor.socialName || "");
    setCnpj(assessor.cnpj || "");
    setAddress(assessor.address || "");
    setPhone(assessor.phone || "");
    setLogo(assessor.logo || "");
    setFavicon(assessor.favicon || "");
    setSiteName(assessor.siteName || "SST Psicossocial");
    setDefaultCoverImage(assessor.defaultCoverImage || "");
    
    // New fields sync
    setEmail(assessor.email || "");
    setWebsite(assessor.website || "");
    setTechnicalResponsible(assessor.technicalResponsible || "");
    setTechnicalResponsibleReg(assessor.technicalResponsibleReg || "");
    setStateReg(assessor.stateReg || "");
    setMunicipalReg(assessor.municipalReg || "");
    setCep(assessor.cep || "");
    setNeighborhood(assessor.neighborhood || "");
    setCity(assessor.city || "");
    setState(assessor.state || "");
    setLegalResponsible(assessor.legalResponsible || "");
    setLegalResponsibleCpf(assessor.legalResponsibleCpf || "");
  }, [assessor]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file, 300, 300, 0.8);
        setLogo(compressed);
      } catch (err) {
        console.error("Erro ao processar logo:", err);
      }
    }
  };

  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file, 64, 64, 0.85);
        setFavicon(compressed);
      } catch (err) {
        console.error("Erro ao processar favicon:", err);
      }
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file, 1200, 1200, 0.75);
        setDefaultCoverImage(compressed);
      } catch (err) {
        console.error("Erro ao processar imagem de capa:", err);
      }
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveStatus("saving");

    const updated = {
      fantasyName: fantasyName.trim(),
      socialName: socialName.trim(),
      cnpj: cnpj.trim(),
      address: address.trim(),
      phone: phone.trim(),
      logo,
      favicon,
      siteName: siteName.trim(),
      defaultCoverImage,
      email: email.trim(),
      website: website.trim(),
      technicalResponsible: technicalResponsible.trim(),
      technicalResponsibleReg: technicalResponsibleReg.trim(),
      stateReg: stateReg.trim(),
      municipalReg: municipalReg.trim(),
      cep: cep.trim(),
      neighborhood: neighborhood.trim(),
      city: city.trim(),
      state: state.trim(),
      legalResponsible: legalResponsible.trim(),
      legalResponsibleCpf: legalResponsibleCpf.trim()
    };

    onUpdateAssessor(updated);

    // Update document title and favicon dynamically
    if (updated.siteName) {
      document.title = updated.siteName;
    }
    if (updated.favicon) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = updated.favicon;
    }

    setSaveStatus("success");
    setTimeout(() => {
      setSaveStatus("idle");
    }, 2000);
  };

  const loadDefaultCover = () => {
    setDefaultCoverImage("https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=1200&q=80");
  };

  return (
    <div className="space-y-6" id="company-customization">
      {/* Title Header */}
      <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-100 shadow-xs text-left">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] bg-slate-800 text-amber-300 font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
            <Building className="w-3 h-3 text-amber-300" /> Cadastros Gerais
          </span>
        </div>
        <h3 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          Minha Empresa (Assessoria de SST)
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Gerencie todas as informações cadastrais de faturamento, frentes técnicas, assinaturas do laudo e identidade visual do sistema.
        </p>
      </div>

      {/* Internal Tabs navigation */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveSubTab("cadastro")}
          className={`px-5 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === "cadastro" 
              ? "border-slate-800 text-slate-900 font-black" 
              : "border-transparent text-slate-500 hover:text-slate-850 hover:border-slate-200"
          }`}
        >
          <Building className="w-4 h-4" /> Dados Cadastrais & Faturamento
        </button>
        <button
          onClick={() => setActiveSubTab("sistema")}
          className={`px-5 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === "sistema" 
              ? "border-slate-800 text-slate-900 font-black" 
              : "border-transparent text-slate-500 hover:text-slate-850 hover:border-slate-200"
          }`}
        >
          <Settings className="w-4 h-4" /> Identidade Visual & Sistema
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {activeSubTab === "cadastro" ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-left">
            {/* DADOS JURÍDICOS E CONTATO */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* Card 1: Identificação da Empresa */}
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-5">
                <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Building className="w-4 h-4 text-slate-500" /> Identificação Corporativa
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-slate-450 uppercase tracking-widest block">Nome Fantasia</label>
                    <input
                      type="text"
                      required
                      value={fantasyName}
                      onChange={(e) => setFantasyName(e.target.value)}
                      placeholder="Ex: Lima Engenharia e Segurança"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-400 outline-none text-xs font-semibold text-slate-800 bg-white transition"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-slate-450 uppercase tracking-widest block">Razão Social</label>
                    <input
                      type="text"
                      required
                      value={socialName}
                      onChange={(e) => setSocialName(e.target.value)}
                      placeholder="Ex: E. L. de Jesus - Segurança do Trabalho"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-400 outline-none text-xs font-semibold text-slate-800 bg-white transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-slate-450 uppercase tracking-widest block">CNPJ / CPF</label>
                    <input
                      type="text"
                      required
                      value={cnpj}
                      onChange={(e) => setCnpj(e.target.value)}
                      placeholder="Ex: 18.195.986/0001-68"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-400 outline-none text-xs font-semibold text-slate-800 bg-white transition"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-slate-450 uppercase tracking-widest block">Inscrição Estadual</label>
                    <input
                      type="text"
                      value={stateReg}
                      onChange={(e) => setStateReg(e.target.value)}
                      placeholder="Isento ou nº"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-400 outline-none text-xs font-semibold text-slate-800 bg-white transition"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-slate-450 uppercase tracking-widest block">Inscrição Municipal</label>
                    <input
                      type="text"
                      value={municipalReg}
                      onChange={(e) => setMunicipalReg(e.target.value)}
                      placeholder="Nº Inscrição Municipal"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-400 outline-none text-xs font-semibold text-slate-800 bg-white transition"
                    />
                  </div>
                </div>
              </div>

              {/* Card 2: Localização */}
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-5">
                <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-2 border-b border-slate-100 pb-3">
                  <MapPin className="w-4 h-4 text-slate-500" /> Endereço & Localização
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-1.5 md:col-span-1">
                    <label className="text-[10px] font-extrabold text-slate-450 uppercase tracking-widest block">CEP</label>
                    <input
                      type="text"
                      value={cep}
                      onChange={(e) => setCep(e.target.value)}
                      placeholder="78300-000"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-400 outline-none text-xs font-semibold text-slate-800 bg-white transition"
                    />
                  </div>

                  <div className="space-y-1.5 md:col-span-3">
                    <label className="text-[10px] font-extrabold text-slate-450 uppercase tracking-widest block">Endereço Completo</label>
                    <input
                      type="text"
                      required
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Av. Mato grosso, 108-W, Centro"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-400 outline-none text-xs font-semibold text-slate-800 bg-white transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-slate-450 uppercase tracking-widest block">Bairro</label>
                    <input
                      type="text"
                      value={neighborhood}
                      onChange={(e) => setNeighborhood(e.target.value)}
                      placeholder="Ex: Centro"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-400 outline-none text-xs font-semibold text-slate-800 bg-white transition"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-slate-450 uppercase tracking-widest block">Cidade</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Tangará da Serra"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-400 outline-none text-xs font-semibold text-slate-800 bg-white transition"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-slate-450 uppercase tracking-widest block">Estado / UF</label>
                    <input
                      type="text"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      placeholder="MT"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-400 outline-none text-xs font-semibold text-slate-800 bg-white transition"
                    />
                  </div>
                </div>
              </div>

              {/* Card 3: Responsáveis Técnicos & Legais */}
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-5">
                <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-2 border-b border-slate-100 pb-3">
                  <User className="w-4 h-4 text-slate-500" /> Responsáveis & Assinaturas
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-slate-450 uppercase tracking-widest block">Responsável Técnico Principal</label>
                    <input
                      type="text"
                      value={technicalResponsible}
                      onChange={(e) => setTechnicalResponsible(e.target.value)}
                      placeholder="Nome do Responsável Técnico"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-400 outline-none text-xs font-semibold text-slate-800 bg-white transition"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-slate-450 uppercase tracking-widest block">Registro de Classe (CREA/CONFEA/MTE)</label>
                    <input
                      type="text"
                      value={technicalResponsibleReg}
                      onChange={(e) => setTechnicalResponsibleReg(e.target.value)}
                      placeholder="Ex: MTE: 000000 ou CREA-MT 098765"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-400 outline-none text-xs font-semibold text-slate-800 bg-white transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-slate-450 uppercase tracking-widest block">Responsável Legal / Administrador</label>
                    <input
                      type="text"
                      value={legalResponsible}
                      onChange={(e) => setLegalResponsible(e.target.value)}
                      placeholder="Nome do Sócio ou Gestor Legal"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-400 outline-none text-xs font-semibold text-slate-800 bg-white transition"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-slate-450 uppercase tracking-widest block">CPF do Responsável Legal</label>
                    <input
                      type="text"
                      value={legalResponsibleCpf}
                      onChange={(e) => setLegalResponsibleCpf(e.target.value)}
                      placeholder="000.000.000-00"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-400 outline-none text-xs font-semibold text-slate-800 bg-white transition"
                    />
                  </div>
                </div>
              </div>

            </div>

            {/* DADOS DE CONTATO E LOGO */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* Card Contato Comercial */}
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-5">
                <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Mail className="w-4 h-4 text-slate-500" /> Contatos Comerciais
                </h4>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-slate-450 uppercase tracking-widest block">Telefone de Contato</label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                      <input
                        type="text"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="(65) 99998-0418"
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-400 outline-none text-xs font-semibold text-slate-800 bg-white transition"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-slate-450 uppercase tracking-widest block">E-mail Comercial</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="contato@empresa.com.br"
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-400 outline-none text-xs font-semibold text-slate-800 bg-white transition"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-slate-450 uppercase tracking-widest block">Website Oficial</label>
                    <div className="relative">
                      <LinkIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                      <input
                        type="text"
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        placeholder="www.limasst.com.br"
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-400 outline-none text-xs font-semibold text-slate-800 bg-white transition"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Logotipo da Assessoria */}
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
                <h4 className="font-extrabold text-slate-800 text-sm border-b border-slate-100 pb-3">
                  Logomarca Oficial (SST)
                </h4>
                
                <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  {logo ? (
                    <div className="relative w-28 h-28 border border-slate-250 bg-white rounded-2xl overflow-hidden flex items-center justify-center group shadow-xs">
                      <img src={logo} alt="Logo" className="max-w-full max-h-full object-contain p-2" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => setLogo("")}
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-black cursor-pointer uppercase tracking-wider flex items-center gap-1 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Remover
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="w-28 h-28 border-2 border-dashed border-slate-200 hover:border-slate-400 bg-white rounded-2xl flex flex-col items-center justify-center cursor-pointer transition">
                      <Upload className="w-5 h-5 text-slate-450" />
                      <span className="text-[9px] text-slate-500 font-extrabold uppercase mt-1.5">Carregar</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                  <p className="text-[10px] text-slate-450 text-center mt-3 leading-tight font-medium">
                    Será impressa no cabeçalho dos relatórios e diagnósticos ao lado do logo do cliente.
                  </p>
                </div>
              </div>

            </div>
          </div>
        ) : (
          /* IDENTIDADE VISUAL E SISTEMA */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-left">
            <div className="lg:col-span-6 space-y-6">
              
              {/* Site Name and Favicon */}
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-5">
                <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Globe className="w-4 h-4 text-slate-500" /> Branding do Software
                </h4>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-slate-450 uppercase tracking-widest block">Nome do Site / Sistema</label>
                  <input
                    type="text"
                    required
                    value={siteName}
                    onChange={(e) => setSiteName(e.target.value)}
                    placeholder="Ex: SST Psicossocial"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-400 outline-none text-xs font-semibold text-slate-800 bg-white transition"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-extrabold text-slate-450 uppercase tracking-widest block">Favicon do Site (Ícone do Navegador)</label>
                  <div className="flex items-center gap-4">
                    {favicon ? (
                      <div className="relative w-12 h-12 border border-slate-200 rounded-xl overflow-hidden bg-white flex items-center justify-center shadow-xs shrink-0">
                        <img src={favicon} alt="Favicon" className="max-w-full max-h-full object-contain" />
                        <button
                          type="button"
                          onClick={() => setFavicon("")}
                          className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity text-[10px] font-bold cursor-pointer"
                        >
                          Excluir
                        </button>
                      </div>
                    ) : (
                      <label className="w-12 h-12 border-2 border-dashed border-slate-200 hover:border-slate-400 rounded-xl flex flex-col items-center justify-center cursor-pointer transition bg-slate-50 shrink-0">
                        <Upload className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-[8px] text-slate-400 font-bold uppercase mt-0.5">Icon</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFaviconUpload}
                          className="hidden"
                        />
                      </label>
                    )}
                    <div className="text-[10px] text-slate-450 leading-tight">
                      <span className="font-bold text-slate-650 block mb-0.5">Favicon</span>
                      Aparece na aba e na barra de favoritos do navegador do usuário.
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Imagem de Capa do Relatório */}
            <div className="lg:col-span-6 space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
                <h4 className="font-extrabold text-slate-800 text-sm border-b border-slate-100 pb-3">
                  Imagem de Capa Padrão para Laudos
                </h4>

                <div className="flex flex-col gap-3">
                  {defaultCoverImage ? (
                    <div className="relative w-full h-36 border border-slate-200 rounded-xl overflow-hidden bg-slate-50 flex items-center justify-center group shadow-2xs">
                      <img src={defaultCoverImage} alt="Capa Padrão" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setDefaultCoverImage("")}
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Remover
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row gap-2">
                      <label className="flex-1 h-24 border-2 border-dashed border-slate-200 hover:border-slate-400 rounded-xl flex flex-col items-center justify-center cursor-pointer transition bg-slate-50">
                        <Upload className="w-4 h-4 text-slate-400" />
                        <span className="text-[10px] text-slate-500 font-extrabold uppercase mt-1">Fazer Upload</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleCoverUpload}
                          className="hidden"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={loadDefaultCover}
                        className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600 hover:text-slate-800 text-xs font-bold transition cursor-pointer"
                      >
                        Carregar Capa Clássica (Geral)
                      </button>
                    </div>
                  )}
                  <p className="text-[10px] text-slate-450 leading-tight font-medium">
                    Esta capa será aplicada automaticamente na abertura de todos os novos laudos gerados pela Lima SST, garantindo a uniformidade de design da sua marca.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Global Save Button */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-2xs flex items-center justify-between gap-4">
          <div className="text-[11px] text-slate-450 text-left font-bold">
            <span className="text-slate-700 block">Sincronização em Tempo Real</span>
            Os dados cadastrais serão replicados para a assinatura de todos os laudos ativos e em conformidade.
          </div>
          <button
            type="submit"
            disabled={saveStatus === "saving"}
            className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs uppercase tracking-widest rounded-xl transition duration-200 flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
          >
            {saveStatus === "saving" ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Salvando...</span>
              </>
            ) : saveStatus === "success" ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Salvo com Sucesso!</span>
              </>
            ) : (
              <span>Salvar Alterações da Empresa</span>
            )}
          </button>
        </div>

      </form>
    </div>
  );
};
