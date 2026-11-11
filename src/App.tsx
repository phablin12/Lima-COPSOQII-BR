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
import { 
  Shield, 
  ArrowLeft, 
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
  FolderHeart, 
  Cloud, 
  CloudOff, 
  ShieldCheck
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
  loadEvaluatorsFromFirestore
} from "./firebase";
import { Login } from "./components/Login";
import { getImageSync, getImageAsync, saveImageToCache } from "./imageStore";

// Utility to prune large base64 image strings ONLY from bulky report logs in localStorage cache
function pruneLargeStrings(obj: any, keyName?: string): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "string") {
    // Preserve logos, favicons, cover images, signatures, and small images up to 3MB
    const isBrandKey = 
      keyName === "logo" || 
      keyName === "companyLogo" || 
      keyName === "clientLogo" || 
      keyName === "editLogo" || 
      keyName === "evaluatorLogo" || 
      keyName === "favicon" || 
      keyName === "coverImage" ||
      keyName === "defaultCoverImage" || 
      keyName === "signatureUrl";

    if (isBrandKey) {
      if (obj.length < 3000000) {
        return obj;
      }
    }
    // Only prune non-brand data images that are over 600KB
    if (obj.length > 600000 || ((obj.startsWith("data:image/") || obj.includes(";base64,")) && !isBrandKey && obj.length > 80000)) {
      return "[OMITTED_IMAGE_FOR_CACHE]";
    }
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => pruneLargeStrings(item, keyName));
  }
  if (typeof obj === "object") {
    const pruned: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        pruned[key] = pruneLargeStrings(obj[key], key);
      }
    }
    return pruned;
  }
  return obj;
}

// Proactive storage cleanup on startup to shrink ONLY bloated legacy report history without touching company branding
function proactiveStorageCleanup() {
  try {
    const val = localStorage.getItem("sst_psicossocial_reports");
    if (val && (val.startsWith("{") || val.startsWith("["))) {
      try {
        const parsed = JSON.parse(val);
        const pruned = pruneLargeStrings(parsed);
        const prunedStr = JSON.stringify(pruned);
        if (prunedStr.length < val.length) {
          localStorage.setItem("sst_psicossocial_reports", prunedStr);
          console.log(`[Proactive Storage Cleanup] Shrunk sst_psicossocial_reports from ${val.length} to ${prunedStr.length} characters.`);
        }
      } catch (e) {
        // Ignore parse errors
      }
    }
  } catch (e) {
    console.error("Erro durante limpeza proativa do localStorage:", e);
  }
}

// Run the proactive storage cleanup on reports only
try {
  proactiveStorageCleanup();
} catch (e) {
  console.error("Falha ao executar proactiveStorageCleanup:", e);
}

// Safe localStorage wrapper to prevent QuotaExceededError crashes
try {
  const originalSetItem = localStorage.setItem;
  localStorage.setItem = function (key: string, value: string) {
    try {
      let prunedValue = value;
      // Protected keys must never be pruned or stripped
      const isProtected = 
        key === "sst_psicossocial_assessor" || 
        key.startsWith("sst_fast_") || 
        key.startsWith("sst_img_") || 
        key === "sst_cached_user";

      // Prune large images for local storage fallback if the value is JSON
      if (!isProtected && value && (value.startsWith("{") || value.startsWith("["))) {
        try {
          const parsed = JSON.parse(value);
          const pruned = pruneLargeStrings(parsed);
          prunedValue = JSON.stringify(pruned);
        } catch (e) {
          // Fallback to original value if parsing fails
        }
      }
      originalSetItem.call(localStorage, key, prunedValue);
    } catch (error: any) {
      console.warn(`localStorage.setItem falhou para a chave "${key}":`, error);
      if (error.name === "QuotaExceededError" || error.code === 22 || error.code === 1014) {
        try {
          // Remove non-critical items to try to recover
          localStorage.removeItem("sst_psicossocial_catalog");
          originalSetItem.call(localStorage, key, value);
        } catch (retryError) {
          console.warn("Quota do localStorage totalmente excedida. Operação de escrita ignorada para a chave:", key);
        }
      }
    }
  };
} catch (e) {
  console.error("Falha ao aplicar patch no localStorage.setItem:", e);
}

// Helper to read initial navigation state from URL query parameters or localStorage
const getInitialNavState = () => {
  let initialReportId: string | null = null;
  let initialActiveTab: string = "cadastro";
  let initialHomeTab: "dashboard" | "reports" | "companies" | "professionals" | "risks" | "customization" | "evaluators" = "dashboard";

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
  const [homeTab, setHomeTab] = useState<"dashboard" | "reports" | "companies" | "professionals" | "risks" | "customization" | "evaluators">(
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
        localStorage.setItem("sst_nav_currentReportId", currentReportId);
        localStorage.setItem("sst_nav_activeTab", activeTab);
        localStorage.removeItem("sst_nav_homeTab");
      } else {
        params.delete("reportId");
        params.delete("tab");
        params.set("view", homeTab);
        localStorage.removeItem("sst_nav_currentReportId");
        localStorage.removeItem("sst_nav_activeTab");
        localStorage.setItem("sst_nav_homeTab", homeTab);
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

  // Debounce Refs for report saving
  const latestReportToSaveRef = useRef<Report | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Seeding check refs to prevent deleted items from reappearing when database is empty
  const hasCheckedReportsSeedingRef = useRef(false);
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
  const [syncState, setSyncState] = useState<"synced" | "syncing" | "error" | "offline">("synced");
  
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
      const fastLogo = getImageSync("assessor_logo") || localStorage.getItem("sst_fast_assessor_logo");
      const fastCover = getImageSync("cover_image") || localStorage.getItem("sst_fast_cover_image");
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

  // Mobile sidebar drawer state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  // A. Monitor Firebase Authentication State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      try {
        if (currentUser) {
          localStorage.setItem("sst_cached_user", JSON.stringify({
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: currentUser.displayName
          }));
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

      // Restore full-fidelity logo and cover from IndexedDB if needed
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
    } catch (err) {
      console.error("Erro ao ler dados do localStorage:", err);
    }
  }, []);

  // C. Real-Time Synchronization from Firestore - Listeners for instant updates
  useEffect(() => {
    if (!user) return;

    setSyncState("syncing");

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
          // Sort reports Consistently across all PCs by updatedAt / createdAt descending
          list.sort((a, b) => {
            const dateA = a.updatedAt || a.createdAt || "";
            const dateB = b.updatedAt || b.createdAt || "";
            return dateB.localeCompare(dateA);
          });
          setReports(list);
          localStorage.setItem("sst_psicossocial_reports", JSON.stringify(list));
        } else {
          // Firestore is empty - try to seed from local storage if available, but keep local state
          if (!hasCheckedReportsSeedingRef.current) {
            hasCheckedReportsSeedingRef.current = true;
            const stored = localStorage.getItem("sst_psicossocial_reports");
            if (stored) {
              const parsed = JSON.parse(stored) as Report[];
              if (parsed && parsed.length > 0) {
                setReports(parsed);
                uploadLocalIfCollectionIsEmpty(REPORTS_COLLECTION, parsed, saveReportToFirestore);
              } else {
                setReports([]);
              }
            } else {
              setReports([]);
            }
          } else {
            // Only clear state if there are indeed no reports in active memory
            setReports((prev) => {
              if (prev && prev.length > 0) {
                return prev;
              }
              localStorage.setItem("sst_psicossocial_reports", JSON.stringify([]));
              return [];
            });
          }
        }
        setSyncState("synced");
      },
      (error) => {
        console.error("Erro no onSnapshot de relatórios:", error);
        setSyncState("error");
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
          // Sort alphabetically
          list.sort((a, b) => (a.fantasyName || a.name || "").localeCompare(b.fantasyName || b.name || ""));
          setCompanies(list);
          localStorage.setItem("sst_psicossocial_companies", JSON.stringify(list));
        } else {
          // Firestore is empty - seed from local
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
            // Only clear state if there are indeed no companies in active memory
            setCompanies((prev) => {
              if (prev && prev.length > 0) {
                return prev;
              }
              localStorage.setItem("sst_psicossocial_companies", JSON.stringify([]));
              return [];
            });
          }
        }
        setSyncState("synced");
      },
      (error) => {
        console.error("Erro no onSnapshot de empresas:", error);
        setSyncState("error");
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
          localStorage.setItem("sst_psicossocial_professionals", JSON.stringify(list));
        } else {
          // Firestore is empty - seed from local
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
            // Only clear state if there are indeed no professionals in active memory
            setProfessionals((prev) => {
              if (prev && prev.length > 0) {
                return prev;
              }
              localStorage.setItem("sst_psicossocial_professionals", JSON.stringify([]));
              return [];
            });
          }
        }
        setSyncState("synced");
      },
      (error) => {
        console.error("Erro no onSnapshot de profissionais:", error);
        setSyncState("error");
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
          localStorage.setItem("sst_psicossocial_evaluators", JSON.stringify(list));
        } else {
          // Firestore is empty - seed from local
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
            // Only clear state if there are indeed no evaluators in active memory
            setEvaluators((prev) => {
              if (prev && prev.length > 0) {
                return prev;
              }
              localStorage.setItem("sst_psicossocial_evaluators", JSON.stringify([]));
              return [];
            });
          }
        }
        setSyncState("synced");
      },
      (error) => {
        console.error("Erro no onSnapshot de avaliadores:", error);
        setSyncState("error");
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
          localStorage.setItem("sst_psicossocial_catalog", JSON.stringify(list));
        } else {
          // Seed Firestore with default catalog if database is empty
          const storedCatalog = localStorage.getItem("sst_psicossocial_catalog");
          const catalogToSave = storedCatalog ? JSON.parse(storedCatalog) : DEFAULT_RISK_CATALOG;
          await saveCatalogToFirestore(catalogToSave);
        }
        setSyncState("synced");
      },
      (error) => {
        console.error("Erro no onSnapshot de catálogo:", error);
        setSyncState("error");
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
          setAssessor(data);
          localStorage.setItem("sst_psicossocial_assessor", JSON.stringify(data));
        } else {
          const storedAssessor = localStorage.getItem("sst_psicossocial_assessor");
          const assessorToSave = storedAssessor ? JSON.parse(storedAssessor) : assessor;
          await saveAssessorToFirestore(assessorToSave);
        }
        setSyncState("synced");
      },
      (error) => {
        console.error("Erro no onSnapshot do assessor:", error);
        setSyncState("error");
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
  }, [user]);

  // 1b. Helper to persist companies
  const handleUpdateCompanies = async (newCompanies: typeof companies) => {
    setCompanies(newCompanies);
    try {
      localStorage.setItem("sst_psicossocial_companies", JSON.stringify(newCompanies));
    } catch (err) {
      console.error("Erro ao salvar empresas no localStorage:", err);
    }

    setSyncState("syncing");
    try {
      const deleted = companies.filter((oc) => !newCompanies.some((nc) => nc.id === oc.id));
      for (const dc of deleted) {
        await deleteCompanyFromFirestore(dc.id);
      }
      for (const nc of newCompanies) {
        await saveCompanyToFirestore(nc);
      }
      setSyncState("synced");
    } catch (err) {
      console.error("Erro ao sincronizar empresas no Firestore:", err);
      setSyncState("error");
    }
  };

  // 1c. Helper to persist professionals
  const handleUpdateProfessionals = async (newProfs: typeof professionals) => {
    setProfessionals(newProfs);
    try {
      localStorage.setItem("sst_psicossocial_professionals", JSON.stringify(newProfs));
    } catch (err) {
      console.error("Erro ao salvar profissionais no localStorage:", err);
    }

    setSyncState("syncing");
    try {
      const deleted = professionals.filter((op) => !newProfs.some((np) => np.id === op.id));
      for (const dp of deleted) {
        await deleteProfessionalFromFirestore(dp.id);
      }
      for (const np of newProfs) {
        await saveProfessionalToFirestore(np);
      }
      setSyncState("synced");
    } catch (err) {
      console.error("Erro ao sincronizar profissionais no Firestore:", err);
      setSyncState("error");
    }
  };

  // 1c-2. Helper to persist evaluators
  const handleUpdateEvaluators = async (newEvaluators: Assessor[]) => {
    setEvaluators(newEvaluators);
    try {
      localStorage.setItem("sst_psicossocial_evaluators", JSON.stringify(newEvaluators));
    } catch (err) {
      console.error("Erro ao salvar avaliadores no localStorage:", err);
    }

    setSyncState("syncing");
    try {
      const deleted = evaluators.filter((ev) => !newEvaluators.some((nv) => nv.id === ev.id));
      for (const dev of deleted) {
        await deleteEvaluatorFromFirestore(dev.id);
      }
      for (const nev of newEvaluators) {
        await saveEvaluatorToFirestore(nev);
      }
      setSyncState("synced");
    } catch (err) {
      console.error("Erro ao sincronizar avaliadores no Firestore:", err);
      setSyncState("error");
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
    try {
      localStorage.setItem("sst_psicossocial_assessor", JSON.stringify(newAssessor));
    } catch (err) {
      console.error("Erro ao salvar dados da assessora no localStorage:", err);
    }

    setSyncState("syncing");
    try {
      await saveAssessorToFirestore(newAssessor);
      setSyncState("synced");
    } catch (err) {
      console.error("Erro ao sincronizar assessora no Firestore:", err);
      setSyncState("error");
    }
  };

  // 2. Import / save multiple reports to Firestore
  const handleUpdateAllReports = async (updatedReports: Report[]) => {
    setSyncState("syncing");
    try {
      for (const r of updatedReports) {
        await saveReportToFirestore(r);
      }
      setSyncState("synced");
    } catch (err) {
      console.error("Erro ao salvar relatórios:", err);
      setSyncState("error");
    }
  };

  // 3. Persist catalog to localStorage and Firestore
  const handleUpdateCatalog = async (newCatalog: CatalogRisk[]) => {
    setGlobalCatalog(newCatalog);
    try {
      localStorage.setItem("sst_psicossocial_catalog", JSON.stringify(newCatalog));
    } catch (err) {
      console.error("Erro ao persistir catálogo no localStorage:", err);
    }

    setSyncState("syncing");
    try {
      await saveCatalogToFirestore(newCatalog);
      setSyncState("synced");
    } catch (err) {
      console.error("Erro ao sincronizar catálogo no Firestore:", err);
      setSyncState("error");
    }
  };

  // 4. Create new report
  const handleCreateReport = async (newReport: Report) => {
    // Immediate optimistic local update
    const updated = [newReport, ...reports];
    setReports(updated);
    try {
      localStorage.setItem("sst_psicossocial_reports", JSON.stringify(updated));
      setLastSaved(new Date().toLocaleTimeString());
    } catch (err) {
      console.error("Erro ao salvar relatório localmente:", err);
    }

    setSyncState("syncing");
    try {
      await saveReportToFirestore(newReport);
      setSyncState("synced");
    } catch (err) {
      console.error("Erro ao criar relatório no Firestore:", err);
      setSyncState("error");
    }
    setCurrentReportId(newReport.id);
    setActiveTab("cadastro"); // Reset to first step on new report
  };

  // 5. Delete report
  const handleDeleteReport = async (id: string) => {
    // Immediate optimistic local update
    const updated = reports.filter((r) => r.id !== id);
    setReports(updated);
    try {
      localStorage.setItem("sst_psicossocial_reports", JSON.stringify(updated));
      setLastSaved(new Date().toLocaleTimeString());
    } catch (err) {
      console.error("Erro ao remover relatório localmente:", err);
    }

    setSyncState("syncing");
    try {
      await deleteReportFromFirestore(id);
      setSyncState("synced");
    } catch (err) {
      console.error("Erro ao deletar relatório no Firestore:", err);
      setSyncState("error");
    }
    if (currentReportId === id) {
      setCurrentReportId(null);
    }
  };

  // 6. Update current report attributes
  const handleUpdateCurrentReport = (updatedFields: Partial<Report>) => {
    if (!currentReportId) return;

    const current = reports.find((r) => r.id === currentReportId);
    if (!current) return;

    const updatedReport = {
      ...current,
      ...updatedFields,
      updatedAt: new Date().toISOString(),
    };

    // Immediate optimistic local update for fluid UI experience
    const updatedReports = reports.map((r) => (r.id === currentReportId ? updatedReport : r));
    setReports(updatedReports);
    try {
      localStorage.setItem("sst_psicossocial_reports", JSON.stringify(updatedReports));
      setLastSaved(new Date().toLocaleTimeString());
    } catch (err) {
      console.error("Erro ao atualizar relatório localmente:", err);
    }

    // Schedule debounced Firestore save
    latestReportToSaveRef.current = updatedReport;
    setSyncState("syncing");

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      const reportToSave = latestReportToSaveRef.current;
      if (!reportToSave) return;

      try {
        await saveReportToFirestore(reportToSave);
        setSyncState("synced");
      } catch (err) {
        console.error("Erro ao atualizar relatório no Firestore:", err);
        setSyncState("error");
      }
    }, 1000); // 1-second debounce
  };

  // Get active report
  const currentReport = reports.find((r) => r.id === currentReportId);

  const handleSelectReport = (id: string | null) => {
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
      
      {/* 1. SIDEBAR ESQUERDA - Inteligente & Empresarial (Oculto na impressão) */}
      <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-white text-slate-700 border-r border-slate-200 flex flex-col justify-between transition-transform duration-300 md:relative md:translate-x-0 ${
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      } print:hidden`}>
        
        {/* Topo / Logotipo */}
        <div className="flex flex-col">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {(() => {
                const effectiveLogo = (assessor.logo && assessor.logo !== "[OMITTED_IMAGE_FOR_CACHE]")
                  ? assessor.logo
                  : getImageSync("assessor_logo");

                return effectiveLogo ? (
                  <div className="w-10 h-10 border border-slate-200 rounded-xl overflow-hidden bg-white flex items-center justify-center shrink-0">
                    <img 
                      src={effectiveLogo} 
                      alt="Logo" 
                      className="max-w-full max-h-full object-contain" 
                      loading="eager"
                      decoding="sync"
                    />
                  </div>
                ) : (
                  <div className="w-10 h-10 bg-slate-50 text-slate-700 rounded-xl flex items-center justify-center border border-slate-200 shadow-xs shrink-0">
                    <Shield className="w-5 h-5 text-amber-500" />
                  </div>
                );
              })()}
              <div className="min-w-0">
                <h1 className="text-xs font-black tracking-tight leading-none text-slate-800 uppercase truncate" title={assessor.fantasyName}>
                  {assessor.fantasyName.toLowerCase().includes("lima") ? "Lima Engenharia" : assessor.fantasyName.split(" ")[0]}
                </h1>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1">Workspace</p>
              </div>
            </div>
            
            {/* Fechar no mobile */}
            <button 
              onClick={() => setIsMobileMenuOpen(false)}
              className="md:hidden p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* ÁREA DE NAVEGAÇÃO INTERNA DO SIDEBAR */}
          <div className="p-4 space-y-6 overflow-y-auto">
            
            {/* Se houver laudo ativo (Editando Laudo), mostra as etapas integradas no sidebar */}
            {currentReport ? (() => {
              const hasRecognizedRisks = currentReport.sectors.length > 0
                ? currentReport.sectors.some((s) => s.risksRecognized !== false)
                : (currentReport.risksRecognized !== false);

              return (
              <div className="space-y-4">
                {/* Cartão de Identificação do Laudo */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                  <span className="text-[9px] font-extrabold text-slate-450 uppercase tracking-widest block">Laudo em Elaboração:</span>
                  <span className="text-xs font-black text-slate-800 block truncate" title={currentReport.companyName}>
                    {currentReport.companyName}
                  </span>
                  
                  <button
                    onClick={() => handleNavClick(() => setCurrentReportId(null))}
                    className="w-full mt-1.5 flex items-center justify-center gap-1.5 text-[10px] font-bold text-rose-650 hover:text-rose-750 bg-rose-50 hover:bg-rose-100 py-1.5 px-3 rounded-lg transition-colors cursor-pointer border border-rose-100"
                  >
                    <LogOut className="w-3 h-3" /> Fechar Editor / Voltar
                  </button>
                </div>

                {/* Divisão: Etapas */}
                <div className="space-y-1">
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest px-3 block mb-2">
                    Fases do Laudo (NR-01)
                  </span>

                  <button
                    onClick={() => handleNavClick(() => setActiveTab("cadastro"))}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-lg transition cursor-pointer text-left ${
                      activeTab === "cadastro" ? "bg-slate-100 text-slate-900 font-extrabold border border-slate-200/50" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <Building className="w-4 h-4 shrink-0 text-slate-450" />
                    1. Cadastro Geral
                  </button>

                  {/* Metodologia Quantitativa (COPSOQ II) */}
                  {currentReport.methodology !== "qualitative" && (
                    <>
                      <button
                        onClick={() => handleNavClick(() => setActiveTab("copsoq"))}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-lg transition cursor-pointer text-left ${
                          activeTab === "copsoq" ? "bg-slate-100 text-slate-900 font-extrabold border border-slate-200/50" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                        }`}
                      >
                        <Sliders className="w-4 h-4 shrink-0 text-slate-450" />
                        2. Pontuação COPSOQ II
                      </button>

                      <button
                        onClick={() => handleNavClick(() => setActiveTab("devolutivas"))}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-lg transition cursor-pointer text-left ${
                          activeTab === "devolutivas" ? "bg-slate-100 text-slate-900 font-extrabold border border-slate-200/50" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                        }`}
                      >
                        <MessageSquare className="w-4 h-4 shrink-0 text-slate-450" />
                        3. Devolutivas
                      </button>
                    </>
                  )}

                  {/* Se nenhum setor reconhece riscos, ocultamos as abas do Inventário e Plano de Ação */}
                  {hasRecognizedRisks && (
                    <>
                      <button
                        onClick={() => handleNavClick(() => setActiveTab("inventario"))}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-lg transition cursor-pointer text-left ${
                          activeTab === "inventario" ? "bg-slate-100 text-slate-900 font-extrabold border border-slate-200/50" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                        }`}
                      >
                        <FileSpreadsheet className="w-4 h-4 shrink-0 text-slate-450" />
                        {currentReport.methodology === "qualitative" ? "2. Inventário (GRO)" : "4. Inventário (GRO)"}
                      </button>

                      <button
                        onClick={() => handleNavClick(() => setActiveTab("plano"))}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-lg transition cursor-pointer text-left ${
                          activeTab === "plano" ? "bg-slate-100 text-slate-900 font-extrabold border border-slate-200/50" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                        }`}
                      >
                        <ClipboardList className="w-4 h-4 shrink-0 text-slate-450" />
                        {currentReport.methodology === "qualitative" ? "3. Plano de Ação" : "5. Plano de Ação"}
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => handleNavClick(() => setActiveTab("capitulos"))}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-lg transition cursor-pointer text-left ${
                      activeTab === "capitulos" ? "bg-slate-100 text-slate-900 font-extrabold border border-slate-200/50" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <BookOpenCheck className="w-4 h-4 shrink-0 text-slate-450" />
                    {currentReport.methodology === "qualitative"
                      ? (hasRecognizedRisks ? "4. Texto Capítulos" : "2. Texto Capítulos")
                      : (hasRecognizedRisks ? "6. Texto Capítulos" : "4. Texto Capítulos")
                    }
                  </button>

                  <button
                    onClick={() => handleNavClick(() => setActiveTab("visualizar"))}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-lg transition cursor-pointer text-left ${
                      activeTab === "visualizar" ? "bg-slate-150 text-slate-900 font-black border border-slate-250" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <FileText className="w-4 h-4 shrink-0 text-slate-450" />
                    {currentReport.methodology === "qualitative"
                      ? (hasRecognizedRisks ? "5. Visualizar Laudo" : "3. Visualizar Laudo")
                      : (hasRecognizedRisks ? "7. Visualizar Laudo" : "5. Visualizar Laudo")
                    }
                  </button>
                </div>
              </div>
              );
            })() : (
              /* Se não houver laudo selecionado (Menu Início), mostra o menu administrativo */
              <div className="space-y-6">
                
                {/* Seção 1: Gestão */}
                <div className="space-y-1">
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest px-3 block mb-2">
                    Gestão
                  </span>
                  
                  <button
                    onClick={() => handleNavClick(() => setHomeTab("dashboard"))}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-lg transition cursor-pointer text-left ${
                      homeTab === "dashboard" ? "bg-slate-100 text-slate-900 font-extrabold border border-slate-200/50" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <LayoutDashboard className="w-4 h-4 shrink-0 text-slate-450" />
                    Painel de Gestão (Dash)
                  </button>
                </div>

                {/* Seção 2: Documentos e Avaliações */}
                <div className="space-y-1">
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest px-3 block mb-2">
                    Avaliações & Laudos
                  </span>

                  <button
                    onClick={() => handleNavClick(() => setHomeTab("reports"))}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-lg transition cursor-pointer text-left ${
                      homeTab === "reports" ? "bg-slate-100 text-slate-900 font-extrabold border border-slate-200/50" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <FileText className="w-4 h-4 shrink-0 text-slate-450" />
                    Relatórios / Laudos
                  </button>
                </div>

                {/* Seção 3: Cadastros */}
                <div className="space-y-1">
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest px-3 block mb-2">
                    Cadastros Gerais
                  </span>

                  <button
                    onClick={() => handleNavClick(() => setHomeTab("companies"))}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-lg transition cursor-pointer text-left ${
                      homeTab === "companies" ? "bg-slate-100 text-slate-900 font-extrabold border border-slate-200/50" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <Building2 className="w-4 h-4 shrink-0 text-slate-450" />
                    Empresas Clientes
                  </button>

                  <button
                    onClick={() => handleNavClick(() => setHomeTab("professionals"))}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-lg transition cursor-pointer text-left ${
                      homeTab === "professionals" ? "bg-slate-100 text-slate-900 font-extrabold border border-slate-200/50" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <UserCheck className="w-4 h-4 shrink-0 text-slate-450" />
                    Profissionais Técnicos
                  </button>

                  <button
                    onClick={() => handleNavClick(() => setHomeTab("risks"))}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-lg transition cursor-pointer text-left ${
                      homeTab === "risks" ? "bg-slate-100 text-slate-900 font-extrabold border border-slate-200/50" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <BookOpen className="w-4 h-4 shrink-0" />
                    Biblioteca de Riscos (GRO)
                  </button>

                  <button
                    onClick={() => handleNavClick(() => setHomeTab("evaluators"))}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-lg transition cursor-pointer text-left ${
                      homeTab === "evaluators" ? "bg-slate-100 text-slate-900 font-extrabold border border-slate-200/50" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4 shrink-0 text-slate-450" />
                    Empresas Avaliadoras
                  </button>

                  <button
                    onClick={() => handleNavClick(() => setHomeTab("customization"))}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-lg transition cursor-pointer text-left ${
                      homeTab === "customization" ? "bg-slate-100 text-slate-900 font-extrabold border border-slate-200/50" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <Building className="w-4 h-4 shrink-0 text-slate-450" />
                    Minha Empresa
                  </button>

                  <div className="h-px bg-slate-100 my-1" />

                  <button
                    onClick={() => signOut(auth)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 hover:text-rose-700 rounded-lg transition cursor-pointer text-left"
                  >
                    <LogOut className="w-4 h-4 shrink-0" />
                    Sair do Sistema
                  </button>
                </div>

              </div>
            )}
          </div>
        </div>

        {/* Rodapé do Sidebar */}
        <div className="p-4 border-t border-slate-100 text-center text-[10px] text-slate-450 font-bold">
          v1.2 (COPSOQ II)
        </div>
      </aside>

      {/* Backdrop para mobile */}
      {isMobileMenuOpen && (
        <div 
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 bg-slate-900/40 z-20 md:hidden"
        />
      )}

      {/* 2. ÁREA DE CONTEÚDO PRINCIPAL (DIREITA) */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        
        {/* Top Header Barra (Oculto na impressão) */}
        <header className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between shrink-0 print:hidden shadow-2xs">
          
          {/* Hambúrguer no mobile */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 hover:bg-slate-50 rounded-xl transition cursor-pointer text-slate-600 border border-slate-200"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Breadcrumb / Title */}
          <div className="hidden sm:block">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
              {currentReport ? "Ambiente do Elaborador" : "Portal Corporativo"}
            </span>
            <h2 className="text-sm font-extrabold text-slate-800 leading-none mt-0.5">
              {currentReport 
                ? `Editando Laudo: ${currentReport.companyName}` 
                : "Sistema Integrado de Gestão Psicossocial"
              }
            </h2>
          </div>

          {/* Saved Status Indicators */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Firebase Sync Indicator */}
            <div className={`flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border shadow-2xs ${
              syncState === "synced" 
                ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                : syncState === "syncing"
                ? "bg-blue-50 text-blue-700 border-blue-100 animate-pulse"
                : "bg-rose-50 text-rose-700 border-rose-150"
            }`}>
              {syncState === "synced" ? (
                <>
                  <Cloud className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span className="hidden xs:inline">Nuvem Ativa</span>
                </>
              ) : syncState === "syncing" ? (
                <>
                  <Cloud className="w-3.5 h-3.5 text-blue-500 animate-bounce shrink-0" />
                  <span className="hidden xs:inline">Salvando na Nuvem...</span>
                </>
              ) : (
                <>
                  <CloudOff className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  <span className="hidden xs:inline">Erro na Nuvem</span>
                </>
              )}
            </div>

            {currentReport && lastSaved && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-full">
                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span className="hidden md:inline">Salvo localmente às</span> {lastSaved}
              </div>
            )}
          </div>
        </header>

        {/* CONTEÚDO DA PÁGINA */}
        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto print:p-0 print:max-w-none">
          {!currentReport ? (
            /* Render active dashboard/home view depending on sidebar select */
            <div className="space-y-6">
              {homeTab === "dashboard" && (
                <ManagementDashboard
                  reports={reports}
                  companiesCount={companies.length}
                  professionalsCount={professionals.length}
                  assessor={assessor}
                  onUpdateAssessor={handleUpdateAssessor}
                  onUpdateAllReports={handleUpdateAllReports}
                />
              )}
              {homeTab === "reports" && (
                <ReportsDashboard
                  reports={reports}
                  companies={companies}
                  onUpdateCompanies={handleUpdateCompanies}
                  onSelectReport={handleSelectReport}
                  onCreateReport={handleCreateReport}
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
            </div>
          ) : (
            /* Workspace (Editing chosen Report) */
            <div className="space-y-6">
              
              {/* Workspace Tab Render */}
              {(() => {
                const isQualitative = currentReport.methodology === "qualitative";
                const hasRecognizedRisks = currentReport.sectors.length > 0
                  ? currentReport.sectors.some((s) => s.risksRecognized !== false)
                  : (currentReport.risksRecognized !== false);
                const effectiveTab = isQualitative && (activeTab === "copsoq" || activeTab === "devolutivas")
                  ? (hasRecognizedRisks ? "inventario" : "cadastro")
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
                    {effectiveTab === "devolutivas" && !isQualitative && (
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
