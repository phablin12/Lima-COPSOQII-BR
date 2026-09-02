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

export function getReportDefaultFileName(report: Report): string {
  const company = (report.companyFantasyName || report.companyName || "Empresa").trim();
  // Remove characters forbidden in Windows / Mac / Linux file systems
  const sanitizedCompany = company.replace(/[/\\?%*:|"<>]/g, "-").replace(/\s+/g, " ");
  return `Diagnostico dos Fatores de riscos - ${sanitizedCompany}.pdf`;
}

export async function exportReportToPdf(
  report: Report,
  onProgress?: (progress: PdfExportProgress) => void
): Promise<{ success: boolean; cancelled?: boolean; fileName: string; error?: string }> {
  const fileName = getReportDefaultFileName(report);

  // Set document title temporarily to match the filename so browser mechanisms recognize it
  const originalTitle = document.title;
  document.title = fileName.replace(/\.pdf$/i, "");

  try {
    const documentElement = document.getElementById("report-printable-document");
    if (!documentElement) {
      throw new Error("Elemento do relatório não encontrado na página.");
    }

    // Identify all visible child sections of the report
    const children = Array.from(documentElement.children) as HTMLElement[];
    const sections = children.filter((child) => {
      if (child.classList.contains("print:hidden")) return false;
      const style = window.getComputedStyle(child);
      if (style.display === "none" || style.visibility === "hidden") return false;
      return true;
    });

    if (sections.length === 0) {
      throw new Error("Nenhuma seção do relatório encontrada para exportar.");
    }

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true,
    });

    const a4Ratio = 297 / 210; // ~1.4142857
    let isFirstPage = true;

    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      const sectionName = section.querySelector("h1, h2, h3, h4, span.font-extrabold")?.textContent?.trim() || `Seção ${i + 1}`;

      if (onProgress) {
        onProgress({
          current: i + 1,
          total: sections.length,
          message: `Renderizando ${sectionName}...`,
          percent: Math.round(((i + 1) / (sections.length + 1)) * 90),
        });
      }

      // Small pause to allow UI update and prevent thread blocking
      await new Promise((resolve) => setTimeout(resolve, 30));

      let sectionCanvas: HTMLCanvasElement;
      try {
        sectionCanvas = await toCanvas(section, {
          backgroundColor: "#ffffff",
          pixelRatio: 1.8, // Balances high resolution with fast processing and compact PDF size
          skipFonts: true, // Prevents CORS errors on external Google Font fetches
          filter: (node) => {
            if (node instanceof HTMLElement) {
              if (node.classList.contains("print:hidden")) return false;
              if (node.style.display === "none") return false;
            }
            return true;
          },
        });
      } catch (renderError) {
        console.warn(`Erro ao renderizar seção ${i + 1}, tentando alternativa:`, renderError);
        // Fallback: minimal canvas with error placeholder if section rendering fails
        sectionCanvas = document.createElement("canvas");
        sectionCanvas.width = 1200;
        sectionCanvas.height = Math.round(1200 * a4Ratio);
        const ctx = sectionCanvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, sectionCanvas.width, sectionCanvas.height);
          ctx.fillStyle = "#334155";
          ctx.font = "bold 24px sans-serif";
          ctx.fillText(`Seção: ${sectionName}`, 40, 60);
        }
      }

      const cw = sectionCanvas.width;
      const ch = sectionCanvas.height;
      const pageCanvasHeight = Math.round(cw * a4Ratio);

      // If the section fits on one page (with 5% threshold)
      if (ch <= pageCanvasHeight * 1.05) {
        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = cw;
        pageCanvas.height = pageCanvasHeight;
        const ctx = pageCanvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, cw, pageCanvasHeight);
          ctx.drawImage(sectionCanvas, 0, 0);
        }

        const imgData = pageCanvas.toDataURL("image/jpeg", 0.94);
        if (isFirstPage) {
          isFirstPage = false;
        } else {
          pdf.addPage("a4", "portrait");
        }
        pdf.addImage(imgData, "JPEG", 0, 0, 210, 297, undefined, "FAST");
      } else {
        // Section is longer than 1 A4 page (e.g. multi-sector tables or long risk inventory)
        const totalPages = Math.ceil(ch / pageCanvasHeight);
        for (let p = 0; p < totalPages; p++) {
          const sliceCanvas = document.createElement("canvas");
          sliceCanvas.width = cw;
          sliceCanvas.height = pageCanvasHeight;
          const ctx = sliceCanvas.getContext("2d");
          if (ctx) {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, cw, pageCanvasHeight);
            const srcY = p * pageCanvasHeight;
            const srcH = Math.min(pageCanvasHeight, ch - srcY);
            ctx.drawImage(sectionCanvas, 0, srcY, cw, srcH, 0, 0, cw, srcH);
          }

          const imgData = sliceCanvas.toDataURL("image/jpeg", 0.94);
          if (isFirstPage) {
            isFirstPage = false;
          } else {
            pdf.addPage("a4", "portrait");
          }
          pdf.addImage(imgData, "JPEG", 0, 0, 210, 297, undefined, "FAST");
        }
      }
    }

    if (onProgress) {
      onProgress({
        current: sections.length,
        total: sections.length,
        message: "Finalizando arquivo PDF...",
        percent: 98,
      });
    }

    const pdfBlob = pdf.output("blob");

    // Attempt native file picker to open destination folder dialog
    let savedWithPicker = false;
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
        savedWithPicker = true;
      } catch (err: any) {
        if (err?.name === "AbortError") {
          return { success: true, cancelled: true, fileName };
        }
        // If security exception in iframe or not permitted, proceed to standard anchor download fallback
        console.log("showSaveFilePicker não permitido ou indisponível, usando download direto:", err);
      }
    }

    // Fallback: Trigger browser direct download with suggested filename
    if (!savedWithPicker) {
      const blobUrl = URL.createObjectURL(pdfBlob);
      const downloadLink = document.createElement("a");
      downloadLink.href = blobUrl;
      downloadLink.download = fileName;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);
    }

    if (onProgress) {
      onProgress({
        current: sections.length,
        total: sections.length,
        message: "Download concluído com sucesso!",
        percent: 100,
      });
    }

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
