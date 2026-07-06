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

// ===========================================
// MARCAÇÃO POR PARTE
// partes_lidas NULL = dia marcado inteiro (legado / botão antigo).
// O dia conta como lido quando todas as partes foram marcadas.
// ===========================================

export interface LeituraDia {
    existe: boolean;
    partesLidas: number[] | null;
    totalPartes: number | null;
}

export async function getLeituraDia(data: string): Promise<LeituraDia> {
    const vazio: LeituraDia = { existe: false, partesLidas: null, totalPartes: null };
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return vazio;

    const { data: row, error } = await supabase
        .from('leitura_diaria_lida')
        .select('partes_lidas, total_partes')
        .eq('user_id', user.id)
        .eq('data', data)
        .maybeSingle();

    if (error) {
        console.error('Erro ao buscar leitura do dia:', error.message);
        return vazio;
    }
    if (!row) return vazio;
    return {
        existe: true,
        partesLidas: (row.partes_lidas as number[] | null) ?? null,
        totalPartes: (row.total_partes as number | null) ?? null,
    };
}

export async function marcarParteLida(data: string, parte: number, totalPartes: number): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const atual = await getLeituraDia(data);
    // Registro legado (dia inteiro): considera todas as partes já lidas
    const base = atual.existe && atual.partesLidas === null
        ? Array.from({ length: totalPartes }, (_, i) => i + 1)
        : (atual.partesLidas || []);
    const partes = [...new Set([...base, parte])].sort((a, b) => a - b);

    const { error } = await supabase
        .from('leitura_diaria_lida')
        .upsert(
            { user_id: user.id, data, partes_lidas: partes, total_partes: totalPartes },
            { onConflict: 'user_id,data' }
        );

    if (error) {
        console.error('Erro ao marcar parte lida:', error.message);
        return false;
    }
    return true;
}

export async function desmarcarParteLida(data: string, parte: number, totalPartes: number): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const atual = await getLeituraDia(data);
    if (!atual.existe) return true;

    const base = atual.partesLidas === null
        ? Array.from({ length: totalPartes }, (_, i) => i + 1)
        : atual.partesLidas;
    const partes = base.filter(p => p !== parte);

    if (partes.length === 0) {
        return desmarcarLeituraDiaria(data);
    }

    const { error } = await supabase
        .from('leitura_diaria_lida')
        .upsert(
            { user_id: user.id, data, partes_lidas: partes, total_partes: totalPartes },
            { onConflict: 'user_id,data' }
        );

    if (error) {
        console.error('Erro ao desmarcar parte:', error.message);
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
            .select('data, partes_lidas, total_partes')
            .eq('user_id', user.id),
        getTotalDiasPlano(),
    ]);

    // Dia completo = registro legado (sem partes) OU todas as partes lidas
    const datasLidas = (lidasRes.data || [])
        .filter((r: { partes_lidas: number[] | null; total_partes: number | null }) =>
            r.partes_lidas === null || r.partes_lidas.length >= (r.total_partes || 1))
        .map((r: { data: string }) => r.data);
    const lidos = datasLidas.length;
    const pct = total > 0 ? Math.round((lidos / total) * 100) : 0;

    return { lidos, total, pct, datasLidas };
}
