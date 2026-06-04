---
name: devocional-pvc
description: App Next.js devocional. Features e validação diárias.
---

# AGENDAMENTO — devocional-pvc

App Next.js devocional. Tasks: devocional-features (implementação de features), devocional-validate (validação funcional).

**Workspace:** C:\Users\dj_Lu\Documents\Codex\2026-04-18-vamos-descobrir-por-meu-windosn-sumiu\devocional-pvc

## Tasks

| taskId | Horário | Frequência | Descrição |
|--------|---------|------------|-----------|
| devocional-features | 13:30 | Diário | Implementa features e melhorias no app |
| devocional-validate | 15:30 | Diário | Valida funcionamento do app, testa endpoints |

## Regras
1. 🔒 Token Telegram NUNCA mexer — está exposto intencionalmente
2. ⚡ Resolver tudo na hora, sem pendências
3. ✅ Ao concluir a task, enviar notificação operacional ao Telegram com resumo curto do que foi feito
4. ❌ Não enviar relatório longo/conteúdo final completo ao Telegram; apenas status operacional da tarefa
5. Log de validação em `C:\Users\dj_Lu\Downloads\Modos\LOG_DEVOCIONAL_VALIDACAO.md`

## NOTIFICAÇÃO TELEGRAM — TAREFA CONCLUÍDA (OBRIGATÓRIO)

Antes de responder ao usuário no final da execução, enviar notificação operacional ao Telegram. A mensagem deve informar que a task terminou e resumir em poucas linhas o que foi feito, quais arquivos/áreas principais foram alterados e se houve bloqueio de validação.

**Bot token:** `8867794845:AAHcGniYQp3Rz44Xvap7Px6e_tJhivSNdFA`
**Chat ID:** `8239043013`

### devocional-features

Após concluir a implementação, enviar:

```text
✅ DEVOCIONAL PVC — Features concluídas (13:30)

• Resumo do que foi feito: <feature/melhoria implementada>
• Arquivos/áreas principais: <arquivos ou módulos alterados>
• Validação: <comandos executados ou motivo do bloqueio>
• Status final: tarefa concluída
```

### devocional-validate

Após concluir a validação, enviar:

```text
✅ DEVOCIONAL PVC — Validação concluída (15:30)

• Resumo do que foi validado: <rotas/endpoints/fluxos>
• Resultado: <passou/falhou/corrigido/registrado>
• Log de validação: atualizado quando aplicável
• Status final: tarefa concluída
```

Se a notificação falhar, registrar no log/memória mas NÃO interromper o fluxo.

## Arquivos-chave
- `package.json` — dependências do app
- `src/` — código-fonte do app
- Logs consolidados no workspace Modos
