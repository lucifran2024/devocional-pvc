'use client';

import { useEffect } from 'react';

// "Manter a tela acesa" (14/11/2026): durante a leitura o celular não apaga
// nem bloqueia sozinho (útil lendo em voz alta ou no púlpito). Usa o recurso
// do próprio navegador; onde ele não existe, o botão nem aparece.
export function telaAcesaSuportada(): boolean {
    return typeof navigator !== 'undefined' && 'wakeLock' in navigator;
}

export function useTelaAcesa(ativa: boolean): void {
    useEffect(() => {
        if (!ativa || !telaAcesaSuportada()) return;
        let trava: WakeLockSentinel | null = null;
        let encerrado = false;
        const pedir = async () => {
            try {
                const nova = await navigator.wakeLock.request('screen');
                if (encerrado) { void nova.release(); return; }
                trava = nova;
            } catch {
                /* bateria fraca ou aba em segundo plano: o sistema recusa, sem erro na tela */
            }
        };
        // O sistema solta a trava quando o app vai para o fundo: pede de novo ao voltar
        const aoVoltar = () => { if (document.visibilityState === 'visible') void pedir(); };
        void pedir();
        document.addEventListener('visibilitychange', aoVoltar);
        return () => {
            encerrado = true;
            document.removeEventListener('visibilitychange', aoVoltar);
            void trava?.release().catch(() => { /* já solta */ });
        };
    }, [ativa]);
}
