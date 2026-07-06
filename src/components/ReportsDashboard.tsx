/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from "react";
import { Report } from "../types";
import { DEFAULT_CHAPTERS, DEFAULT_FINAL_CONSIDERATIONS } from "../defaultChapters";
import { FolderHeart, Plus, FileText, Trash2, Copy, Download, Upload, AlertTriangle, ShieldCheck, ChevronRight, Cloud } from "lucide-react";

interface ReportsDashboardProps {
  reports: Report[];
  onSelectReport: (id: string) => void;
  onCreateReport: (newReport: Report) => void;
  onDeleteReport: (id: string) => void;
  onUpdateAllReports: (reports: Report[]) => void;
  defaultCoverImage?: string;
}

export const ReportsDashboard: React.FC<ReportsDashboardProps> = ({
  reports,
  onSelectReport,
  onCreateReport,
  onDeleteReport,
  onUpdateAllReports,
  defaultCoverImage,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [reportToDelete, setReportToDelete] = useState<string | null>(null);
  const [reportSearchQuery, setReportSearchQuery] = useState("");

  const handleCreateNewReport = () => {
    const newReport: Report = {
      id: "rep-" + Date.now(),
      companyName: "Nova Empresa S/A",
      cnpj: "",
      coverImage: defaultCoverImage || "",
      dateStart: new Date().toISOString().split("T")[0],
      dateEnd: new Date().toISOString().split("T")[0],
      professionalName: "",
      professionalRole: "Técnico de Segurança do Trabalho",
      professionalReg: "",
      sectors: [],
      riskInventory: [],
      chapters: { ...DEFAULT_CHAPTERS },
      finalConsiderations: DEFAULT_FINAL_CONSIDERATIONS,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onCreateReport(newReport);
  };

  const handleDuplicateReport = (reportToCopy: Report, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering row selection

    const duplicated: Report = {
      ...reportToCopy,
      id: "rep-" + Date.now(),
      companyName: `${reportToCopy.companyName} (Cópia)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // Deep copy sectors
      sectors: reportToCopy.sectors.map((s) => ({
        ...s,
        id: "sector-" + Math.random(),
      })),
      // Deep copy inventory items and adjust sector associations
      riskInventory: reportToCopy.riskInventory.map((item) => ({
        ...item,
        id: "inv-" + Math.random(),
      })),
    };

    onCreateReport(duplicated);
  };

  const handleDeleteReport = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid selecting row
    setReportToDelete(id);
  };

  // Export report as a JSON file
  const handleExportReport = (report: Report, e: React.MouseEvent) => {
    e.stopPropagation();
    const jsonString = JSON.stringify(report, null, 2);
    const blob = new Blob([jsonString], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", url);
    downloadAnchor.setAttribute("download", `Relatorio_Psicossocial_${report.companyName.replace(/\s+/g, "_")}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    // Delay revocation slightly so the browser triggers the download successfully
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 100);
  };

  // Trigger JSON file input upload
  const handleTriggerImport = () => {
    fileInputRef.current?.click();
  };

  // Handle JSON file parsing and importing
  const handleImportReport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedReport = JSON.parse(event.target?.result as string) as Report;
        
        // Basic schema validation
        if (!importedReport.id || !importedReport.companyName || !Array.isArray(importedReport.sectors)) {
          alert("Erro: O arquivo selecionado não é um backup de relatório SST válido ou está corrompido.");
          return;
        }

        // Adjust ID to prevent collisions
        importedReport.id = "rep-imported-" + Date.now();
        importedReport.companyName = `${importedReport.companyName} (Importado)`;
        
        onUpdateAllReports([importedReport, ...reports]);
        alert("Relatório importado com sucesso!");
      } catch (err) {
        alert("Erro ao ler o arquivo JSON. Certifique-se de selecionar um backup válido.");
      }
    };
    reader.readAsText(file);
    // Reset file input value so same file can be uploaded again
    e.target.value = "";
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    const parts = dateStr.split("T")[0].split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  return (
    <div className="space-y-6" id="reports-dashboard">
      {/* Intro Header Section */}
      <div className="bg-slate-50 border border-slate-150 p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl text-left">
          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-slate-200 text-slate-800 font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider">
              Diagnóstico Psicossocial
            </span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Gestão de Diagnósticos e Relatórios de Riscos Psicossociais
          </h2>
          <p className="text-slate-600 text-xs leading-relaxed">
            Sistema profissional para elaborar e gerenciar relatórios e diagnósticos dos fatores de riscos psicossociais, utilizando a metodologia científica do <strong>COPSOQ II – BR</strong> em atendimento às diretrizes da <strong>NR-01 (GRO/PGR)</strong>.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 shrink-0">
          <button
            onClick={handleCreateNewReport}
            className="flex items-center justify-center gap-1.5 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 px-6 py-3 rounded-xl transition cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" /> Novo Relatório
          </button>
        </div>
      </div>

      {/* Tabela / Lista de Relatórios */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-400" />
            Seus Relatórios Arquivados ({reports.length})
          </h3>
          <input
            type="text"
            placeholder="Buscar por empresa, CNPJ, responsável..."
            value={reportSearchQuery}
            onChange={(e) => setReportSearchQuery(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-800 focus:ring-2 focus:ring-slate-400 focus:border-slate-400 outline-none w-full sm:w-64"
          />
        </div>

        {reports.length === 0 ? (
          <div className="p-16 text-center space-y-4">
            <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto">
              <FolderHeart className="w-8 h-8" />
            </div>
            <div className="max-w-md mx-auto space-y-2">
              <h4 className="font-bold text-slate-800">Nenhum relatório elaborado ainda</h4>
              <p className="text-xs text-slate-500">
                Comece clicando em <strong>Novo Relatório</strong> no topo ou importe um arquivo JSON existente para alimentar o sistema.
              </p>
            </div>
          </div>
        ) : (() => {
          const filteredReports = reports.filter((report) => {
            const query = reportSearchQuery.toLowerCase().trim();
            if (!query) return true;
            return (
              report.companyName.toLowerCase().includes(query) ||
              (report.cnpj || "").toLowerCase().includes(query) ||
              (report.professionalName || "").toLowerCase().includes(query)
            );
          });

          if (filteredReports.length === 0) {
            return (
              <p className="text-sm text-slate-450 italic text-center py-12">
                Nenhum relatório corresponde à sua busca.
              </p>
            );
          }

          return (
            <div className="divide-y divide-slate-100">
              {filteredReports.map((report) => (
                <div
                  key={report.id}
                  onClick={() => onSelectReport(report.id)}
                  className="p-5 hover:bg-slate-50/50 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer border-l-4 border-transparent hover:border-slate-800"
                >
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-bold text-slate-800 hover:text-slate-900 transition text-sm">
                        {report.companyName}
                      </h4>
                      {report.cnpj && (
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                          CNPJ: {report.cnpj}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 font-medium">
                      <span className="flex items-center gap-1">
                        Responsável: {report.professionalName || <span className="italic text-slate-400">Não cadastrado</span>}
                      </span>
                      <span className="text-slate-300">|</span>
                      <span>Setores: {report.sectors.length}</span>
                      <span className="text-slate-300">|</span>
                      <span>Itens no Inventário: {report.riskInventory.length}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 self-end md:self-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mr-2 text-right">
                      Criado em:<br />
                      <span className="font-mono text-slate-500 lowercase">{formatDate(report.createdAt)}</span>
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => handleDuplicateReport(report, e)}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        title="Duplicar Relatório"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteReport(report.id, e)}
                        className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Excluir Relatório"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <ChevronRight className="w-5 h-5 text-slate-300" />
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </div>

      {/* Info Boxes / Rodapé Técnico */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-sky-50 border border-sky-100 p-5 rounded-2xl flex gap-3 text-xs text-sky-850">
          <ShieldCheck className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h5 className="font-bold uppercase tracking-wider text-[10px]">Adequação Legal (NR-01 / GRO)</h5>
            <p className="leading-relaxed">
              Este sistema foi desenvolvido em estrita conformidade com as exigências técnicas da nova <strong>NR-01 (MTE)</strong>. O laudo gerado integra-se de forma direta como anexo técnico no PGR (Programa de Gerenciamento de Riscos).
            </p>
          </div>
        </div>

        <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-2xl flex gap-3 text-xs text-emerald-850">
          <Cloud className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h5 className="font-bold uppercase tracking-wider text-[10px] text-emerald-950">Sincronização em Tempo Real</h5>
            <p className="leading-relaxed text-emerald-900">
              Todas as alterações realizadas em laudos, empresas ou profissionais são salvas de forma segura e instantânea no banco de dados em nuvem. Outros usuários credenciados verão as atualizações em tempo real em qualquer dispositivo.
            </p>
          </div>
        </div>
      </div>

      {/* Custom Delete Confirmation Modal */}
      {reportToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-150 p-6 max-w-sm w-full shadow-xl space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Excluir Relatório?</h4>
                <p className="text-xs text-slate-500">Esta ação não poderá ser desfeita.</p>
              </div>
            </div>
            
            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-150">
              Você tem certeza que deseja excluir o relatório de <strong>{reports.find(r => r.id === reportToDelete)?.companyName || "este cliente"}</strong> permanentemente?
            </p>
            
            <div className="flex items-center gap-2.5 justify-end">
              <button
                onClick={() => setReportToDelete(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  onDeleteReport(reportToDelete);
                  setReportToDelete(null);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-500 hover:bg-rose-600 rounded-lg shadow-sm transition cursor-pointer"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
