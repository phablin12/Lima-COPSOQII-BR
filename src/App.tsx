/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from "react";
import { Report, CatalogRisk, ReportChapters, Assessor } from "./types";
import { DEFAULT_RISK_CATALOG } from "./defaultCatalog";
import { DEFAULT_CHAPTERS, DEFAULT_FINAL_CONSIDERATIONS } from "./defaultChapters";
import { ReportsDashboard } from "./components/ReportsDashboard";
import { GeneralInfoForm } from "./components/GeneralInfoForm";
import { CopsoqEvaluation } from "./components/CopsoqEvaluation";
import { TechnicalAnalysis } from "./components/TechnicalAnalysis";
import { RiskCatalogEditor } from "./components/RiskCatalogEditor";
import { RiskInventoryManager } from "./components/RiskInventoryManager";
import { ActionPlanManager } from "./components/ActionPlanManager";
import { ChaptersEditor } from "./components/ChaptersEditor";
import { ReportPrintPreview } from "./components/ReportPrintPreview";
import { CompaniesRegistry } from "./components/CompaniesRegistry";
import { ProfessionalsRegistry } from "./components/ProfessionalsRegistry";
import { ManagementDashboard } from "./components/ManagementDashboard";
import { CompanyCustomization } from "./components/CompanyCustomization";
import { EvaluatorsRegistry } from "./components/EvaluatorsRegistry";
import { AiAgentSettings } from "./components/AiAgentSettings";
import { setActiveAiAgentConfig } from "./aiService";
import { 
  Shield, 
  Building, 
  Sliders, 
  MessageSquare, 
  BookOpen, 
  FileSpreadsheet, 
  ClipboardList, 
  BookOpenCheck, 
  FileText, 
  Check, 
  UserCheck, 
  Building2, 
  LayoutDashboard, 
  Menu, 
  X, 
  LogOut, 
  Cloud, 
  CloudOff, 
  ShieldCheck,
  RefreshCw,
  AlertCircle,
  Bot
} from "lucide-react";
import { 
  onAuthStateChanged,
  signOut
} from "firebase/auth";
import { 
  onSnapshot, 
  collection, 
  doc 
} from "firebase/firestore";
import { 
  auth,
  db,
  REPORTS_COLLECTION,
  COMPANIES_COLLECTION,
  PROFESSIONALS_COLLECTION,
  CATALOG_COLLECTION,
  SETTINGS_COLLECTION,
  EVALUATORS_COLLECTION,
  saveReportToFirestore, 
  deleteReportFromFirestore, 
  loadReportsFromFirestore,
  saveCompanyToFirestore, 
  deleteCompanyFromFirestore, 
  loadCompaniesFromFirestore,
  saveProfessionalToFirestore, 
  deleteProfessionalFromFirestore, 
  loadProfessionalsFromFirestore,
  saveCatalogToFirestore, 
  loadCatalogFromFirestore,
  saveAssessorToFirestore, 
  loadAssessorFromFirestore,
  saveEvaluatorToFirestore,
  deleteEvaluatorFromFirestore,
  loadEvaluatorsFromFirestore,
  formatCloudErrorMessage,
  testFirestoreConnection
} from "./firebase";
import { Login } from "./components/Login";
import {
  getImageSync,
  getImageAsync,
  saveImageToCache,
  saveJsonToCache,
  getJsonFromCache,
} from "./imageStore";

// Utility to prune large base64 image strings from localStorage JSON caches (full-fidelity copies live in IndexedDB + Firestore)
function pruneLargeStrings(
  obj: any,
  keyName?: string,
  options?: { isAssessorSettings?: boolean }
): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "string") {
    const isImageData = obj.startsWith("data:image/") || obj.includes(";base64,");
    if (options?.isAssessorSettings) {
      // Assessor logo & cover live in imageStore (IndexedDB + single sst_img_* slot); avoid duplicating them in sst_psicossocial_assessor
      if ((keyName === "logo" || keyName === "defaultCoverImage") && obj.length > 25000) {
        return "[OMITTED_IMAGE_FOR_CACHE]";
      }
      if (isImageData && obj.length > 60000) {
        return "";
      }
      if (obj.length > 250000) {
        return "";
      }
      return obj;
    }

    // For report/company/evaluator arrays in localStorage, strip embedded images > 30KB (full copies are in IndexedDB + Firestore)
    if ((isImageData && obj.length > 30000) || obj.length > 150000) {
      return "";
    }
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => pruneLargeStrings(item, keyName, options));
  }
  if (typeof obj === "object") {
    const pruned: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        pruned[key] = pruneLargeStrings(obj[key], key, options);
      }
    }
    return pruned;
  }
  return obj;
}

function safeSetLocalStorageItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error: any) {
    if (error?.name === "QuotaExceededError" || error?.code === 22 || error?.code === 1014) {
      if (key.startsWith("sst_img_")) {
        return false;
      }
      try {
        localStorage.removeItem("sst_psicossocial_catalog");
        localStorage.removeItem("sst_fast_assessor_logo");
        localStorage.removeItem("sst_fast_cover_image");
        if (key !== "sst_psicossocial_reports") {
          localStorage.removeItem("sst_psicossocial_reports");
        }
        localStorage.setItem(key, value);
        return true;
      } catch {
        // Quota still exceeded; IndexedDB + Firestore retain full copies
        return false;
      }
    }
    return false;
  }
}

function safeSetLocalStorageJson(
  key: string,
  data: unknown,
  options?: { isAssessorSettings?: boolean }
): boolean {
  try {
    const pruned = pruneLargeStrings(data, undefined, options);
    const serialized = JSON.stringify(pruned);
    return safeSetLocalStorageItem(key, serialized);
  } catch {
    return false;
  }
}

// Proactive storage cleanup on startup to shrink any bloated legacy caches and free quota before app mounts
function proactiveStorageCleanup() {
  try {
    try {
      localStorage.removeItem("sst_fast_assessor_logo");
      localStorage.removeItem("sst_fast_cover_image");
    } catch {
      // ignore
    }

    const targets: Array<{ key: string; isAssessor?: boolean }> = [
      { key: "sst_psicossocial_reports" },
      { key: "sst_psicossocial_companies" },
      { key: "sst_psicossocial_evaluators" },
      { key: "sst_psicossocial_assessor", isAssessor: true },
    ];

    for (const { key, isAssessor } of targets) {
      const val = localStorage.getItem(key);
      if (val && (val.startsWith("{") || val.startsWith("["))) {
        try {
          const parsed = JSON.parse(val);
          const pruned = pruneLargeStrings(parsed, undefined, { isAssessorSettings: isAssessor });
          const prunedStr = JSON.stringify(pruned);
          if (prunedStr.length < val.length) {
            safeSetLocalStorageItem(key, prunedStr);
          }
        } catch {
          // Ignore parse errors
        }
      }
    }
  } catch {
    // Ignore proactive cleanup errors
  }
}

// Run proactive storage cleanup before hydrating state
proactiveStorageCleanup();

// Helper to read initial navigation state from URL query parameters or localStorage
const getInitialNavState = () => {
  let initialReportId: string | null = null;
  let initialActiveTab: string = "cadastro";
  let initialHomeTab: "dashboard" | "reports" | "companies" | "professionals" | "risks" | "customization" | "evaluators" | "ai_agent" = "dashboard";

  try {
    const params = new URLSearchParams(window.location.search);
    const urlReportId = params.get("reportId");
    const urlTab = params.get("tab");
    const urlView = params.get("view");

    if (urlReportId) {
      initialReportId = urlReportId;
      if (urlTab) initialActiveTab = urlTab;
    } else if (urlView) {
      initialHomeTab = urlView as any;
    } else {
      // Fallback to localStorage if URL has no search params (e.g. reload or root load)
      const savedReportId = localStorage.getItem("sst_nav_currentReportId");
      const savedActiveTab = localStorage.getItem("sst_nav_activeTab");
      const savedHomeTab = localStorage.getItem("sst_nav_homeTab");

      if (savedReportId) {
        initialReportId = savedReportId;
        if (savedActiveTab) initialActiveTab = savedActiveTab;
      } else if (savedHomeTab) {
        initialHomeTab = savedHomeTab as any;
      }
    }
  } catch (e) {
    console.error("Erro ao ler estado de navegação inicial:", e);
  }

  return { initialReportId, initialActiveTab, initialHomeTab };
};

export default function App() {
  const initialNav = getInitialNavState();

  // Central State with synchronous lazy localStorage hydration for instant render
  const [reports, setReports] = useState<Report[]>(() => {
    try {
      const stored = localStorage.getItem("sst_psicossocial_reports");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [currentReportId, setCurrentReportId] = useState<string | null>(initialNav.initialReportId);
  const [activeTab, setActiveTab] = useState<string>(initialNav.initialActiveTab);
  const [homeTab, setHomeTab] = useState<"dashboard" | "reports" | "companies" | "professionals" | "risks" | "customization" | "evaluators" | "ai_agent">(
    initialNav.initialHomeTab
  );

  const isPopStateRef = useRef(false);
  const isInitialMountRef = useRef(true);

  // Sync navigation state with browser history (popstate / back & forward arrows)
  useEffect(() => {
    const handlePopState = () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const urlReportId = params.get("reportId");
        const urlTab = params.get("tab");
        const urlView = params.get("view");

        isPopStateRef.current = true;

        if (urlReportId) {
          setCurrentReportId(urlReportId);
          if (urlTab) setActiveTab(urlTab);
        } else {
          setCurrentReportId(null);
          if (urlView) setHomeTab(urlView as any);
        }
      } catch (err) {
        console.error("Erro ao processar popstate:", err);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Update URL and localStorage when navigation state changes
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);

      if (currentReportId) {
        params.set("reportId", currentReportId);
        params.set("tab", activeTab);
        params.delete("view");
        safeSetLocalStorageItem("sst_nav_currentReportId", currentReportId);
        safeSetLocalStorageItem("sst_nav_activeTab", activeTab);
        localStorage.removeItem("sst_nav_homeTab");
      } else {
        params.delete("reportId");
        params.delete("tab");
        params.set("view", homeTab);
        localStorage.removeItem("sst_nav_currentReportId");
        localStorage.removeItem("sst_nav_activeTab");
        safeSetLocalStorageItem("sst_nav_homeTab", homeTab);
      }

      const newSearch = params.toString();
      const newUrl = newSearch ? `${window.location.pathname}?${newSearch}` : window.location.pathname;
      const currentUrl = `${window.location.pathname}${window.location.search}`;

      if (isPopStateRef.current) {
        isPopStateRef.current = false;
        return;
      }

      if (isInitialMountRef.current) {
        isInitialMountRef.current = false;
        if (newUrl !== currentUrl) {
          window.history.replaceState({ currentReportId, activeTab, homeTab }, "", newUrl);
        }
        return;
      }

      if (newUrl !== currentUrl) {
        window.history.pushState({ currentReportId, activeTab, homeTab }, "", newUrl);
      }
    } catch (err) {
      console.error("Erro ao sincronizar URL e localStorage:", err);
    }
  }, [currentReportId, activeTab, homeTab]);

  // Clean up nonexistent reportId after database sync
  useEffect(() => {
    if (currentReportId && reports.length > 0 && hasCheckedReportsSeedingRef.current) {
      const exists = reports.some((r) => r.id === currentReportId);
      if (!exists) {
        setCurrentReportId(null);
      }
    }
  }, [reports, currentReportId]);

  // Debounce & fresh state refs for report saving
  const latestReportToSaveRef = useRef<Report | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reportLocalPersistTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingLocalPersistReportsRef = useRef<Report[] | null>(null);
  const reportsRef = useRef<Report[]>(reports);
  reportsRef.current = reports;
  const pendingCloudSyncsRef = useRef<Map<string, () => Promise<void>>>(new Map());

  const persistReportsLocally = (list: Report[]) => {
    if (reportLocalPersistTimeoutRef.current) {
      clearTimeout(reportLocalPersistTimeoutRef.current);
      reportLocalPersistTimeoutRef.current = null;
    }
    pendingLocalPersistReportsRef.current = null;
    saveJsonToCache("reports", list);
    safeSetLocalStorageJson("sst_psicossocial_reports", list);
    setLastSaved(new Date().toLocaleTimeString());
  };

  const flushLocalReportsPersistence = () => {
    if (reportLocalPersistTimeoutRef.current) {
      clearTimeout(reportLocalPersistTimeoutRef.current);
      reportLocalPersistTimeoutRef.current = null;
    }
    if (pendingLocalPersistReportsRef.current) {
      const pendingList = pendingLocalPersistReportsRef.current;
      pendingLocalPersistReportsRef.current = null;
      saveJsonToCache("reports", pendingList);
      safeSetLocalStorageJson("sst_psicossocial_reports", pendingList);
      setLastSaved(new Date().toLocaleTimeString());
    }
  };

  // Seeding check refs to prevent deleted items from reappearing when database is empty
  const hasCheckedReportsSeedingRef = useRef(false);
  const hasFirestoreReportsLoadedRef = useRef(false);
  const hasCheckedCompaniesSeedingRef = useRef(false);
  const hasCheckedProfessionalsSeedingRef = useRef(false);
  const hasCheckedEvaluatorsSeedingRef = useRef(false);

  const [globalCatalog, setGlobalCatalog] = useState<CatalogRisk[]>(() => {
    try {
      const stored = localStorage.getItem("sst_psicossocial_catalog");
      return stored ? JSON.parse(stored) : DEFAULT_RISK_CATALOG;
    } catch {
      return DEFAULT_RISK_CATALOG;
    }
  });
  const [companies, setCompanies] = useState<any[]>(() => {
    try {
      const stored = localStorage.getItem("sst_psicossocial_companies");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [professionals, setProfessionals] = useState<{ id: string; name: string; role: string; reg: string }[]>(() => {
    try {
      const stored = localStorage.getItem("sst_psicossocial_professionals");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [evaluators, setEvaluators] = useState<Assessor[]>(() => {
    try {
      const stored = localStorage.getItem("sst_psicossocial_evaluators");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [syncState, setSyncState] = useState<"synced" | "syncing" | "error" | "offline">(() =>
    typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "synced"
  );
  const [syncErrorDetail, setSyncErrorDetail] = useState<string | null>(null);
  
  // Assessing Company details
  // Assessing Company details with instant lazy initialization from localStorage
  const [assessor, setAssessor] = useState<{
    fantasyName: string;
    socialName: string;
    cnpj: string;
    address: string;
    phone: string;
    logo: string;
    favicon?: string;
    siteName?: string;
    defaultCoverImage?: string;
    email?: string;
    website?: string;
    technicalResponsible?: string;
    technicalResponsibleReg?: string;
    stateReg?: string;
    municipalReg?: string;
    cep?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    legalResponsible?: string;
    legalResponsibleCpf?: string;
    defaultChapters?: ReportChapters;
    defaultFinalConsiderations?: string;
  }>(() => {
    const fallback = {
      fantasyName: "Lima engenharia e assessoria em segurança do trabalho",
      socialName: "E. L. de Jesus – Segurança",
      cnpj: "18.195.986/0001-68",
      address: "Av. Mato grosso, 108-W, Centro, Tangará da Serra – MT",
      phone: "65 99998-0418",
      logo: "",
      favicon: "",
      siteName: "SST Psicossocial",
      defaultCoverImage: "",
      email: "contato@limasst.com.br",
      website: "www.limasst.com.br",
      technicalResponsible: "Eng. Edimilson Lima",
      technicalResponsibleReg: "CREA-MT 123456",
      stateReg: "",
      municipalReg: "",
      cep: "78300-000",
      neighborhood: "Centro",
      city: "Tangará da Serra",
      state: "MT",
      legalResponsible: "Edimilson Lima",
      legalResponsibleCpf: "123.456.789-00",
      defaultChapters: { ...DEFAULT_CHAPTERS },
      defaultFinalConsiderations: DEFAULT_FINAL_CONSIDERATIONS
    };

    try {
      const fastLogo = getImageSync("assessor_logo");
      const fastCover = getImageSync("cover_image");
      const stored = localStorage.getItem("sst_psicossocial_assessor");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (fastLogo && (!parsed.logo || parsed.logo === "[OMITTED_IMAGE_FOR_CACHE]")) {
          parsed.logo = fastLogo;
        }
        if (fastCover && (!parsed.defaultCoverImage || parsed.defaultCoverImage === "[OMITTED_IMAGE_FOR_CACHE]")) {
          parsed.defaultCoverImage = fastCover;
        }
        return { ...fallback, ...parsed };
      }
      if (fastLogo || fastCover) {
        return { ...fallback, logo: fastLogo || "", defaultCoverImage: fastCover || "" };
      }
    } catch (e) {
      console.error("Erro ao ler assessor do localStorage no boot inicial:", e);
    }
    return fallback;
  });

  // Keep aiService synchronized with assessor's trained AI agent configuration
  useEffect(() => {
    setActiveAiAgentConfig((assessor as Assessor).aiAgentConfig);
  }, [(assessor as Assessor).aiAgentConfig]);

  // Preload assessor logo and cover image into browser memory cache immediately for zero latency decoding
  useEffect(() => {
    if (assessor.logo && assessor.logo !== "[OMITTED_IMAGE_FOR_CACHE]") {
      saveImageToCache("assessor_logo", assessor.logo);
    }
    if (assessor.defaultCoverImage && assessor.defaultCoverImage !== "[OMITTED_IMAGE_FOR_CACHE]") {
      saveImageToCache("cover_image", assessor.defaultCoverImage);
    }
  }, [assessor.logo, assessor.defaultCoverImage]);

  // Dynamic Browser tab title and favicon sync
  useEffect(() => {
    if (assessor.siteName) {
      document.title = assessor.siteName;
    } else {
      document.title = "SST Psicossocial";
    }

    if (assessor.favicon) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = assessor.favicon;
    }
  }, [assessor]);

  // Mobile sidebar drawer & desktop hover-retractable sidebar states
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const isSidebarExpanded = isMobileMenuOpen || isSidebarHovered;

  // Authentication State - Instant render using cached user session to avoid blocking spinner on refresh
  const [user, setUser] = useState<any>(() => {
    try {
      const cached = localStorage.getItem("sst_cached_user");
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [authLoading, setAuthLoading] = useState<boolean>(() => {
    try {
      return !localStorage.getItem("sst_cached_user");
    } catch {
      return true;
    }
  });
  // Tracks whether Firebase SDK has finished restoring auth.currentUser (prevents permission-denied on frame 1)
  const [authSessionReady, setAuthSessionReady] = useState<boolean>(() => Boolean(auth.currentUser));

  const recordCloudFailure = (err: unknown, taskKey?: string, retryFn?: () => Promise<void>) => {
    if (taskKey && retryFn) {
      pendingCloudSyncsRef.current.set(taskKey, retryFn);
    }
    const isOffline = typeof navigator !== "undefined" && !navigator.onLine;
    setSyncErrorDetail(isOffline ? "Sem conexão com a internet. Alterações salvas localmente." : formatCloudErrorMessage(err));
    setSyncState(isOffline ? "offline" : "error");
  };

  const handleRetryCloudSync = async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setSyncState("offline");
      setSyncErrorDetail("Sem conexão com a internet. Assim que voltar, tentaremos novamente.");
      return;
    }
    if (!auth.currentUser) {
      setSyncState("error");
      setSyncErrorDetail("Sessão de autenticação expirada ou ainda inicializando.");
      return;
    }

    setSyncState("syncing");
    setSyncErrorDetail(null);

    try {
      flushLocalReportsPersistence();

      // Flush any debounced report edit immediately
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      if (latestReportToSaveRef.current) {
        const pendingReport = latestReportToSaveRef.current;
        await saveReportToFirestore(pendingReport);
        if (latestReportToSaveRef.current === pendingReport) {
          latestReportToSaveRef.current = null;
        }
        pendingCloudSyncsRef.current.delete(`report:${pendingReport.id}`);
      }

      // Retry any failed entity sync tasks
      const pendingEntries: Array<[string, () => Promise<void>]> = [];
      pendingCloudSyncsRef.current.forEach((fn, key) => {
        pendingEntries.push([key, fn]);
      });
      for (const [key, fn] of pendingEntries) {
        await fn();
        pendingCloudSyncsRef.current.delete(key);
      }

      const connected = await testFirestoreConnection();
      if (!connected && pendingCloudSyncsRef.current.size > 0) {
        throw new Error("Não foi possível confirmar a conexão com o servidor.");
      }

      setSyncState("synced");
      setSyncErrorDetail(null);
    } catch (err) {
      console.error("Erro ao reenviar dados pendentes para a nuvem:", err);
      recordCloudFailure(err);
    }
  };

  // Monitor browser online/offline transitions, flush pending local edits on tab hide/unload
  useEffect(() => {
    const onOnline = () => {
      handleRetryCloudSync();
    };
    const onOffline = () => {
      setSyncState("offline");
      setSyncErrorDetail("Sem conexão com a internet. Seus dados continuam salvos localmente.");
    };
    const onBeforeUnload = () => {
      flushLocalReportsPersistence();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flushLocalReportsPersistence();
      }
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("pagehide", onBeforeUnload);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      flushLocalReportsPersistence();
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("pagehide", onBeforeUnload);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  // A. Monitor Firebase Authentication State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      setAuthSessionReady(true);
      try {
        if (currentUser) {
          safeSetLocalStorageJson("sst_cached_user", {
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: currentUser.displayName
          });
          testFirestoreConnection();
        } else {
          localStorage.removeItem("sst_cached_user");
        }
      } catch (e) {}
    });
    return () => unsubscribe();
  }, []);

  // B. Load data from localStorage on mount for fast immediate render
  useEffect(() => {
    try {
      const storedReports = localStorage.getItem("sst_psicossocial_reports");
      if (storedReports) {
        setReports(JSON.parse(storedReports));
      }

      const storedCatalog = localStorage.getItem("sst_psicossocial_catalog");
      if (storedCatalog) {
        setGlobalCatalog(JSON.parse(storedCatalog));
      } else {
        setGlobalCatalog(DEFAULT_RISK_CATALOG);
      }

      const storedCompanies = localStorage.getItem("sst_psicossocial_companies");
      if (storedCompanies) {
        setCompanies(JSON.parse(storedCompanies));
      }

      const storedProfessionals = localStorage.getItem("sst_psicossocial_professionals");
      if (storedProfessionals) {
        setProfessionals(JSON.parse(storedProfessionals));
      }

      const storedEvaluators = localStorage.getItem("sst_psicossocial_evaluators");
      if (storedEvaluators) {
        setEvaluators(JSON.parse(storedEvaluators));
      }

      const storedAssessor = localStorage.getItem("sst_psicossocial_assessor");
      if (storedAssessor) {
        const parsed = JSON.parse(storedAssessor);
        setAssessor((prev) => {
          const effectiveLogo = (parsed.logo && parsed.logo !== "[OMITTED_IMAGE_FOR_CACHE]")
            ? parsed.logo
            : (prev.logo && prev.logo !== "[OMITTED_IMAGE_FOR_CACHE]" ? prev.logo : getImageSync("assessor_logo"));
          const effectiveCover = (parsed.defaultCoverImage && parsed.defaultCoverImage !== "[OMITTED_IMAGE_FOR_CACHE]")
            ? parsed.defaultCoverImage
            : (prev.defaultCoverImage && prev.defaultCoverImage !== "[OMITTED_IMAGE_FOR_CACHE]" ? prev.defaultCoverImage : getImageSync("cover_image"));
          return {
            ...prev,
            ...parsed,
            logo: effectiveLogo,
            defaultCoverImage: effectiveCover
          };
        });
      }

      // Restore full-fidelity logo, cover, and full report snapshots from IndexedDB immediately
      getImageAsync("assessor_logo").then((logo) => {
        if (logo) {
          setAssessor((prev) => (!prev.logo || prev.logo === "[OMITTED_IMAGE_FOR_CACHE]" ? { ...prev, logo } : prev));
        }
      });
      getImageAsync("cover_image").then((cover) => {
        if (cover) {
          setAssessor((prev) => (!prev.defaultCoverImage || prev.defaultCoverImage === "[OMITTED_IMAGE_FOR_CACHE]" ? { ...prev, defaultCoverImage: cover } : prev));
        }
      });
      getJsonFromCache<Report[]>("reports").then((cachedReports) => {
        if (
          !hasFirestoreReportsLoadedRef.current &&
          cachedReports &&
          Array.isArray(cachedReports) &&
          cachedReports.length > 0
        ) {
          setReports(cachedReports);
        }
      });
    } catch (err) {
      console.error("Erro ao ler dados do localStorage:", err);
    }
  }, []);

  // C. Real-Time Synchronization from Firestore - Wait for genuine Firebase Auth session before subscribing
  useEffect(() => {
    if (!authSessionReady || !user || !auth.currentUser) return;

    setSyncState(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "syncing");

    // Flush any edits made in the first milliseconds before authSessionReady completed
    if (pendingCloudSyncsRef.current.size > 0 || (latestReportToSaveRef.current && !saveTimeoutRef.current)) {
      handleRetryCloudSync();
    }

    const markSnapshotSynced = () => {
      if (pendingCloudSyncsRef.current.size === 0 && !latestReportToSaveRef.current) {
        setSyncState("synced");
        setSyncErrorDetail(null);
      }
    };

    // Reset seeding tracking refs on login / user change
    hasCheckedReportsSeedingRef.current = false;
    hasCheckedCompaniesSeedingRef.current = false;
    hasCheckedProfessionalsSeedingRef.current = false;

    // Helper to merge and upload missing local items to Firestore if collection is empty
    const uploadLocalIfCollectionIsEmpty = async (collectionName: string, localData: any[], saveFn: (item: any) => Promise<void>) => {
      try {
        if (localData && localData.length > 0) {
          console.log(`Subindo dados locais para a coleção ${collectionName} vazia no Firestore...`);
          for (const item of localData) {
            await saveFn(item);
          }
        }
      } catch (err) {
        console.error(`Erro ao subir dados locais para ${collectionName}:`, err);
        recordCloudFailure(err);
      }
    };

    // 1. Real-time Reports Listener
    const unsubReports = onSnapshot(
      collection(db, REPORTS_COLLECTION),
      async (snapshot) => {
        if (snapshot.metadata.hasPendingWrites) return;

        const list: Report[] = [];
        snapshot.forEach((d) => {
          list.push({ ...d.data(), id: d.id } as Report);
        });

        if (list.length > 0) {
          hasCheckedReportsSeedingRef.current = true;
          hasFirestoreReportsLoadedRef.current = true;

          // Keep any newer pending local edits or unsaved newly created reports not yet echoed by Firestore
          const pending = latestReportToSaveRef.current;
          const pendingReportIds = new Set<string>();
          const deletingReportIds = new Set<string>();
          pendingCloudSyncsRef.current.forEach((_, key) => {
            if (key.startsWith("report:")) {
              pendingReportIds.add(key.slice("report:".length));
            } else if (key.startsWith("delete_report:")) {
              deletingReportIds.add(key.slice("delete_report:".length));
            }
          });

          const localById = new Map<string, Report>();
          reportsRef.current.forEach((r) => localById.set(r.id, r));
          if (pending) localById.set(pending.id, pending);

          const mergedMap = new Map<string, Report>();
          list.forEach((item) => {
            if (deletingReportIds.has(item.id)) return;
            const localCandidate =
              pending && pending.id === item.id
                ? pending
                : pendingReportIds.has(item.id)
                  ? localById.get(item.id)
                  : undefined;

            if (localCandidate && (localCandidate.updatedAt || "") >= (item.updatedAt || "")) {
              mergedMap.set(item.id, localCandidate);
            } else {
              mergedMap.set(item.id, item);
            }
          });

          // Ensure unsaved local/new reports remain visible even if Firestore hasn't persisted them yet
          if (pending && !deletingReportIds.has(pending.id) && !mergedMap.has(pending.id)) {
            mergedMap.set(pending.id, pending);
          }
          pendingReportIds.forEach((id) => {
            if (!deletingReportIds.has(id) && !mergedMap.has(id)) {
              const localReport = localById.get(id);
              if (localReport) mergedMap.set(id, localReport);
            }
          });

          const mergedList = Array.from(mergedMap.values());

          // Sort reports consistently across all PCs by updatedAt / createdAt descending
          mergedList.sort((a, b) => {
            const dateA = a.updatedAt || a.createdAt || "";
            const dateB = b.updatedAt || b.createdAt || "";
            return dateB.localeCompare(dateA);
          });
          reportsRef.current = mergedList;
          setReports(mergedList);
          saveJsonToCache("reports", mergedList);
          safeSetLocalStorageJson("sst_psicossocial_reports", mergedList);
        } else {
          // Firestore is empty - try to seed from IndexedDB or local storage if available, keeping local state
          if (!hasCheckedReportsSeedingRef.current) {
            hasCheckedReportsSeedingRef.current = true;
            const cachedIdb = await getJsonFromCache<Report[]>("reports");
            const stored = localStorage.getItem("sst_psicossocial_reports");
            const parsed = (cachedIdb && cachedIdb.length > 0) ? cachedIdb : (stored ? (JSON.parse(stored) as Report[]) : []);
            if (parsed && parsed.length > 0) {
              setReports(parsed);
              uploadLocalIfCollectionIsEmpty(REPORTS_COLLECTION, parsed, saveReportToFirestore);
            } else {
              setReports([]);
            }
          } else {
            // Only clear state if there are indeed no reports in active memory
            setReports((prev) => {
              if (prev && prev.length > 0) {
                return prev;
              }
              safeSetLocalStorageJson("sst_psicossocial_reports", []);
              return [];
            });
          }
        }
        markSnapshotSynced();
      },
      (error) => {
        console.error("Erro no onSnapshot de relatórios:", error);
        recordCloudFailure(error);
      }
    );

    // 2. Real-time Companies Listener
    const unsubCompanies = onSnapshot(
      collection(db, COMPANIES_COLLECTION),
      async (snapshot) => {
        if (snapshot.metadata.hasPendingWrites) return;

        const list: any[] = [];
        snapshot.forEach((d) => {
          list.push({ ...d.data(), id: d.id });
        });

        if (list.length > 0) {
          hasCheckedCompaniesSeedingRef.current = true;
          list.sort((a, b) => (a.fantasyName || a.name || "").localeCompare(b.fantasyName || b.name || ""));
          setCompanies(list);
          safeSetLocalStorageJson("sst_psicossocial_companies", list);
        } else {
          if (!hasCheckedCompaniesSeedingRef.current) {
            hasCheckedCompaniesSeedingRef.current = true;
            const stored = localStorage.getItem("sst_psicossocial_companies");
            if (stored) {
              const parsed = JSON.parse(stored);
              if (parsed && parsed.length > 0) {
                setCompanies(parsed);
                uploadLocalIfCollectionIsEmpty(COMPANIES_COLLECTION, parsed, saveCompanyToFirestore);
              } else {
                setCompanies([]);
              }
            } else {
              setCompanies([]);
            }
          } else {
            setCompanies((prev) => {
              if (prev && prev.length > 0) {
                return prev;
              }
              safeSetLocalStorageJson("sst_psicossocial_companies", []);
              return [];
            });
          }
        }
        markSnapshotSynced();
      },
      (error) => {
        console.error("Erro no onSnapshot de empresas:", error);
        recordCloudFailure(error);
      }
    );

    // 3. Real-time Professionals Listener
    const unsubProfessionals = onSnapshot(
      collection(db, PROFESSIONALS_COLLECTION),
      async (snapshot) => {
        if (snapshot.metadata.hasPendingWrites) return;

        const list: any[] = [];
        snapshot.forEach((d) => {
          list.push({ ...d.data(), id: d.id });
        });

        if (list.length > 0) {
          hasCheckedProfessionalsSeedingRef.current = true;
          list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
          setProfessionals(list);
          safeSetLocalStorageJson("sst_psicossocial_professionals", list);
        } else {
          if (!hasCheckedProfessionalsSeedingRef.current) {
            hasCheckedProfessionalsSeedingRef.current = true;
            const stored = localStorage.getItem("sst_psicossocial_professionals");
            if (stored) {
              const parsed = JSON.parse(stored);
              if (parsed && parsed.length > 0) {
                setProfessionals(parsed);
                uploadLocalIfCollectionIsEmpty(PROFESSIONALS_COLLECTION, parsed, saveProfessionalToFirestore);
              } else {
                setProfessionals([]);
              }
            } else {
              setProfessionals([]);
            }
          } else {
            setProfessionals((prev) => {
              if (prev && prev.length > 0) {
                return prev;
              }
              safeSetLocalStorageJson("sst_psicossocial_professionals", []);
              return [];
            });
          }
        }
        markSnapshotSynced();
      },
      (error) => {
        console.error("Erro no onSnapshot de profissionais:", error);
        recordCloudFailure(error);
      }
    );

    // Real-time Evaluators Listener
    const unsubEvaluators = onSnapshot(
      collection(db, EVALUATORS_COLLECTION),
      async (snapshot) => {
        if (snapshot.metadata.hasPendingWrites) return;

        const list: Assessor[] = [];
        snapshot.forEach((d) => {
          list.push({ ...d.data(), id: d.id } as Assessor);
        });

        if (list.length > 0) {
          hasCheckedEvaluatorsSeedingRef.current = true;
          list.sort((a, b) => (a.fantasyName || "").localeCompare(b.fantasyName || ""));
          setEvaluators(list);
          safeSetLocalStorageJson("sst_psicossocial_evaluators", list);
        } else {
          if (!hasCheckedEvaluatorsSeedingRef.current) {
            hasCheckedEvaluatorsSeedingRef.current = true;
            const stored = localStorage.getItem("sst_psicossocial_evaluators");
            if (stored) {
              const parsed = JSON.parse(stored) as Assessor[];
              if (parsed && parsed.length > 0) {
                setEvaluators(parsed);
                uploadLocalIfCollectionIsEmpty(EVALUATORS_COLLECTION, parsed, saveEvaluatorToFirestore);
              } else {
                setEvaluators([]);
              }
            } else {
              setEvaluators([]);
            }
          } else {
            setEvaluators((prev) => {
              if (prev && prev.length > 0) {
                return prev;
              }
              safeSetLocalStorageJson("sst_psicossocial_evaluators", []);
              return [];
            });
          }
        }
        markSnapshotSynced();
      },
      (error) => {
        console.error("Erro no onSnapshot de avaliadores:", error);
        recordCloudFailure(error);
      }
    );

    // 4. Real-time Catalog Listener
    const unsubCatalog = onSnapshot(
      collection(db, CATALOG_COLLECTION),
      async (snapshot) => {
        if (snapshot.metadata.hasPendingWrites) return;

        const list: CatalogRisk[] = [];
        snapshot.forEach((d) => {
          list.push({ ...d.data(), id: d.id } as CatalogRisk);
        });

        if (list.length > 0) {
          setGlobalCatalog(list);
          safeSetLocalStorageJson("sst_psicossocial_catalog", list);
        } else {
          try {
            const storedCatalog = localStorage.getItem("sst_psicossocial_catalog");
            const catalogToSave = storedCatalog ? JSON.parse(storedCatalog) : DEFAULT_RISK_CATALOG;
            await saveCatalogToFirestore(catalogToSave);
          } catch (seedErr) {
            console.error("Erro ao inicializar catálogo no Firestore:", seedErr);
            recordCloudFailure(seedErr);
          }
        }
        markSnapshotSynced();
      },
      (error) => {
        console.error("Erro no onSnapshot de catálogo:", error);
        recordCloudFailure(error);
      }
    );

    // 5. Real-time Assessor (Settings) Listener
    const unsubAssessor = onSnapshot(
      doc(db, SETTINGS_COLLECTION, "assessor"),
      async (docSnap) => {
        if (docSnap.metadata.hasPendingWrites) return;

        if (docSnap.exists()) {
          const data = docSnap.data() as typeof assessor;
          if (data.logo && data.logo !== "[OMITTED_IMAGE_FOR_CACHE]") {
            saveImageToCache("assessor_logo", data.logo);
          }
          if (data.defaultCoverImage && data.defaultCoverImage !== "[OMITTED_IMAGE_FOR_CACHE]") {
            saveImageToCache("cover_image", data.defaultCoverImage);
          }
          setAssessor((prev) => ({
            ...data,
            logo:
              data.logo && data.logo !== "[OMITTED_IMAGE_FOR_CACHE]"
                ? data.logo
                : (prev.logo && prev.logo !== "[OMITTED_IMAGE_FOR_CACHE]" ? prev.logo : getImageSync("assessor_logo")),
            defaultCoverImage:
              data.defaultCoverImage && data.defaultCoverImage !== "[OMITTED_IMAGE_FOR_CACHE]"
                ? data.defaultCoverImage
                : (prev.defaultCoverImage && prev.defaultCoverImage !== "[OMITTED_IMAGE_FOR_CACHE]"
                    ? prev.defaultCoverImage
                    : getImageSync("cover_image")),
          }));
          saveJsonToCache("assessor", data);
          safeSetLocalStorageJson("sst_psicossocial_assessor", data, { isAssessorSettings: true });
        } else {
          try {
            await saveAssessorToFirestore(assessor);
          } catch (seedErr) {
            console.error("Erro ao inicializar dados da assessora no Firestore:", seedErr);
            recordCloudFailure(seedErr);
          }
        }
        markSnapshotSynced();
      },
      (error) => {
        console.error("Erro no onSnapshot do assessor:", error);
        recordCloudFailure(error);
      }
    );

    return () => {
      unsubReports();
      unsubCompanies();
      unsubProfessionals();
      unsubEvaluators();
      unsubCatalog();
      unsubAssessor();
    };
  }, [user, authSessionReady]);

  // 1b. Helper to persist companies (incremental diff + parallel Firestore writes)
  const handleUpdateCompanies = async (newCompanies: typeof companies) => {
    const prevCompanies = companies;
    setCompanies(newCompanies);
    safeSetLocalStorageJson("sst_psicossocial_companies", newCompanies);

    const syncFn = async () => {
      const prevById = new Map(prevCompanies.map((item) => [item.id, item]));
      const deleted = prevCompanies.filter((oc) => !newCompanies.some((nc) => nc.id === oc.id));
      const changedOrAdded = newCompanies.filter((nc) => {
        const prev = prevById.get(nc.id);
        return !prev || JSON.stringify(prev) !== JSON.stringify(nc);
      });
      await Promise.all([
        ...deleted.map((dc) => deleteCompanyFromFirestore(dc.id)),
        ...changedOrAdded.map((nc) => saveCompanyToFirestore(nc)),
      ]);
    };

    setSyncState("syncing");
    try {
      await syncFn();
      pendingCloudSyncsRef.current.delete("companies");
      if (pendingCloudSyncsRef.current.size === 0) {
        setSyncState("synced");
        setSyncErrorDetail(null);
      }
    } catch (err) {
      console.error("Erro ao sincronizar empresas no Firestore:", err);
      recordCloudFailure(err, "companies", syncFn);
    }
  };

  // 1c. Helper to persist professionals (incremental diff + parallel Firestore writes)
  const handleUpdateProfessionals = async (newProfs: typeof professionals) => {
    const prevProfs = professionals;
    setProfessionals(newProfs);
    safeSetLocalStorageJson("sst_psicossocial_professionals", newProfs);

    const syncFn = async () => {
      const prevById = new Map(prevProfs.map((item) => [item.id, item]));
      const deleted = prevProfs.filter((op) => !newProfs.some((np) => np.id === op.id));
      const changedOrAdded = newProfs.filter((np) => {
        const prev = prevById.get(np.id);
        return !prev || JSON.stringify(prev) !== JSON.stringify(np);
      });
      await Promise.all([
        ...deleted.map((dp) => deleteProfessionalFromFirestore(dp.id)),
        ...changedOrAdded.map((np) => saveProfessionalToFirestore(np)),
      ]);
    };

    setSyncState("syncing");
    try {
      await syncFn();
      pendingCloudSyncsRef.current.delete("professionals");
      if (pendingCloudSyncsRef.current.size === 0) {
        setSyncState("synced");
        setSyncErrorDetail(null);
      }
    } catch (err) {
      console.error("Erro ao sincronizar profissionais no Firestore:", err);
      recordCloudFailure(err, "professionals", syncFn);
    }
  };

  // 1c-2. Helper to persist evaluators (incremental diff + parallel Firestore writes)
  const handleUpdateEvaluators = async (newEvaluators: Assessor[]) => {
    const prevEvaluators = evaluators;
    setEvaluators(newEvaluators);
    safeSetLocalStorageJson("sst_psicossocial_evaluators", newEvaluators);

    const syncFn = async () => {
      const prevById = new Map(prevEvaluators.map((item) => [item.id, item]));
      const deleted = prevEvaluators.filter((ev) => !newEvaluators.some((nv) => nv.id === ev.id));
      const changedOrAdded = newEvaluators.filter((nev) => {
        const prev = prevById.get(nev.id);
        return !prev || JSON.stringify(prev) !== JSON.stringify(nev);
      });
      await Promise.all([
        ...deleted.map((dev) => deleteEvaluatorFromFirestore(dev.id)),
        ...changedOrAdded.map((nev) => saveEvaluatorToFirestore(nev)),
      ]);
    };

    setSyncState("syncing");
    try {
      await syncFn();
      pendingCloudSyncsRef.current.delete("evaluators");
      if (pendingCloudSyncsRef.current.size === 0) {
        setSyncState("synced");
        setSyncErrorDetail(null);
      }
    } catch (err) {
      console.error("Erro ao sincronizar avaliadores no Firestore:", err);
      recordCloudFailure(err, "evaluators", syncFn);
    }
  };

  // 1d. Helper to persist assessor company info
  const handleUpdateAssessor = async (newAssessor: typeof assessor) => {
    if (newAssessor.logo && newAssessor.logo !== "[OMITTED_IMAGE_FOR_CACHE]") {
      saveImageToCache("assessor_logo", newAssessor.logo);
    }
    if (newAssessor.defaultCoverImage && newAssessor.defaultCoverImage !== "[OMITTED_IMAGE_FOR_CACHE]") {
      saveImageToCache("cover_image", newAssessor.defaultCoverImage);
    }
    setAssessor(newAssessor);
    saveJsonToCache("assessor", newAssessor);
    safeSetLocalStorageJson("sst_psicossocial_assessor", newAssessor, { isAssessorSettings: true });

    const syncFn = async () => {
      await saveAssessorToFirestore(newAssessor);
    };

    setSyncState("syncing");
    try {
      await syncFn();
      pendingCloudSyncsRef.current.delete("assessor");
      if (pendingCloudSyncsRef.current.size === 0) {
        setSyncState("synced");
        setSyncErrorDetail(null);
      }
    } catch (err) {
      console.error("Erro ao sincronizar assessora no Firestore:", err);
      recordCloudFailure(err, "assessor", syncFn);
    }
  };

  // 2. Import / save multiple reports to Firestore
  const handleUpdateAllReports = async (updatedReports: Report[]) => {
    flushLocalReportsPersistence();
    reportsRef.current = updatedReports;
    setReports(updatedReports);
    persistReportsLocally(updatedReports);

    const syncFn = async () => {
      const latestMap = new Map(reportsRef.current.map((r) => [r.id, r]));
      await Promise.all(
        updatedReports.map((r) => saveReportToFirestore(latestMap.get(r.id) || r))
      );
    };

    setSyncState("syncing");
    try {
      await syncFn();
      pendingCloudSyncsRef.current.delete("bulk_reports");
      if (pendingCloudSyncsRef.current.size === 0 && !latestReportToSaveRef.current) {
        setSyncState("synced");
        setSyncErrorDetail(null);
      }
    } catch (err) {
      console.error("Erro ao salvar relatórios:", err);
      recordCloudFailure(err, "bulk_reports", syncFn);
    }
  };

  // 2b. Import single report JSON backup (saves only the imported report)
  const handleImportReport = async (importedReport: Report) => {
    flushLocalReportsPersistence();
    const updated = [importedReport, ...reportsRef.current];
    reportsRef.current = updated;
    setReports(updated);
    persistReportsLocally(updated);

    const syncFn = async () => {
      const latest = reportsRef.current.find((r) => r.id === importedReport.id) || importedReport;
      await saveReportToFirestore(latest);
    };

    setSyncState("syncing");
    try {
      await syncFn();
      pendingCloudSyncsRef.current.delete(`report:${importedReport.id}`);
      if (pendingCloudSyncsRef.current.size === 0 && !latestReportToSaveRef.current) {
        setSyncState("synced");
        setSyncErrorDetail(null);
      }
    } catch (err) {
      console.error("Erro ao importar relatório no Firestore:", err);
      recordCloudFailure(err, `report:${importedReport.id}`, syncFn);
    }
  };

  // 3. Persist catalog to localStorage and Firestore
  const handleUpdateCatalog = async (newCatalog: CatalogRisk[]) => {
    setGlobalCatalog(newCatalog);
    safeSetLocalStorageJson("sst_psicossocial_catalog", newCatalog);

    const syncFn = async () => {
      await saveCatalogToFirestore(newCatalog);
    };

    setSyncState("syncing");
    try {
      await syncFn();
      pendingCloudSyncsRef.current.delete("catalog");
      if (pendingCloudSyncsRef.current.size === 0) {
        setSyncState("synced");
        setSyncErrorDetail(null);
      }
    } catch (err) {
      console.error("Erro ao sincronizar catálogo no Firestore:", err);
      recordCloudFailure(err, "catalog", syncFn);
    }
  };

  // 4. Create new report
  const handleCreateReport = async (newReport: Report) => {
    flushLocalReportsPersistence();
    const updated = [newReport, ...reportsRef.current];
    reportsRef.current = updated;
    setReports(updated);
    persistReportsLocally(updated);

    latestReportToSaveRef.current = newReport;
    setCurrentReportId(newReport.id);
    setActiveTab("cadastro");

    const syncFn = async () => {
      const latest = reportsRef.current.find((r) => r.id === newReport.id) || newReport;
      await saveReportToFirestore(latest);
    };

    setSyncState("syncing");
    try {
      await syncFn();
      if (latestReportToSaveRef.current?.id === newReport.id) {
        latestReportToSaveRef.current = null;
      }
      pendingCloudSyncsRef.current.delete(`report:${newReport.id}`);
      if (pendingCloudSyncsRef.current.size === 0 && !latestReportToSaveRef.current) {
        setSyncState("synced");
        setSyncErrorDetail(null);
      }
    } catch (err) {
      console.error("Erro ao criar relatório no Firestore:", err);
      recordCloudFailure(err, `report:${newReport.id}`, syncFn);
    }
  };

  // 5. Delete report
  const handleDeleteReport = async (id: string) => {
    flushLocalReportsPersistence();
    const updated = reportsRef.current.filter((r) => r.id !== id);
    reportsRef.current = updated;
    setReports(updated);
    persistReportsLocally(updated);

    if (latestReportToSaveRef.current?.id === id) {
      latestReportToSaveRef.current = null;
    }
    if (currentReportId === id) {
      setCurrentReportId(null);
    }

    const syncFn = async () => {
      await deleteReportFromFirestore(id);
    };

    setSyncState("syncing");
    try {
      await syncFn();
      pendingCloudSyncsRef.current.delete(`delete_report:${id}`);
      if (pendingCloudSyncsRef.current.size === 0) {
        setSyncState("synced");
        setSyncErrorDetail(null);
      }
    } catch (err) {
      console.error("Erro ao deletar relatório no Firestore:", err);
      recordCloudFailure(err, `delete_report:${id}`, syncFn);
    }
  };

  // 6. Update current report attributes (uses reportsRef + debounced local/cloud persistence for smooth typing)
  const handleUpdateCurrentReport = (updatedFields: Partial<Report>) => {
    if (!currentReportId) return;

    const latestReports = reportsRef.current;
    const current = latestReports.find((r) => r.id === currentReportId);
    if (!current) return;

    const updatedReport: Report = {
      ...current,
      ...updatedFields,
      updatedAt: new Date().toISOString(),
    };

    const updatedReports = latestReports.map((r) => (r.id === currentReportId ? updatedReport : r));
    reportsRef.current = updatedReports;
    setReports(updatedReports);

    // Debounce local JSON serialization + IndexedDB snapshot during rapid typing
    pendingLocalPersistReportsRef.current = updatedReports;
    if (reportLocalPersistTimeoutRef.current) {
      clearTimeout(reportLocalPersistTimeoutRef.current);
    }
    reportLocalPersistTimeoutRef.current = setTimeout(() => {
      reportLocalPersistTimeoutRef.current = null;
      if (pendingLocalPersistReportsRef.current) {
        const toPersist = pendingLocalPersistReportsRef.current;
        pendingLocalPersistReportsRef.current = null;
        saveJsonToCache("reports", toPersist);
        safeSetLocalStorageJson("sst_psicossocial_reports", toPersist);
        setLastSaved(new Date().toLocaleTimeString());
      }
    }, 600);

    // Schedule debounced Firestore save
    latestReportToSaveRef.current = updatedReport;
    setSyncState(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "syncing");

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      saveTimeoutRef.current = null;
      const reportToSave = latestReportToSaveRef.current;
      if (!reportToSave) return;

      if (!auth.currentUser) {
        recordCloudFailure(
          new Error("unauthenticated"),
          `report:${reportToSave.id}`,
          async () => saveReportToFirestore(latestReportToSaveRef.current || reportToSave)
        );
        return;
      }

      try {
        await saveReportToFirestore(reportToSave);
        if (latestReportToSaveRef.current === reportToSave) {
          latestReportToSaveRef.current = null;
        }
        pendingCloudSyncsRef.current.delete(`report:${reportToSave.id}`);
        if (pendingCloudSyncsRef.current.size === 0 && !latestReportToSaveRef.current) {
          setSyncState("synced");
          setSyncErrorDetail(null);
        }
      } catch (err) {
        console.error("Erro ao atualizar relatório no Firestore:", err);
        recordCloudFailure(
          err,
          `report:${reportToSave.id}`,
          async () => saveReportToFirestore(latestReportToSaveRef.current || reportToSave)
        );
      }
    }, 1000);
  };

  // Get active report
  const currentReport = reports.find((r) => r.id === currentReportId);

  const handleSelectReport = (id: string | null) => {
    flushLocalReportsPersistence();
    if (saveTimeoutRef.current && latestReportToSaveRef.current) {
      void handleRetryCloudSync();
    }
    setCurrentReportId(id);
    if (id) {
      setActiveTab("cadastro");
    }
  };

  // Close mobile menu on click/nav change
  const handleNavClick = (action: () => void) => {
    action();
    setIsMobileMenuOpen(false);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4" id="app-auth-loading">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-900 border-t-amber-500"></div>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest animate-pulse">
            Carregando Sistema...
          </span>
        </div>
      </div>
    );
  }

  // If page was reloaded directly on a report but reports are still fetching from Firestore
  if (currentReportId && !currentReport && reports.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-900 border-t-amber-500"></div>
          <span className="text-xs font-bold text-slate-600 uppercase tracking-widest animate-pulse">
            Carregando laudo selecionado...
          </span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login onLoginSuccess={(u) => setUser(u)} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans" id="app-root-container">
      {/* Spacer fixo para manter o layout estável quando o sidebar expande no hover */}
      <div className="hidden md:block w-[68px] shrink-0 print:hidden" aria-hidden="true" />

      {/* 1. SIDEBAR ESQUERDA - Retrátil com Expansão no Mouse (Oculto na impressão) */}
      <aside
        onMouseEnter={() => setIsSidebarHovered(true)}
        onMouseLeave={() => setIsSidebarHovered(false)}
        className={`fixed inset-y-0 left-0 z-40 bg-white text-slate-700 border-r border-slate-200 flex flex-col justify-between transition-all duration-200 ease-out print:hidden ${
          isMobileMenuOpen
            ? "translate-x-0 w-64 shadow-2xl"
            : "-translate-x-full md:translate-x-0"
        } ${isSidebarHovered ? "md:w-64 md:shadow-2xl" : "md:w-[68px]"}`}
      >
        {/* Topo / Logotipo */}
        <div className="flex flex-col min-h-0 flex-1">
          <div
            className={`border-b border-slate-100 flex items-center shrink-0 transition-all duration-200 ${
              isSidebarExpanded ? "p-5 justify-between" : "py-5 px-3 justify-center"
            }`}
          >
            <button
              type="button"
              onClick={() =>
                handleNavClick(() => {
                  handleSelectReport(null);
                  setHomeTab("dashboard");
                })
              }
              title="Ir para o início do aplicativo"
              className={`flex items-center min-w-0 cursor-pointer hover:opacity-80 transition text-left ${
                isSidebarExpanded ? "gap-3" : "justify-center"
              }`}
            >
              {(() => {
                const effectiveLogo =
                  assessor.logo && assessor.logo !== "[OMITTED_IMAGE_FOR_CACHE]"
                    ? assessor.logo
                    : getImageSync("assessor_logo");

                return effectiveLogo ? (
                  <div
                    className="w-10 h-10 border border-slate-200 rounded-xl overflow-hidden bg-white flex items-center justify-center shrink-0"
                    title={assessor.fantasyName}
                  >
                    <img
                      src={effectiveLogo}
                      alt="Logo"
                      className="max-w-full max-h-full object-contain"
                      loading="eager"
                      decoding="sync"
                    />
                  </div>
                ) : (
                  <div
                    className="w-10 h-10 bg-slate-50 text-slate-700 rounded-xl flex items-center justify-center border border-slate-200 shadow-xs shrink-0"
                    title={assessor.fantasyName}
                  >
                    <Shield className="w-5 h-5 text-amber-500" />
                  </div>
                );
              })()}
              {isSidebarExpanded && (
                <div className="min-w-0">
                  <h1
                    className="text-xs font-black tracking-tight leading-none text-slate-800 uppercase truncate"
                    title={assessor.fantasyName}
                  >
                    {assessor.fantasyName.toLowerCase().includes("lima")
                      ? "Lima Engenharia"
                      : assessor.fantasyName.split(" ")[0]}
                  </h1>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1">
                    Workspace
                  </p>
                </div>
              )}
            </button>

            {/* Fechar no mobile */}
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="md:hidden p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* ÁREA DE NAVEGAÇÃO INTERNA DO SIDEBAR */}
          <div className={`space-y-5 overflow-y-auto overflow-x-hidden flex-1 ${isSidebarExpanded ? "p-4" : "px-2.5 py-4"}`}>
            {/* Se houver laudo ativo (Editando Laudo), mostra as etapas integradas no sidebar */}
            {currentReport ? (() => {
              const hasRecognizedRisks =
                currentReport.sectors.length > 0
                  ? currentReport.sectors.some((s) => s.risksRecognized !== false)
                  : currentReport.risksRecognized !== false;

              const initials = (currentReport.companyName || "LD")
                .trim()
                .split(/\s+/)
                .slice(0, 2)
                .map((w) => w[0]?.toUpperCase() || "")
                .join("");

              const reportNavBtnClass = (isActive: boolean) =>
                `w-full flex items-center py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
                  isSidebarExpanded ? "gap-2.5 px-3 text-left justify-start" : "justify-center px-0"
                } ${
                  isActive
                    ? "bg-slate-100 text-slate-900 font-extrabold border border-slate-200/70"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                }`;

              const chaptersLabel = hasRecognizedRisks ? "5. Texto Capítulos" : "3. Texto Capítulos";
              const previewLabel = hasRecognizedRisks ? "6. Visualizar Laudo" : "4. Visualizar Laudo";

              return (
                <div className="space-y-4">
                  {/* Cartão de Identificação do Laudo */}
                  {isSidebarExpanded ? (
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
                      <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">
                        Laudo em Elaboração
                      </span>
                      <span
                        className="text-xs font-black text-slate-800 block truncate"
                        title={currentReport.companyName}
                      >
                        {currentReport.companyName}
                      </span>
                    </div>
                  ) : (
                    <div
                      className="w-10 h-10 mx-auto rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-[11px] font-black text-slate-800 tracking-tight"
                      title={`Laudo em Elaboração: ${currentReport.companyName}`}
                    >
                      {initials || "LD"}
                    </div>
                  )}

                  {/* Divisão: Etapas */}
                  <div className="space-y-1">
                    {isSidebarExpanded ? (
                      <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest px-3 block mb-2">
                        Fases do Laudo (NR-01)
                      </span>
                    ) : (
                      <div className="h-px bg-slate-100 mx-1 my-2" />
                    )}

                    <button
                      onClick={() => handleNavClick(() => setActiveTab("cadastro"))}
                      title="1. Cadastro Geral"
                      className={reportNavBtnClass(activeTab === "cadastro")}
                    >
                      <Building className="w-4 h-4 shrink-0" />
                      {isSidebarExpanded && <span className="truncate">1. Cadastro Geral</span>}
                    </button>

                    {/* Metodologia Quantitativa (COPSOQ II) ou Qualitativa (MPE) */}
                    {currentReport.methodology !== "qualitative" ? (
                      <button
                        onClick={() => handleNavClick(() => setActiveTab("copsoq"))}
                        title="2. Pontuação COPSOQ II"
                        className={reportNavBtnClass(activeTab === "copsoq")}
                      >
                        <Sliders className="w-4 h-4 shrink-0" />
                        {isSidebarExpanded && <span className="truncate">2. Pontuação COPSOQ II</span>}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleNavClick(() => setActiveTab("qualitativa"))}
                        title="2. Avaliação Qualitativa"
                        className={reportNavBtnClass(activeTab === "qualitativa")}
                      >
                        <MessageSquare className="w-4 h-4 shrink-0" />
                        {isSidebarExpanded && <span className="truncate">2. Avaliação Qualitativa</span>}
                      </button>
                    )}

                    {/* Se nenhum setor reconhece riscos, ocultamos as abas do Inventário e Plano de Ação */}
                    {hasRecognizedRisks && (
                      <>
                        <button
                          onClick={() => handleNavClick(() => setActiveTab("inventario"))}
                          title="3. Inventário (GRO)"
                          className={reportNavBtnClass(activeTab === "inventario")}
                        >
                          <FileSpreadsheet className="w-4 h-4 shrink-0" />
                          {isSidebarExpanded && <span className="truncate">3. Inventário (GRO)</span>}
                        </button>

                        <button
                          onClick={() => handleNavClick(() => setActiveTab("plano"))}
                          title="4. Plano de Ação"
                          className={reportNavBtnClass(activeTab === "plano")}
                        >
                          <ClipboardList className="w-4 h-4 shrink-0" />
                          {isSidebarExpanded && <span className="truncate">4. Plano de Ação</span>}
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => handleNavClick(() => setActiveTab("capitulos"))}
                      title={chaptersLabel}
                      className={reportNavBtnClass(activeTab === "capitulos")}
                    >
                      <BookOpenCheck className="w-4 h-4 shrink-0" />
                      {isSidebarExpanded && <span className="truncate">{chaptersLabel}</span>}
                    </button>

                    <button
                      onClick={() => handleNavClick(() => setActiveTab("visualizar"))}
                      title={previewLabel}
                      className={reportNavBtnClass(activeTab === "visualizar")}
                    >
                      <FileText className="w-4 h-4 shrink-0" />
                      {isSidebarExpanded && <span className="truncate">{previewLabel}</span>}
                    </button>

                    <div className="pt-2 mt-2 border-t border-slate-100">
                      <button
                        onClick={() => handleNavClick(() => handleSelectReport(null))}
                        title="Fechar Editor / Voltar"
                        className={`w-full flex items-center py-2 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50/70 hover:bg-rose-100/80 rounded-lg transition-colors cursor-pointer border border-rose-200/70 ${
                          isSidebarExpanded ? "gap-2 px-3 justify-start" : "justify-center px-0"
                        }`}
                      >
                        <LogOut className="w-4 h-4 shrink-0" />
                        {isSidebarExpanded && <span className="truncate">Fechar Editor / Voltar</span>}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })() : (
              /* Se não houver laudo selecionado (Menu Início), mostra o menu administrativo */
              <div className="space-y-5">
                {/* Seção 1: Gestão */}
                <div className="space-y-1">
                  {isSidebarExpanded && (
                    <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest px-3 block mb-2">
                      Gestão
                    </span>
                  )}

                  <button
                    onClick={() => handleNavClick(() => setHomeTab("dashboard"))}
                    title="Painel de Gestão (Dash)"
                    className={`w-full flex items-center py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
                      isSidebarExpanded ? "gap-2.5 px-3 text-left justify-start" : "justify-center px-0"
                    } ${
                      homeTab === "dashboard"
                        ? "bg-slate-100 text-slate-900 font-extrabold border border-slate-200/70"
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <LayoutDashboard className="w-4 h-4 shrink-0" />
                    {isSidebarExpanded && <span className="truncate">Painel de Gestão (Dash)</span>}
                  </button>
                </div>

                {/* Seção 2: Documentos e Avaliações */}
                <div className="space-y-1">
                  {isSidebarExpanded ? (
                    <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest px-3 block mb-2">
                      Avaliações & Laudos
                    </span>
                  ) : (
                    <div className="h-px bg-slate-100 mx-1 my-2" />
                  )}

                  <button
                    onClick={() => handleNavClick(() => setHomeTab("reports"))}
                    title="Relatórios / Laudos"
                    className={`w-full flex items-center py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
                      isSidebarExpanded ? "gap-2.5 px-3 text-left justify-start" : "justify-center px-0"
                    } ${
                      homeTab === "reports"
                        ? "bg-slate-100 text-slate-900 font-extrabold border border-slate-200/70"
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <FileText className="w-4 h-4 shrink-0" />
                    {isSidebarExpanded && <span className="truncate">Relatórios / Laudos</span>}
                  </button>
                </div>

                {/* Seção 3: Cadastros */}
                <div className="space-y-1">
                  {isSidebarExpanded ? (
                    <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest px-3 block mb-2">
                      Cadastros Gerais
                    </span>
                  ) : (
                    <div className="h-px bg-slate-100 mx-1 my-2" />
                  )}

                  {[
                    { tab: "companies" as const, icon: Building2, label: "Empresas Clientes" },
                    { tab: "professionals" as const, icon: UserCheck, label: "Profissionais Técnicos" },
                    { tab: "risks" as const, icon: BookOpen, label: "Biblioteca de Riscos (GRO)" },
                    { tab: "evaluators" as const, icon: ShieldCheck, label: "Empresas Avaliadoras" },
                    { tab: "customization" as const, icon: Building, label: "Minha Empresa" },
                    { tab: "ai_agent" as const, icon: Bot, label: "Agente de IA" },
                  ].map(({ tab, icon: Icon, label }) => (
                    <button
                      key={tab}
                      onClick={() => handleNavClick(() => setHomeTab(tab))}
                      title={label}
                      className={`w-full flex items-center py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
                        isSidebarExpanded ? "gap-2.5 px-3 text-left justify-start" : "justify-center px-0"
                      } ${
                        homeTab === tab
                          ? "bg-slate-100 text-slate-900 font-extrabold border border-slate-200/70"
                          : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      {isSidebarExpanded && <span className="truncate">{label}</span>}
                    </button>
                  ))}

                  <div className="h-px bg-slate-100 my-1" />

                  <button
                    onClick={() => signOut(auth)}
                    title="Sair do Sistema"
                    className={`w-full flex items-center py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 hover:text-rose-700 rounded-lg transition cursor-pointer ${
                      isSidebarExpanded ? "gap-2.5 px-3 text-left justify-start" : "justify-center px-0"
                    }`}
                  >
                    <LogOut className="w-4 h-4 shrink-0" />
                    {isSidebarExpanded && <span className="truncate">Sair do Sistema</span>}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Rodapé do Sidebar */}
        <div className="p-3 border-t border-slate-100 text-center text-[10px] text-slate-400 font-bold shrink-0">
          {isSidebarExpanded ? "v1.3 (COPSOQ II · MPE)" : "v1.3"}
        </div>
      </aside>

      {/* Backdrop para mobile */}
      {isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 bg-slate-900/40 z-30 md:hidden"
        />
      )}

      {/* 2. ÁREA DE CONTEÚDO PRINCIPAL (DIREITA) */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen relative">
        {/* Gatilho mobile flutuante */}
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="fixed top-4 left-4 z-30 md:hidden p-2 bg-white/95 backdrop-blur-sm hover:bg-white rounded-xl transition cursor-pointer text-slate-700 border border-slate-200 shadow-sm print:hidden"
          title="Abrir menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Indicador Flutuante Icon-Only de Sincronização em Nuvem */}
        <div className="fixed top-4 right-5 z-30 print:hidden">
          {syncState === "synced" ? (
            <div
              title="Nuvem Ativa — Alterações sincronizadas automaticamente"
              aria-label="Nuvem Ativa"
              className="relative w-9 h-9 rounded-full border border-emerald-200/90 bg-white/95 backdrop-blur-sm text-emerald-600 shadow-sm flex items-center justify-center transition-all hover:shadow-md hover:border-emerald-300"
            >
              <Cloud className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 ring-2 ring-white" />
            </div>
          ) : syncState === "syncing" ? (
            <div
              title="Salvando alterações na nuvem..."
              aria-label="Salvando na nuvem"
              className="relative w-9 h-9 rounded-full border border-blue-200/90 bg-white/95 backdrop-blur-sm text-blue-600 shadow-sm flex items-center justify-center animate-pulse"
            >
              <Cloud className="w-4 h-4 animate-bounce" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 ring-2 ring-white" />
            </div>
          ) : syncState === "offline" ? (
            <button
              type="button"
              onClick={handleRetryCloudSync}
              title={syncErrorDetail || "Sem conexão com a internet. Clique para tentar sincronizar."}
              aria-label="Sem conexão — clicar para tentar sincronizar"
              className="relative w-9 h-9 rounded-full border border-amber-200 bg-white/95 backdrop-blur-sm text-amber-600 hover:bg-amber-50 hover:border-amber-300 shadow-sm flex items-center justify-center transition cursor-pointer"
            >
              <CloudOff className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-amber-500 ring-2 ring-white" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleRetryCloudSync}
              title={syncErrorDetail || "Falha ao sincronizar com a nuvem. Clique para tentar novamente."}
              aria-label="Erro na nuvem — clicar para tentar novamente"
              className="relative w-9 h-9 rounded-full border border-rose-200 bg-white/95 backdrop-blur-sm text-rose-600 hover:bg-rose-50 hover:border-rose-300 shadow-sm flex items-center justify-center transition cursor-pointer"
            >
              <CloudOff className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-rose-500 ring-2 ring-white" />
            </button>
          )}
        </div>

        {/* Banner discreto de diagnóstico apenas quando houver falha ativa na nuvem */}
        {syncState === "error" && (
          <div className="bg-rose-50 border-b border-rose-200 px-6 py-2 pr-16 flex items-center justify-between gap-3 text-xs text-rose-800 print:hidden">
            <div className="flex items-center gap-2 min-w-0">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="font-semibold truncate">
                {syncErrorDetail || "Falha ao sincronizar alterações com o servidor."}
              </span>
            </div>
            <button
              type="button"
              onClick={handleRetryCloudSync}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] transition cursor-pointer whitespace-nowrap shrink-0"
            >
              <RefreshCw className="w-3 h-3" /> Tentar novamente
            </button>
          </div>
        )}

        {/* CONTEÚDO DA PÁGINA */}
        <main
          className={
            currentReport && activeTab === "capitulos"
              ? "flex-1 px-3 pb-4 pt-12 md:pt-4 md:px-5 max-w-none w-full mx-auto print:p-0 print:max-w-none"
              : "flex-1 px-4 pb-6 pt-14 md:pt-8 md:px-8 max-w-7xl w-full mx-auto print:p-0 print:max-w-none"
          }
        >
          {!currentReport ? (
            /* Render active dashboard/home view depending on sidebar select */
            <div className="space-y-6">
              {homeTab === "dashboard" && (
                <ManagementDashboard
                  reports={reports}
                  companiesCount={companies.length}
                  professionalsCount={professionals.length}
                  assessor={assessor}
                  onSelectReport={handleSelectReport}
                />
              )}
              {homeTab === "reports" && (
                <ReportsDashboard
                  reports={reports}
                  companies={companies}
                  onSelectReport={handleSelectReport}
                  onCreateReport={handleCreateReport}
                  onImportReport={handleImportReport}
                  onDeleteReport={handleDeleteReport}
                  onUpdateAllReports={handleUpdateAllReports}
                  defaultCoverImage={assessor.defaultCoverImage}
                  defaultChapters={assessor.defaultChapters}
                  defaultFinalConsiderations={assessor.defaultFinalConsiderations}
                />
              )}
              {homeTab === "companies" && (
                <CompaniesRegistry
                  companies={companies}
                  onUpdateCompanies={handleUpdateCompanies}
                />
              )}
              {homeTab === "professionals" && (
                <ProfessionalsRegistry
                  professionals={professionals}
                  onUpdateProfessionals={handleUpdateProfessionals}
                />
              )}
              {homeTab === "risks" && (
                <RiskCatalogEditor
                  catalog={globalCatalog}
                  onUpdateCatalog={handleUpdateCatalog}
                />
              )}
              {homeTab === "evaluators" && (
                <EvaluatorsRegistry
                  evaluators={evaluators}
                  onUpdateEvaluators={handleUpdateEvaluators}
                />
              )}
              {homeTab === "customization" && (
                <CompanyCustomization
                  assessor={assessor}
                  onUpdateAssessor={handleUpdateAssessor}
                />
              )}
              {homeTab === "ai_agent" && (
                <AiAgentSettings
                  assessor={assessor}
                  onUpdateAssessor={handleUpdateAssessor}
                />
              )}
            </div>
          ) : (
            /* Workspace (Editing chosen Report) */
            <div className="space-y-6">
              
              {/* Workspace Tab Render */}
              {(() => {
                const isQualitative = currentReport.methodology === "qualitative";
                const hasRecognizedRisks =
                  currentReport.sectors.length > 0
                    ? currentReport.sectors.some((s) => s.risksRecognized !== false)
                    : currentReport.risksRecognized !== false;
                const effectiveTab =
                  !hasRecognizedRisks && (activeTab === "inventario" || activeTab === "plano")
                    ? "cadastro"
                    : isQualitative && (activeTab === "copsoq" || activeTab === "devolutivas")
                      ? "qualitativa"
                      : !isQualitative && (activeTab === "qualitativa" || activeTab === "devolutivas")
                        ? "copsoq"
                        : activeTab;

                return (
                  <div className="min-h-[500px]">
                    {effectiveTab === "cadastro" && (
                      <GeneralInfoForm
                        report={currentReport}
                        onChange={handleUpdateCurrentReport}
                        companies={companies}
                        professionals={professionals}
                        evaluators={evaluators}
                        defaultAssessor={assessor}
                      />
                    )}
                    {effectiveTab === "copsoq" && !isQualitative && (
                      <CopsoqEvaluation
                        report={currentReport}
                        onChange={handleUpdateCurrentReport}
                      />
                    )}
                    {effectiveTab === "qualitativa" && isQualitative && (
                      <TechnicalAnalysis
                        report={currentReport}
                        onChange={handleUpdateCurrentReport}
                      />
                    )}
                    {effectiveTab === "inventario" && (
                      <RiskInventoryManager
                        report={currentReport}
                        catalog={globalCatalog}
                        onChange={handleUpdateCurrentReport}
                      />
                    )}
                    {effectiveTab === "plano" && (
                      <ActionPlanManager
                        report={currentReport}
                        onChange={handleUpdateCurrentReport}
                      />
                    )}
                    {effectiveTab === "capitulos" && (
                      <ChaptersEditor
                        key={currentReport.id}
                        report={currentReport}
                        onChange={handleUpdateCurrentReport}
                        assessor={assessor}
                      />
                    )}
                    {effectiveTab === "visualizar" && (
                      <ReportPrintPreview report={currentReport} assessor={assessor} />
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </main>

        {/* Rodapé da Empresa (Oculto na impressão) */}
        <footer className="bg-white border-t border-slate-100 py-4 px-6 text-center text-xs text-slate-400 font-medium shrink-0 print:hidden mt-auto">
          Sistema Desenvolvido em Conformidade Científica com COPSOQ II e Legal com NR-01 GRO/PGR. Todos os direitos reservados.
        </footer>
      </div>
    </div>
  );
}
