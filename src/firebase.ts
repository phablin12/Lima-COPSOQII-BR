import { initializeApp } from "firebase/app";
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  getDoc,
  getDocFromServer,
  writeBatch,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { compressBase64Image } from "./imageUtils";

// Resolve env variable compatibility with tsc
const env = (import.meta as any).env || {};

// Configuration provided for the Firebase project
const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || "AIzaSyC1-GZOdiBIZDGXUVotc_MhcsVtngbHrdg",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "relatorio-copsoqii-br-lima-eng.firebaseapp.com",
  projectId: env.VITE_FIREBASE_PROJECT_ID || "relatorio-copsoqii-br-lima-eng",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "relatorio-copsoqii-br-lima-eng.firebasestorage.app",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "963283915356",
  appId: env.VITE_FIREBASE_APP_ID || "1:963283915356:web:e9678f9df792fdbdf54c99",
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || "G-RRK45EXJ8Y",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with persistent IndexedDB local cache for instant offline & reload performance
let firestoreDb;
try {
  firestoreDb = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  });
} catch (e) {
  console.warn("Could not initialize persistent Firestore cache, falling back to getFirestore:", e);
  firestoreDb = getFirestore(app);
}

export const db = firestoreDb;
export const auth = getAuth(app);

// Collection References
export const REPORTS_COLLECTION = "reports";
export const COMPANIES_COLLECTION = "companies";
export const PROFESSIONALS_COLLECTION = "professionals";
export const CATALOG_COLLECTION = "catalog";
export const SETTINGS_COLLECTION = "settings";
export const EVALUATORS_COLLECTION = "evaluators";

// Firestore 1 MiB document hard limit (~1,048,576 bytes); keep safe budget below 920 KB
const SAFE_FIRESTORE_DOC_BYTES = 860_000;
const HARD_SAFE_FIRESTORE_DOC_BYTES = 960_000;

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

interface FirestoreErrorInfo {
  error: string;
  operationType: string;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

/**
 * Recursively strips `undefined` properties, `NaN`, `Infinity`, and functions so Firestore never rejects payloads.
 */
export function sanitizeFirestoreValue(val: any): any {
  if (val === undefined) return undefined;
  if (val === null) return null;
  if (typeof val === "number") {
    return Number.isFinite(val) ? val : null;
  }
  if (typeof val === "boolean") {
    return val;
  }
  if (typeof val === "string") {
    return val === "[OMITTED_IMAGE_FOR_CACHE]" ? "" : val;
  }
  if (val instanceof Date) {
    return val.toISOString();
  }
  if (Array.isArray(val)) {
    return val
      .map((item) => sanitizeFirestoreValue(item))
      .filter((item) => item !== undefined);
  }
  if (typeof val === "object") {
    const out: Record<string, any> = {};
    for (const key of Object.keys(val)) {
      const cleaned = sanitizeFirestoreValue(val[key]);
      if (cleaned !== undefined) {
        out[key] = cleaned;
      }
    }
    return out;
  }
  return undefined;
}

function getUtf8ByteSize(str: string): number {
  try {
    return new TextEncoder().encode(str).length;
  } catch {
    return str.length * 2;
  }
}

function normalizeDocId(rawId: any, prefix = "item"): string {
  const str = String(rawId || `${prefix}-${Date.now()}`);
  const cleaned = str.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 128);
  return cleaned || `${prefix}-${Date.now()}`;
}

async function shrinkEmbeddedImages(
  obj: any,
  maxDim: number,
  quality: number,
  minSizeToCompress: number
): Promise<any> {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "string") {
    if (obj.startsWith("data:image/") && obj.length > minSizeToCompress) {
      try {
        const compressed = await compressBase64Image(obj, maxDim, maxDim, quality);
        return compressed && compressed.length < obj.length ? compressed : obj;
      } catch {
        return obj;
      }
    }
    return obj;
  }
  if (Array.isArray(obj)) {
    const arr: any[] = [];
    for (const item of obj) {
      arr.push(await shrinkEmbeddedImages(item, maxDim, quality, minSizeToCompress));
    }
    return arr;
  }
  if (typeof obj === "object") {
    const out: Record<string, any> = {};
    for (const key of Object.keys(obj)) {
      out[key] = await shrinkEmbeddedImages(obj[key], maxDim, quality, minSizeToCompress);
    }
    return out;
  }
  return obj;
}

function stripSecondaryMediaFields(payload: any): any {
  const copy = { ...payload };
  if (copy.coverImage && typeof copy.coverImage === "string" && copy.coverImage.length > 50_000) {
    copy.coverImage = "";
  }
  if (
    copy.defaultCoverImage &&
    typeof copy.defaultCoverImage === "string" &&
    copy.defaultCoverImage.length > 50_000
  ) {
    copy.defaultCoverImage = "";
  }
  if (copy.favicon && typeof copy.favicon === "string" && copy.favicon.length > 30_000) {
    copy.favicon = "";
  }
  if (copy.evaluator && typeof copy.evaluator === "object") {
    const evalCopy = { ...copy.evaluator };
    if (evalCopy.logo && typeof evalCopy.logo === "string" && evalCopy.logo.length > 50_000) {
      evalCopy.logo = "";
    }
    copy.evaluator = evalCopy;
  }
  if (getUtf8ByteSize(JSON.stringify(copy)) > HARD_SAFE_FIRESTORE_DOC_BYTES) {
    if (copy.companyLogo && typeof copy.companyLogo === "string" && copy.companyLogo.length > 50_000) {
      copy.companyLogo = "";
    }
    if (copy.logo && typeof copy.logo === "string" && copy.logo.length > 50_000) {
      copy.logo = "";
    }
  }
  return copy;
}

/**
 * Normalizes and validates payload shape, strips undefineds, enforces firestore.rules field limits,
 * and compresses oversized embedded images so documents always stay safely under Firestore's 1 MiB limit.
 */
async function preparePayloadForFirestore(
  rawData: any,
  kind: "report" | "company" | "professional" | "catalog" | "assessor" | "evaluator"
): Promise<{ docId: string; payload: Record<string, any> }> {
  let cleaned = sanitizeFirestoreValue(rawData) || {};

  if (kind === "report") {
    cleaned.id = normalizeDocId(cleaned.id, "report");
    const rawCompany = typeof cleaned.companyName === "string" ? cleaned.companyName.trim() : "";
    cleaned.companyName = (rawCompany || "Empresa Avaliada").slice(0, 256);

    // Prevent bloated workspace defaults from being duplicated inside report.evaluator
    if (cleaned.evaluator && typeof cleaned.evaluator === "object") {
      const {
        defaultChapters: _dc,
        defaultFinalConsiderations: _dfc,
        defaultCoverImage: _dci,
        favicon: _fav,
        ...slimEvaluator
      } = cleaned.evaluator;
      cleaned.evaluator = slimEvaluator;
    }
  } else if (kind === "company") {
    cleaned.id = normalizeDocId(cleaned.id, "company");
  } else if (kind === "professional") {
    cleaned.id = normalizeDocId(cleaned.id, "prof");
    cleaned.name = (typeof cleaned.name === "string" && cleaned.name.trim()
      ? cleaned.name.trim()
      : "Profissional"
    ).slice(0, 256);
  } else if (kind === "catalog") {
    cleaned.id = normalizeDocId(cleaned.id, "risk");
    cleaned.name = (typeof cleaned.name === "string" && cleaned.name.trim()
      ? cleaned.name.trim()
      : "Risco Psicossocial"
    ).slice(0, 256);
  } else if (kind === "evaluator") {
    cleaned.id = normalizeDocId(cleaned.id, "eval");
  }

  let byteSize = getUtf8ByteSize(JSON.stringify(cleaned));

  if (byteSize > SAFE_FIRESTORE_DOC_BYTES) {
    cleaned = await shrinkEmbeddedImages(cleaned, 900, 0.72, 60_000);
    byteSize = getUtf8ByteSize(JSON.stringify(cleaned));
  }

  if (byteSize > HARD_SAFE_FIRESTORE_DOC_BYTES) {
    cleaned = await shrinkEmbeddedImages(cleaned, 560, 0.58, 35_000);
    byteSize = getUtf8ByteSize(JSON.stringify(cleaned));
  }

  if (byteSize > HARD_SAFE_FIRESTORE_DOC_BYTES) {
    console.warn(
      `[Firestore] Payload "${kind}/${cleaned.id || "assessor"}" excedeu 960KB (${byteSize} bytes) mesmo após compressão. Removendo imagens secundárias duplicadas para garantir salvamento na nuvem.`
    );
    cleaned = stripSecondaryMediaFields(cleaned);
  }

  const docId = kind === "assessor" ? "assessor" : String(cleaned.id);
  return { docId, payload: cleaned };
}

/**
 * Translates raw Firebase/Firestore errors into a concise human-readable Portuguese message.
 */
export function formatCloudErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err || "");
  const lower = raw.toLowerCase();

  if (lower.includes("unsupported field value: undefined")) {
    return "Campo inválido (indefinido) ao serializar dados.";
  }
  if (lower.includes("exceeds maximum allowed size") || lower.includes("maximum size")) {
    return "Documento excedeu o limite de 1 MB na nuvem (imagens muito grandes).";
  }
  if (lower.includes("permission-denied") || lower.includes("missing or insufficient permissions")) {
    return auth?.currentUser
      ? "Permissão negada ou regra de validação recusada no Firestore."
      : "Sessão expirada. Faça login novamente para sincronizar.";
  }
  if (lower.includes("unauthenticated")) {
    return "Usuário não autenticado para gravar na nuvem.";
  }
  if (lower.includes("offline") || lower.includes("unavailable") || lower.includes("network")) {
    return "Sem conexão estável com a nuvem no momento.";
  }
  if (lower.includes("quota")) {
    return "Cota diária do banco de dados atingida.";
  }
  return "Falha temporária ao sincronizar com a nuvem.";
}

/**
 * Handle firestore operation errors with detailed debugging context
 */
function handleFirestoreError(error: unknown, operation: string, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
      isAnonymous: auth?.currentUser?.isAnonymous || null,
      tenantId: auth?.currentUser?.tenantId || null,
      providerInfo:
        auth?.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType: operation,
    path,
  };
  console.error("Firestore Error [" + operation + "]:", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function testFirestoreConnection(): Promise<boolean> {
  if (!auth.currentUser) return false;
  try {
    await getDocFromServer(doc(db, SETTINGS_COLLECTION, "assessor"));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.warn("Firestore está offline ou sem acesso ao servidor no momento.");
    }
    return false;
  }
}

// 1. Reports Sync Helpers
export async function saveReportToFirestore(report: any) {
  try {
    const { docId, payload } = await preparePayloadForFirestore(report, "report");
    const docRef = doc(db, REPORTS_COLLECTION, docId);
    await setDoc(docRef, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${REPORTS_COLLECTION}/${report?.id}`);
  }
}

export async function deleteReportFromFirestore(reportId: string) {
  try {
    const docRef = doc(db, REPORTS_COLLECTION, normalizeDocId(reportId, "report"));
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${REPORTS_COLLECTION}/${reportId}`);
  }
}

export async function loadReportsFromFirestore() {
  try {
    const snapshot = await getDocs(collection(db, REPORTS_COLLECTION));
    const reports: any[] = [];
    snapshot.forEach((docSnap) => {
      reports.push({ ...docSnap.data(), id: docSnap.id });
    });
    return reports;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, REPORTS_COLLECTION);
    return [];
  }
}

// 2. Companies Sync Helpers
export async function saveCompanyToFirestore(company: any) {
  try {
    const { docId, payload } = await preparePayloadForFirestore(company, "company");
    const docRef = doc(db, COMPANIES_COLLECTION, docId);
    await setDoc(docRef, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${COMPANIES_COLLECTION}/${company?.id}`);
  }
}

export async function deleteCompanyFromFirestore(companyId: string) {
  try {
    const docRef = doc(db, COMPANIES_COLLECTION, normalizeDocId(companyId, "company"));
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${COMPANIES_COLLECTION}/${companyId}`);
  }
}

export async function loadCompaniesFromFirestore() {
  try {
    const snapshot = await getDocs(collection(db, COMPANIES_COLLECTION));
    const companies: any[] = [];
    snapshot.forEach((docSnap) => {
      companies.push({ ...docSnap.data(), id: docSnap.id });
    });
    return companies;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, COMPANIES_COLLECTION);
    return [];
  }
}

// 3. Professionals Sync Helpers
export async function saveProfessionalToFirestore(prof: {
  id: string;
  name: string;
  role: string;
  reg: string;
}) {
  try {
    const { docId, payload } = await preparePayloadForFirestore(prof, "professional");
    const docRef = doc(db, PROFESSIONALS_COLLECTION, docId);
    await setDoc(docRef, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${PROFESSIONALS_COLLECTION}/${prof?.id}`);
  }
}

export async function deleteProfessionalFromFirestore(profId: string) {
  try {
    const docRef = doc(db, PROFESSIONALS_COLLECTION, normalizeDocId(profId, "prof"));
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${PROFESSIONALS_COLLECTION}/${profId}`);
  }
}

export async function loadProfessionalsFromFirestore() {
  try {
    const snapshot = await getDocs(collection(db, PROFESSIONALS_COLLECTION));
    const professionals: any[] = [];
    snapshot.forEach((docSnap) => {
      professionals.push({ ...docSnap.data(), id: docSnap.id });
    });
    return professionals;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, PROFESSIONALS_COLLECTION);
    return [];
  }
}

// 4. Global Catalog Sync Helpers (chunked batches <= 400 ops)
export async function saveCatalogToFirestore(catalog: any[]) {
  try {
    const CHUNK_SIZE = 400;
    for (let i = 0; i < catalog.length; i += CHUNK_SIZE) {
      const slice = catalog.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      for (const item of slice) {
        const { docId, payload } = await preparePayloadForFirestore(item, "catalog");
        const docRef = doc(db, CATALOG_COLLECTION, docId);
        batch.set(docRef, payload);
      }
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, "write_batch", CATALOG_COLLECTION);
  }
}

export async function loadCatalogFromFirestore() {
  try {
    const snapshot = await getDocs(collection(db, CATALOG_COLLECTION));
    const catalog: any[] = [];
    snapshot.forEach((docSnap) => {
      catalog.push({ ...docSnap.data(), id: docSnap.id });
    });
    return catalog;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, CATALOG_COLLECTION);
    return [];
  }
}

// 5. Assessor Info Sync Helpers
export async function saveAssessorToFirestore(assessor: any) {
  try {
    const { payload } = await preparePayloadForFirestore(assessor, "assessor");
    const docRef = doc(db, SETTINGS_COLLECTION, "assessor");
    await setDoc(docRef, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${SETTINGS_COLLECTION}/assessor`);
  }
}

export async function loadAssessorFromFirestore() {
  try {
    const docSnap = await getDoc(doc(db, SETTINGS_COLLECTION, "assessor"));
    if (docSnap.exists()) {
      return docSnap.data();
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${SETTINGS_COLLECTION}/assessor`);
    return null;
  }
}

// 6. Evaluators Sync Helpers
export async function saveEvaluatorToFirestore(evaluator: any) {
  try {
    const { docId, payload } = await preparePayloadForFirestore(evaluator, "evaluator");
    const docRef = doc(db, EVALUATORS_COLLECTION, docId);
    await setDoc(docRef, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${EVALUATORS_COLLECTION}/${evaluator?.id}`);
  }
}

export async function deleteEvaluatorFromFirestore(evaluatorId: string) {
  try {
    const docRef = doc(db, EVALUATORS_COLLECTION, normalizeDocId(evaluatorId, "eval"));
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${EVALUATORS_COLLECTION}/${evaluatorId}`);
  }
}

export async function loadEvaluatorsFromFirestore() {
  try {
    const snapshot = await getDocs(collection(db, EVALUATORS_COLLECTION));
    const evaluators: any[] = [];
    snapshot.forEach((docSnap) => {
      evaluators.push({ ...docSnap.data(), id: docSnap.id });
    });
    return evaluators;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, EVALUATORS_COLLECTION);
    return [];
  }
}
