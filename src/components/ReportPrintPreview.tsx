/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { Report, CustomChapter, COPSOQ_DIMENSIONS, getDimensionRating } from "../types";
import { replaceTemplateVariables } from "./ChaptersEditor";
import {
  getUnifiedChapters,
  cleanChapterTitle,
  UnifiedChapter,
} from "../chapterHierarchy";
import { ReportPhases } from "./ReportPhases";
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
  const activeAssessor = report.evaluator || assessor;
  const isQualitative = report.methodology === "qualitative";
  const hasRecognizedRisks = report.sectors.length > 0
    ? report.sectors.some((s) => s.risksRecognized !== false)
    : (report.risksRecognized !== false);

  // Instant logo resolvers to eliminate slow loading and cache misses
  const resolvedAssessorLogo = useMemo(() => {
    const raw = activeAssessor.logo;
    if (raw && raw !== "[OMITTED_IMAGE_FOR_CACHE]") {
      return raw;
    }
    try {
      const fastLogo = localStorage.getItem("sst_fast_assessor_logo");
      if (fastLogo && fastLogo !== "[OMITTED_IMAGE_FOR_CACHE]") {
        return fastLogo;
      }
    } catch (e) {}
    return "";
  }, [activeAssessor.logo]);

  const resolvedCompanyLogo = useMemo(() => {
    const raw = report.companyLogo;
    if (raw && raw !== "[OMITTED_IMAGE_FOR_CACHE]") {
      return raw;
    }
    try {
      const storedCompanies = localStorage.getItem("sst_psicossocial_companies");
      if (storedCompanies) {
        const companies = JSON.parse(storedCompanies);
        const match = companies.find((c: any) => 
          (c.cnpj && c.cnpj === report.companyCnpj) || 
          (c.fantasyName && c.fantasyName.toLowerCase() === (report.companyName || "").toLowerCase()) ||
          (c.name && c.name.toLowerCase() === (report.companyName || "").toLowerCase())
        );
        if (match && match.logo && match.logo !== "[OMITTED_IMAGE_FOR_CACHE]") {
          return match.logo;
        }
      }
    } catch (e) {}
    return "";
  }, [report.companyLogo, report.companyCnpj, report.companyName]);

  // Preload logos into memory cache
  useEffect(() => {
    if (resolvedAssessorLogo) {
      const img = new Image();
      img.src = resolvedAssessorLogo;
    }
    if (resolvedCompanyLogo) {
      const img = new Image();
      img.src = resolvedCompanyLogo;
    }
  }, [resolvedAssessorLogo, resolvedCompanyLogo]);

  const docContainerRef = useRef<HTMLDivElement>(null);
  const [pageMap, setPageMap] = useState<Record<string, number>>({});

  const unifiedChapters = getUnifiedChapters(report);
  const visibleChapters = unifiedChapters.filter((c) => !c.isExcluded);

  const formatPage = (num?: number) => {
    if (num !== undefined && num > 0) {
      return String(num).padStart(2, "0");
    }
    return "--";
  };

  const calculatePages = useCallback(() => {
    if (!docContainerRef.current) return;
    const container = docContainerRef.current;

    const newPageMap: Record<string, number> = {
      capa: 1,
      identificacao: 2,
      sumario: 3,
    };

    let currentPage = 4;
    const PAGE_HEIGHT_PX = 1050;

    const sections = container.querySelectorAll("[data-print-section='true']");

    sections.forEach((secNode) => {
      const sec = secNode as HTMLElement;
      const targetId = sec.getAttribute("data-print-page-target");
      if (!targetId) return;

      newPageMap[targetId] = currentPage;

      const subElements = sec.querySelectorAll("[data-print-subpage-target]");
      const secTop = sec.offsetTop;

      subElements.forEach((subNode) => {
        const sub = subNode as HTMLElement;
        const subTargetId = sub.getAttribute("data-print-subpage-target");
        if (!subTargetId) return;

        const relativeTop = Math.max(0, sub.offsetTop - secTop);
        const subPageOffset = Math.floor((relativeTop + 40) / PAGE_HEIGHT_PX);
        newPageMap[subTargetId] = currentPage + subPageOffset;
      });

      const secHeight = sec.offsetHeight || sec.scrollHeight || 0;
      const pageSpan = Math.max(1, Math.ceil(Math.max(0, secHeight - 80) / PAGE_HEIGHT_PX));
      currentPage += pageSpan;
    });

    setPageMap((prev) => {
      const keysA = Object.keys(prev);
      const keysB = Object.keys(newPageMap);
      if (keysA.length !== keysB.length) return newPageMap;
      const hasDiff = keysB.some((k) => prev[k] !== newPageMap[k]);
      return hasDiff ? newPageMap : prev;
    });
  }, []);

  useEffect(() => {
    calculatePages();
    const timer1 = setTimeout(calculatePages, 100);
    const timer2 = setTimeout(calculatePages, 400);

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && docContainerRef.current) {
      ro = new ResizeObserver(() => {
        calculatePages();
      });
      ro.observe(docContainerRef.current);
    }

    window.addEventListener("resize", calculatePages);
    window.addEventListener("beforeprint", calculatePages);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      if (ro) ro.disconnect();
      window.removeEventListener("resize", calculatePages);
      window.removeEventListener("beforeprint", calculatePages);
    };
  }, [calculatePages, report]);

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
    const resolvedText = replaceTemplateVariables(text, report, activeAssessor);
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
        {resolvedAssessorLogo ? (
          <img 
            src={resolvedAssessorLogo} 
            alt="Logo Assessora" 
            className="h-14 max-w-[180px] object-contain" 
            referrerPolicy="no-referrer"
            loading="eager"
            decoding="sync"
          />
        ) : (
          <div className="h-10 px-3 bg-slate-100 flex items-center justify-center rounded text-[9px] font-black text-slate-500 uppercase tracking-wider border border-slate-200">
            {activeAssessor.fantasyName || "Lima SST"}
          </div>
        )}
        
        {/* Divider if both exist */}
        {resolvedAssessorLogo && resolvedCompanyLogo && (
          <div className="h-12 w-[1px] bg-slate-300" />
        )}

        {/* Cliente Logo */}
        {resolvedCompanyLogo && (
          <img 
            src={resolvedCompanyLogo} 
            alt="Logo Cliente" 
            className="h-14 max-w-[180px] object-contain" 
            referrerPolicy="no-referrer"
            loading="eager"
            decoding="sync"
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

  const isChapterExcluded = (chapterId: string): boolean => {
    return (report.excludedChapters || []).includes(chapterId);
  };

  const getChapterHeading = (id: string, defaultTitle: string): string => {
    return report.chapterTitles?.[id] || defaultTitle;
  };

  const renderCustomChapterItem = (ch: UnifiedChapter | CustomChapter) => {
    const isUnified = "fullTitle" in ch;
    const level = ch.level || 2;
    const title = isUnified ? (ch as UnifiedChapter).fullTitle : (ch.title || "");
    const text = ch.text || "";

    if (level === 1) {
      return (
        <div key={ch.id} data-print-subpage-target={ch.id} className="space-y-4 print:pt-12 page-break-before">
          {renderHeader(title)}
          <h3 className="text-lg font-extrabold text-slate-900 border-b-2 border-slate-800 pb-2 uppercase tracking-wide">
            {title}
          </h3>
          {renderIndentedText(text)}
        </div>
      );
    }

    if (level === 2) {
      return (
        <div key={ch.id} data-print-subpage-target={ch.id} className="space-y-3 pt-6 border-t border-slate-200">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-5 bg-indigo-600 rounded"></div>
            <h4 className="text-base font-bold text-slate-900 uppercase tracking-wide">
              {title}
            </h4>
          </div>
          {renderIndentedText(text)}
        </div>
      );
    }

    return (
      <div key={ch.id} data-print-subpage-target={ch.id} className="space-y-2 pt-4 pl-4 border-l-2 border-indigo-200">
        <h5 className="text-sm font-bold text-slate-800 tracking-wide">
          {title}
        </h5>
        {renderIndentedText(text)}
      </div>
    );
  };

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

  const renderIntroducao = (ch: UnifiedChapter) => {
    const subchapters = visibleChapters.filter(
      (sub) => sub.level > 1 && (sub.parentChapterId === "introducao" || sub.number.startsWith(`${ch.number}.`))
    );
    return (
      <div key={ch.id} data-print-section="true" data-print-page-target="introducao" className="space-y-4 print:pt-12 page-break-before">
        {renderHeader(ch.fullTitle)}
        <h3 className="text-lg font-extrabold text-slate-900 border-b-2 border-slate-800 pb-2 uppercase tracking-wide">
          {ch.fullTitle}
        </h3>
        {renderIndentedText(report.chapters.introducao)}
        {subchapters.map(renderCustomChapterItem)}
      </div>
    );
  };

  const renderFundamentacao = (ch: UnifiedChapter) => {
    const subchapters = visibleChapters.filter(
      (sub) => sub.level > 1 && (sub.parentChapterId === "fundamentacao" || sub.number.startsWith(`${ch.number}.`))
    );
    return (
      <div key={ch.id} data-print-section="true" data-print-page-target="fundamentacao" className="space-y-4 print:pt-12 page-break-before">
        {renderHeader(ch.fullTitle)}
        <h3 className="text-lg font-extrabold text-slate-900 border-b-2 border-slate-800 pb-2 uppercase tracking-wide">
          {ch.fullTitle}
        </h3>
        {renderIndentedText(report.chapters.fundamentacao)}
        {subchapters.map(renderCustomChapterItem)}
      </div>
    );
  };

  const renderMetodologia = (ch: UnifiedChapter) => {
    const subchapters = visibleChapters.filter(
      (sub) => sub.level > 1 && (sub.parentChapterId === "metodologia" || sub.number.startsWith(`${ch.number}.`))
    );
    return (
      <div key={ch.id} data-print-section="true" data-print-page-target="metodologia" className="space-y-4 print:pt-12 page-break-before">
        {renderHeader(ch.fullTitle)}
        <h3 className="text-lg font-extrabold text-slate-900 border-b-2 border-slate-800 pb-2 uppercase tracking-wide">
          {ch.fullTitle}
        </h3>
        {renderIndentedText(report.chapters.metodologia)}
        {subchapters.map(renderCustomChapterItem)}
      </div>
    );
  };

  const renderConsideracoes = (ch: UnifiedChapter) => {
    const subchapters = visibleChapters.filter(
      (sub) => sub.level > 1 && (sub.parentChapterId === "consideracoes" || sub.number.startsWith(`${ch.number}.`))
    );
    return (
      <div key={ch.id} data-print-section="true" data-print-page-target="consideracoes" className="space-y-4 print:pt-12 page-break-before">
        {renderHeader(ch.fullTitle)}
        <h3 className="text-lg font-extrabold text-slate-900 border-b-2 border-slate-800 pb-2 uppercase tracking-wide">
          {ch.fullTitle}
        </h3>
        {renderIndentedText(report.finalConsiderations)}
        {subchapters.map(renderCustomChapterItem)}
      </div>
    );
  };

  const renderReferencias = (ch: UnifiedChapter) => {
    const subchapters = visibleChapters.filter(
      (sub) => sub.level > 1 && (sub.parentChapterId === "referencias" || sub.number.startsWith(`${ch.number}.`))
    );
    return (
      <div key={ch.id} data-print-section="true" data-print-page-target="referencias" className="space-y-4 print:pt-12 page-break-before">
        {renderHeader(ch.fullTitle)}
        <h3 className="text-lg font-extrabold text-slate-900 border-b-2 border-slate-800 pb-2 uppercase tracking-wide">
          {ch.fullTitle}
        </h3>
        <div className="text-xs font-mono">
          {renderIndentedText(report.chapters.referencias)}
        </div>
        {subchapters.map(renderCustomChapterItem)}
      </div>
    );
  };

  const renderCustomMainChapter = (ch: UnifiedChapter) => {
    const subchapters = visibleChapters.filter(
      (sub) => sub.level > 1 && (sub.parentChapterId === ch.id || sub.number.startsWith(`${ch.number}.`))
    );
    return (
      <div key={ch.id} data-print-section="true" data-print-page-target={ch.id} className="space-y-4 print:pt-12 page-break-before">
        {renderHeader(ch.fullTitle)}
        <h3 className="text-lg font-extrabold text-slate-900 border-b-2 border-slate-800 pb-2 uppercase tracking-wide">
          {ch.fullTitle}
        </h3>
        {renderIndentedText(ch.text || "")}
        {subchapters.map(renderCustomChapterItem)}
      </div>
    );
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
      <div
        ref={docContainerRef}
        className="bg-white p-8 sm:p-16 border border-slate-200 shadow-sm rounded-2xl mx-auto max-w-[900px] font-sans text-slate-800 print:border-none print:shadow-none print:p-0 leading-relaxed space-y-12"
      >
        
        {/* --- CAPA (Capa do Relatório) --- */}
        {(report.coverImage || assessor.defaultCoverImage) ? (
          <div data-print-page-target="capa" className="min-h-[1050px] print:h-screen print:min-h-0 flex flex-col justify-center items-center pb-16 print:pb-0 page-break-after">
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
          <div data-print-page-target="capa" className="min-h-[1050px] flex flex-col justify-between border-b-2 border-slate-200 pb-16 print:min-h-0 print:h-screen print:border-none print:pb-0 print:justify-center print:gap-12">
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
                  {resolvedAssessorLogo && (
                    <img 
                      src={resolvedAssessorLogo} 
                      alt="Logo Assessora" 
                      className="h-8 max-w-[80px] object-contain border border-slate-200 rounded p-0.5 bg-white shrink-0" 
                      referrerPolicy="no-referrer"
                      loading="eager"
                      decoding="sync"
                    />
                  )}
                  <div>
                    <span className="font-extrabold text-slate-800 block">{activeAssessor.fantasyName || "Lima engenharia e assessoria em segurança do trabalho"}</span>
                    <span className="text-slate-500 block leading-tight text-[11px]">{activeAssessor.socialName || "E. L. de Jesus – Segurança"} • CNPJ: {activeAssessor.cnpj || "18.195.986/0001-68"}</span>
                    <span className="text-slate-500 block leading-tight text-[11px]">{activeAssessor.address || "Av. Mato grosso, 108-W, Centro, Tangará da Serra – MT"} • {activeAssessor.phone || "65 99998-0418"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- PÁGINA 2: RESUMO E IDENTIFICAÇÃO DO ESCOPO --- */}
        {(() => {
          const totalEmployees = report.sectors.reduce((sum, s) => sum + (s.employeeCount || 0), 0);

          return (
            <div data-print-page-target="identificacao" className="min-h-[1050px] flex flex-col justify-between border-b-2 border-slate-200 pb-16 print:min-h-0 print:h-screen print:border-none print:pb-0 page-break-before page-break-after">
              {renderHeader("Dados Cadastrais e Escopo")}

              <div className="my-auto space-y-8 max-w-2xl mx-auto w-full">
                {/* Logo do Cliente Destacada no Centro */}
                <div className="text-center space-y-4">
                  {resolvedCompanyLogo ? (
                    <img
                      src={resolvedCompanyLogo}
                      alt="Logo Cliente"
                      className="h-24 max-w-[240px] object-contain mx-auto mb-2"
                      referrerPolicy="no-referrer"
                      loading="eager"
                      decoding="sync"
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-center space-y-0.5">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Funcionários Avaliados</span>
                    <span className="text-2xl font-black text-slate-800 font-mono">{totalEmployees}</span>
                    <span className="text-[10px] text-slate-500 block">Total no GES</span>
                  </div>
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-center space-y-0.5">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Setores Ativos</span>
                    <span className="text-2xl font-black text-slate-800 font-mono">{report.sectors.length}</span>
                    <span className="text-[10px] text-slate-500 block">Setores / GES Mapeados</span>
                  </div>
                </div>

                {/* Setores Avaliados */}
                <div className="text-xs text-left bg-white p-4 rounded-xl border border-slate-200 space-y-1.5">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Detalhamento por Setor</span>
                  <div className="flex flex-wrap gap-2">
                    {report.sectors.map((s) => (
                      <span key={s.id} className="inline-block bg-slate-50 text-slate-700 px-2.5 py-1 rounded-md border border-slate-200 text-[11px] font-medium">
                        {s.name}: <strong className="font-extrabold text-slate-900 font-mono">{s.employeeCount || 0}</strong> func.
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Dados da Empresa Empresa Avaliadora no Rodapé */}
              <div className="border-t border-slate-200 pt-6 mt-auto">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-3 text-center sm:text-left">
                  ASSESSORIA EM SAÚDE E SEGURANÇA DO TRABALHO RESPONSÁVEL
                </span>
                <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 text-xs">
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
                    {resolvedAssessorLogo ? (
                      <img
                        src={resolvedAssessorLogo}
                        alt="Logo Assessora"
                        className="h-12 max-w-[140px] object-contain border border-slate-150 rounded-lg p-1 bg-white shrink-0"
                        referrerPolicy="no-referrer"
                        loading="eager"
                        decoding="sync"
                      />
                    ) : (
                      <div className="h-10 px-3 bg-slate-100 flex items-center justify-center rounded-lg text-[9px] font-black text-slate-500 uppercase tracking-wider border border-slate-200 shrink-0">
                        {activeAssessor.fantasyName || "LIMA SST"}
                      </div>
                    )}
                    <div className="space-y-0.5">
                      <span className="font-black text-slate-800 block text-sm leading-snug">{activeAssessor.fantasyName || "Lima Engenharia e Assessoria"}</span>
                      <span className="text-slate-500 block text-[11px] leading-tight">{activeAssessor.socialName || "E. L. de Jesus – Segurança"} • CNPJ: {activeAssessor.cnpj || "18.195.986/0001-68"}</span>
                      <span className="text-slate-500 block text-[11px] leading-tight">{activeAssessor.address || "Av. Mato grosso, 108-W, Centro, Tangará da Serra – MT"} • Contato: {activeAssessor.phone || "65 99998-0418"}</span>
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
        <div
          data-print-page-target="sumario"
          className="min-h-[1050px] flex flex-col justify-between border-b-2 border-slate-200 pb-16 print:min-h-0 print:h-screen print:border-none print:pb-0 page-break-before page-break-after"
        >
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
              {visibleChapters
                .filter((c) => c.level === 1)
                .map((ch) => {
                  if (ch.type === "phases") {
                    const phasesStart = parseInt(ch.number.split("–")[0], 10) || 4;

                    if (isQualitative) {
                      if (!hasRecognizedRisks) return null;
                      return (
                        <React.Fragment key={ch.id}>
                          {/* Phase 1 for Qualitative: Inventário de Riscos */}
                          <div className="space-y-1.5">
                            <div className="flex items-end gap-2">
                              <span className="font-bold text-slate-850 uppercase">
                                {phasesStart}. INVENTÁRIO DE RISCOS PSICOSSOCIAIS
                              </span>
                              <div className="flex-grow border-b border-dotted border-slate-300 mb-1"></div>
                              <span className="text-slate-500 font-bold font-mono">
                                {formatPage(pageMap["fases-inventario"])}
                              </span>
                            </div>
                            {report.sectors.filter((s) => s.risksRecognized !== false).map((sector, index) => {
                              const hasRisks = report.riskInventory.some((r) => r.sectorId === sector.id);
                              if (!hasRisks) return null;
                              return (
                                <div key={sector.id} className="flex items-end gap-2 pl-6 text-[11px] text-slate-600">
                                  <span className="font-medium">
                                    {phasesStart}.{index + 1}. Riscos de {sector.name}
                                  </span>
                                  <div className="flex-grow border-b border-dotted border-slate-200 mb-0.5"></div>
                                  <span className="text-slate-400 font-medium font-mono">
                                    {formatPage(pageMap[`sector-inventory-${sector.id}`] || pageMap["fases-inventario"])}
                                  </span>
                                </div>
                              );
                            })}
                          </div>

                          {/* Phase 2 for Qualitative: Cronograma e Plano de Ação */}
                          <div className="space-y-1.5">
                            <div className="flex items-end gap-2">
                              <span className="font-bold text-slate-850 uppercase">
                                {phasesStart + 1}. CRONOGRAMA E PLANO DE AÇÃO
                              </span>
                              <div className="flex-grow border-b border-dotted border-slate-300 mb-1"></div>
                              <span className="text-slate-500 font-bold font-mono">
                                {formatPage(pageMap["fases-cronograma"])}
                              </span>
                            </div>
                            {report.sectors.filter((s) => s.risksRecognized !== false).map((sector, index) => {
                              const hasActions = report.riskInventory.some((r) => r.sectorId === sector.id);
                              if (!hasActions) return null;
                              return (
                                <div key={sector.id} className="flex items-end gap-2 pl-6 text-[11px] text-slate-600">
                                  <span className="font-medium">
                                    {phasesStart + 1}.{index + 1}. Ações de {sector.name}
                                  </span>
                                  <div className="flex-grow border-b border-dotted border-slate-200 mb-0.5"></div>
                                  <span className="text-slate-400 font-medium font-mono">
                                    {formatPage(pageMap[`sector-action-${sector.id}`] || pageMap["fases-cronograma"])}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </React.Fragment>
                      );
                    }

                    return (
                      <React.Fragment key={ch.id}>
                        {/* Phase 1: Resultados */}
                        <div className="space-y-1.5">
                          <div className="flex items-end gap-2">
                            <span className="font-bold text-slate-850 uppercase">
                              {phasesStart}. APRESENTAÇÃO DOS RESULTADOS
                            </span>
                            <div className="flex-grow border-b border-dotted border-slate-300 mb-1"></div>
                            <span className="text-slate-500 font-bold font-mono">
                              {formatPage(pageMap["fases-resultados"])}
                            </span>
                          </div>
                          {report.sectors.map((sector, index) => (
                            <div key={sector.id} className="flex items-end gap-2 pl-6 text-[11px] text-slate-600">
                              <span className="font-medium">
                                {phasesStart}.{index + 1}. Resultados do Setor: {sector.name}
                              </span>
                              <div className="flex-grow border-b border-dotted border-slate-200 mb-0.5"></div>
                              <span className="text-slate-400 font-medium font-mono">
                                {formatPage(pageMap[`sector-result-${sector.id}`] || pageMap["fases-resultados"])}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Phase 2: Análise Técnica dos Riscos e Devolutivas */}
                        <div className="space-y-1.5">
                          <div className="flex items-end gap-2">
                            <span className="font-bold text-slate-850 uppercase">
                              {phasesStart + 1}. ANÁLISE TÉCNICA E DEVOLUTIVAS
                            </span>
                            <div className="flex-grow border-b border-dotted border-slate-300 mb-1"></div>
                            <span className="text-slate-500 font-bold font-mono">
                              {formatPage(pageMap["fases-devolutivas"])}
                            </span>
                          </div>
                          {report.sectors.map((sector, index) => (
                            <div key={sector.id} className="flex items-end gap-2 pl-6 text-[11px] text-slate-600">
                              <span className="font-medium">
                                {phasesStart + 1}.{index + 1}. Diagnóstico Qualitativo: {sector.name}
                              </span>
                              <div className="flex-grow border-b border-dotted border-slate-200 mb-0.5"></div>
                              <span className="text-slate-400 font-medium font-mono">
                                {formatPage(pageMap[`sector-devolutiva-${sector.id}`] || pageMap["fases-devolutivas"])}
                              </span>
                            </div>
                          ))}
                        </div>

                        {hasRecognizedRisks && (
                          <>
                            {/* Phase 3: Inventário de Riscos */}
                            <div className="space-y-1.5">
                              <div className="flex items-end gap-2">
                                <span className="font-bold text-slate-850 uppercase">
                                  {phasesStart + 2}. INVENTÁRIO DE RISCOS PSICOSSOCIAIS
                                </span>
                                <div className="flex-grow border-b border-dotted border-slate-300 mb-1"></div>
                                <span className="text-slate-500 font-bold font-mono">
                                  {formatPage(pageMap["fases-inventario"])}
                                </span>
                              </div>
                              {report.sectors.filter((s) => s.risksRecognized !== false).map((sector, index) => {
                                const hasRisks = report.riskInventory.some((r) => r.sectorId === sector.id);
                                if (!hasRisks) return null;
                                return (
                                  <div key={sector.id} className="flex items-end gap-2 pl-6 text-[11px] text-slate-600">
                                    <span className="font-medium">
                                      {phasesStart + 2}.{index + 1}. Riscos de {sector.name}
                                    </span>
                                    <div className="flex-grow border-b border-dotted border-slate-200 mb-0.5"></div>
                                    <span className="text-slate-400 font-medium font-mono">
                                      {formatPage(pageMap[`sector-inventory-${sector.id}`] || pageMap["fases-inventario"])}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Phase 4: Cronograma e Plano de Ação */}
                            <div className="space-y-1.5">
                              <div className="flex items-end gap-2">
                                <span className="font-bold text-slate-850 uppercase">
                                  {phasesStart + 3}. CRONOGRAMA E PLANO DE AÇÃO
                                </span>
                                <div className="flex-grow border-b border-dotted border-slate-300 mb-1"></div>
                                <span className="text-slate-500 font-bold font-mono">
                                  {formatPage(pageMap["fases-cronograma"])}
                                </span>
                              </div>
                              {report.sectors.filter((s) => s.risksRecognized !== false).map((sector, index) => {
                                const hasActions = report.riskInventory.some((r) => r.sectorId === sector.id);
                                if (!hasActions) return null;
                                return (
                                  <div key={sector.id} className="flex items-end gap-2 pl-6 text-[11px] text-slate-600">
                                    <span className="font-medium">
                                      {phasesStart + 3}.{index + 1}. Ações de {sector.name}
                                    </span>
                                    <div className="flex-grow border-b border-dotted border-slate-200 mb-0.5"></div>
                                    <span className="text-slate-400 font-medium font-mono">
                                      {formatPage(pageMap[`sector-action-${sector.id}`] || pageMap["fases-cronograma"])}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </React.Fragment>
                    );
                  }

                  // Standard or custom level 1 chapter
                  const subchapters = visibleChapters.filter(
                    (sub) => sub.level > 1 && (sub.parentChapterId === ch.id || sub.number.startsWith(`${ch.number}.`))
                  );

                  return (
                    <div key={ch.id} className="space-y-1.5">
                      <div className="flex items-end gap-2">
                        <span className="font-bold text-slate-850 uppercase">{ch.fullTitle}</span>
                        <div className="flex-grow border-b border-dotted border-slate-300 mb-1"></div>
                        <span className="text-slate-500 font-bold font-mono">
                          {formatPage(pageMap[ch.id])}
                        </span>
                      </div>
                      {subchapters.map((sub) => (
                        <div
                          key={sub.id}
                          className={`flex items-end gap-2 text-[11px] text-slate-600 ${
                            sub.level >= 3 ? "pl-8" : "pl-6"
                          }`}
                        >
                          <span className="font-medium">{sub.fullTitle}</span>
                          <div className="flex-grow border-b border-dotted border-slate-200 mb-0.5"></div>
                          <span className="text-slate-400 font-medium font-mono">
                            {formatPage(pageMap[sub.id] || pageMap[ch.id])}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                })}
            </div>
          </div>

          <div className="text-center text-[10px] text-slate-400 font-semibold border-t border-slate-100 pt-4">
            Este sumário é gerado e atualizado dinamicamente com base nas informações setoriais registradas.
          </div>
        </div>

        {/* --- CAPÍTULOS UNIFICADOS DO LAUDO (ORDEM DINÂMICA) --- */}
        {visibleChapters
          .filter((c) => c.level === 1)
          .map((ch) => {
            if (ch.id === "introducao") return renderIntroducao(ch);
            if (ch.id === "fundamentacao") return renderFundamentacao(ch);
            if (ch.id === "metodologia") return renderMetodologia(ch);
            if (ch.type === "phases") {
              return (
                <ReportPhases
                  key={ch.id}
                  ch={ch}
                  report={report}
                  isQualitative={isQualitative}
                  hasRecognizedRisks={hasRecognizedRisks}
                  renderHeader={renderHeader}
                />
              );
            }
            if (ch.id === "consideracoes") return renderConsideracoes(ch);
            if (ch.id === "referencias") return renderReferencias(ch);
            return renderCustomMainChapter(ch);
          })}

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
