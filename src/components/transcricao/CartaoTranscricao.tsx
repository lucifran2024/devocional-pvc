'use client';

import { useMemo } from 'react';
import { ChevronRight } from 'lucide-react';
import type { Transcricao } from '@/lib/transcricoes';
import {
    contarPalavras,
    descreverPalavras,
    formatarDataTranscricao,
    resumoTranscricao,
} from '@/lib/transcricao-apresentacao';
import { MiniaturaVideo } from './MiniaturaVideo';

// Cartão de uma transcrição salva: capa, título, data, tamanho e começo do texto.
export function CartaoTranscricao({ transcricao, destaque = false, onAbrir }: {
    transcricao: Transcricao;
    destaque?: boolean;
    onAbrir: () => void;
}) {
    const titulo = transcricao.titulo?.trim() || 'Sem título';
    const { palavras, resumo } = useMemo(() => ({
        palavras: contarPalavras(transcricao.texto),
        resumo: resumoTranscricao(transcricao.texto, 120),
    }), [transcricao.texto]);
    const detalhes = [formatarDataTranscricao(transcricao.created_at), descreverPalavras(palavras)].filter(Boolean).join(' · ');

    return (
        <button
            type="button"
            onClick={onAbrir}
            aria-label={`Abrir ${titulo}`}
            className={`group flex w-full items-center gap-3 rounded-2xl border bg-surface-1 p-3 text-left transition hover:border-amber-500/40 active:scale-[0.99]
                ${destaque ? 'border-amber-500/60 ring-2 ring-amber-500/25' : 'border-border-subtle'}`}
        >
            <MiniaturaVideo fonteUrl={transcricao.fonte_url} className="aspect-video w-28 shrink-0 sm:w-36" />
            <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="reading-serif line-clamp-2 font-semibold leading-snug text-text-primary">{titulo}</span>
                <span className="text-xs text-text-muted">
                    {destaque && <span className="font-bold text-amber-700 dark:text-amber-300">Salva agora · </span>}
                    {detalhes}
                </span>
                {resumo && <span className="line-clamp-2 text-xs leading-relaxed text-text-secondary">{resumo}</span>}
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-text-muted transition group-hover:translate-x-0.5 group-hover:text-amber-500" aria-hidden="true" />
        </button>
    );
}
