/**
 * Streaming Helper - Suporte a streaming de respostas do Gemini
 * Melhora UX mostrando texto conforme é gerado
 */

/**
 * Cria um stream de resposta SSE (Server-Sent Events)
 */
export function createSSEStream(): {
    readable: ReadableStream;
    writer: {
        write: (data: string) => void;
        close: () => void;
        error: (err: Error) => void;
    };
} {
    let controller: ReadableStreamDefaultController<Uint8Array>;
    const encoder = new TextEncoder();

    const readable = new ReadableStream<Uint8Array>({
        start(ctrl) {
            controller = ctrl;
        },
        cancel() {
            console.log('Stream cancelled by client');
        }
    });

    return {
        readable,
        writer: {
            write(data: string) {
                const sseMessage = `data: ${JSON.stringify({ text: data })}\n\n`;
                controller.enqueue(encoder.encode(sseMessage));
            },
            close() {
                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                controller.close();
            },
            error(err: Error) {
                const errorMessage = `data: ${JSON.stringify({ error: err.message })}\n\n`;
                controller.enqueue(encoder.encode(errorMessage));
                controller.close();
            }
        }
    };
}

/**
 * Headers para SSE streaming
 */
export function getSSEHeaders(corsHeaders: Record<string, string>): Record<string, string> {
    return {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
    };
}

/**
 * Chama o LLM com streaming via OpenRouter (modelos free com fallback).
 * A assinatura mantém o parâmetro de chave por compatibilidade (ignorado).
 */
import { gerarTextoStreaming } from './openrouter-client.ts';

export async function callGeminiStreaming(
    prompt: string,
    _geminiKey: string,
    onChunk: (text: string) => void,
    onComplete: (fullText: string) => void,
    onError: (error: Error) => void
): Promise<void> {
    return gerarTextoStreaming(prompt, onChunk, onComplete, onError);
}
