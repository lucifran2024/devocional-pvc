/**
 * LLM Client (legado "gemini-client")
 * Centraliza chamadas com retry e function calling.
 * Agora usa OpenRouter (modelos free com fallback) por baixo.
 */

import { BIBLE_TOOLS_DEFINITION, consultarVersiculo } from './bible-tools.ts';
import { RSS_TOOLS_DEFINITION, consultarRSS } from './rss-tools.ts';
import { chamarCompatGemini } from './openrouter-client.ts';

// Combina todas as tools disponíveis
const ALL_TOOLS = [
    ...BIBLE_TOOLS_DEFINITION[0].function_declarations,
    ...RSS_TOOLS_DEFINITION[0].function_declarations
];

export interface GeminiResponse {
    ok: boolean;
    text?: string;
    error?: string;
}

/**
 * Chama a API Gemini com retry e function calling
 */
export async function callGemini(
    prompt: string,
    _geminiKey: string,
    maxTurns: number = 5
): Promise<GeminiResponse> {
    let messages: any[] = [{ role: 'user', parts: [{ text: prompt }] }];
    let resultadoFinal = '';

    for (let turn = 1; turn <= maxTurns; turn++) {
        try {
            const data: any = await chamarCompatGemini(messages, ALL_TOOLS);

            if (data.error) {
                console.error(`❌ Erro LLM:`, data.error.message);
                return { ok: false, error: `API Error: ${data.error.message}` };
            }

            const firstPart = data.candidates?.[0]?.content?.parts?.[0];

            if (!firstPart) {
                return { ok: false, error: 'Resposta inválida do Gemini (sem conteúdo)' };
            }

            // É chamada de ferramenta?
            if (firstPart.functionCall) {
                const fnName = firstPart.functionCall.name;
                const fnArgs = firstPart.functionCall.args;
                console.log(`🛠️ [Turno ${turn}] IA pediu ferramenta: ${fnName}`);

                let toolResult = '';
                try {
                    if (fnName === 'consultar_versiculo') {
                        toolResult = await consultarVersiculo(fnArgs.referencia);
                    } else if (fnName === 'consultar_devocional_externo') {
                        toolResult = await consultarRSS(fnArgs.fonte);
                    } else {
                        toolResult = `Ferramenta '${fnName}' desconhecida.`;
                    }
                } catch (err: any) {
                    toolResult = `Erro ao executar ferramenta: ${err.message}`;
                }

                // Adiciona histórico da conversa
                messages.push({
                    role: 'model',
                    parts: [firstPart]
                });

                messages.push({
                    role: 'function',
                    parts: [{
                        functionResponse: {
                            name: fnName,
                            response: { content: toolResult }
                        }
                    }]
                });

                continue; // Próximo turno
            }

            // É texto final?
            if (firstPart.text) {
                resultadoFinal = firstPart.text;
                console.log(`✅ [Turno ${turn}] Resposta final gerada.`);
                return { ok: true, text: resultadoFinal };
            }

            // Caso estranho
            console.warn(`⚠️ [Turno ${turn}] Resposta inesperada:`, firstPart);
            break;

        } catch (err: any) {
            console.error(`❌ Erro na chamada Gemini (Turno ${turn}):`, err.message);
            return { ok: false, error: err.message };
        }
    }

    if (resultadoFinal) {
        return { ok: true, text: resultadoFinal };
    }

    return { ok: false, error: 'Limite de turnos excedido' };
}

/**
 * Lista modelos disponíveis (para debug)
 */
export async function listAvailableModels(geminiKey: string): Promise<string[]> {
    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey}`;
        const response = await fetch(url);
        const data = await response.json();
        return data.models?.map((m: any) => m.name) || [];
    } catch (err) {
        console.error('Erro ao listar modelos:', err);
        return [];
    }
}
