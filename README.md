# Devocional PVC - Project Context

## Project Overview
Devocional PVC is a daily devotional application built with Next.js, Tailwind CSS, and Supabase. It uses a "Cosmic Glass" aesthetic to provide a premium spiritual experience.
The app fetches daily Bible readings and AI-generated devotional content.

## Key Links
- **Vercel Deployment**: [https://devocional-pvc.vercel.app](https://devocional-pvc.vercel.app)
- **Supabase Project**: [https://supabase.com/dashboard/project/tayopwdelkmelgmrtnoa](https://supabase.com/dashboard/project/tayopwdelkmelgmrtnoa)

## Core Features & Implementation Details
- **Daily Payload**: The content is served via Supabase.
  - **Table**: `leitura_do_dia` (Base table for daily readings).
  - **View**: `payload_do_dia` (Aggregated view used by the frontend).
- **Edge Functions**: The `/execute` function handles heavy logic.
  - It now reads source material (e.g., `Conhecimento_Compilado_Essencial.v1.4.txt` and `BANCO_DE_OURO_EXEMPLOS.txt`) directly from **Supabase Storage** to generate context-aware responses.
- **Frontend**: Next.js App Router.
  - `src/app/page.tsx`: Dashboard with "Palavra do Dia" and tools grid.
  - `src/app/gerador/page.tsx`: AI devotional generator interface.

## Troubleshooting Notes
- **Payload Updates**: Daily content must exist in `leitura_do_dia`. If missing, the app may fall back to the most recent available date.
- **Startup**: Run with `npm run dev`. Ensure `.env.local` contains valid Supabase keys.
- **Hydration**: Uses `suppressHydrationWarning` in `layout.tsx` to handle client/server mismatches.

## Documentation
Additional project docs and "knowledge memories" are located in the `docs/` folder (if created) or root directory. The AI assistant can read files here to understand broader context.
