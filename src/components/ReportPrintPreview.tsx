/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Report, COPSOQ_DIMENSIONS, getDimensionRating } from "../types";
import { Printer, ShieldAlert, Calendar, User, FileText, ChevronRight, Activity } from "lucide-react";
import { getMatrixCell, getColorClass } from "../matrixUtils";

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

  const handlePrint = () => {
    window.print();
  };

  const renderHeader = (chapterTitle: string) => (
    <div className="border-b border-slate-200 pb-3 mb-6 flex items-center justify-between gap-4 print:flex">
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

      {/* --- INÍCIO DO DOCUMENTO OFICIAL --- */}
      <div className="bg-white p-8 sm:p-16 border border-slate-200 shadow-sm rounded-2xl mx-auto max-w-[900px] font-sans text-slate-800 print:border-none print:shadow-none print:p-0 leading-relaxed space-y-12">
        
        {/* --- CAPA (Capa do Relatório) --- */}
        {report.coverImage ? (
          <div className="min-h-[1050px] print:h-screen print:min-h-0 flex flex-col justify-center items-center pb-16 print:pb-0 page-break-after">
            <div className="w-full h-full max-h-[1000px] flex items-center justify-center">
              <img 
                src={report.coverImage} 
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
                {report.companyName || "[NOME DA EMPRESA NÃO INFORMADO]"}
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
              </div>
              {report.companyAddress && (
                <div className="text-xs pt-2 border-t border-slate-200">
                  <span className="text-slate-400 block font-medium">Endereço Completo:</span>
                  <span className="font-bold text-slate-800">{report.companyAddress}</span>
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
                <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-200 text-xs text-left space-y-4">
                  <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-wider border-b border-slate-200 pb-2">Informações de Registro</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <span className="text-slate-400 block font-semibold text-[9px] uppercase tracking-wider">Razão Social:</span>
                      <span className="font-extrabold text-slate-800 text-sm leading-tight block">{report.companyName || "-"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-semibold text-[9px] uppercase tracking-wider">CNPJ:</span>
                      <span className="font-extrabold text-slate-800 font-mono text-sm block">{report.cnpj || "-"}</span>
                    </div>
                    {report.companyCnae && (
                      <div>
                        <span className="text-slate-400 block font-semibold text-[9px] uppercase tracking-wider">CNAE Principal:</span>
                        <span className="font-bold text-slate-800 block">{report.companyCnae}</span>
                      </div>
                    )}
                    {report.companyRiskDegree && (
                      <div>
                        <span className="text-slate-400 block font-semibold text-[9px] uppercase tracking-wider">Grau de Risco (SST):</span>
                        <span className="font-bold text-slate-800 block">Grau {report.companyRiskDegree}</span>
                      </div>
                    )}
                    {report.companyAddress && (
                      <div className="sm:col-span-2 border-t border-slate-200/60 pt-2 mt-1">
                        <span className="text-slate-400 block font-semibold text-[9px] uppercase tracking-wider">Endereço Completo:</span>
                        <span className="font-bold text-slate-800 block">{report.companyAddress}</span>
                      </div>
                    )}
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

        {/* --- CAPÍTULO 1: INTRODUÇÃO --- */}
        <div className="space-y-4 print:pt-12 page-break-before">
          {renderHeader("1. Introdução")}
          <h3 className="text-lg font-extrabold text-slate-900 border-b-2 border-slate-800 pb-2 uppercase tracking-wide">
            1. Introdução
          </h3>
          <p className="text-sm whitespace-pre-wrap text-slate-700 leading-relaxed text-justify">
            {report.chapters.introducao}
          </p>
        </div>

        {/* --- CAPÍTULO 2: FUNDAMENTAÇÃO --- */}
        <div className="space-y-4 print:pt-12 page-break-before">
          {renderHeader("2. Fundamentação Teórica")}
          <h3 className="text-lg font-extrabold text-slate-900 border-b-2 border-slate-800 pb-2 uppercase tracking-wide">
            2. Fundamentação Teórica e Metodológica
          </h3>
          <p className="text-sm whitespace-pre-wrap text-slate-700 leading-relaxed text-justify">
            {report.chapters.fundamentacao}
          </p>
        </div>

        {/* --- CAPÍTULO 3: METODOLOGIA --- */}
        <div className="space-y-4 print:pt-12 page-break-before">
          {renderHeader("3. Metodologia de Avaliação")}
          <h3 className="text-lg font-extrabold text-slate-900 border-b-2 border-slate-800 pb-2 uppercase tracking-wide">
            3. Metodologia de Avaliação
          </h3>
          <p className="text-sm whitespace-pre-wrap text-slate-700 leading-relaxed text-justify">
            {report.chapters.metodologia}
          </p>
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
                6. Inventário de Riscos Psicossociais (NR-01 / GRO)
              </h3>
              <p className="text-sm text-slate-700">
                Abaixo estão estruturados de forma sistemática os riscos psicossociais evidenciados em campo, incluindo as fontes geradoras, as populações expostas, as medidas preventivas existentes e a respectiva avaliação de severidade e probabilidade através da matriz 5x5.
              </p>

              {report.riskInventory.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-6 text-center border border-dashed rounded-lg">
                  Nenhum risco registrado no inventário.
                </p>
              ) : (
                <div className="space-y-8 print:space-y-12">
                  {report.riskInventory.map((item) => (
                    <div
                      key={item.id}
                      className="p-6 border-2 border-slate-300 rounded-2xl bg-white space-y-5 print:p-6 print:border-2 print:border-slate-400 print:rounded-xl print:break-inside-avoid print:page-break-inside-avoid shadow-xs"
                    >
                      {/* Cabeçalho da Ficha */}
                      <div className="border-b-2 border-slate-200 pb-3 flex flex-col gap-1.5">
                        <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">
                          Ficha Técnica • Inventário de Risco Psicossocial
                        </span>
                        <h4 className="text-base font-black text-slate-900 uppercase tracking-tight">
                          {item.riskName}
                        </h4>
                      </div>

                      {/* Informações de Localização */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 print:bg-white print:border print:border-slate-200 print:p-4 text-xs">
                        <div>
                          <span className="font-extrabold text-slate-900 uppercase text-[9px] block mb-0.5 tracking-wider">Setor Avaliado:</span>
                          <span className="text-slate-700 font-medium text-justify block">{getSectorName(item.sectorId)}</span>
                        </div>
                        <div>
                          <span className="font-extrabold text-slate-900 uppercase text-[9px] block mb-0.5 tracking-wider">Trabalhadores Expostos (GHE):</span>
                          <span className="text-slate-700 font-medium text-justify block">{item.exposedCount} funcionários</span>
                        </div>
                        <div>
                          <span className="font-extrabold text-slate-900 uppercase text-[9px] block mb-0.5 tracking-wider">Exposição:</span>
                          <span className="text-slate-700 font-bold text-justify block">Contínua / Habitual</span>
                        </div>
                      </div>

                      {/* Corpo Detalhado */}
                      <div className="space-y-4 text-xs">
                        {/* Fonte Geradora */}
                        <div className="space-y-1">
                          <span className="font-extrabold text-slate-900 uppercase text-[9px] block tracking-widest text-slate-500">Fonte Geradora / Situação de Trabalho:</span>
                          <div className="bg-slate-50/50 p-3 rounded-lg border border-slate-100/80 print:bg-white print:border-none print:p-0">
                            {renderAsList(item.sourcesField)}
                          </div>
                        </div>

                        {/* Danos Possíveis */}
                        <div className="space-y-1">
                          <span className="font-extrabold text-slate-900 uppercase text-[9px] block tracking-widest text-slate-500">Danos Possíveis / Agravos à Saúde:</span>
                          <div className="bg-slate-50/50 p-3 rounded-lg border border-slate-100/80 print:bg-white print:border-none print:p-0">
                            {renderAsList(item.possibleInjuries)}
                          </div>
                        </div>

                        {/* Histórico */}
                        <div className="space-y-1">
                          <span className="font-extrabold text-slate-900 uppercase text-[9px] block tracking-widest text-slate-500">Histórico de Doenças / Queixas de Adoecimento:</span>
                          <div className="bg-slate-50/50 p-3 rounded-lg border border-slate-100/80 print:bg-white print:border-none print:p-0">
                            {renderAsList(item.diseaseHistory)}
                          </div>
                        </div>

                        {/* Controles Existentes */}
                        <div className="space-y-1">
                          <span className="font-extrabold text-slate-900 uppercase text-[9px] block tracking-widest text-slate-500">Controles Existentes / Medidas Adotadas:</span>
                          <div className="bg-slate-50/50 p-3 rounded-lg border border-slate-100/80 print:bg-white print:border-none print:p-0">
                            {renderAsList(item.existingControls)}
                          </div>
                        </div>

                        {/* Recomendações Preventivas */}
                        <div className="space-y-1">
                          <span className="font-extrabold text-slate-900 uppercase text-[9px] block tracking-widest text-slate-500">Recomendações Preventivas / Medidas Propostas:</span>
                          <div className="bg-slate-50/50 p-3 rounded-lg border border-slate-100/80 print:bg-white print:border-none print:p-0">
                            {renderAsList(item.recommendation)}
                          </div>
                        </div>

                        {/* Responsável e Prazo */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-200 pt-3 text-xs">
                          <div>
                            <span className="font-extrabold text-slate-900 uppercase text-[9px] block mb-0.5 tracking-wider">Responsável pela Implantação:</span>
                            <span className="text-slate-700 font-semibold">{item.responsible || "Liderança / Gestores"}</span>
                          </div>
                          <div>
                            <span className="font-extrabold text-slate-900 uppercase text-[9px] block mb-0.5 tracking-wider">Prazo de Execução:</span>
                            <span className="text-slate-700 font-extrabold font-mono">{item.deadline}</span>
                          </div>
                        </div>
                      </div>

                      {/* Matriz de Avaliação de Risco */}
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mt-2 print:bg-white print:border-slate-300 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="grid grid-cols-3 gap-4 flex-1 max-w-md">
                          <div className="space-y-1 text-center sm:text-left">
                            <span className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider">Probabilidade</span>
                            <div className="text-lg font-mono font-black text-slate-800 flex items-baseline justify-center sm:justify-start gap-0.5">
                              <span>{item.probability}</span>
                              <span className="text-[10px] font-normal text-slate-400">/ 5</span>
                            </div>
                          </div>
                          <div className="space-y-1 border-l border-slate-200 pl-4 text-center sm:text-left">
                            <span className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider">Severidade</span>
                            <div className="text-lg font-mono font-black text-slate-800 flex items-baseline justify-center sm:justify-start gap-0.5">
                              <span>{item.severity}</span>
                              <span className="text-[10px] font-normal text-slate-400">/ 5</span>
                            </div>
                          </div>
                          <div className="space-y-1 border-l border-slate-200 pl-4 text-center sm:text-left">
                            <span className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider">Resultado (Sc)</span>
                            <div className="text-lg font-mono font-black text-slate-800">
                              {item.riskScore}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-center md:items-end justify-center border-t border-slate-200 md:border-none pt-3 md:pt-0">
                          <span className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider mb-1 block">Classificação Final do Risco</span>
                          <div className={`px-4 py-1.5 rounded-lg border font-black text-[10px] uppercase tracking-wider flex items-center shadow-2xs ${getRiskBadgeStyle(item.color)}`}>
                            <span>Nível {item.riskLevel === "Grave" ? "Crítico" : item.riskLevel.toUpperCase()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* --- CAPÍTULO 7: PLANO DE AÇÃO --- */}
            <div className="space-y-4 print:pt-12 page-break-before">
              {renderHeader("7. Cronograma e Plano de Ação")}
              <h3 className="text-lg font-extrabold text-slate-900 border-b-2 border-slate-800 pb-2 uppercase tracking-wide">
                7. Cronograma e Plano de Ação Preventivo (SST)
              </h3>
              <p className="text-sm text-slate-700">
                Com base no inventário técnico de riscos psicossociais, estabeleceram-se as seguintes ações integradas com objetivo, responsáveis, prioridade, prazos e indicadores de eficácia, conforme as diretrizes do PGR.
              </p>

              {report.riskInventory.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-6 text-center border border-dashed rounded-lg">
                  Nenhum plano de ação registrado.
                </p>
              ) : (
                <div className="space-y-8 print:space-y-12">
                  {report.riskInventory.map((item) => (
                    <div
                      key={item.id}
                      className="p-6 border-2 border-slate-300 rounded-2xl bg-white space-y-5 print:p-6 print:border-2 print:border-slate-400 print:rounded-xl print:break-inside-avoid print:page-break-inside-avoid shadow-xs"
                    >
                      {/* Cabeçalho do Card de Plano de Ação */}
                      <div className="border-b-2 border-slate-200 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">
                            Ficha de Plano de Ação Preventivo • PGR
                          </span>
                          <h4 className="text-base font-black text-slate-900 uppercase tracking-tight">
                            {item.riskName}
                          </h4>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <span className={`px-2 py-1 rounded-md border text-[8px] font-black uppercase tracking-wider ${getPriorityColorPrint(item.priority)}`}>
                            Prioridade {item.priority}
                          </span>
                          <span className={`px-2 py-1 rounded-md border text-[8px] font-black uppercase tracking-wider ${getStatusColorPrint(item.status)}`}>
                            {item.status}
                          </span>
                        </div>
                      </div>

                      {/* Informações de Localização */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 print:bg-white print:border print:border-slate-200 print:p-4 text-xs">
                        <div>
                          <span className="font-extrabold text-slate-900 uppercase text-[9px] block mb-0.5 tracking-wider">Setor Beneficiado:</span>
                          <span className="text-slate-700 font-semibold">{getSectorName(item.sectorId)}</span>
                        </div>
                        <div>
                          <span className="font-extrabold text-slate-900 uppercase text-[9px] block mb-0.5 tracking-wider">Prazo de Conclusão:</span>
                          <span className="text-slate-700 font-extrabold font-mono text-justify">{item.deadline || "Imediato"}</span>
                        </div>
                        <div>
                          <span className="font-extrabold text-slate-900 uppercase text-[9px] block mb-0.5 tracking-wider">Periodicidade de Controle:</span>
                          <span className="text-slate-700 font-semibold">{item.periodicity || "Mensal"}</span>
                        </div>
                      </div>

                      {/* Corpo Detalhado */}
                      <div className="space-y-4 text-xs">
                        {/* Objetivo Específico */}
                        <div className="space-y-1">
                          <span className="font-extrabold text-slate-900 uppercase text-[9px] block tracking-widest text-slate-500">Objetivo Específico:</span>
                          <div className="bg-slate-50/50 p-3 rounded-lg border border-slate-100/80 print:bg-white print:border-none print:p-0">
                            <p className="text-slate-700 leading-relaxed text-justify">
                              {item.actionObjective || `Mitigar os fatores de risco e neutralizar os agentes causadores de desvios psicossociais no setor.`}
                            </p>
                          </div>
                        </div>

                        {/* Medidas de Intervenção Recomendadas */}
                        <div className="space-y-1">
                          <span className="font-extrabold text-slate-900 uppercase text-[9px] block tracking-widest text-slate-500">Ação Proposta / Medida de Intervenção Recomendada:</span>
                          <div className="bg-slate-50/50 p-3 rounded-lg border border-slate-100/80 print:bg-white print:border-none print:p-0">
                            {renderAsList(item.actionProposed || item.recommendation)}
                          </div>
                        </div>

                        {/* Indicadores de Eficácia */}
                        <div className="space-y-1">
                          <span className="font-extrabold text-slate-900 uppercase text-[9px] block tracking-widest text-slate-500">Indicadores de Eficácia para Monitoramento:</span>
                          <div className="bg-slate-50/50 p-3 rounded-lg border border-slate-100/80 print:bg-white print:border-none print:p-0">
                            <p className="text-slate-700 leading-relaxed text-justify">
                              {item.efficacyIndicator || `Reavaliação semestral de clima organizacional e acompanhamento dos indicadores de absenteísmo médico.`}
                            </p>
                          </div>
                        </div>

                        {/* Responsável pela Implantação */}
                        <div className="border-t border-slate-200 pt-3">
                          <span className="font-extrabold text-slate-900 uppercase text-[9px] block tracking-widest text-slate-400">Responsável pela Gestão e Execução:</span>
                          <span className="text-slate-700 font-extrabold text-sm">{item.responsible || "Diretoria de Recursos Humanos / Engenharia de Segurança do Trabalho"}</span>
                        </div>
                      </div>
                    </div>
                  ))}
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

        {/* --- CAPÍTULO 8: CONSIDERAÇÕES FINAIS --- */}
        <div className="space-y-4 print:pt-12 page-break-before">
          {renderHeader("8. Considerações Finais")}
          <h3 className="text-lg font-extrabold text-slate-900 border-b-2 border-slate-800 pb-2 uppercase tracking-wide">
            {report.risksRecognized !== false ? "8. Considerações Finais" : "6. Considerações Finais"}
          </h3>
          <p className="text-sm whitespace-pre-wrap text-slate-700 leading-relaxed text-justify">
            {report.finalConsiderations}
          </p>
        </div>

        {/* --- CAPÍTULO 9: REFERÊNCIAS --- */}
        <div className="space-y-4 print:pt-12 page-break-before">
          {renderHeader("9. Referências")}
          <h3 className="text-lg font-extrabold text-slate-900 border-b-2 border-slate-800 pb-2 uppercase tracking-wide">
            {report.risksRecognized !== false ? "9. Referências Bibliográficas" : "7. Referências Bibliográficas"}
          </h3>
          <p className="text-xs whitespace-pre-wrap text-slate-500 leading-relaxed font-mono">
            {report.chapters.referencias}
          </p>
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
      {/* --- FIM DO DOCUMENTO OFICIAL --- */}
    </div>
  );
};
