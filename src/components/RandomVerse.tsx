'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Check, Copy, RefreshCw, RotateCcw, Share, Shuffle } from 'lucide-react';
import { BotaoIcone, PilulaAcao } from '@/components/ui/BotaoIcone';
import { useVersiculoDoDia } from '@/hooks/useVersiculoDoDia';
import { BIBLIA_DESTACAR_PARAM, persistBibliaPosicao } from '@/lib/biblia-posicao';
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

    // Abre a Bíblia do app no capítulo, já no versículo, e o realça ao chegar
    // (3º ajuste, 12/11/2026: "vai direto para a Bíblia, né?")
    const lerNaBiblia = () => {
        const posicao = posicaoNaBiblia(ref);
        if (posicao) persistBibliaPosicao(posicao);
        router.push(posicao ? `/biblioteca?${BIBLIA_DESTACAR_PARAM}=1` : '/biblioteca');
    };

    // 14/11/2026 ("preto, papel e ouro"): o Versículo do dia é um pedaço de
    // página impressa. O bloco inverte o fundo (papel sobre o preto, tinta
    // sobre o papel) e o texto é montado como na Bíblia de papel: o número do
    // capítulo grande e o do versículo pequeno. A referência por extenso
    // continua embaixo. Botões nas cores do próprio bloco.
    const partes = partesDaReferencia(ref);
    return (
        <section aria-labelledby="titulo-versiculo-do-dia" className="campo p-5 md:p-7">
            <header className="flex items-baseline justify-between gap-3">
                {/* Cor no <span>: a regra global de h1–h6 vence classe no título */}
                <h2 id="titulo-versiculo-do-dia" className="text-sm font-semibold">
                    <span className="text-campo-suave">{doDia ? 'Versículo do dia' : 'Outro versículo'}</span>
                </h2>
                <span className="text-sm font-medium text-campo-suave" title="Nova Tradução na Linguagem de Hoje">
                    {VERSAO_VERSICULO_DO_DIA}
                </span>
            </header>

            <figure className="mt-4">
                {carregando ? (
                    <div className="space-y-3 pt-1" role="status" aria-label="Carregando o versículo">
                        <div className="h-5 w-full animate-pulse rounded-lg bg-campo-toque" />
                        <div className="h-5 w-11/12 animate-pulse rounded-lg bg-campo-toque" />
                        <div className="h-5 w-2/3 animate-pulse rounded-lg bg-campo-toque" />
                    </div>
                ) : texto ? (
                    <blockquote className="reading-serif flow-root text-[1.25rem] leading-[1.5] text-campo-texto md:text-[1.5rem]">
                        {partes && <span className="capitulo-impresso" aria-hidden="true">{partes.capitulo}</span>}
                        {partes && <span className="versiculo-impresso" aria-hidden="true">{partes.versiculo}</span>}
                        <span>{texto}</span>
                    </blockquote>
                ) : (
                    <p className="text-sm leading-relaxed text-campo-suave">
                        Não deu para carregar o texto agora. Verifique a internet ou abra direto na Bíblia.
                    </p>
                )}
                <figcaption className="mt-4 text-sm font-semibold text-campo-texto">{ref}</figcaption>
            </figure>

            {/* A ação do bloco em pílula cheia; Copiar e Compartilhar só com ícone */}
            <div className="-mr-2.5 mt-5 flex items-center justify-between gap-2">
                <PilulaAcao onClick={lerNaBiblia} noCampo>
                    <BookOpen className="h-[18px] w-[18px]" aria-hidden="true" />
                    Ler na Bíblia
                </PilulaAcao>
                <div className="flex items-center gap-1">
                    <BotaoIcone rotulo={copiado ? 'Copiado' : 'Copiar'} onClick={copiar} disabled={!texto} noCampo>
                        {copiado
                            ? <Check className="h-5 w-5 animate-[surgir_0.25s_ease-out]" aria-hidden="true" />
                            : <Copy className="h-5 w-5" aria-hidden="true" />}
                    </BotaoIcone>
                    <BotaoIcone rotulo="Compartilhar" onClick={compartilhar} disabled={!texto} noCampo>
                        <Share className="h-5 w-5" aria-hidden="true" />
                    </BotaoIcone>
                </div>
            </div>

            {/* Sorteio e retorno, discretos, embaixo da fileira */}
            <div className="-ml-3 mt-1 flex flex-wrap items-center gap-x-1">
                {falhou && (
                    <button type="button" onClick={tentarDeNovo} className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-campo-texto">
                        <RefreshCw className="h-4 w-4" aria-hidden="true" /> Tentar de novo
                    </button>
                )}
                {doDia ? (
                    <button type="button" onClick={sortear} disabled={carregando} className="group inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-campo-suave transition-colors hover:text-campo-texto disabled:opacity-50">
                        <Shuffle className="h-4 w-4 transition-transform duration-300 group-active:rotate-180" aria-hidden="true" /> Outro versículo
                    </button>
                ) : (
                    <button type="button" onClick={voltarAoDeHoje} className="group inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-campo-suave transition-colors hover:text-campo-texto">
                        <RotateCcw className="h-4 w-4 transition-transform duration-300 group-active:-rotate-90" aria-hidden="true" /> Voltar ao versículo de hoje
                    </button>
                )}
            </div>
            <p className="sr-only" aria-live="polite">{aviso}</p>
            {aviso && <p className="mt-1 text-sm font-semibold text-campo-texto" aria-hidden="true">{aviso}</p>}
        </section>
    );
}

// "João 3:17" → capítulo 3, versículo 17; "1 Coríntios 13:4-7" → 13 e 4-7.
// Referência fora desse formato não ganha os números impressos.
export function partesDaReferencia(ref: string): { capitulo: string; versiculo: string } | null {
    const m = ref.match(/\s(\d{1,3}):(\d{1,3}(?:[-–]\d{1,3})?)$/);
    return m ? { capitulo: m[1], versiculo: m[2] } : null;
}
