'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Check, Copy, RefreshCw, RotateCcw, Share2, Shuffle } from 'lucide-react';
import { BotaoAcao } from '@/components/transcricao/BotaoAcao';
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

    const dataBruta = new Date().toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' });
    const dataCurta = dataBruta.charAt(0).toUpperCase() + dataBruta.slice(1); // "Sáb., 26 de set."

    return (
        <div className="w-full max-w-2xl mx-auto mt-8">
            <section
                aria-labelledby="titulo-versiculo-do-dia"
                className="relative overflow-hidden rounded-3xl border border-amber-500/20 bg-surface-1 shadow-sm"
            >
                <div className="h-1 bg-linear-to-r from-amber-300 via-amber-500 to-orange-500" aria-hidden="true" />
                <div className="p-6 md:p-8">
                    <div className="flex items-center justify-between gap-3">
                        <h2 id="titulo-versiculo-do-dia" className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-400">
                            <BookOpen className="h-4 w-4" aria-hidden="true" />
                            {doDia ? 'Versículo do dia' : 'Outro versículo'}
                        </h2>
                        {doDia && <span className="text-xs text-text-muted">{dataCurta}</span>}
                    </div>

                    <figure className="relative mt-8">
                        <span className="reading-serif pointer-events-none absolute -left-1 -top-7 select-none text-7xl leading-none text-amber-500/20" aria-hidden="true">“</span>
                        {carregando ? (
                            <div className="space-y-3 pt-1" role="status" aria-label="Carregando o versículo">
                                <div className="h-5 w-full animate-pulse rounded-lg bg-surface-2" />
                                <div className="h-5 w-11/12 animate-pulse rounded-lg bg-surface-2" />
                                <div className="h-5 w-2/3 animate-pulse rounded-lg bg-surface-2" />
                            </div>
                        ) : texto ? (
                            <blockquote className="reading-serif relative text-[21px] leading-[1.55] text-text-primary md:text-2xl">
                                {texto}
                            </blockquote>
                        ) : (
                            <p className="relative text-sm leading-relaxed text-text-secondary">
                                Não deu para carregar o texto agora. Verifique a internet ou abra direto na Bíblia.
                            </p>
                        )}
                        <figcaption className="mt-4 flex items-center gap-2 text-sm font-bold text-amber-700 dark:text-amber-400">
                            {ref}
                            <span className="rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold tracking-wider" title="Nova Tradução na Linguagem de Hoje">
                                {VERSAO_VERSICULO_DO_DIA}
                            </span>
                        </figcaption>
                    </figure>

                    <div className="mt-6 grid grid-cols-3 gap-2">
                        <BotaoAcao
                            icone={copiado ? Check : Copy}
                            rotulo={copiado ? 'Copiado' : 'Copiar'}
                            variante={copiado ? 'feito' : 'padrao'}
                            onClick={copiar}
                            disabled={!texto}
                        />
                        <BotaoAcao icone={Share2} rotulo="Compartilhar" onClick={compartilhar} disabled={!texto} />
                        <BotaoAcao icone={BookOpen} rotulo="Ler na Bíblia" onClick={lerNaBiblia} />
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
                        {falhou && (
                            <button type="button" onClick={tentarDeNovo} className="inline-flex min-h-[40px] items-center gap-1.5 px-2 text-sm font-semibold text-amber-700 dark:text-amber-400">
                                <RefreshCw className="h-4 w-4" aria-hidden="true" /> Tentar de novo
                            </button>
                        )}
                        {doDia ? (
                            <button type="button" onClick={sortear} disabled={carregando} className="inline-flex min-h-[40px] items-center gap-1.5 px-2 text-sm font-semibold text-text-muted transition-colors hover:text-text-primary disabled:opacity-50">
                                <Shuffle className="h-4 w-4" aria-hidden="true" /> Outro versículo
                            </button>
                        ) : (
                            <button type="button" onClick={voltarAoDeHoje} className="inline-flex min-h-[40px] items-center gap-1.5 px-2 text-sm font-semibold text-text-muted transition-colors hover:text-text-primary">
                                <RotateCcw className="h-4 w-4" aria-hidden="true" /> Voltar ao versículo de hoje
                            </button>
                        )}
                    </div>
                    <p className="sr-only" aria-live="polite">{aviso}</p>
                    {aviso && <p className="mt-2 text-center text-xs font-medium text-emerald-700 dark:text-emerald-300" aria-hidden="true">{aviso}</p>}
                </div>
            </section>
        </div>
    );
}
