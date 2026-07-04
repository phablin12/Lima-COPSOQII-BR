/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Report, COPSOQ_DIMENSIONS, getDimensionRating } from "../types";
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import { 
  TrendingUp, 
  Users, 
  Building2, 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  BarChart4, 
  ShieldAlert,
  Flame,
  PieChart as PieIcon,
  Shield,
  Phone,
  Upload,
  Check
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
  onUpdateAssessor: (newAssessor: {
    fantasyName: string;
    socialName: string;
    cnpj: string;
    address: string;
    phone: string;
    logo: string;
  }) => void;
}

export const ManagementDashboard: React.FC<ManagementDashboardProps> = ({ 
  reports, 
  companiesCount, 
  professionalsCount,
  assessor,
  onUpdateAssessor
}) => {
  // 1. Calculate General Metrics
  const totalReports = reports.length;
  const totalSectors = reports.reduce((sum, r) => sum + r.sectors.length, 0);
  const totalRisksMapped = reports.reduce((sum, r) => sum + r.riskInventory.length, 0);
  
  // Count risks by status
  let pendingActions = 0;
  let inProgressActions = 0;
  let completedActions = 0;

  reports.forEach(r => {
    r.riskInventory.forEach(item => {
      if (item.status === "Concluído") completedActions++;
      else if (item.status === "Em Andamento") inProgressActions++;
      else pendingActions++;
    });
  });

  // 2. Generate monthly development data
  // Aggregate report creations by month (last 6 months)
  const getMonthlyAggrData = () => {
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const now = new Date();
    const last6Months = [];
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      last6Months.push({
        monthIndex: d.getMonth(),
        year: d.getFullYear(),
        monthLabel: `${months[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`,
        Laudos: 0,
        Riscos: 0
      });
    }

    reports.forEach(r => {
      const rDate = new Date(r.createdAt || Date.now());
      const rMonth = rDate.getMonth();
      const rYear = rDate.getFullYear();
      
      const bucket = last6Months.find(m => m.monthIndex === rMonth && m.year === rYear);
      if (bucket) {
        bucket.Laudos++;
        bucket.Riscos += r.riskInventory.length;
      }
    });

    // If no reports exist yet, populate with subtle default mock values for display preview
    const hasData = last6Months.some(m => m.Laudos > 0);
    if (!hasData) {
      last6Months[1].Laudos = 1; last6Months[1].Riscos = 2;
      last6Months[2].Laudos = 2; last6Months[2].Riscos = 4;
      last6Months[3].Laudos = 1; last6Months[3].Riscos = 3;
      last6Months[4].Laudos = 3; last6Months[4].Riscos = 8;
      last6Months[5].Laudos = totalReports || 2; last6Months[5].Riscos = totalRisksMapped || 5;
    }

    return last6Months;
  };

  const monthlyChartData = getMonthlyAggrData();

  // 3. Aggregate Risk distribution by priority levels
  let highPriorityCount = 0;
  let mediumPriorityCount = 0;
  let lowPriorityCount = 0;

  reports.forEach(r => {
    r.riskInventory.forEach(item => {
      if (item.priority === "Alta") highPriorityCount++;
      else if (item.priority === "Média") mediumPriorityCount++;
      else lowPriorityCount++;
    });
  });

  const priorityData = [
    { name: "Prioridade Alta", value: highPriorityCount || (totalRisksMapped ? 0 : 2), color: "#f43f5e" },
    { name: "Prioridade Média", value: mediumPriorityCount || (totalRisksMapped ? 0 : 5), color: "#f59e0b" },
    { name: "Prioridade Baixa", value: lowPriorityCount || (totalRisksMapped ? 0 : 3), color: "#3b82f6" }
  ];

  // 4. Critical Sectors Ranking (sectors with highest psychosocial scores)
  const getCriticalSectors = () => {
    const list: { sectorName: string; companyName: string; scoreSum: number; criticalCount: number }[] = [];

    reports.forEach(r => {
      r.sectors.forEach(s => {
        let criticalCount = 0;
        let scoreSum = 0;

        COPSOQ_DIMENSIONS.forEach(d => {
          const score = s.scores[d.key] ?? 0;
          if (score > 0) {
            const rating = getDimensionRating(score, d.type);
            scoreSum += score;
            if (rating.rating === "Desfavorável") {
              criticalCount++;
            }
          }
        });

        if (scoreSum > 0) {
          list.push({
            sectorName: s.name,
            companyName: r.companyName,
            scoreSum,
            criticalCount
          });
        }
      });
    });

    // Sort by most critical dimensions first
    return list.sort((a, b) => b.criticalCount - a.criticalCount || b.scoreSum - a.scoreSum).slice(0, 5);
  };

  const criticalSectors = getCriticalSectors();

  return (
    <div className="space-y-6" id="management-dashboard-view">
      {/* Intro Header */}
      <div className="bg-slate-800 text-white p-6 md:p-8 rounded-3xl relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5 z-10">
          <span className="text-[10px] bg-slate-700 text-amber-300 font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
            Painel Estratégico
          </span>
          <h2 className="text-2xl font-black md:text-3xl tracking-tight leading-none">
            Análise de Desenvolvimento Mensal
          </h2>
          <p className="text-xs text-slate-300 max-w-xl">
            Visão gerencial consolidada das empresas clientes, progressão mensal de elaboração e criticidade de riscos de SST.
          </p>
        </div>
        <div className="p-3 bg-slate-700/40 rounded-2xl z-10 border border-slate-700/60 hidden md:block">
          <BarChart4 className="w-10 h-10 text-amber-300" />
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-700">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Empresas Atendidas</span>
            <span className="text-2xl font-black text-slate-800 font-mono">
              {companiesCount || reports.map(r => r.companyName).filter((val, idx, self) => self.indexOf(val) === idx).length}
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-700">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Laudos Emitidos</span>
            <span className="text-2xl font-black text-slate-800 font-mono">{totalReports}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-700">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">GHEs Monitorados</span>
            <span className="text-2xl font-black text-slate-800 font-mono">{totalSectors}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-700">
            <AlertTriangle className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Riscos Mapeados</span>
            <span className="text-2xl font-black text-slate-800 font-mono">{totalRisksMapped}</span>
          </div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Development Monthly Progress */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-slate-500" />
              Volume Mensal de Desenvolvimento de Laudos
            </h3>
            <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-bold font-mono">Últimos 6 meses</span>
          </div>
          
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="monthLabel" tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff' }} 
                  labelClassName="font-bold text-xs"
                />
                <Bar dataKey="Laudos" fill="#1e293b" radius={[4, 4, 0, 0]} barSize={35} name="Laudos Elaborados" />
                <Bar dataKey="Riscos" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={12} name="Riscos Mapeados" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Priority Pie Distribution */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs lg:col-span-4 flex flex-col justify-between space-y-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-slate-500" />
              Severidade das Medidas
            </h3>
            <p className="text-[11px] text-slate-400 font-medium">Divisão de prioridade de prazos do plano de ação.</p>
          </div>

          <div className="h-44 flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={priorityData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {priorityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            
            <div className="absolute text-center">
              <span className="text-xs text-slate-400 font-bold block uppercase">Total</span>
              <span className="text-xl font-black text-slate-800 font-mono">
                {totalRisksMapped || 10}
              </span>
            </div>
          </div>

          {/* Custom Legends */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
            {priorityData.map((p, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                  <span className="text-slate-600 font-medium">{p.name}</span>
                </div>
                <span className="font-extrabold text-slate-800 font-mono">{p.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Section: Risk Concentration Hotspot & Action Plan Track */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Concentração de Riscos por Setor */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs lg:col-span-6 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <Flame className="w-4.5 h-4.5 text-rose-500 animate-pulse" />
              Setores com Maior Foco de Risco Psicossocial
            </h3>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">GES/GHEs ordenados pelo número de dimensões desfavoráveis em campo.</p>
          </div>

          <div className="space-y-3">
            {criticalSectors.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 italic">
                Nenhum setor com dimensões críticas detectado até o momento.
              </div>
            ) : (
              criticalSectors.map((s, idx) => (
                <div key={idx} className="p-3 bg-slate-50/50 rounded-xl border border-slate-100/80 flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block leading-none">{s.companyName}</span>
                    <strong className="text-slate-800 text-xs">{s.sectorName}</strong>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-rose-50 text-rose-800 border border-rose-200 font-extrabold px-2.5 py-1 rounded-lg">
                      {s.criticalCount} Dimensões Críticas
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Status Tracker do Plano de Ação */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs lg:col-span-6 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500" />
              Status de Implantação do Plano de Ação
            </h3>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">Evolução do cumprimento das medidas preventivas em tempo real.</p>
          </div>

          <div className="space-y-4">
            {/* ProgressBar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold text-slate-600">
                <span>Taxa de Resolução</span>
                <span className="font-mono">
                  {totalRisksMapped > 0 ? Math.round((completedActions / totalRisksMapped) * 100) : 0}%
                </span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
                <div 
                  className="bg-emerald-500 transition-all duration-500"
                  style={{ width: `${totalRisksMapped > 0 ? (completedActions / totalRisksMapped) * 100 : 0}%` }}
                />
                <div 
                  className="bg-amber-400 transition-all duration-500"
                  style={{ width: `${totalRisksMapped > 0 ? (inProgressActions / totalRisksMapped) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Breakdown Status Card Grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-center space-y-1">
                <span className="text-[9px] font-bold text-slate-400 tracking-wider block uppercase">Concluídos</span>
                <span className="text-base font-black text-emerald-600 font-mono">{completedActions}</span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-center space-y-1">
                <span className="text-[9px] font-bold text-slate-400 tracking-wider block uppercase">Em Andamento</span>
                <span className="text-base font-black text-amber-500 font-mono">{inProgressActions}</span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-center space-y-1">
                <span className="text-[9px] font-bold text-slate-400 tracking-wider block uppercase">Pendentes</span>
                <span className="text-base font-black text-slate-500 font-mono">{pendingActions}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dados da Empresa Avaliadora (Lima Engenharia) */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Shield className="w-5 h-5 text-slate-600" />
              Dados da Empresa Avaliadora (Consultoria de SST)
            </h3>
            <p className="text-xs text-slate-400">
              Configure as informações da sua assessoria de segurança do trabalho para exibição nos relatórios e laudos finais.
            </p>
          </div>
          <span className="text-[10px] font-black uppercase bg-slate-100 text-slate-600 px-3 py-1 rounded-full border border-slate-200">
            Sua Assinatura
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Nome Fantasia</label>
            <input
              type="text"
              value={assessor.fantasyName}
              onChange={(e) => onUpdateAssessor({ ...assessor, fantasyName: e.target.value })}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-400 outline-none text-sm text-slate-800 bg-white"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Razão Social</label>
            <input
              type="text"
              value={assessor.socialName}
              onChange={(e) => onUpdateAssessor({ ...assessor, socialName: e.target.value })}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-400 outline-none text-sm text-slate-800 bg-white"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">CNPJ</label>
            <input
              type="text"
              value={assessor.cnpj}
              onChange={(e) => onUpdateAssessor({ ...assessor, cnpj: e.target.value })}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-400 outline-none text-sm text-slate-800 bg-white"
            />
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Endereço Completo</label>
            <input
              type="text"
              value={assessor.address}
              onChange={(e) => onUpdateAssessor({ ...assessor, address: e.target.value })}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-400 outline-none text-sm text-slate-800 bg-white"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Contato / Telefone</label>
            <input
              type="text"
              value={assessor.phone}
              onChange={(e) => onUpdateAssessor({ ...assessor, phone: e.target.value })}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-400 outline-none text-sm text-slate-800 bg-white"
            />
          </div>
        </div>

        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col sm:flex-row items-center gap-4">
          {assessor.logo ? (
            <div className="relative w-16 h-16 border border-slate-200 rounded-xl overflow-hidden bg-white flex items-center justify-center shrink-0 shadow-2xs">
              <img src={assessor.logo} alt="Logo Assessora" className="max-w-full max-h-full object-contain" />
              <button
                type="button"
                onClick={() => onUpdateAssessor({ ...assessor, logo: "" })}
                className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity text-xs cursor-pointer font-bold"
              >
                Remover
              </button>
            </div>
          ) : (
            <label className="w-16 h-16 border-2 border-dashed border-slate-200 hover:border-slate-400 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors bg-white shrink-0">
              <Upload className="w-5 h-5 text-slate-400" />
              <span className="text-[8px] text-slate-400 font-extrabold uppercase mt-1">Logo</span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const r = new FileReader();
                    r.onloadend = () => {
                      onUpdateAssessor({ ...assessor, logo: r.result as string });
                    };
                    r.readAsDataURL(file);
                  }
                }}
                className="hidden"
              />
            </label>
          )}
          <div className="text-xs text-slate-500 space-y-1 leading-tight text-center sm:text-left">
            <span className="font-bold text-slate-700 block">Sua Logomarca (Aparece no canto superior esquerdo do sistema)</span>
            Carregue sua logo nos formatos JPG/PNG. Ela também será inserida ao lado da logo do cliente nos cabeçalhos de todas as páginas do relatório final do laudo.
          </div>
        </div>
      </div>
    </div>
  );
};
