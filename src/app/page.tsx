'use client';

import { useState, useEffect } from 'react';
import {
  User, AlertTriangle,
  Calendar, Book, Star, LogOut, NotebookPen, Youtube, Mic,
  HeartHandshake
} from 'lucide-react';
import { getPayloadDoDia, getDataHoje, type PayloadDoDia } from '@/lib/supabase';
import { CosmicBackground } from '@/components/ui/CosmicBackground';
import { DashboardCard } from '@/components/ui/DashboardCard';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { PalavraManha } from '@/components/PalavraManha';
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { RandomVerse } from '@/components/RandomVerse';
import { DashboardSkeleton } from '@/components/ui/DashboardSkeleton';
import { useAuth } from '@/components/AuthProvider';

// ===============================================
// PÁGINA DASHBOARD
// ===============================================


export default function DashboardPage() {
  const [payload, setPayload] = useState<PayloadDoDia | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const dataHoje = getDataHoje();
  const { signOut } = useAuth();

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Demorou muito para conectar (Timeout).')), 8000)
      );

      try {
        const res = await Promise.race([
          getPayloadDoDia(dataHoje),
          timeoutPromise
        ]) as { data: PayloadDoDia | null; error: string | null };

        if (res.error) throw new Error(res.error);
        setPayload(res.data);
        // Guarda o último payload para o dashboard abrir offline
        try { localStorage.setItem('payload-dia-local', JSON.stringify(res.data)); } catch { /* ignore */ }
      } catch (e) {
        console.error(e);
        // Offline/erro: usa o último payload salvo no aparelho
        try {
          const local = localStorage.getItem('payload-dia-local');
          if (local) setPayload(JSON.parse(local));
          else setError(e instanceof Error ? e.message : 'Erro desconhecido.');
        } catch {
          setError(e instanceof Error ? e.message : 'Erro desconhecido.');
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [dataHoje]);

  const formatarDataExtenso = (dataStr: string) => {
    return new Date(dataStr + 'T12:00:00').toLocaleDateString('pt-BR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
  };

  if (loading) {
    return (
      <CosmicBackground className="flex flex-col min-h-screen selection:bg-amber-500/30 relative">
        <header className="fixed top-4 right-4 z-50">
          <ThemeToggle />
        </header>
        <DashboardSkeleton />
      </CosmicBackground>
    );
  }

  return (
    <CosmicBackground className="flex flex-col min-h-screen selection:bg-amber-500/30 relative">
      <header className="fixed top-4 right-4 z-50 flex items-center gap-2">
        <ThemeToggle />
        <button
          onClick={signOut}
          className="md:hidden p-2.5 rounded-full bg-white/80 dark:bg-surface-2 border border-slate-300 dark:border-border-subtle text-slate-500 dark:text-text-muted hover:text-red-500 transition-colors shadow-sm"
          title="Sair da conta"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </header>

      {/* 1. HERO SECTION (Imersiva) */}
      <section className="relative w-full pt-32 pb-20 px-6 overflow-hidden">
        {/* Decorative Elements - Blue glow removed as requested */}
        {/* <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-indigo-500/20 blur-[120px] rounded-full pointer-events-none"></div> */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-amber-500/5 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-amber-500/10 blur-[100px] rounded-full pointer-events-none"></div>

        <div className="max-w-6xl mx-auto relative z-10 flex flex-col items-center text-center">

          {/* Date Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/80 dark:bg-surface-2 border border-slate-300 dark:border-border-subtle backdrop-blur-md mb-8 animate-enter shadow-sm">
            <Calendar className="w-3.5 h-3.5 text-amber-600 dark:text-accent-primary" />
            <span className="text-xs font-bold text-slate-700 dark:text-text-secondary uppercase tracking-widest">
              {formatarDataExtenso(dataHoje)}
            </span>
          </div>

          {/* PALAVRA DA MANHÃ (AUTO-GERADA) */}
          <div className="w-full relative z-20">
            <div className="flex flex-col items-center mb-2">
              <h2 className="reading-serif text-2xl md:text-3xl font-semibold text-text-primary mb-1">
                Palavra da Manhã
              </h2>
              {/* Data da Leitura */}
              <div className="text-xs text-slate-600 dark:text-text-muted font-medium tracking-wide">
                {payload?.passagem_do_dia || "Leitura Sagrada"}
              </div>
            </div>

            <PalavraManha />
          </div>

        </div>
      </section>


      {/* 1.5 VERSICULO DO DIA */}
      <section className="w-full px-6 -mt-8 mb-8 z-10">
        <RandomVerse />
      </section>
      {/* 2. GRID DE FERRAMENTAS (Design Premium) */}
      <section className="flex-1 w-full max-w-7xl mx-auto px-6 pb-24 z-10">

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">

          {/* Card 1: Plano de Leitura */}
          <div className="stagger-item">
            <DashboardCard
              href="/planos"
              title="Plano de Leitura"
              desc="Estudo bíblico interativo, comentado e profundo."
              icon={Book}
              accentColor="text-amber-600 dark:text-amber-400"
              iconBg="bg-amber-500/10 border-amber-500/20"
              badgeColor="bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-300"
              badge="Diário"
            />
          </div>

          {/* Card 3: Bíblia Sagrada */}
          <div className="stagger-item">
            <DashboardCard
              href="/biblioteca"
              title="Bíblia Sagrada"
              desc="Leia a Palavra de Deus com navegação intuitiva e busca rápida."
              icon={Star}
              accentColor="text-amber-600 dark:text-amber-400"
              iconBg="bg-amber-500/10 border-amber-500/20"
              badgeColor="bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-300"
              badge="66 livros"
            />
          </div>

          {/*
            Cards de "Devocional Externo" e "DNA Categorizado" removidos da
            tela principal a pedido — eram só atalhos (admin). As páginas
            continuam acessíveis por URL direta (/devocional-externo e
            /dna-categorizado) e os crons/DNA no backend seguem intactos.
          */}

          {/* Card: Diário de Oração */}
          <div className="stagger-item">
            <DashboardCard
              href="/oracao"
              title="Diário de Oração"
              desc="Registre pedidos e celebre cada resposta de Deus."
              icon={HeartHandshake}
              accentColor="text-amber-600 dark:text-amber-400"
              iconBg="bg-amber-500/10 border-amber-500/20"
              badgeColor="bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-300"
              badge="Oração"
            />
          </div>

          {/* Card: Anotações */}
          <div className="stagger-item">
            <DashboardCard
              href="/anotacoes"
              title="Anotações"
              desc="Seus versículos marcados e seu caderno pessoal, num só lugar."
              icon={NotebookPen}
              accentColor="text-amber-600 dark:text-amber-400"
              iconBg="bg-amber-500/10 border-amber-500/20"
              badgeColor="bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-300"
              badge="Notas"
            />
          </div>

          {/* Card: Transcrever do YouTube */}
          <div className="stagger-item">
            <DashboardCard
              href="/transcrever-youtube"
              title="Transcrever do YouTube"
              desc="Cole o link de uma pregação e receba o texto da legenda."
              icon={Youtube}
              accentColor="text-amber-600 dark:text-amber-400"
              iconBg="bg-amber-500/10 border-amber-500/20"
              badgeColor="bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-300"
              badge="Vídeo"
            />
          </div>

          {/* Card: Gravar e Transcrever culto */}
          <div className="stagger-item">
            <DashboardCard
              href="/transcrever-culto"
              title="Gravar e Transcrever"
              desc="Grave a pregação ao vivo e organize com suas notas."
              icon={Mic}
              accentColor="text-amber-600 dark:text-amber-400"
              iconBg="bg-amber-500/10 border-amber-500/20"
              badgeColor="bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-300"
              badge="Áudio"
            />
          </div>

        </div>
      </section>

      {/* Footer Minimalista */}
      <footer className="w-full text-center py-8 text-slate-500 dark:text-text-muted text-xs border-t border-slate-200/70 dark:border-border-subtle">
        <p className="tracking-widest uppercase">Bíblia • {new Date().getFullYear()}</p>
      </footer>

    </CosmicBackground>
  );
}
