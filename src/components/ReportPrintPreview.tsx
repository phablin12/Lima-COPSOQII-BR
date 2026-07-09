/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Report, COPSOQ_DIMENSIONS, getDimensionRating } from "../types";
import { replaceTemplateVariables } from "./ChaptersEditor";
import { Printer, ShieldAlert, Calendar, User, FileText, ChevronRight, Activity, Target, Shield, CheckSquare, Clock } from "lucide-react";
import { getMatrixCell, getColorClass, PROBABILITY_LEVELS, SEVERITY_LEVELS } from "../matrixUtils";

const getLevelEmoji = (level: string) => {
  switch (level) {
    case "Insignificante": return "🔵";
    case "Baixo": return "🟢";
    case "Moderado": return "🟡";
    case "Alto": return "🟠";
    case "Grave": return "🔴";
    default: return "⚪";
  }
};

const getRiskBadgeStyle = (color: string) => {
  switch (color) {
    case "red": return "bg-rose-50 text-rose-800 border-rose-200 print:bg-rose-50 print:text-rose-950";
    case "orange": return "bg-orange-50 text-orange-800 border-orange-200 print:bg-orange-50 print:text-orange-950";
    case "yellow": return "bg-amber-50 text-amber-800 border-amber-200 print:bg-amber-50 print:text-amber-950";
    case "green": return "bg-emerald-50 text-emerald-800 border-emerald-200 print:bg-emerald-50 print:text-emerald-950";
    case "blue": return "bg-blue-50 text-blue-800 border-blue-200 print:bg-blue-50 print:text-blue-950";
    default: return "bg-slate-50 text-slate-800 border-slate-200";
  }
};

const getRiskBorderAccent = (color: string) => {
  switch (color) {
    case "red": return "border-l-rose-500";
    case "orange": return "border-l-orange-500";
    case "yellow": return "border-l-amber-500";
    case "green": return "border-l-emerald-500";
    case "blue": return "border-l-blue-500";
    default: return "border-l-slate-400";
  }
};

const getRiskHeaderBg = (color: string) => {
  switch (color) {
    case "red": return "bg-rose-50/70";
    case "orange": return "bg-orange-50/70";
    case "yellow": return "bg-amber-50/70";
    case "green": return "bg-emerald-50/70";
    case "blue": return "bg-blue-50/70";
    default: return "bg-slate-50/70";
  }
};

const renderAsList = (text: string) => {
  if (!text || text.trim() === "" || text.trim() === "Inexistente." || text.trim() === "Não evidenciado.") {
    return <span className="text-slate-400 italic">Não evidenciado.</span>;
  }
  
  let items: string[] = [];
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
  
  for (const line of lines) {
    const cleaned = line.replace(/^[•\-*\+\s]+/, "").trim();
    if (cleaned) {
      items.push(cleaned);
    }
  }
  
  if (items.length === 1) {
    const singleLine = items[0];
    if (singleLine.includes(" - ") || singleLine.includes(" • ") || singleLine.includes(" * ")) {
      const splitByInLineBullet = singleLine.split(/\s+[-•*]\s+/).map(i => i.trim()).filter(i => i.length > 0);
      if (splitByInLineBullet.length > 1) {
        items = splitByInLineBullet;
      }
    } else if (singleLine.includes(";")) {
      const splitBySemi = singleLine.split(";").map(i => i.trim()).filter(i => i.length > 0);
      if (splitBySemi.length > 1) {
        items = splitBySemi;
      }
    } else if (singleLine.includes(",")) {
      const splitByComma = singleLine.split(",").map(i => i.trim()).filter(i => i.length > 0);
      const avgLen = splitByComma.reduce((sum, item) => sum + item.length, 0) / splitByComma.length;
      if (splitByComma.length > 1 && avgLen < 40) {
        items = splitByComma;
      }
    }
  }
  
  if (items.length <= 1) {
    return <p className="text-slate-700 leading-relaxed text-justify whitespace-pre-wrap">{text}</p>;
  }
  
  return (
    <ul className="list-none space-y-1.5 pl-0 text-slate-700">
      {items.map((item, idx) => (
        <li key={idx} className="flex items-start gap-2 text-justify leading-relaxed">
          <span className="text-slate-400 mt-1 select-none flex-shrink-0 text-xs">●</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
};

interface ReportPrintPreviewProps {
  report: Report;
  assessor: {
    fantasyName: string;
    socialName: string;
    cnpj: string;
    address: string;
    phone: string;
    logo: string;
    defaultCoverImage?: string;
  };
}

export const ReportPrintPreview: React.FC<ReportPrintPreviewProps> = ({ report, assessor }) => {
  const getEmissionDateFormatted = () => {
    const months = [
      "janeiro", "fevereiro", "março", "abril", "maio", "junho",
      "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
    ];
    const d = new Date();
    const day = d.getDate();
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `Tangará da Serra - MT, ${day} de ${month} de ${year}`;
  };

  const getCompanyFullAddress = () => {
    const r = report;
    if (!r) return "";
    if (r.companyAddress && !r.companyNumber && !r.companyCep && !r.companyBairro && !r.companyCity) {
      return r.companyAddress;
    }
    const parts: string[] = [];
    if (r.companyAddress) parts.push(r.companyAddress);
    if (r.companyNumber) parts.push(r.companyNumber);
    if (r.companyBairro) parts.push(r.companyBairro);
    if (r.companyCity || r.companyState) {
      const cityState = [r.companyCity, r.companyState].filter(Boolean).join(" - ");
      if (cityState) parts.push(cityState);
    }
    if (r.companyCep) parts.push(`CEP: ${r.companyCep}`);
    return parts.filter(Boolean).join(", ");
  };

  const handlePrint = () => {
    window.print();
  };

  const renderIndentedText = (text: string) => {
    if (!text) return null;
    const resolvedText = replaceTemplateVariables(text, report, assessor);
    const paras = resolvedText.split(/\n+/);
    
    // Determine the indent class or inline style
    const indent = report.paragraphIndent || "medium";
    const indentCm = indent === "medium" ? "1.5cm" : indent === "large" ? "2.5cm" : "0cm";

    return (
      <div className="space-y-4">
        {paras.map((p, idx) => {
          const trimmed = p.trim();
          if (!trimmed) return null;
          
          // Check if paragraph starts with a list indicator
          const isList = /^(?:\d+\.|\*|-|•|a\)|b\)|c\))/i.test(trimmed);
          
          return (
            <p 
              key={idx} 
              className="text-justify text-slate-700 leading-relaxed text-sm"
              style={{ 
                textIndent: isList ? "0cm" : indentCm,
                paddingLeft: isList ? "1rem" : "0cm" 
              }}
            >
              {trimmed}
            </p>
          );
        })}
      </div>
    );
  };

  const renderHeader = (chapterTitle: string) => (
    <div className="border-b border-slate-200 pb-3 mb-6 flex items-center justify-between gap-4 print:flex print-avoid-break-after">
      <div className="flex items-center gap-3">
        {/* Assessora Logo */}
        {assessor.logo ? (
          <img 
            src={assessor.logo} 
            alt="Logo Assessora" 
            className="h-14 max-w-[180px] object-contain" 
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="h-10 px-3 bg-slate-100 flex items-center justify-center rounded text-[9px] font-black text-slate-500 uppercase tracking-wider border border-slate-200">
            {assessor.fantasyName || "Lima SST"}
          </div>
        )}
        
        {/* Divider if both exist */}
        {assessor.logo && report.companyLogo && (
          <div className="h-12 w-[1px] bg-slate-300" />
        )}

        {/* Cliente Logo */}
        {report.companyLogo && (
          <img 
            src={report.companyLogo} 
            alt="Logo Cliente" 
            className="h-14 max-w-[180px] object-contain" 
            referrerPolicy="no-referrer"
          />
        )}
      </div>

      <div className="text-right max-w-sm shrink-0">
        <span className="text-[8px] sm:text-[9px] font-extrabold text-slate-400 block uppercase tracking-widest leading-none">
          DIAGNÓSTICO DOS FATORES DE RISCOS PSICOSSOCIAIS NO AMBIENTE DE TRABALHO
        </span>
        <span className="text-[10px] font-bold text-slate-600 block mt-1">
          {chapterTitle} • {report.companyName || "Empresa"}
        </span>
      </div>
    </div>
  );

  const getSectorName = (sectorId: string) => {
    const s = report.sectors.find((sect) => sect.id === sectorId);
    return s ? s.name : "Setor não identificado";
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  const getPriorityColorPrint = (priority: string) => {
    switch (priority) {
      case "Alta": return "bg-rose-100 text-rose-800 border-rose-300 print:bg-red-100 print:text-red-900";
      case "Média": return "bg-amber-100 text-amber-800 border-amber-300 print:bg-yellow-100 print:text-yellow-900";
      case "Baixa": return "bg-blue-100 text-blue-800 border-blue-300 print:bg-blue-50 print:text-blue-900";
      default: return "bg-slate-100 text-slate-800";
    }
  };

  const getStatusColorPrint = (status: string) => {
    switch (status) {
      case "Concluído": return "bg-emerald-100 text-emerald-800 border-emerald-300 print:bg-emerald-50 print:text-emerald-900";
      case "Em Andamento": return "bg-orange-100 text-orange-800 border-orange-300 print:bg-orange-50 print:text-orange-900";
      case "Pendente": return "bg-slate-100 text-slate-700 border-slate-300 print:bg-slate-50 print:text-slate-800";
      default: return "bg-slate-100 text-slate-800";
    }
  };

  const getRiskColorPrint = (color: string) => {
    switch (color) {
      case "red": return "bg-rose-100 text-rose-900 border-rose-300 font-bold";
      case "orange": return "bg-orange-100 text-orange-900 border-orange-300 font-bold";
      case "yellow": return "bg-amber-100 text-amber-900 border-amber-300 font-semibold";
      case "green": return "bg-emerald-100 text-emerald-900 border-emerald-300";
      case "blue": return "bg-blue-100 text-blue-900 border-blue-300";
      default: return "bg-slate-100 text-slate-900";
    }
  };

  return (
    <div className="space-y-6" id="report-print-preview-container">
      {/* Barra de Ações Web */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <Printer className="w-4 h-4 text-slate-600" />
            Visualização de Impressão e Exportação
          </h3>
          <p className="text-xs text-slate-500">
            Abaixo está o documento oficial formatado para impressão em papel A4 ou exportação para PDF (utilizando o comando de impressão do navegador).
          </p>
        </div>

        <button
          onClick={handlePrint}
          className="flex items-center justify-center gap-1.5 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 px-5 py-2.5 rounded-lg transition-colors cursor-pointer shadow-xs self-start sm:self-center"
        >
          <Printer className="w-4 h-4" /> Imprimir / Salvar em PDF
        </button>
      </div>

      {/* --- INÍCIO DO DOCUMENTO OFICIAL (VISUALIZAÇÃO EM TELA) --- */}
      <div className="print:hidden bg-white p-8 sm:p-16 border border-slate-200 shadow-sm rounded-2xl mx-auto max-w-[900px] font-sans text-slate-800 leading-relaxed space-y-12">
        
        {/* --- CAPA (Capa do Relatório) --- */}
        {(report.coverImage || assessor.defaultCoverImage) ? (
          <div className="min-h-[1050px] print:h-screen print:min-h-0 flex flex-col justify-center items-center pb-16 print:pb-0 page-break-after">
            <div className="w-full h-full max-h-[1000px] flex items-center justify-center">
              <img 
                src={report.coverImage || assessor.defaultCoverImage} 
                alt="Capa Customizada" 
                className="max-w-full max-h-full object-contain print:max-h-[95vh] rounded-2xl print:rounded-none shadow-sm print:shadow-none"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        ) : (
          <div className="min-h-[1050px] flex flex-col justify-between border-b-2 border-slate-200 pb-16 print:min-h-0 print:h-screen print:border-none print:pb-0 print:justify-center print:gap-12">
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b-2 border-slate-800 pb-4">
                <Activity className="w-8 h-8 text-slate-800" />
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">PROGRAMA DE SAÚDE E SEGURANÇA DO TRABALHO</span>
                  <span className="text-lg font-extrabold text-slate-900 leading-none">LAUDO TÉCNICO DE FATORES DE RISCOS PSICOSSOCIAIS</span>
                </div>
              </div>
            </div>

            <div className="space-y-6 text-center py-16">
              <h1 className="text-3xl font-extrabold text-slate-900 uppercase tracking-tight leading-tight">
                Relatório de Avaliação e Conclusão
              </h1>
              <h2 className="text-xl font-bold text-slate-600 uppercase tracking-wide">
                Metodologia COPSOQ II – BR
              </h2>
              <div className="w-24 h-1 bg-slate-800 mx-auto my-6" />
              <h3 className="text-2xl font-black text-slate-900 uppercase leading-snug">
                {report.companyFantasyName ? `${report.companyName} (${report.companyFantasyName})` : (report.companyName || "[NOME DA EMPRESA NÃO INFORMADO]")}
              </h3>
              {report.cnpj && (
                <p className="text-sm text-slate-500 font-mono">CNPJ: {report.cnpj}</p>
              )}
            </div>

            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200/80 space-y-4 max-w-xl mx-auto text-left print:bg-white print:border-slate-300">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 pb-1.5">Identificação Técnica e da Empresa</h4>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">Responsável Técnico:</span>
                  <span className="font-bold text-slate-800">{report.professionalName || "Não cadastrado"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Cargo/Registro:</span>
                  <span className="font-bold text-slate-800">{report.professionalRole} - {report.professionalReg || "-"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Período de Campo:</span>
                  <span className="font-bold text-slate-800">
                    {formatDate(report.dateStart)} a {formatDate(report.dateEnd)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Setores Avaliados:</span>
                  <span className="font-bold text-slate-800">{report.sectors.length} setores cadastrados</span>
                </div>
                {report.companyCnae && (
                  <div>
                    <span className="text-slate-400 block font-medium">CNAE Principal:</span>
                    <span className="font-bold text-slate-800">{report.companyCnae}</span>
                  </div>
                )}
                {report.companyRiskDegree && (
                  <div>
                    <span className="text-slate-400 block font-medium">Grau de Risco:</span>
                    <span className="font-bold text-slate-800">Grau {report.companyRiskDegree}</span>
                  </div>
                )}
                {report.companySector && (
                  <div>
                    <span className="text-slate-400 block font-medium">Setor / Atividade:</span>
                    <span className="font-bold text-slate-800">{report.companySector}</span>
                  </div>
                )}
              </div>
              {getCompanyFullAddress() && (
                <div className="text-xs pt-2 border-t border-slate-200">
                  <span className="text-slate-400 block font-medium">Endereço Completo:</span>
                  <span className="font-bold text-slate-800">{getCompanyFullAddress()}</span>
                </div>
              )}

              {/* Empresa Avaliadora */}
              <div className="text-xs pt-3 border-t border-slate-200 space-y-1">
                <span className="text-slate-400 block font-medium uppercase tracking-wider text-[9px]">Empresa Avaliadora:</span>
                <div className="flex items-start gap-3">
                  {assessor.logo && (
                    <img src={assessor.logo} alt="Logo Assessora" className="h-8 max-w-[80px] object-contain border border-slate-200 rounded p-0.5 bg-white shrink-0" referrerPolicy="no-referrer" />
                  )}
                  <div>
                    <span className="font-extrabold text-slate-800 block">{assessor.fantasyName || "Lima engenharia e assessoria em segurança do trabalho"}</span>
                    <span className="text-slate-500 block leading-tight text-[11px]">{assessor.socialName || "E. L. de Jesus – Segurança"} • CNPJ: {assessor.cnpj || "18.195.986/0001-68"}</span>
                    <span className="text-slate-500 block leading-tight text-[11px]">{assessor.address || "Av. Mato grosso, 108-W, Centro, Tangará da Serra – MT"} • {assessor.phone || "65 99998-0418"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- PÁGINA 2: RESUMO E IDENTIFICAÇÃO DO ESCOPO --- */}
        {(() => {
          const totalEmployees = report.sectors.reduce((sum, s) => sum + (s.employeeCount || 0), 0);
          const totalRespondents = report.sectors.reduce((sum, s) => sum + (s.respondentsCount || 0), 0);
          const totalResponseRate = totalEmployees > 0 ? Math.round((totalRespondents / totalEmployees) * 100) : 0;

          return (
            <div className="min-h-[1050px] flex flex-col justify-between border-b-2 border-slate-200 pb-16 print:min-h-0 print:h-screen print:border-none print:pb-0 page-break-before page-break-after">
              {renderHeader("Dados Cadastrais e Escopo")}

              <div className="my-auto space-y-8 max-w-2xl mx-auto w-full">
                {/* Logo do Cliente Destacada no Centro */}
                <div className="text-center space-y-4">
                  {report.companyLogo ? (
                    <img
                      src={report.companyLogo}
                      alt="Logo Cliente"
                      className="h-24 max-w-[240px] object-contain mx-auto mb-2"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-slate-100 flex items-center justify-center rounded-2xl mx-auto mb-2 text-slate-400 font-bold border border-slate-200">
                      C
                    </div>
                  )}
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1">Empresa Cliente Avaliada</span>
                    <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight leading-tight">
                      {report.companyName || "Empresa Cliente"}
                    </h2>
                  </div>
                </div>

                {/* Dados Cadastrais */}
                <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-200 text-[10px] text-left space-y-5">
                  <div>
                    <h4 className="text-[9px] font-black uppercase text-slate-500 tracking-wider border-b border-slate-200 pb-1.5 mb-2.5">Identificação da Empresa</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                      <div>
                        <span className="text-slate-400 block font-semibold text-[8px] uppercase tracking-wider">Razão Social / Nome da Empresa:</span>
                        <span className="font-extrabold text-slate-800 block">{report.companyName || "-"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-semibold text-[8px] uppercase tracking-wider">Nome Fantasia:</span>
                        <span className="font-bold text-slate-800 block">{report.companyFantasyName || "-"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-semibold text-[8px] uppercase tracking-wider">CNPJ / CAEPF:</span>
                        <span className="font-extrabold text-slate-800 font-mono block">{report.cnpj || "-"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-semibold text-[8px] uppercase tracking-wider">CNAE Principal:</span>
                        <span className="font-bold text-slate-800 block">{report.companyCnae || "-"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-semibold text-[8px] uppercase tracking-wider">Grau de Risco (SST):</span>
                        <span className="font-bold text-slate-800 block">{report.companyRiskDegree ? `Grau ${report.companyRiskDegree}` : "-"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-semibold text-[8px] uppercase tracking-wider">Setor / Atividade:</span>
                        <span className="font-bold text-slate-800 block">{report.companySector || "-"}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-[9px] font-black uppercase text-slate-500 tracking-wider border-b border-slate-200 pb-1.5 mb-2.5">Endereço da Empresa</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-3">
                      <div className="sm:col-span-2">
                        <span className="text-slate-400 block font-semibold text-[8px] uppercase tracking-wider">Logradouro / Endereço:</span>
                        <span className="font-bold text-slate-800 block">{report.companyAddress || "-"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-semibold text-[8px] uppercase tracking-wider">Número:</span>
                        <span className="font-bold text-slate-800 block">{report.companyNumber || "-"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-semibold text-[8px] uppercase tracking-wider">Bairro:</span>
                        <span className="font-bold text-slate-800 block">{report.companyBairro || "-"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-semibold text-[8px] uppercase tracking-wider">CEP:</span>
                        <span className="font-bold text-slate-800 font-mono block">{report.companyCep || "-"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-semibold text-[8px] uppercase tracking-wider">Cidade / UF:</span>
                        <span className="font-bold text-slate-800 block">
                          {report.companyCity || "-"} {report.companyState ? ` - ${report.companyState}` : ""}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Escopo da Avaliação (Métricas Chave) */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-center space-y-0.5">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Funcionários Avaliados</span>
                    <span className="text-2xl font-black text-slate-800 font-mono">{totalEmployees}</span>
                    <span className="text-[10px] text-slate-500 block">Total no GHE</span>
                  </div>
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-center space-y-0.5">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Setores Ativos</span>
                    <span className="text-2xl font-black text-slate-800 font-mono">{report.sectors.length}</span>
                    <span className="text-[10px] text-slate-500 block">Setores Mapeados</span>
                  </div>
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-center space-y-0.5">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Taxa de Resposta</span>
                    <span className="text-2xl font-black text-slate-800 font-mono">{totalResponseRate}%</span>
                    <span className="text-[10px] text-slate-500 block">{totalRespondents} respostas</span>
                  </div>
                </div>

                {/* Setores Avaliados */}
                <div className="text-xs text-left bg-white p-4 rounded-xl border border-slate-200 space-y-1.5">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Detalhamento por Setor</span>
                  <div className="flex flex-wrap gap-2">
                    {report.sectors.map((s) => (
                      <span key={s.id} className="inline-block bg-slate-50 text-slate-700 px-2.5 py-1 rounded-md border border-slate-200 text-[11px] font-medium">
                        {s.name}: <strong className="font-extrabold text-slate-900 font-mono">{s.respondentsCount || 0}</strong> de <strong className="font-extrabold text-slate-900 font-mono">{s.employeeCount || 0}</strong> func. (<strong className="text-slate-800 font-bold font-mono">{s.employeeCount > 0 ? Math.round(((s.respondentsCount || 0) / s.employeeCount) * 100) : 0}%</strong>)
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Dados da Empresa Avaliadora no Rodapé */}
              <div className="border-t border-slate-200 pt-6 mt-auto">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-3 text-center sm:text-left">
                  ASSESSORIA EM SAÚDE E SEGURANÇA DO TRABALHO RESPONSÁVEL
                </span>
                <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 text-xs">
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
                    {assessor.logo ? (
                      <img
                        src={assessor.logo}
                        alt="Logo Assessora"
                        className="h-12 max-w-[140px] object-contain border border-slate-150 rounded-lg p-1 bg-white shrink-0"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="h-10 px-3 bg-slate-100 flex items-center justify-center rounded-lg text-[9px] font-black text-slate-500 uppercase tracking-wider border border-slate-200 shrink-0">
                        {assessor.fantasyName || "LIMA SST"}
                      </div>
                    )}
                    <div className="space-y-0.5">
                      <span className="font-black text-slate-800 block text-sm leading-snug">{assessor.fantasyName || "Lima Engenharia e Assessoria"}</span>
                      <span className="text-slate-500 block text-[11px] leading-tight">{assessor.socialName || "E. L. de Jesus – Segurança"} • CNPJ: {assessor.cnpj || "18.195.986/0001-68"}</span>
                      <span className="text-slate-500 block text-[11px] leading-tight">{assessor.address || "Av. Mato grosso, 108-W, Centro, Tangará da Serra – MT"} • Contato: {assessor.phone || "65 99998-0418"}</span>
                    </div>
                  </div>
                  <div className="text-center sm:text-right shrink-0">
                    <span className="text-slate-400 block font-semibold text-[9px] uppercase tracking-wider">Período de Campo:</span>
                    <span className="font-bold text-slate-700 block text-[13px]">{formatDate(report.dateStart)} a {formatDate(report.dateEnd)}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* --- SUMÁRIO (ATUALIZAÇÃO AUTOMÁTICA) --- */}
        <div className="min-h-[1050px] flex flex-col justify-between border-b-2 border-slate-200 pb-16 print:min-h-0 print:h-screen print:border-none print:pb-0 page-break-before page-break-after">
          {renderHeader("Sumário Geral do Relatório")}

          <div className="my-auto max-w-2xl mx-auto w-full space-y-8">
            <div className="text-center">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1">Índice Geral</span>
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
                Sumário
              </h2>
              <div className="w-12 h-1 bg-slate-800 mx-auto mt-2 rounded"></div>
            </div>

            <div className="space-y-4 text-xs">
              {/* 1. Introdução */}
              <div className="flex items-end gap-2">
                <span className="font-bold text-slate-850">1. INTRODUÇÃO</span>
                <div className="flex-grow border-b border-dotted border-slate-300 mb-1"></div>
                <span className="text-slate-500 font-bold font-mono">03</span>
              </div>

              {/* 2. Fundamentação Teórica */}
              <div className="flex items-end gap-2">
                <span className="font-bold text-slate-850">2. FUNDAMENTAÇÃO TEÓRICA</span>
                <div className="flex-grow border-b border-dotted border-slate-300 mb-1"></div>
                <span className="text-slate-500 font-bold font-mono">04</span>
              </div>

              {/* 3. Metodologia de Avaliação */}
              <div className="flex items-end gap-2">
                <span className="font-bold text-slate-850">3. METODOLOGIA DE AVALIAÇÃO</span>
                <div className="flex-grow border-b border-dotted border-slate-300 mb-1"></div>
                <span className="text-slate-500 font-bold font-mono">05</span>
              </div>

              {/* 4. Apresentação dos Resultados */}
              <div className="space-y-1.5">
                <div className="flex items-end gap-2">
                  <span className="font-bold text-slate-850">4. APRESENTAÇÃO DOS RESULTADOS</span>
                  <div className="flex-grow border-b border-dotted border-slate-300 mb-1"></div>
                  <span className="text-slate-500 font-bold font-mono">06</span>
                </div>
                {report.sectors.map((sector, index) => (
                  <div key={sector.id} className="flex items-end gap-2 pl-6 text-[11px] text-slate-600">
                    <span className="font-medium">4.{index + 1}. Resultados do Setor: {sector.name}</span>
                    <div className="flex-grow border-b border-dotted border-slate-200 mb-0.5"></div>
                    <span className="text-slate-400 font-medium font-mono">06</span>
                  </div>
                ))}
              </div>

              {/* 5. Análise Técnica dos Riscos e Investigação Qualitativa */}
              <div className="space-y-1.5">
                <div className="flex items-end gap-2">
                  <span className="font-bold text-slate-850">5. ANÁLISE TÉCNICA E DEVOLUTIVAS</span>
                  <div className="flex-grow border-b border-dotted border-slate-300 mb-1"></div>
                  <span className="text-slate-500 font-bold font-mono">07</span>
                </div>
                {report.sectors.map((sector, index) => (
                  <div key={sector.id} className="flex items-end gap-2 pl-6 text-[11px] text-slate-600">
                    <span className="font-medium">5.{index + 1}. Diagnóstico Qualitativo: {sector.name}</span>
                    <div className="flex-grow border-b border-dotted border-slate-200 mb-0.5"></div>
                    <span className="text-slate-400 font-medium font-mono">07</span>
                  </div>
                ))}
              </div>

              {report.risksRecognized !== false && (
                <>
                  {/* 6. Inventário de Riscos Psicossociais */}
                  <div className="space-y-1.5">
                    <div className="flex items-end gap-2">
                      <span className="font-bold text-slate-850">6. INVENTÁRIO DE RISCOS PSICOSSOCIAIS</span>
                      <div className="flex-grow border-b border-dotted border-slate-300 mb-1"></div>
                      <span className="text-slate-500 font-bold font-mono">08</span>
                    </div>
                    {report.sectors.map((sector, index) => {
                      const hasRisks = report.riskInventory.some(r => r.sectorId === sector.id);
                      if (!hasRisks) return null;
                      return (
                        <div key={sector.id} className="flex items-end gap-2 pl-6 text-[11px] text-slate-600">
                          <span className="font-medium">6.{index + 1}. Riscos de {sector.name}</span>
                          <div className="flex-grow border-b border-dotted border-slate-200 mb-0.5"></div>
                          <span className="text-slate-400 font-medium font-mono">08</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* 7. Cronograma e Plano de Ação */}
                  <div className="space-y-1.5">
                    <div className="flex items-end gap-2">
                      <span className="font-bold text-slate-850">7. CRONOGRAMA E PLANO DE AÇÃO</span>
                      <div className="flex-grow border-b border-dotted border-slate-300 mb-1"></div>
                      <span className="text-slate-500 font-bold font-mono">09</span>
                    </div>
                    {report.sectors.map((sector, index) => {
                      const hasActions = report.riskInventory.some(r => r.sectorId === sector.id);
                      if (!hasActions) return null;
                      return (
                        <div key={sector.id} className="flex items-end gap-2 pl-6 text-[11px] text-slate-600">
                          <span className="font-medium">7.{index + 1}. Ações de {sector.name}</span>
                          <div className="flex-grow border-b border-dotted border-slate-200 mb-0.5"></div>
                          <span className="text-slate-400 font-medium font-mono">09</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {/* 8. Considerações Finais */}
              <div className="flex items-end gap-2">
                <span className="font-bold text-slate-850">8. CONSIDERAÇÕES FINAIS</span>
                <div className="flex-grow border-b border-dotted border-slate-300 mb-1"></div>
                <span className="text-slate-500 font-bold font-mono">10</span>
              </div>

              {/* 9. Referências Bibliográficas */}
              <div className="flex items-end gap-2">
                <span className="font-bold text-slate-850">9. REFERÊNCIAS BIBLIOGRÁFICAS</span>
                <div className="flex-grow border-b border-dotted border-slate-300 mb-1"></div>
                <span className="text-slate-500 font-bold font-mono">11</span>
              </div>
            </div>
          </div>

          <div className="text-center text-[10px] text-slate-400 font-semibold border-t border-slate-100 pt-4">
            Este sumário é gerado e atualizado dinamicamente com base nas informações setoriais registradas.
          </div>
        </div>

        {/* --- CAPÍTULO 1: INTRODUÇÃO --- */}
        <div className="space-y-4 print:pt-12 page-break-before">
          {renderHeader("1. Introdução")}
          <h3 className="text-lg font-extrabold text-slate-900 border-b-2 border-slate-800 pb-2 uppercase tracking-wide">
            1. Introdução
          </h3>
          {renderIndentedText(report.chapters.introducao)}
        </div>

        {/* --- CAPÍTULO 2: FUNDAMENTAÇÃO --- */}
        <div className="space-y-4 print:pt-12 page-break-before">
          {renderHeader("2. Fundamentação Teórica")}
          <h3 className="text-lg font-extrabold text-slate-900 border-b-2 border-slate-800 pb-2 uppercase tracking-wide">
            2. Fundamentação Teórica
          </h3>
          {renderIndentedText(report.chapters.fundamentacao)}
        </div>

        {/* --- CAPÍTULO 3: METODOLOGIA --- */}
        <div className="space-y-4 print:pt-12 page-break-before">
          {renderHeader("3. Metodologia de Avaliação")}
          <h3 className="text-lg font-extrabold text-slate-900 border-b-2 border-slate-800 pb-2 uppercase tracking-wide">
            3. Metodologia de Avaliação
          </h3>
          {renderIndentedText(report.chapters.metodologia)}
        </div>

        {/* --- CAPÍTULO 4: APRESENTAÇÃO DOS RESULTADOS --- */}
        <div className="space-y-6 print:pt-12 page-break-before">
          {renderHeader("4. Resultados Tabulados")}
          <h3 className="text-lg font-extrabold text-slate-900 border-b-2 border-slate-800 pb-2 uppercase tracking-wide">
            4. Apresentação dos Resultados
          </h3>
          <p className="text-sm text-slate-700">
            Abaixo estão detalhados os resultados numéricos médios tabulados por setor avaliado. Para cada setor, apresenta-se a pontuação obtida na escala COPSOQ II de 0,00 a 4,00 pontos.
          </p>

          {report.sectors.length === 0 ? (
            <p className="text-xs text-slate-400 italic">Nenhum dado setorial cadastrado no relatório.</p>
          ) : (
            <div className="space-y-8">
              {report.sectors.map((sector) => (
                <div key={sector.id} className="p-5 border border-slate-200 rounded-xl space-y-4 print:p-0 print:border-none">
                  <div className="bg-slate-100 p-3 rounded-lg flex flex-wrap items-center justify-between print:bg-white print:border-b print:rounded-none px-0 pb-2 gap-2">
                    <span className="font-extrabold text-sm text-slate-900 uppercase">Setor: {sector.name}</span>
                    <div className="flex gap-4 text-xs font-semibold text-slate-600">
                      <span>Expostos: {sector.employeeCount} func.</span>
                      <span>Respondentes: {sector.respondentsCount ?? 0} ({sector.employeeCount > 0 ? (((sector.respondentsCount ?? 0) / sector.employeeCount) * 100).toFixed(1) : 0}%)</span>
                    </div>
                  </div>

                  <table className="w-full border-collapse border border-slate-200 text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                        <th className="p-2 border border-slate-200 text-left">Dimensão do COPSOQ II</th>
                        <th className="p-2 border border-slate-200 text-center w-24">Tipo</th>
                        <th className="p-2 border border-slate-200 text-center w-28">Pontuação</th>
                        <th className="p-2 border border-slate-200 text-center w-36">Classificação Técnica</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {COPSOQ_DIMENSIONS.map((dim) => {
                        const score = sector.scores[dim.key] ?? 0;
                        const ratingInfo = getDimensionRating(score, dim.type);

                        return (
                          <tr key={dim.key} className="hover:bg-slate-50/50 print:hover:bg-transparent">
                            <td className="p-2 border border-slate-200 font-medium">{dim.name}</td>
                            <td className="p-2 border border-slate-200 text-center uppercase text-[9px] font-bold text-slate-400">
                              {dim.type === "positive" ? "Positiva" : "Negativa"}
                            </td>
                            <td className="p-2 border border-slate-200 text-center font-bold text-slate-800 font-mono">
                              {score === 0 ? "N/A" : score.toFixed(2)}
                            </td>
                            <td className={`p-2 border border-slate-200 text-center font-bold text-[10px] uppercase ${ratingInfo.bgClass}`}>
                              {ratingInfo.rating}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {sector.generalAnalysis && (
                    <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs text-justify leading-relaxed print:bg-white print:border-l-4 print:border-slate-400 print:rounded-none">
                      <strong className="text-slate-800 uppercase text-[9px] tracking-wider block mb-1">Análise Geral da Percepção dos Colaboradores:</strong>
                      <span className="text-slate-700 italic">{sector.generalAnalysis}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* --- CAPÍTULO 5: ANÁLISE TÉCNICA DOS RISCOS --- */}
        <div className="space-y-6 print:pt-12 page-break-before">
          {renderHeader("5. Análise de Campo e Devolutivas")}
          <h3 className="text-lg font-extrabold text-slate-900 border-b-2 border-slate-800 pb-2 uppercase tracking-wide">
            5. Análise Técnica dos Riscos e Investigação Qualitativa
          </h3>
          <p className="text-sm text-slate-700">
            Abaixo estão registradas as conclusões qualitativas das sessões de devolutiva mantidas com a liderança de cada setor. O escopo foca especificamente no cruzamento dos riscos percebidos desfavoráveis/moderados com o ambiente real de trabalho.
          </p>

          {report.sectors.length === 0 ? (
            <p className="text-xs text-slate-400 italic">Nenhum dado cadastrado.</p>
          ) : (
            <div className="space-y-6">
              {report.sectors.map((sector) => {
                // Get critical dimensions for this sector
                const critical = COPSOQ_DIMENSIONS.map((d) => {
                  const score = sector.scores[d.key] ?? 0.0;
                  const rat = getDimensionRating(score, d.type);
                  return { name: d.name, score, rating: rat.rating };
                }).filter((d) => d.rating !== "Favorável" && d.rating !== "Não Avaliado" && d.score > 0);

                return (
                  <div key={sector.id} className="p-5 border border-slate-200 rounded-xl space-y-3 print:p-0 print:border-none print:pb-6">
                    <h4 className="font-extrabold text-sm text-slate-900 border-b border-slate-100 pb-1.5 uppercase">
                      Diagnóstico de Campo: {sector.name}
                    </h4>

                    <div className="flex flex-wrap gap-2 text-[10px] items-center">
                      <strong className="text-slate-500 uppercase tracking-wider">Fatores Investigados:</strong>
                      {critical.length === 0 ? (
                        <span className="text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                          Nenhum desvio detectado
                        </span>
                      ) : (
                        critical.map((c, i) => (
                          <span key={i} className={`px-2 py-0.5 rounded border font-semibold ${
                            c.rating === "Desfavorável" ? "bg-rose-50 text-rose-800 border-rose-200" : "bg-amber-50 text-amber-800 border-amber-200"
                          }`}>
                            {c.name} ({c.score.toFixed(2)})
                          </span>
                        ))
                      )}
                    </div>

                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 text-xs text-justify leading-relaxed text-slate-700 whitespace-pre-wrap print:bg-white print:border-l-4 print:border-slate-400 print:rounded-none">
                      {sector.devolvedSynthesis ? (
                        sector.devolvedSynthesis
                      ) : (
                        <span className="text-slate-400 italic">
                          Ainda não foi preenchido o relatório técnico de devolutiva com os líderes para este setor.
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {report.risksRecognized !== false ? (
          <>
            {/* --- CAPÍTULO 6: INVENTÁRIO DOS RISCOS --- */}
            <div className="space-y-4 print:pt-12 page-break-before">
              {renderHeader("6. Inventário de Riscos GRO")}
              <h3 className="text-lg font-extrabold text-slate-900 border-b-2 border-slate-800 pb-2 uppercase tracking-wide">
                6. Inventário de Riscos Psicossociais
              </h3>
              <p className="text-sm text-slate-700">
                Abaixo estão estruturados de forma sistemática os riscos psicossociais evidenciados em campo, incluindo as fontes geradoras, as populações expostas, as medidas preventivas existentes e a respectiva avaliação de severidade e probabilidade através da matriz 5x5.
              </p>

              {report.riskInventory.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-6 text-center border border-dashed rounded-lg">
                  Nenhum risco registrado no inventário.
                </p>
              ) : (
                <div className="space-y-8">
                  {report.sectors.map((sector) => {
                    const sectorRisks = report.riskInventory.filter(r => r.sectorId === sector.id);
                    if (sectorRisks.length === 0) return null;

                    return (
                      <div key={sector.id} className="space-y-4">
                        <div className="bg-slate-900 text-white px-4 py-2.5 rounded-xl border border-slate-850 flex items-center justify-between gap-4 print:bg-slate-900 print:text-white print-avoid-break-after">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                            <h4 className="text-[10px] font-black uppercase tracking-wider">
                              Setor / GHE: {sector.name}
                            </h4>
                          </div>
                          <div className="text-[9px] font-bold text-slate-300 uppercase">
                            {sector.employeeCount || 0} colaboradores expostos
                          </div>
                        </div>

                        <div className="space-y-4">
                          {sectorRisks.map((item, index) => {
                            return (
                              <div key={item.id} className="border border-slate-300 rounded-xl overflow-hidden shadow-xs bg-white text-slate-800 text-xs print:break-inside-avoid print:border-slate-350">
                                {/* Header */}
                                <div className="bg-slate-100 border-b border-slate-300 px-4 py-2 flex flex-row justify-between items-center gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded bg-slate-400 inline-block"></span>
                                    <h5 className="font-extrabold uppercase tracking-wide text-slate-700 text-xs">
                                      INVENTÁRIO DE RISCOS PSICOSSOCIAIS - {sector.name.toUpperCase()}
                                    </h5>
                                  </div>
                                </div>

                                {/* Row 1: Bullet and Risk Name */}
                                <div className="border-b border-slate-300 px-4 py-2 bg-slate-50/50 flex items-center gap-2 font-bold text-sm text-slate-900">
                                  <span className="w-2 h-2 bg-slate-700 rounded-xs"></span>
                                  <span>{item.riskName}</span>
                                </div>

                                {/* Row 2: Exposição */}
                                <div className="border-b border-slate-300 px-4 py-2 grid grid-cols-2 gap-2 text-left">
                                  <div>
                                    <span className="font-extrabold text-slate-500 block text-[10px] uppercase tracking-wider">Trabalhadores Expostos (GHE)</span>
                                    <span className="text-slate-800 font-semibold">{item.exposedCount} funcionários</span>
                                  </div>
                                  <div>
                                    <span className="font-extrabold text-slate-500 block text-[10px] uppercase tracking-wider">Frequência de Exposição</span>
                                    <span className="text-slate-800 font-semibold">Contínua / Habitual</span>
                                  </div>
                                </div>

                                {/* Row 3: Perigos, fontes e circunstâncias */}
                                <div className="border-b border-slate-300 px-4 py-2 text-left">
                                  <span className="font-extrabold text-slate-500 block text-[10px] uppercase tracking-wider">Perigos, Fontes e Circunstâncias:</span>
                                  <span className="text-slate-700 font-medium leading-relaxed block mt-0.5 whitespace-pre-line">{item.sourcesField || "Não registrado."}</span>
                                </div>

                                {/* Row 4: Metodologia */}
                                <div className="border-b border-slate-300 px-4 py-2 text-left">
                                  <span className="font-extrabold text-slate-500 block text-[10px] uppercase tracking-wider">Metodologia:</span>
                                  <span className="text-slate-700 font-medium block mt-0.5">Critério Qualitativo baseado na metodologia do COPSOQ e Matriz de Riscos Psicossociais 5x5.</span>
                                </div>

                                {/* Row 5: Medidas administrativas ou de organização do trabalho */}
                                <div className="border-b border-slate-300 px-4 py-2 text-left">
                                  <span className="font-extrabold text-slate-500 block text-[10px] uppercase tracking-wider">Medidas administrativas ou de organização do trabalho (Controles Existentes):</span>
                                  <span className="text-slate-700 font-medium leading-relaxed block mt-0.5 whitespace-pre-line">{item.existingControls || "Não evidenciado."}</span>
                                </div>

                                {/* Row 6: Descrição do Agente Nocivo */}
                                <div className="border-b border-slate-300 px-4 py-2 text-left">
                                  <span className="font-extrabold text-slate-500 block text-[10px] uppercase tracking-wider">Descrição do Agente Nocivo / Fator de Risco:</span>
                                  <span className="text-slate-700 font-medium block mt-0.5">{item.riskName} (Risco Psicossocial Organizacional)</span>
                                </div>

                                {/* Row 7: Possíveis danos à saúde */}
                                <div className="border-b border-slate-300 px-4 py-2 text-left">
                                  <span className="font-extrabold text-slate-500 block text-[10px] uppercase tracking-wider">Possíveis danos à saúde:</span>
                                  <span className="text-slate-700 font-medium leading-relaxed block mt-0.5 whitespace-pre-line">{item.possibleInjuries || "Não registrado."}</span>
                                </div>

                                {/* Row 8: Histórico de doenças / Queixas de adoecimento */}
                                {item.diseaseHistory && (
                                  <div className="border-b border-slate-300 px-4 py-2 text-left">
                                    <span className="font-extrabold text-slate-500 block text-[10px] uppercase tracking-wider">Histórico de doenças / Queixas de adoecimento:</span>
                                    <span className="text-slate-700 font-medium leading-relaxed block mt-0.5 whitespace-pre-line">{item.diseaseHistory}</span>
                                  </div>
                                )}

                                {/* Row 9: Probabilidade, Severidade, Nível do Risco */}
                                <div className="border-b border-slate-300 grid grid-cols-3">
                                  <div className="px-4 py-2 border-r border-slate-300 flex flex-col justify-center bg-slate-50/50 text-left">
                                    <span className="font-extrabold text-slate-500 text-[10px] uppercase tracking-wider block">Probabilidade</span>
                                    <span className="text-xs font-black text-slate-800">
                                      {PROBABILITY_LEVELS[item.probability - 1]?.label || item.probability}
                                    </span>
                                  </div>
                                  <div className="px-4 py-2 border-r border-slate-300 flex flex-col justify-center bg-slate-50/50 text-left">
                                    <span className="font-extrabold text-slate-500 text-[10px] uppercase tracking-wider block">Severidade</span>
                                    <span className="text-xs font-black text-slate-800">
                                      {SEVERITY_LEVELS[item.severity - 1]?.label || item.severity}
                                    </span>
                                  </div>
                                  <div className={`px-4 py-2 flex flex-col justify-center text-white text-left ${
                                    item.color === "red"
                                      ? "bg-rose-600 print:bg-rose-600"
                                      : item.color === "orange"
                                      ? "bg-amber-500 print:bg-amber-500"
                                      : item.color === "yellow"
                                      ? "bg-yellow-500 text-slate-900 print:bg-yellow-500 print:text-slate-900"
                                      : item.color === "blue"
                                      ? "bg-blue-500 print:bg-blue-500"
                                      : "bg-emerald-600 print:bg-emerald-600"
                                  }`}>
                                    <span className="font-extrabold text-[10px] uppercase tracking-wider block opacity-90">Nível do Risco / Perigo</span>
                                    <span className="text-xs font-black uppercase">
                                      Nível {item.riskLevel} (Score {item.riskScore})
                                    </span>
                                  </div>
                                </div>

                                {/* Row 10: Estimativa and 5x5 Matrix Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 text-left">
                                  <div className="px-4 py-3 border-r border-slate-300 space-y-2 flex flex-col justify-between">
                                    <div>
                                      <span className="font-extrabold text-slate-500 block text-[10px] uppercase tracking-wider">Estimativa:</span>
                                      <span className="text-slate-850 font-bold text-xs">{item.uncertainty || "Certa"}</span>
                                    </div>
                                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs space-y-1 mt-2">
                                      <span className="font-extrabold text-slate-600 block uppercase text-[9px] tracking-wider">Medida Preventiva Recomendada (PGR):</span>
                                      <p className="text-slate-700 leading-relaxed font-semibold italic">"{item.recommendation}"</p>
                                    </div>
                                  </div>
                                  <div className="p-3 bg-slate-50/50 flex flex-col items-center justify-center border-t md:border-t-0 print:border-t-0 border-slate-300 print:bg-white">
                                    <span className="font-extrabold text-slate-500 block text-[8px] uppercase tracking-wider mb-1.5">Matriz de Avaliação 5x5</span>
                                    <div className="grid grid-cols-6 gap-0.5 max-w-[200px] w-full text-[7px] font-bold text-center">
                                      {/* Top Header Labels */}
                                      <div className="text-[5px] text-slate-400 flex items-center justify-center font-bold">S \ P</div>
                                      {[1, 2, 3, 4, 5].map(p => (
                                        <div key={p} className="text-slate-400 flex items-center justify-center font-bold">P{p}</div>
                                      ))}

                                      {/* Matrix Rows */}
                                      {[5, 4, 3, 2, 1].map((s) => (
                                        <React.Fragment key={s}>
                                          <div className="text-slate-400 flex items-center justify-center font-bold">S{s}</div>
                                          {[1, 2, 3, 4, 5].map((p) => {
                                            const cell = getMatrixCell(p, s);
                                            const isActive = item.probability === p && item.severity === s;
                                            
                                            let cellBg = "bg-slate-200 text-slate-500";
                                            if (isActive) {
                                              cellBg = cell.color === "red"
                                                ? "bg-rose-500 text-white"
                                                : cell.color === "orange"
                                                ? "bg-amber-500 text-white"
                                                : cell.color === "yellow"
                                                ? "bg-yellow-400 text-slate-900"
                                                : cell.color === "blue"
                                                ? "bg-blue-400 text-white"
                                                : "bg-emerald-500 text-white";
                                            } else {
                                              cellBg = cell.color === "red"
                                                ? "bg-rose-50/50 text-rose-300"
                                                : cell.color === "orange"
                                                ? "bg-amber-50/50 text-amber-300"
                                                : cell.color === "yellow"
                                                ? "bg-yellow-50/50 text-yellow-500/70"
                                                : cell.color === "blue"
                                                ? "bg-blue-50/50 text-blue-300"
                                                : "bg-emerald-50/50 text-emerald-300";
                                            }

                                            return (
                                              <div
                                                key={p}
                                                className={`h-4.5 flex items-center justify-center rounded-xs border border-white/20 font-black font-mono ${cellBg}`}
                                              >
                                                {p * s}
                                              </div>
                                            );
                                          })}
                                        </React.Fragment>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  {/* Fallback for unrecognized sector risks if any */}
                  {report.riskInventory.filter(item => !report.sectors.some(s => s.id === item.sectorId)).length > 0 && (
                    <div className="space-y-4">
                      <div className="bg-slate-900 text-white px-4 py-2.5 rounded-xl border border-slate-850 flex items-center justify-between gap-4 print-avoid-break-after">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                          <h4 className="text-[10px] font-black uppercase tracking-wider">
                            Setor não identificado
                          </h4>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {report.riskInventory
                          .filter(item => !report.sectors.some(s => s.id === item.sectorId))
                          .map((item, index) => {
                            return (
                              <div key={item.id} className="border border-slate-300 rounded-xl overflow-hidden shadow-xs bg-white text-slate-800 text-xs print:break-inside-avoid print:border-slate-350">
                                {/* Header */}
                                <div className="bg-slate-100 border-b border-slate-300 px-4 py-2 flex flex-row justify-between items-center gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded bg-slate-400 inline-block"></span>
                                    <h5 className="font-extrabold uppercase tracking-wide text-slate-700 text-xs">
                                      INVENTÁRIO DE RISCOS PSICOSSOCIAIS - SETOR NÃO IDENTIFICADO
                                    </h5>
                                  </div>
                                </div>

                                {/* Row 1: Bullet and Risk Name */}
                                <div className="border-b border-slate-300 px-4 py-2 bg-slate-50/50 flex items-center gap-2 font-bold text-sm text-slate-900">
                                  <span className="w-2 h-2 bg-slate-700 rounded-xs"></span>
                                  <span>{item.riskName}</span>
                                </div>

                                {/* Row 2: Exposição */}
                                <div className="border-b border-slate-300 px-4 py-2 grid grid-cols-2 gap-2 text-left">
                                  <div>
                                    <span className="font-extrabold text-slate-500 block text-[10px] uppercase tracking-wider">Trabalhadores Expostos (GHE)</span>
                                    <span className="text-slate-800 font-semibold">{item.exposedCount} funcionários</span>
                                  </div>
                                  <div>
                                    <span className="font-extrabold text-slate-500 block text-[10px] uppercase tracking-wider">Frequência de Exposição</span>
                                    <span className="text-slate-800 font-semibold">Contínua / Habitual</span>
                                  </div>
                                </div>

                                {/* Row 3: Perigos, fontes e circunstâncias */}
                                <div className="border-b border-slate-300 px-4 py-2 text-left">
                                  <span className="font-extrabold text-slate-500 block text-[10px] uppercase tracking-wider">Perigos, Fontes e Circunstâncias:</span>
                                  <span className="text-slate-700 font-medium leading-relaxed block mt-0.5 whitespace-pre-line">{item.sourcesField || "Não registrado."}</span>
                                </div>

                                {/* Row 4: Metodologia */}
                                <div className="border-b border-slate-300 px-4 py-2 text-left">
                                  <span className="font-extrabold text-slate-500 block text-[10px] uppercase tracking-wider">Metodologia:</span>
                                  <span className="text-slate-700 font-medium block mt-0.5">Critério Qualitativo baseado na metodologia do COPSOQ e Matriz de Riscos Psicossociais 5x5.</span>
                                </div>

                                {/* Row 5: Medidas administrativas ou de organização do trabalho */}
                                <div className="border-b border-slate-300 px-4 py-2 text-left">
                                  <span className="font-extrabold text-slate-500 block text-[10px] uppercase tracking-wider">Medidas administrativas ou de organização do trabalho (Controles Existentes):</span>
                                  <span className="text-slate-700 font-medium leading-relaxed block mt-0.5 whitespace-pre-line">{item.existingControls || "Não evidenciado."}</span>
                                </div>

                                {/* Row 6: Descrição do Agente Nocivo */}
                                <div className="border-b border-slate-300 px-4 py-2 text-left">
                                  <span className="font-extrabold text-slate-500 block text-[10px] uppercase tracking-wider">Descrição do Agente Nocivo / Fator de Risco:</span>
                                  <span className="text-slate-700 font-medium block mt-0.5">{item.riskName} (Risco Psicossocial Organizacional)</span>
                                </div>

                                {/* Row 7: Possíveis danos à saúde */}
                                <div className="border-b border-slate-300 px-4 py-2 text-left">
                                  <span className="font-extrabold text-slate-500 block text-[10px] uppercase tracking-wider">Possíveis danos à saúde:</span>
                                  <span className="text-slate-700 font-medium leading-relaxed block mt-0.5 whitespace-pre-line">{item.possibleInjuries || "Não registrado."}</span>
                                </div>

                                {/* Row 8: Histórico de doenças / Queixas de adoecimento */}
                                {item.diseaseHistory && (
                                  <div className="border-b border-slate-300 px-4 py-2 text-left">
                                    <span className="font-extrabold text-slate-500 block text-[10px] uppercase tracking-wider">Histórico de doenças / Queixas de adoecimento:</span>
                                    <span className="text-slate-700 font-medium leading-relaxed block mt-0.5 whitespace-pre-line">{item.diseaseHistory}</span>
                                  </div>
                                )}

                                {/* Row 9: Probabilidade, Severidade, Nível do Risco */}
                                <div className="border-b border-slate-300 grid grid-cols-3">
                                  <div className="px-4 py-2 border-r border-slate-300 flex flex-col justify-center bg-slate-50/50 text-left">
                                    <span className="font-extrabold text-slate-500 text-[10px] uppercase tracking-wider block">Probabilidade</span>
                                    <span className="text-xs font-black text-slate-800">
                                      {PROBABILITY_LEVELS[item.probability - 1]?.label || item.probability}
                                    </span>
                                  </div>
                                  <div className="px-4 py-2 border-r border-slate-300 flex flex-col justify-center bg-slate-50/50 text-left">
                                    <span className="font-extrabold text-slate-500 text-[10px] uppercase tracking-wider block">Severidade</span>
                                    <span className="text-xs font-black text-slate-800">
                                      {SEVERITY_LEVELS[item.severity - 1]?.label || item.severity}
                                    </span>
                                  </div>
                                  <div className={`px-4 py-2 flex flex-col justify-center text-white text-left ${
                                    item.color === "red"
                                      ? "bg-rose-600 print:bg-rose-600"
                                      : item.color === "orange"
                                      ? "bg-amber-500 print:bg-amber-500"
                                      : item.color === "yellow"
                                      ? "bg-yellow-500 text-slate-900 print:bg-yellow-500 print:text-slate-900"
                                      : item.color === "blue"
                                      ? "bg-blue-500 print:bg-blue-500"
                                      : "bg-emerald-600 print:bg-emerald-600"
                                  }`}>
                                    <span className="font-extrabold text-[10px] uppercase tracking-wider block opacity-90">Nível do Risco / Perigo</span>
                                    <span className="text-xs font-black uppercase">
                                      Nível {item.riskLevel} (Score {item.riskScore})
                                    </span>
                                  </div>
                                </div>

                                {/* Row 10: Estimativa and 5x5 Matrix Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 text-left">
                                  <div className="px-4 py-3 border-r border-slate-300 space-y-2 flex flex-col justify-between">
                                    <div>
                                      <span className="font-extrabold text-slate-500 block text-[10px] uppercase tracking-wider">Estimativa:</span>
                                      <span className="text-slate-850 font-bold text-xs">{item.uncertainty || "Certa"}</span>
                                    </div>
                                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs space-y-1 mt-2">
                                      <span className="font-extrabold text-slate-600 block uppercase text-[9px] tracking-wider">Medida Preventiva Recomendada (PGR):</span>
                                      <p className="text-slate-700 leading-relaxed font-semibold italic">"{item.recommendation}"</p>
                                    </div>
                                  </div>
                                  <div className="p-3 bg-slate-50/50 flex flex-col items-center justify-center border-t md:border-t-0 print:border-t-0 border-slate-300 print:bg-white">
                                    <span className="font-extrabold text-slate-500 block text-[8px] uppercase tracking-wider mb-1.5">Matriz de Avaliação 5x5</span>
                                    <div className="grid grid-cols-6 gap-0.5 max-w-[200px] w-full text-[7px] font-bold text-center">
                                      {/* Top Header Labels */}
                                      <div className="text-[5px] text-slate-400 flex items-center justify-center font-bold">S \ P</div>
                                      {[1, 2, 3, 4, 5].map(p => (
                                        <div key={p} className="text-slate-400 flex items-center justify-center font-bold">P{p}</div>
                                      ))}

                                      {/* Matrix Rows */}
                                      {[5, 4, 3, 2, 1].map((s) => (
                                        <React.Fragment key={s}>
                                          <div className="text-slate-400 flex items-center justify-center font-bold">S{s}</div>
                                          {[1, 2, 3, 4, 5].map((p) => {
                                            const cell = getMatrixCell(p, s);
                                            const isActive = item.probability === p && item.severity === s;
                                            
                                            let cellBg = "bg-slate-200 text-slate-500";
                                            if (isActive) {
                                              cellBg = cell.color === "red"
                                                ? "bg-rose-500 text-white"
                                                : cell.color === "orange"
                                                ? "bg-amber-500 text-white"
                                                : cell.color === "yellow"
                                                ? "bg-yellow-400 text-slate-900"
                                                : cell.color === "blue"
                                                ? "bg-blue-400 text-white"
                                                : "bg-emerald-500 text-white";
                                            } else {
                                              cellBg = cell.color === "red"
                                                ? "bg-rose-50/50 text-rose-300"
                                                : cell.color === "orange"
                                                ? "bg-amber-50/50 text-amber-300"
                                                : cell.color === "yellow"
                                                ? "bg-yellow-50/50 text-yellow-500/70"
                                                : cell.color === "blue"
                                                ? "bg-blue-50/50 text-blue-300"
                                                : "bg-emerald-50/50 text-emerald-300";
                                            }

                                            return (
                                              <div
                                                key={p}
                                                className={`h-4.5 flex items-center justify-center rounded-xs border border-white/20 font-black font-mono ${cellBg}`}
                                              >
                                                {p * s}
                                              </div>
                                            );
                                          })}
                                        </React.Fragment>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* --- CAPÍTULO 7: PLANO DE AÇÃO --- */}
            <div className="space-y-4 print:pt-12 page-break-before">
              {renderHeader("7. Cronograma e Plano de Ação")}
              <h3 className="text-lg font-extrabold text-slate-900 border-b-2 border-slate-800 pb-2 uppercase tracking-wide">
                7. Cronograma e Plano de Ação
              </h3>
              <p className="text-sm text-slate-700">
                Com base no inventário técnico de riscos psicossociais, estabeleceram-se as seguintes ações integradas com objetivo, responsáveis, prioridade, prazos e indicadores de eficácia, conforme as diretrizes do PGR.
              </p>

              {report.riskInventory.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-6 text-center border border-dashed rounded-lg">
                  Nenhum plano de ação registrado.
                </p>
              ) : (
                <div className="space-y-8">
                  {report.sectors.map((sector) => {
                    const sectorRisks = report.riskInventory.filter(r => r.sectorId === sector.id);
                    if (sectorRisks.length === 0) return null;

                    return (
                      <div key={sector.id} className="space-y-4">
                        <div className="bg-slate-900 text-white px-4 py-2.5 rounded-xl border border-slate-850 flex items-center justify-between gap-4 print:bg-slate-900 print:text-white print-avoid-break-after">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                            <h4 className="text-[10px] font-black uppercase tracking-wider">
                              Plano de Ação • Setor: {sector.name}
                            </h4>
                          </div>
                        </div>

                        <div className="space-y-4">
                          {sectorRisks.map((item, idx) => {
                            return (
                              <div key={item.id} className="border border-slate-300 rounded-2xl overflow-hidden shadow-xs print:shadow-none bg-white text-slate-800 text-xs print:break-inside-avoid print:border-slate-350">
                                {/* Header do Card */}
                                <div className="bg-slate-50/50 px-6 py-4 border-b border-slate-300 flex flex-row items-center justify-between gap-3">
                                  <div className="space-y-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="text-[10px] bg-slate-800 text-white font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider">
                                        Setor: {sector.name}
                                      </span>
                                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                        Risco Associado: {item.riskName}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Badges de Gestão e Controles */}
                                  <div className="flex items-center gap-2">
                                    <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-extrabold uppercase ${getPriorityColorPrint(item.priority)}`}>
                                      Prioridade: {item.priority}
                                    </span>
                                    <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-extrabold uppercase ${getStatusColorPrint(item.status)}`}>
                                      Status: {item.status}
                                    </span>
                                  </div>
                                </div>

                                {/* Conteúdo do Card */}
                                <div className="p-6">
                                  <div className="grid grid-cols-1 md:grid-cols-12 print:grid-cols-12 gap-6 text-sm">
                                    {/* Lado Esquerdo: Ações Principais (Objetivo e Proposta) */}
                                    <div className="md:col-span-7 print:col-span-7 space-y-4">
                                      <div className="space-y-1.5">
                                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
                                          <Target className="w-3.5 h-3.5 text-slate-400" /> Objetivo Estratégico da Ação
                                        </span>
                                        <p className="text-slate-850 font-semibold bg-slate-50/50 p-3 rounded-xl border border-slate-150">
                                          {item.actionObjective || `Mitigar os impactos decorrentes de ${item.riskName}.`}
                                        </p>
                                      </div>

                                      <div className="space-y-1.5">
                                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
                                          <Shield className="w-3.5 h-3.5 text-slate-400" /> Detalhamento da Ação Proposta / Medida de Controle
                                        </span>
                                        <p className="text-slate-750 leading-relaxed bg-slate-50/50 p-3 rounded-xl border border-slate-150">
                                          {item.actionProposed || item.recommendation}
                                        </p>
                                      </div>
                                    </div>

                                    {/* Lado Direito: Atributos de Gestão/Cronograma */}
                                    <div className="md:col-span-5 print:col-span-5 bg-slate-50/30 p-4 rounded-xl border border-slate-150 space-y-3.5 text-xs print:bg-white">
                                      <div className="space-y-3">
                                        <div className="space-y-1">
                                          <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                                            <User className="w-3 h-3 text-slate-400" /> Responsável
                                          </span>
                                          <span className="font-bold text-slate-800 block">
                                            {item.responsible || "Liderança e Gestão de Pessoas"}
                                          </span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-150/60">
                                          <div className="space-y-1">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                                              <Clock className="w-3 h-3 text-slate-400" /> Prazo
                                            </span>
                                            <span className="font-extrabold text-slate-900 block bg-slate-100/80 px-2 py-0.5 rounded-md w-fit text-[11px]">
                                              {item.deadline || "Mês Corrente + 3"}
                                            </span>
                                          </div>

                                          <div className="space-y-1">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                                              <Calendar className="w-3 h-3 text-slate-400" /> Periodicidade
                                            </span>
                                            <span className="font-semibold text-slate-700 block">
                                              {item.periodicity || "Mensal"}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Indicador de Eficácia (Desmembrado e maior em largura) */}
                                  <div className="mt-4 pt-4 border-t border-slate-150 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-slate-50/40 px-4 py-3 rounded-xl border border-slate-150 print:bg-white print:border-slate-300">
                                    <div className="flex items-center gap-1.5 text-slate-500 font-extrabold uppercase text-[10px] tracking-wider shrink-0">
                                      <CheckSquare className="w-3.5 h-3.5 text-slate-400 shrink-0" /> Indicador de Eficácia Recomendado
                                    </div>
                                    <div className="font-bold text-slate-800 leading-relaxed bg-white/65 px-3 py-1 rounded-lg border border-slate-150/50 print:bg-transparent print:border-none print:p-0">
                                      {item.efficacyIndicator || "Reavaliação anual"}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  {/* Fallback for unrecognized sector actions */}
                  {report.riskInventory.filter(item => !report.sectors.some(s => s.id === item.sectorId)).length > 0 && (
                    <div className="space-y-4">
                      <div className="bg-slate-900 text-white px-4 py-2.5 rounded-xl border border-slate-850 flex items-center justify-between gap-4 print-avoid-break-after">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                          <h4 className="text-[10px] font-black uppercase tracking-wider">
                            Plano de Ação • Setor não identificado
                          </h4>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {report.riskInventory
                          .filter(item => !report.sectors.some(s => s.id === item.sectorId))
                          .map((item, idx) => {
                            return (
                              <div key={item.id} className="border border-slate-300 rounded-2xl overflow-hidden shadow-xs print:shadow-none bg-white text-slate-800 text-xs print:break-inside-avoid print:border-slate-350">
                                {/* Header do Card */}
                                <div className="bg-slate-50/50 px-6 py-4 border-b border-slate-300 flex flex-row items-center justify-between gap-3">
                                  <div className="space-y-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="text-[10px] bg-slate-800 text-white font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider">
                                        Setor: Não Identificado
                                      </span>
                                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                        Risco Associado: {item.riskName}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Badges de Gestão e Controles */}
                                  <div className="flex items-center gap-2">
                                    <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-extrabold uppercase ${getPriorityColorPrint(item.priority)}`}>
                                      Prioridade: {item.priority}
                                    </span>
                                    <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-extrabold uppercase ${getStatusColorPrint(item.status)}`}>
                                      Status: {item.status}
                                    </span>
                                  </div>
                                </div>

                                {/* Conteúdo do Card */}
                                <div className="p-6">
                                  <div className="grid grid-cols-1 md:grid-cols-12 print:grid-cols-12 gap-6 text-sm">
                                    {/* Lado Esquerdo: Ações Principais (Objetivo e Proposta) */}
                                    <div className="md:col-span-7 print:col-span-7 space-y-4">
                                      <div className="space-y-1.5">
                                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
                                          <Target className="w-3.5 h-3.5 text-slate-400" /> Objetivo Estratégico da Ação
                                        </span>
                                        <p className="text-slate-850 font-semibold bg-slate-50/50 p-3 rounded-xl border border-slate-150">
                                          {item.actionObjective || `Mitigar os impactos decorrentes de ${item.riskName}.`}
                                        </p>
                                      </div>

                                      <div className="space-y-1.5">
                                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
                                          <Shield className="w-3.5 h-3.5 text-slate-400" /> Detalhamento da Ação Proposta / Medida de Controle
                                        </span>
                                        <p className="text-slate-750 leading-relaxed bg-slate-50/50 p-3 rounded-xl border border-slate-150">
                                          {item.actionProposed || item.recommendation}
                                        </p>
                                      </div>
                                    </div>

                                    {/* Lado Direito: Atributos de Gestão/Cronograma */}
                                    <div className="md:col-span-5 print:col-span-5 bg-slate-50/30 p-4 rounded-xl border border-slate-150 space-y-3.5 text-xs print:bg-white">
                                      <div className="space-y-3">
                                        <div className="space-y-1">
                                          <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                                            <User className="w-3 h-3 text-slate-400" /> Responsável
                                          </span>
                                          <span className="font-bold text-slate-800 block">
                                            {item.responsible || "Liderança e Gestão de Pessoas"}
                                          </span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-150/60">
                                          <div className="space-y-1">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                                              <Clock className="w-3 h-3 text-slate-400" /> Prazo
                                            </span>
                                            <span className="font-extrabold text-slate-900 block bg-slate-100/80 px-2 py-0.5 rounded-md w-fit text-[11px]">
                                              {item.deadline || "Mês Corrente + 3"}
                                            </span>
                                          </div>

                                          <div className="space-y-1">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                                              <Calendar className="w-3 h-3 text-slate-400" /> Periodicidade
                                            </span>
                                            <span className="font-semibold text-slate-700 block">
                                              {item.periodicity || "Mensal"}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Indicador de Eficácia (Desmembrado e maior em largura) */}
                                  <div className="mt-4 pt-4 border-t border-slate-150 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-slate-50/40 px-4 py-3 rounded-xl border border-slate-150 print:bg-white print:border-slate-300">
                                    <div className="flex items-center gap-1.5 text-slate-500 font-extrabold uppercase text-[10px] tracking-wider shrink-0">
                                      <CheckSquare className="w-3.5 h-3.5 text-slate-400 shrink-0" /> Indicador de Eficácia Recomendado
                                    </div>
                                    <div className="font-bold text-slate-800 leading-relaxed bg-white/65 px-3 py-1 rounded-lg border border-slate-150/50 print:bg-transparent print:border-none print:p-0">
                                      {item.efficacyIndicator || "Reavaliação anual"}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-2 print:hidden">
            <h4 className="font-bold text-slate-700 text-sm">Omissão de Capítulos de Riscos</h4>
            <p className="text-xs text-slate-500 max-w-lg mx-auto">
              Como definido nas Configurações Gerais do Laudo, a empresa declarou não reconhecer riscos psicossociais nesta avaliação. Portanto, os capítulos de Inventário e Plano de Ação foram omitidos e os capítulos subsequentes foram reordenados de forma automatizada.
            </p>
          </div>
        )}

        {/* --- CAPÍTULOS PERSONALIZADOS --- */}
        {report.customChapters && report.customChapters.map((ch) => (
          <div key={ch.id} className="space-y-4 print:pt-12 page-break-before">
            {renderHeader(ch.title)}
            <h3 className="text-lg font-extrabold text-slate-900 border-b-2 border-slate-800 pb-2 uppercase tracking-wide">
              {ch.title}
            </h3>
            {renderIndentedText(ch.text)}
          </div>
        ))}

        {/* --- CAPÍTULO 8: CONSIDERAÇÕES FINAIS --- */}
        <div className="space-y-4 print:pt-12 page-break-before">
          {renderHeader("8. Considerações Finais")}
          <h3 className="text-lg font-extrabold text-slate-900 border-b-2 border-slate-800 pb-2 uppercase tracking-wide">
            {report.risksRecognized !== false ? "8. Considerações Finais" : "6. Considerações Finais"}
          </h3>
          {renderIndentedText(report.finalConsiderations)}
        </div>

        {/* --- CAPÍTULO 9: REFERÊNCIAS --- */}
        <div className="space-y-4 print:pt-12 page-break-before">
          {renderHeader("9. Referências")}
          <h3 className="text-lg font-extrabold text-slate-900 border-b-2 border-slate-800 pb-2 uppercase tracking-wide">
            {report.risksRecognized !== false ? "9. Referências Bibliográficas" : "7. Referências Bibliográficas"}
          </h3>
          <div className="text-xs font-mono">
            {renderIndentedText(report.chapters.referencias)}
          </div>
        </div>

        {/* --- ASSINATURAS DO PROFISSIONAL DE SST --- */}
        <div className="pt-20 space-y-10 print:pt-24 page-break-inside-avoid">
          <p className="text-xs text-slate-500 text-center">
            Este laudo reflete fielmente as avaliações fáticas realizadas em campo nas datas especificadas.
          </p>
          
          <div className="text-center text-xs font-bold text-slate-700 tracking-wide">
            {getEmissionDateFormatted()}
          </div>
          
          <div className="flex flex-col items-center justify-center pt-28 pb-8">
            <div className="w-64 border-t-2 border-slate-800 text-center pt-2">
              <p className="text-sm font-bold text-slate-850 uppercase">{report.professionalName || "Profissional Responsável"}</p>
              <p className="text-xs text-slate-500">{report.professionalRole}</p>
              <p className="text-xs font-semibold text-slate-400 font-mono mt-0.5">{report.professionalReg || "MTE / CREA / CRP"}</p>
            </div>
          </div>
        </div>

      </div>
      {/* --- FIM DO DOCUMENTO OFICIAL (VISUALIZAÇÃO EM TELA) --- */}

      {/* --- INÍCIO DO DOCUMENTO OFICIAL (VERSÃO EXCLUSIVA DE IMPRESSÃO) --- */}
      {/* Esta seção é totalmente oculta na tela (print:hidden) mas ativada e impressa perfeitamente na folha A4 (print:block) */}
      <div className="hidden print:block font-sans text-black leading-relaxed max-w-full print:p-0 text-sm space-y-10" style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" } as any}>
        
        {/* 1. CAPA */}
        {(report.coverImage || assessor.defaultCoverImage) ? (
          <div className="h-screen flex flex-col justify-center items-center page-break-after">
            <img 
              src={report.coverImage || assessor.defaultCoverImage} 
              alt="Capa" 
              className="max-h-[92vh] max-w-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
        ) : (
          <div className="h-screen flex flex-col justify-between py-12 page-break-after">
            <div className="border-b-2 border-black pb-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block">PROGRAMA DE SAÚDE E SEGURANÇA DO TRABALHO</span>
              <span className="text-base font-bold text-black leading-none uppercase">LAUDO TÉCNICO DE FATORES DE RISCOS PSICOSSOCIAIS</span>
            </div>
            
            <div className="text-center py-16 space-y-6">
              <h1 className="text-2xl font-bold text-black uppercase tracking-tight leading-tight">
                Relatório de Avaliação e Conclusão
              </h1>
              <h2 className="text-base font-bold text-slate-700 uppercase">
                Metodologia COPSOQ II – BR
              </h2>
              <div className="w-16 h-0.5 bg-black mx-auto my-4" />
              <h3 className="text-lg font-bold text-black uppercase leading-snug">
                {report.companyFantasyName ? `${report.companyName} (${report.companyFantasyName})` : (report.companyName || "[NOME DA EMPRESA]")}
              </h3>
              {report.cnpj && <p className="text-sm font-mono text-slate-700">CNPJ: {report.cnpj}</p>}
            </div>

            <div className="border border-slate-400 p-6 rounded space-y-4 text-[11px]">
              <h4 className="font-bold border-b border-slate-300 pb-1.5 uppercase tracking-wider text-slate-700">Identificação Técnica e de Escopo</h4>
              <div className="grid grid-cols-2 gap-y-3 gap-x-6">
                <div><span className="text-slate-500 font-medium block">Responsável Técnico:</span> <strong className="text-black">{report.professionalName || "Não cadastrado"}</strong></div>
                <div><span className="text-slate-500 font-medium block">Cargo/Registro:</span> <strong className="text-black">{report.professionalRole} - {report.professionalReg || "-"}</strong></div>
                <div><span className="text-slate-500 font-medium block">Período de Campo:</span> <strong className="text-black">{formatDate(report.dateStart)} a {formatDate(report.dateEnd)}</strong></div>
                <div><span className="text-slate-500 font-medium block">Setores Avaliados:</span> <strong className="text-black">{report.sectors.length} setores</strong></div>
                {report.companyCnae && <div><span className="text-slate-500 font-medium block">CNAE Principal:</span> <strong className="text-black">{report.companyCnae}</strong></div>}
                {report.companyRiskDegree && <div><span className="text-slate-500 font-medium block">Grau de Risco:</span> <strong className="text-black">Grau {report.companyRiskDegree}</strong></div>}
              </div>
            </div>
          </div>
        )}

        {/* 2. DADOS CADASTRAIS E ESCOPO */}
        {(() => {
          const totalEmployees = report.sectors.reduce((sum, s) => sum + (s.employeeCount || 0), 0);
          const totalRespondents = report.sectors.reduce((sum, s) => sum + (s.respondentsCount || 0), 0);
          const totalResponseRate = totalEmployees > 0 ? Math.round((totalRespondents / totalEmployees) * 100) : 0;

          return (
            <div className="page-break-before page-break-after space-y-6">
              <div className="border-b border-slate-300 pb-2 mb-4">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Capítulo 0</span>
                <h2 className="text-base font-bold text-black uppercase">Dados Cadastrais e Escopo da Avaliação</h2>
              </div>

              <div className="border border-slate-300 rounded p-4 space-y-4">
                <h3 className="font-bold border-b border-slate-200 pb-1 text-xs uppercase text-slate-800">Identificação da Empresa Cliente</h3>
                <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-xs">
                  <div><span className="text-slate-500 block">Razão Social:</span> <strong className="text-black">{report.companyName || "-"}</strong></div>
                  <div><span className="text-slate-500 block">Nome Fantasia:</span> <strong className="text-black">{report.companyFantasyName || "-"}</strong></div>
                  <div><span className="text-slate-500 block">CNPJ:</span> <strong className="text-black font-mono">{report.cnpj || "-"}</strong></div>
                  <div><span className="text-slate-500 block">Atividade / CNAE:</span> <strong className="text-black">{report.companyCnae ? `${report.companyCnae} - ${report.companySector || ""}` : (report.companySector || "-")}</strong></div>
                  <div className="col-span-2"><span className="text-slate-500 block">Endereço:</span> <strong className="text-black">{getCompanyFullAddress() || "-"}</strong></div>
                </div>
              </div>

              <div className="border border-slate-300 rounded p-4 space-y-3">
                <h3 className="font-bold border-b border-slate-200 pb-1 text-xs uppercase text-slate-800">Indicadores de Amostragem (GHE)</h3>
                <div className="grid grid-cols-3 gap-4 text-center text-xs">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                    <span className="text-slate-500 block text-[10px] uppercase">Funcionários Ativos</span>
                    <strong className="text-black text-lg font-mono">{totalEmployees}</strong>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                    <span className="text-slate-500 block text-[10px] uppercase">Setores Mapeados</span>
                    <strong className="text-black text-lg font-mono">{report.sectors.length}</strong>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                    <span className="text-slate-500 block text-[10px] uppercase">Taxa de Resposta</span>
                    <strong className="text-black text-lg font-mono">{totalResponseRate}% ({totalRespondents} resp.)</strong>
                  </div>
                </div>
              </div>

              <div className="border border-slate-300 rounded p-4 space-y-2">
                <h3 className="font-bold border-b border-slate-200 pb-1 text-xs uppercase text-slate-800">Detalhamento Setorial</h3>
                <div className="grid grid-cols-1 gap-1.5 text-xs">
                  {report.sectors.map((s) => (
                    <div key={s.id} className="flex justify-between border-b border-slate-100 pb-1">
                      <span className="font-medium text-slate-700">{s.name}</span>
                      <span className="font-mono text-slate-800">
                        {s.respondentsCount || 0} de {s.employeeCount || 0} func. ({s.employeeCount > 0 ? Math.round(((s.respondentsCount || 0) / s.employeeCount) * 100) : 0}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}

        {/* 3. SUMÁRIO */}
        <div className="page-break-before page-break-after space-y-6">
          <div className="border-b border-slate-300 pb-2 mb-4 text-center">
            <h2 className="text-base font-bold text-black uppercase">Sumário Geral</h2>
          </div>
          <div className="max-w-xl mx-auto space-y-3.5 text-xs">
            <div className="flex justify-between"><span>1. INTRODUÇÃO</span> <span className="font-mono">03</span></div>
            <div className="flex justify-between"><span>2. FUNDAMENTAÇÃO TEÓRICA</span> <span className="font-mono">04</span></div>
            <div className="flex justify-between"><span>3. METODOLOGIA DE AVALIAÇÃO</span> <span className="font-mono">05</span></div>
            <div className="flex justify-between pl-3 text-slate-600"><span>• Dimensões do COPSOQ II</span> <span className="font-mono">05</span></div>
            <div className="flex justify-between pl-3 text-slate-600"><span>• Escalas de Classificação</span> <span className="font-mono">05</span></div>
            
            <div className="flex justify-between font-bold"><span>4. APRESENTAÇÃO DOS RESULTADOS</span> <span className="font-mono">06</span></div>
            {report.sectors.map((sector, idx) => (
              <div key={sector.id} className="flex justify-between pl-3 text-slate-600">
                <span>4.{idx + 1}. Setor: {sector.name}</span> <span className="font-mono">06</span>
              </div>
            ))}

            <div className="flex justify-between font-bold"><span>5. ANÁLISE TÉCNICA E DEVOLUTIVAS</span> <span className="font-mono">07</span></div>
            {report.sectors.map((sector, idx) => (
              <div key={sector.id} className="flex justify-between pl-3 text-slate-600">
                <span>5.{idx + 1}. Diagnóstico: {sector.name}</span> <span className="font-mono">07</span>
              </div>
            ))}

            {report.risksRecognized !== false && (
              <>
                <div className="flex justify-between font-bold"><span>6. INVENTÁRIO DE RISCOS PSICOSSOCIAIS</span> <span className="font-mono">08</span></div>
                <div className="flex justify-between font-bold"><span>7. CRONOGRAMA E PLANO DE AÇÃO</span> <span className="font-mono">09</span></div>
              </>
            )}

            <div className="flex justify-between"><span>{report.risksRecognized !== false ? "8" : "6"}. CONSIDERAÇÕES FINAIS</span> <span className="font-mono">10</span></div>
            <div className="flex justify-between"><span>{report.risksRecognized !== false ? "9" : "7"}. REFERÊNCIAS BIBLIOGRÁFICAS</span> <span className="font-mono">11</span></div>
          </div>
        </div>

        {/* 4. CAPÍTULO 1: INTRODUÇÃO */}
        <div className="page-break-before space-y-3">
          <div className="border-b border-slate-300 pb-1">
            <h3 className="text-sm font-bold text-black uppercase">1. Introdução</h3>
          </div>
          {renderIndentedText(report.chapters.introducao)}
        </div>

        {/* 5. CAPÍTULO 2: FUNDAMENTAÇÃO TEÓRICA */}
        <div className="page-break-before space-y-3">
          <div className="border-b border-slate-300 pb-1">
            <h3 className="text-sm font-bold text-black uppercase">2. Fundamentação Teórica</h3>
          </div>
          {renderIndentedText(report.chapters.fundamentacao)}
        </div>

        {/* 6. CAPÍTULO 3: METODOLOGIA DE AVALIAÇÃO */}
        <div className="page-break-before space-y-3">
          <div className="border-b border-slate-300 pb-1">
            <h3 className="text-sm font-bold text-black uppercase">3. Metodologia de Avaliação</h3>
          </div>
          {renderIndentedText(report.chapters.metodologia)}
        </div>

        {/* 7. CAPÍTULO 4: APRESENTAÇÃO DOS RESULTADOS */}
        <div className="page-break-before space-y-4">
          <div className="border-b border-slate-300 pb-1">
            <h3 className="text-sm font-bold text-black uppercase">4. Apresentação dos Resultados (Médias Setoriais)</h3>
          </div>
          <p className="text-xs text-slate-700">
            Abaixo estão os resultados consolidados obtidos na escala de 0,00 a 4,00 pontos para as dimensões psicossociais avaliadas pelo COPSOQ II.
          </p>

          {report.sectors.length === 0 ? (
            <p className="text-xs text-slate-500 italic">Nenhum setor cadastrado.</p>
          ) : (
            <div className="space-y-6">
              {report.sectors.map((sector) => (
                <div key={sector.id} className="space-y-2 page-break-inside-avoid">
                  <div className="bg-slate-100 p-2 border-b border-slate-400 flex justify-between font-bold text-xs uppercase">
                    <span>Setor: {sector.name}</span>
                    <span>Colaboradores no GHE: {sector.employeeCount} ({sector.respondentsCount || 0} respondentes)</span>
                  </div>

                  <table className="w-full border-collapse border border-slate-400 text-xs text-left">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-400 text-black font-bold">
                        <th className="p-1.5 border border-slate-400">Dimensão do COPSOQ II</th>
                        <th className="p-1.5 border border-slate-400 text-center w-24">Natureza</th>
                        <th className="p-1.5 border border-slate-400 text-center w-20">Média</th>
                        <th className="p-1.5 border border-slate-400 text-center w-28">Classificação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {COPSOQ_DIMENSIONS.map((dim) => {
                        const score = sector.scores[dim.key] ?? 0;
                        const ratingInfo = getDimensionRating(score, dim.type);
                        
                        let printRatingStyle = "text-slate-800 font-bold";
                        if (ratingInfo.rating === "Desfavorável") printRatingStyle = "text-red-850 font-extrabold";
                        if (ratingInfo.rating === "Moderada") printRatingStyle = "text-amber-850 font-bold";
                        if (ratingInfo.rating === "Favorável") printRatingStyle = "text-emerald-850 font-bold";

                        return (
                          <tr key={dim.key} className="border-b border-slate-300">
                            <td className="p-1.5 border border-slate-300">{dim.name}</td>
                            <td className="p-1.5 border border-slate-300 text-center uppercase text-[9px] text-slate-500">
                              {dim.type === "positive" ? "Positiva" : "Negativa"}
                            </td>
                            <td className="p-1.5 border border-slate-300 text-center font-bold font-mono">
                              {score === 0 ? "N/A" : score.toFixed(2)}
                            </td>
                            <td className={`p-1.5 border border-slate-300 text-center uppercase text-[9px] ${printRatingStyle}`}>
                              {ratingInfo.rating}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {sector.generalAnalysis && (
                    <div className="p-2 border-l-2 border-slate-500 bg-slate-50 text-[11px] text-justify">
                      <strong>Análise Geral do Setor:</strong> <span className="italic">{sector.generalAnalysis}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 8. CAPÍTULO 5: ANÁLISE TÉCNICA E DEVOLUTIVAS */}
        <div className="page-break-before space-y-4">
          <div className="border-b border-slate-300 pb-1">
            <h3 className="text-sm font-bold text-black uppercase">5. Análise de Campo e Devolutivas</h3>
          </div>
          <p className="text-xs text-slate-700">
            Abaixo estão sintetizadas as considerações qualitativas decorrentes das devolutivas e investigações in loco junto a lideranças setoriais.
          </p>

          {report.sectors.map((sector) => {
            const critical = COPSOQ_DIMENSIONS.map((d) => {
              const score = sector.scores[d.key] ?? 0.0;
              const rat = getDimensionRating(score, d.type);
              return { name: d.name, score, rating: rat.rating };
            }).filter((d) => d.rating !== "Favorável" && d.rating !== "Não Avaliado" && d.score > 0);

            return (
              <div key={sector.id} className="border border-slate-300 p-3 rounded space-y-2 page-break-inside-avoid">
                <h4 className="font-bold text-xs uppercase text-black">Setor: {sector.name}</h4>
                <div className="text-[10px] flex flex-wrap gap-1">
                  <span className="font-bold text-slate-600 uppercase">Alertas Ativos:</span>
                  {critical.length === 0 ? (
                    <span className="text-emerald-800">Nenhum desvio detectado</span>
                  ) : (
                    critical.map((c, i) => (
                      <span key={i} className="text-slate-800 font-bold border border-slate-300 px-1 rounded bg-slate-50">
                        {c.name} ({c.score.toFixed(2)} - {c.rating})
                      </span>
                    ))
                  )}
                </div>
                <div className="text-xs text-justify leading-relaxed whitespace-pre-wrap pt-1 text-slate-800">
                  {sector.devolvedSynthesis || "Investigação qualitativa não preenchida."}
                </div>
              </div>
            );
          })}
        </div>

        {/* 9. CAPÍTULO 6: INVENTÁRIO DE RISCOS (GRO) */}
        {report.risksRecognized !== false && (
          <div className="page-break-before space-y-4">
            <div className="border-b border-slate-300 pb-1">
              <h3 className="text-sm font-bold text-black uppercase">6. Inventário de Riscos Psicossociais (GRO / NR-01)</h3>
            </div>
            <p className="text-xs text-slate-700">
              Inventário sistemático de perigos e riscos psicossociais organizacionais mapeados, com a devida quantificação de Probabilidade (P) e Severidade (S) sob a Matriz 5x5.
            </p>

            {report.riskInventory.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-4 text-center border border-dashed rounded">Nenhum risco no inventário.</p>
            ) : (
              <div className="space-y-4">
                {report.sectors.map((sector) => {
                  const sectorRisks = report.riskInventory.filter(r => r.sectorId === sector.id);
                  if (sectorRisks.length === 0) return null;

                  return (
                    <div key={sector.id} className="space-y-3">
                      <div className="bg-black text-white p-2 font-bold text-xs uppercase rounded-sm">
                        Setor / GHE: {sector.name} ({sector.employeeCount || 0} expostos)
                      </div>

                      <div className="space-y-3">
                        {sectorRisks.map((item) => {
                          let labelColor = "text-blue-800";
                          if (item.color === "red") labelColor = "text-red-650 font-extrabold";
                          if (item.color === "orange") labelColor = "text-orange-650 font-bold";
                          if (item.color === "yellow") labelColor = "text-yellow-650 font-bold";
                          if (item.color === "green") labelColor = "text-emerald-650";

                          return (
                            <div key={item.id} className="border border-slate-400 rounded p-3 bg-white space-y-1.5 text-xs page-break-inside-avoid">
                              <div className="border-b border-slate-200 pb-1 flex justify-between font-bold">
                                <span className="text-black uppercase">Risco: {item.riskName}</span>
                                <span className={labelColor}>Nível {item.riskLevel} (Score {item.riskScore})</span>
                              </div>
                              <div className="grid grid-cols-2 gap-x-4 text-[11px] text-slate-800">
                                <p><strong>Expostos:</strong> {item.exposedCount} trabalhadores</p>
                                <p><strong>Frequência:</strong> Contínua / Habitual</p>
                              </div>
                              <div className="text-[11px] text-slate-800 space-y-1">
                                <p className="leading-normal"><strong>Perigos / Fontes:</strong> {item.sourcesField || "Não cadastrado"}</p>
                                <p className="leading-normal"><strong>Controles Existentes:</strong> {item.existingControls || "Não evidenciado"}</p>
                                <p className="leading-normal"><strong>Possíveis Danos:</strong> {item.possibleInjuries || "Não cadastrado"}</p>
                                {item.diseaseHistory && <p className="leading-normal"><strong>Histórico de Doenças / Queixas:</strong> {item.diseaseHistory}</p>}
                                <p className="pt-1.5 leading-normal border-t border-slate-100">
                                  <strong>Avaliação 5x5:</strong> Probabilidade (P{item.probability}) x Severidade (S{item.severity}) = Score {item.riskScore} ({getLevelEmoji(item.riskLevel)} {item.riskLevel}) | Estimativa: {item.uncertainty || "Certa"}
                                </p>
                                <p className="mt-1 leading-normal p-1.5 bg-slate-50 border-l-2 border-slate-500 font-medium">
                                  <strong>Preventiva PGR:</strong> "{item.recommendation}"
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 10. CAPÍTULO 7: CRONOGRAMA E PLANO DE AÇÃO */}
        {report.risksRecognized !== false && (
          <div className="page-break-before space-y-4">
            <div className="border-b border-slate-300 pb-1">
              <h3 className="text-sm font-bold text-black uppercase">7. Cronograma e Plano de Ação</h3>
            </div>
            <p className="text-xs text-slate-700">
              Plano de ação estabelecido para o controle e mitigação dos riscos mapeados, alinhado às metas e prioridades organizacionais.
            </p>

            {report.riskInventory.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-4 text-center border border-dashed rounded">Nenhuma ação registrada.</p>
            ) : (
              <div className="space-y-4">
                {report.sectors.map((sector) => {
                  const sectorRisks = report.riskInventory.filter(r => r.sectorId === sector.id);
                  if (sectorRisks.length === 0) return null;

                  return (
                    <div key={sector.id} className="space-y-3">
                      <div className="bg-slate-100 border-b-2 border-slate-400 p-2 font-bold text-xs uppercase flex justify-between">
                        <span>Ações do Setor: {sector.name}</span>
                      </div>

                      <div className="space-y-3">
                        {sectorRisks.map((item) => (
                          <div key={item.id} className="border border-slate-400 rounded p-3 bg-white space-y-2 text-xs page-break-inside-avoid">
                            <div className="border-b border-slate-200 pb-1 flex justify-between font-bold text-[11px]">
                              <span className="text-slate-700 font-bold">Risco Associado: {item.riskName}</span>
                              <span className="text-slate-800">Prioridade: {item.priority} | Status: {item.status}</span>
                            </div>
                            <div className="space-y-1 text-[11px] text-slate-800">
                              <p><strong>Objetivo Estratégico:</strong> {item.actionObjective || `Mitigar os impactos decorrentes de ${item.riskName}.`}</p>
                              <p><strong>Detalhamento da Ação:</strong> {item.actionProposed || item.recommendation}</p>
                              <div className="grid grid-cols-3 gap-2 pt-1.5 border-t border-slate-100 text-[10px]">
                                <p><strong>Responsável:</strong> {item.responsible || "RH / Liderança"}</p>
                                <p><strong>Prazo:</strong> {item.deadline || "Mês Corrente + 3"}</p>
                                <p><strong>Periodicidade:</strong> {item.periodicity || "Mensal"}</p>
                              </div>
                              <p className="pt-1 bg-slate-50/50 p-1 rounded border border-slate-200 text-[10px]">
                                <strong>Indicador de Eficácia:</strong> {item.efficacyIndicator || "Reavaliação anual"}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 11. CAPÍTULOS PERSONALIZADOS */}
        {report.customChapters && report.customChapters.map((ch) => (
          <div key={ch.id} className="page-break-before space-y-3">
            <div className="border-b border-slate-300 pb-1">
              <h3 className="text-sm font-bold text-black uppercase">{ch.title}</h3>
            </div>
            {renderIndentedText(ch.text)}
          </div>
        ))}

        {/* 12. CAPÍTULO 8: CONSIDERAÇÕES FINAIS */}
        <div className="page-break-before space-y-3">
          <div className="border-b border-slate-300 pb-1">
            <h3 className="text-sm font-bold text-black uppercase">
              {report.risksRecognized !== false ? "8. Considerações Finais" : "6. Considerações Finais"}
            </h3>
          </div>
          {renderIndentedText(report.finalConsiderations)}
        </div>

        {/* 13. CAPÍTULO 9: REFERÊNCIAS */}
        <div className="page-break-before space-y-3">
          <div className="border-b border-slate-300 pb-1">
            <h3 className="text-sm font-bold text-black uppercase">
              {report.risksRecognized !== false ? "9. Referências Bibliográficas" : "7. Referências Bibliográficas"}
            </h3>
          </div>
          <div className="text-xs font-mono">
            {renderIndentedText(report.chapters.referencias)}
          </div>
        </div>

        {/* 14. ASSINATURAS DO PROFISSIONAL */}
        <div className="pt-16 space-y-8 page-break-inside-avoid">
          <p className="text-center text-slate-500 text-xs">
            Este laudo reflete fielmente as avaliações fáticas realizadas em campo nas datas especificadas.
          </p>
          
          <div className="text-center font-bold text-xs text-black">
            {getEmissionDateFormatted()}
          </div>
          
          <div className="flex flex-col items-center justify-center pt-20">
            <div className="w-64 border-t border-black text-center pt-1 text-xs">
              <p className="font-bold text-black uppercase">{report.professionalName || "Profissional Responsável"}</p>
              <p className="text-slate-600">{report.professionalRole}</p>
              <p className="font-mono text-slate-500">{report.professionalReg || "MTE / CREA / CRP"}</p>
            </div>
          </div>
        </div>

      </div>
      {/* --- FIM DO DOCUMENTO OFICIAL (VERSÃO EXCLUSIVA DE IMPRESSÃO) --- */}
    </div>
  );
};
