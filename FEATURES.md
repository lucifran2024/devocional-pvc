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
