'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Music, User, Settings, ArrowRight, Loader2, AlertTriangle, RefreshCw,
  Calendar, Sparkles, Book, MessageSquare, Heart
} from 'lucide-react';
import { getPayloadDoDia, getDataHoje, type PayloadDoDia } from '@/lib/supabase';
import { CosmicHeader } from '@/components/ui/CosmicHeader';
import { CosmicBackground } from '@/components/ui/CosmicBackground';

export default function DashboardPage() {
  const [payload, setPayload] = useState<PayloadDoDia | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const dataHoje = getDataHoje();

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);

      // Timeout de 8 segundos
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Demorou muito para conectar (Timeout).')), 8000)
      );

      try {
        // Race entre o fetch e o timeout
        // @ts-ignore
        const res = await Promise.race([
          getPayloadDoDia(dataHoje),
          timeoutPromise
        ]) as { data: PayloadDoDia | null; error: string | null };

        if (res.error) {
          throw new Error(res.error);
        }
        setPayload(res.data);
      } catch (e) {
        console.error(e);
        setError(e instanceof Error ? e.message : 'Erro desconhecido ao carregar.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [dataHoje]);

  const formatarDataExtenso = (dataStr: string) => {
    return new Date(dataStr + 'T12:00:00').toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <CosmicBackground className="font-sans selection:bg-indigo-500/30 selection:text-indigo-200">

      {/* THE GIANT WRAPPER - "Pulo do Gato" */}
      <div className="w-full flex flex-col items-center relative z-10">

        {/* HEADER PREMIUM (Use CosmicHeader) */}
        <div className="w-full max-w-6xl">
          <CosmicHeader className="pb-32 md:pb-48">
            <div className="relative w-full px-4 sm:px-6 lg:px-8 pt-32 pb-16 md:pt-40 md:pb-24 flex flex-col items-center">
              <div className="flex flex-col items-center text-center justify-center gap-8 md:gap-12 w-full">

                {/* Config & Profile */}
                <div className="absolute top-6 right-6 lg:top-12 lg:right-12 z-20 flex gap-4">
                  <button aria-label="Configurações" className="p-3 bg-white/[0.03] hover:bg-white/[0.08] backdrop-blur-xl rounded-2xl border border-white/[0.05] text-white transition-all active:scale-95 group">
                    <Settings className="w-5 h-5 opacity-60 group-hover:opacity-100 transition-opacity" />
                  </button>
                  <div className="h-12 w-12 bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 rounded-2xl flex items-center justify-center text-amber-950 border border-white/20 transition-transform hover:scale-105">
                    <User className="w-6 h-6 stroke-[2.5]" />
                  </div>
                </div>

                {/* Center Info: Palavra do Dia */}
                <div className="space-y-6 max-w-4xl w-full z-10 flex flex-col items-center animate-divine">
                  <div className="inline-flex items-center gap-2.5 px-4 py-1.5 bg-white/[0.03] backdrop-blur-md border border-white/[0.08] rounded-full text-amber-200/80 text-[10px] md:text-xs font-bold uppercase tracking-[0.25em]">
                    <Calendar className="w-3.5 h-3.5" />
                    {dataHoje ? formatarDataExtenso(dataHoje) : 'Sintonizando...'}
                  </div>

                  <div className="space-y-4 w-full flex flex-col items-center">
                    <h2 className="text-center text-blue-300/60 text-sm md:text-lg font-medium tracking-[0.15em] uppercase">Palavra da Manhã</h2>
                    {loading ? (
                      <div className="h-16 w-full md:w-[600px] bg-white/[0.02] animate-pulse rounded-2xl mx-auto flex items-center justify-center">
                        <span className="text-slate-500 text-sm tracking-widest uppercase">Sintonizando Frequência Divina...</span>
                      </div>
                    ) : error ? (
                      <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-300">
                        <div className="flex items-center gap-3 text-rose-300 bg-rose-500/10 px-6 py-3 rounded-xl border border-rose-500/20 backdrop-blur-sm">
                          <AlertTriangle className="w-5 h-5" />
                          <span className="text-sm font-medium">{error}</span>
                        </div>
                        <button
                          onClick={() => window.location.reload()}
                          className="group flex items-center gap-2 px-5 py-2.5 bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-200 rounded-xl border border-indigo-500/30 transition-all active:scale-95"
                        >
                          <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
                          Tentar Novamente
                        </button>
                      </div>
                    ) : (
                      <h1 className="text-center text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-divine text-white leading-[1.05] divine-halo">
                        {payload?.passagem_do_dia || "Leitura Sagrada"}
                      </h1>
                    )}
                  </div>

                  {/* Theme Chip */}
                  <div className="group relative mt-4">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500/20 via-indigo-500/20 to-amber-500/20 rounded-2xl blur opacity-30 group-hover:opacity-100 transition duration-1000"></div>
                    <div className="relative inline-flex items-center gap-4 px-6 py-3 bg-[#020617]/80 border border-white/[0.08] rounded-2xl backdrop-blur-xl">
                      <div className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                      </div>
                      <span className="text-slate-300 text-sm md:text-base font-medium">Arquétipo: <span className="text-amber-300 font-bold">{payload?.arquetipo || "Essência Divina"}</span></span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </CosmicHeader>
        </div>

        {/* MAIN CONTENT DASHBOARD */}
        <main className="w-full max-w-6xl px-4 sm:px-6 lg:px-8 -mt-24 relative z-20 flex flex-col items-center space-y-20 py-20">

          {/* Intro Banner - Minimalist & Aligned */}
          <div className="w-full flex flex-col md:flex-row items-center justify-between gap-8 md:gap-12 py-6">
            <div className="space-y-4 max-w-4xl text-center md:text-left mx-auto md:mx-0">
              <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight">Suas Ferramentas de Fé</h2>
              <p className="text-slate-400 text-base md:text-xl leading-relaxed">
                Descubra espaços de reflexão profunda. Cada ferramenta foi pensada para conectar sua jornada à sabedoria eterna.
              </p>
            </div>

            <div className="w-full md:w-auto p-2 flex items-center justify-center md:justify-start gap-6 group cursor-default">
              <div className="p-5 bg-amber-500/10 rounded-2xl text-amber-400 group-hover:scale-110 transition-transform duration-500">
                <Sparkles className="w-8 h-8" />
              </div>
              <div className="text-left">
                <h3 className="font-bold text-xl text-white">Bênção Matinal</h3>
                <p className="text-sm text-slate-400">Sua jornada começa aqui.</p>
              </div>
            </div>
          </div>

          {/* Tools Grid - Organized and Premium */}
          <div className="w-full space-y-8 flex flex-col items-center">
            <div className="w-full text-center md:text-left space-y-2 max-w-6xl mx-auto">
              <h2 className="text-3xl font-bold text-white pl-4 border-l-4 border-indigo-500/50">Recursos Interativos</h2>
              <p className="text-slate-500 text-base md:text-lg pl-4">Selecione uma modalidade para expandir sua experiência espiritual.</p>
            </div>

            <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 xl:gap-8 justify-items-center justify-center auto-rows-fr">

              {/* CARD 1: GERADOR */}
              <Link href="/gerador" className="w-full group h-full flex flex-col items-center text-center p-4 transition-all duration-300">
                <div className="mb-4 text-indigo-400 group-hover:scale-110 transition-transform duration-500">
                  <Sparkles className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-indigo-300 transition-colors tracking-tight">Gerador de Mensagem</h3>
                <p className="text-slate-500 text-sm leading-relaxed mb-4">
                  Crie devocionais personalizados com IA.
                </p>
                <div className="mt-auto opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowRight className="w-4 h-4 text-indigo-400 mx-auto" />
                </div>
              </Link>

              {/* CARD 2: PLANO DE LEITURA */}
              <Link href="/plano-de-leitura" className="w-full group h-full flex flex-col items-center text-center p-4 transition-all duration-300">
                <div className="mb-4 text-emerald-400 group-hover:scale-110 transition-transform duration-500">
                  <Book className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-emerald-300 transition-colors tracking-tight">Plano de Leitura</h3>
                <p className="text-slate-500 text-sm leading-relaxed mb-4">
                  Estudo bíblico interativo.
                </p>
                <div className="mt-auto opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowRight className="w-4 h-4 text-emerald-400 mx-auto" />
                </div>
              </Link>

              {/* CARD 3: HISTÓRICO */}
              <Link href="/historico" className="w-full group h-full flex flex-col items-center text-center p-4 transition-all duration-300">
                <div className="mb-4 text-purple-400 group-hover:scale-110 transition-transform duration-500">
                  <Calendar className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-purple-300 transition-colors tracking-tight">Histórico & Memórias</h3>
                <p className="text-slate-500 text-sm leading-relaxed mb-4">
                  Suas mensagens salvas.
                </p>
                <div className="mt-auto opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowRight className="w-4 h-4 text-purple-400 mx-auto" />
                </div>
              </Link>

              {/* CARD 4: CHAT PASTORAL (Disabled) */}
              <div className="w-full group h-full flex flex-col items-center text-center p-4 opacity-40 cursor-not-allowed">
                <div className="mb-4 text-slate-600">
                  <MessageSquare className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold text-slate-600 mb-2">Chat Pastoral</h3>
                <p className="text-slate-700 text-sm leading-relaxed mb-4">
                  Em breve.
                </p>
              </div>

              {/* CARD 5: BÍBLIA SAGRADA (Disabled) */}
              <div className="w-full group h-full flex flex-col items-center text-center p-4 opacity-40 cursor-not-allowed">
                <div className="mb-4 text-slate-600">
                  <Book className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold text-slate-600 mb-2">Biblioteca Sagrada</h3>
                <p className="text-slate-700 text-sm leading-relaxed mb-4">
                  Em breve.
                </p>
              </div>

              {/* CARD 6: DIÁRIO ESPIRITUAL (Disabled) */}
              <div className="w-full group h-full flex flex-col items-center text-center p-4 opacity-40 cursor-not-allowed">
                <div className="mb-4 text-slate-600">
                  <Heart className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold text-slate-600 mb-2">Diário de Orações</h3>
                <p className="text-slate-700 text-sm leading-relaxed mb-4">
                  Em breve.
                </p>
              </div>

            </div>
          </div>

        </main>

        {/* Footer */}
        <footer className="w-full text-center py-20 text-slate-500 text-sm border-t border-white/[0.05] mt-24 bg-[#020617]/50 backdrop-blur-md">
          <div className="flex flex-col items-center gap-6">
            <div className="flex items-center justify-center gap-3 px-6 py-2 bg-white/[0.03] border border-white/[0.08] rounded-full">
              <Book className="w-4 h-4 text-indigo-400" />
              <span className="font-bold text-white tracking-widest uppercase text-xs">PVC Devocional</span>
            </div>
            <p className="text-slate-400 max-w-sm">"Tua palavra é lâmpada para os meus pés e luz para o meu caminho."</p>
            <div className="h-px w-12 bg-indigo-500/30"></div>
            <p className="text-slate-500">© 2026 Todos os direitos reservados à sua jornada de fé.</p>
          </div>
        </footer>

      </div>

    </CosmicBackground>
  );
}
