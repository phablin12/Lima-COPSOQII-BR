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
import {
  getAnalytics,
  Analytics,
  isSupported
} from "firebase/analytics";

// Resolve env variable compatibility with tsc
const env = (import.meta as any).env || {};

// Clean environment variables (removes accidental quotes and trailing whitespace)
const cleanEnvVar = (value: string | undefined, fallback: string): string => {
  if (!value) return fallback;
  let cleaned = value.trim();
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  return cleaned || fallback;
};

// Configuration provided by the user for their Firebase project
const firebaseConfig = {
  apiKey: cleanEnvVar(env.VITE_FIREBASE_API_KEY, "AIzaSyC1-GZOdiBIZDGXUVotc_MhcsVtngbHrdg"),
  authDomain: cleanEnvVar(env.VITE_FIREBASE_AUTH_DOMAIN, "relatorio-copsoqii-br-lima-eng.firebaseapp.com"),
  databaseURL: cleanEnvVar(env.VITE_FIREBASE_DATABASE_URL, "https://relatorio-copsoqii-br-lima-eng-default-rtdb.firebaseio.com"),
  projectId: cleanEnvVar(env.VITE_FIREBASE_PROJECT_ID, "relatorio-copsoqii-br-lima-eng"),
  storageBucket: cleanEnvVar(env.VITE_FIREBASE_STORAGE_BUCKET, "relatorio-copsoqii-br-lima-eng.firebasestorage.app"),
  messagingSenderId: cleanEnvVar(env.VITE_FIREBASE_MESSAGING_SENDER_ID, "963283915356"),
  appId: cleanEnvVar(env.VITE_FIREBASE_APP_ID, "1:963283915356:web:e9678f9df792fdbdf54c99"),
  measurementId: cleanEnvVar(env.VITE_FIREBASE_MEASUREMENT_ID, "G-RRK45EXJ8Y")
};

// Initialize Firebase safely
let app: any = null;
let db: any = null;
let auth: any = null;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
  console.log("Firebase inicializado com sucesso para o projeto:", firebaseConfig.projectId);
} catch (error) {
  console.error("Erro crítico na inicialização do Firebase SDK:", error);
}

export { db, auth };

// Safe Analytics initialization
let analytics: Analytics | null = null;
if (app && typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
      console.log("Firebase Analytics initialized successfully.");
    }
  }).catch((err) => {
    console.warn("Firebase Analytics is not supported in this environment:", err);
  });
}
export { analytics };

// Collection References
export const REPORTS_COLLECTION = "reports";
export const COMPANIES_COLLECTION = "companies";
export const PROFESSIONALS_COLLECTION = "professionals";
export const CATALOG_COLLECTION = "catalog";
export const SETTINGS_COLLECTION = "settings";

// --- HELPERS FOR SYNCHRONIZATION ---

/**
 * Handle firestore operation errors with detailed debugging as per skill guide
 */
function handleFirestoreError(error: unknown, operation: string, path: string) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType: operation,
    path,
    authInfo: { userId: null, email: null } // No auth active in standard client scope yet
  };
  console.error("Firestore Error [" + operation + "]:", JSON.stringify(errInfo));
}

// 1. Reports Sync Helpers
export async function saveReportToFirestore(report: any) {
  if (!db) {
    console.warn("Firestore não inicializado. saveReportToFirestore ignorado.");
    return;
  }
  try {
    const docRef = doc(db, REPORTS_COLLECTION, report.id);
    await setDoc(docRef, report);
  } catch (error) {
    handleFirestoreError(error, "write", `${REPORTS_COLLECTION}/${report.id}`);
  }
}

export async function deleteReportFromFirestore(reportId: string) {
  if (!db) {
    console.warn("Firestore não inicializado. deleteReportFromFirestore ignorado.");
    return;
  }
  try {
    const docRef = doc(db, REPORTS_COLLECTION, reportId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, "delete", `${REPORTS_COLLECTION}/${reportId}`);
  }
}

export async function loadReportsFromFirestore() {
  if (!db) {
    console.warn("Firestore não inicializado. loadReportsFromFirestore ignorado.");
    return [];
  }
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
  if (!db) {
    console.warn("Firestore não inicializado. saveCompanyToFirestore ignorado.");
    return;
  }
  try {
    const docRef = doc(db, COMPANIES_COLLECTION, company.id);
    await setDoc(docRef, company);
  } catch (error) {
    handleFirestoreError(error, "write", `${COMPANIES_COLLECTION}/${company.id}`);
  }
}

export async function deleteCompanyFromFirestore(companyId: string) {
  if (!db) {
    console.warn("Firestore não inicializado. deleteCompanyFromFirestore ignorado.");
    return;
  }
  try {
    const docRef = doc(db, COMPANIES_COLLECTION, companyId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, "delete", `${COMPANIES_COLLECTION}/${companyId}`);
  }
}

export async function loadCompaniesFromFirestore() {
  if (!db) {
    console.warn("Firestore não inicializado. loadCompaniesFromFirestore ignorado.");
    return [];
  }
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
  if (!db) {
    console.warn("Firestore não inicializado. saveProfessionalToFirestore ignorado.");
    return;
  }
  try {
    const docRef = doc(db, PROFESSIONALS_COLLECTION, prof.id);
    await setDoc(docRef, prof);
  } catch (error) {
    handleFirestoreError(error, "write", `${PROFESSIONALS_COLLECTION}/${prof.id}`);
  }
}

export async function deleteProfessionalFromFirestore(profId: string) {
  if (!db) {
    console.warn("Firestore não inicializado. deleteProfessionalFromFirestore ignorado.");
    return;
  }
  try {
    const docRef = doc(db, PROFESSIONALS_COLLECTION, profId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, "delete", `${PROFESSIONALS_COLLECTION}/${profId}`);
  }
}

export async function loadProfessionalsFromFirestore() {
  if (!db) {
    console.warn("Firestore não inicializado. loadProfessionalsFromFirestore ignorado.");
    return [];
  }
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
  if (!db) {
    console.warn("Firestore não inicializado. saveCatalogToFirestore ignorado.");
    return;
  }
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
  if (!db) {
    console.warn("Firestore não inicializado. loadCatalogFromFirestore ignorado.");
    return [];
  }
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
  if (!db) {
    console.warn("Firestore não inicializado. saveAssessorToFirestore ignorado.");
    return;
  }
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, "assessor");
    await setDoc(docRef, assessor);
  } catch (error) {
    handleFirestoreError(error, "write", `${SETTINGS_COLLECTION}/assessor`);
  }
}

export async function loadAssessorFromFirestore() {
  if (!db) {
    console.warn("Firestore não inicializado. loadAssessorFromFirestore ignorado.");
    return null;
  }
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
