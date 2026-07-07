/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from "react";
import { Report } from "../types";
import { 
  LineChart, 
  Line, 
  ResponsiveContainer, 
  AreaChart,
  Area,
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid,
  BarChart,
  Bar
} from "recharts";
import { 
  TrendingUp, 
  Building, 
  FileText, 
  Users, 
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Printer,
  Sparkles,
  ChevronRight,
  Calendar,
  Briefcase
} from "lucide-react";

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
  // --- COMPUTE MONTHLY PERFORMANCE DATA FOR THE BUSINESS ---
  const monthlyStats = useMemo(() => {
    const statsMap: Record<string, {
      monthKey: string;
      reports: Report[];
      companies: Set<string>;
      sectorsCount: number;
      employeesCount: number;
    }> = {};

    reports.forEach(r => {
      const date = new Date(r.createdAt || Date.now());
      let y = date.getFullYear();
      let m = date.getMonth() + 1;
      
      if (isNaN(date.getTime())) {
        const fallbackDate = new Date();
        y = fallbackDate.getFullYear();
        m = fallbackDate.getMonth() + 1;
      }

      const key = `${y}-${String(m).padStart(2, "0")}`;
      
      if (!statsMap[key]) {
        statsMap[key] = {
          monthKey: key,
          reports: [],
          companies: new Set<string>(),
          sectorsCount: 0,
          employeesCount: 0,
        };
      }

      statsMap[key].reports.push(r);
      if (r.companyName) statsMap[key].companies.add(r.companyName);
      
      let rSectors = 0;
      let rEmployees = 0;
      if (r.sectors && Array.isArray(r.sectors)) {
        rSectors += r.sectors.length;
        r.sectors.forEach(s => {
          rEmployees += s.employeeCount || 0;
        });
      }
      
      statsMap[key].sectorsCount += rSectors;
      statsMap[key].employeesCount += rEmployees;
    });

    // Make sure we always have at least the current and previous month represented to allow clean MoM comparisons
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth() + 1;
    const fallbackCurrentKey = `${curYear}-${String(curMonth).padStart(2, "0")}`;
    
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevYear = prevDate.getFullYear();
    const prevMonth = prevDate.getMonth() + 1;
    const fallbackPrevKey = `${prevYear}-${String(prevMonth).padStart(2, "0")}`;

    // Dynamically identify the most active month with actual data to display as "Current Month",
    // and the month prior to that as "Previous Month" for comparison.
    // If no data exists, fall back to calendar months.
    const activeKeys = Object.keys(statsMap).filter(k => statsMap[k].reports.length > 0).sort();
    let currentKey = fallbackCurrentKey;
    let prevKey = fallbackPrevKey;

    if (activeKeys.length > 0) {
      currentKey = activeKeys[activeKeys.length - 1];
      if (activeKeys.length > 1) {
        prevKey = activeKeys[activeKeys.length - 2];
      } else {
        const [y, m] = currentKey.split("-").map(Number);
        const pDate = new Date(y, m - 2, 1);
        prevKey = `${pDate.getFullYear()}-${String(pDate.getMonth() + 1).padStart(2, "0")}`;
      }
    }

    if (!statsMap[currentKey]) {
      statsMap[currentKey] = {
        monthKey: currentKey,
        reports: [],
        companies: new Set(),
        sectorsCount: 0,
        employeesCount: 0
      };
    }
    if (!statsMap[prevKey]) {
      statsMap[prevKey] = {
        monthKey: prevKey,
        reports: [],
        companies: new Set(),
        sectorsCount: 0,
        employeesCount: 0
      };
    }

    // Sort descending for listing and table
    const sortedKeysDesc = Object.keys(statsMap).sort((a, b) => b.localeCompare(a));
    // Sort ascending for chart progression
    const sortedKeysAsc = Object.keys(statsMap).sort((a, b) => a.localeCompare(b));

    const monthNames = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];

    const formatKeyToLabel = (key: string) => {
      const [yStr, mStr] = key.split("-");
      const mIdx = parseInt(mStr, 10) - 1;
      return `${monthNames[mIdx]} de ${yStr}`;
    };

    const formatKeyToLabelShort = (key: string) => {
      const [yStr, mStr] = key.split("-");
      const mIdx = parseInt(mStr, 10) - 1;
      return `${monthNames[mIdx].substring(0, 3)}/${yStr.substring(2)}`;
    };

    const statsListDesc = sortedKeysDesc.map(key => {
      const item = statsMap[key];
      return {
        monthKey: key,
        monthLabel: formatKeyToLabel(key),
        monthLabelShort: formatKeyToLabelShort(key),
        reportsCount: item.reports.length,
        companiesCount: item.companies.size,
        sectorsCount: item.sectorsCount,
        employeesCount: item.employeesCount,
      };
    });

    const statsListAsc = sortedKeysAsc.map(key => {
      const item = statsMap[key];
      return {
        monthKey: key,
        monthLabel: formatKeyToLabel(key),
        monthLabelShort: formatKeyToLabelShort(key),
        reportsCount: item.reports.length,
        companiesCount: item.companies.size,
        sectorsCount: item.sectorsCount,
        employeesCount: item.employeesCount,
      };
    });

    return {
      listDesc: statsListDesc,
      listAsc: statsListAsc,
      currentKey,
      prevKey,
      currentStats: statsMap[currentKey],
      prevStats: statsMap[prevKey],
      currentLabel: formatKeyToLabel(currentKey),
      prevLabel: formatKeyToLabel(prevKey)
    };
  }, [reports]);

  // --- STATS VALUES FOR CURRENT & PREVIOUS ---
  const currentMonthData = useMemo(() => {
    const list = monthlyStats.listDesc;
    const cur = list.find(x => x.monthKey === monthlyStats.currentKey);
    return cur || { reportsCount: 0, companiesCount: 0, sectorsCount: 0, employeesCount: 0, monthLabel: "" };
  }, [monthlyStats]);

  const prevMonthData = useMemo(() => {
    const list = monthlyStats.listDesc;
    const prev = list.find(x => x.monthKey === monthlyStats.prevKey);
    return prev || { reportsCount: 0, companiesCount: 0, sectorsCount: 0, employeesCount: 0, monthLabel: "" };
  }, [monthlyStats]);

  // Sparkline data preparation (last 6 chronological stats)
  const sparklineReports = useMemo(() => {
    const data = monthlyStats.listAsc.slice(-6);
    return data.length >= 2 ? data : [...data, ...data].map(d => ({ value: d.reportsCount }));
  }, [monthlyStats]);

  const sparklineCompanies = useMemo(() => {
    const data = monthlyStats.listAsc.slice(-6);
    return data.length >= 2 ? data : [...data, ...data].map(d => ({ value: d.companiesCount }));
  }, [monthlyStats]);

  const sparklineSectors = useMemo(() => {
    const data = monthlyStats.listAsc.slice(-6);
    return data.length >= 2 ? data : [...data, ...data].map(d => ({ value: d.sectorsCount }));
  }, [monthlyStats]);

  const sparklineEmployees = useMemo(() => {
    const data = monthlyStats.listAsc.slice(-6);
    return data.length >= 2 ? data : [...data, ...data].map(d => ({ value: d.employeesCount }));
  }, [monthlyStats]);

  // General helpers for change calculation
  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) {
      return current > 0 ? { percent: 100, status: "increase" } : { percent: 0, status: "equal" };
    }
    const diff = current - previous;
    const percent = Math.round((diff / previous) * 100);
    return {
      percent: Math.abs(percent),
      status: percent > 0 ? "increase" : percent < 0 ? "decrease" : "equal"
    };
  };

  const reportsChange = calculateChange(currentMonthData.reportsCount, prevMonthData.reportsCount);
  const companiesChange = calculateChange(currentMonthData.companiesCount, prevMonthData.companiesCount);
  const sectorsChange = calculateChange(currentMonthData.sectorsCount, prevMonthData.sectorsCount);
  const employeesChange = calculateChange(currentMonthData.employeesCount, prevMonthData.employeesCount);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6" id="consulting-performance-dashboard">
      
      {/* HEADER */}
      <div className="bg-white border border-slate-100 p-5 md:p-6 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div className="space-y-1 text-left">
          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-slate-900 text-amber-300 font-black px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-300" /> Indicadores da Assessoria (Meu Negócio)
            </span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Dashboard de Desenvolvimento Mensal
          </h2>
          <p className="text-xs text-slate-500">
            Monitore a produtividade da sua assessoria, o volume de laudos concluídos, clientes atendidos e o progresso da sua operação técnica.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={handlePrint}
            className="flex items-center justify-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-250 px-4 py-2.5 rounded-xl transition cursor-pointer shadow-2xs"
          >
            <Printer className="w-4 h-4 text-slate-500" /> Imprimir Balanço Mensal
          </button>
        </div>
      </div>

      {/* COMPARATIVE SECTION HEADER (ON-SCREEN MOVEMENT) */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider text-amber-400">
            Comparativo de Desempenho Operacional
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Mês atual (<strong className="text-slate-200">{monthlyStats.currentLabel}</strong>) comparado ao mês anterior (<strong className="text-slate-350">{monthlyStats.prevLabel}</strong>) de forma direta.
          </p>
        </div>
        <div className="text-[10px] bg-slate-800 text-slate-300 border border-slate-700 font-mono px-3 py-1 rounded-lg uppercase tracking-wider font-extrabold flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5 text-slate-400" /> Sincronizado com os Laudos Emitidos
        </div>
      </div>

      {/* BUSINESS KPI GRID WITH SPARKLINE GRAPHS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* KPI 1: LAUDOS CONCLUÍDOS */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-2xs space-y-4 text-left flex flex-col justify-between h-40">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-450 font-black uppercase tracking-wider block">Laudos Gerados / Emitidos</span>
              <FileText className="w-4.5 h-4.5 text-blue-500 bg-blue-50 p-1 rounded-lg" />
            </div>
            
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-800 font-mono">
                {currentMonthData.reportsCount}
              </span>
              <span className="text-[11px] text-slate-400 font-semibold">
                vs {prevMonthData.reportsCount}
              </span>
            </div>
          </div>

          {/* Sparkline & Indicator */}
          <div className="flex items-end justify-between gap-2 border-t border-slate-50 pt-3">
            <div className="w-24 h-8 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sparklineReports.map(x => ({ val: x.reportsCount }))}>
                  <Line type="monotone" dataKey="val" stroke="#3b82f6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            <div className="text-right">
              {reportsChange.status === "increase" ? (
                <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg flex items-center gap-0.5 justify-end">
                  <ArrowUpRight className="w-3 h-3" /> +{reportsChange.percent}%
                </span>
              ) : reportsChange.status === "decrease" ? (
                <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-lg flex items-center gap-0.5 justify-end">
                  <ArrowDownRight className="w-3 h-3" /> -{reportsChange.percent}%
                </span>
              ) : (
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg">
                  Estável
                </span>
              )}
              <span className="text-[8px] text-slate-400 font-bold uppercase block mt-1">Crescimento</span>
            </div>
          </div>
        </div>

        {/* KPI 2: EMPRESAS CLIENTES SERVIDAS */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-2xs space-y-4 text-left flex flex-col justify-between h-40">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-450 font-black uppercase tracking-wider block">Clientes Atendidos (Mês)</span>
              <Building className="w-4.5 h-4.5 text-emerald-500 bg-emerald-50 p-1 rounded-lg" />
            </div>
            
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-800 font-mono">
                {currentMonthData.companiesCount}
              </span>
              <span className="text-[11px] text-slate-400 font-semibold">
                vs {prevMonthData.companiesCount}
              </span>
            </div>
          </div>

          {/* Sparkline & Indicator */}
          <div className="flex items-end justify-between gap-2 border-t border-slate-50 pt-3">
            <div className="w-24 h-8 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sparklineCompanies.map(x => ({ val: x.companiesCount }))}>
                  <Line type="monotone" dataKey="val" stroke="#10b981" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            <div className="text-right">
              {companiesChange.status === "increase" ? (
                <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg flex items-center gap-0.5 justify-end">
                  <ArrowUpRight className="w-3 h-3" /> +{companiesChange.percent}%
                </span>
              ) : companiesChange.status === "decrease" ? (
                <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-lg flex items-center gap-0.5 justify-end">
                  <ArrowDownRight className="w-3 h-3" /> -{companiesChange.percent}%
                </span>
              ) : (
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg">
                  Estável
                </span>
              )}
              <span className="text-[8px] text-slate-400 font-bold uppercase block mt-1">Captação</span>
            </div>
          </div>
        </div>

        {/* KPI 3: GHEs / SETORES ANALISADOS */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-2xs space-y-4 text-left flex flex-col justify-between h-40">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-450 font-black uppercase tracking-wider block">GHEs / Setores Mapeados</span>
              <Layers className="w-4.5 h-4.5 text-amber-500 bg-amber-50 p-1 rounded-lg" />
            </div>
            
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-800 font-mono">
                {currentMonthData.sectorsCount}
              </span>
              <span className="text-[11px] text-slate-400 font-semibold">
                vs {prevMonthData.sectorsCount}
              </span>
            </div>
          </div>

          {/* Sparkline & Indicator */}
          <div className="flex items-end justify-between gap-2 border-t border-slate-50 pt-3">
            <div className="w-24 h-8 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sparklineSectors.map(x => ({ val: x.sectorsCount }))}>
                  <Line type="monotone" dataKey="val" stroke="#f59e0b" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            <div className="text-right">
              {sectorsChange.status === "increase" ? (
                <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg flex items-center gap-0.5 justify-end">
                  <ArrowUpRight className="w-3 h-3" /> +{sectorsChange.percent}%
                </span>
              ) : sectorsChange.status === "decrease" ? (
                <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-lg flex items-center gap-0.5 justify-end">
                  <ArrowDownRight className="w-3 h-3" /> -{sectorsChange.percent}%
                </span>
              ) : (
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg">
                  Estável
                </span>
              )}
              <span className="text-[8px] text-slate-400 font-bold uppercase block mt-1">Mapeamentos</span>
            </div>
          </div>
        </div>

        {/* KPI 4: VIDAS MONITORADAS */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-2xs space-y-4 text-left flex flex-col justify-between h-40">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-450 font-black uppercase tracking-wider block">Vidas / Colaboradores Cobertos</span>
              <Users className="w-4.5 h-4.5 text-violet-500 bg-violet-50 p-1 rounded-lg" />
            </div>
            
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-800 font-mono">
                {currentMonthData.employeesCount}
              </span>
              <span className="text-[11px] text-slate-400 font-semibold">
                vs {prevMonthData.employeesCount}
              </span>
            </div>
          </div>

          {/* Sparkline & Indicator */}
          <div className="flex items-end justify-between gap-2 border-t border-slate-50 pt-3">
            <div className="w-24 h-8 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sparklineEmployees.map(x => ({ val: x.employeesCount }))}>
                  <Line type="monotone" dataKey="val" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            <div className="text-right">
              {employeesChange.status === "increase" ? (
                <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg flex items-center gap-0.5 justify-end">
                  <ArrowUpRight className="w-3 h-3" /> +{employeesChange.percent}%
                </span>
              ) : employeesChange.status === "decrease" ? (
                <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-lg flex items-center gap-0.5 justify-end">
                  <ArrowDownRight className="w-3 h-3" /> -{employeesChange.percent}%
                </span>
              ) : (
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg">
                  Estável
                </span>
              )}
              <span className="text-[8px] text-slate-400 font-bold uppercase block mt-1">Impacto</span>
            </div>
          </div>
        </div>

      </div>

      {/* CORE BUSINESS METRIC CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* MONTHLY PRODUCTION AREA CHART */}
        <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-100 shadow-xs lg:col-span-8 space-y-4">
          <div className="text-left space-y-0.5">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <TrendingUp className="w-4.5 h-4.5 text-slate-650" />
              Evolução Operacional (Últimos Meses)
            </h3>
            <p className="text-[11px] text-slate-450 font-medium">Progressão histórica de laudos emitidos e faturamento potencial em termos de volume de vidas atendidas.</p>
          </div>

          <div className="h-72 w-full">
            {monthlyStats.listAsc.length === 0 ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-450 italic text-xs bg-slate-50 rounded-xl border border-slate-100">
                Nenhum relatório cadastrado para traçar o gráfico.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyStats.listAsc} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorReports" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorEmployees" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis 
                    dataKey="monthLabelShort" 
                    tickLine={false} 
                    tick={{ fill: '#475569', fontSize: 10, fontWeight: 'bold' }} 
                  />
                  <YAxis 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 10 }} 
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff' }} 
                    labelClassName="font-extrabold text-xs text-amber-300 mb-1"
                  />
                  <Area 
                    type="monotone" 
                    name="Laudos Concluídos" 
                    dataKey="reportsCount" 
                    stroke="#3b82f6" 
                    strokeWidth={2.5} 
                    fillOpacity={1} 
                    fill="url(#colorReports)" 
                  />
                  <Area 
                    type="monotone" 
                    name="Vidas Cobertas" 
                    dataKey="employeesCount" 
                    stroke="#8b5cf6" 
                    strokeWidth={1.5} 
                    fillOpacity={0.4} 
                    fill="url(#colorEmployees)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* TEAM & OPERATIONAL CAPABILITY BOX */}
        <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-100 shadow-xs lg:col-span-4 flex flex-col justify-between space-y-6 text-left">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <Briefcase className="w-4.5 h-4.5 text-slate-600" />
              Capacidade de Atendimento
            </h3>
            <p className="text-[11px] text-slate-450 font-medium">Recursos técnicos cadastrados na assessoria de SST.</p>
          </div>

          <div className="space-y-4 flex-1 flex flex-col justify-center">
            {/* Registered Companies (Total) */}
            <div className="flex items-center justify-between p-3.5 bg-slate-50/50 rounded-xl border border-slate-100">
              <div className="space-y-0.5">
                <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider block">Empresas Clientes Totais</span>
                <span className="text-xs font-extrabold text-slate-700">Contratos na Carteira</span>
              </div>
              <span className="text-xl font-black text-slate-800 font-mono">{companiesCount}</span>
            </div>

            {/* Registered Professionals (Total) */}
            <div className="flex items-center justify-between p-3.5 bg-slate-50/50 rounded-xl border border-slate-100">
              <div className="space-y-0.5">
                <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider block">Profissionais Cadastrados</span>
                <span className="text-xs font-extrabold text-slate-700">Técnicos & Engenheiros</span>
              </div>
              <span className="text-xl font-black text-slate-800 font-mono">{professionalsCount}</span>
            </div>
          </div>

          <div className="text-[10px] text-slate-450 leading-relaxed pt-3 border-t border-slate-100 font-medium">
            💡 <strong>Dica de Produtividade:</strong> Mantenha os profissionais técnicos e as empresas atualizadas no menu "Cadastros Gerais" para preenchimento ágil de novos relatórios.
          </div>
        </div>

      </div>

      {/* MONTHLY LEDGER TABLE */}
      <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-100 shadow-xs text-left">
        <div className="border-b border-slate-100 pb-3 mb-4">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">
            Livro de Produtividade Mensal (Consolidado)
          </h3>
          <p className="text-xs text-slate-450 mt-0.5">
            Visão detalhada mês a mês do desempenho comercial e cobertura técnica do seu negócio.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[10px] text-slate-400 font-extrabold uppercase tracking-widest bg-slate-50/50">
                <th className="py-3 px-4">Período / Mês</th>
                <th className="py-3 px-4 text-center">Laudos Concluídos</th>
                <th className="py-3 px-4 text-center">Empresas Clientes</th>
                <th className="py-3 px-4 text-center">Setores / GHEs Mapeados</th>
                <th className="py-3 px-4 text-center">Vidas Cobertas</th>
                <th className="py-3 px-4 text-center">Densidade Média (Vidas/Laudo)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {monthlyStats.listDesc.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-450 italic">
                    Nenhum relatório lançado no sistema para gerar o livro de faturamento.
                  </td>
                </tr>
              ) : (
                monthlyStats.listDesc.map((m, idx) => {
                  const density = m.reportsCount > 0 ? Math.round(m.employeesCount / m.reportsCount) : 0;
                  return (
                    <tr key={idx} className="hover:bg-slate-50/50 transition font-medium">
                      <td className="py-3.5 px-4 font-bold text-slate-800">{m.monthLabel}</td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-700">{m.reportsCount}</td>
                      <td className="py-3.5 px-4 text-center font-mono text-slate-650">{m.companiesCount}</td>
                      <td className="py-3.5 px-4 text-center font-mono text-slate-650">{m.sectorsCount}</td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-700">{m.employeesCount}</td>
                      <td className="py-3.5 px-4 text-center font-mono text-slate-500">
                        {density > 0 ? `${density} colab.` : "-"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
