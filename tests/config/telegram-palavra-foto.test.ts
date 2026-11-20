// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { carregar, renderizar, upload, download } = vi.hoisted(() => ({ carregar: vi.fn(), renderizar: vi.fn(), upload: vi.fn(), download: vi.fn() }));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ from: () => ({ select: () => ({ eq: () => ({ maybeSingle: carregar }) }) }), storage: { from: () => ({ upload, download }) } }) }));
vi.mock('@/lib/palavra-captura', () => ({ capturarPalavra: renderizar }));

const registro = { id: 269, data: '2026-11-20', mensagem: '**VIGIE AS PALAVRAS**\n\nUma palavra de exemplo.' };
const png = new Uint8Array(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jajkAAAAASUVORK5CYII=', 'base64'));
const fetchFake = vi.fn();
const url = 'https://devocional-pvc.vercel.app/api/cron/daily-push';
const requisicao = (query = '', auth = 'segredo-teste') => new Request(url + query, { headers: { authorization: `Bearer ${auth}` } });
let get: typeof import('@/app/api/cron/daily-push/route').GET;

beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-20T07:00:00Z'));
    vi.stubEnv('CRON_SECRET', 'segredo-teste');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.invalid');
    vi.stubEnv('TELEGRAM_BOT_TOKEN', 'token-falso');
    vi.stubEnv('TELEGRAM_CHAT_ID', 'destino-teste');
    vi.stubGlobal('fetch', fetchFake);
    fetchFake.mockImplementation(async () => Response.json({ ok: true, result: { message_id: 71 } }));
    carregar.mockResolvedValue({ data: registro, error: null });
    renderizar.mockResolvedValue(png);
    upload.mockReset().mockResolvedValue({ error: null });
    download.mockReset().mockResolvedValue({ data: null, error: { statusCode: '404' } });
    get = (await import('@/app/api/cron/daily-push/route')).GET;
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('Telegram da Palavra da Manhã', () => {
    it('manda um PNG pelo bot e destinatário existentes e confirma o recibo da foto', async () => {
        const resposta = await get(requisicao());
        expect(resposta.status).toBe(200);
        expect(fetchFake).toHaveBeenCalledTimes(1);
        const [endpoint, opts] = fetchFake.mock.calls[0];
        expect(endpoint).toBe('https://api.telegram.org/bottoken-falso/sendPhoto');
        expect(opts.method).toBe('POST');
        expect(opts.body.get('chat_id')).toBe('destino-teste');
        expect(new Uint8Array(await opts.body.get('photo').arrayBuffer())).toEqual(png);
        expect(renderizar).toHaveBeenCalledWith(registro);
        expect(upload).toHaveBeenCalledWith(expect.stringMatching(/^palavra-da-manha\/2026-11-20\/269-[a-f0-9]{64}\.png$/), png, expect.objectContaining({ upsert: false }));
        expect(await resposta.json()).toMatchObject({ ok: true, formato: 'foto', message_id: 71, total: 1 });
    });

    it('não grava nem envia texto quando falta o print', async () => {
        renderizar.mockRejectedValueOnce(new Error('captura falhou'));
        const resposta = await get(requisicao());
        expect(fetchFake).not.toHaveBeenCalled();
        expect(upload).not.toHaveBeenCalled();
        expect(resposta.status).toBe(503);
    });

    it('não envia foto se o artefato compartilhado não foi gravado', async () => {
        upload.mockResolvedValueOnce({ error: { message: 'falha' } });
        expect((await get(requisicao())).status).toBe(502);
        expect(fetchFake).not.toHaveBeenCalled();
    });

    it('não envia foto se o arquivo armazenado estiver truncado ou corrompido', async () => {
        download.mockResolvedValueOnce({ data: new Blob([Uint8Array.from([137, 80, 78, 71])]), error: null });
        expect((await get(requisicao())).status).toBe(502);
        expect(fetchFake).not.toHaveBeenCalled();
    });

    it('reutiliza o PNG já guardado, sem nova captura', async () => {
        download.mockResolvedValueOnce({ data: new Blob([png]), error: null });
        expect((await get(requisicao())).status).toBe(200);
        expect(renderizar).not.toHaveBeenCalled();
        expect(upload).not.toHaveBeenCalledWith(expect.stringMatching(/\.png$/), expect.anything(), expect.anything());
        expect(new Uint8Array(await fetchFake.mock.calls[0][1].body.get('photo').arrayBuffer())).toEqual(png);
    });

    it('não repete uma tentativa de Telegram quando já existe uma trava para a data', async () => {
        upload.mockImplementation(async (caminho: string) => ({ error: caminho.endsWith('/telegram.json') ? { statusCode: '409' } : null }));
        expect((await get(requisicao())).status).toBe(409);
        expect(fetchFake).not.toHaveBeenCalled();
    });

    it('não manda texto nem repete o envio quando a entrega da foto é incerta', async () => {
        fetchFake.mockRejectedValueOnce(new Error('timeout'));
        const resposta = await get(requisicao());
        expect(resposta.status).toBe(502);
        expect(fetchFake).toHaveBeenCalledTimes(1);
        expect(await resposta.json()).toMatchObject({ ok: false, formato: 'foto', total: 0 });
    });

    it('não confirma a foto sem message_id', async () => {
        fetchFake.mockResolvedValueOnce(Response.json({ ok: true, result: {} }));
        const resposta = await get(requisicao());
        expect(resposta.status).toBe(502);
        expect(await resposta.json()).toMatchObject({ ok: false, total: 0 });
    });

    it('nega a prévia sem a credencial existente do cron', async () => {
        expect((await get(requisicao('?verificar=imagem', 'errado'))).status).toBe(401);
        expect(carregar).not.toHaveBeenCalled();
        expect(renderizar).not.toHaveBeenCalled();
        expect(fetchFake).not.toHaveBeenCalled();
    });

    it('falha fechado também se o segredo do cron estiver ausente', async () => {
        vi.stubEnv('CRON_SECRET', '');
        expect((await get(requisicao())).status).toBe(401);
        expect(fetchFake).not.toHaveBeenCalled();
        expect(carregar).not.toHaveBeenCalled();
    });

    it('permite verificar o PNG da Palavra já gravada sem disparar nada', async () => {
        const resposta = await get(requisicao('?verificar=imagem'));
        expect(resposta.status).toBe(200);
        expect(resposta.headers.get('content-type')).toBe('image/png');
        expect(resposta.headers.get('cache-control')).toContain('no-store');
        expect(upload).not.toHaveBeenCalled();
        expect(new Uint8Array(await resposta.arrayBuffer())).toEqual(png);
        expect(fetchFake).not.toHaveBeenCalled();
    });

    it('não gera Palavra nem manda Telegram numa prévia sem registro', async () => {
        carregar.mockResolvedValueOnce({ data: null, error: null });
        expect((await get(requisicao('?verificar=imagem'))).status).toBe(404);
        expect(renderizar).not.toHaveBeenCalled();
        expect(fetchFake).not.toHaveBeenCalled();
    });

    it('a rotina ainda gera pelo mesmo modo se faltar o texto e só depois tira o print', async () => {
        carregar.mockResolvedValueOnce({ data: null, error: null });
        fetchFake.mockResolvedValueOnce(Response.json({ ok: true }));
        expect((await get(requisicao())).status).toBe(200);
        const [endpoint, opts] = fetchFake.mock.calls[0];
        expect(endpoint).toBe('https://example.invalid/functions/v1/execute');
        expect(JSON.parse(opts.body)).toEqual({ modo_id: 'modo_palavra_manha', data: registro.data });
        expect(fetchFake.mock.calls[1][0]).toMatch(/\/sendPhoto$/);
        expect(renderizar).toHaveBeenCalledWith(registro);
    });
});
