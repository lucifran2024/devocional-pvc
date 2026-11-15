'use client';

import { useEffect } from 'react';
import { correcaoDaTela } from '@/lib/tela-no-lugar';

function digitando(): boolean {
    const el = document.activeElement as HTMLElement | null;
    if (!el) return false;
    return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable;
}

/**
 * Põe a tela de volta no lugar quando o iPhone a deixa deslocada depois do
 * teclado (ver src/lib/tela-no-lugar.ts). Não desenha nada.
 */
export function GuardaDaTela() {
    useEffect(() => {
        const vv = window.visualViewport;
        if (!vv) return;
        const esperas: number[] = [];

        const conferir = () => {
            const rolar = correcaoDaTela({ deslocamento: vv.offsetTop, zoom: vv.scale, digitando: digitando() });
            if (rolar > 0) window.scrollTo(window.scrollX, window.scrollY + rolar);
        };
        // O teclado leva um instante para sair: confere logo e de novo depois
        const agendar = () => {
            for (const ms of [120, 450, 900]) esperas.push(window.setTimeout(conferir, ms));
        };
        const aoVoltar = () => { if (document.visibilityState === 'visible') agendar(); };

        document.addEventListener('focusout', agendar);
        document.addEventListener('visibilitychange', aoVoltar);
        vv.addEventListener('resize', agendar);
        window.addEventListener('pageshow', agendar);
        return () => {
            document.removeEventListener('focusout', agendar);
            document.removeEventListener('visibilitychange', aoVoltar);
            vv.removeEventListener('resize', agendar);
            window.removeEventListener('pageshow', agendar);
            esperas.forEach((t) => window.clearTimeout(t));
        };
    }, []);
    return null;
}
