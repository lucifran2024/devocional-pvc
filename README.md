# Devocional PVC 🙏

> Mensagens devocionais diárias geradas por IA com profundidade teológica.

## 🚀 Quick Start

```bash
# Instalar dependências
npm install

# Rodar em desenvolvimento
npm run dev

# Build de produção
npm run build
```

## 📦 Stack

| Tecnologia | Versão | Uso |
|------------|--------|-----|
| **Next.js** | 16.1+ | Framework React |
| **React** | 19.2+ | UI Library |
| **Supabase** | 2.90+ | Backend (DB + Edge Functions) |
| **Gemini AI** | 3.0 Flash | Geração de conteúdo |
| **TailwindCSS** | 4.0 | Estilos |

## 📁 Estrutura

```
devocional-pvc/
├── src/
│   ├── app/              # Páginas (Next.js App Router)
│   │   ├── page.tsx      # Dashboard
│   │   └── biblioteca/   # Leitor bíblico
│   ├── components/       # Componentes React
│   │   └── ui/           # Componentes de UI
│   └── lib/              # Lógica de negócio
│       ├── supabase.ts   # Cliente Supabase
│       └── bible-api.ts  # API Bíblica
├── supabase/
│   └── functions/
│       └── execute/      # Edge Function principal
├── public/
│   ├── manifest.json     # PWA manifest
│   └── sw.js             # Service Worker
└── .github/
    └── workflows/
        └── deploy.yml    # CI/CD Pipeline
```

## 🔧 Configuração

### Variáveis de Ambiente

```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx

# Supabase Edge Function Secrets
GEMINI_API_KEY=xxx
BIBLE_API_KEY=xxx (opcional)
```

### Deploy

O deploy é automatizado via GitHub Actions:

1. **Push para `main`** dispara o workflow
2. **Lint & Build** são verificados
3. **Edge Functions** são deployadas no Supabase
4. **Frontend** é deployado no Vercel

## 📱 PWA

O app é instalável como PWA:
- **Offline Support**: Cache de páginas estáticas
- **Push Notifications**: Notificações diárias (configurar server)
- **Add to Home Screen**: Ícone na tela inicial

## 🧪 Testes

```bash
# Rodar testes (quando configurados)
npm test

# Lint
npm run lint
```

## 📖 Páginas

| Rota | Descrição |
|------|-----------|
| `/` | Dashboard principal |
| `/biblioteca` | Leitor da Bíblia |
| `/plano-de-leitura` | Plano de leitura bíblica |
| `/devocional-externo` | Devocionais de fontes externas |

## 🔒 Segurança

- CORS restritivo (origens específicas)
- Logs sensíveis removidos
- Rate limiting (a implementar)

---

**Desenvolvido com ❤️ para a comunidade cristã**
