'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
    REFERENCIAS_DO_DIA,
    buscarTextoVersiculo,
    dataLocal,
    getDailyVerseRef,
} from '@/lib/daily-verse';

// Versículo de hoje guardado no aparelho: o cartão abre na hora (e sem internet).
export const VERSICULO_LOCAL_KEY = 'versiculo-do-dia-local';

interface Guardado {
    data: string;
    ref: string;
    texto: string;
}

export interface EstadoVersiculo {
    ref: string;
    texto: string | null;
    carregando: boolean;
    falhou: boolean;
    /** true = versículo de hoje; false = outro, sorteado pela pessoa */
    doDia: boolean;
}

function lerGuardado(): Guardado | null {
    try {
        const bruto = JSON.parse(localStorage.getItem(VERSICULO_LOCAL_KEY) || 'null');
        if (bruto && typeof bruto.data === 'string' && typeof bruto.ref === 'string' && typeof bruto.texto === 'string' && bruto.texto) {
            return bruto as Guardado;
        }
    } catch { /* sem armazenamento ou valor inválido */ }
    return null;
}

function guardar(v: Guardado) {
    try {
        localStorage.setItem(VERSICULO_LOCAL_KEY, JSON.stringify(v));
    } catch { /* armazenamento cheio ou bloqueado */ }
}

function estadoInicial(): EstadoVersiculo {
    const hoje = dataLocal();
    const ref = getDailyVerseRef(hoje);
    const guardado = typeof window !== 'undefined' ? lerGuardado() : null;
    if (guardado && guardado.data === hoje && guardado.ref === ref) {
        return { ref, texto: guardado.texto, carregando: false, falhou: false, doDia: true };
    }
    return { ref, texto: null, carregando: true, falhou: false, doDia: true };
}

export function useVersiculoDoDia() {
    const [estado, setEstado] = useState<EstadoVersiculo>(estadoInicial);
    const pedido = useRef(0);

    // Busca o texto; só atualiza a tela se ainda for o pedido mais recente.
    const buscar = useCallback(async (ref: string, doDia: boolean) => {
        const meu = ++pedido.current;
        const texto = await buscarTextoVersiculo(ref);
        if (meu !== pedido.current) return;
        if (texto) {
            setEstado({ ref, texto, carregando: false, falhou: false, doDia });
            if (doDia) {
                guardar({ data: dataLocal(), ref, texto });
                // Deixa os próximos dois dias guardados para abrir sem internet
                for (const dias of [1, 2]) buscarTextoVersiculo(getDailyVerseRef(dataLocal(dias))).catch(() => { });
            }
        } else {
            setEstado({ ref, texto: null, carregando: false, falhou: true, doDia });
        }
    }, []);

    useEffect(() => {
        if (estado.texto === null && estado.carregando) buscar(estado.ref, estado.doDia);
        // só na abertura: as trocas seguintes vêm dos botões
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const carregar = useCallback((ref: string, doDia: boolean) => {
        setEstado({ ref, texto: null, carregando: true, falhou: false, doDia });
        buscar(ref, doDia);
    }, [buscar]);

    const sortear = useCallback(() => {
        const opcoes = REFERENCIAS_DO_DIA.filter((r) => r !== estado.ref && r !== getDailyVerseRef(dataLocal()));
        carregar(opcoes[Math.floor(Math.random() * opcoes.length)], false);
    }, [carregar, estado.ref]);

    const voltarAoDeHoje = useCallback(() => {
        const hoje = dataLocal();
        const ref = getDailyVerseRef(hoje);
        const guardado = lerGuardado();
        if (guardado && guardado.data === hoje && guardado.ref === ref) {
            pedido.current++;
            setEstado({ ref, texto: guardado.texto, carregando: false, falhou: false, doDia: true });
        } else {
            carregar(ref, true);
        }
    }, [carregar]);

    const tentarDeNovo = useCallback(() => carregar(estado.ref, estado.doDia), [carregar, estado.ref, estado.doDia]);

    return { ...estado, sortear, voltarAoDeHoje, tentarDeNovo };
}
