/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response } from "express";
import path from "path";
import { fileURLToPath } from "url";
import { generateReportHtml } from "./src/utils/reportHtmlGenerator.js";
import type { Report, Assessor } from "./src/types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || "3000", 10);
const isProd = process.env.NODE_ENV === "production";
const FIREBASE_PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID || "relatorio-copsoqii-br-lima-eng";

// In-memory store for instantaneous preview sessions (TTL 1 hour)
interface CachedSession {
  report: Report;
  assessor: Assessor;
  timestamp: number;
}
const sessionStore = new Map<string, CachedSession>();

// Cleanup stale sessions every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of sessionStore.entries()) {
    if (now - value.timestamp > 3600000) {
      sessionStore.delete(key);
    }
  }
}, 600000);

// Helper to convert Firestore REST API response into a standard JavaScript object
function convertFirestoreValue(val: any): any {
  if (!val || typeof val !== "object") return val;
  if ("stringValue" in val) return val.stringValue;
  if ("integerValue" in val) return parseInt(val.integerValue, 10);
  if ("doubleValue" in val) return parseFloat(val.doubleValue);
  if ("booleanValue" in val) return val.booleanValue;
  if ("nullValue" in val) return null;
  if ("timestampValue" in val) return val.timestampValue;
  if ("arrayValue" in val) {
    return (val.arrayValue.values || []).map(convertFirestoreValue);
  }
  if ("mapValue" in val) {
    const res: Record<string, any> = {};
    const fields = val.mapValue.fields || {};
    for (const key of Object.keys(fields)) {
      res[key] = convertFirestoreValue(fields[key]);
    }
    return res;
  }
  return val;
}

function parseFirestoreDoc(doc: any): any {
  if (!doc || !doc.fields) return null;
  const res: Record<string, any> = {};
  for (const key of Object.keys(doc.fields)) {
    res[key] = convertFirestoreValue(doc.fields[key]);
  }
  return res;
}

const defaultAssessor: Assessor = {
  fantasyName: "LIMA ENGENHARIA E SEGURANÇA DO TRABALHO",
  socialName: "LIMA ENGENHARIA E CONSULTORIA EM SST LTDA",
  cnpj: "00.000.000/0001-00",
  address: "Tangará da Serra - MT",
  phone: "(65) 99999-9999",
  logo: ""
};

async function fetchReportFromFirestore(reportId: string, idToken?: string): Promise<Report | null> {
  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/reports/${encodeURIComponent(reportId)}`;
  const headers: Record<string, string> = {};
  if (idToken) {
    headers["Authorization"] = `Bearer ${idToken}`;
  }

  const res = await fetch(url, { headers });
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`Firestore REST error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  const reportObj = parseFirestoreDoc(data);
  if (reportObj) {
    reportObj.id = reportId;
  }
  return reportObj as Report;
}

async function fetchAssessorFromFirestore(idToken?: string): Promise<Assessor | null> {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/settings/assessor`;
    const headers: Record<string, string> = {};
    if (idToken) {
      headers["Authorization"] = `Bearer ${idToken}`;
    }

    const res = await fetch(url, { headers });
    if (!res.ok) return null;

    const data = await res.json();
    return parseFirestoreDoc(data) as Assessor;
  } catch {
    return null;
  }
}

async function start() {
  const app = express();

  // Increase payload limit to support reports with images/logos
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // =========================================================================
  // BACKEND ENDPOINT DE VISUALIZAÇÃO PROTEGIDO
  // =========================================================================

  /**
   * Endpoint de Registro de Sessão Instantânea de Visualização
   * POST /api/reports/preview-session
   */
  app.post("/api/reports/preview-session", (req: Request, res: Response) => {
    try {
      const { report, assessor } = req.body;
      if (!report || !report.id) {
        return res.status(400).json({ error: "Dados do relatório ausentes ou inválidos." });
      }

      const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      sessionStore.set(sessionId, {
        report,
        assessor: assessor || defaultAssessor,
        timestamp: Date.now()
      });

      // Also cache by report ID as fallback
      sessionStore.set(report.id, {
        report,
        assessor: assessor || defaultAssessor,
        timestamp: Date.now()
      });

      return res.json({
        success: true,
        sessionId,
        viewUrl: `/api/reports/${report.id}/view?session=${sessionId}`
      });
    } catch (err: any) {
      console.error("Erro ao registrar sessão de preview:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  /**
   * Endpoint de Renderização Direta (HTML string)
   * POST /api/reports/render
   */
  app.post("/api/reports/render", (req: Request, res: Response) => {
    try {
      const { report, assessor, autoPrint } = req.body;
      if (!report) {
        return res.status(400).json({ error: "Dados do relatório ausentes." });
      }

      const html = generateReportHtml(report, assessor || defaultAssessor, {
        autoPrint: !!autoPrint,
        showToolbar: true
      });

      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.send(html);
    } catch (err: any) {
      console.error("Erro na renderização HTML:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  /**
   * Endpoint Protegido de Visualização do Documento
   * GET /api/reports/:id/view e GET /reports/:id/view
   */
  const handleReportView = async (req: Request, res: Response) => {
    const reportId = req.params.id;
    const sessionKey = (req.query.session as string) || reportId;
    const authHeader = req.headers.authorization;
    const tokenFromQuery = req.query.token as string;
    const idToken = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : tokenFromQuery;
    const autoPrint = req.query.print === "1" || req.query.autoprint === "true";

    if (!reportId) {
      return res.status(400).send("ID do documento não informado.");
    }

    try {
      let report: Report | null = null;
      let assessor: Assessor = defaultAssessor;

      // 1. Check if we have an active session or cached report in memory
      if (sessionStore.has(sessionKey)) {
        const cached = sessionStore.get(sessionKey)!;
        report = cached.report;
        assessor = cached.assessor || defaultAssessor;
      } else if (sessionStore.has(reportId)) {
        const cached = sessionStore.get(reportId)!;
        report = cached.report;
        assessor = cached.assessor || defaultAssessor;
      }

      // 2. If not found in cache, fetch directly from Firestore if token is provided
      if (!report && idToken) {
        try {
          report = await fetchReportFromFirestore(reportId, idToken);
          const customAssessor = await fetchAssessorFromFirestore(idToken);
          if (customAssessor) {
            assessor = customAssessor;
          }
        } catch (fetchErr: any) {
          console.warn("Falha ao buscar do Firestore com token:", fetchErr.message);
        }
      }

      // 3. If still not found and no auth credentials provided
      if (!report) {
        res.status(401);
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        return res.send(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>Acesso Protegido • Diagnóstico de Riscos</title>
  <style>
    body { font-family: sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
    .card { background: #1e293b; padding: 32px; border-radius: 16px; max-width: 480px; text-align: center; border: 1px solid #334155; }
    h2 { margin-bottom: 12px; color: #38bdf8; }
    p { color: #94a3b8; font-size: 14px; line-height: 1.6; }
    .btn { display: inline-block; margin-top: 20px; background: #0284c7; color: #fff; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: bold; }
  </style>
</head>
<body>
  <div class="card">
    <h2>Acesso Protegido ao Relatório</h2>
    <p>O documento <strong>${escapeHtml(reportId)}</strong> requer autenticação do sistema para visualização dos dados.</p>
    <p>Por favor, acesse o painel principal do sistema e clique em <strong>"Visualizar Laudo (A4 Print)"</strong> com sua sessão ativa.</p>
    <a href="/" class="btn">Retornar ao Sistema</a>
  </div>
</body>
</html>`);
      }

      // 4. Generate Semantic HTML with CSS Print rules
      const html = generateReportHtml(report, assessor, {
        autoPrint,
        showToolbar: true
      });

      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.send(html);
    } catch (err: any) {
      console.error("Erro ao gerar visualização do relatório:", err);
      return res.status(500).send(`Erro interno ao gerar visualização: ${err.message}`);
    }
  };

  app.get("/api/reports/:id/view", handleReportView);
  app.get("/reports/:id/view", handleReportView);

  // =========================================================================
  // VITE / STATIC CLIENT INTEGRATION
  // =========================================================================
  if (!isProd) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: "0.0.0.0",
        port: PORT
      },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, "dist")));
    app.get("*", (_req, res) => {
      res.sendFile(path.resolve(__dirname, "dist/index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor iniciado com sucesso na porta ${PORT} [${isProd ? "PROD" : "DEV"}]`);
    console.log(`Endpoint de visualização ativo em /api/reports/:id/view`);
  });
}

start().catch((err) => {
  console.error("Falha fatal ao iniciar o servidor:", err);
  process.exit(1);
});
