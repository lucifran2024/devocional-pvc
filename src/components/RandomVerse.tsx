'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Check, Copy, RefreshCw, RotateCcw, Share, Shuffle } from 'lucide-react';
import { BotaoIcone, PilulaAcao } from '@/components/ui/BotaoIcone';
import { useVersiculoDoDia } from '@/hooks/useVersiculoDoDia';
import { persistBibliaPosicao } from '@/lib/biblia-posicao';
import { VERSAO_VERSICULO_DO_DIA, montarTextoVersiculo, posicaoNaBiblia } from '@/lib/daily-verse';
import { compartilharTexto, copiarTexto } from '@/lib/transcricao-acoes';

// Cartão do Versículo do Dia (início). O nome do componente ficou por
// compatibilidade; o versículo agora é o do dia e o sorteio é opcional.
export function RandomVerse() {
    const router = useRouter();
    const { ref, texto, carregando, falhou, doDia, sortear, voltarAoDeHoje, tentarDeNovo } = useVersiculoDoDia();
    const [aviso, setAviso] = useState('');
    const [copiado, setCopiado] = useState(false);
    const temporizador = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    useEffect(() => () => clearTimeout(temporizador.current), []);

    const avisar = (mensagem: string) => {
        setAviso(mensagem);
        clearTimeout(temporizador.current);
        temporizador.current = setTimeout(() => { setAviso(''); setCopiado(false); }, 2500);
    };

    const copiar = async () => {
        if (!texto) return;
        if (await copiarTexto(montarTextoVersiculo({ ref, texto, doDia }))) {
            setCopiado(true);
            avisar('Versículo copiado.');
        } else {
            avisar('Não consegui copiar. Toque e segure no texto.');
        }
    };

    const compartilhar = async () => {
        if (!texto) return;
        const resultado = await compartilharTexto({ titulo: `${ref} (${VERSAO_VERSICULO_DO_DIA})`, texto: montarTextoVersiculo({ ref, texto, doDia }) });
        if (resultado === 'copiado') avisar('Versículo copiado. Agora é só colar no WhatsApp.');
        else if (resultado === 'erro') avisar('Não consegui compartilhar. Tente Copiar.');
    };

    // Abre a Bíblia do app no capítulo, já no versículo
    const lerNaBiblia = () => {
        const posicao = posicaoNaBiblia(ref);
        if (posicao) persistBibliaPosicao(posicao);
        router.push('/biblioteca');
    };

    // Início premium (12/11/2026): mesmo cartão e mesmo cabeçalho da Palavra da
    // Manhã. Saíram a faixa em degradê e as aspas gigantes (restos de "cara de
    // IA" que escaparam em 03/10) e a data, que já aparece no topo do início.
    // 2º ajuste: nome pequeno e âmbar, sem o ícone em quadradinho; botões
    // compactos na mesma fileira da Palavra.
    return (
        <section aria-labelledby="titulo-versiculo-do-dia" className="cartao p-5 md:p-7">
            <header>
                {/* Cor no <span>: a regra global de h1–h6 vence classe no título */}
                <h2 id="titulo-versiculo-do-dia" className="text-[15px] font-semibold">
                    <span className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                        <BookOpen className="h-4 w-4 shrink-0" aria-hidden="true" />
                        {doDia ? 'Versículo do dia' : 'Outro versículo'}
                    </span>
                </h2>
            </header>

            <figure className="mt-5">
                {carregando ? (
                    <div className="space-y-3 pt-1" role="status" aria-label="Carregando o versículo">
                        <div className="h-5 w-full animate-pulse rounded-lg bg-surface-2" />
                        <div className="h-5 w-11/12 animate-pulse rounded-lg bg-surface-2" />
                        <div className="h-5 w-2/3 animate-pulse rounded-lg bg-surface-2" />
                    </div>
                ) : texto ? (
                    <blockquote className="reading-serif text-[21px] leading-[1.55] text-text-primary md:text-2xl">
                        {texto}
                    </blockquote>
                ) : (
                    <p className="text-sm leading-relaxed text-text-secondary">
                        Não deu para carregar o texto agora. Verifique a internet ou abra direto na Bíblia.
                    </p>
                )}
                <figcaption className="mt-4 flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-400">
                    {ref}
                    <span className="text-xs font-medium tracking-wide text-text-muted" title="Nova Tradução na Linguagem de Hoje">
                        {VERSAO_VERSICULO_DO_DIA}
                    </span>
                </figcaption>
            </figure>

            {/* Mesma fileira compacta da Palavra da Manhã */}
            <div className="mt-6 flex items-center justify-between gap-2 border-t border-border-subtle pt-3">
                <PilulaAcao onClick={lerNaBiblia}>
                    <BookOpen className="h-[18px] w-[18px]" aria-hidden="true" />
                    Ler na Bíblia
                </PilulaAcao>
                <div className="flex items-center gap-1">
                    <BotaoIcone rotulo={copiado ? 'Copiado' : 'Copiar'} onClick={copiar} feito={copiado} disabled={!texto}>
                        {copiado
                            ? <Check className="h-5 w-5 animate-[surgir_0.25s_ease-out]" aria-hidden="true" />
                            : <Copy className="h-5 w-5" aria-hidden="true" />}
                    </BotaoIcone>
                    <BotaoIcone rotulo="Compartilhar" onClick={compartilhar} disabled={!texto}>
                        <Share className="h-5 w-5" aria-hidden="true" />
                    </BotaoIcone>
                </div>
            </div>

            {/* Sorteio e retorno, discretos, embaixo da fileira */}
            <div className="-ml-3 mt-1 flex flex-wrap items-center gap-x-1">
                {falhou && (
                    <button type="button" onClick={tentarDeNovo} className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold text-amber-700 dark:text-amber-400">
                        <RefreshCw className="h-4 w-4" aria-hidden="true" /> Tentar de novo
                    </button>
                )}
                {doDia ? (
                    <button type="button" onClick={sortear} disabled={carregando} className="group inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold text-text-muted transition-colors hover:text-text-primary disabled:opacity-50">
                        <Shuffle className="h-4 w-4 transition-transform duration-300 group-active:rotate-180" aria-hidden="true" /> Outro versículo
                    </button>
                ) : (
                    <button type="button" onClick={voltarAoDeHoje} className="group inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold text-text-muted transition-colors hover:text-text-primary">
                        <RotateCcw className="h-4 w-4 transition-transform duration-300 group-active:-rotate-90" aria-hidden="true" /> Voltar ao versículo de hoje
                    </button>
                )}
            </div>
            <p className="sr-only" aria-live="polite">{aviso}</p>
            {aviso && <p className="mt-1 text-[13px] font-medium text-emerald-700 dark:text-emerald-300" aria-hidden="true">{aviso}</p>}
        </section>
    );
}
