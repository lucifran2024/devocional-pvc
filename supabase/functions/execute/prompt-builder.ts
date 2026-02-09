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

📏 TAMANHO (CRÍTICO — MENSAGENS CURTAS):
- MÁXIMO 80 palavras por mensagem (IDEAL: 30-60 palavras)
- Pelo menos 30% do lote deve ter MICRO-MENSAGENS (1-3 frases, máx 30 palavras)
- Se ultrapassar 80 palavras: CORTE SEM DÓ. Menos = mais.
- Pense assim: se a pessoa lê em 10 segundos, você acertou.

🚫 PROIBIDO (NÃO USE NUNCA):
- Palavras/termos: "norte", "rota", "neblina" (exceto se no versículo)
- METÁFORAS EM EXCESSO: NO MÁXIMO 1 metáfora por mensagem. Não misture 3 imagens diferentes.
- RÓTULOS/MARCADORES: NÃO use "Aplicação:", "Hoje:", "Ação:", "Lembre-se:", etc.
- Frases longas e poéticas rebuscadas — CORTE.
- Clichês de auto-ajuda
- A palavra "floresce" (saturada)
- Jargão evangélico sofisticado: "quebrantamento", "vale da sombra", "design divino", "imersão"
- Fechar TODAS as mensagens com frase curta tipo "[Substantivo] [verbo]." (ex: "A honestidade edifica.", "A fragilidade revela.")

🎯 TOM — DIRETO E CONFRONTACIONAL:
- Fale como alguém que AMA mas NÃO TEM MEDO de ser duro
- Seja DIRETO, não poético. Prefira SOCO a poema.
- Use linguagem do dia a dia, coloquial ("rasga tudo", "para de frescura", "basta")
- Confronte SEM RODEIOS — provoque, incomode, acorde
- Use CAPS para dar ÊNFASE em palavras-chave (como nos favoritos)
- Inclua TWISTS/REVIRAVOLTA — frases que surpreendem e invertem expectativas
  Ex: "Deus não está preparando algo PARA você. Ele está preparando VOCÊ."
  Ex: "Deus não tem favoritos. Ele tem ÍNTIMOS."

✅ OBRIGATÓRIO:
1. TÍTULO: Provocativo, em CAIXA ALTA, máximo 10 palavras. NÃO use o padrão "A ___ da ___" em mais de 1 mensagem do lote.
2. FRASES CURTAS E PUNCHY — staccato
3. CONTRASTES — "não é X, é Y" (o DNA das favoritas)
4. TOM DIRETO E PESSOAL — fale com "você"
5. PROFUNDIDADE TEOLÓGICA — não seja raso
6. PELO MENOS 1 MENSAGEM do lote deve ser tipo "TAPA NA CARA" — confrontacional, dura, sem floreio

📐 ESTRUTURAS POSSÍVEIS (VARIE — NÃO USE SÓ UMA):
Use pelo menos 3 estruturas DIFERENTES no lote:

A) SOCO DIRETO: Afirmação forte → Contraste → Conclusão (sem cena, sem narrativa, 2-4 frases)
   Ex: "Deus te fez diferente. Não estrague isso tentando ser como todo mundo."

B) TWIST/REVIRAVOLTA: Setup → Expectativa → Inversão surpreendente
   Ex: "Deus não está preparando algo para você. Ele está preparando VOCÊ para receber algo que já está preparado."

C) CONTRASTE DEFINIDOR: "X não é Y. É Z." em sequência staccato
   Ex: "Equilíbrio não é ausência de luta. É presença de paz. Não é controlar tudo. É saber que Deus está no controle."

D) CONFRONTO + VERSO: Confronta uma crença → Verso bíblico como prova → Aplicação curta
   Ex: "A igreja não é hospital. No hospital, a pessoa é curada para voltar à rotina antiga. Na igreja, Deus nos chama para vida nova."

E) CENA COTIDIANA: Cena breve (1 frase) → Reflexão → Verso → Fechamento (MÁXIMO 60 palavras)

F) ORAÇÃO: Fala direta com Deus, tom íntimo

G) COMANDO/DECLARAÇÃO: Frase de ordem ou declaração profética em CAPS
   Ex: "NÃO PARE DE ORAR SÓ PORQUE VOCÊ NÃO VÊ RESULTADOS IMEDIATAMENTE."
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
