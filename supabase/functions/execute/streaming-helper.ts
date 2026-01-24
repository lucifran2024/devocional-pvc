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
 * Chama Gemini com streaming (quando disponível)
 * Fallback para chamada normal se streaming não suportado
 */
export async function callGeminiStreaming(
    prompt: string,
    geminiKey: string,
    onChunk: (text: string) => void,
    onComplete: (fullText: string) => void,
    onError: (error: Error) => void
): Promise<void> {
    const MODEL_NAME = 'gemini-3-flash-preview';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:streamGenerateContent?key=${geminiKey}&alt=sse`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: prompt }] }]
            })
        });

        if (!response.ok) {
            throw new Error(`Gemini API error: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
            throw new Error('No response body');
        }

        const decoder = new TextDecoder();
        let fullText = '';
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            // Parse SSE events
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data === '[DONE]') continue;

                    try {
                        const parsed = JSON.parse(data);
                        const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
                        if (text) {
                            fullText += text;
                            onChunk(text);
                        }
                    } catch {
                        // Ignore parse errors for incomplete chunks
                    }
                }
            }
        }

        onComplete(fullText);
    } catch (error) {
        onError(error instanceof Error ? error : new Error(String(error)));
    }
}
