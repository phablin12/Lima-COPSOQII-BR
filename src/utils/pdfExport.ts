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
  setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
}

/**
 * Opens a dedicated viewer tab AFTER the PDF is 100% generated.
 * Shows the full PDF preview and download/print actions instantly without infinite loading.
 */
export function openPdfViewerTab(blob: Blob, fileName: string): Window | null {
  const blobUrl = URL.createObjectURL(blob);

  try {
    const win = window.open("", "_blank");
    if (!win) {
      triggerDirectDownload(blob, fileName);
      return null;
    }

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
      height: 52px;
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
      background: #0284c7;
      color: #ffffff;
      font-size: 11px;
      font-weight: 800;
      padding: 3px 8px;
      border-radius: 6px;
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
      gap: 10px;
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
      height: calc(100% - 52px);
      border: none;
      background: #334155;
      display: block;
    }
  </style>
</head>
<body>
  <div id="viewer-toolbar">
    <div class="file-info">
      <span class="badge">Laudo Técnico</span>
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
    console.warn("Erro ao configurar aba de visualização com shell, tentando abrir blob direto:", err);
    try {
      const win = window.open(blobUrl, "_blank");
      return win;
    } catch {
      triggerDirectDownload(blob, fileName);
      return null;
    }
  }
}

/**
 * Exports the report document into a high-precision, ABNT NBR 14724 compliant PDF.
 * Eliminates blank pages and enforces crisp leaf block framing.
 */
export async function exportReportToPdf(
  report: Report,
  onProgress?: (progress: PdfExportProgress) => void
): Promise<PdfExportResult> {
  const fileName = getReportDefaultFileName(report);
  const originalTitle = document.title;
  document.title = fileName.replace(/\.pdf$/i, "");

  const documentElement = document.getElementById("report-printable-document");
  if (!documentElement) {
    throw new Error("Elemento do relatório não encontrado na página.");
  }

  // Force document to fixed 794px width (standard A4 at 96 DPI = 210mm) during capture
  // so screen resizing or zoomed viewports never break column grids or cause layout shifts!
  const prevWidth = documentElement.style.width;
  const prevMaxWidth = documentElement.style.maxWidth;
  const prevMinWidth = documentElement.style.minWidth;
  documentElement.style.width = "794px";
  documentElement.style.maxWidth = "794px";
  documentElement.style.minWidth = "794px";

  try {
    // Query blocks with data-pdf-block="true".
    // Filter out ancestor containers so we only process atomic leaf blocks.
    const allCandidateBlocks = Array.from(
      documentElement.querySelectorAll<HTMLElement>("[data-pdf-block='true']")
    );

    let blocksToProcess: HTMLElement[] = [];
    if (allCandidateBlocks.length > 0) {
      blocksToProcess = allCandidateBlocks.filter((b) => {
        const hasChildBlock = allCandidateBlocks.some((other) => other !== b && b.contains(other));
        return !hasChildBlock;
      });
    } else {
      blocksToProcess = Array.from(documentElement.children) as HTMLElement[];
    }

    const visibleBlocks = blocksToProcess.filter((b) => {
      if (b.classList.contains("print:hidden")) return false;
      const style = window.getComputedStyle(b);
      if (style.display === "none" || style.visibility === "hidden") return false;
      if (b.offsetHeight < 5) return false;
      return true;
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
    // Margens equilibradas: Laterais 20mm (área útil: 170mm), Superior 22mm, Inferior 20mm (área útil: 255mm)
    const MARGIN_LEFT = 20;
    const MARGIN_RIGHT = 20;
    const MARGIN_TOP = 22;
    const MARGIN_BOTTOM = 20;
    const CONTENT_W = PAGE_W - MARGIN_LEFT - MARGIN_RIGHT; // 170 mm
    const CONTENT_MAX_H = PAGE_H - MARGIN_TOP - MARGIN_BOTTOM; // 255 mm

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
          message: `${blockName}`,
          percent,
        });
      }

      // Small pause to yield to browser UI thread
      await new Promise((resolve) => setTimeout(resolve, 15));

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
        // Cover page is dedicated exclusively to Page 1
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
        
        // After cover, prepare fresh page for page 2
        pdf.addPage("a4", "portrait");
        currentY = MARGIN_TOP;
        continue;
      }

      // If block requires a forced page break or if it overflows remaining space
      const wouldOverflow = currentY + blockH_MM > MARGIN_TOP + CONTENT_MAX_H;

      if (forceBreakBefore || wouldOverflow) {
        // CRITICAL BUG FIX: Only add a new page if currentY is NOT already at MARGIN_TOP!
        // This prevents creating empty/blank pages when a new page was already freshly started!
        if (!isFirstPage && currentY > MARGIN_TOP) {
          pdf.addPage("a4", "portrait");
          currentY = MARGIN_TOP;
        } else if (isFirstPage) {
          isFirstPage = false;
          currentY = MARGIN_TOP;
        }
      }

      // If block height is just slightly larger than CONTENT_MAX_H (up to 15% tolerance),
      // scale it down to fit on this single page, preventing microscopic 1-line slices on a blank second page!
      if (blockH_MM > CONTENT_MAX_H && blockH_MM <= CONTENT_MAX_H * 1.15) {
        const fitScale = CONTENT_MAX_H / blockH_MM;
        const fittedW = CONTENT_W * fitScale;
        const fittedH = CONTENT_MAX_H;
        const posX = MARGIN_LEFT + (CONTENT_W - fittedW) / 2;
        const imgData = blockCanvas.toDataURL("image/jpeg", 0.95);
        pdf.addImage(imgData, "JPEG", posX, currentY, fittedW, fittedH, undefined, "FAST");
        currentY += fittedH + 5;
      } else if (blockH_MM > CONTENT_MAX_H) {
        // Genuine multi-page block: slice cleanly
        const pageCanvasH = Math.round(cw * (CONTENT_MAX_H / CONTENT_W));
        const totalSlices = Math.ceil(ch / pageCanvasH);

        for (let s = 0; s < totalSlices; s++) {
          const srcY = s * pageCanvasH;
          const srcH = Math.min(pageCanvasH, ch - srcY);
          // If the last slice is an empty sliver, don't create a blank page
          if (srcH < 25) continue;

          if (s > 0) {
            pdf.addPage("a4", "portrait");
            currentY = MARGIN_TOP;
          }

          const sliceCanvas = document.createElement("canvas");
          sliceCanvas.width = cw;
          sliceCanvas.height = srcH;
          const sCtx = sliceCanvas.getContext("2d");
          if (sCtx) {
            sCtx.fillStyle = "#ffffff";
            sCtx.fillRect(0, 0, cw, srcH);
            sCtx.drawImage(blockCanvas, 0, srcY, cw, srcH, 0, 0, cw, srcH);
          }

          const sliceData = sliceCanvas.toDataURL("image/jpeg", 0.95);
          const sliceH_MM = (srcH / cw) * CONTENT_W;
          pdf.addImage(sliceData, "JPEG", MARGIN_LEFT, currentY, CONTENT_W, sliceH_MM, undefined, "FAST");
          currentY += sliceH_MM + 5;
        }
      } else {
        // Fits cleanly on current page
        const imgData = blockCanvas.toDataURL("image/jpeg", 0.95);
        pdf.addImage(imgData, "JPEG", MARGIN_LEFT, currentY, CONTENT_W, blockH_MM, undefined, "FAST");
        currentY += blockH_MM + 5; // 5mm vertical spacing between blocks
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
        message: "PDF 100% concluído!",
        percent: 100,
      });
    }

    const pdfBlob = pdf.output("blob");
    const blobUrl = URL.createObjectURL(pdfBlob);

    return {
      success: true,
      fileName,
      blob: pdfBlob,
      blobUrl,
      openedInNewTab: false,
    };
  } catch (error: any) {
    console.error("Erro na geração do PDF:", error);
    return {
      success: false,
      fileName,
      error: error?.message || "Erro desconhecido ao exportar PDF",
    };
  } finally {
    // Restore document styling
    documentElement.style.width = prevWidth;
    documentElement.style.maxWidth = prevMaxWidth;
    documentElement.style.minWidth = prevMinWidth;
    document.title = originalTitle;
  }
}
