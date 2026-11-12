'use client';

import { useState, useEffect, type CSSProperties } from 'react';
import Link from 'next/link';
import {
  BookMarked, BookOpen, Calendar, HeartHandshake, Mic, NotebookPen, Youtube,
  type LucideIcon,
} from 'lucide-react';
import { getPayloadDoDia, getDataHoje, type PayloadDoDia } from '@/lib/supabase';
import { loadBibliaPosicao, type BibliaPosicao } from '@/lib/biblia-posicao';
import { dividirPassagens, saudacao } from '@/lib/palavra-apresentacao';
import { CosmicBackground } from '@/components/ui/CosmicBackground';
import { DashboardCard } from '@/components/ui/DashboardCard';
import { PalavraManha } from '@/components/PalavraManha';
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { RandomVerse } from '@/components/RandomVerse';

// ===============================================
// PÁGINA INICIAL
//
// Início premium (12/11/2026, pedido "organização da página inicial, dos
// cards e dos botões"): uma coluna só, de cima para baixo — data e título,
// cartão "Hoje" (continuar + leitura de hoje), Palavra da Manhã, Versículo
// do dia e as ferramentas em dois grupos compactos. A data aparece uma vez;
// tema fica no cabeçalho, no fluxo da página (antes flutuava sobre o texto);
// Sair fica no menu Mais e na barra lateral. Sem foto no topo (27/09) e sem
// degradê, brilho ou ícone gigante (03/10).
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

interface Atalho {
  href: string;
  title: string;
  desc: string;
  icon: LucideIcon;
}

// Cards de "Devocional Externo", "DNA Categorizado" e "Memorização" ficam fora
// do início a pedido (16/07/2026); as páginas seguem acessíveis por URL.
const ESTUDAR: Atalho[] = [
  { href: '/planos', title: 'Plano de Leitura', desc: 'Estudo guiado, com explicação.', icon: BookMarked },
  { href: '/biblioteca', title: 'Bíblia Sagrada', desc: 'Leia, busque e salve versículos.', icon: BookOpen },
  { href: '/anotacoes', title: 'Caderno', desc: 'Anotações, versículos e vídeos.', icon: NotebookPen },
  { href: '/oracao', title: 'Diário de Oração', desc: 'Pedidos e respostas de Deus.', icon: HeartHandshake },
];

const TRANSCREVER: Atalho[] = [
  { href: '/transcrever-youtube', title: 'YouTube', desc: 'Cole o link de uma pregação.', icon: Youtube },
  { href: '/transcrever-culto', title: 'Áudio', desc: 'Grave ao vivo ou envie do celular.', icon: Mic },
];

// Uma palavra só não quebra: num quadro de meia tela (122 px de texto num
// celular de 360 px), "Tessalonicenses" (15 letras, a maior da Bíblia) vazava.
// A letra segue a palavra mais longa; hífen e quebra forçada ficam de reserva.
function maiorPalavra(...textos: string[]): number {
  return Math.max(0, ...textos.flatMap((t) => t.split(/\s+/)).map((p) => p.length));
}

function tamanhoDoNomeDoLivro(livroNome: string): string {
  const n = maiorPalavra(livroNome);
  if (n <= 7) return 'text-[1.625rem]';
  if (n <= 10) return 'text-[1.375rem]';
  if (n <= 12) return 'text-[1.125rem]';
  return 'text-[0.9375rem]';
}

const QUEBRA_SEGURA = 'hyphens-auto [overflow-wrap:anywhere]';

// Uma passagem por linha no quadro da leitura, sem quebrar no meio dos
// números ("33-" numa linha e "36" na outra, visto num celular de 360 px)
function Passagem({ texto, tamanho }: { texto: string; tamanho: string }) {
  const partes = texto.match(/^(.*\S)\s+(\d[\d:.,–-]*)$/);
  return (
    <span data-passagem className={`reading-serif block ${tamanho} font-medium leading-snug text-text-primary ${QUEBRA_SEGURA}`}>
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

// 2º ajuste (12/11/2026): os cartões iguais com ícone em quadradinho
// colorido eram o que deixava a tela "comum". Cada grupo virou um cartão só,
// dividido em linhas, como uma lista do celular.
function GrupoDeAtalhos({ id, titulo, itens, posicao }: { id: string; titulo: string; itens: Atalho[]; posicao: number }) {
  return (
    <section aria-labelledby={id} className="entrada" style={ordem(posicao)}>
      <h2 id={id} className="reading-serif mb-3 text-xl font-semibold text-text-primary">{titulo}</h2>
      <ul className="cartao divide-y divide-border-subtle overflow-hidden">
        {itens.map((item) => (
          <li key={item.href}>
            <DashboardCard href={item.href} title={item.title} desc={item.desc} icon={item.icon} />
          </li>
        ))}
      </ul>
    </section>
  );
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
  // A letra dos dois quadros segue a palavra mais longa (ver maiorPalavra)
  const tamanhoNome = continuar ? tamanhoDoNomeDoLivro(continuar.livroNome) : 'text-[1.625rem]';
  const tamanhoPassagem = maiorPalavra(...passagens) > 12 ? 'text-[0.9375rem]' : 'text-[1.125rem]';
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
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-5 pb-12 pt-[max(3.5rem,calc(env(safe-area-inset-top)_+_1rem))] md:pt-12">

        {/* 1. Cabeçalho: a saudação do horário é o título (2º ajuste; antes
            "Um momento para a Palavra"), a data uma vez só, e o tema */}
        <header className="entrada flex items-start justify-between gap-4" style={ordem(0)}>
          <div className="min-w-0">
            <h1 className="reading-serif text-[2rem] font-medium leading-[1.1] tracking-[-0.01em]">{cumprimento}.</h1>
            <p className="mt-1.5 text-[15px] text-text-secondary">{formatarDataCurta(dataHoje)}</p>
          </div>
          <div className="shrink-0">
            <ThemeToggle />
          </div>
        </header>

        {/* 2. Hoje (3º ajuste, 12/11/2026: "o ler na Bíblia e o plano de
            leitura, os dois de cima, dá uma melhorada"): dois quadros lado a
            lado, o topo continua baixo no celular (25/09 e 01/10). A Bíblia
            (âmbar, a ação principal) reabre no capítulo e no versículo onde
            parou; a leitura de hoje mostra as passagens uma por linha. Um
            atalho só para a leitura do dia. */}
        <section aria-label="Hoje" className="entrada" style={ordem(1)}>
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/biblioteca"
              aria-label={rotuloBiblia}
              className="flex min-h-[7.5rem] flex-col justify-between rounded-[var(--radius-xl)] bg-amber-500 p-4 text-amber-950 transition-[background-color,transform] duration-200 hover:bg-amber-400 active:scale-[0.97]"
            >
              <span className="flex items-center gap-1.5 text-[13px] font-semibold text-amber-950/75">
                <BookOpen className="h-4 w-4 shrink-0" aria-hidden="true" />
                {continuar ? 'Continuar' : 'Bíblia'}
              </span>
              <span className="mt-3 block">
                {/* espaço comum: em nome comprido o capítulo desce de linha
                    em vez de empurrar o nome para fora do quadro */}
                <span data-nome-livro className={`reading-serif block font-medium leading-[1.1] ${tamanhoNome} ${QUEBRA_SEGURA}`}>
                  {continuar ? `${continuar.livroNome} ${continuar.capitulo}` : 'Abrir'}
                </span>
                <span className="mt-1 block text-[13px] text-amber-950/70">
                  {continuar ? (versiculoGuardado ? `Versículo ${versiculoGuardado}` : 'De onde parou') : 'Comece a leitura'}
                </span>
              </span>
            </Link>
            <Link
              href="/plano-de-leitura?ler=1"
              className="cartao flex min-h-[7.5rem] flex-col justify-between p-4 transition-[background-color,transform] duration-200 hover:bg-surface-2/60 active:scale-[0.97]"
            >
              <span className="flex items-center gap-1.5 text-[13px] font-semibold text-text-secondary">
                <Calendar className="h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" aria-hidden="true" />
                {passagens.length ? 'Leitura de hoje' : 'Plano de leitura'}
              </span>
              <span className="mt-3 block">
                {passagens.length ? passagens.map((p) => <Passagem key={p} texto={p} tamanho={tamanhoPassagem} />) : (
                  <span className="reading-serif block text-[1.125rem] font-medium leading-snug text-text-primary">Leitura do dia</span>
                )}
              </span>
            </Link>
          </div>
        </section>

        {/* 3. Palavra da Manhã (gerada a cada dia) */}
        <div className="entrada" style={ordem(2)}>
          <PalavraManha />
        </div>

        {/* 4. Versículo do dia */}
        <div className="entrada" style={ordem(3)}>
          <RandomVerse />
        </div>

        {/* 5. Ferramentas, em dois grupos */}
        <GrupoDeAtalhos id="titulo-estudar" titulo="Estudar" itens={ESTUDAR} posicao={4} />
        <GrupoDeAtalhos id="titulo-transcrever" titulo="Transcrever" itens={TRANSCREVER} posicao={5} />
      </main>
    </CosmicBackground>
  );
}
