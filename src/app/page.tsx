'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BookMarked, BookOpen, Calendar, ChevronRight, HeartHandshake, Mic, NotebookPen, Youtube,
  type LucideIcon,
} from 'lucide-react';
import { getPayloadDoDia, getDataHoje, type PayloadDoDia } from '@/lib/supabase';
import { loadBibliaPosicao, type BibliaPosicao } from '@/lib/biblia-posicao';
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

function formatarDataCurta(dataStr: string): string {
  const texto = new Date(dataStr + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function GrupoDeAtalhos({ id, titulo, itens }: { id: string; titulo: string; itens: Atalho[] }) {
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="reading-serif mb-3 text-xl font-semibold text-text-primary">{titulo}</h2>
      <ul className="grid grid-cols-2 gap-3">
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

        {/* 1. Cabeçalho: data uma vez só, título e tema */}
        <header className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">{formatarDataCurta(dataHoje)}</p>
            <h1 className="reading-serif mt-1 text-[2rem] leading-[1.15] md:text-4xl">Um momento para a Palavra.</h1>
          </div>
          <div className="shrink-0">
            <ThemeToggle />
          </div>
        </header>

        {/* 2. Hoje: continuar a leitura + leitura do dia (um atalho só, 01/10) */}
        <section aria-label="Hoje" className="cartao overflow-hidden">
          <div className="p-5">
            {/* Com leitura em andamento, o botão leva direto de volta a ela
                (a Bíblia reabre no capítulo e no versículo onde parou). */}
            <Link href="/biblioteca" className="flex w-full min-h-11 items-center justify-center gap-2.5 rounded-xl bg-amber-500 px-5 text-[15px] font-semibold text-amber-950 transition hover:bg-amber-400 active:scale-[0.98]">
              <BookOpen className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
              <span className="truncate">{continuar ? `Continuar em ${continuar.livroNome} ${continuar.capitulo}` : 'Abrir minha Bíblia'}</span>
            </Link>
          </div>
          <Link href="/plano-de-leitura?ler=1" className="group flex min-h-16 items-center gap-3 border-t border-border-subtle px-5 py-3 transition-colors hover:bg-surface-2/60">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400" aria-hidden="true">
              <Calendar className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              {payload?.passagem_do_dia ? (
                <>
                  <span className="block text-[13px] leading-tight text-text-muted">Leitura de hoje</span>{' '}
                  <span className="block font-semibold leading-snug text-text-primary">{payload.passagem_do_dia}</span>
                </>
              ) : (
                <span className="block font-semibold text-text-primary">Leitura do dia</span>
              )}
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-text-muted transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        </section>

        {/* 3. Palavra da Manhã (gerada a cada dia) */}
        <PalavraManha />

        {/* 4. Versículo do dia */}
        <RandomVerse />

        {/* 5. Ferramentas, em dois grupos */}
        <GrupoDeAtalhos id="titulo-estudar" titulo="Estudar" itens={ESTUDAR} />
        <GrupoDeAtalhos id="titulo-transcrever" titulo="Transcrever" itens={TRANSCREVER} />
      </main>
    </CosmicBackground>
  );
}
