/**
 * Prompt Builder - Monta o prompt final para a IA
 * Centraliza toda a lógica de construção do prompt
 * v5 — MODO self-contained (BASE removida)
 */

import { gerarInstrucaoVariabilidade, type Angulo, type Temperatura } from './variability.ts';

export interface PromptContext {
    // Dados do dia
    data: string;
    passagemDoDia: string;
    arquetipo: string;
    voiceNome: string;
    voiceDescricao: string;

    // Variabilidade
    angulo: Angulo;
    temperatura: Temperatura;
    arquetipoNome: string;

    // Contexto adicional
    contextoTemporal: string;
    deepContext: string;
    memoria: string;

    // Arquivos de conhecimento
    modoTexto: string;
    agentStart: string;
    conhecimentoCompilado: string;
    devocionalExterno: string;

    // Seções formatadas
    voiceSection: string;
    archetypeSection: string;

    // Chat
    pergunta?: string;
}

/**
 * Constrói o prompt completo para a IA
 */
export function buildPrompt(ctx: PromptContext): string {
    const instrucaoVariabilidade = gerarInstrucaoVariabilidade(
        ctx.angulo,
        ctx.temperatura,
        ctx.arquetipoNome
    );

    const perguntaSection = ctx.pergunta ? `
### [PERGUNTA_DO_USUARIO] 🗣️ RESPONDA ESTA PERGUNTA
O usuário está em um chat interativo e fez a seguinte pergunta:

"${ctx.pergunta}"

IMPORTANTE: Responda DIRETAMENTE esta pergunta de forma pastoral e acolhedora.
Use a passagem do dia como base, mas foque em responder o que o usuário perguntou.
Seja conversacional, não gere 15 devocionais - gere UMA resposta de chat.
` : '';

    return `
### [PASSAGEM_DO_DIA] ⭐⭐⭐ FONTE DE VERDADE ABSOLUTA (SSOT)
Esta é a passagem bíblica do dia. TODO o conteúdo deve ser derivado EXCLUSIVAMENTE deste texto.
DATA: ${ctx.data}
PASSAGEM: ${ctx.passagemDoDia}
${ctx.deepContext}

### [MOMENTO_E_DATA] (Contexto Temporal)
${ctx.contextoTemporal}

### [INSTRUCOES_MODO] ⭐⭐⭐ MODO ATIVO (PRIORIDADE MÁXIMA)
Este é o prompt completo do modo. Contém TODAS as regras: identidade, voz, formato,
matrizes, anti-clichê, auditoria. Seguir INTEGRALMENTE.
Em caso de conflito com qualquer outra seção: o MODO vence.
${ctx.modoTexto}

### [PERSONALIDADE_DINAMICA] ÂNGULO E TEMPERATURA DO DIA
${instrucaoVariabilidade}

### [ARQUETIPO_E_VOZ] Ajustes de Tom
ARQUETIPO: ${ctx.arquetipo}
VOZ: ${ctx.voiceNome} - ${ctx.voiceDescricao}
${ctx.voiceSection}
${ctx.archetypeSection}

### [MEMORIA_ESTILO] Exemplos Aprovados (Referência de Tom)
Estes textos representam o estilo desejado. Use como REFERÊNCIA de cadência e temperatura.
O MODO define as regras. Os exemplos calibram a música.
${ctx.memoria}

### [AGENT_START] (Regras Gerais do Agente)
${ctx.agentStart}

### [CONHECIMENTO_COMPILADO_ESSENCIAL] CCE (Repertório de Consulta)
Catálogo de temas, versos por tema, movimentos DE→PARA, anti-arcaísmos, frases de autoridade.
Consultar quando o MODO indicar. CCE é CONTEÚDO de apoio, não muda regras.
${ctx.conhecimentoCompilado}

### [DEVOCIONAL_EXTERNO] (Inspiração do Dia - NÃO copie)
${ctx.devocionalExterno}

${perguntaSection}
`;
}

/**
 * Estima o tamanho do prompt em caracteres
 */
export function estimatePromptSize(prompt: string): number {
    return prompt.length;
}

/**
 * Estima tokens (aproximação: 1 token ≈ 4 caracteres)
 */
export function estimateTokens(prompt: string): number {
    return Math.ceil(prompt.length / 4);
}
