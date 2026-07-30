/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { Report } from "../types";
import { 
  Building, 
  FileText, 
  Users, 
  Layers, 
  Printer, 
  Sparkles, 
  Calendar, 
  Search, 
  Filter, 
  Activity, 
  ClipboardCheck, 
  X, 
  ShieldAlert, 
  CheckCircle2, 
  FileCheck, 
  RefreshCw, 
  Award, 
  Download, 
  Eye, 
  MapPin, 
  Phone, 
  FileSpreadsheet, 
  ChevronRight,
  TrendingUp,
  BarChart2
} from "lucide-react";
import { SearchableSelect } from "./SearchableSelect";

interface ManagementDashboardProps {
  reports: Report[];
  companiesCount: number;
  professionalsCount: number;
  assessor: {
    fantasyName: string;
    socialName: string;
    cnpj: string;
    address: string;
    phone: string;
    logo: string;
  };
  onUpdateAssessor: (newAssessor: any) => void;
  onUpdateAllReports?: (updatedReports: Report[]) => void;
}

export const ManagementDashboard: React.FC<ManagementDashboardProps> = ({ 
  reports, 
  companiesCount, 
  professionalsCount,
  assessor
}) => {
  // --- FILTER & REPORT PERIOD STATES ---
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState("all");
  const [selectedCompany, setSelectedCompany] = useState("all");
  const [selectedMethodology, setSelectedMethodology] = useState("all");
  const [selectedProfessional, setSelectedProfessional] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [pdfPreviewMode, setPdfPreviewMode] = useState(false);

  // --- MONTH NAMES HELPER ---
  const monthNames = useMemo(() => [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ], []);

  // --- EXTRACT AVAILABLE PERIODS FOR FILTERS ---
  const availablePeriods = useMemo(() => {
    const periodMap = new Map<string, string>();
    reports.forEach((r) => {
      const d = new Date(r.createdAt || r.dateStart || Date.now());
      if (!isNaN(d.getTime())) {
        const y = d.getFullYear();
        const m = d.getMonth() + 1;
        const key = `${y}-${String(m).padStart(2, "0")}`;
        const label = `${monthNames[m - 1]} / ${y}`;
        periodMap.set(key, label);
      }
    });

    return Array.from(periodMap.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([value, label]) => ({ value, label }));
  }, [reports, monthNames]);

  const availableCompanies = useMemo(() => {
    const set = new Set<string>();
    reports.forEach((r) => {
      if (r.companyName) set.add(r.companyName);
    });
    return Array.from(set).sort().map((c) => ({ value: c, label: c }));
  }, [reports]);

  const availableProfessionals = useMemo(() => {
    const set = new Set<string>();
    reports.forEach((r) => {
      if (r.professionalName) set.add(r.professionalName);
    });
    return Array.from(set).sort().map((p) => ({ value: p, label: p }));
  }, [reports]);

  // --- FILTERING REPORTS ---
  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const comp = (r.companyName || "").toLowerCase();
        const fant = (r.companyFantasyName || "").toLowerCase();
        const cnpj = (r.cnpj || "").toLowerCase();
        const prof = (r.professionalName || "").toLowerCase();
        const id = (r.id || "").toLowerCase();
        if (!comp.includes(query) && !fant.includes(query) && !cnpj.includes(query) && !prof.includes(query) && !id.includes(query)) {
          return false;
        }
      }

      // Period match
      if (selectedPeriod !== "all") {
        const d = new Date(r.createdAt || r.dateStart || Date.now());
        if (!isNaN(d.getTime())) {
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, "0");
          if (`${y}-${m}` !== selectedPeriod) return false;
        }
      }

      // Company match
      if (selectedCompany !== "all" && r.companyName !== selectedCompany) {
        return false;
      }

      // Methodology match
      if (selectedMethodology !== "all") {
        const method = r.methodology || "copsoq";
        if (selectedMethodology === "qualitative" && method !== "qualitative") return false;
        if (selectedMethodology === "copsoq" && method !== "copsoq") return false;
      }

      // Professional match
      if (selectedProfessional !== "all" && r.professionalName !== selectedProfessional) {
        return false;
      }

      // Date Range match
      if (startDate) {
        const rDate = new Date(r.createdAt || r.dateStart || 0);
        if (rDate < new Date(startDate)) return false;
      }
      if (endDate) {
        const rDate = new Date(r.createdAt || r.dateStart || 0);
        if (rDate > new Date(endDate + "T23:59:59")) return false;
      }

      return true;
    }).sort((a, b) => {
      const tA = new Date(a.createdAt || a.dateStart || 0).getTime();
      const tB = new Date(b.createdAt || b.dateStart || 0).getTime();
      return tB - tA; // Most recent first
    });
  }, [reports, searchTerm, selectedPeriod, selectedCompany, selectedMethodology, selectedProfessional, startDate, endDate]);

  // --- GROUPED BY MONTH FOR MONTHLY METRICS REPORT ---
  const reportsGroupedByMonth = useMemo(() => {
    const groups: Record<string, {
      monthKey: string;
      monthLabel: string;
      reports: Report[];
      totalLives: number;
      totalSectors: number;
      companiesSet: Set<string>;
      highRiskCount: number;
      medRiskCount: number;
      lowRiskCount: number;
    }> = {};

    filteredReports.forEach((r) => {
      const d = new Date(r.createdAt || r.dateStart || Date.now());
      let key = "Indefinido";
      let label = "Sem Data";
      if (!isNaN(d.getTime())) {
        const y = d.getFullYear();
        const m = d.getMonth() + 1;
        key = `${y}-${String(m).padStart(2, "0")}`;
        label = `${monthNames[m - 1]} de ${y}`;
      }

      if (!groups[key]) {
        groups[key] = {
          monthKey: key,
          monthLabel: label,
          reports: [],
          totalLives: 0,
          totalSectors: 0,
          companiesSet: new Set(),
          highRiskCount: 0,
          medRiskCount: 0,
          lowRiskCount: 0,
        };
      }

      const g = groups[key];
      g.reports.push(r);
      if (r.companyName) g.companiesSet.add(r.companyName);

      if (r.sectors && Array.isArray(r.sectors)) {
        g.totalSectors += r.sectors.length;
        r.sectors.forEach((s) => {
          g.totalLives += s.employeeCount || 0;
        });
      }

      if (r.riskInventory && Array.isArray(r.riskInventory)) {
        r.riskInventory.forEach((item) => {
          if (item.riskLevel === "Alto" || item.riskLevel === "Grave") {
            g.highRiskCount++;
          } else if (item.riskLevel === "Médio") {
            g.medRiskCount++;
          } else {
            g.lowRiskCount++;
          }
        });
      }
    });

    return Object.keys(groups)
      .sort((a, b) => b.localeCompare(a))
      .map((key) => groups[key]);
  }, [filteredReports, monthNames]);

  // --- GENERAL CONSOLIDATED METRICS FOR PDF REPORT ---
  const overallMetrics = useMemo(() => {
    let totalLives = 0;
    let totalSectors = 0;
    let highRisks = 0;
    let medRisks = 0;
    let lowRisks = 0;
    const companySet = new Set<string>();

    filteredReports.forEach((r) => {
      if (r.companyName) companySet.add(r.companyName);
      if (r.sectors && Array.isArray(r.sectors)) {
        totalSectors += r.sectors.length;
        r.sectors.forEach((s) => {
          totalLives += s.employeeCount || 0;
        });
      }
      if (r.riskInventory && Array.isArray(r.riskInventory)) {
        r.riskInventory.forEach((item) => {
          if (item.riskLevel === "Alto" || item.riskLevel === "Grave") highRisks++;
          else if (item.riskLevel === "Médio") medRisks++;
          else lowRisks++;
        });
      }
    });

    return {
      reportsCount: filteredReports.length,
      companiesCount: companySet.size,
      totalLives,
      totalSectors,
      highRisks,
      medRisks,
      lowRisks,
    };
  }, [filteredReports]);

  // --- FORMATTERS ---
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "N/I";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handlePrint = () => {
    window.print();
  };

  const isFilterActive = searchTerm || selectedPeriod !== "all" || selectedCompany !== "all" || selectedMethodology !== "all" || selectedProfessional !== "all" || startDate || endDate;

  const handleClearFilters = () => {
    setSearchTerm("");
    setSelectedPeriod("all");
    setSelectedCompany("all");
    setSelectedMethodology("all");
    setSelectedProfessional("all");
    setStartDate("");
    setEndDate("");
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* CSS PRINT STYLES FOR PERFECT PDF EXPORT */}
      <style>{`
        @media print {
          body {
            background-color: #ffffff !important;
            color: #0f172a !important;
            font-size: 11px !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print\\:hidden, nav, header, button, .no-print {
            display: none !important;
          }
          .print-container {
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
            width: 100% !important;
          }
          .page-break {
            page-break-after: always;
            break-after: page;
          }
          .avoid-break {
            page-break-inside: avoid;
            break-inside: avoid;
          }
        }
      `}</style>

      {/* TOP CONTROL BAR (HIDDEN ON PRINT) */}
      <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div className="space-y-1 text-left">
          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-indigo-900 text-amber-300 font-black px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
              <FileCheck className="w-3.5 h-3.5 text-amber-300" /> Relatório Exclusivo para Exportação PDF
            </span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Relatório de Desempenho Mensal e Resultados por Empresa
          </h2>
          <p className="text-xs text-slate-500">
            Estruturado especificamente para gerar laudos executivos e balanço consolidado em formato PDF.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={() => setPdfPreviewMode(!pdfPreviewMode)}
            className={`flex items-center gap-1.5 text-xs font-bold px-4 py-2.5 rounded-xl border transition cursor-pointer ${
              pdfPreviewMode 
                ? "bg-indigo-50 border-indigo-300 text-indigo-700" 
                : "bg-slate-50 border-slate-250 text-slate-700 hover:bg-slate-100"
            }`}
          >
            <Eye className="w-4 h-4 text-indigo-600" /> 
            {pdfPreviewMode ? "Sair do Preview PDF" : "Modo Preview PDF"}
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center justify-center gap-2 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 px-5 py-2.5 rounded-xl transition cursor-pointer shadow-md hover:shadow-lg"
          >
            <Printer className="w-4 h-4" /> Exportar para PDF / Imprimir
          </button>
        </div>
      </div>

      {/* FILTERS TOOLBAR (HIDDEN ON PRINT) */}
      <div className="bg-slate-50/90 p-5 rounded-2xl border border-slate-200 space-y-4 text-left print:hidden">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
            <Filter className="w-4 h-4 text-indigo-600" /> Filtros do Relatório Mensal
          </div>

          {isFilterActive && (
            <button
              onClick={handleClearFilters}
              className="flex items-center gap-1.5 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3 py-1.5 rounded-lg transition cursor-pointer"
            >
              <X className="w-3.5 h-3.5" /> Limpar Filtros
            </button>
          )}
        </div>

        {/* FILTER INPUTS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Term */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">Busca por Empresa / CNPJ / Técnico</label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Nome da empresa ou CNPJ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-250 text-xs font-medium bg-white text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Period Dropdown */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">Período Mensal</label>
            <SearchableSelect
              value={selectedPeriod}
              onChange={(val) => setSelectedPeriod(val)}
              options={[
                { value: "all", label: "Todos os Períodos" },
                ...availablePeriods
              ]}
              placeholder="Selecione o mês..."
            />
          </div>

          {/* Company Dropdown */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">Empresa Cliente</label>
            <SearchableSelect
              value={selectedCompany}
              onChange={(val) => setSelectedCompany(val)}
              options={[
                { value: "all", label: "Todas as Empresas" },
                ...availableCompanies
              ]}
              placeholder="Selecione a empresa..."
            />
          </div>

          {/* Methodology Dropdown */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">Metodologia</label>
            <SearchableSelect
              value={selectedMethodology}
              onChange={(val) => setSelectedMethodology(val)}
              options={[
                { value: "all", label: "Todas as Metodologias" },
                { value: "copsoq", label: "COPSOQ II-BR (Quantitativo)" },
                { value: "qualitative", label: "Avaliação Qualitativa" }
              ]}
              placeholder="Selecione a metodologia..."
            />
          </div>
        </div>

        {/* SECONDARY ROW */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">Profissional Responsável</label>
            <SearchableSelect
              value={selectedProfessional}
              onChange={(val) => setSelectedProfessional(val)}
              options={[
                { value: "all", label: "Todos os Profissionais" },
                ...availableProfessionals
              ]}
              placeholder="Selecione o profissional..."
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">Data Inicial de Emissão</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-250 text-xs font-medium bg-white text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">Data Final de Emissão</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-250 text-xs font-medium bg-white text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------------------------------- */}
      {/* EXCLUSIVE PDF EXPORT DOCUMENT LAYOUT (CANVAS THAT IS PRINTED CLEANLY)            */}
      {/* -------------------------------------------------------------------------------- */}
      <div 
        id="pdf-export-document"
        className={`bg-white rounded-2xl border border-slate-200 p-8 text-left space-y-8 print-container ${
          pdfPreviewMode ? "ring-2 ring-indigo-500 shadow-2xl" : "shadow-sm"
        }`}
      >
        {/* PDF HEADER SECTION */}
        <div className="border-b-2 border-slate-900 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            {assessor.logo ? (
              <img 
                src={assessor.logo} 
                alt="Logo da Assessoria" 
                className="w-20 h-20 object-contain rounded-xl border border-slate-200 p-1 shrink-0"
              />
            ) : (
              <div className="w-16 h-16 bg-slate-900 text-amber-300 rounded-xl flex items-center justify-center font-black text-xl shrink-0">
                SST
              </div>
            )}

            <div className="space-y-1">
              <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase leading-none">
                {assessor.fantasyName || "ASSESSORIA DE SAÚDE E SEGURANÇA NO TRABALHO"}
              </h1>
              {assessor.socialName && (
                <p className="text-xs text-slate-600 font-bold">{assessor.socialName}</p>
              )}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 font-medium">
                {assessor.cnpj && <span>CNPJ: <strong>{assessor.cnpj}</strong></span>}
                {assessor.phone && <span>Tel: <strong>{assessor.phone}</strong></span>}
                {assessor.address && <span>{assessor.address}</span>}
              </div>
            </div>
          </div>

          <div className="text-right border-l-2 border-slate-200 md:pl-6 space-y-1 shrink-0">
            <span className="text-[10px] font-black uppercase text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md tracking-wider inline-block">
              RELATÓRIO MENSAL - EXPORTAÇÃO PDF
            </span>
            <div className="text-xs font-bold text-slate-800">
              Emissão: {new Date().toLocaleDateString("pt-BR")}
            </div>
            <div className="text-[11px] text-slate-500">
              Período: {selectedPeriod === "all" ? "Visão Consolidada" : selectedPeriod}
            </div>
          </div>
        </div>

        {/* DOCUMENT TITLE & EXECUTIVE SUMMARY */}
        <div className="bg-slate-900 text-white p-6 rounded-xl space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-lg font-black uppercase text-amber-300 tracking-tight">
                RELATÓRIO DE DESEMPENHO E RESULTADOS MENSAL POR EMPRESA
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Consolidado de laudos psicossociais, vidas monitoradas e mapeamento de riscos operacionais.
              </p>
            </div>
            <span className="text-xs font-mono bg-slate-800 text-slate-200 font-bold px-3 py-1 rounded-lg border border-slate-700 shrink-0">
              A4 DOCUMENT FORMAT
            </span>
          </div>

          {/* KEY PERFORMANCE METRICS GRID (COMPACT FOR PDF) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
            <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700/80">
              <span className="text-[9px] uppercase font-bold text-slate-400 block">Total de Laudos</span>
              <span className="text-xl font-black font-mono text-white">{overallMetrics.reportsCount}</span>
              <span className="text-[9px] text-slate-400 block mt-0.5">Emitidos no período</span>
            </div>

            <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700/80">
              <span className="text-[9px] uppercase font-bold text-slate-400 block">Empresas Atendidas</span>
              <span className="text-xl font-black font-mono text-amber-300">{overallMetrics.companiesCount}</span>
              <span className="text-[9px] text-slate-400 block mt-0.5">Clientes no balanço</span>
            </div>

            <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700/80">
              <span className="text-[9px] uppercase font-bold text-slate-400 block">Vidas Impactadas</span>
              <span className="text-xl font-black font-mono text-emerald-400">{overallMetrics.totalLives}</span>
              <span className="text-[9px] text-slate-400 block mt-0.5">Colaboradores</span>
            </div>

            <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700/80">
              <span className="text-[9px] uppercase font-bold text-slate-400 block">GHEs / Setores</span>
              <span className="text-xl font-black font-mono text-indigo-300">{overallMetrics.totalSectors}</span>
              <span className="text-[9px] text-slate-400 block mt-0.5">Mapeados</span>
            </div>
          </div>
        </div>

        {/* -------------------------------------------------------------------------------- */}
        {/* DETAILED MONTHLY BREAKDOWN TABLE (ORGANIZED MONTH BY MONTH FOR EASY IDENTIFICATION) */}
        {/* -------------------------------------------------------------------------------- */}
        {reportsGroupedByMonth.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200">
            <p className="text-xs font-bold text-slate-600">Nenhum registro encontrado para a configuração atual do filtro.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {reportsGroupedByMonth.map((group) => (
              <div key={group.monthKey} className="space-y-3 avoid-break">
                {/* MONTH HEADER */}
                <div className="bg-slate-100 border-l-4 border-indigo-600 px-4 py-2.5 rounded-r-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-indigo-700" />
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                      Mês de Referência: {group.monthLabel}
                    </h3>
                  </div>

                  <div className="flex items-center gap-3 text-xs font-bold text-slate-700 font-mono">
                    <span>{group.reports.length} {group.reports.length === 1 ? "Laudo" : "Laudos"}</span>
                    <span>•</span>
                    <span>{group.companiesSet.size} {group.companiesSet.size === 1 ? "Empresa" : "Empresas"}</span>
                    <span>•</span>
                    <span className="text-indigo-800">{group.totalLives} Vidas Cobertas</span>
                  </div>
                </div>

                {/* MONTHLY COMPANY MATRIX TABLE */}
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-800 text-white uppercase text-[9px] font-black tracking-wider">
                        <th className="p-2.5 border-b border-slate-700">Empresa Cliente / CNPJ</th>
                        <th className="p-2.5 border-b border-slate-700">Emissão / Período</th>
                        <th className="p-2.5 border-b border-slate-700">Metodologia</th>
                        <th className="p-2.5 border-b border-slate-700 text-center">GHEs</th>
                        <th className="p-2.5 border-b border-slate-700 text-center">Vidas</th>
                        <th className="p-2.5 border-b border-slate-700">Responsável Técnico</th>
                        <th className="p-2.5 border-b border-slate-700 text-center">Riscos Críticos</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {group.reports.map((report) => {
                        const totalLives = (report.sectors || []).reduce((acc, s) => acc + (s.employeeCount || 0), 0);
                        const totalSectors = (report.sectors || []).length;
                        const highRisks = (report.riskInventory || []).filter(r => r.riskLevel === "Alto" || r.riskLevel === "Grave").length;
                        const medRisks = (report.riskInventory || []).filter(r => r.riskLevel === "Médio").length;
                        const isQualitative = report.methodology === "qualitative";

                        return (
                          <tr key={report.id} className="hover:bg-slate-50/80 transition-colors">
                            {/* Company Name */}
                            <td className="p-2.5 font-bold text-slate-900">
                              <div className="text-xs font-black text-slate-900">{report.companyName}</div>
                              {report.companyFantasyName && report.companyFantasyName !== report.companyName && (
                                <div className="text-[10px] font-medium text-slate-500">{report.companyFantasyName}</div>
                              )}
                              <div className="text-[9px] font-mono text-slate-400">CNPJ: {report.cnpj || "N/I"}</div>
                            </td>

                            {/* Date */}
                            <td className="p-2.5 font-medium text-slate-700">
                              <div className="font-bold text-slate-800">{formatDate(report.createdAt)}</div>
                              <div className="text-[9px] text-slate-500">
                                Campo: {formatDate(report.dateStart)} - {formatDate(report.dateEnd)}
                              </div>
                            </td>

                            {/* Methodology */}
                            <td className="p-2.5 font-bold">
                              {isQualitative ? (
                                <span className="text-[10px] font-extrabold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 inline-block">
                                  Qualitativo
                                </span>
                              ) : (
                                <span className="text-[10px] font-extrabold text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 inline-block">
                                  COPSOQ II-BR
                                </span>
                              )}
                            </td>

                            {/* GHEs Count */}
                            <td className="p-2.5 text-center font-mono font-black text-slate-800">
                              {totalSectors}
                            </td>

                            {/* Lives Count */}
                            <td className="p-2.5 text-center font-mono font-black text-indigo-900 bg-indigo-50/50">
                              {totalLives}
                            </td>

                            {/* Technical Professional */}
                            <td className="p-2.5 font-medium text-slate-700">
                              <div className="font-bold text-slate-800">{report.professionalName || "N/I"}</div>
                              <div className="text-[9px] text-slate-400 font-mono">{report.professionalCouncil || ""}</div>
                            </td>

                            {/* Critical Risks Badge */}
                            <td className="p-2.5 text-center font-bold">
                              {highRisks > 0 ? (
                                <span className="text-[10px] font-black text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded inline-flex items-center gap-1">
                                  <ShieldAlert className="w-3 h-3 text-rose-600" /> {highRisks} Alto/Grave
                                </span>
                              ) : medRisks > 0 ? (
                                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded inline-block">
                                  {medRisks} Risco Médio
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded inline-flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Controlado
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* PDF FOOTER & SIGNATURE SECTION */}
        <div className="pt-8 border-t border-slate-300 mt-8 space-y-6 avoid-break">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-center">
            <div className="space-y-1">
              <div className="border-b border-slate-400 w-3/4 mx-auto pb-1"></div>
              <p className="text-xs font-extrabold text-slate-800">
                {assessor.fantasyName || "Assessoria Técnica de SST"}
              </p>
              <p className="text-[10px] text-slate-500 font-medium">Departamento de Gestão de Laudos Psicossociais</p>
            </div>

            <div className="space-y-1">
              <div className="border-b border-slate-400 w-3/4 mx-auto pb-1"></div>
              <p className="text-xs font-extrabold text-slate-800">
                Aprovação Executiva / Coordenação Médica
              </p>
              <p className="text-[10px] text-slate-500 font-medium">Documento Gerado para Fins de Auditoria e Arquivo PDF</p>
            </div>
          </div>

          <div className="text-center text-[10px] text-slate-400 font-medium pt-2">
            Relatório emitido via Sistema de Laudos de Riscos Psicossociais (SST) • Página 1 de 1
          </div>
        </div>
      </div>
    </div>
  );
};
