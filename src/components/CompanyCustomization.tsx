/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Sliders, Building, Image as ImageIcon, Link, Phone, Shield, Upload, Check, Trash2, Globe } from "lucide-react";
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
  };
  onUpdateAssessor: (newAssessor: any) => void;
}

export const CompanyCustomization: React.FC<CompanyCustomizationProps> = ({
  assessor,
  onUpdateAssessor,
}) => {
  const [fantasyName, setFantasyName] = useState(assessor.fantasyName || "");
  const [socialName, setSocialName] = useState(assessor.socialName || "");
  const [cnpj, setCnpj] = useState(assessor.cnpj || "");
  const [address, setAddress] = useState(assessor.address || "");
  const [phone, setPhone] = useState(assessor.phone || "");
  const [logo, setLogo] = useState(assessor.logo || "");
  const [favicon, setFavicon] = useState(assessor.favicon || "");
  const [siteName, setSiteName] = useState(assessor.siteName || "SST Psicossocial");
  const [defaultCoverImage, setDefaultCoverImage] = useState(assessor.defaultCoverImage || "");
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
    };

    onUpdateAssessor(updated);

    // Update document title and favicon
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
      {/* Cabeçalho */}
      <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-xs">
        <h3 className="text-md font-semibold text-slate-800 flex items-center gap-2">
          <Sliders className="w-5 h-5 text-slate-600" />
          Personalização do Sistema & Minha Empresa
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          Personalize a identidade visual do sistema, o título do site, favicon, imagem de capa padrão e os dados cadastrais da sua empresa de assessoria.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Coluna da Esquerda: Identidade Visual e Site */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-5">
              <h4 className="font-semibold text-slate-800 text-sm flex items-center gap-2 border-b border-slate-100 pb-3">
                <Globe className="w-4 h-4 text-slate-600" /> Identidade Visual do Site
              </h4>

              {/* Nome do Site */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Nome do Site / Sistema</label>
                <input
                  type="text"
                  required
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  placeholder="Ex: SST Psicossocial"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-400 outline-none text-sm text-slate-800 bg-white transition"
                />
              </div>

              {/* Logo do Sistema */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">Logo da Sua Empresa (Sidebar)</label>
                <div className="flex items-center gap-4">
                  {logo ? (
                    <div className="relative w-16 h-16 border border-slate-200 rounded-xl overflow-hidden bg-white flex items-center justify-center shadow-xs shrink-0">
                      <img src={logo} alt="Logo" className="max-w-full max-h-full object-contain" />
                      <button
                        type="button"
                        onClick={() => setLogo("")}
                        className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity text-[10px] font-bold cursor-pointer"
                      >
                        Remover
                      </button>
                    </div>
                  ) : (
                    <label className="w-16 h-16 border-2 border-dashed border-slate-200 hover:border-slate-400 rounded-xl flex flex-col items-center justify-center cursor-pointer transition bg-slate-50 shrink-0">
                      <Upload className="w-4 h-4 text-slate-400" />
                      <span className="text-[8px] text-slate-400 font-bold uppercase mt-1">Logo</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                  <div className="text-[10px] text-slate-450 leading-tight">
                    <span className="font-bold text-slate-600 block mb-0.5">Logo do Sistema</span>
                    Recomendado: imagem quadrada fundo branco ou transparente. Aparece no topo do menu lateral.
                  </div>
                </div>
              </div>

              {/* Favicon do Sistema */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">Favicon do Site (Ícone do Navegador)</label>
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
                      <span className="text-[8px] text-slate-400 font-bold uppercase mt-0.5">Favicon</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFaviconUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                  <div className="text-[10px] text-slate-450 leading-tight">
                    <span className="font-bold text-slate-600 block mb-0.5">Favicon</span>
                    Recomendado: formato .ico ou .png de 32x32px. Ícone que aparece na aba do navegador.
                  </div>
                </div>
              </div>

              {/* Capa Padrão do Relatório */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">Imagem de Capa Padrão do Laudo</label>
                <div className="flex flex-col gap-3">
                  {defaultCoverImage ? (
                    <div className="relative w-full h-32 border border-slate-200 rounded-xl overflow-hidden bg-slate-50 flex items-center justify-center group shadow-2xs">
                      <img src={defaultCoverImage} alt="Capa Padrão" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setDefaultCoverImage("")}
                          className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-750 text-white rounded text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" /> Remover
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <label className="flex-1 h-20 border-2 border-dashed border-slate-200 hover:border-slate-400 rounded-xl flex flex-col items-center justify-center cursor-pointer transition bg-slate-50">
                        <Upload className="w-4 h-4 text-slate-400" />
                        <span className="text-[10px] text-slate-500 font-bold uppercase mt-1">Carregar Imagem de Capa</span>
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
                        className="px-3 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-500 hover:text-slate-700 text-xs font-semibold transition"
                      >
                        Carregar Capa Clássica
                      </button>
                    </div>
                  )}
                  <p className="text-[10px] text-slate-450 leading-tight">
                    Capa que será aplicada automaticamente em todos os novos relatórios gerados no sistema, poupando a necessidade de upload manual a cada cadastro.
                  </p>
                </div>
              </div>

            </div>
          </div>

          {/* Coluna da Direita: Dados Cadastrais da Empresa */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
              <h4 className="font-semibold text-slate-800 text-sm flex items-center gap-2 border-b border-slate-100 pb-3">
                <Building className="w-4 h-4 text-slate-600" /> Dados Cadastrais da Sua Assessoria
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Nome Fantasia</label>
                  <input
                    type="text"
                    required
                    value={fantasyName}
                    onChange={(e) => setFantasyName(e.target.value)}
                    placeholder="Ex: Lima Engenharia e Segurança"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-400 outline-none text-sm text-slate-800 bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Razão Social</label>
                  <input
                    type="text"
                    required
                    value={socialName}
                    onChange={(e) => setSocialName(e.target.value)}
                    placeholder="Ex: E. L. de Jesus - Segurança do Trabalho"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-400 outline-none text-sm text-slate-800 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">CNPJ / CPF</label>
                  <input
                    type="text"
                    required
                    value={cnpj}
                    onChange={(e) => setCnpj(e.target.value)}
                    placeholder="Ex: 18.195.986/0001-68"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-400 outline-none text-sm text-slate-800 bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Telefone de Contato</label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Ex: (65) 99998-0418"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-400 outline-none text-sm text-slate-800 bg-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Endereço Completo da Empresa</label>
                <textarea
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Ex: Av. Mato grosso, 108-W, Centro, Tangará da Serra – MT"
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-400 outline-none text-sm text-slate-800 bg-white font-sans"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={saveStatus === "saving"}
                  className="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs uppercase tracking-widest rounded-xl transition duration-200 flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {saveStatus === "saving" ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Salvando...</span>
                    </>
                  ) : saveStatus === "success" ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Alterações Salvas!</span>
                    </>
                  ) : (
                    <span>Salvar Configurações</span>
                  )}
                </button>
              </div>

            </div>
          </div>

        </div>
      </form>
    </div>
  );
};
