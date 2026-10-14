/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Report, Assessor } from "../types";
import { PROBABILITY_LEVELS, SEVERITY_LEVELS, getMatrixCell } from "../matrixUtils";

export interface HtmlRenderOptions {
  autoPrint?: boolean;
  showToolbar?: boolean;
}

export function escapeHtml(str: any): string {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "-";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

function replaceVariables(text: string, report: Report, assessor?: any): string {
  if (!text) return "";
  let result = text;
  const activeAssessor = report.evaluator || assessor;

  const variables: Record<string, string> = {
    "{empresa_cliente}": report.companyName || "",
    "{cnpj_cliente}": report.cnpj || "",
    "{endereco_cliente}": report.companyAddress || "",
    "{cidade_cliente}": report.companyCity || "",
    "{estado_cliente}": report.companyState || "",
    "{data_inicio}": formatDate(report.dateStart),
    "{data_fim}": formatDate(report.dateEnd),
    "{profissional_nome}": report.professionalName || "",
    "{profissional_cargo}": report.professionalRole || "",
    "{profissional_registro}": report.professionalReg || "",
    "{empresa_assessora}": activeAssessor?.fantasyName || "",
    "{cnpj_assessora}": activeAssessor?.cnpj || "",
    "{responsavel_legal}": activeAssessor?.legalResponsible || "",
    "{responsavel_tecnico}": activeAssessor?.technicalResponsible || "",
  };

  Object.entries(variables).forEach(([key, val]) => {
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    result = result.replace(new RegExp(escapedKey, "g"), val);
  });

  return result;
}

function formatParagraphs(text: string, report: Report, assessor?: any): string {
  if (!text) return "<p class='empty-text'>Não informado.</p>";
  const resolved = replaceVariables(text, report, assessor);
  const paragraphs = resolved.split(/\n+/).map(p => p.trim()).filter(Boolean);
  
  if (paragraphs.length === 0) return "<p class='empty-text'>Não informado.</p>";

  return paragraphs
    .map(p => {
      const isList = /^(?:\d+\.|\*|-|•|a\)|b\)|c\))/i.test(p);
      const style = isList ? "padding-left: 1.25rem; text-indent: 0;" : "";
      return `<p class="doc-paragraph" style="${style}">${escapeHtml(p)}</p>`;
    })
    .join("");
}

export function generateReportHtml(
  report: Report,
  assessor: Assessor,
  options: HtmlRenderOptions = {}
): string {
  const activeAssessor = report.evaluator || assessor;
  const autoPrint = !!options.autoPrint;
  const showToolbar = options.showToolbar !== false;

  const companyName = report.companyFantasyName || report.companyName || "Empresa";
  const emissionDateFormatted = (() => {
    const months = [
      "janeiro", "fevereiro", "março", "abril", "maio", "junho",
      "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
    ];
    const d = new Date();
    return `Tangará da Serra - MT, ${d.getDate()} de ${months[d.getMonth()]} de ${d.getFullYear()}`;
  })();

  const fullAddress = [
    report.companyAddress,
    report.companyNeighborhood,
    [report.companyCity, report.companyState].filter(Boolean).join(" - "),
    report.companyCep ? `CEP: ${report.companyCep}` : ""
  ].filter(Boolean).join(", ");

  const totalEmployees = report.sectors.reduce((sum, s) => sum + (s.employeeCount || 0), 0) || report.totalEmployees || 0;

  const isRiskInSector = (item: { sectorId?: string }, sector: { id: string; name: string }) => {
    if (!item.sectorId) return false;
    const sId = item.sectorId.trim().toLowerCase();
    return sId === sector.id.trim().toLowerCase() || sId === sector.name.trim().toLowerCase();
  };

  const getPriorityBadgeClass = (priority?: string) => {
    switch (priority) {
      case "Alta": return "badge-priority-alta";
      case "Média": return "badge-priority-media";
      case "Baixa": return "badge-priority-baixa";
      default: return "badge-priority-baixa";
    }
  };

  const getStatusBadgeClass = (status?: string) => {
    switch (status) {
      case "Concluído": return "badge-status-concluido";
      case "Em Andamento": return "badge-status-andamento";
      default: return "badge-status-pendente";
    }
  };

  const getRiskColorHex = (color?: string) => {
    switch (color) {
      case "red": return "#e11d48";
      case "orange": return "#ea580c";
      case "yellow": return "#ca8a04";
      case "blue": return "#2563eb";
      default: return "#059669";
    }
  };

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Diagnóstico dos Fatores de Riscos Psicossociais • ${escapeHtml(companyName)}</title>
  <style>
    /* ==========================================================================
       RESET & BASE TYPOGRAPHY
       ========================================================================== */
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    html {
      font-size: 13px;
      background-color: #f1f5f9;
      color: #0f172a;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
    }

    body {
      background-color: #f1f5f9;
      color: #0f172a;
      line-height: 1.5;
    }

    /* Screen Container */
    .document-wrapper {
      max-width: 210mm;
      margin: 0 auto;
      background: #ffffff;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
      padding: 16mm 14mm;
      min-height: 297mm;
    }

    /* Floating Top Toolbar */
    .screen-toolbar {
      position: sticky;
      top: 0;
      z-index: 999;
      background: #0f172a;
      color: #ffffff;
      padding: 10px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }

    .toolbar-info {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 12px;
    }

    .toolbar-badge {
      background: #334155;
      color: #38bdf8;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 6px;
      text-transform: uppercase;
      font-size: 10px;
      letter-spacing: 0.5px;
    }

    .toolbar-title {
      font-weight: 600;
      color: #f8fafc;
    }

    .toolbar-actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .btn-print {
      background: #0284c7;
      color: #ffffff;
      border: none;
      padding: 7px 16px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 12px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: background 0.15s ease;
    }

    .btn-print:hover {
      background: #0369a1;
    }

    .btn-close {
      background: #334155;
      color: #e2e8f0;
      border: none;
      padding: 7px 14px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 12px;
      cursor: pointer;
      transition: background 0.15s ease;
    }

    .btn-close:hover {
      background: #475569;
    }

    /* ==========================================================================
       MEDIA PRINT & PAGE LAYOUT RULES
       ========================================================================== */
    @page {
      size: A4 portrait;
      margin: 14mm 12mm 14mm 12mm;
    }

    @media print {
      html, body {
        background: #ffffff !important;
        color: #0f172a !important;
        font-size: 10.5pt !important;
      }

      .screen-toolbar, .no-print {
        display: none !important;
      }

      .document-wrapper {
        max-width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        box-shadow: none !important;
      }

      thead {
        display: table-header-group !important; /* Automatic repeat on every page */
      }

      tfoot {
        display: table-footer-group !important;
      }

      tr, .avoid-break, .risk-card, .action-card, .chapter-header, .signatures-card {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }

      .page-break-before {
        page-break-before: always !important;
        break-before: page !important;
      }

      .page-break-after {
        page-break-after: always !important;
        break-after: page !important;
      }

      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    }

    /* ==========================================================================
       TABLES & COMPONENT STYLING
       ========================================================================== */
    /* Repeated Running Page Header & Footer */
    .running-header {
      border-bottom: 1.5px solid #cbd5e1;
      padding-bottom: 8px;
      margin-bottom: 18px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .running-header-logos {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .running-header-logo-img {
      max-height: 40px;
      max-width: 140px;
      object-fit: contain;
    }

    .running-header-logo-divider {
      width: 1px;
      height: 32px;
      background: #cbd5e1;
    }

    .running-header-text {
      text-align: right;
    }

    .running-header-main-title {
      font-size: 7.5pt;
      font-weight: 800;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.8px;
    }

    .running-header-sub-title {
      font-size: 8.5pt;
      font-weight: 700;
      color: #334155;
      margin-top: 2px;
    }

    .running-footer {
      border-top: 1px solid #e2e8f0;
      padding-top: 6px;
      margin-top: 18px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 7.5pt;
      color: #94a3b8;
      font-weight: 600;
    }

    /* Cover Page */
    .cover-container {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-height: 250mm;
      padding: 10mm 4mm;
      text-align: center;
    }

    .cover-top-logos {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 24px;
      margin-bottom: 20mm;
    }

    .cover-logo-img {
      max-height: 80px;
      max-width: 220px;
      object-fit: contain;
    }

    .cover-divider {
      width: 1px;
      height: 60px;
      background: #cbd5e1;
    }

    .cover-title-box {
      margin: 15mm 0;
      border-top: 3px solid #0f172a;
      border-bottom: 3px solid #0f172a;
      padding: 16mm 6mm;
    }

    .cover-category-badge {
      display: inline-block;
      background: #f1f5f9;
      color: #475569;
      font-size: 9pt;
      font-weight: 800;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      padding: 4px 14px;
      border-radius: 4px;
      margin-bottom: 12px;
      border: 1px solid #cbd5e1;
    }

    .cover-main-title {
      font-size: 20pt;
      font-weight: 900;
      color: #0f172a;
      text-transform: uppercase;
      line-height: 1.3;
      letter-spacing: 0.5px;
    }

    .cover-subtitle {
      font-size: 11pt;
      font-weight: 700;
      color: #334155;
      margin-top: 12px;
      text-transform: uppercase;
    }

    .cover-company-target {
      font-size: 15pt;
      font-weight: 900;
      color: #0284c7;
      margin-top: 14px;
    }

    .cover-footer-box {
      margin-top: 20mm;
      border-top: 1px solid #e2e8f0;
      padding-top: 12mm;
      display: flex;
      flex-direction: column;
      gap: 6px;
      font-size: 9.5pt;
      color: #475569;
    }

    .cover-footer-empresa {
      font-weight: 800;
      color: #0f172a;
      font-size: 11pt;
    }

    /* Clean Semantic Tables */
    table.clean-table {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0 20px 0;
      font-size: 9pt;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      overflow: hidden;
    }

    table.clean-table th {
      background: #f8fafc;
      color: #334155;
      font-weight: 800;
      text-transform: uppercase;
      font-size: 7.5pt;
      letter-spacing: 0.6px;
      padding: 8px 10px;
      border-bottom: 1.5px solid #cbd5e1;
      border-right: 1px solid #e2e8f0;
      text-align: left;
    }

    table.clean-table th:last-child {
      border-right: none;
    }

    table.clean-table td {
      padding: 7px 10px;
      border-bottom: 1px solid #e2e8f0;
      border-right: 1px solid #e2e8f0;
      color: #1e293b;
      vertical-align: top;
    }

    table.clean-table td:last-child {
      border-right: none;
    }

    table.clean-table tr:nth-child(even) td {
      background: #fcfdfe;
    }

    table.clean-table tr:hover td {
      background: #f8fafc;
    }

    /* Form-like Data Tables (Dados Cadastrais) */
    table.data-sheet-table {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0 20px 0;
      border: 1px solid #cbd5e1;
      font-size: 9pt;
    }

    table.data-sheet-table td {
      padding: 7px 10px;
      border: 1px solid #e2e8f0;
    }

    table.data-sheet-table .label-col {
      background: #f8fafc;
      font-weight: 800;
      color: #475569;
      font-size: 7.5pt;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      width: 25%;
    }

    table.data-sheet-table .val-col {
      color: #0f172a;
      font-weight: 600;
    }

    /* Chapter Headers */
    .chapter-box {
      margin-bottom: 24px;
    }

    .chapter-heading {
      font-size: 13pt;
      font-weight: 900;
      color: #0f172a;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 5px;
      margin-bottom: 14px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .chapter-intro {
      font-size: 9pt;
      color: #334155;
      margin-bottom: 14px;
      text-align: justify;
    }

    .doc-paragraph {
      font-size: 9.5pt;
      color: #1e293b;
      line-height: 1.6;
      text-align: justify;
      margin-bottom: 10px;
      text-indent: 1.5cm;
    }

    /* Sector Divider Banner */
    .sector-banner {
      background: #0f172a;
      color: #ffffff;
      padding: 7px 14px;
      border-radius: 6px;
      margin: 18px 0 12px 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      page-break-after: avoid !important;
      break-after: avoid !important;
    }

    .sector-banner-title {
      font-size: 9pt;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .sector-banner-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #f59e0b;
    }

    .sector-banner-count {
      font-size: 8pt;
      color: #cbd5e1;
      font-weight: 700;
      text-transform: uppercase;
    }

    /* ==========================================================================
       CHAPTER 6: INVENTÁRIO DE RISCOS GRO (FICHAS TÉCNICAS ESTRUTURADAS)
       ========================================================================== */
    .risk-sheet-card {
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      overflow: hidden;
      margin-bottom: 16px;
      background: #ffffff;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }

    .risk-sheet-header {
      background: #f1f5f9;
      border-bottom: 1px solid #cbd5e1;
      padding: 7px 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-weight: 800;
      font-size: 8pt;
      text-transform: uppercase;
      color: #334155;
      letter-spacing: 0.5px;
    }

    .risk-sheet-name-row {
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      padding: 8px 14px;
      font-size: 10pt;
      font-weight: 800;
      color: #0f172a;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .risk-sheet-name-bullet {
      width: 6px;
      height: 6px;
      background: #334155;
      border-radius: 2px;
    }

    .risk-sheet-grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      border-bottom: 1px solid #e2e8f0;
    }

    .risk-sheet-grid-2 > div {
      padding: 7px 14px;
    }

    .risk-sheet-grid-2 > div:first-child {
      border-right: 1px solid #e2e8f0;
    }

    .risk-sheet-row {
      border-bottom: 1px solid #e2e8f0;
      padding: 7px 14px;
      font-size: 8.5pt;
    }

    .risk-sheet-label {
      font-size: 7pt;
      font-weight: 800;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      display: block;
      margin-bottom: 2px;
    }

    .risk-sheet-value {
      color: #1e293b;
      font-weight: 600;
    }

    .risk-sheet-matrix-row {
      display: grid;
      grid-template-columns: 1fr 1fr 1.3fr;
      border-bottom: 1px solid #e2e8f0;
    }

    .risk-sheet-matrix-cell {
      padding: 8px 14px;
      border-right: 1px solid #e2e8f0;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    .risk-sheet-matrix-cell:last-child {
      border-right: none;
    }

    .risk-sheet-level-badge {
      color: #ffffff;
      padding: 8px 14px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      font-weight: 900;
      text-transform: uppercase;
    }

    .risk-sheet-bottom-grid {
      display: grid;
      grid-template-columns: 1.4fr 1fr;
    }

    .risk-sheet-bottom-left {
      padding: 10px 14px;
      border-right: 1px solid #e2e8f0;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 8px;
    }

    .risk-sheet-recommendation-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 8px 10px;
      font-size: 8pt;
    }

    .risk-sheet-bottom-right {
      padding: 10px 14px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: #fafafb;
    }

    /* 5x5 Matrix Mini Grid */
    .mini-matrix {
      display: grid;
      grid-template-columns: 18px repeat(5, 24px);
      gap: 2px;
      text-align: center;
      font-size: 6pt;
      font-weight: 800;
      margin-top: 4px;
    }

    .mini-matrix-header {
      color: #94a3b8;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 18px;
    }

    .mini-matrix-cell {
      height: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 2px;
      background: #e2e8f0;
      color: #64748b;
    }

    .mini-matrix-cell.active {
      font-weight: 900;
      color: #ffffff;
      box-shadow: 0 0 0 1.5px #0f172a;
    }

    /* Badges */
    .badge-priority-alta {
      background: #fee2e2;
      color: #991b1b;
      border: 1px solid #f87171;
      padding: 2px 7px;
      border-radius: 4px;
      font-weight: 800;
      font-size: 7pt;
      text-transform: uppercase;
    }

    .badge-priority-media {
      background: #fef3c7;
      color: #92400e;
      border: 1px solid #fcd34d;
      padding: 2px 7px;
      border-radius: 4px;
      font-weight: 800;
      font-size: 7pt;
      text-transform: uppercase;
    }

    .badge-priority-baixa {
      background: #dbeafe;
      color: #1e40af;
      border: 1px solid #93c5fd;
      padding: 2px 7px;
      border-radius: 4px;
      font-weight: 800;
      font-size: 7pt;
      text-transform: uppercase;
    }

    .badge-status-concluido {
      background: #d1fae5;
      color: #065f46;
      border: 1px solid #6ee7b7;
      padding: 2px 7px;
      border-radius: 4px;
      font-weight: 800;
      font-size: 7pt;
      text-transform: uppercase;
    }

    .badge-status-andamento {
      background: #e0f2fe;
      color: #0369a1;
      border: 1px solid #7dd3fc;
      padding: 2px 7px;
      border-radius: 4px;
      font-weight: 800;
      font-size: 7pt;
      text-transform: uppercase;
    }

    .badge-status-pendente {
      background: #f1f5f9;
      color: #475569;
      border: 1px solid #cbd5e1;
      padding: 2px 7px;
      border-radius: 4px;
      font-weight: 800;
      font-size: 7pt;
      text-transform: uppercase;
    }

    /* Action Plan Cards */
    .action-sheet-card {
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      overflow: hidden;
      margin-bottom: 16px;
      background: #ffffff;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }

    .action-sheet-header {
      background: #f8fafc;
      border-bottom: 1px solid #cbd5e1;
      padding: 8px 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }

    .action-sheet-body {
      padding: 12px 14px;
      display: grid;
      grid-template-columns: 1.5fr 1fr;
      gap: 14px;
      font-size: 8.5pt;
    }

    .action-detail-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 8px 10px;
      margin-top: 4px;
      font-size: 8pt;
      line-height: 1.5;
    }

    .action-meta-box {
      background: #fafafb;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    /* Signatures Section */
    .signatures-card {
      margin-top: 30px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 16px;
      background: #ffffff;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }

    .signatures-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      margin-top: 40px;
    }

    .signature-item {
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-end;
    }

    .signature-line {
      width: 85%;
      border-top: 1.5px solid #334155;
      padding-top: 8px;
      margin-top: 20px;
    }

    .signature-name {
      font-size: 9pt;
      font-weight: 800;
      color: #0f172a;
    }

    .signature-role {
      font-size: 8pt;
      color: #64748b;
      margin-top: 2px;
    }
  </style>
</head>
<body>

  ${showToolbar ? `
  <div class="screen-toolbar no-print">
    <div class="toolbar-info">
      <span class="toolbar-badge">Visualização de Impressão A4</span>
      <span class="toolbar-title">${escapeHtml(companyName)} • Diagnóstico GRO / COPSOQ II</span>
    </div>
    <div class="toolbar-actions">
      <button type="button" class="btn-print" onclick="window.print()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
        Imprimir / Salvar em PDF
      </button>
      <button type="button" class="btn-close" onclick="window.close()">
        Fechar Guia
      </button>
    </div>
  </div>
  ` : ""}

  <div class="document-wrapper">

    <!-- ======================================================================
         CAPA OFICIAL
         ====================================================================== -->
    <div class="cover-container page-break-after">
      <div class="cover-top-logos">
        ${activeAssessor?.logo ? `
          <img src="${escapeHtml(activeAssessor.logo)}" alt="Logo Assessora" class="cover-logo-img" />
        ` : `
          <div style="font-weight: 900; font-size: 14pt; color: #334155; text-transform: uppercase;">
            ${escapeHtml(activeAssessor?.fantasyName || "Lima SST")}
          </div>
        `}
        ${activeAssessor?.logo && report.companyLogo ? `<div class="cover-divider"></div>` : ""}
        ${report.companyLogo ? `
          <img src="${escapeHtml(report.companyLogo)}" alt="Logo Cliente" class="cover-logo-img" />
        ` : ""}
      </div>

      <div class="cover-title-box">
        <span class="cover-category-badge">NR-01 GRO • NR-17 ERGONOMIA • COPSOQ II</span>
        <h1 class="cover-main-title">
          DIAGNÓSTICO DOS FATORES DE RISCOS PSICOSSOCIAIS NO TRABALHO
        </h1>
        <p class="cover-subtitle">
          Inventário de Riscos Ocupacionais e Plano de Gerenciamento de Riscos (PGR)
        </p>
        <p class="cover-company-target">
          ${escapeHtml(companyName)}
        </p>
      </div>

      <div class="cover-footer-box">
        <p class="cover-footer-empresa">${escapeHtml(activeAssessor?.fantasyName || "LIMA ENGENHARIA E SEGURANÇA DO TRABALHO")}</p>
        <p>Responsável Técnico: <strong>${escapeHtml(report.professionalName || activeAssessor?.technicalResponsible || "Eng. Responsável")}</strong> ${report.professionalReg ? `(${escapeHtml(report.professionalReg)})` : ""}</p>
        <p style="margin-top: 10px; font-weight: 700;">${escapeHtml(emissionDateFormatted)}</p>
      </div>
    </div>

    <!-- ======================================================================
         PAGE 2: DADOS CADASTRAIS & SUMÁRIO EXECUTIVO
         ====================================================================== -->
    <div class="avoid-break" style="margin-top: 10px;">
      <div class="running-header">
        <div class="running-header-logos">
          ${activeAssessor?.logo ? `<img src="${escapeHtml(activeAssessor.logo)}" class="running-header-logo-img" />` : ""}
          ${activeAssessor?.logo && report.companyLogo ? `<div class="running-header-logo-divider"></div>` : ""}
          ${report.companyLogo ? `<img src="${escapeHtml(report.companyLogo)}" class="running-header-logo-img" />` : ""}
        </div>
        <div class="running-header-text">
          <div class="running-header-main-title">DIAGNÓSTICO DOS FATORES DE RISCOS PSICOSSOCIAIS</div>
          <div class="running-header-sub-title">Dados Cadastrais • ${escapeHtml(companyName)}</div>
        </div>
      </div>

      <div class="chapter-heading">Dados Cadastrais da Empresa & Estabelecimento</div>

      <table class="data-sheet-table">
        <tr>
          <td class="label-col">Razão Social</td>
          <td class="val-col">${escapeHtml(report.companyName || "-")}</td>
          <td class="label-col">Nome Fantasia</td>
          <td class="val-col">${escapeHtml(companyName)}</td>
        </tr>
        <tr>
          <td class="label-col">CNPJ</td>
          <td class="val-col">${escapeHtml(report.cnpj || "-")}</td>
          <td class="label-col">Grau de Risco</td>
          <td class="val-col">${escapeHtml(report.riskGrade || "1")}</td>
        </tr>
        <tr>
          <td class="label-col">CNAE Principal</td>
          <td class="val-col">${escapeHtml(report.cnae || "-")}</td>
          <td class="label-col">Total Colaboradores</td>
          <td class="val-col">${totalEmployees} colaboradores</td>
        </tr>
        <tr>
          <td class="label-col">Endereço Completo</td>
          <td class="val-col" colspan="3">${escapeHtml(fullAddress || "-")}</td>
        </tr>
        <tr>
          <td class="label-col">Responsável Legal</td>
          <td class="val-col">${escapeHtml(report.companyContact || "-")}</td>
          <td class="label-col">Contato / E-mail</td>
          <td class="val-col">${escapeHtml(report.companyEmail || report.companyPhone || "-")}</td>
        </tr>
      </table>

      <div class="chapter-heading" style="margin-top: 24px;">Responsabilidade Técnica da Avaliação</div>

      <table class="data-sheet-table">
        <tr>
          <td class="label-col">Profissional Técnico</td>
          <td class="val-col">${escapeHtml(report.professionalName || "-")}</td>
          <td class="label-col">Cargo / Função</td>
          <td class="val-col">${escapeHtml(report.professionalRole || "-")}</td>
        </tr>
        <tr>
          <td class="label-col">Registro Profissional</td>
          <td class="val-col">${escapeHtml(report.professionalReg || "-")}</td>
          <td class="label-col">CPF / Documento</td>
          <td class="val-col">${escapeHtml(report.professionalCpf || "-")}</td>
        </tr>
        <tr>
          <td class="label-col">Empresa Assessora</td>
          <td class="val-col">${escapeHtml(activeAssessor?.fantasyName || "Lima SST")}</td>
          <td class="label-col">CNPJ Assessoria</td>
          <td class="val-col">${escapeHtml(activeAssessor?.cnpj || "-")}</td>
        </tr>
      </table>
    </div>

    <!-- ======================================================================
         CAPÍTULO 1: INTRODUÇÃO & OBJETIVOS
         ====================================================================== -->
    <div class="chapter-box page-break-before avoid-break">
      <div class="running-header">
        <div class="running-header-logos">
          ${activeAssessor?.logo ? `<img src="${escapeHtml(activeAssessor.logo)}" class="running-header-logo-img" />` : ""}
          ${activeAssessor?.logo && report.companyLogo ? `<div class="running-header-logo-divider"></div>` : ""}
          ${report.companyLogo ? `<img src="${escapeHtml(report.companyLogo)}" class="running-header-logo-img" />` : ""}
        </div>
        <div class="running-header-text">
          <div class="running-header-main-title">DIAGNÓSTICO DOS FATORES DE RISCOS PSICOSSOCIAIS</div>
          <div class="running-header-sub-title">1. Introdução & Objetivos • ${escapeHtml(companyName)}</div>
        </div>
      </div>

      <h2 class="chapter-heading">1. Introdução e Objetivos</h2>
      ${formatParagraphs(report.chapters?.introducao || "", report, activeAssessor)}
    </div>

    <!-- ======================================================================
         CAPÍTULO 2: FUNDAMENTAÇÃO TEÓRICA
         ====================================================================== -->
    <div class="chapter-box avoid-break" style="margin-top: 24px;">
      <h2 class="chapter-heading">2. Fundamentação Teórica e Normativa</h2>
      ${formatParagraphs(report.chapters?.fundamentacao || "", report, activeAssessor)}
    </div>

    <!-- ======================================================================
         CAPÍTULO 3: METODOLOGIA DE AVALIAÇÃO
         ====================================================================== -->
    <div class="chapter-box page-break-before avoid-break">
      <div class="running-header">
        <div class="running-header-logos">
          ${activeAssessor?.logo ? `<img src="${escapeHtml(activeAssessor.logo)}" class="running-header-logo-img" />` : ""}
          ${activeAssessor?.logo && report.companyLogo ? `<div class="running-header-logo-divider"></div>` : ""}
          ${report.companyLogo ? `<img src="${escapeHtml(report.companyLogo)}" class="running-header-logo-img" />` : ""}
        </div>
        <div class="running-header-text">
          <div class="running-header-main-title">DIAGNÓSTICO DOS FATORES DE RISCOS PSICOSSOCIAIS</div>
          <div class="running-header-sub-title">3. Metodologia de Avaliação • ${escapeHtml(companyName)}</div>
        </div>
      </div>

      <h2 class="chapter-heading">3. Metodologia de Avaliação</h2>
      ${formatParagraphs(report.chapters?.metodologia || "", report, activeAssessor)}
    </div>

    <!-- ======================================================================
         CAPÍTULO 4: CARACTERIZAÇÃO DOS SETORES E POPULAÇÃO AVALIADA
         ====================================================================== -->
    <div class="chapter-box avoid-break" style="margin-top: 24px;">
      <h2 class="chapter-heading">4. Caracterização dos Setores e População Avaliada</h2>
      <p class="chapter-intro">
        Abaixo estão discriminados os setores e Grupos Homogêneos de Exposição (GHE) que compõem o escopo do diagnóstico técnico:
      </p>

      <table class="clean-table">
        <thead>
          <tr>
            <th style="width: 35%;">Setor / GHE</th>
            <th style="width: 20%; text-align: center;">Colaboradores no Setor</th>
            <th>Descrição das Atividades / Observações</th>
          </tr>
        </thead>
        <tbody>
          ${report.sectors.map(sector => `
            <tr>
              <td><strong>${escapeHtml(sector.name)}</strong></td>
              <td style="text-align: center;"><strong>${sector.employeeCount || 0}</strong></td>
              <td>${escapeHtml(sector.description || "Atividades operacionais e administrativas conforme rotina do setor.")}</td>
            </tr>
          `).join("")}
          <tr style="background: #f8fafc; font-weight: 800;">
            <td>TOTAL GERAL DA POPULAÇÃO</td>
            <td style="text-align: center;">${totalEmployees} colaboradores</td>
            <td>População total sob gestão de SST</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ======================================================================
         CAPÍTULO 5: RESULTADOS DA AVALIAÇÃO TÉCNICA
         ====================================================================== -->
    ${report.chapters?.referencias ? `
      <div class="chapter-box avoid-break" style="margin-top: 24px;">
        <h2 class="chapter-heading">5. Resultados da Análise Técnica Qualitativa</h2>
        ${formatParagraphs(report.chapters.referencias, report, activeAssessor)}
      </div>
    ` : ""}

    <!-- ======================================================================
         CAPÍTULO 6: INVENTÁRIO DE RISCOS GRO (ESTRUTURA TÉCNICA ANTERIOR)
         ====================================================================== -->
    <div class="chapter-box page-break-before">
      <div class="running-header">
        <div class="running-header-logos">
          ${activeAssessor?.logo ? `<img src="${escapeHtml(activeAssessor.logo)}" class="running-header-logo-img" />` : ""}
          ${activeAssessor?.logo && report.companyLogo ? `<div class="running-header-logo-divider"></div>` : ""}
          ${report.companyLogo ? `<img src="${escapeHtml(report.companyLogo)}" class="running-header-logo-img" />` : ""}
        </div>
        <div class="running-header-text">
          <div class="running-header-main-title">DIAGNÓSTICO DOS FATORES DE RISCOS PSICOSSOCIAIS</div>
          <div class="running-header-sub-title">6. Inventário de Riscos GRO • ${escapeHtml(companyName)}</div>
        </div>
      </div>

      <h2 class="chapter-heading">6. Inventário de Riscos Psicossociais (NR-01 GRO)</h2>
      <p class="chapter-intro">
        Abaixo estão estruturados de forma sistemática os riscos psicossociais evidenciados em campo, incluindo as fontes geradoras, as populações expostas, as medidas preventivas existentes e a respectiva avaliação de severidade e probabilidade através da matriz 5x5.
      </p>

      ${report.riskInventory.length === 0 ? `
        <p style="text-align: center; color: #94a3b8; font-style: italic; padding: 24px; border: 1px dashed #cbd5e1; border-radius: 8px;">
          Nenhum risco registrado no inventário.
        </p>
      ` : `
        ${report.sectors.map(sector => {
          const directRisks = report.riskInventory.filter(r => isRiskInSector(r, sector));
          if (directRisks.length === 0 && report.sectors.length > 1) return "";
          const sectorRisks = directRisks.length > 0 ? directRisks : report.riskInventory;
          if (sectorRisks.length === 0) return "";

          return `
            <div class="avoid-break" style="margin-top: 18px;">
              <div class="sector-banner">
                <div class="sector-banner-title">
                  <span class="sector-banner-dot"></span>
                  Setor / GHE: ${escapeHtml(sector.name)}
                </div>
                <div class="sector-banner-count">
                  ${sector.employeeCount || 0} ${(sector.employeeCount || 0) === 1 ? "colaborador no setor" : "colaboradores no setor"}
                </div>
              </div>

              ${sectorRisks.map(item => {
                const effectiveCount = item.exposedCount || sector.employeeCount || 1;
                const probObj = PROBABILITY_LEVELS[item.probability - 1];
                const sevObj = SEVERITY_LEVELS[item.severity - 1];
                const riskColor = getRiskColorHex(item.color);

                return `
                  <div class="risk-sheet-card">
                    <!-- Header -->
                    <div class="risk-sheet-header">
                      <div>INVENTÁRIO DE RISCOS PSICOSSOCIAIS - ${escapeHtml(sector.name.toUpperCase())}</div>
                    </div>

                    <!-- Row 1: Risco / Nome -->
                    <div class="risk-sheet-name-row">
                      <span class="risk-sheet-name-bullet"></span>
                      <span>${escapeHtml(item.riskName)}</span>
                    </div>

                    <!-- Row 2: Exposição -->
                    <div class="risk-sheet-grid-2">
                      <div>
                        <span class="risk-sheet-label">Trabalhadores Expostos (GHE)</span>
                        <span class="risk-sheet-value">${effectiveCount} ${effectiveCount === 1 ? "colaborador" : "colaboradores"}</span>
                      </div>
                      <div>
                        <span class="risk-sheet-label">Frequência de Exposição</span>
                        <span class="risk-sheet-value">Contínua / Habitual</span>
                      </div>
                    </div>

                    <!-- Row 3: Perigos, Fontes e Circunstâncias -->
                    <div class="risk-sheet-row">
                      <span class="risk-sheet-label">Perigos, Fontes e Circunstâncias:</span>
                      <div class="risk-sheet-value" style="font-weight: 500; margin-top: 2px;">
                        ${escapeHtml(item.sourcesField || "Não registrado.")}
                      </div>
                    </div>

                    <!-- Row 4: Metodologia -->
                    <div class="risk-sheet-row">
                      <span class="risk-sheet-label">Metodologia:</span>
                      <div class="risk-sheet-value" style="font-weight: 500; margin-top: 2px;">
                        Critério Qualitativo baseado na metodologia do COPSOQ e Matriz de Riscos Psicossociais 5x5.
                      </div>
                    </div>

                    <!-- Row 5: Medidas Administrativas / Controles Existentes -->
                    <div class="risk-sheet-row">
                      <span class="risk-sheet-label">Medidas administrativas ou de organização do trabalho (Controles Existentes):</span>
                      <div class="risk-sheet-value" style="font-weight: 500; margin-top: 2px;">
                        ${escapeHtml(item.existingControls || "Não evidenciado.")}
                      </div>
                    </div>

                    <!-- Row 6: Descrição do Agente Nocivo -->
                    <div class="risk-sheet-row">
                      <span class="risk-sheet-label">Descrição do Agente Nocivo / Fator de Risco:</span>
                      <div class="risk-sheet-value" style="font-weight: 500; margin-top: 2px;">
                        ${escapeHtml(item.riskName)} (Risco Psicossocial Organizacional)
                      </div>
                    </div>

                    <!-- Row 7: Possíveis Danos -->
                    <div class="risk-sheet-row">
                      <span class="risk-sheet-label">Possíveis danos à saúde:</span>
                      <div class="risk-sheet-value" style="font-weight: 500; margin-top: 2px;">
                        ${escapeHtml(item.possibleInjuries || "Não registrado.")}
                      </div>
                    </div>

                    ${item.diseaseHistory ? `
                      <div class="risk-sheet-row">
                        <span class="risk-sheet-label">Histórico de doenças / Queixas de adoecimento:</span>
                        <div class="risk-sheet-value" style="font-weight: 500; margin-top: 2px;">
                          ${escapeHtml(item.diseaseHistory)}
                        </div>
                      </div>
                    ` : ""}

                    <!-- Row 9: Probabilidade, Severidade, Nível -->
                    <div class="risk-sheet-matrix-row">
                      <div class="risk-sheet-matrix-cell">
                        <span class="risk-sheet-label">Probabilidade</span>
                        <span style="font-weight: 800; font-size: 8.5pt;">${escapeHtml(probObj?.label || String(item.probability))}</span>
                      </div>
                      <div class="risk-sheet-matrix-cell">
                        <span class="risk-sheet-label">Severidade</span>
                        <span style="font-weight: 800; font-size: 8.5pt;">${escapeHtml(sevObj?.label || String(item.severity))}</span>
                      </div>
                      <div class="risk-sheet-level-badge" style="background: ${riskColor};">
                        <span style="font-size: 6.5pt; opacity: 0.9; letter-spacing: 0.5px;">NÍVEL DO RISCO / PERIGO</span>
                        <span style="font-size: 8.5pt; font-weight: 900;">Nível ${item.riskLevel} (Score ${item.riskScore})</span>
                      </div>
                    </div>

                    <!-- Row 10: Estimativa e Matriz 5x5 -->
                    <div class="risk-sheet-bottom-grid">
                      <div class="risk-sheet-bottom-left">
                        <div>
                          <span class="risk-sheet-label">Estimativa:</span>
                          <span style="font-weight: 700; font-size: 8.5pt;">${escapeHtml(item.uncertainty || "Certa")}</span>
                        </div>
                        <div class="risk-sheet-recommendation-box">
                          <span class="risk-sheet-label" style="color: #475569;">Recomendação Preventiva Proposta (PGR):</span>
                          <p style="font-style: italic; font-weight: 600; color: #334155; margin-top: 2px;">"${escapeHtml(item.recommendation || "-")}"</p>
                        </div>
                      </div>

                      <div class="risk-sheet-bottom-right">
                        <span class="risk-sheet-label" style="text-align: center;">Matriz de Avaliação 5x5</span>
                        <div class="mini-matrix">
                          <div class="mini-matrix-header">S\\P</div>
                          ${[1, 2, 3, 4, 5].map(p => `<div class="mini-matrix-header">P${p}</div>`).join("")}

                          ${[5, 4, 3, 2, 1].map(s => `
                            <div class="mini-matrix-header">S${s}</div>
                            ${[1, 2, 3, 4, 5].map(p => {
                              const cell = getMatrixCell(p, s);
                              const isActive = item.probability === p && item.severity === s;
                              const cellBg = isActive ? getRiskColorHex(cell.color) : "#e2e8f0";
                              return `<div class="mini-matrix-cell ${isActive ? "active" : ""}" style="background: ${cellBg}; ${isActive ? "color: #fff;" : ""}">${cell.score}</div>`;
                            }).join("")}
                          `).join("")}
                        </div>
                      </div>
                    </div>
                  </div>
                `;
              }).join("")}
            </div>
          `;
        }).join("")}
      `}
    </div>

    <!-- ======================================================================
         CAPÍTULO 7: CRONOGRAMA GERAL E PLANO DE AÇÃO PGR
         ====================================================================== -->
    <div class="chapter-box page-break-before">
      <div class="running-header">
        <div class="running-header-logos">
          ${activeAssessor?.logo ? `<img src="${escapeHtml(activeAssessor.logo)}" class="running-header-logo-img" />` : ""}
          ${activeAssessor?.logo && report.companyLogo ? `<div class="running-header-logo-divider"></div>` : ""}
          ${report.companyLogo ? `<img src="${escapeHtml(report.companyLogo)}" class="running-header-logo-img" />` : ""}
        </div>
        <div class="running-header-text">
          <div class="running-header-main-title">DIAGNÓSTICO DOS FATORES DE RISCOS PSICOSSOCIAIS</div>
          <div class="running-header-sub-title">7. Cronograma & Plano de Ação PGR • ${escapeHtml(companyName)}</div>
        </div>
      </div>

      <h2 class="chapter-heading">7. Cronograma e Plano de Ação (NR-01 PGR)</h2>
      <p class="chapter-intro">
        Com base no inventário técnico de riscos psicossociais, estabeleceram-se as seguintes ações integradas com objetivo, responsáveis, prioridade, prazos e indicadores de eficácia, conforme as diretrizes do PGR.
      </p>

      <!-- TABELA EXECUTIVA DO CRONOGRAMA GERAL (REPEATING THEAD) -->
      <table class="clean-table">
        <thead>
          <tr>
            <th style="width: 20%;">Risco / Fator</th>
            <th style="width: 14%;">Setor / GHE</th>
            <th style="width: 8%; text-align: center;">Expostos</th>
            <th style="width: 26%;">Ação Proposta</th>
            <th style="width: 16%;">Responsável</th>
            <th style="width: 8%; text-align: center;">Prazo</th>
            <th style="width: 8%; text-align: center;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${report.riskInventory.map(item => {
            const itemSector = report.sectors.find(s => isRiskInSector(item, s)) || report.sectors[0];
            const expCount = item.exposedCount || (itemSector ? itemSector.employeeCount : 1) || 1;
            return `
              <tr>
                <td><strong>${escapeHtml(item.riskName)}</strong></td>
                <td>${escapeHtml(itemSector?.name || "Geral")}</td>
                <td style="text-align: center; font-weight: 700;">${expCount}</td>
                <td>${escapeHtml(item.actionProposed || item.recommendation || "-")}</td>
                <td>${escapeHtml(item.responsible || "Liderança e Gestão")}</td>
                <td style="text-align: center; font-weight: 700; white-space: nowrap;">${escapeHtml(item.deadline || "A definir")}</td>
                <td style="text-align: center;">
                  <span class="${getStatusBadgeClass(item.status)}">
                    ${escapeHtml(item.status || "Pendente")}
                  </span>
                </td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>

      <!-- FICHAS DETALHADAS DE AÇÃO POR SETOR -->
      ${report.sectors.map(sector => {
        const directRisks = report.riskInventory.filter(r => isRiskInSector(r, sector));
        if (directRisks.length === 0 && report.sectors.length > 1) return "";
        const sectorRisks = directRisks.length > 0 ? directRisks : report.riskInventory;
        if (sectorRisks.length === 0) return "";

        return `
          <div class="avoid-break" style="margin-top: 18px;">
            <div class="sector-banner">
              <div class="sector-banner-title">
                <span class="sector-banner-dot" style="background: #10b981;"></span>
                Plano de Ação Detalhado • Setor: ${escapeHtml(sector.name)}
              </div>
              <div class="sector-banner-count">
                ${sector.employeeCount || 0} ${(sector.employeeCount || 0) === 1 ? "colaborador no setor" : "colaboradores no setor"}
              </div>
            </div>

            ${sectorRisks.map(item => {
              const effectiveCount = item.exposedCount || sector.employeeCount || 1;
              return `
                <div class="action-sheet-card">
                  <div class="action-sheet-header">
                    <div>
                      <strong style="text-transform: uppercase; font-size: 8pt; color: #0f172a;">Ação: ${escapeHtml(item.riskName)}</strong>
                      <span style="font-size: 7.5pt; color: #64748b; margin-left: 8px;">(Setor: ${escapeHtml(sector.name)})</span>
                    </div>
                    <div style="display: flex; gap: 6px;">
                      <span class="${getPriorityBadgeClass(item.priority)}">Prioridade: ${escapeHtml(item.priority || "Média")}</span>
                      <span class="${getStatusBadgeClass(item.status)}">Status: ${escapeHtml(item.status || "Pendente")}</span>
                    </div>
                  </div>

                  <div class="action-sheet-body">
                    <div>
                      <span class="risk-sheet-label">Objetivo Estratégico da Ação:</span>
                      <div class="action-detail-box">
                        ${escapeHtml(item.actionObjective || `Mitigar os impactos decorrentes de ${item.riskName}.`)}
                      </div>

                      <span class="risk-sheet-label" style="margin-top: 8px;">Detalhamento da Ação Proposta / Medida Preventiva:</span>
                      <div class="action-detail-box">
                        ${escapeHtml(item.actionProposed || item.recommendation || "-")}
                      </div>

                      ${item.efficacyIndicator ? `
                        <span class="risk-sheet-label" style="margin-top: 8px;">Indicador de Eficácia:</span>
                        <div class="action-detail-box" style="font-style: italic;">
                          ${escapeHtml(item.efficacyIndicator)}
                        </div>
                      ` : ""}
                    </div>

                    <div class="action-meta-box">
                      <div>
                        <span class="risk-sheet-label">Responsável</span>
                        <span style="font-weight: 700; color: #0f172a;">${escapeHtml(item.responsible || "Liderança e Gestão")}</span>
                      </div>
                      <div>
                        <span class="risk-sheet-label">Trabalhadores Expostos</span>
                        <span style="font-weight: 700; color: #0f172a;">${effectiveCount} ${effectiveCount === 1 ? "colaborador" : "colaboradores"}</span>
                      </div>
                      <div>
                        <span class="risk-sheet-label">Prazo Estimado</span>
                        <span style="font-weight: 700; color: #0f172a;">${escapeHtml(item.deadline || "A definir pela empresa")}</span>
                      </div>
                      <div>
                        <span class="risk-sheet-label">Periodicidade de Acompanhamento</span>
                        <span style="font-weight: 700; color: #0f172a;">${escapeHtml(item.periodicity || "A definir pela empresa")}</span>
                      </div>
                    </div>
                  </div>
                </div>
              `;
            }).join("")}
          </div>
        `;
      }).join("")}
    </div>

    <!-- ======================================================================
         CAPÍTULO 8: CONSIDERAÇÕES FINAIS & ASSINATURAS
         ====================================================================== -->
    <div class="chapter-box page-break-before avoid-break">
      <div class="running-header">
        <div class="running-header-logos">
          ${activeAssessor?.logo ? `<img src="${escapeHtml(activeAssessor.logo)}" class="running-header-logo-img" />` : ""}
          ${activeAssessor?.logo && report.companyLogo ? `<div class="running-header-logo-divider"></div>` : ""}
          ${report.companyLogo ? `<img src="${escapeHtml(report.companyLogo)}" class="running-header-logo-img" />` : ""}
        </div>
        <div class="running-header-text">
          <div class="running-header-main-title">DIAGNÓSTICO DOS FATORES DE RISCOS PSICOSSOCIAIS</div>
          <div class="running-header-sub-title">8. Considerações Finais • ${escapeHtml(companyName)}</div>
        </div>
      </div>

      <h2 class="chapter-heading">8. Considerações Finais e Conclusão</h2>
      ${formatParagraphs(report.finalConsiderations || "", report, activeAssessor)}

      <div class="signatures-card">
        <div style="font-size: 8.5pt; color: #475569; text-align: justify; line-height: 1.5;">
          O presente Diagnóstico de Riscos Psicossociais foi elaborado com estrita observância às diretrizes da NR-01 (GRO/PGR), NR-17 e fundamentação científica do COPSOQ II - BR. As recomendações aqui delineadas destinam-se à melhoria contínua dos ambientes laborais e à salvaguarda da saúde mental dos trabalhadores.
        </div>

        <div style="text-align: right; margin-top: 20px; font-weight: 700; font-size: 8.5pt; color: #334155;">
          ${escapeHtml(emissionDateFormatted)}
        </div>

        <div class="signatures-grid">
          <div class="signature-item">
            ${report.signatureUrl ? `<img src="${escapeHtml(report.signatureUrl)}" style="max-height: 45px; margin-bottom: 6px;" alt="Assinatura" />` : ""}
            <div class="signature-line">
              <div class="signature-name">${escapeHtml(report.professionalName || activeAssessor?.technicalResponsible || "Responsável Técnico")}</div>
              <div class="signature-role">${escapeHtml(report.professionalRole || "Engenheiro de Segurança do Trabalho")}</div>
              ${report.professionalReg ? `<div class="signature-role">Reg.: ${escapeHtml(report.professionalReg)}</div>` : ""}
            </div>
          </div>

          <div class="signature-item">
            <div class="signature-line">
              <div class="signature-name">${escapeHtml(report.companyContact || report.companyName || "Representante Legal da Empresa")}</div>
              <div class="signature-role">Representante Legal da Empresa Cliente</div>
              <div class="signature-role">${escapeHtml(companyName)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Running footer at end of document -->
    <div class="running-footer">
      <div>Sistema Desenvolvido em Conformidade Científica com COPSOQ II e Legal com NR-01 GRO/PGR</div>
      <div>Página Final do Relatório</div>
    </div>

  </div>

  ${autoPrint ? `
  <script>
    window.addEventListener('DOMContentLoaded', function() {
      setTimeout(function() {
        window.print();
      }, 500);
    });
  </script>
  ` : ""}
</body>
</html>`;
}
