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

    const newItem: RiskInventoryItem = {
      id: "inv-" + Date.now(),
      sectorId: selectedSectorId,
      riskName: customRiskName.trim(),
      exposedCount: Math.max(1, exposedCount),
      type: "Psicossocial",
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

    onChange({
      riskInventory: [...report.riskInventory, newItem]
    });

    // Reset Form
    setIsAdding(false);
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
    if (confirm("Deseja realmente remover este item do inventário de riscos?")) {
      onChange({
        riskInventory: report.riskInventory.filter((item) => item.id !== id)
      });
    }
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
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center justify-center gap-1.5 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 px-5 py-2.5 rounded-lg transition-all cursor-pointer shadow-xs"
        >
          {isAdding ? "Fechar Formulário" : "Adicionar Risco ao Inventário"}
        </button>
      </div>

      {/* Formulário de Adicionar ao Inventário */}
      {isAdding && (
        <form onSubmit={handleCreateInventoryItem} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
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
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Possíveis Lesões e Agravos à Saúde</label>
                <textarea
                  value={possibleInjuries}
                  onChange={(e) => setPossibleInjuries(e.target.value)}
                  placeholder="Ex: Estresse ocupacional crônico, dores cefálicas tensionais, crises episódicas de ansiedade no setor."
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800"
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
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Medidas de Controle / Preventivas Existentes</label>
                <textarea
                  value={existingControls}
                  onChange={(e) => setExistingControls(e.target.value)}
                  placeholder="Ex: Canais de comunicação abertos com o supervisor direto para reportar conflitos."
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800"
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
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800"
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

          <button
            type="submit"
            className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold text-sm py-3 px-4 rounded-xl transition cursor-pointer"
          >
            Adicionar Risco ao Inventário e Plano de Ação
          </button>
        </form>
      )}

      {/* Lista do Inventário */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
        <h4 className="font-semibold text-slate-800 text-sm border-b border-slate-100 pb-3">
          Itens Cadastrados no Inventário de Riscos ({report.riskInventory.length})
        </h4>

        {report.riskInventory.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            Nenhum item adicionado ao inventário ainda. Clique no botão <strong>Adicionar Risco ao Inventário</strong> acima para registrar o primeiro.
          </div>
        ) : (
          <div className="space-y-3">
            {report.riskInventory.map((item) => {
              const colors = getColorClass(item.color);
              const isExpanded = expandedItemId === item.id;

              return (
                <div key={item.id} className="p-4 border border-slate-100 rounded-xl hover:shadow-xs transition space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs bg-slate-800 text-white px-2 py-0.5 rounded-full font-semibold">
                          {getSectorName(item.sectorId)}
                        </span>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                          Exp: {item.exposedCount} func.
                        </span>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                          {item.type}
                        </span>
                      </div>
                      <h5 className="font-bold text-slate-800 text-sm">{item.riskName}</h5>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-center">
                      <span className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-full border flex items-center gap-1.5 ${colors.bg} ${colors.border} ${colors.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
                        Nível {item.riskLevel} ({item.riskScore})
                      </span>

                      <button
                        onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                        className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition cursor-pointer"
                        title="Ver Detalhes"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-1 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Detalhes Expandidos */}
                  {isExpanded && (
                    <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100/80 text-xs space-y-4 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 mt-2">
                      <div className="space-y-1">
                        <span className="font-bold text-slate-400 block uppercase tracking-wider text-[10px]">Fontes Encontradas / Situação de Trabalho</span>
                        <p className="text-slate-700 leading-relaxed">{item.sourcesField}</p>
                      </div>

                      <div className="space-y-1">
                        <span className="font-bold text-slate-400 block uppercase tracking-wider text-[10px]">Possíveis Lesões / Danos à Saúde</span>
                        <p className="text-slate-700 leading-relaxed">{item.possibleInjuries}</p>
                      </div>

                      <div className="space-y-1">
                        <span className="font-bold text-slate-400 block uppercase tracking-wider text-[10px]">Histórico de Doenças</span>
                        <p className="text-slate-700 leading-relaxed">{item.diseaseHistory}</p>
                      </div>

                      <div className="space-y-1">
                        <span className="font-bold text-slate-400 block uppercase tracking-wider text-[10px]">Medidas Preventivas Existentes</span>
                        <p className="text-slate-700 leading-relaxed">{item.existingControls}</p>
                      </div>

                      <div className="space-y-1">
                        <span className="font-bold text-slate-400 block uppercase tracking-wider text-[10px]">Estimativa de Incerteza</span>
                        <p className="text-slate-700 font-semibold">{item.uncertainty}</p>
                      </div>

                      <div className="space-y-1">
                        <span className="font-bold text-slate-400 block uppercase tracking-wider text-[10px]">Recomendação Preventiva</span>
                        <p className="text-slate-700 leading-relaxed font-semibold">{item.recommendation}</p>
                      </div>

                      <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-3 rounded-xl border border-slate-100">
                        <div className="space-y-1">
                          <span className="font-bold text-slate-400 block uppercase tracking-wider text-[9px]">Prioridade</span>
                          <span className="text-slate-800 font-bold">{item.priority}</span>
                        </div>
                        <div className="space-y-1">
                          <span className="font-bold text-slate-400 block uppercase tracking-wider text-[9px]">Responsável</span>
                          <span className="text-slate-800 font-semibold">{item.responsible}</span>
                        </div>
                        <div className="space-y-1">
                          <span className="font-bold text-slate-400 block uppercase tracking-wider text-[9px]">Prazo</span>
                          <span className="text-slate-800 font-semibold">{item.deadline}</span>
                        </div>
                        <div className="space-y-1">
                          <span className="font-bold text-slate-400 block uppercase tracking-wider text-[9px]">Status</span>
                          <span className="text-slate-800 font-bold">{item.status}</span>
                        </div>
                      </div>

                      <div className="md:col-span-2 space-y-2 bg-slate-800 text-slate-100 p-3 rounded-xl">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Dados Vinculados ao Plano de Ação:</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-[11px] text-slate-300">
                          <div><strong>Objetivo:</strong> {item.actionObjective}</div>
                          <div><strong>Ação Proposta:</strong> {item.actionProposed}</div>
                          <div><strong>Periodicidade:</strong> {item.periodicity}</div>
                          <div><strong>Indicador de Eficácia:</strong> {item.efficacyIndicator}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
