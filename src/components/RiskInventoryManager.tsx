/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Report, Sector, CatalogRisk, RiskInventoryItem } from "../types";
import { getMatrixCell, getColorClass, PROBABILITY_LEVELS, SEVERITY_LEVELS } from "../matrixUtils";
import { AlertCircle, Plus, Trash2, Edit2, ShieldAlert, FileSpreadsheet, Eye, HelpCircle } from "lucide-react";

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

  // Form Fields State
  const [customRiskName, setCustomRiskName] = useState("");
  const [exposedCount, setExposedCount] = useState<number>(1);
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
    setExposedCount(item.exposedCount);
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

  // Sync exposed employees when sector changes
  useEffect(() => {
    const sect = report.sectors.find((s) => s.id === selectedSectorId);
    if (sect) {
      setExposedCount(sect.employeeCount);
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

    const updatedItemData = {
      sectorId: selectedSectorId,
      riskName: customRiskName.trim(),
      exposedCount: Math.max(1, exposedCount),
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

        <button
          onClick={() => {
            if (editingItemId) {
              handleCancelEdit();
            } else {
              setIsAdding(!isAdding);
            }
          }}
          className="flex items-center justify-center gap-1.5 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 px-5 py-2.5 rounded-lg transition-all cursor-pointer shadow-xs"
        >
          {editingItemId ? "Cancelar Edição" : isAdding ? "Fechar Formulário" : "Adicionar Risco ao Inventário"}
        </button>
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
                <label className="text-xs font-semibold text-slate-600">Setor/GHE Afetado</label>
                <select
                  value={selectedSectorId}
                  onChange={(e) => setSelectedSectorId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800 bg-white"
                >
                  {report.sectors.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-5 space-y-1">
                <label className="text-xs font-semibold text-slate-600">Puxar do Catálogo ou Personalizar</label>
                <select
                  value={selectedCatalogRiskId}
                  onChange={(e) => setSelectedCatalogRiskId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800 bg-white"
                >
                  {catalog.map((risk) => (
                    <option key={risk.id} value={risk.id}>{risk.name}</option>
                  ))}
                  <option value="custom">[Risco Personalizado / Não listado]</option>
                </select>
              </div>

              <div className="md:col-span-3 space-y-1">
                <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                  Expostos (GHE)
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

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600">Nome do Risco Psicossocial</label>
              <input
                type="text"
                required
                value={customRiskName}
                onChange={(e) => setCustomRiskName(e.target.value)}
                placeholder="Ex: Exigência excessiva de atenção concentrada e picos de demanda."
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800"
              />
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
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800 resize-y"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Possíveis Lesões e Agravos à Saúde</label>
                <textarea
                  value={possibleInjuries}
                  onChange={(e) => setPossibleInjuries(e.target.value)}
                  placeholder="Ex: Estresse ocupacional crônico, dores cefálicas tensionais, crises episódicas de ansiedade no setor."
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800 resize-y"
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
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800 resize-y"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Medidas de Controle / Preventivas Existentes</label>
                <textarea
                  value={existingControls}
                  onChange={(e) => setExistingControls(e.target.value)}
                  placeholder="Ex: Canais de comunicação abertos com o supervisor direto para reportar conflitos."
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800 resize-y"
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
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Incerteza da Estimativa</label>
                  <select
                    value={uncertainty}
                    onChange={(e) => setUncertainty(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-800 bg-white"
                  >
                    <option value="Certa">Estimativa Certa (Evidências robustas)</option>
                    <option value="Incerta">Estimativa Incerta (Fatores dinâmicos)</option>
                    <option value="Altamente Incerta">Altamente Incerta (Falta de dados fáticos)</option>
                  </select>
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
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800 resize-y"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Prioridade da Medida</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800 bg-white"
                >
                  <option value="Baixa">Baixa</option>
                  <option value="Média">Média</option>
                  <option value="Alta">Alta</option>
                </select>
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
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800 bg-white"
                >
                  <option value="Pendente">Pendente</option>
                  <option value="Em Andamento">Em Andamento</option>
                  <option value="Concluído">Concluído</option>
                </select>
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
                      <span className="font-extrabold text-slate-500 block text-[10px] uppercase tracking-wider">Trabalhadores Expostos (GHE)</span>
                      <span className="text-slate-800 font-semibold">{item.exposedCount} funcionários</span>
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
                        <span className="font-extrabold text-slate-500 block text-[10px] uppercase tracking-wider">Estimativa de Incerteza / Confiança da Medida:</span>
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
    </div>
  );
};
