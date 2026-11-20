// @vitest-environment node
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';

const { buscar, download, upload } = vi.hoisted(() => ({ buscar: vi.fn(), download: vi.fn(), upload: vi.fn() }));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: buscar }) }) }),
    storage: { from: () => ({ download, upload }) },
}) }));

const registro = { id: 269, data: '2026-11-20', mensagem: 'Palavra real para teste.' };
const png = new Uint8Array(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jajkAAAAASUVORK5CYII=', 'base64'));
let get: typeof import('@/app/api/palavra-da-manha/print/route').GET;

beforeEach(async () => {
    vi.resetModules(); vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-20T07:00:00Z'));
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.invalid');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'segredo-falso');
    buscar.mockResolvedValue({ data: registro, error: null });
    download.mockResolvedValue({ data: new Blob([png]), error: null });
    get = (await import('@/app/api/palavra-da-manha/print/route')).GET;
});
afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); });

describe('leitura da mesma foto para o Status', () => {
    const pedido = (data = '2026-11-20') => new Request(`https://example.invalid/api/palavra-da-manha/print?data=${data}`);

    it('devolve os bytes idênticos do print salvo, sem renderizar, gravar ou gerar conteúdo', async () => {
        const res = await get(pedido());
        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toBe('image/png');
        expect(res.headers.get('x-pvc-palavra-data')).toBe('2026-11-20');
        expect(res.headers.get('cache-control')).toContain('no-store');
        expect(new Uint8Array(await res.arrayBuffer())).toEqual(png);
        expect(download).toHaveBeenCalledWith(expect.stringMatching(/^palavra-da-manha\/2026-11-20\/269-[a-f0-9]{64}\.png$/));
        expect(upload).not.toHaveBeenCalled();
    });

    it('rejeita data de ontem e data inválida sem consultar o banco', async () => {
        expect((await get(pedido('2026-11-19'))).status).toBe(404);
        expect((await get(pedido('20-11-2026'))).status).toBe(404);
        expect(buscar).not.toHaveBeenCalled();
    });

    it('não cria Palavra nem imagem se o registro ou o print do dia não existir', async () => {
        buscar.mockResolvedValueOnce({ data: null, error: null });
        expect((await get(pedido())).status).toBe(404);
        download.mockResolvedValueOnce({ data: null, error: { message: 'not found' } });
        expect((await get(pedido())).status).toBe(404);
        expect(upload).not.toHaveBeenCalled();
    });

    it('não libera um arquivo armazenado danificado', async () => {
        download.mockResolvedValueOnce({ data: new Blob(['isto não é um png']), error: null });
        expect((await get(pedido())).status).toBe(502);
    });
});
