import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  getDocs, 
  getDoc,
  writeBatch
} from "firebase/firestore";
import { 
  getAuth
} from "firebase/auth";

// Resolve env variable compatibility with tsc
const env = (import.meta as any).env || {};

// Configuration provided by the user for their Firebase project
const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || "AIzaSyC1-GZOdiBIZDGXUVotc_MhcsVtngbHrdg",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "relatorio-copsoqii-br-lima-eng.firebaseapp.com",
  projectId: env.VITE_FIREBASE_PROJECT_ID || "relatorio-copsoqii-br-lima-eng",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "relatorio-copsoqii-br-lima-eng.firebasestorage.app",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "963283915356",
  appId: env.VITE_FIREBASE_APP_ID || "1:963283915356:web:e9678f9df792fdbdf54c99",
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || "G-RRK45EXJ8Y"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Collection References
export const REPORTS_COLLECTION = "reports";
export const COMPANIES_COLLECTION = "companies";
export const PROFESSIONALS_COLLECTION = "professionals";
export const CATALOG_COLLECTION = "catalog";
export const SETTINGS_COLLECTION = "settings";
export const EVALUATORS_COLLECTION = "evaluators";

// --- HELPERS FOR SYNCHRONIZATION ---

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
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
  }
}

/**
 * Handle firestore operation errors with detailed debugging as per skill guide
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
      providerInfo: auth?.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType: operation,
    path
  };
  console.error("Firestore Error [" + operation + "]:", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// 1. Reports Sync Helpers
export async function saveReportToFirestore(report: any) {
  try {
    const docRef = doc(db, REPORTS_COLLECTION, report.id);
    await setDoc(docRef, report);
  } catch (error) {
    handleFirestoreError(error, "write", `${REPORTS_COLLECTION}/${report.id}`);
  }
}

export async function deleteReportFromFirestore(reportId: string) {
  try {
    const docRef = doc(db, REPORTS_COLLECTION, reportId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, "delete", `${REPORTS_COLLECTION}/${reportId}`);
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
    handleFirestoreError(error, "list", REPORTS_COLLECTION);
    return [];
  }
}

// 2. Companies Sync Helpers
export async function saveCompanyToFirestore(company: any) {
  try {
    const docRef = doc(db, COMPANIES_COLLECTION, company.id);
    await setDoc(docRef, company);
  } catch (error) {
    handleFirestoreError(error, "write", `${COMPANIES_COLLECTION}/${company.id}`);
  }
}

export async function deleteCompanyFromFirestore(companyId: string) {
  try {
    const docRef = doc(db, COMPANIES_COLLECTION, companyId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, "delete", `${COMPANIES_COLLECTION}/${companyId}`);
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
    handleFirestoreError(error, "list", COMPANIES_COLLECTION);
    return [];
  }
}

// 3. Professionals Sync Helpers
export async function saveProfessionalToFirestore(prof: { id: string; name: string; role: string; reg: string }) {
  try {
    const docRef = doc(db, PROFESSIONALS_COLLECTION, prof.id);
    await setDoc(docRef, prof);
  } catch (error) {
    handleFirestoreError(error, "write", `${PROFESSIONALS_COLLECTION}/${prof.id}`);
  }
}

export async function deleteProfessionalFromFirestore(profId: string) {
  try {
    const docRef = doc(db, PROFESSIONALS_COLLECTION, profId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, "delete", `${PROFESSIONALS_COLLECTION}/${profId}`);
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
    handleFirestoreError(error, "list", PROFESSIONALS_COLLECTION);
    return [];
  }
}

// 4. Global Catalog Sync Helpers
export async function saveCatalogToFirestore(catalog: any[]) {
  try {
    // We can save each item in the catalog
    const batch = writeBatch(db);
    catalog.forEach((item) => {
      const docRef = doc(db, CATALOG_COLLECTION, item.id);
      batch.set(docRef, item);
    });
    await batch.commit();
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
    handleFirestoreError(error, "list", CATALOG_COLLECTION);
    return [];
  }
}

// 5. Assessor Info Sync Helpers
export async function saveAssessorToFirestore(assessor: any) {
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, "assessor");
    await setDoc(docRef, assessor);
  } catch (error) {
    handleFirestoreError(error, "write", `${SETTINGS_COLLECTION}/assessor`);
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
    handleFirestoreError(error, "get", `${SETTINGS_COLLECTION}/assessor`);
    return null;
  }
}

// 6. Evaluators Sync Helpers
export async function saveEvaluatorToFirestore(evaluator: any) {
  try {
    const docRef = doc(db, EVALUATORS_COLLECTION, evaluator.id);
    await setDoc(docRef, evaluator);
  } catch (error) {
    handleFirestoreError(error, "write", `${EVALUATORS_COLLECTION}/${evaluator.id}`);
  }
}

export async function deleteEvaluatorFromFirestore(evaluatorId: string) {
  try {
    const docRef = doc(db, EVALUATORS_COLLECTION, evaluatorId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, "delete", `${EVALUATORS_COLLECTION}/${evaluatorId}`);
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
    handleFirestoreError(error, "list", EVALUATORS_COLLECTION);
    return [];
  }
}
