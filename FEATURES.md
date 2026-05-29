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
- [ ] Busca por referencia biblica
- [ ] Marcador de leitura (bookmark)
- [ ] Notas pessoais por versiculo

### Plano de Leitura
- [ ] Progresso visual do plano
- [ ] Notificacao de leitura diaria
- [ ] Resumo semanal do progresso

### PWA / Geral
- [ ] Tela de onboarding para novos usuarios
- [ ] Configuracoes de notificacao
- [ ] Modo offline aprimorado
- [ ] Splash screen personalizada
- [ ] Atalhos de tela (shortcuts)

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

---

_Ultimo update: 2026-05-29 (validacao automatica)_
