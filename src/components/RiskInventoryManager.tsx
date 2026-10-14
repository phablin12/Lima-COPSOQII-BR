/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Report, Sector, CatalogRisk, RiskInventoryItem } from "../types";
import { getMatrixCell, getColorClass, PROBABILITY_LEVELS, SEVERITY_LEVELS } from "../matrixUtils";
import { AlertCircle, Plus, Trash2, Edit2, ShieldAlert, FileSpreadsheet, Eye, HelpCircle, Sparkles, Loader2, Wand2, X, Check, CheckSquare } from "lucide-react";
import { SearchableSelect } from "./SearchableSelect";
import { generateSectorRisks, enrichRiskItem, GeneratedRiskItem } from "../aiService";

interface RiskInventoryManagerProps {
  report: Report;
  catalog: CatalogRisk[];
  onChange: (updatedReport: Partial<Report>) => void;
}

export const RiskInventoryManager: React.FC<RiskInventoryManagerProps> = ({ report, catalog, onChange }) => {
  const [selectedSectorId, setSelectedSectorId] = useState<string>(
    report.sectors.length > 0 ? report.sectors[0].id : ""
  );

  const [selectedCatalogRiskId, setSelectedCatalogRiskId] = useState<string>(
    catalog.length > 0 ? catalog[0].id : "custom"
  );

  // AI Modal and Generation States
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiTargetSectorId, setAiTargetSectorId] = useState<string>(
    report.sectors.length > 0 ? report.sectors[0].id : ""
  );
  const [aiRiskCount, setAiRiskCount] = useState<number>(3);
  const [isGeneratingBatchAI, setIsGeneratingBatchAI] = useState(false);
  const [batchAiResults, setBatchAiResults] = useState<GeneratedRiskItem[]>([]);
  const [selectedAiIndices, setSelectedAiIndices] = useState<number[]>([]);
  const [aiBatchError, setAiBatchError] = useState<string | null>(null);

  // AI Single Risk Enrichment State
  const [isEnrichingAI, setIsEnrichingAI] = useState(false);
  const [enrichError, setEnrichError] = useState<string | null>(null);
  const [enrichSuccess, setEnrichSuccess] = useState(false);

  // Form Fields State
  const [customRiskName, setCustomRiskName] = useState("");
  const [exposedCount, setExposedCount] = useState<number>(() => {
    return report.sectors.length > 0 ? (report.sectors[0].employeeCount || 1) : 1;
  });
  const [sourcesField, setSourcesField] = useState("");
  const [possibleInjuries, setPossibleInjuries] = useState("");
  const [diseaseHistory, setDiseaseHistory] = useState("");
  const [existingControls, setExistingControls] = useState("");
  const [probability, setProbability] = useState<number>(3);
  const [severity, setSeverity] = useState<number>(3);
  const [uncertainty, setUncertainty] = useState<RiskInventoryItem["uncertainty"]>("Certa");

  // Recommendations and action plan integration
  const [recommendation, setRecommendation] = useState("");
  const [priority, setPriority] = useState<RiskInventoryItem["priority"]>("Média");
  const [responsible, setResponsible] = useState("");
  const [status, setStatus] = useState<RiskInventoryItem["status"]>("Pendente");
  const [deadline, setDeadline] = useState("");
  const [monitoring, setMonitoring] = useState("");
  const [measureResults, setMeasureResults] = useState("");

  // Action plan specific fields
  const [actionObjective, setActionObjective] = useState("");
  const [actionProposed, setActionProposed] = useState("");
  const [periodicity, setPeriodicity] = useState("Mensal");
  const [efficacyIndicator, setEfficacyIndicator] = useState("");

  const [isAdding, setIsAdding] = useState(false);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);

  const handleStartEdit = (item: RiskInventoryItem) => {
    setEditingItemId(item.id);
    setSelectedSectorId(item.sectorId);
    setSelectedCatalogRiskId("custom");
    setCustomRiskName(item.riskName);
    const itemSec = report.sectors.find((s) => s.id === item.sectorId);
    setExposedCount(itemSec?.employeeCount || item.exposedCount || 1);
    setSourcesField(item.sourcesField);
    setPossibleInjuries(item.possibleInjuries);
    setDiseaseHistory(item.diseaseHistory || "");
    setExistingControls(item.existingControls || "");
    setProbability(item.probability);
    setSeverity(item.severity);
    setUncertainty(item.uncertainty);
    setRecommendation(item.recommendation || "");
    setPriority(item.priority || "Média");
    setResponsible(item.responsible || "");
    setStatus(item.status || "Pendente");
    setDeadline(item.deadline || "");
    setMonitoring(item.monitoring || "");
    setMeasureResults(item.measureResults || "");
    setActionObjective(item.actionObjective || "");
    setActionProposed(item.actionProposed || "");
    setPeriodicity(item.periodicity || "Mensal");
    setEfficacyIndicator(item.efficacyIndicator || "");
    setIsAdding(true);
    
    // Smooth scroll to the form container
    setTimeout(() => {
      document.getElementById("risk-form-container")?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleCancelEdit = () => {
    setEditingItemId(null);
    setIsAdding(false);
    // Reset Form fields
    setCustomRiskName("");
    setSourcesField("");
    setPossibleInjuries("");
    setDiseaseHistory("");
    setExistingControls("");
    setProbability(3);
    setSeverity(3);
    setUncertainty("Certa");
    setRecommendation("");
    setPriority("Média");
    setResponsible("");
    setStatus("Pendente");
    setDeadline("");
    setMonitoring("");
    setMeasureResults("");
    setActionObjective("");
    setActionProposed("");
    setPeriodicity("Mensal");
    setEfficacyIndicator("");
    const sect = report.sectors.find((s) => s.id === selectedSectorId) || report.sectors[0];
    setExposedCount(sect ? (sect.employeeCount || 1) : 1);
  };

  // Sync inputs when selected risk from catalog changes
  useEffect(() => {
    if (selectedCatalogRiskId === "custom") {
      setCustomRiskName("");
      setSourcesField("");
      setPossibleInjuries("");
    } else {
      const risk = catalog.find((r) => r.id === selectedCatalogRiskId);
      if (risk) {
        setCustomRiskName(risk.name);
        setSourcesField(risk.source);
        setPossibleInjuries(risk.possibleInjuries);
      }
    }
  }, [selectedCatalogRiskId, catalog]);

  // Sync exposed employees when sector changes or sectors load
  useEffect(() => {
    if (report.sectors.length > 0) {
      const sect = report.sectors.find((s) => s.id === selectedSectorId);
      if (sect) {
        setExposedCount(sect.employeeCount || 1);
      } else {
        const first = report.sectors[0];
        setSelectedSectorId(first.id);
        setExposedCount(first.employeeCount || 1);
      }
    }
  }, [selectedSectorId, report.sectors]);

  if (report.sectors.length === 0) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-100 text-center space-y-4">
        <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8 text-amber-500" />
        </div>
        <div className="max-w-md mx-auto space-y-2">
          <h3 className="text-lg font-semibold text-slate-800">Crie Setores Primeiro</h3>
          <p className="text-sm text-slate-500">
            É necessário cadastrar ao menos um setor na aba <strong>Informações Gerais</strong> antes de poder criar o inventário de riscos.
          </p>
        </div>
      </div>
    );
  }

  const handleCreateInventoryItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSectorId || !customRiskName.trim()) return;

    // Calculate matrix details
    const matrixResult = getMatrixCell(probability, severity);

    const targetSector = report.sectors.find((s) => s.id === selectedSectorId);
    const finalExposedCount = targetSector ? (targetSector.employeeCount || 1) : Math.max(1, exposedCount);

    const updatedItemData = {
      sectorId: selectedSectorId,
      riskName: customRiskName.trim(),
      exposedCount: finalExposedCount,
      type: "Psicossocial" as const,
      sourcesField: sourcesField.trim(),
      possibleInjuries: possibleInjuries.trim(),
      diseaseHistory: diseaseHistory.trim() || "Nenhum registro oficial de adoecimento até o momento.",
      existingControls: existingControls.trim() || "Inexistente.",
      probability,
      severity,
      riskScore: probability * severity,
      riskLevel: matrixResult.level,
      color: matrixResult.color,
      uncertainty,
      recommendation: recommendation.trim() || `Implementar acompanhamento técnico e capacitação para mitigar ${customRiskName}.`,
      priority,
      responsible: responsible.trim() || "Liderança e Gestores",
      status,
      deadline: deadline.trim() || "Mês Corrente + 3",
      monitoring: monitoring.trim() || "Checklists de monitoramento periódico com os supervisores.",
      measureResults: measureResults.trim() || "Redução de queixas na ouvidoria e manutenção ou aumento das notas nas próximas avaliações.",
      
      // Action Plan synchronized fields
      actionObjective: actionObjective.trim() || `Mitigar os impactos decorrentes de ${customRiskName}.`,
      actionProposed: actionProposed.trim() || recommendation.trim() || `Realizar plano de melhorias estruturais para mitigar ${customRiskName}.`,
      periodicity: periodicity.trim() || "Mensal",
      efficacyIndicator: efficacyIndicator.trim() || "Avaliação de clima / Feedbacks formais periódicos"
    };

    if (editingItemId) {
      const updatedInventory = report.riskInventory.map((item) => {
        if (item.id === editingItemId) {
          return {
            ...item,
            ...updatedItemData
          };
        }
        return item;
      });

      onChange({
        riskInventory: updatedInventory
      });
      setEditingItemId(null);
    } else {
      const newItem: RiskInventoryItem = {
        id: "inv-" + Date.now(),
        ...updatedItemData
      };

      onChange({
        riskInventory: [...report.riskInventory, newItem]
      });
    }

    // Reset Form
    setIsAdding(false);
    setCustomRiskName("");
    setSourcesField("");
    setPossibleInjuries("");
    setDiseaseHistory("");
    setExistingControls("");
    setRecommendation("");
    setResponsible("");
    setDeadline("");
    setMonitoring("");
    setMeasureResults("");
    setActionObjective("");
    setActionProposed("");
    setEfficacyIndicator("");
  };

  const handleDeleteItem = (id: string) => {
    onChange({
      riskInventory: report.riskInventory.filter((item) => item.id !== id)
    });
  };

  const getSectorName = (sectorId: string) => {
    const s = report.sectors.find((sect) => sect.id === sectorId);
    return s ? s.name : "Setor não identificado";
  };

  const handleEnrichRiskWithAI = async () => {
    if (!customRiskName.trim()) return;
    setIsEnrichingAI(true);
    setEnrichError(null);
    setEnrichSuccess(false);

    try {
      const sect = report.sectors.find((s) => s.id === selectedSectorId);
      const enriched = await enrichRiskItem({
        riskName: customRiskName.trim(),
        sectorName: sect ? sect.name : "Geral",
        companyName: report.companyName,
        companyActivity: report.companySector,
      });

      if (enriched) {
        if (enriched.sourcesField) setSourcesField(enriched.sourcesField);
        if (enriched.possibleInjuries) setPossibleInjuries(enriched.possibleInjuries);
        if (enriched.existingControls) setExistingControls(enriched.existingControls);
        if (enriched.probability) setProbability(enriched.probability);
        if (enriched.severity) setSeverity(enriched.severity);
        if (enriched.recommendation) setRecommendation(enriched.recommendation);
        if (enriched.actionObjective) setActionObjective(enriched.actionObjective);
        if (enriched.actionProposed) setActionProposed(enriched.actionProposed);
        if (enriched.priority) setPriority(enriched.priority);
        if (enriched.periodicity) setPeriodicity(enriched.periodicity);
        if (enriched.efficacyIndicator) setEfficacyIndicator(enriched.efficacyIndicator);
        if (enriched.deadline) setDeadline(enriched.deadline);
        setEnrichSuccess(true);
        setTimeout(() => setEnrichSuccess(false), 4000);
      }
    } catch (err: any) {
      console.error(err);
      setEnrichError(err.message || "Erro ao enriquecer dados com IA");
    } finally {
      setIsEnrichingAI(false);
    }
  };

  const handleGenerateBatchRisks = async () => {
    const targetSector = report.sectors.find((s) => s.id === (aiTargetSectorId || selectedSectorId)) || report.sectors[0];
    if (!targetSector) return;
    setIsGeneratingBatchAI(true);
    setAiBatchError(null);

    try {
      const risks = await generateSectorRisks({
        sectorName: targetSector.name,
        sectorEmployees: targetSector.employeeCount,
        companyName: report.companyName,
        companyActivity: report.companySector,
        sectorSynthesis: targetSector.devolvedSynthesis || targetSector.qualitativeConclusionText,
        count: aiRiskCount,
      });

      setBatchAiResults(risks);
      setSelectedAiIndices(risks.map((_, i) => i));
    } catch (err: any) {
      console.error(err);
      setAiBatchError(err.message || "Erro ao sugerir riscos com IA");
    } finally {
      setIsGeneratingBatchAI(false);
    }
  };

  const handleApplyBatchRisks = () => {
    const targetSector = report.sectors.find((s) => s.id === (aiTargetSectorId || selectedSectorId)) || report.sectors[0];
    if (!targetSector || batchAiResults.length === 0) return;

    const itemsToAdd: RiskInventoryItem[] = batchAiResults
      .filter((_, idx) => selectedAiIndices.includes(idx))
      .map((r, i) => {
        const matrixResult = getMatrixCell(r.probability, r.severity);
        return {
          id: "inv-ai-" + Date.now() + "-" + i,
          sectorId: targetSector.id,
          riskName: r.riskName,
          exposedCount: targetSector.employeeCount || 1,
          type: "Psicossocial" as const,
          sourcesField: r.sourcesField,
          possibleInjuries: r.possibleInjuries,
          diseaseHistory: "Nenhum registro oficial de adoecimento até o momento.",
          existingControls: r.existingControls,
          probability: r.probability,
          severity: r.severity,
          riskScore: r.probability * r.severity,
          riskLevel: matrixResult.level,
          color: matrixResult.color,
          uncertainty: "Certa" as const,
          recommendation: r.recommendation,
          priority: r.priority,
          responsible: "Liderança e Gestores",
          status: "Pendente" as const,
          deadline: r.deadline || "Mês Corrente + 3",
          monitoring: "Checklists de monitoramento periódico com os supervisores.",
          measureResults: "Redução de queixas e manutenção/melhoria do clima organizacional.",
          actionObjective: r.actionObjective,
          actionProposed: r.actionProposed,
          periodicity: r.periodicity || "Mensal",
          efficacyIndicator: r.efficacyIndicator || "Avaliação periódica de clima / feedbacks",
        };
      });

    onChange({
      riskInventory: [...report.riskInventory, ...itemsToAdd],
    });

    setShowAIModal(false);
    setBatchAiResults([]);
  };

  const activeMatrix = getMatrixCell(probability, severity);
  const activeColorSet = getColorClass(activeMatrix.color);

  return (
    <div className="space-y-6" id="risk-inventory-manager">
      {/* Cabeçalho */}
      <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-md font-semibold text-slate-800 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-slate-600" />
            Inventário Geral de Riscos Psicossociais (GRO/PGR)
          </h3>
          <p className="text-xs text-slate-500">
            Mapeie detalhadamente os riscos psicossociais por setor, realize a estimativa de risco na matriz 5x5 e configure as diretrizes de controle.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              const defaultSector = selectedSectorId || (report.sectors[0]?.id ?? "");
              setAiTargetSectorId(defaultSector);
              setShowAIModal(true);
            }}
            disabled={report.sectors.length === 0}
            className="flex items-center justify-center gap-1.5 text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 px-4 py-2.5 rounded-lg transition-all cursor-pointer shadow-xs disabled:opacity-50"
            title="A IA analisa o setor, a síntese qualitativa e sugere riscos estruturados para o inventário"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            Elaborar Inventário com IA
          </button>

          <button
            onClick={() => {
              if (editingItemId) {
                handleCancelEdit();
              } else {
                if (!isAdding) {
                  const targetSector = report.sectors.find((s) => s.id === selectedSectorId) || report.sectors[0];
                  if (targetSector) {
                    setSelectedSectorId(targetSector.id);
                    setExposedCount(targetSector.employeeCount || 1);
                  }
                }
                setIsAdding(!isAdding);
              }
            }}
            className="flex items-center justify-center gap-1.5 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 px-4 py-2.5 rounded-lg transition-all cursor-pointer shadow-xs"
          >
            {editingItemId ? "Cancelar Edição" : isAdding ? "Fechar Formulário" : "Adicionar Risco Manualmente"}
          </button>
        </div>
      </div>

      {/* Formulário de Adicionar ao Inventário */}
      {isAdding && (
        <form id="risk-form-container" onSubmit={handleCreateInventoryItem} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
          <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2 border-b border-slate-100 pb-3">
            <ShieldAlert className="w-4 h-4 text-slate-600" /> Preencher Registro de Risco no Setor
          </h4>

          {/* Seção 1: Identificação do Risco e Setor */}
          <div className="space-y-4">
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">1. Identificação Básica</h5>
            
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-4 space-y-1">
                <label className="text-xs font-semibold text-slate-600">Setor/GES Afetado</label>
                <SearchableSelect
                  value={selectedSectorId}
                  onChange={(val) => {
                    setSelectedSectorId(val);
                    const s = report.sectors.find((sec) => sec.id === val);
                    if (s) {
                      setExposedCount(s.employeeCount || 1);
                    }
                  }}
                  options={report.sectors.map((s) => ({
                    value: s.id,
                    label: s.name,
                    subLabel: s.description || undefined
                  }))}
                  placeholder="Selecione o setor..."
                  searchPlaceholder="Buscar setor..."
                  required
                />
              </div>

              <div className="md:col-span-5 space-y-1">
                <label className="text-xs font-semibold text-slate-600">Puxar do Catálogo ou Personalizar</label>
                <SearchableSelect
                  value={selectedCatalogRiskId}
                  onChange={(val) => setSelectedCatalogRiskId(val)}
                  options={[
                    ...catalog.map((risk) => ({
                      value: risk.id,
                      label: risk.name,
                      subLabel: `Categoria: ${risk.category}`
                    })),
                    { value: "custom", label: "[Risco Personalizado / Não listado]", subLabel: "Crie um risco personalizado abaixo" }
                  ]}
                  placeholder="Selecione o risco do catálogo..."
                  searchPlaceholder="Buscar risco no catálogo..."
                  required
                />
              </div>

              <div className="md:col-span-3 space-y-1">
                <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                  Expostos (GES)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={exposedCount}
                  onChange={(e) => setExposedCount(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-semibold text-slate-600">Nome do Risco Psicossocial</label>
                <button
                  type="button"
                  disabled={isEnrichingAI || !customRiskName.trim()}
                  onClick={handleEnrichRiskWithAI}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  title="A IA analisa o nome do risco, a atividade da empresa e o setor para sugerir fontes geradoras, possíveis danos, controles recomendados e probabilidade/severidade"
                >
                  {isEnrichingAI ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-600" />
                      Consultando IA...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                      Preencher Dados com IA
                    </>
                  )}
                </button>
              </div>
              <input
                type="text"
                required
                value={customRiskName}
                onChange={(e) => setCustomRiskName(e.target.value)}
                placeholder="Ex: Exigência excessiva de atenção concentrada e picos de demanda."
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800 focus:ring-2 focus:ring-slate-400 outline-none"
              />
              {enrichSuccess && (
                <p className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 mt-1">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  Dados do risco, matriz de avaliação e medidas de ação foram preenchidos pela Inteligência Artificial!
                </p>
              )}
              {enrichError && (
                <p className="text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 mt-1">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                  {enrichError}
                </p>
              )}
            </div>
          </div>

          {/* Seção 2: Diagnóstico e Realidade de Campo */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">2. Mapeamento e Diagnóstico Fático</h5>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Fonte Geradora / Situações de Trabalho Detectadas</label>
                <textarea
                  value={sourcesField}
                  onChange={(e) => setSourcesField(e.target.value)}
                  placeholder="Ex: Introdução de novo sistema informatizado de faturamento sem treinamento prévio da equipe."
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800 resize"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Possíveis Lesões e Agravos à Saúde</label>
                <textarea
                  value={possibleInjuries}
                  onChange={(e) => setPossibleInjuries(e.target.value)}
                  placeholder="Ex: Estresse ocupacional crônico, dores cefálicas tensionais, crises episódicas de ansiedade no setor."
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800 resize"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Histórico de Doenças / Afastamentos</label>
                <textarea
                  value={diseaseHistory}
                  onChange={(e) => setDiseaseHistory(e.target.value)}
                  placeholder="Ex: Houve 1 afastamento médico de 5 dias nos últimos 12 meses por queixas correlacionadas a estresse."
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800 resize"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Medidas de Controle / Preventivas Existentes</label>
                <textarea
                  value={existingControls}
                  onChange={(e) => setExistingControls(e.target.value)}
                  placeholder="Ex: Canais de comunicação abertos com o supervisor direto para reportar conflitos."
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800 resize"
                />
              </div>
            </div>
          </div>

          {/* Seção 3: Avaliação de Risco 5x5 */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">3. Avaliação Quali-Quantitativa (Matriz 5x5)</h5>
            
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              {/* Seleção de Probabilidade */}
              <div className="md:col-span-4 space-y-2">
                <label className="text-xs font-semibold text-slate-600">Probabilidade de Ocorrência</label>
                <div className="space-y-1.5">
                  {PROBABILITY_LEVELS.map((item) => (
                    <label key={item.value} className="flex items-center gap-2 cursor-pointer p-1.5 hover:bg-slate-50 rounded transition">
                      <input
                        type="radio"
                        name="prob"
                        checked={probability === item.value}
                        onChange={() => setProbability(item.value)}
                        className="accent-slate-800"
                      />
                      <span className="text-xs font-semibold text-slate-700">{item.value} - {item.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Seleção de Severidade */}
              <div className="md:col-span-4 space-y-2">
                <label className="text-xs font-semibold text-slate-600">Severidade do Agravo</label>
                <div className="space-y-1.5">
                  {SEVERITY_LEVELS.map((item) => (
                    <label key={item.value} className="flex items-center gap-2 cursor-pointer p-1.5 hover:bg-slate-50 rounded transition">
                      <input
                        type="radio"
                        name="sev"
                        checked={severity === item.value}
                        onChange={() => setSeverity(item.value)}
                        className="accent-slate-800"
                      />
                      <span className="text-xs font-semibold text-slate-700">{item.value} - {item.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Resultado do Cruzamento */}
              <div className="md:col-span-4 bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-4">
                <div className="text-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cálculo de Risco Estimado</p>
                  <div className="text-2xl font-extrabold text-slate-800 mt-1 font-mono">
                    {probability} × {severity} = <span className="text-slate-900">{probability * severity}</span>
                  </div>
                </div>

                <div className={`p-3 rounded-xl border text-center ${activeColorSet.bg} ${activeColorSet.border}`}>
                  <span className="text-xs font-bold block uppercase tracking-wider text-slate-500">Classificação</span>
                  <span className={`text-sm font-extrabold ${activeColorSet.text}`}>
                    {activeMatrix.label}
                  </span>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Estimativa da Medida (Incerteza)</label>
                  <SearchableSelect
                    value={uncertainty}
                    onChange={(val) => setUncertainty(val as any)}
                    options={[
                      { value: "Certa", label: "Estimativa Certa", subLabel: "Evidências robustas" },
                      { value: "Incerta", label: "Estimativa Incerta", subLabel: "Fatores dinâmicos" },
                      { value: "Altamente Incerta", label: "Altamente Incerta", subLabel: "Falta de dados fáticos" }
                    ]}
                    placeholder="Selecione a incerteza..."
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Seção 4: Diretrizes de Controle e Integração com Plano de Ação */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">4. Recomendações Preventivas e Plano de Ação</h5>
            
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Recomendação Preventiva de Controle</label>
                <textarea
                  value={recommendation}
                  onChange={(e) => {
                    setRecommendation(e.target.value);
                    setActionProposed(e.target.value); // Sync to proposed action by default
                  }}
                  placeholder="Ex: Realizar rodadas de feedback individual com a nova equipe de faturamento e treinamento instrucional do novo CRM de forma urgente."
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800 resize"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Prioridade da Medida</label>
                <SearchableSelect
                  value={priority}
                  onChange={(val) => setPriority(val as any)}
                  options={[
                    { value: "Baixa", label: "Baixa", subLabel: "Medida preventiva de rotina" },
                    { value: "Média", label: "Média", subLabel: "Medida importante preventiva" },
                    { value: "Alta", label: "Alta", subLabel: "Ação corretiva prioritária urgente" }
                  ]}
                  placeholder="Selecione a prioridade..."
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Quem Fará (Responsável)</label>
                <input
                  type="text"
                  value={responsible}
                  onChange={(e) => setResponsible(e.target.value)}
                  placeholder="Ex: Gestor de Operações / Liderança"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Prazo Estimado (Mês/Ano)</label>
                <input
                  type="text"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  placeholder="Ex: Agosto/2026"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Status Inicial</label>
                <SearchableSelect
                  value={status}
                  onChange={(val) => setStatus(val as any)}
                  options={[
                    { value: "Pendente", label: "Pendente", subLabel: "Aguardando início" },
                    { value: "Em Andamento", label: "Em Andamento", subLabel: "Sendo implementada" },
                    { value: "Concluído", label: "Concluído", subLabel: "Ação finalizada" }
                  ]}
                  placeholder="Selecione o status..."
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Como Acompanhar (Monitoramento)</label>
                <input
                  type="text"
                  value={monitoring}
                  onChange={(e) => setMonitoring(e.target.value)}
                  placeholder="Ex: Auditorias de processo e escuta mensal nas reuniões de coordenação."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Como Aferir Resultados (Eficácia)</label>
                <input
                  type="text"
                  value={measureResults}
                  onChange={(e) => setMeasureResults(e.target.value)}
                  placeholder="Ex: Verificação de metas atingidas sem relatos de sobrecarga e redução do turnover."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800"
                />
              </div>
            </div>

            {/* Campos adicionais requeridos para o plano de ação */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Campos Avançados do Plano de Ação</span>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Objetivo Específico da Ação</label>
                  <input
                    type="text"
                    value={actionObjective}
                    onChange={(e) => setActionObjective(e.target.value)}
                    placeholder="Ex: Ajustar o fluxo informacional e diminuir ruídos de competência no setor."
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Ação Proposta Detalhada</label>
                  <input
                    type="text"
                    value={actionProposed}
                    onChange={(e) => setActionProposed(e.target.value)}
                    placeholder="Ex: Elaborar fluxo organizacional formal indicando papéis de aprovação das faturas."
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Periodicidade da Ação</label>
                  <input
                    type="text"
                    value={periodicity}
                    onChange={(e) => setPeriodicity(e.target.value)}
                    placeholder="Ex: Mensal / Eventual"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Indicador de Eficácia</label>
                  <input
                    type="text"
                    value={efficacyIndicator}
                    onChange={(e) => setEfficacyIndicator(e.target.value)}
                    placeholder="Ex: Índice de conformidade em faturamento ou índice de reavaliação COPSOQ."
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-800"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="submit"
              className="flex-1 bg-slate-800 hover:bg-slate-900 text-white font-bold text-sm py-3 px-4 rounded-xl transition cursor-pointer shadow-xs"
            >
              {editingItemId ? "Salvar Alterações no Inventário" : "Adicionar Risco ao Inventário e Plano de Ação"}
            </button>
            {editingItemId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm py-3 px-4 rounded-xl transition cursor-pointer"
              >
                Cancelar Edição
              </button>
            )}
          </div>
        </form>
      )}

      {/* Lista do Inventário */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <h4 className="font-semibold text-slate-800 text-sm">
            Itens Cadastrados no Inventário de Riscos ({report.riskInventory.length})
          </h4>
        </div>

        {report.riskInventory.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            Nenhum item adicionado ao inventário ainda. Clique no botão <strong>Adicionar Risco ao Inventário</strong> acima para registrar o primeiro.
          </div>
        ) : (
          /* Visualização de Fichas Técnicas (Cards) */
          <div className="space-y-6">
            {report.riskInventory.map((item) => {
              return (
                <div key={item.id} className="border border-slate-300 rounded-xl overflow-hidden shadow-xs bg-white text-slate-800 text-xs">
                  {/* Header */}
                  <div className="bg-slate-100 border-b border-slate-300 px-4 py-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded bg-slate-400 inline-block"></span>
                      <h5 className="font-extrabold uppercase tracking-wide text-slate-700 text-xs">
                        INVENTÁRIO DE RISCOS PSICOSSOCIAIS - {getSectorName(item.sectorId).toUpperCase()}
                      </h5>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(item)}
                        className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded transition cursor-pointer flex items-center gap-1"
                        title="Editar Ficha"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-bold">Editar</span>
                      </button>
                      
                      {deletingItemId === item.id ? (
                        <div className="flex items-center gap-1 bg-rose-50 border border-rose-200 p-0.5 rounded-md">
                          <span className="text-[9px] font-bold text-rose-800 px-1">Excluir?</span>
                          <button
                            type="button"
                            onClick={() => {
                              handleDeleteItem(item.id);
                              setDeletingItemId(null);
                            }}
                            className="text-[9px] font-black text-rose-700 hover:text-rose-900 bg-rose-100/50 px-1.5 py-0.5 rounded cursor-pointer"
                          >
                            Sim
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingItemId(null)}
                            className="text-[9px] font-bold text-slate-500 hover:text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded cursor-pointer"
                          >
                            Não
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDeletingItemId(item.id)}
                          className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer flex items-center gap-1"
                          title="Excluir Ficha"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-bold">Excluir</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Row 1: Bullet and Risk Name */}
                  <div className="border-b border-slate-300 px-4 py-2 bg-slate-50/50 flex items-center gap-2 font-bold text-sm text-slate-900">
                    <span className="w-2 h-2 bg-slate-700 rounded-xs"></span>
                    <span>{item.riskName}</span>
                  </div>

                  {/* Row 2: Exposição */}
                  <div className="border-b border-slate-300 px-4 py-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <span className="font-extrabold text-slate-500 block text-[10px] uppercase tracking-wider">Trabalhadores Expostos (GES)</span>
                      <span className="text-slate-800 font-semibold">
                        {(() => {
                          const itemSector = report.sectors.find((s) => s.id === item.sectorId);
                          return itemSector?.employeeCount || item.exposedCount || 1;
                        })()} funcionários
                      </span>
                    </div>
                    <div>
                      <span className="font-extrabold text-slate-500 block text-[10px] uppercase tracking-wider">Frequência de Exposição</span>
                      <span className="text-slate-800 font-semibold">Contínua / Habitual</span>
                    </div>
                  </div>

                  {/* Row 3: Perigos, fontes e circunstâncias */}
                  <div className="border-b border-slate-300 px-4 py-2">
                    <span className="font-extrabold text-slate-500 block text-[10px] uppercase tracking-wider">Perigos, Fontes e Circunstâncias:</span>
                    <span className="text-slate-700 font-medium">{item.sourcesField || "Não registrado."}</span>
                  </div>

                  {/* Row 4: Metodologia */}
                  <div className="border-b border-slate-300 px-4 py-2">
                    <span className="font-extrabold text-slate-500 block text-[10px] uppercase tracking-wider">Metodologia:</span>
                    <span className="text-slate-700 font-medium">Critério Qualitativo baseado na metodologia do COPSOQ e Matriz de Riscos Psicossociais 5x5.</span>
                  </div>

                  {/* Row 5: Medidas administrativas ou de organização do trabalho */}
                  <div className="border-b border-slate-300 px-4 py-2">
                    <span className="font-extrabold text-slate-500 block text-[10px] uppercase tracking-wider">Medidas administrativas ou de organização do trabalho (Controles Existentes):</span>
                    <span className="text-slate-700 font-medium">{item.existingControls || "Não evidenciado."}</span>
                  </div>

                  {/* Row 6: Descrição do Agente Nocivo */}
                  <div className="border-b border-slate-300 px-4 py-2">
                    <span className="font-extrabold text-slate-500 block text-[10px] uppercase tracking-wider">Descrição do Agente Nocivo / Fator de Risco:</span>
                    <span className="text-slate-700 font-medium">{item.riskName} (Risco Psicossocial Organizacional)</span>
                  </div>

                  {/* Row 7: Possíveis danos à saúde */}
                  <div className="border-b border-slate-300 px-4 py-2">
                    <span className="font-extrabold text-slate-500 block text-[10px] uppercase tracking-wider">Possíveis danos à saúde:</span>
                    <span className="text-slate-700 font-medium">{item.possibleInjuries || "Não registrado."}</span>
                  </div>

                  {/* Row 8: Histórico de doenças / Queixas de adoecimento */}
                  {item.diseaseHistory && (
                    <div className="border-b border-slate-300 px-4 py-2">
                      <span className="font-extrabold text-slate-500 block text-[10px] uppercase tracking-wider">Histórico de doenças / Queixas de adoecimento:</span>
                      <span className="text-slate-700 font-medium">{item.diseaseHistory}</span>
                    </div>
                  )}

                  {/* Row 9: Probabilidade, Severidade, Nível do Risco */}
                  <div className="border-b border-slate-300 grid grid-cols-1 sm:grid-cols-3">
                    <div className="px-4 py-2 border-r border-slate-300 flex flex-col justify-center bg-slate-50/50">
                      <span className="font-extrabold text-slate-500 text-[10px] uppercase tracking-wider block">Probabilidade</span>
                      <span className="text-sm font-black text-slate-800">
                        {PROBABILITY_LEVELS[item.probability - 1]?.label || item.probability}
                      </span>
                    </div>
                    <div className="px-4 py-2 border-r border-slate-300 flex flex-col justify-center bg-slate-50/50">
                      <span className="font-extrabold text-slate-500 text-[10px] uppercase tracking-wider block">Severidade</span>
                      <span className="text-sm font-black text-slate-800">
                        {SEVERITY_LEVELS[item.severity - 1]?.label || item.severity}
                      </span>
                    </div>
                    <div className={`px-4 py-2 flex flex-col justify-center text-white ${
                      item.color === "red"
                        ? "bg-rose-600"
                        : item.color === "orange"
                        ? "bg-amber-500"
                        : item.color === "yellow"
                        ? "bg-yellow-500 text-slate-900"
                        : item.color === "blue"
                        ? "bg-blue-500"
                        : "bg-emerald-600"
                    }`}>
                      <span className="font-extrabold text-[10px] uppercase tracking-wider block opacity-90">Nível do Risco / Perigo</span>
                      <span className="text-sm font-black uppercase">
                        Nível {item.riskLevel} (Score {item.riskScore})
                      </span>
                    </div>
                  </div>

                  {/* Row 10: Estimativa and 5x5 Matrix Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2">
                    <div className="px-4 py-3 border-r border-slate-300 space-y-2 flex flex-col justify-between">
                      <div>
                        <span className="font-extrabold text-slate-500 block text-[10px] uppercase tracking-wider">Estimativa:</span>
                        <span className="text-slate-800 font-bold text-sm">{item.uncertainty || "Certa"}</span>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-[11px] space-y-1 mt-2">
                        <span className="font-extrabold text-slate-600 block uppercase text-[8px] tracking-wider">Recomendação Preventiva Proposta (PGR):</span>
                        <p className="text-slate-700 leading-normal font-semibold italic">"{item.recommendation}"</p>
                      </div>
                    </div>
                    <div className="p-3 bg-slate-50/50 flex flex-col items-center justify-center border-t md:border-t-0 border-slate-300">
                      <span className="font-extrabold text-slate-500 block text-[9px] uppercase tracking-wider mb-2">Matriz de Avaliação 5x5</span>
                      <div className="grid grid-cols-6 gap-0.5 max-w-[220px] w-full text-[8px] font-bold text-center">
                        {/* Top Header Labels */}
                        <div className="text-[6px] text-slate-400 flex items-center justify-center">S \ P</div>
                        {[1, 2, 3, 4, 5].map(p => (
                          <div key={p} className="text-slate-400 flex items-center justify-center">P{p}</div>
                        ))}

                        {/* Matrix Rows */}
                        {[5, 4, 3, 2, 1].map((s) => (
                          <React.Fragment key={s}>
                            <div className="text-slate-400 flex items-center justify-center font-bold">S{s}</div>
                            {[1, 2, 3, 4, 5].map((p) => {
                              const cell = getMatrixCell(p, s);
                              const isActive = item.probability === p && item.severity === s;
                              
                              let cellBg = "bg-slate-200 text-slate-500";
                              if (isActive) {
                                cellBg = cell.color === "red"
                                  ? "bg-rose-500 text-white animate-pulse"
                                  : cell.color === "orange"
                                  ? "bg-amber-500 text-white animate-pulse"
                                  : cell.color === "yellow"
                                  ? "bg-yellow-400 text-slate-900"
                                  : cell.color === "blue"
                                  ? "bg-blue-400 text-white"
                                  : "bg-emerald-500 text-white";
                              } else {
                                cellBg = cell.color === "red"
                                  ? "bg-rose-50/50 text-rose-300"
                                  : cell.color === "orange"
                                  ? "bg-amber-50/50 text-amber-300"
                                  : cell.color === "yellow"
                                  ? "bg-yellow-50/50 text-yellow-500/70"
                                  : cell.color === "blue"
                                  ? "bg-blue-50/50 text-blue-300"
                                  : "bg-emerald-50/50 text-emerald-300";
                              }

                              return (
                                <div
                                  key={p}
                                  className={`h-5 flex items-center justify-center rounded-xs border border-white/20 font-black font-mono transition-all ${cellBg}`}
                                  title={`Probabilidade ${p} x Severidade ${s} = Score ${p*s} (Nível ${cell.level})`}
                                >
                                  {p * s}
                                </div>
                              );
                            })}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL: Elaboração de Inventário com Inteligência Artificial */}
      {showAIModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-slate-150 max-h-[92vh] flex flex-col my-auto animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-150 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-sm shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    Elaborar Inventário com Inteligência Artificial
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Gere riscos psicossociais contextualizados com fontes geradoras, danos à saúde, matriz 5x5 e ações corretivas.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAIModal(false);
                  setBatchAiResults([]);
                  setAiBatchError(null);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="py-4 space-y-4 overflow-y-auto flex-1 pr-1 text-xs">
              {/* Controles de Geração */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  <div className="sm:col-span-6 space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      Setor / GES Alvo
                    </label>
                    <SearchableSelect
                      value={aiTargetSectorId || (report.sectors[0]?.id ?? "")}
                      onChange={(val) => {
                        setAiTargetSectorId(val);
                        setBatchAiResults([]);
                      }}
                      options={report.sectors.map((s) => ({
                        value: s.id,
                        label: `${s.name} (${s.employeeCount || 0} func.)`,
                        subLabel: s.description || undefined,
                      }))}
                      placeholder="Selecione o setor..."
                      searchPlaceholder="Buscar setor..."
                      required
                    />
                  </div>

                  <div className="sm:col-span-3 space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      Qtd. de Riscos
                    </label>
                    <SearchableSelect
                      value={String(aiRiskCount)}
                      onChange={(val) => setAiRiskCount(Number(val) || 3)}
                      options={[
                        { value: "3", label: "3 Riscos Técnicos" },
                        { value: "5", label: "5 Riscos Técnicos" },
                        { value: "8", label: "8 Riscos Completos" },
                      ]}
                      placeholder="Quantidade"
                      className="w-full"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <button
                      type="button"
                      disabled={isGeneratingBatchAI || !aiTargetSectorId}
                      onClick={handleGenerateBatchRisks}
                      className="w-full h-[38px] flex items-center justify-center gap-1.5 text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 rounded-lg transition-all cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      {isGeneratingBatchAI ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-white" />
                          Gerando...
                        </>
                      ) : (
                        <>
                          <Wand2 className="w-4 h-4" />
                          Gerar Riscos com IA
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Info do setor selecionado */}
                {(() => {
                  const targetSec = report.sectors.find((s) => s.id === (aiTargetSectorId || report.sectors[0]?.id));
                  if (!targetSec) return null;
                  const hasSynthesis = Boolean(targetSec.devolvedSynthesis || targetSec.qualitativeConclusionText);
                  return (
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200/80 text-[11px] text-slate-600">
                      <span>
                        Colaboradores expostos no GES: <strong className="text-slate-900 font-bold">{targetSec.employeeCount || 1}</strong>
                      </span>
                      <span className="text-slate-300">•</span>
                      {hasSynthesis ? (
                        <span className="text-emerald-700 font-semibold flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-600" /> Síntese da devolutiva deste setor carregada para guiar a IA
                        </span>
                      ) : (
                        <span className="text-slate-500">
                          (Dica: preencher a Síntese da Devolutiva na etapa anterior torna os riscos ainda mais precisos)
                        </span>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Erro de Geração */}
              {aiBatchError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  {aiBatchError}
                </div>
              )}

              {/* Loading State */}
              {isGeneratingBatchAI && (
                <div className="py-12 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 mx-auto flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">Consultando Inteligência Artificial Especialista...</h4>
                    <p className="text-slate-500 text-xs mt-1">
                      Avaliando a atividade da empresa, exigências psicossociais, fontes geradoras e matriz de risco 5x5.
                    </p>
                  </div>
                </div>
              )}

              {/* Lista de Riscos Gerados */}
              {!isGeneratingBatchAI && batchAiResults.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-1">
                    <span className="font-bold text-slate-800 text-xs">
                      Riscos Propostos ({selectedAiIndices.length} de {batchAiResults.length} selecionados):
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedAiIndices.length === batchAiResults.length) {
                          setSelectedAiIndices([]);
                        } else {
                          setSelectedAiIndices(batchAiResults.map((_, i) => i));
                        }
                      }}
                      className="text-indigo-600 hover:text-indigo-800 font-bold text-xs cursor-pointer"
                    >
                      {selectedAiIndices.length === batchAiResults.length ? "Desmarcar Todos" : "Selecionar Todos"}
                    </button>
                  </div>

                  <div className="space-y-3">
                    {batchAiResults.map((risk, index) => {
                      const isSelected = selectedAiIndices.includes(index);
                      const matrix = getMatrixCell(risk.probability, risk.severity);
                      const colorSet = getColorClass(matrix.color);

                      return (
                        <div
                          key={index}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedAiIndices(selectedAiIndices.filter((i) => i !== index));
                            } else {
                              setSelectedAiIndices([...selectedAiIndices, index]);
                            }
                          }}
                          className={`p-4 rounded-xl border transition-all cursor-pointer ${
                            isSelected
                              ? "bg-purple-50/40 border-purple-300 ring-1 ring-purple-200"
                              : "bg-white border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}} // handled by card click
                                className="mt-1 h-4 w-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                              />
                              <div className="space-y-1">
                                <h5 className="font-bold text-slate-900 text-xs">{risk.riskName}</h5>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-slate-600 pt-1">
                                  <div>
                                    <strong className="text-slate-500">Fontes/Circunstâncias:</strong> {risk.sourcesField}
                                  </div>
                                  <div>
                                    <strong className="text-slate-500">Possíveis Danos:</strong> {risk.possibleInjuries}
                                  </div>
                                  <div>
                                    <strong className="text-slate-500">Controles Básicos:</strong> {risk.existingControls}
                                  </div>
                                  <div>
                                    <strong className="text-slate-500">Ação 5W2H:</strong> {risk.actionProposed}
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="shrink-0 text-right space-y-1">
                              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold border ${colorSet.bg} ${colorSet.text} ${colorSet.border}`}>
                                Nível {matrix.level} ({risk.probability * risk.severity})
                              </span>
                              <span className="block text-[10px] text-slate-400">
                                P: {risk.probability} | S: {risk.severity}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {!isGeneratingBatchAI && batchAiResults.length === 0 && (
                <div className="py-10 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl space-y-1">
                  <p className="font-bold text-slate-600 text-xs">Pronto para gerar riscos psicossociais</p>
                  <p className="text-[11px]">
                    Selecione o setor/GES acima e clique em <strong>"Gerar Riscos com IA"</strong> para começar.
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-4 border-t border-slate-150 flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowAIModal(false);
                  setBatchAiResults([]);
                  setAiBatchError(null);
                }}
                className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition cursor-pointer text-xs"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={selectedAiIndices.length === 0}
                onClick={handleApplyBatchRisks}
                className="px-5 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold transition shadow-xs cursor-pointer text-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                Adicionar {selectedAiIndices.length} {selectedAiIndices.length === 1 ? "Risco" : "Riscos"} ao Inventário
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
