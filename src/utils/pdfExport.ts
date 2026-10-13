/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { toCanvas } from "html-to-image";
import { jsPDF } from "jspdf";
import { Report } from "../types";

export interface PdfExportProgress {
  current: number;
  total: number;
  message: string;
  percent: number;
}

export interface PdfExportResult {
  success: boolean;
  cancelled?: boolean;
  fileName: string;
  blob?: Blob;
  blobUrl?: string;
  openedInNewTab?: boolean;
  error?: string;
}

export function getReportDefaultFileName(report: Report): string {
  const company = (report.companyFantasyName || report.companyName || "Empresa").trim();
  // Remove forbidden file system characters
  const sanitizedCompany = company.replace(/[/\\?%*:|"<>]/g, "-").replace(/\s+/g, " ");
  return `Diagnostico dos Fatores de riscos - ${sanitizedCompany}.pdf`;
}

export function triggerDirectDownload(blob: Blob, fileName: string): void {
  const blobUrl = URL.createObjectURL(blob);
  const downloadLink = document.createElement("a");
  downloadLink.href = blobUrl;
  downloadLink.download = fileName;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
}

/**
 * Opens a clean new tab synchronously on click, showing a sleek loader
 * while the PDF is rendering. Avoids popup blocker issues in modern browsers.
 */
export function prepareViewerTab(fileName?: string): Window | null {
  try {
    const win = window.open("", "_blank");
    if (!win) return null;

    const safeTitle = fileName ? fileName.replace(/\.pdf$/i, "") : "Gerando Relatório...";
    win.document.open();
    win.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle} • Processando...</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background: #0f172a;
      color: #f8fafc;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      text-align: center;
      padding: 24px;
    }
    .spinner {
      width: 48px;
      height: 48px;
      border: 4px solid #1e293b;
      border-top-color: #38bdf8;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-bottom: 20px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .title {
      font-size: 18px;
      font-weight: 800;
      color: #ffffff;
      letter-spacing: -0.02em;
      margin-bottom: 8px;
    }
    .sub {
      font-size: 13px;
      color: #94a3b8;
      max-width: 420px;
      line-height: 1.5;
    }
    .progress-bar-container {
      width: 280px;
      height: 6px;
      background: #1e293b;
      border-radius: 999px;
      margin-top: 20px;
      overflow: hidden;
    }
    .progress-bar-fill {
      width: 30%;
      height: 100%;
      background: #38bdf8;
      border-radius: 999px;
      transition: width 0.3s ease;
      animation: pulse 1.5s infinite;
    }
    @keyframes pulse { 0%, 100% { opacity: 0.8; } 50% { opacity: 1; } }
  </style>
</head>
<body>
  <div class="spinner"></div>
  <div class="title">Gerando Visualização do Laudo em PDF</div>
  <div class="sub" id="status-msg">Formatando páginas, inventário de riscos e enquadramento ABNT...</div>
  <div class="progress-bar-container">
    <div class="progress-bar-fill" id="status-bar"></div>
  </div>
</body>
</html>`);
    win.document.close();
    return win;
  } catch (err) {
    console.warn("Não foi possível pré-abrir guia para visualização:", err);
    return null;
  }
}

/**
 * Updates the viewer tab with the full PDF preview and download toolbar.
 */
export function openPdfViewerTab(blob: Blob, fileName: string, existingWindow?: Window | null): Window | null {
  const blobUrl = URL.createObjectURL(blob);
  let win = existingWindow;

  if (!win || win.closed) {
    try {
      win = window.open("", "_blank");
    } catch {
      win = null;
    }
  }

  if (!win) {
    // Popup was blocked: trigger direct download and return null
    triggerDirectDownload(blob, fileName);
    return null;
  }

  try {
    const escapedFileName = fileName.replace(/"/g, "&quot;");
    const safeTitle = fileName.replace(/\.pdf$/i, "");

    win.document.open();
    win.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle} • Visualização do Laudo</title>
  <style>
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      height: 100%;
      width: 100%;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background-color: #0f172a;
      color: #f8fafc;
    }
    #viewer-toolbar {
      height: 54px;
      background: #0f172a;
      border-bottom: 1px solid #1e293b;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 16px;
      gap: 16px;
      z-index: 10;
    }
    .file-info {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
    }
    .badge {
      background: #1e293b;
      color: #38bdf8;
      font-size: 10px;
      font-weight: 800;
      padding: 3px 8px;
      border-radius: 6px;
      border: 1px solid #334155;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      white-space: nowrap;
    }
    .file-title {
      font-size: 13px;
      font-weight: 700;
      color: #f1f5f9;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 14px;
      font-size: 12px;
      font-weight: 700;
      border-radius: 8px;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.15s ease;
      border: none;
    }
    .btn-download {
      background: #2563eb;
      color: #ffffff;
      box-shadow: 0 2px 8px rgba(37, 99, 235, 0.3);
    }
    .btn-download:hover {
      background: #1d4ed8;
      box-shadow: 0 4px 14px rgba(37, 99, 235, 0.45);
    }
    .btn-print {
      background: #1e293b;
      color: #cbd5e1;
      border: 1px solid #334155;
    }
    .btn-print:hover {
      background: #334155;
      color: #ffffff;
    }
    #pdf-frame {
      width: 100%;
      height: calc(100% - 54px);
      border: none;
      background: #525659;
      display: block;
    }
  </style>
</head>
<body>
  <div id="viewer-toolbar">
    <div class="file-info">
      <span class="badge">Visualização PDF</span>
      <span class="file-title">${escapedFileName}</span>
    </div>
    <div class="actions">
      <button class="btn btn-print" onclick="window.printDoc()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V2h12v7"></path><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
        Imprimir
      </button>
      <a id="btn-download" class="btn btn-download" href="${blobUrl}" download="${escapedFileName}">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
        Baixar PDF
      </a>
    </div>
  </div>
  <iframe id="pdf-frame" src="${blobUrl}#toolbar=1&navpanes=1"></iframe>
  <script>
    window.printDoc = function() {
      try {
        const frame = document.getElementById('pdf-frame');
        if (frame && frame.contentWindow) {
          frame.contentWindow.focus();
          frame.contentWindow.print();
          return;
        }
      } catch (err) {}
      window.print();
    };
  </script>
</body>
</html>`);
    win.document.close();
    return win;
  } catch (err) {
    console.error("Erro ao configurar aba de visualização do PDF:", err);
    triggerDirectDownload(blob, fileName);
    return null;
  }
}

export async function exportReportToPdf(
  report: Report,
  onProgress?: (progress: PdfExportProgress) => void,
  targetViewerWindow?: Window | null
): Promise<PdfExportResult> {
  const fileName = getReportDefaultFileName(report);
  const originalTitle = document.title;
  document.title = fileName.replace(/\.pdf$/i, "");

  try {
    const documentElement = document.getElementById("report-printable-document");
    if (!documentElement) {
      throw new Error("Elemento do relatório não encontrado na página.");
    }

    // Query blocks with data-pdf-block="true".
    // Crucial: Filter out any block that is an ancestor of another candidate block,
    // so we ONLY process atomic leaf blocks, never capturing duplicate container snapshots!
    const allCandidateBlocks = Array.from(
      documentElement.querySelectorAll<HTMLElement>("[data-pdf-block='true']")
    );

    let blocksToProcess: HTMLElement[] = [];
    if (allCandidateBlocks.length > 0) {
      blocksToProcess = allCandidateBlocks.filter((b) => {
        // Exclude if it contains another block in allCandidateBlocks
        const hasChildBlock = allCandidateBlocks.some((other) => other !== b && b.contains(other));
        return !hasChildBlock;
      });
    } else {
      blocksToProcess = Array.from(documentElement.children) as HTMLElement[];
    }

    const visibleBlocks = blocksToProcess.filter((b) => {
      if (b.classList.contains("print:hidden")) return false;
      const style = window.getComputedStyle(b);
      return style.display !== "none" && style.visibility !== "hidden";
    });

    if (visibleBlocks.length === 0) {
      throw new Error("Nenhuma seção do relatório encontrada para exportar.");
    }

    // Padrão ABNT NBR 14724: Formato A4 (210 x 297 mm)
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true,
    });

    const PAGE_W = 210;
    const PAGE_H = 297;
    // Margens equilibradas e precisas para enquadramento ABNT:
    // Margens laterais: 20 mm (área útil: 170 mm)
    // Margem superior: 25 mm
    // Margem inferior: 22 mm (área útil: 250 mm)
    const MARGIN_LEFT = 20;
    const MARGIN_RIGHT = 20;
    const MARGIN_TOP = 25;
    const MARGIN_BOTTOM = 22;
    const CONTENT_W = PAGE_W - MARGIN_LEFT - MARGIN_RIGHT; // 170 mm
    const CONTENT_MAX_H = PAGE_H - MARGIN_TOP - MARGIN_BOTTOM; // 250 mm

    let currentY = MARGIN_TOP;
    let isFirstPage = true;

    for (let i = 0; i < visibleBlocks.length; i++) {
      const block = visibleBlocks[i];
      const blockName =
        block.getAttribute("data-block-title") ||
        block.querySelector("h1, h2, h3, h4, span.font-extrabold")?.textContent?.trim() ||
        `Seção ${i + 1}`;

      const isCover = block.getAttribute("data-pdf-cover") === "true";
      const forceBreakBefore =
        block.getAttribute("data-page-break") === "before" ||
        block.classList.contains("page-break-before");

      const percent = Math.round(((i + 1) / (visibleBlocks.length + 1)) * 92);
      if (onProgress) {
        onProgress({
          current: i + 1,
          total: visibleBlocks.length,
          message: `Renderizando: ${blockName}...`,
          percent,
        });
      }

      // Update progress in viewer tab if open
      if (targetViewerWindow && !targetViewerWindow.closed) {
        try {
          const msgEl = targetViewerWindow.document.getElementById("status-msg");
          if (msgEl) msgEl.textContent = `Processando: ${blockName} (${percent}%)`;
          const barEl = targetViewerWindow.document.getElementById("status-bar");
          if (barEl) barEl.style.width = `${percent}%`;
        } catch {
          // Cross-window access might fail in strict environments
        }
      }

      // Small pause to yield to browser UI thread
      await new Promise((resolve) => setTimeout(resolve, 20));

      let blockCanvas: HTMLCanvasElement;
      try {
        blockCanvas = await toCanvas(block, {
          backgroundColor: "#ffffff",
          pixelRatio: 2.0, // High-DPI crisp vector text & sharp tables
          skipFonts: true,
          filter: (node) => {
            if (node instanceof HTMLElement) {
              if (node.classList.contains("print:hidden")) return false;
              if (node.style.display === "none") return false;
            }
            return true;
          },
        });
      } catch (renderErr) {
        console.warn(`Erro ao renderizar bloco "${blockName}":`, renderErr);
        continue;
      }

      const cw = blockCanvas.width;
      const ch = blockCanvas.height;
      if (cw === 0 || ch === 0) continue;

      // Calculate height in mm when fitted to CONTENT_W
      const blockH_MM = (ch / cw) * CONTENT_W;

      if (isCover) {
        // Cover page is dedicated to Page 1
        if (!isFirstPage) {
          pdf.addPage("a4", "portrait");
        }
        isFirstPage = false;
        const imgData = blockCanvas.toDataURL("image/jpeg", 0.95);

        // Fit cover cleanly within printable bounds
        const coverScale = Math.min(1, CONTENT_MAX_H / blockH_MM);
        const fittedW = CONTENT_W * coverScale;
        const fittedH = blockH_MM * coverScale;
        const coverX = MARGIN_LEFT + (CONTENT_W - fittedW) / 2;
        const coverY = MARGIN_TOP + (CONTENT_MAX_H - fittedH) / 2;

        pdf.addImage(imgData, "JPEG", coverX, coverY, fittedW, fittedH, undefined, "FAST");
        currentY = MARGIN_TOP + CONTENT_MAX_H + 10; // Trigger page break for next section
        continue;
      }

      // If block requires a forced page break, or if it overflows the remaining space
      const wouldOverflow = currentY + blockH_MM > MARGIN_TOP + CONTENT_MAX_H;

      if (forceBreakBefore || wouldOverflow) {
        if (!isFirstPage) {
          pdf.addPage("a4", "portrait");
        }
        isFirstPage = false;
        currentY = MARGIN_TOP;
      }

      // If a single block is taller than an entire A4 page (e.g. huge text block)
      if (blockH_MM > CONTENT_MAX_H) {
        const pageCanvasH = Math.round(cw * (CONTENT_MAX_H / CONTENT_W));
        const totalSlices = Math.ceil(ch / pageCanvasH);

        for (let s = 0; s < totalSlices; s++) {
          if (s > 0) {
            pdf.addPage("a4", "portrait");
            currentY = MARGIN_TOP;
          }

          const sliceCanvas = document.createElement("canvas");
          sliceCanvas.width = cw;
          sliceCanvas.height = pageCanvasH;
          const sCtx = sliceCanvas.getContext("2d");
          if (sCtx) {
            sCtx.fillStyle = "#ffffff";
            sCtx.fillRect(0, 0, cw, pageCanvasH);
            const srcY = s * pageCanvasH;
            const srcH = Math.min(pageCanvasH, ch - srcY);
            sCtx.drawImage(blockCanvas, 0, srcY, cw, srcH, 0, 0, cw, srcH);
          }

          const sliceData = sliceCanvas.toDataURL("image/jpeg", 0.95);
          const sliceH_MM = (sliceCanvas.height / sliceCanvas.width) * CONTENT_W;
          pdf.addImage(sliceData, "JPEG", MARGIN_LEFT, currentY, CONTENT_W, sliceH_MM, undefined, "FAST");
          currentY = MARGIN_TOP + CONTENT_MAX_H + 10;
        }
      } else {
        // Fits on current page
        const imgData = blockCanvas.toDataURL("image/jpeg", 0.95);
        pdf.addImage(imgData, "JPEG", MARGIN_LEFT, currentY, CONTENT_W, blockH_MM, undefined, "FAST");
        currentY += blockH_MM + 5; // 5mm spacing between blocks
      }
    }

    // Apply standard running footers with page numbers (excluding cover page 1)
    const totalPages = pdf.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      if (p === 1) continue; // Cover page is counted, but not numbered visually
      pdf.setPage(p);
      pdf.setFontSize(8);
      pdf.setTextColor(100, 116, 139); // slate-500

      // Left running text
      pdf.text(
        `Diagnóstico dos Fatores de Riscos Psicossociais • ${report.companyName || "Empresa"}`,
        MARGIN_LEFT,
        PAGE_H - 10
      );

      // Right page number
      pdf.text(
        `Página ${p} de ${totalPages}`,
        PAGE_W - MARGIN_RIGHT,
        PAGE_H - 10,
        { align: "right" }
      );
    }

    if (onProgress) {
      onProgress({
        current: visibleBlocks.length,
        total: visibleBlocks.length,
        message: "Finalizando formatação do PDF...",
        percent: 98,
      });
    }

    const pdfBlob = pdf.output("blob");
    const blobUrl = URL.createObjectURL(pdfBlob);

    // Open in viewer tab (or update pre-opened tab)
    const openedTab = openPdfViewerTab(pdfBlob, fileName, targetViewerWindow);

    return {
      success: true,
      fileName,
      blob: pdfBlob,
      blobUrl,
      openedInNewTab: Boolean(openedTab),
    };
  } catch (error: any) {
    console.error("Erro na geração do PDF:", error);
    if (targetViewerWindow && !targetViewerWindow.closed) {
      try {
        targetViewerWindow.close();
      } catch {}
    }
    return {
      success: false,
      fileName,
      error: error?.message || "Erro desconhecido ao exportar PDF",
    };
  } finally {
    document.title = originalTitle;
  }
}
