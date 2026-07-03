/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ReportChapters } from "./types";

export const DEFAULT_CHAPTERS: ReportChapters = {
  introducao: `Este relatório apresenta a avaliação dos fatores de riscos psicossociais no ambiente de trabalho, em atendimento às diretrizes da Norma Regulamentadora nº 01 (NR-01) - Disposições Gerais e Gerenciamento de Riscos Ocupacionais (GRO) e do Programa de Gerenciamento de Riscos (PGR). 

A saúde mental e o bem-estar dos trabalhadores têm sido identificados como componentes essenciais da saúde ocupacional global. Ambientes laborais caracterizados por demandas excessivas, baixa autonomia, suporte social fragilizado e conflitos de papéis influenciam diretamente o desenvolvimento de patologias ocupacionais, tais como a Síndrome de Burnout, depressão, transtornos de ansiedade e agravos osteomusculares secundários à tensão psicofisiológica.

O objetivo deste documento é diagnosticar a percepção dos colaboradores acerca de suas condições psicossociais de trabalho, analisar tecnicamente os desvios evidenciados através de devolutivas estruturadas com a liderança e formalizar um plano de ação preventivo e corretivo focado na promoção de saúde mental ocupacional e melhoria contínua dos processos organizacionais.`,

  fundamentacao: `Os riscos psicossociais originam-se de deficiências no projeto, na organização e na gestão do trabalho, bem como de um contexto social adverso. Suas consequências podem ser tanto de natureza psicológica (estresse, ansiedade, burnout) quanto física (cardiopatias, distúrbios osteomusculares devido à tensão constante).

A base conceitual adotada apoia-se em modelos clássicos de estresse laboral:
1. Modelo Demanda-Controle-Apoio Social (Karasek): Postula que o estresse e o adoecimento resultam da combinação de altas exigências (demandas) psicológicas combinadas com baixa margem de tomada de decisão (autonomia/controle), sendo atenuados ou agravados pelo nível de suporte social de colegas e chefias.
2. Modelo Desequilíbrio Esforço-Recompensa (Siegrist): Foca na reciprocidade social, argumentando que a falta de correspondência entre o esforço empregado no trabalho e as recompensas obtidas (dinheiro, estima, segurança laboral) induz a um estado severo de distresse psicossocial.

Em termos legais e normativos nacionais, a NR-01 exige que o PGR identifique e avalie todos os perigos potenciais à saúde dos trabalhadores, incluindo os riscos ergonômicos e psicossociais. Os resultados desta avaliação devem nortear as ações preventivas organizadas no Plano de Ação do PGR.`,

  metodologia: `Para o mapeamento dos fatores de risco psicossocial, utilizou-se o Copenhagen Psychosocial Questionnaire - Versão II (COPSOQ II - BR). O COPSOQ é um instrumento validado internacionalmente, livre de propriedade intelectual, flexível e projetado especificamente para avaliar de forma abrangente o ambiente organizacional de trabalho e a saúde dos trabalhadores.

O instrumento avalia dimensões-chave que englobam o conteúdo e a organização do trabalho, as relações interpessoais, a interface família-trabalho e os indicadores individuais de saúde. As dimensões são pontuadas em uma escala normalizada de 0 a 4 pontos:
- Dimensões Positivas (onde escores maiores indicam maior proteção/fatores favoráveis): Influência e desenvolvimento, Significado e compromisso, Relações interpessoais, Liderança, Satisfação no trabalho, Valores no local de trabalho, Saúde geral.
- Dimensões Negativas (onde escores maiores representam maior fator de risco/sobrecarga): Demandas no trabalho, Conflitos família e trabalho, Burnout e estresse.

A classificação dos escores segue a escala técnica padronizada:
1. Situação Favorável (Escore superior a 3,66): Baixa ou inexistente exposição a fatores de risco. Requer manutenção das boas práticas vigentes.
2. Situação Moderada (Escore de 2,34 a 3,66): Exposição a fator(es) de risco com necessidade de monitoramento contínuo e preventivo.
3. Situação Desfavorável (Escore de 0 a 2,33): Exposição significativa a fator(es) de risco, requerendo intervenções organizacionais imediatas.

Após o processamento estatístico preliminar das avaliações dos funcionários, realizou-se uma etapa de Devolutiva Técnica e Diagnóstico de Campo junto aos líderes de cada setor avaliado. Esta etapa qualitativa serviu para correlacionar os indicadores numéricos às situações de trabalho em campo (fontes geradoras), permitindo a estruturação das medidas e planos recomendados.`,

  referencias: `1. ASSOCIAÇÃO BRASILEIRA DE NORMAS TÉCNICAS. ABNT ISO 45003:2021 - Gestão da saúde e segurança ocupacional - Saúde psicológica e segurança no trabalho - Diretrizes para gerenciar riscos psicossociais. Rio de Janeiro: ABNT, 2021.
2. BRASIL. Ministério do Trabalho e Emprego. Norma Regulamentadora nº 01 (NR-01) - Disposições Gerais e Gerenciamento de Riscos Ocupacionais. Brasília: MTE, Portaria SEPRT n.º 6.730/2020.
3. KARASEK, R.; THEORELL, T. Healthy Work: Stress, Productivity, and the Reconstruction of Working Life. New York: Basic Books, 1990.
4. SIEGRIST, J. Adverse health effects of high-effort/low-reward conditions. Journal of Occupational Health Psychology, v. 1, n. 1, p. 27-41, 1996.
5. COSTA, C. O. et al. Copenhagen Psychosocial Questionnaire (COPSOQ II) na realidade brasileira: validade de constructo e confiabilidade. Revista de Saúde Pública, 2020.`
};

export const DEFAULT_FINAL_CONSIDERATIONS = `A partir do diagnóstico psicossocial delineado neste relatório, conclui-se que o gerenciamento adequado dos riscos psicossociais na empresa representa não apenas uma exigência de conformidade legal com o GRO/PGR (NR-01), mas um pilar estratégico para a sustentabilidade organizacional.

Os resultados setoriais demonstram a urgência de agir sobre os fatores classificados como "Desfavoráveis" e "Moderados", direcionando recursos e engajamento da liderança para mitigar as fontes de estresse e sobrecarga identificadas. As ações propostas no Plano de Ação devem ser integradas ao cronograma anual do PGR e acompanhadas de forma sistêmica.

Recomenda-se a reavaliação periódica do clima e dos riscos psicossociais utilizando a mesma ferramenta COPSOQ II em um prazo máximo de 12 a 24 meses, ou após mudanças organizacionais substanciais, permitindo mensurar a eficácia das medidas de controle e o impacto real das melhorias implantadas sobre a saúde e engajamento da equipe.`;
