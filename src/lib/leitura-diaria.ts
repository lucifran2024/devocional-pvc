import { supabase } from '@/lib/supabase';

// ===========================================
// LEITURA DIÁRIA — marcação de "lido" por data e progresso anual.
// A leitura do dia pessoal é um ciclo de N dias (tabela payload_do_dia).
// Cada dia lido é registrado em leitura_diaria_lida (por data + usuário),
// para sincronizar entre dispositivos.
// ===========================================

export interface ProgressoLeituraAnual {
    lidos: number;
    total: number;
    pct: number;
    datasLidas: string[];
}

export async function marcarLeituraDiaria(data: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
        .from('leitura_diaria_lida')
        .upsert({ user_id: user.id, data }, { onConflict: 'user_id,data' });

    if (error) {
        console.error('Erro ao marcar leitura diária:', error.message);
        return false;
    }
    return true;
}

export async function desmarcarLeituraDiaria(data: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
        .from('leitura_diaria_lida')
        .delete()
        .eq('user_id', user.id)
        .eq('data', data);

    if (error) {
        console.error('Erro ao desmarcar leitura diária:', error.message);
        return false;
    }
    return true;
}

/**
 * Progresso anual: quantos dias o usuário já leu de todo o ciclo de leituras.
 * O total é o número de dias cadastrados em payload_do_dia.
 */
export async function getProgressoLeituraAnual(): Promise<ProgressoLeituraAnual> {
    const vazio: ProgressoLeituraAnual = { lidos: 0, total: 0, pct: 0, datasLidas: [] };

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return vazio;

    const [lidasRes, totalRes] = await Promise.all([
        supabase
            .from('leitura_diaria_lida')
            .select('data')
            .eq('user_id', user.id),
        supabase
            .from('payload_do_dia')
            .select('data', { count: 'exact', head: true }),
    ]);

    const datasLidas = (lidasRes.data || []).map((r: { data: string }) => r.data);
    const lidos = datasLidas.length;
    const total = totalRes.count ?? 0;
    const pct = total > 0 ? Math.round((lidos / total) * 100) : 0;

    return { lidos, total, pct, datasLidas };
}
