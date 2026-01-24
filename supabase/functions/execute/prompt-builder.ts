/**
 * Prompt Builder - Monta o prompt final para a IA
 * Centraliza toda a lógica de construção do prompt
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
    baseConhecimento: string;
    conhecimentoCompilado: string;
    bancoOuroExemplos: string;
    devocionalExterno: string;

    // Seções formatadas
    voiceSection: string;
    archetypeSection: string;

    // Chat
    pergunta?: string;
}

// Regras de estilo (fixas - não mudam)
const REGRAS_ESTILO = `
### [REGRAS_DE_ESTILO] ⭐⭐⭐ OBRIGATÓRIO - ESTILO DA MENSAGEM

📏 LIMITE DE TAMANHO (CRÍTICO):
- MÁXIMO 150 palavras por mensagem (corpo + fechamento)
- Corpo do devocional: MÁXIMO 120 palavras
- Se ultrapassar: CORTAR e simplificar
- Menos texto = mais lido. Seja CONCISO.

🚫 PROIBIDO (NÃO USE):
- TEXTOS LONGOS: Cada devocional deve ser CURTO e IMPACTANTE
- Palavras/termos: "norte", "rota", "Farol", "neblina", "bússola" (exceto se no versículo)
- METÁFORAS EM EXCESSO: NÃO repita "Agricultor", "vinha", "plantio", "solo", "semente", "raízes", "fruto", "pomar", "terra" em todas as mensagens. Use NO MÁXIMO 1 metáfora por mensagem.
- RÓTULOS/MARCADORES: NÃO use "Aplicação:", "Hoje:", "Ação:", "Lembre-se:", etc. O texto deve fluir naturalmente.
- Frases longas e poéticas rebuscadas
- Clichês de auto-ajuda

🎯 TOM PASTORAL SIMPLES:
- Fale como um pastor experiente conversando com alguém
- Seja DIRETO, não poético
- Use linguagem do dia a dia
- Confronte com amor, mas sem rodeios

✅ OBRIGATÓRIO:
1. TÍTULO: Provocativo, em CAIXA ALTA, máximo 15 palavras
2. FRASES CURTAS E PUNCHY
3. CONTRASTES (não é X, é Y)
4. TOM DIRETO E PESSOAL
5. DECLARAÇÕES PROFÉTICAS
6. PROFUNDIDADE TEOLÓGICA
7. EXEGESE DO VERSÍCULO
8. FECHAMENTO COM IMPERATIVO CLARO

📐 ESTRUTURA IDEAL:
1. Título provocativo (CAPS)
2. Abertura com afirmação forte
3. Desenvolvimento com contrastes e explicação
4. Versículo como PROVA (no meio, não no final)
5. Aplicação direta com "você"
6. Fechamento imperativo
`;

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

### [MEMORIA_ESTILO] ⭐⭐⭐ APRENDA ESTE ESTILO (ALTA PRIORIDADE)
Estes são exemplos APROVADOS de mensagens que funcionaram muito bem.
IMITE o tom, estrutura e profundidade destas mensagens:
${ctx.memoria}

${REGRAS_ESTILO}

### [PERSONALIDADE_DINAMICA] ⭐⭐⭐ ÂNGULO E TEMPERATURA DO DIA
${instrucaoVariabilidade}

### [INSTRUCOES_MODO] ⭐⭐ MODO ATIVO
Instruções específicas do modo selecionado:
${ctx.modoTexto}

### [ARQUETIPO_E_VOZ] Ajustes de Tom
ARQUETIPO: ${ctx.arquetipo}
VOZ: ${ctx.voiceNome} - ${ctx.voiceDescricao}
${ctx.voiceSection}
${ctx.archetypeSection}

### [AGENT_START] (Regras Gerais do Agente)
${ctx.agentStart}

### [CONHECIMENTO_E_REGRAS_COMPLETO] BASE UNIFICADA (Consulta)
${ctx.baseConhecimento}

### [CONHECIMENTO_COMPILADO_ESSENCIAL] CCE (Repertório de Consulta)
${ctx.conhecimentoCompilado}

### [BANCO_DE_OURO_EXEMPLOS] EXEMPLOS DE ESTILO
${ctx.bancoOuroExemplos}

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
