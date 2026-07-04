/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { Report, CatalogRisk } from "./types";
import { DEFAULT_RISK_CATALOG } from "./defaultCatalog";
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
  CloudOff
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
  loadAssessorFromFirestore
} from "./firebase";
import { Login } from "./components/Login";

export default function App() {
  // Central State
  const [reports, setReports] = useState<Report[]>([]);
  const [currentReportId, setCurrentReportId] = useState<string | null>(null);
  const [globalCatalog, setGlobalCatalog] = useState<CatalogRisk[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [professionals, setProfessionals] = useState<{ id: string; name: string; role: string; reg: string }[]>([]);
  const [activeTab, setActiveTab] = useState<string>("cadastro");
  const [homeTab, setHomeTab] = useState<"dashboard" | "reports" | "companies" | "professionals" | "risks" | "customization">("dashboard");
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [syncState, setSyncState] = useState<"synced" | "syncing" | "error" | "offline">("synced");
  
  // Assessing Company details
  const [assessor, setAssessor] = useState({
    fantasyName: "Lima engenharia e assessoria em segurança do trabalho",
    socialName: "E. L. de Jesus – Segurança",
    cnpj: "18.195.986/0001-68",
    address: "Av. Mato grosso, 108-W, Centro, Tangará da Serra – MT",
    phone: "65 99998-0418",
    logo: ""
  });

  // Mobile sidebar drawer state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Authentication State
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  // A. Monitor Firebase Authentication State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
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

      const storedAssessor = localStorage.getItem("sst_psicossocial_assessor");
      if (storedAssessor) {
        setAssessor(JSON.parse(storedAssessor));
      }
    } catch (err) {
      console.error("Erro ao ler dados do localStorage:", err);
    }
  }, []);

  // C. Real-Time Synchronization from Firestore - Listeners for instant updates
  useEffect(() => {
    if (!user) return;

    setSyncState("syncing");

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
          const stored = localStorage.getItem("sst_psicossocial_reports");
          if (stored) {
            const parsed = JSON.parse(stored) as Report[];
            uploadLocalIfCollectionIsEmpty(REPORTS_COLLECTION, parsed, saveReportToFirestore);
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
          // Sort alphabetically
          list.sort((a, b) => (a.fantasyName || a.name || "").localeCompare(b.fantasyName || b.name || ""));
          setCompanies(list);
          localStorage.setItem("sst_psicossocial_companies", JSON.stringify(list));
        } else {
          // Firestore is empty - seed from local
          const stored = localStorage.getItem("sst_psicossocial_companies");
          if (stored) {
            const parsed = JSON.parse(stored);
            uploadLocalIfCollectionIsEmpty(COMPANIES_COLLECTION, parsed, saveCompanyToFirestore);
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
          list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
          setProfessionals(list);
          localStorage.setItem("sst_psicossocial_professionals", JSON.stringify(list));
        } else {
          // Firestore is empty - seed from local
          const stored = localStorage.getItem("sst_psicossocial_professionals");
          if (stored) {
            const parsed = JSON.parse(stored);
            uploadLocalIfCollectionIsEmpty(PROFESSIONALS_COLLECTION, parsed, saveProfessionalToFirestore);
          }
        }
        setSyncState("synced");
      },
      (error) => {
        console.error("Erro no onSnapshot de profissionais:", error);
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

  // 1d. Helper to persist assessor company info
  const handleUpdateAssessor = async (newAssessor: typeof assessor) => {
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
  const handleUpdateCurrentReport = async (updatedFields: Partial<Report>) => {
    if (!currentReportId) return;

    const current = reports.find((r) => r.id === currentReportId);
    if (!current) return;

    const updatedReport = {
      ...current,
      ...updatedFields,
      updatedAt: new Date().toISOString(),
    };

    // Immediate optimistic local update
    const updatedReports = reports.map((r) => (r.id === currentReportId ? updatedReport : r));
    setReports(updatedReports);
    try {
      localStorage.setItem("sst_psicossocial_reports", JSON.stringify(updatedReports));
      setLastSaved(new Date().toLocaleTimeString());
    } catch (err) {
      console.error("Erro ao atualizar relatório localmente:", err);
    }

    setSyncState("syncing");
    try {
      await saveReportToFirestore(updatedReport);
      setSyncState("synced");
    } catch (err) {
      console.error("Erro ao atualizar relatório no Firestore:", err);
      setSyncState("error");
    }
  };

  // Get active report
  const currentReport = reports.find((r) => r.id === currentReportId);

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
              {assessor.logo ? (
                <div className="w-10 h-10 border border-slate-200 rounded-xl overflow-hidden bg-white flex items-center justify-center shrink-0">
                  <img src={assessor.logo} alt="Logo" className="max-w-full max-h-full object-contain" />
                </div>
              ) : (
                <div className="w-10 h-10 bg-slate-50 text-slate-700 rounded-xl flex items-center justify-center border border-slate-200 shadow-xs shrink-0">
                  <Shield className="w-5 h-5 text-amber-500" />
                </div>
              )}
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

          {/* Botão de Sair - Posicionado abaixo do Logotipo */}
          <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/40">
            <button
              onClick={() => signOut(auth)}
              className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-[10px] font-bold text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-100 hover:border-rose-600 rounded-lg transition duration-200 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" />
              <span>Sair do Sistema</span>
            </button>
          </div>

          {/* ÁREA DE NAVEGAÇÃO INTERNA DO SIDEBAR */}
          <div className="p-4 space-y-6 overflow-y-auto">
            
            {/* Se houver laudo ativo (Editando Laudo), mostra as etapas integradas no sidebar */}
            {currentReport ? (
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

                  <button
                    onClick={() => handleNavClick(() => setActiveTab("copsoq"))}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-lg transition cursor-pointer text-left ${
                      activeTab === "copsoq" ? "bg-slate-100 text-slate-900 font-extrabold border border-slate-200/50" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <Sliders className="w-4 h-4 shrink-0 text-slate-450" />
                    2. Notas COPSOQ II
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

                  {/* Se a empresa declarar que NÃO reconhece os riscos (risksRecognized === false), ocultamos essas duas abas do editor */}
                  {currentReport.risksRecognized !== false && (
                    <>
                      <button
                        onClick={() => handleNavClick(() => setActiveTab("inventario"))}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-lg transition cursor-pointer text-left ${
                          activeTab === "inventario" ? "bg-slate-100 text-slate-900 font-extrabold border border-slate-200/50" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                        }`}
                      >
                        <FileSpreadsheet className="w-4 h-4 shrink-0 text-slate-450" />
                        4. Inventário (GRO)
                      </button>

                      <button
                        onClick={() => handleNavClick(() => setActiveTab("plano"))}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-lg transition cursor-pointer text-left ${
                          activeTab === "plano" ? "bg-slate-100 text-slate-900 font-extrabold border border-slate-200/50" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                        }`}
                      >
                        <ClipboardList className="w-4 h-4 shrink-0 text-slate-450" />
                        5. Plano de Ação
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
                    {currentReport.risksRecognized !== false ? "6. Texto Capítulos" : "4. Texto Capítulos"}
                  </button>

                  <button
                    onClick={() => handleNavClick(() => setActiveTab("visualizar"))}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-lg transition cursor-pointer text-left ${
                      activeTab === "visualizar" ? "bg-slate-150 text-slate-900 font-black border border-slate-250" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <FileText className="w-4 h-4 shrink-0 text-slate-450" />
                    {currentReport.risksRecognized !== false ? "7. Visualizar Laudo" : "5. Visualizar Laudo"}
                  </button>
                </div>
              </div>
            ) : (
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

                {/* Seção 2: Documentos */}
                <div className="space-y-1">
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest px-3 block mb-2">
                    Relatórios
                  </span>

                  <button
                    onClick={() => handleNavClick(() => setHomeTab("reports"))}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-lg transition cursor-pointer text-left ${
                      homeTab === "reports" ? "bg-slate-100 text-slate-900 font-extrabold border border-slate-200/50" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <FileText className="w-4 h-4 shrink-0 text-slate-450" />
                    Laudos & Relatórios
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
                    onClick={() => handleNavClick(() => setHomeTab("customization"))}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-lg transition cursor-pointer text-left ${
                      homeTab === "customization" ? "bg-slate-100 text-slate-900 font-extrabold border border-slate-200/50" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <Sliders className="w-4 h-4 shrink-0 text-slate-450" />
                    Personalizar Empresa
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
          <div className="flex items-center gap-3">
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
                />
              )}
              {homeTab === "reports" && (
                <ReportsDashboard
                  reports={reports}
                  onSelectReport={setCurrentReportId}
                  onCreateReport={handleCreateReport}
                  onDeleteReport={handleDeleteReport}
                  onUpdateAllReports={handleUpdateAllReports}
                  defaultCoverImage={assessor.defaultCoverImage}
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
              <div className="min-h-[500px]">
                {activeTab === "cadastro" && (
                  <GeneralInfoForm
                    report={currentReport}
                    onChange={handleUpdateCurrentReport}
                    companies={companies}
                    professionals={professionals}
                  />
                )}
                {activeTab === "copsoq" && (
                  <CopsoqEvaluation
                    report={currentReport}
                    onChange={handleUpdateCurrentReport}
                  />
                )}
                {activeTab === "devolutivas" && (
                  <TechnicalAnalysis
                    report={currentReport}
                    onChange={handleUpdateCurrentReport}
                  />
                )}
                {activeTab === "inventario" && (
                  <RiskInventoryManager
                    report={currentReport}
                    catalog={globalCatalog}
                    onChange={handleUpdateCurrentReport}
                  />
                )}
                {activeTab === "plano" && (
                  <ActionPlanManager
                    report={currentReport}
                    onChange={handleUpdateCurrentReport}
                  />
                )}
                {activeTab === "capitulos" && (
                  <ChaptersEditor
                    report={currentReport}
                    onChange={handleUpdateCurrentReport}
                  />
                )}
                {activeTab === "visualizar" && (
                  <ReportPrintPreview report={currentReport} assessor={assessor} />
                )}
              </div>
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
