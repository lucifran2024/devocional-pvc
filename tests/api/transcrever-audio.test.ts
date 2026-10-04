// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { montarParagrafos } from '@/lib/transcricao-paragrafos';

const DONO = '11111111-1111-1111-1111-111111111111';

function pedido(corpo: unknown, token?: string): Request {
    return new Request('http://localhost/api/transcrever-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(corpo),
    });
}

describe('rota de transcrição de áudio', () => {
    const envOriginal = { ...process.env };
    let azureChamado = 0;

    const carregarRota = async () => {
        vi.resetModules();
        vi.doMock('@supabase/supabase-js', () => ({
            createClient: vi.fn(() => ({
                auth: {
                    getUser: async (token: string) => (token === 'token-do-dono'
                        ? { data: { user: { id: DONO } }, error: null }
                        : { data: { user: null }, error: { message: 'invalid' } }),
                },
                storage: {
                    from: () => ({
                        download: async () => ({ data: new Blob(['audio'], { type: 'audio/mp4' }), error: null }),
                    }),
                },
            })),
        }));
        return import('@/app/api/transcrever-audio/route');
    };

    beforeEach(() => {
        process.env.AZURE_SPEECH_KEY = 'chave-falsa';
        process.env.AZURE_SPEECH_REGION = 'brazilsouth';
        process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://exemplo.supabase.co';
        process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-falsa';
        azureChamado = 0;
        vi.stubGlobal('fetch', vi.fn(async () => {
            azureChamado += 1;
            return new Response(JSON.stringify({
                durationMilliseconds: 95000,
                combinedPhrases: [{ text: 'Tudo junto.' }],
                phrases: [
                    { offsetMilliseconds: 0, durationMilliseconds: 4000, text: 'A graça de Deus nos alcançou quando ainda estávamos longe. '.repeat(5).trim() },
                    { offsetMilliseconds: 9000, durationMilliseconds: 3000, text: 'Agora, vamos abrir em Efésios, capítulo dois.' },
                ],
            }), { headers: { 'Content-Type': 'application/json' } });
        }));
    });

    afterEach(() => {
        process.env = { ...envOriginal };
        vi.unstubAllGlobals();
        vi.doUnmock('@supabase/supabase-js');
    });

    it('recusa pedido sem login e não gasta o Azure', async () => {
        const { POST } = await carregarRota();
        const resp = await POST(pedido({ path: `${DONO}/a.mp4` }));
        expect(resp.status).toBe(401);
        expect(azureChamado).toBe(0);
    });

    it('recusa áudio da pasta de outra conta', async () => {
        const { POST } = await carregarRota();
        const resp = await POST(pedido({ path: '22222222-2222-2222-2222-222222222222/a.mp4' }, 'token-do-dono'));
        expect(resp.status).toBe(403);
        expect(azureChamado).toBe(0);
    });

    it('transcreve o áudio do dono em parágrafos e informa a duração', async () => {
        const { POST } = await carregarRota();
        const resp = await POST(pedido({ path: `${DONO}/culto.mp4` }, 'token-do-dono'));
        const data = await resp.json();
        expect(resp.status).toBe(200);
        expect(data.ok).toBe(true);
        expect(data.duracaoSeg).toBe(95);
        expect(data.texto.split('\n\n')).toHaveLength(2);
        expect(azureChamado).toBe(1);
    });
});

describe('parágrafos da transcrição', () => {
    it('quebra na pausa longa e junta frases próximas', () => {
        const longa = 'Frase com bastante conteúdo para formar um parágrafo de verdade. '.repeat(4).trim();
        const texto = montarParagrafos([
            { offsetMilliseconds: 0, durationMilliseconds: 5000, text: longa },
            { offsetMilliseconds: 5200, durationMilliseconds: 2000, text: 'Continua aqui.' },
            { offsetMilliseconds: 9500, durationMilliseconds: 2000, text: 'Depois da pausa.' },
        ]);
        expect(texto.split('\n\n')).toEqual([`${longa} Continua aqui.`, 'Depois da pausa.']);
    });

    it('não quebra parágrafo curto mesmo com pausa', () => {
        const texto = montarParagrafos([
            { offsetMilliseconds: 0, durationMilliseconds: 1000, text: 'Oremos.' },
            { offsetMilliseconds: 4000, durationMilliseconds: 1000, text: 'Senhor, obrigado.' },
        ]);
        expect(texto).toBe('Oremos. Senhor, obrigado.');
    });

    it('sem frases devolve vazio', () => {
        expect(montarParagrafos(undefined)).toBe('');
    });
});