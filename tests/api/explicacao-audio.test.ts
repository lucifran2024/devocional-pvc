import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const storage = vi.hoisted(() => ({
    list: vi.fn(),
    upload: vi.fn(),
    getPublicUrl: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
    createClient: () => ({ storage: { from: () => storage } }),
}));

import { POST } from '@/app/api/explicacao-audio/route';

const pedido = (body: unknown) => new Request('https://devocional-pvc.vercel.app/api/explicacao-audio', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});

beforeEach(() => {
    vi.stubEnv('AZURE_SPEECH_KEY', 'somente-teste');
    vi.stubEnv('AZURE_SPEECH_REGION', 'brazilsouth');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'somente-teste');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://teste.supabase.co');
    storage.list.mockResolvedValue({ data: [] });
    storage.upload.mockResolvedValue({ error: null });
    storage.getPublicUrl.mockReturnValue({ data: { publicUrl: 'https://cdn.exemplo.com/explicacao.mp3' } });
    vi.stubGlobal('fetch', vi.fn(async () => new Response(new Uint8Array([0x49, 0x44, 0x33, 0x04]), { status: 200 })));
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.clearAllMocks(); });

describe('POST /api/explicacao-audio', () => {
    it('usa a mesma voz Azure Macerio da Bíblia quando VoiceStudio não tem gravação da explicação', async () => {
        const resposta = await POST(pedido({ texto: '### A fé\n\n**Confiar:** Deus nos sustenta.', voz: 'voicestudio-pt-BR-masculina-v1' }));
        const json = await resposta.json();
        expect(resposta.status).toBe(200);
        expect(json.ok).toBe(true);
        expect(json.fullUrl).toContain('https://cdn.exemplo.com');
        expect(json.voz).toBe('pt-BR-MacerioMultilingualNeural');
        const chamada = vi.mocked(fetch).mock.calls[0];
        expect(chamada[0]).toContain('brazilsouth.tts.speech.microsoft.com');
        expect(chamada[1]?.body).toContain("name='pt-BR-MacerioMultilingualNeural'");
        expect(chamada[1]?.body).not.toContain('###');
        expect(storage.upload).toHaveBeenCalledTimes(1);
        expect(chamada[1]?.body).toContain("A fé.<break time='600ms'/>Confiar: Deus nos sustenta.</prosody>");
        expect(storage.upload.mock.calls[0][0]).toMatch(/^explicacoes\/v2\/pt-BR-MacerioMultilingualNeural\/[a-f0-9]{64}\/full.mp3$/);
    });

    it('texto longo vai em blocos que terminam no fim do parágrafo, com pausa na emenda', async () => {
        const paragrafo = (n: number) => Array.from({ length: 8 }, (_, i) => `Frase ${i} do parágrafo ${n}, com tamanho para o teste de blocos.`).join(' ');
        const resposta = await POST(pedido({ texto: [1, 2, 3, 4, 5].map(paragrafo).join('\n\n') }));
        expect(resposta.status).toBe(200);
        const corpos = vi.mocked(fetch).mock.calls.map(c => String(c[1]?.body));
        expect(corpos.length).toBeGreaterThan(1);
        // todo bloco fecha num ponto final; só o último fica sem a pausa de parágrafo
        corpos.slice(0, -1).forEach(c => expect(c).toMatch(/blocos\.<break time='600ms'\/><\/prosody>/));
        expect(corpos[corpos.length - 1]).toMatch(/blocos\.<\/prosody>/);
        expect(corpos.join('')).toContain('do parágrafo 5');
    });

    it('a mesma explicação com outra divisão de parágrafos é outro áudio', async () => {
        await POST(pedido({ texto: 'Primeira parte. Segunda parte.' }));
        await POST(pedido({ texto: 'Primeira parte.\n\nSegunda parte.' }));
        expect(storage.upload.mock.calls[0][0]).not.toBe(storage.upload.mock.calls[1][0]);
    });

    it('cacheia por conteúdo e voz sem narrar novamente', async () => {
        storage.list.mockResolvedValue({ data: [{ name: 'full.mp3' }] });
        const resposta = await POST(pedido({ texto: 'Explicação já narrada.', voz: 'pt-BR-ThalitaMultilingualNeural' }));
        const json = await resposta.json();
        expect(resposta.status).toBe(200);
        expect(json.cached).toBe(true);
        expect(json.voz).toBe('pt-BR-ThalitaMultilingualNeural');
        expect(fetch).not.toHaveBeenCalled();
        expect(storage.upload).not.toHaveBeenCalled();
    });

    it('recusa texto vazio e pedidos enormes sem consumir Azure', async () => {
        expect((await POST(pedido({ texto: '   ' }))).status).toBe(400);
        expect((await POST(pedido({ texto: 'a'.repeat(16000) }))).status).toBe(413);
        expect(fetch).not.toHaveBeenCalled();
    });

    it('não cacheia MP3 incompleto se Azure falha', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => new Response('falha', { status: 403 })));
        const resposta = await POST(pedido({ texto: 'Explicação sem sucesso.' }));
        expect(resposta.status).toBe(502);
        expect(storage.upload).not.toHaveBeenCalled();
    });
});
