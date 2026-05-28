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
- [ ] Skeleton loading aprimorado para cards
- [ ] Animacao de entrada escalonada nos cards
- [x] Widget de versiculo aleatorio no dashboard ✅ CRIADA 2026-05-28

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
- Status: CRIADA
- Arquivo criado: src/components/RandomVerse.tsx
- Descricao: Widget com 20 versiculos curados, mostra o versiculo do dia baseado na data, com botao de refresh para sortear outro
- Integrado em: src/app/page.tsx (entre hero e grid de cards)

---

_Ultimo update: 2026-05-28_
