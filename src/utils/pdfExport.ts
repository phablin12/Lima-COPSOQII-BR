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
  error?: string;
}

export function getReportDefaultFileName(report: Report): string {
  const company = (report.companyFantasyName || report.companyName || "Empresa").trim();
  // Remove characters forbidden in Windows / Mac / Linux file systems
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
  setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);
}

export async function exportReportToPdf(
  report: Report,
  onProgress?: (progress: PdfExportProgress) => void
): Promise<PdfExportResult> {
  const fileName = getReportDefaultFileName(report);

  // Set document title temporarily so print / save mechanisms inherit the standardized name
  const originalTitle = document.title;
  document.title = fileName.replace(/\.pdf$/i, "");

  try {
    const documentElement = document.getElementById("report-printable-document");
    if (!documentElement) {
      throw new Error("Elemento do relatório não encontrado na página.");
    }

    // Query blocks. Prefer fine-grained pdf blocks if present, otherwise direct visible children.
    let blocks = Array.from(
      documentElement.querySelectorAll<HTMLElement>(".pdf-block, [data-pdf-block='true']")
    );

    if (blocks.length === 0) {
      blocks = Array.from(documentElement.children) as HTMLElement[];
    }

    const visibleBlocks = blocks.filter((b) => {
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
    // Margens padronizadas ABNT:
    // Superior: 3,0 cm (30 mm)
    // Esquerda: 3,0 cm (30 mm)
    // Direita: 2,0 cm (20 mm)
    // Inferior: 2,0 cm (20 mm)
    const MARGIN_LEFT = 30;
    const MARGIN_TOP = 30;
    const MARGIN_RIGHT = 20;
    const MARGIN_BOTTOM = 20;
    const CONTENT_W = PAGE_W - MARGIN_LEFT - MARGIN_RIGHT; // 160 mm de área útil
    const CONTENT_MAX_H = PAGE_H - MARGIN_TOP - MARGIN_BOTTOM; // 247 mm de área útil

    let currentY = MARGIN_TOP;
    let isFirstPage = true;

    for (let i = 0; i < visibleBlocks.length; i++) {
      const block = visibleBlocks[i];
      const blockName =
        block.getAttribute("data-block-title") ||
        block.querySelector("h1, h2, h3, h4, span.font-extrabold")?.textContent?.trim() ||
        `Bloco ${i + 1}`;

      const isCover = block.getAttribute("data-pdf-cover") === "true";
      const forceBreakBefore =
        block.getAttribute("data-page-break") === "before" ||
        block.classList.contains("page-break-before");

      if (onProgress) {
        onProgress({
          current: i + 1,
          total: visibleBlocks.length,
          message: `Processando: ${blockName}...`,
          percent: Math.round(((i + 1) / (visibleBlocks.length + 1)) * 90),
        });
      }

      // Small pause to allow UI update
      await new Promise((resolve) => setTimeout(resolve, 25));

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
        // Center cover vertically if it's slightly shorter
        const coverY = blockH_MM < CONTENT_MAX_H ? MARGIN_TOP + (CONTENT_MAX_H - blockH_MM) / 2 : MARGIN_TOP;
        pdf.addImage(imgData, "JPEG", MARGIN_LEFT, coverY, CONTENT_W, Math.min(blockH_MM, CONTENT_MAX_H), undefined, "FAST");
        currentY = CONTENT_MAX_H + 10; // Trigger new page for next block
        continue;
      }

      // If block requires a fresh page break, or if it overflows the remaining space
      const wouldOverflow = currentY + blockH_MM > CONTENT_MAX_H;

      if (forceBreakBefore || wouldOverflow) {
        if (!isFirstPage) {
          pdf.addPage("a4", "portrait");
        }
        isFirstPage = false;
        currentY = MARGIN_TOP;
      }

      // If the block is taller than an entire A4 page (e.g. exceptionally large single section)
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
          currentY = CONTENT_MAX_H + 10;
        }
      } else {
        // Fits comfortably on current page
        const imgData = blockCanvas.toDataURL("image/jpeg", 0.95);
        pdf.addImage(imgData, "JPEG", MARGIN_LEFT, currentY, CONTENT_W, blockH_MM, undefined, "FAST");
        currentY += blockH_MM + 4; // 4mm spacing between blocks
      }
    }

    // Apply running footers with page numbers to all pages (excluding cover page 1) according to ABNT NBR 14724
    const totalPages = pdf.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      if (p === 1) continue; // Cover page is counted, but not numbered visually in ABNT
      pdf.setPage(p);
      pdf.setFontSize(8.5);
      pdf.setTextColor(100, 116, 139); // slate-500

      // Left running text at left margin 30mm
      pdf.text(
        `Diagnóstico dos Fatores de Riscos Psicossociais • ${report.companyName || "Empresa"}`,
        MARGIN_LEFT,
        PAGE_H - 12
      );

      // Right page number at right margin 20mm (PAGE_W - 20 = 190mm)
      pdf.text(
        `Página ${p} de ${totalPages}`,
        PAGE_W - MARGIN_RIGHT,
        PAGE_H - 12,
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

    // Saving workflow: try native save file picker if available, otherwise direct download
    if (typeof window !== "undefined" && "showSaveFilePicker" in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: fileName,
          types: [
            {
              description: "Documento PDF (*.pdf)",
              accept: { "application/pdf": [".pdf"] },
            },
          ],
        });
        const writable = await handle.createWritable();
        await writable.write(pdfBlob);
        await writable.close();

        return { success: true, fileName };
      } catch (err: any) {
        if (err?.name === "AbortError") {
          return { success: true, cancelled: true, fileName };
        }
        // Silently fall back to direct download if blocked (e.g. iframe) or unsupported
      }
    }

    // Direct download
    triggerDirectDownload(pdfBlob, fileName);
    return { success: true, fileName };
  } catch (error: any) {
    console.error("Erro na geração do PDF:", error);
    return {
      success: false,
      fileName,
      error: error?.message || "Erro desconhecido ao exportar PDF",
    };
  } finally {
    // Restore original document title
    document.title = originalTitle;
  }
}
