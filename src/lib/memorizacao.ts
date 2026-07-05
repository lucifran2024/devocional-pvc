import { supabase } from '@/lib/supabase';

// ===========================================
// MEMORIZAÇÃO DE VERSÍCULOS — revisão espaçada.
// nivel 0..5 → próxima revisão em 1, 3, 7, 14, 30, 90 dias.
// Acertou: sobe de nível; errou: volta um nível e revisa amanhã.
// ===========================================

export const INTERVALOS_DIAS = [1, 3, 7, 14, 30, 90];
export const NIVEL_MAX = INTERVALOS_DIAS.length - 1; // 5

export interface VersiculoMemorizacao {
    id: number;
    livro_abrev: string;
    livro_nome: string;
    capitulo: number;
    versiculo: number;
    texto: string;
    versao: string;
    nivel: number;
    acertos: number;
    revisoes: number;
    proxima_revisao: string; // YYYY-MM-DD
    ultima_revisao: string | null;
    created_at: string;
}

function dataLocalISO(diasAFrente: number = 0): string {
    const d = new Date();
    d.setDate(d.getDate() + diasAFrente);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dia}`;
}

export function estaVencido(v: VersiculoMemorizacao): boolean {
    return v.proxima_revisao <= dataLocalISO();
}

export async function getVersiculosMemorizacao(): Promise<VersiculoMemorizacao[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from('versiculos_memorizacao')
        .select('*')
        .eq('user_id', user.id)
        .order('proxima_revisao', { ascending: true });

    if (error) {
        console.error('Erro ao buscar memorização:', error.message);
        return [];
    }
    return (data as VersiculoMemorizacao[]) || [];
}

export async function adicionarVersiculoMemorizacao(v: {
    livro_abrev: string;
    livro_nome: string;
    capitulo: number;
    versiculo: number;
    texto: string;
    versao?: string;
}): Promise<VersiculoMemorizacao | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
        .from('versiculos_memorizacao')
        .insert({
            user_id: user.id,
            livro_abrev: v.livro_abrev,
            livro_nome: v.livro_nome,
            capitulo: v.capitulo,
            versiculo: v.versiculo,
            texto: v.texto,
            versao: v.versao || 'NTLH',
            proxima_revisao: dataLocalISO(),
        })
        .select()
        .single();

    if (error) {
        // 23505 = unique_violation (versículo já está na memorização)
        if (error.code !== '23505') console.error('Erro ao adicionar versículo:', error.message);
        return null;
    }
    return data as VersiculoMemorizacao;
}

/**
 * Registra o resultado de uma revisão e agenda a próxima.
 * Acertou: nivel+1 (até o máximo); errou: nivel-1 (mínimo 0) e revisa amanhã.
 */
export async function registrarRevisao(v: VersiculoMemorizacao, acertou: boolean): Promise<boolean> {
    const novoNivel = acertou
        ? Math.min(v.nivel + 1, NIVEL_MAX)
        : Math.max(v.nivel - 1, 0);
    const dias = acertou ? INTERVALOS_DIAS[novoNivel] : 1;

    const { error } = await supabase
        .from('versiculos_memorizacao')
        .update({
            nivel: novoNivel,
            acertos: v.acertos + (acertou ? 1 : 0),
            revisoes: v.revisoes + 1,
            proxima_revisao: dataLocalISO(dias),
            ultima_revisao: new Date().toISOString(),
        })
        .eq('id', v.id);

    if (error) {
        console.error('Erro ao registrar revisão:', error.message);
        return false;
    }
    return true;
}

export async function removerVersiculoMemorizacao(id: number): Promise<boolean> {
    const { error } = await supabase
        .from('versiculos_memorizacao')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Erro ao remover versículo:', error.message);
        return false;
    }
    return true;
}
