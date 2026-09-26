'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { compartilharTexto, copiarTexto, enviarArquivoTxt } from '@/lib/transcricao-acoes';
import { montarTextoCompartilhado, textoParaCopiar } from '@/lib/transcricao-apresentacao';

export type TipoAviso = 'success' | 'error' | 'info';
export type Avisar = (tipo: TipoAviso, mensagem: string) => void;

// Copiar, Compartilhar e Arquivo de uma transcrição, com retorno visível.
export function useAcoesTranscricao({ titulo, texto, fonteUrl, avisar }: {
    titulo: string;
    texto: string;
    fonteUrl?: string | null;
    avisar?: Avisar;
}) {
    const [copiado, setCopiado] = useState(false);
    const temporizador = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    useEffect(() => () => clearTimeout(temporizador.current), []);

    const copiar = useCallback(async () => {
        const ok = await copiarTexto(textoParaCopiar(texto));
        if (!ok) {
            avisar?.('error', 'Não consegui copiar. Toque e segure no texto para copiar.');
            return;
        }
        setCopiado(true);
        clearTimeout(temporizador.current);
        temporizador.current = setTimeout(() => setCopiado(false), 2000);
    }, [texto, avisar]);

    const compartilhar = useCallback(async () => {
        const resultado = await compartilharTexto({ titulo, texto: montarTextoCompartilhado({ titulo, texto, fonteUrl }) });
        if (resultado === 'copiado') avisar?.('info', 'Texto copiado. Agora é só colar no WhatsApp ou onde quiser.');
        else if (resultado === 'erro') avisar?.('error', 'Não consegui compartilhar. Tente Copiar.');
    }, [titulo, texto, fonteUrl, avisar]);

    const enviarArquivo = useCallback(async () => {
        const resultado = await enviarArquivoTxt({ titulo, conteudo: montarTextoCompartilhado({ titulo, texto, fonteUrl }) });
        if (resultado === 'baixado') avisar?.('success', 'Arquivo de texto baixado.');
        else if (resultado === 'erro') avisar?.('error', 'Não consegui gerar o arquivo.');
    }, [titulo, texto, fonteUrl, avisar]);

    return { copiado, copiar, compartilhar, enviarArquivo };
}
