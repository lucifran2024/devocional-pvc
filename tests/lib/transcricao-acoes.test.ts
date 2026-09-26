import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { compartilharTexto, copiarTexto, enviarArquivoTxt } from '../../src/lib/transcricao-acoes';

function definirNavigator(nome: string, valor: unknown) {
    Object.defineProperty(navigator, nome, { value: valor, configurable: true, writable: true });
}

let writeText: ReturnType<typeof vi.fn>;

beforeEach(() => {
    writeText = vi.fn().mockResolvedValue(undefined);
    definirNavigator('clipboard', { writeText });
});

afterEach(() => {
    delete (navigator as unknown as Record<string, unknown>).share;
    delete (navigator as unknown as Record<string, unknown>).canShare;
});

describe('copiarTexto', () => {
    it('usa a área de transferência do aparelho', async () => {
        expect(await copiarTexto('Deus é fiel.')).toBe(true);
        expect(writeText).toHaveBeenCalledWith('Deus é fiel.');
    });
});

describe('compartilharTexto', () => {
    it('abre o compartilhar do aparelho com título e texto', async () => {
        const share = vi.fn().mockResolvedValue(undefined);
        definirNavigator('share', share);
        expect(await compartilharTexto({ titulo: 'Culto', texto: 'Texto' })).toBe('compartilhado');
        expect(share).toHaveBeenCalledWith({ title: 'Culto', text: 'Texto' });
        expect(writeText).not.toHaveBeenCalled();
    });

    it('se a pessoa cancelar, não copia nada', async () => {
        definirNavigator('share', vi.fn().mockRejectedValue(Object.assign(new Error('cancelou'), { name: 'AbortError' })));
        expect(await compartilharTexto({ titulo: 'Culto', texto: 'Texto' })).toBe('cancelado');
        expect(writeText).not.toHaveBeenCalled();
    });

    it('sem compartilhar no aparelho, copia o texto', async () => {
        expect(await compartilharTexto({ titulo: 'Culto', texto: 'Texto' })).toBe('copiado');
        expect(writeText).toHaveBeenCalledWith('Texto');
    });

    it('se o compartilhar falhar, copia o texto', async () => {
        definirNavigator('share', vi.fn().mockRejectedValue(Object.assign(new Error('bloqueado'), { name: 'NotAllowedError' })));
        expect(await compartilharTexto({ titulo: 'Culto', texto: 'Texto' })).toBe('copiado');
    });
});

describe('enviarArquivoTxt', () => {
    it('envia como arquivo .txt pelo compartilhar do aparelho', async () => {
        const share = vi.fn().mockResolvedValue(undefined);
        definirNavigator('share', share);
        definirNavigator('canShare', vi.fn().mockReturnValue(true));
        expect(await enviarArquivoTxt({ titulo: 'Culto: domingo', conteudo: 'Texto' })).toBe('compartilhado');
        const arquivo = share.mock.calls[0][0].files[0] as File;
        expect(arquivo.name).toBe('Culto domingo.txt');
        expect(arquivo.type).toBe('text/plain');
    });

    it('sem compartilhar arquivos, baixa o .txt', async () => {
        const criar = vi.fn().mockReturnValue('blob:teste');
        Object.assign(URL, { createObjectURL: criar, revokeObjectURL: vi.fn() });
        const clique = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
        expect(await enviarArquivoTxt({ titulo: 'Culto', conteudo: 'Texto' })).toBe('baixado');
        expect(criar).toHaveBeenCalled();
        expect(clique).toHaveBeenCalled();
        clique.mockRestore();
    });
});
