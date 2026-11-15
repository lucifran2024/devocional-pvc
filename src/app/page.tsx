'use client';

import { useState, useEffect, type CSSProperties } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { getPayloadDoDia, getDataHoje, type PayloadDoDia } from '@/lib/supabase';
import { loadBibliaPosicao, type BibliaPosicao } from '@/lib/biblia-posicao';
import { dividirPassagens, saudacao } from '@/lib/palavra-apresentacao';
import { CosmicBackground } from '@/components/ui/CosmicBackground';
import { PalavraManha } from '@/components/PalavraManha';
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { MarcaBiblia } from '@/components/ui/MarcaBiblia';
import { RandomVerse } from '@/components/RandomVerse';

// ===============================================
// PÁGINA INICIAL
//
// "Preto, papel e ouro" (14/11/2026, pedido "reformular tudo… premium…
// cor, layout, design, botão, fonte, organização"). Os cinco ajustes de
// 12/11 mexeram em detalhe e deixaram a mesma pilha de caixas com linha
// fina. Agora a tela é feita de blocos de cor, não de caixas:
//   1. topo numa faixa só: a marca do app, a saudação do horário com a
//      data embaixo e o tema;
//   2. Hoje: Continuar (bloco invertido, com a fita marcadora do ícone) e a
//      leitura de hoje;
//   3. a Palavra da Manhã direto na página, sem caixa, com manchete grande;
//   4. o Versículo do dia como página impressa (bloco invertido).
// 2ª rodada do mesmo dia («melhorar essa lista de estudar/transcrever ou
// tirar elas da página inicial e deixar só no Mais»): as duas listas de
// ferramentas saíram. O início é só o dia; Plano, Caderno, Oração e as
// transcrições ficam no Mais (em dois grupos) e na barra, a um toque.
// Continua valendo: a data aparece uma vez; Sair fica no Mais e na barra
// lateral; sem foto no topo (27/09); sem degradê, brilho ou ícone gigante
// (03/10); topo baixo para a Palavra aparecer logo.
// ===============================================

const PAYLOAD_LOCAL_KEY = 'payload-dia-local';

function lerPayloadLocal(): PayloadDoDia | null {
  try {
    const raw = localStorage.getItem(PAYLOAD_LOCAL_KEY);
    return raw ? (JSON.parse(raw) as PayloadDoDia) : null;
  } catch {
    return null;
  }
}

// Uma palavra só não quebra: num quadro de meia tela (122 px de texto num
// celular de 360 px), "Tessalonicenses" (15 letras, a maior da Bíblia) vazava.
// A letra segue a palavra mais longa; hífen e quebra forçada ficam de reserva.
function maiorPalavra(...textos: string[]): number {
  return Math.max(0, ...textos.flatMap((t) => t.split(/\s+/)).map((p) => p.length));
}

// Depois do 3º ajuste ("não tá muito grande os dois?"): 26 → 20 px no
// nome comum. 5º ajuste ("ainda ficou desproporcional"): os dois quadros são
// irmãos e usam a mesma letra, 18 px — o nome do livro de um lado e as
// passagens do outro. A palavra mais longa dos dois decide; os passos menores
// continuam garantindo que nada vaza.
function tamanhoDosQuadros(...textos: string[]): string {
  const n = maiorPalavra(...textos);
  if (n <= 11) return 'text-[1.125rem]';
  if (n <= 13) return 'text-[1rem]';
  return 'text-[0.9375rem]';
}

const QUEBRA_SEGURA = 'hyphens-auto [overflow-wrap:anywhere]';

// Uma passagem por linha no quadro da leitura, sem quebrar no meio dos
// números ("33-" numa linha e "36" na outra, visto num celular de 360 px)
function Passagem({ texto, tamanho }: { texto: string; tamanho: string }) {
  const partes = texto.match(/^(.*\S)\s+(\d[\d:.,–-]*)$/);
  return (
    <span data-passagem className={`reading-serif block ${tamanho} font-medium leading-tight text-text-primary ${QUEBRA_SEGURA}`}>
      {partes ? <>{partes[1]} <span className="whitespace-nowrap">{partes[2]}</span></> : texto}
    </span>
  );
}

// Ordem da chegada ao abrir (classe .entrada em globals.css)
const ordem = (i: number) => ({ '--i': i }) as CSSProperties;

function formatarDataCurta(dataStr: string): string {
  const texto = new Date(dataStr + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export default function DashboardPage() {
  const [payload, setPayload] = useState<PayloadDoDia | null>(null);
  const [continuar, setContinuar] = useState<BibliaPosicao | null>(null);
  const dataHoje = getDataHoje();
  // A tela só é desenhada no aparelho (depois de conferir o login), então a
  // hora é a de quem abre, sem risco de divergir do servidor.
  const cumprimento = saudacao(new Date().getHours());
  const passagens = dividirPassagens(payload?.passagem_do_dia);
  // O quadro da Bíblia diz onde abre (3º ajuste: "vai direto para a Bíblia, né?")
  const versiculoGuardado = continuar?.versiculo && continuar.versiculo > 1 ? continuar.versiculo : null;
  // Uma letra só para os dois quadros, pela palavra mais longa (ver maiorPalavra)
  const tamanhoQuadro = tamanhoDosQuadros(continuar?.livroNome ?? '', ...passagens);
  const rotuloBiblia = continuar
    ? `Continuar em ${continuar.livroNome} ${continuar.capitulo}${versiculoGuardado ? `, versículo ${versiculoGuardado}` : ''}, na Bíblia`
    : 'Abrir minha Bíblia';

  // ABERTURA RÁPIDA (25/09/2026): a tela aparece na hora. O payload do dia só
  // dá nome à passagem de hoje, então é buscado em segundo plano (antes a
  // página inteira esperava baixar o SECAO6.TXT, até 8 s).
  useEffect(() => {
    let ativo = true;
    const local = lerPayloadLocal();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- leitura síncrona de localStorage na montagem (hydration-safe)
    setContinuar(loadBibliaPosicao());
    if (local?.data === dataHoje) setPayload(local);

    getPayloadDoDia(dataHoje)
      .then((res) => {
        if (!ativo) return;
        if (res.error || !res.data) throw new Error(res.error || 'Payload vazio');
        setPayload(res.data);
        // Guarda o último payload para o início abrir offline
        try { localStorage.setItem(PAYLOAD_LOCAL_KEY, JSON.stringify(res.data)); } catch { /* ignore */ }
      })
      .catch((e) => {
        console.error(e);
        // Offline/erro: usa o último payload salvo no aparelho
        if (ativo && local) setPayload((atual) => atual ?? local);
      });

    return () => { ativo = false; };
  }, [dataHoje]);

  return (
    <CosmicBackground className="flex flex-col min-h-screen selection:bg-amber-500/30">
      <main className="mx-auto flex w-full max-w-3xl flex-col px-5 pb-12 pt-[max(1rem,calc(env(safe-area-inset-top)_+_0.5rem))] md:pt-10">

        {/* 1. Topo numa faixa só: a marca do app, a saudação do horário (o
            título da tela) com a data embaixo, uma vez só, e o tema à
            direita, sem caixa. Baixo de propósito: a Palavra aparece logo. */}
        <header className="entrada flex items-center justify-between gap-3" style={ordem(0)}>
          <div className="flex min-w-0 items-center gap-3">
            <MarcaBiblia className="h-11 w-11 shrink-0" />
            <div className="min-w-0">
              <h1 className="reading-serif text-[1.5rem] font-medium leading-[1.15] tracking-[-0.015em]">{cumprimento}.</h1>
              <p className="text-sm leading-5 text-text-muted">{formatarDataCurta(dataHoje)}</p>
            </div>
          </div>
          <div className="-mr-2.5 shrink-0">
            <ThemeToggle discreto />
          </div>
        </header>

        {/* 2. Hoje: dois quadros lado a lado, baixos (o topo continua curto).
            Continuar é o bloco invertido, com a fita marcadora: é o gesto mais
            comum da tela e reabre a Bíblia no capítulo e no versículo onde a
            leitura parou. A leitura de hoje mostra as passagens, uma por
            linha. Um atalho só para a leitura do dia. */}
        <section aria-label="Hoje" className="entrada mt-6" style={ordem(1)}>
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/biblioteca"
              aria-label={rotuloBiblia}
              className="campo relative flex flex-col justify-between px-4 py-3.5 transition-transform duration-200 active:scale-[0.97] md:px-7"
            >
              <span className="fita-marcadora" aria-hidden="true" />
              <span className="text-sm font-semibold leading-5 text-campo-suave">
                {continuar ? 'Continuar' : 'Bíblia'}
              </span>
              <span className="mt-2 block">
                {/* espaço comum: em nome comprido o capítulo desce de linha
                    em vez de empurrar o nome para fora do quadro */}
                <span data-nome-livro className={`reading-serif block font-medium leading-tight ${tamanhoQuadro} ${QUEBRA_SEGURA}`}>
                  {continuar ? `${continuar.livroNome} ${continuar.capitulo}` : 'Abrir'}
                </span>
                <span className="mt-0.5 block text-sm leading-5 text-campo-suave">
                  {continuar ? (versiculoGuardado ? `Versículo ${versiculoGuardado}` : 'De onde parou') : 'Comece a leitura'}
                </span>
              </span>
            </Link>
            <Link
              href="/plano-de-leitura?ler=1"
              className="cartao flex flex-col justify-between px-4 py-3.5 transition-[background-color,transform] duration-200 hover:bg-surface-2/50 active:scale-[0.97] md:px-7"
            >
              <span className="flex items-center justify-between gap-2 text-sm font-semibold leading-5 text-text-secondary">
                {passagens.length ? 'Leitura de hoje' : 'Plano de leitura'}
                <ArrowRight className="h-4 w-4 shrink-0 text-text-muted" aria-hidden="true" />
              </span>
              <span className="mt-2 block">
                {passagens.length ? passagens.map((p) => <Passagem key={p} texto={p} tamanho={tamanhoQuadro} />) : (
                  <span className={`reading-serif block font-medium leading-tight text-text-primary ${tamanhoQuadro}`}>Leitura do dia</span>
                )}
              </span>
            </Link>
          </div>
        </section>

        {/* 3. Palavra da Manhã: o texto do dia, direto na página */}
        <div className="entrada mt-10" style={ordem(2)}>
          <PalavraManha />
        </div>

        {/* 4. Versículo do dia: a página impressa */}
        <div className="entrada mt-10" style={ordem(3)}>
          <RandomVerse />
        </div>
      </main>
    </CosmicBackground>
  );
}
