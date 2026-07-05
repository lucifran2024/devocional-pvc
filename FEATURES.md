# FEATURES - Devocional PVC
# Backlog e Status de Features
# =============================

## Status possiveis:
- BACKLOG = ideia registrada, nao iniciada
- CRIADA = implementada, aguardando validacao
- VALIDADA = build OK, pronta para teste manual
- TESTADA = usuario testou e aprovou
- CORRIGIDA = tinha erro, foi corrigida automaticamente
- REVERTIDA = tinha erro grave, foi desfeita
- SUBIDA = commitada e enviada para git

---

## Features por executar (BACKLOG)

### Dashboard
- [x] Skeleton loading aprimorado para cards ✅ VALIDADA 2026-05-29
- [x] Animacao de entrada escalonada nos cards ✅ VALIDADA 2026-05-29
- [x] Widget de versiculo aleatorio no dashboard ✅ VALIDADA 2026-05-29

### Biblioteca
- [x] Busca por referencia biblica ✅ VALIDADA 2026-05-30 (já existia no codigo — parse de "João 3:16" + sugestões de livros)
- [x] Marcador de leitura (bookmark) ✅ VALIDADA 2026-05-30
- [x] Notas pessoais por versiculo ✅ VALIDADA 2026-05-29 (já existia no codigo)

### Plano de Leitura
- [x] Progresso visual do plano ✅ CRIADA 2026-05-30
- [ ] Notificacao de leitura diaria
- [ ] Resumo semanal do progresso

### PWA / Geral
- [ ] Tela de onboarding para novos usuarios
- [ ] Configuracoes de notificacao
- [ ] Modo offline aprimorado
- [x] Splash screen personalizada ✅ CRIADA 2026-05-31
- [x] Atalhos de tela (shortcuts) ✅ CRIADA 2026-05-31

### Testes
- [ ] Testes para DashboardCard
- [ ] Testes para PalavraManha
- [ ] Testes para ThemeToggle
- [ ] Testes para CosmicBackground

---

## Features implementadas

### 2026-07-05 — Pacote de 6 melhorias (features 10-15)

**Feature 10: Diário de Oração (/oracao)**
- Status: VALIDADA (build limpo, rotas 200 em produção)
- Arquivos criados: src/app/oracao/page.tsx, src/lib/oracao.ts, supabase/migrations/20260705_oracao_memorizacao.sql
- Arquivo editado: src/app/page.tsx (card no dashboard)
- Descricao: Pedidos de oração com abas Orando/Respondidos, contador de dias orando, testemunho de resposta ("Como Deus respondeu"), desfazer, tabela pedidos_oracao com RLS por usuário. Migração aplicada no Supabase remoto.

**Feature 11: Memorização de Versículos (/memorizacao)**
- Status: VALIDADA (build limpo, rotas 200 em produção)
- Arquivos criados: src/app/memorizacao/page.tsx, src/lib/memorizacao.ts (mesma migração acima)
- Arquivo editado: src/app/page.tsx (card no dashboard)
- Descricao: Revisão espaçada (níveis 0-5, intervalos 1/3/7/14/30/90 dias). Adiciona versículos a partir dos favoritos. Modo praticar em flashcard: palavras ocultadas progressivamente por nível, autoavaliação Acertei/Errei, placar da sessão. Tabela versiculos_memorizacao com RLS por usuário.

**Feature 12: Áudio neural na Palavra da Manhã**
- Status: VALIDADA
- Arquivo criado: src/app/api/palavra-audio/route.ts
- Arquivo editado: src/components/PalavraManha.tsx
- Descricao: Botão "Ouvir" agora usa a voz neural do Azure (mesma da Bíblia, FranciscaNeural), com cache por data+hash do texto no bucket bible-audio (pasta palavra/). Fallback automático para a voz do navegador se offline/sem chave. Estado "Preparando" durante a síntese.

**Feature 13: Comparar traduções lado a lado (Bíblia)**
- Status: VALIDADA
- Arquivo editado: src/app/biblioteca/page.tsx
- Descricao: Seção "Comparar com (2ª versão)" no seletor de versões. O texto da segunda tradução aparece em itálico sob cada versículo, com badge da versão. Usa o mesmo cache offline (IndexedDB) da versão principal. Preferência persistida em localStorage; desativa sozinha se a principal virar igual à comparada.

**Feature 14: Mais cores de destaque (Bíblia)**
- Status: VALIDADA
- Arquivo editado: src/app/biblioteca/page.tsx
- Descricao: +2 cores de destaque (roxo e laranja), com filtro por cor do painel de salvos gerado a partir da lista de cores (sem hardcode).

**Feature 15: Modo offline aprimorado**
- Status: VALIDADA
- Arquivos editados: public/sw.js (pvc-v9), src/components/PalavraManha.tsx, src/app/page.tsx
- Descricao: (a) Palavra da Manhã salva a última mensagem no localStorage e a exibe offline com aviso quando é de outro dia; (b) dashboard usa o último payload salvo quando a rede falha; (c) service worker pré-cacheia /planos, /anotacoes, /oracao e /memorizacao; (d) precache com allSettled — uma rota falhando não derruba o cache inteiro.

### 2026-05-28 — Primeiras features implementadas

**Feature 1: Widget de Versiculo do Dia (Dashboard)**
- Status: VALIDADA (2026-05-29)
- Arquivo criado: src/components/RandomVerse.tsx
- Descricao: Widget com 20 versiculos curados, mostra o versiculo do dia baseado na data, com botao de refresh para sortear outro
- Integrado em: src/app/page.tsx (entre hero e grid de cards)

### 2026-05-29 — Skeleton Shimmer + Animacao Escalonada

**Feature 2: Skeleton Loading Aprimorado com Shimmer**
- Status: CORRIGIDA (2026-05-29) — CSS truncado em globals.css (bloco .dark .skeleton-shimmer incompleto)
- Arquivos criados: src/components/ui/DashboardSkeleton.tsx
- Arquivos editados: src/components/ui/Skeleton.tsx, src/app/page.tsx, src/app/globals.css
- Descricao: Skeleton completo do dashboard (hero, versiculo, grid) com efeito shimmer suave. Mostra enquanto dados carregam do Supabase. Skeleton base agora suporta variante shimmer e adaptacao light/dark.

**Feature 3: Animacao de Entrada Escalonada nos Cards**
- Status: VALIDADA (2026-05-29)
- Arquivos editados: src/app/page.tsx, src/app/globals.css
- Descricao: Cards do dashboard entram com animacao staggered (cada card com delay progressivo de ~70ms). Efeito slideUp com scale sutil, usando CSS puro via classe stagger-item.

### 2026-05-30 — Bookmark de Leitura

**Feature 4: Marcador de Leitura (Bookmark)**
- Status: VALIDADA (2026-05-30)
- Arquivo editado: src/app/biblioteca/page.tsx
- Descricao: Sistema de bookmarks manuais na biblioteca bíblica. Usuário pode marcar a posição atual (livro + capítulo + versículo selecionado) com nome personalizado. Bookmarks persistem no localStorage e podem ser navegados com um clique. Inclui botão no header (BookmarkCheck), painel modal com lista de bookmarks, botão de criar novo bookmark com nome customizado, e remoção individual. Ícone BookmarkCheck adicionado aos imports do lucide-react.

**Feature 5: Busca por Referência Bíblica (catálogo)**
- Status: VALIDADA (2026-05-30) — já existia no código
- Descricao: A busca da biblioteca já parseava referências como "João 3:16", "Gn 1:1", "Salmos 23" e navegava automaticamente. Incluía sugestões de livros em tempo real e busca de texto via API bolls.life.

**Feature 6: Notas Pessoais por Versículo**
- Status: VALIDADA (2026-05-30) — já existia no código
- Descricao: Sistema completo de notas por versículo já implementado: toolbar inline, editor fullscreen, painel de notas no modal de salvos, criar/editar/remover.

### 2026-05-30 — Progresso Visual do Plano de Leitura

**Feature 7: Progresso Visual do Plano de Leitura**
- Status: CRIADA (2026-05-30)
- Arquivo criado: src/components/ReadingPlanProgress.tsx
- Arquivo editado: src/app/plano-detalhes/page.tsx
- Descricao: Componente dedicado de progresso visual rico para planos de leitura. Inclui: grid de estatísticas aprimorado, marcos de progresso com timeline visual (25%/50%/75%/100%), calendário semanal tipo heatmap com cores por status, previsão automática de data de conclusão.

### 2026-05-31 — Splash Screen Personalizada + Atalhos de Tela

**Feature 8: Splash Screen Personalizada**
- Status: CRIADA (2026-05-31)
- Arquivo criado: src/components/SplashScreen.tsx
- Arquivo editado: src/app/layout.tsx
- Descricao: Tela de splash personalizada para o PWA com logo "PVC", nome do app "Devocional PVC", subtítulo "Sua jornada espiritual diária" e animação de loading com 3 pontos bouncing. Fundo slate-950 com gradiente sutil amber no topo, logo com gradiente amber→orange e efeito de glow pulsante. Animação de fade-out após 2 segundos. Integrada no layout raiz antes da Navigation.

**Feature 9: Atalhos de Tela (Shortcuts)**
- Status: CRIADA (2026-05-31)
- Arquivo editado: public/manifest.json
- Descricao: Atalhos de tela no manifest.json do PWA para acesso rápido a seções principais. Inclui 4 atalhos: Bíblia Sagrada (/biblioteca), Plano de Leitura (/planos), Devocional Externo (/devocional-externo) e DNA Categorizado (/dna-categorizado). Cada atalho com nome, nome curto, descrição, URL e ícone. Aparecem ao pressionar longamente o ícone do app no Android e na barra de tarefas do Windows.l do Plano de Leitura

**Feature 7: Progresso Visual do Plano de Leitura**
- Status: CRIADA (2026-05-30)
- Arquivo criado: src/components/ReadingPlanProgress.tsx
- Arquivo editado: src/app/plano-detalhes/page.tsx
- Descricao: Componente dedicado de progresso visual para planos de leitura. Inclui: grid de estatísticas aprimorado (dias lidos, sequência atual, maior sequência/recorde, dias restantes), marcos de progresso com timeline visual (25%/50%/75%/100%), calendário semanal tipo heatmap com cores por status (lido/atual/perdido/futuro), previsão automática de data de conclusão baseada na média de leitura. Substitui o bloco de estatísticas simples anterior na página de detalhes.

---

### 2026-05-31 — Splash Screen Personalizada

**Feature 8: Splash Screen Personalizada**
- Status: CRIADA (2026-05-31)
- Arquivo criado: src/components/SplashScreen.tsx
- Arquivo editado: src/app/layout.tsx
- Descricao: Tela de splash personalizada para o PWA. Exibe logo "PVC" com gradiente amber→orange, nome do app "Devocional PVC", subtítulo "Sua jornada espiritual diária" e animação de loading com 3 pontos bouncing. Fundo slate-950 com gradiente sutil amber no topo. Logo com efeito de glow pulsante. Animação de fade-out após 2 segundos. Integrada no layout raiz antes da Navigation.

---

_Ultimo update: 2026-05-31 (feature 8 — splash screen personalizada, build limpa, 0 erros TS)_
