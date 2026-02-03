'use client';

import { useState, useEffect } from 'react';
import {
  User, AlertTriangle,
  Calendar, Sparkles, Book, MessageSquare, Heart, Anchor, Feather, Star, Layers
} from 'lucide-react';
import { getPayloadDoDia, getDataHoje, type PayloadDoDia } from '@/lib/supabase';
import { CosmicBackground } from '@/components/ui/CosmicBackground';
import { DashboardCard } from '@/components/ui/DashboardCard';
import { HeroSkeleton, CardSkeleton } from '@/components/ui/Skeleton';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

// ===============================================
// PÁGINA DASHBOARD
// ===============================================


export default function DashboardPage() {
  const [payload, setPayload] = useState<PayloadDoDia | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const dataHoje = getDataHoje();

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Demorou muito para conectar (Timeout).')), 8000)
      );

      try {
        // @ts-ignore
        const res = await Promise.race([
          getPayloadDoDia(dataHoje),
          timeoutPromise
        ]) as { data: PayloadDoDia | null; error: string | null };

        if (res.error) throw new Error(res.error);
        setPayload(res.data);
      } catch (e) {
        console.error(e);
        setError(e instanceof Error ? e.message : 'Erro desconhecido.');
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

  return (
    <CosmicBackground className="flex flex-col min-h-screen selection:bg-amber-500/30">

      {/* 1. HERO SECTION (Imersiva) */}
      <section className="relative w-full pt-32 pb-20 px-6 overflow-hidden">
        {/* Decorative Elements - Blue glow removed as requested */}
        {/* <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-indigo-500/20 blur-[120px] rounded-full pointer-events-none"></div> */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-amber-500/05 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-amber-500/10 blur-[100px] rounded-full pointer-events-none"></div>

        <div className="max-w-6xl mx-auto relative z-10 flex flex-col items-center text-center">

          {/* Header Top Icons */}
          <div className="absolute top-0 right-0 flex gap-4">
            <div className="h-10 w-10 md:h-12 md:w-12 glass-panel rounded-xl flex items-center justify-center text-amber-500 border-amber-500/20">
              <User className="w-5 h-5 md:w-6 md:h-6" />
            </div>
          </div>

          {/* Date Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-8 animate-enter">
            <Calendar className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">
              {formatarDataExtenso(dataHoje)}
            </span>
          </div>

          {/* PALAVRA DO DIA */}
          <div className="animate-enter w-full" style={{ animationDelay: '0.1s' }}>
            <h2 className="text-amber-500/80 font-bold tracking-[0.3em] text-xs md:text-sm uppercase mb-4">
              Palavra da Manhã
            </h2>

            {loading ? (
              <div className="h-20 w-full max-w-2xl bg-white/5 rounded-2xl animate-pulse mx-auto"></div>
            ) : error ? (
              <div className="inline-flex items-center gap-2 text-red-400 bg-red-500/10 px-4 py-2 rounded-lg">
                <AlertTriangle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            ) : (
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white tracking-tighter mb-6 leading-[0.9]">
                {payload?.passagem_do_dia || "Leitura Sagrada"}
              </h1>
            )}

            {/* Chip Arquétipo */}
            {!loading && payload && (
              <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full glass-panel border-amber-500/30 mt-4">
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulseshadow"></div>
                <span className="text-slate-200 text-sm">
                  Arquétipo: <strong className="text-amber-400">{payload.arquetipo}</strong>
                </span>
              </div>
            )}
          </div>

        </div>
      </section>

      {/* 2. GRID DE FERRAMENTAS (Design Premium) */}
      <section className="flex-1 w-full max-w-7xl mx-auto px-6 pb-24 z-10">

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 animate-enter" style={{ animationDelay: '0.2s' }}>

          {/* Card 1: Gerador (IA) */}
          <DashboardCard
            href="/gerador"
            title="Gerador de Mensagem"
            desc="Crie devocionais personalizados com Inteligência Artificial."
            icon={Sparkles}
            accentColor="text-indigo-400"
            badge="IA POWERED"
          />

          {/* Card 2: Plano de Leitura */}
          <DashboardCard
            href="/plano-de-leitura"
            title="Plano de Leitura"
            desc="Estudo bíblico interativo, comentado e profundo."
            icon={Book}
            accentColor="text-emerald-400"
            badge="NOVO MÓDULO"
          />

          {/* Card 3: Histórico */}
          <DashboardCard
            href="/historico"
            title="Minhas Memórias"
            desc="Acesse suas mensagens salvas e histórico espiritual."
            icon={Anchor}
            accentColor="text-amber-400"
          />

          {/* Card 4: Chat Pastoral */}
          <DashboardCard
            href="/chat"
            title="Chat Pastoral"
            desc="Converse com um mentor virtual sobre suas dúvidas."
            icon={MessageSquare}
            accentColor="text-cyan-400"
            badge="NOVO"
          />

          {/* Card 5: Devocional Externo */}
          <DashboardCard
            href="/devocional-externo"
            title="Devocional Externo"
            desc="Leia devocionais de sites cristãos renomados, direto da fonte."
            icon={Heart}
            accentColor="text-rose-400"
            badge="ORIGINAL"
          />

          {/* Card 6: Diário de Favoritos */}
          <DashboardCard
            href="/diario"
            title="Adicionar Favorita"
            desc="Salve mensagens externas para a IA aprender seu estilo."
            icon={Feather}
            accentColor="text-amber-400"
            badge="NOVO"
          />

          {/* Card 7: Banco de Ouro (Favoritos Manuais) */}
          <DashboardCard
            href="/favoritos"
            title="Banco de Ouro"
            desc="Sua coleção pessoal de mensagens favoritas (Manuais)."
            icon={Book}
            accentColor="text-yellow-400"
            badge="PREMIUM"
          />

          {/* Card 8: DNA Categorizado */}
          <DashboardCard
            href="/dna-categorizado"
            title="DNA Categorizado"
            desc="Gere mensagens baseadas no seu DNA espiritual organizado por categoria."
            icon={Layers}
            accentColor="text-violet-400"
            badge="NOVO"
          />

          {/* Card 9: Biblioteca (Bíblia) */}
          <DashboardCard
            href="/biblioteca"
            title="Bíblia Sagrada"
            desc="Leia a Palavra de Deus com navegação simples."
            icon={Star}
            accentColor="text-purple-400"
            badge="NOVO"
          />

        </div>
      </section>

      {/* Footer Minimalista */}
      <footer className="w-full text-center py-8 text-slate-600 text-xs border-t border-white/5">
        <p className="tracking-widest uppercase">PVC Devocional • 2026</p>
      </footer>

    </CosmicBackground>
  );
}
