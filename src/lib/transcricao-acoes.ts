import { nomeArquivoTxt } from '@/lib/transcricao-apresentacao';

// ===========================================
// TRANSCRIÇÕES — copiar, compartilhar e enviar como arquivo .txt.
// Usa o compartilhamento do próprio aparelho (WhatsApp, Notas, Mensagens…);
// sem ele, copia o texto ou baixa o arquivo.
// ===========================================

export type ResultadoCompartilhar = 'compartilhado' | 'copiado' | 'cancelado' | 'erro';
export type ResultadoArquivo = 'compartilhado' | 'baixado' | 'cancelado' | 'erro';

function foiCancelado(e: unknown): boolean {
    return typeof e === 'object' && e !== null && (e as { name?: unknown }).name === 'AbortError';
}

function copiarPorSelecao(texto: string): boolean {
    if (typeof document === 'undefined') return false;
    const campo = document.createElement('textarea');
    campo.value = texto;
    campo.setAttribute('readonly', '');
    campo.style.position = 'fixed';
    campo.style.opacity = '0';
    document.body.appendChild(campo);
    campo.select();
    let ok = false;
    try {
        ok = document.execCommand('copy');
    } catch {
        ok = false;
    }
    campo.remove();
    return ok;
}

export async function copiarTexto(texto: string): Promise<boolean> {
    try {
        if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(texto);
            return true;
        }
    } catch {
        // cai para a cópia por seleção
    }
    return copiarPorSelecao(texto);
}

export async function compartilharTexto({ titulo, texto }: { titulo: string; texto: string }): Promise<ResultadoCompartilhar> {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        try {
            await navigator.share({ title: titulo, text: texto });
            return 'compartilhado';
        } catch (e) {
            if (foiCancelado(e)) return 'cancelado';
            // compartilhamento recusado: copia para a pessoa colar onde quiser
        }
    }
    return (await copiarTexto(texto)) ? 'copiado' : 'erro';
}

export async function enviarArquivoTxt({ titulo, conteudo }: { titulo: string; conteudo: string }): Promise<ResultadoArquivo> {
    const nome = nomeArquivoTxt(titulo);
    try {
        if (typeof navigator !== 'undefined' && typeof navigator.share === 'function' && typeof navigator.canShare === 'function' && typeof File !== 'undefined') {
            const arquivo = new File([conteudo], nome, { type: 'text/plain' });
            if (navigator.canShare({ files: [arquivo] })) {
                try {
                    // Só o arquivo: alguns iPhones recusam arquivo junto com título/texto.
                    await navigator.share({ files: [arquivo] });
                    return 'compartilhado';
                } catch (e) {
                    if (foiCancelado(e)) return 'cancelado';
                }
            }
        }
        const url = URL.createObjectURL(new Blob([conteudo], { type: 'text/plain;charset=utf-8' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = nome;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        return 'baixado';
    } catch {
        return 'erro';
    }
}
