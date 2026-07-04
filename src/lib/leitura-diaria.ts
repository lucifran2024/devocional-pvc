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

// Total de dias do plano = número de datas no SECAO6.TXT (Storage), que é a
// fonte real do plano de leitura (o payload_do_dia é só fallback e fica atrás).
// O arquivo é pequeno (~12KB) e o plano é fixo, então cacheia por sessão.
let _totalDiasCache: number | null = null;

export async function getTotalDiasPlano(): Promise<number> {
    if (_totalDiasCache !== null) return _totalDiasCache;
    try {
        const { data, error } = await supabase.storage
            .from('pvc')
            .download('secao6/SECAO6.TXT');
        if (error || !data) throw error || new Error('sem_arquivo');

        let texto: string;
        try {
            texto = await data.text();
        } catch {
            texto = new TextDecoder('windows-1252').decode(await data.arrayBuffer());
        }
        const matches = texto.match(/^\d{4}-\d{2}-\d{2}\s*\|/gm);
        const total = matches ? matches.length : 0;
        if (total > 0) {
            _totalDiasCache = total;
            return total;
        }
    } catch (e) {
        console.error('Erro ao contar dias do plano (SECAO6):', e);
    }

    // Fallback: total de leituras no banco
    const { count } = await supabase
        .from('payload_do_dia')
        .select('data', { count: 'exact', head: true });
    return count ?? 0;
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

    const [lidasRes, total] = await Promise.all([
        supabase
            .from('leitura_diaria_lida')
            .select('data')
            .eq('user_id', user.id),
        getTotalDiasPlano(),
    ]);

    const datasLidas = (lidasRes.data || []).map((r: { data: string }) => r.data);
    const lidos = datasLidas.length;
    const pct = total > 0 ? Math.round((lidos / total) * 100) : 0;

    return { lidos, total, pct, datasLidas };
}
