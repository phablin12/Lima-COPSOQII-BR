/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CatalogRisk } from "./types";

export const DEFAULT_RISK_CATALOG: CatalogRisk[] = [
  {
    id: "risk-1",
    name: "Sobrecarga Quantitativa de Trabalho",
    source: "Volume excessivo de tarefas, prazos impraticáveis, quadro de funcionários subdimensionado ou picos sazonais de demanda.",
    possibleInjuries: "Esgotamento profissional (Burnout), estresse crônico, distúrbios do sono, ansiedade geral e fadiga mental acumulada.",
    defaultLevel: "Moderado"
  },
  {
    id: "risk-2",
    name: "Ritmo de Trabalho Acelerado",
    source: "Metas abusivas, cobrança contínua por produtividade imediata, velocidade imposta por máquinas ou esteiras de produção.",
    possibleInjuries: "Lombalgias e dores osteomusculares (DORT/LER), cefaleia de tensão, irritabilidade crônica e episódios de pânico.",
    defaultLevel: "Moderado"
  },
  {
    id: "risk-3",
    name: "Falta de Autonomia e Controle",
    source: "Processos extremamente rígidos com decisões centralizadas, ausência de voz ativa na organização do próprio tempo de trabalho.",
    possibleInjuries: "Sentimento de desvalorização profissional, desmotivação profunda, sintomas depressivos leves ou moderados.",
    defaultLevel: "Baixo"
  },
  {
    id: "risk-4",
    name: "Apoio Social Insuficiente (Chefia/Colegas)",
    source: "Liderança autocrática, falta de feedback construtivo, clima organizacional competitivo ou isolamento físico/virtual das equipes.",
    possibleInjuries: "Isolamento social no trabalho, desânimo, ansiedade e dificuldade de comunicação interpessoal.",
    defaultLevel: "Moderado"
  },
  {
    id: "risk-5",
    name: "Conflito de Papéis e Ambiguidade",
    source: "Ausência de definição clara de cargos e funções, acúmulo informal de tarefas conflitantes ou ordens contraditórias de diferentes líderes.",
    possibleInjuries: "Tensão constante por insegurança ocupacional, estresse elevado, baixa autoeficácia laboral.",
    defaultLevel: "Moderado"
  },
  {
    id: "risk-6",
    name: "Conflito Trabalho-Família (Dupla Jornada)",
    source: "Horas extras habituais não planejadas, escalas de revezamento instáveis ou chamados de trabalho fora do horário de expediente.",
    possibleInjuries: "Desgaste nas relações sociofamiliares, cansaço extremo físico e mental, sentimento de culpa crônica.",
    defaultLevel: "Moderado"
  },
  {
    id: "risk-7",
    name: "Insegurança quanto ao Vínculo de Trabalho",
    source: "Ameaça frequente de demissão, instabilidade financeira do setor, falta de plano de carreira ou contratos temporários recorrentes.",
    possibleInjuries: "Ansiedade crônica antecipatória, insônia, medo de manifestar opiniões e sintomas psicossomáticos variados.",
    defaultLevel: "Alto"
  },
  {
    id: "risk-8",
    name: "Exigências Emocionais Elevadas",
    source: "Atendimento direto a clientes hostis, mediação constante de conflitos severos, ou convívio profissional direto com dor e sofrimento humano.",
    possibleInjuries: "Fadiga de compaixão, despersonalização, embotamento afetivo temporário e estresse pós-traumático secundário.",
    defaultLevel: "Alto"
  },
  {
    id: "risk-9",
    name: "Falta de Previsibilidade Organizacional",
    source: "Mudanças estruturais repentinas sem comunicação prévia, reestruturações constantes de equipes sem justificativa clara.",
    possibleInjuries: "Insegurança e desconfiança na gestão, resistência crônica a mudanças, estresse psicossocial.",
    defaultLevel: "Baixo"
  },
  {
    id: "risk-10",
    name: "Assédio Moral ou Condutas Ofensivas",
    source: "Humilhações públicas, boicotes informais de trabalho, piadas ofensivas recorrentes ou abuso sistemático de autoridade.",
    possibleInjuries: "Depressão grave, transtorno de estresse pós-traumático (TEPT), ideação suicida, afastamento previdenciário prolongado.",
    defaultLevel: "Grave"
  }
];
