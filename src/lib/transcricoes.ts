import { supabase } from '@/lib/supabase';

// ===========================================
// TRANSCRIÇÕES — salvar/listar (YouTube por link e cultos gravados).
// ===========================================

export type TipoTranscricao = 'youtube' | 'culto';

export interface Transcricao {
    id: string;
    tipo: TipoTranscricao;
    titulo: string | null;
    fonte_url: string | null;
    texto: string;
    notas: string;
    created_at: string;
}

export async function getTranscricoes(tipo?: TipoTranscricao): Promise<Transcricao[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    let q = supabase
        .from('transcricoes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
    if (tipo) q = q.eq('tipo', tipo);

    const { data, error } = await q;
    if (error) {
        console.error('Erro ao buscar transcrições:', error.message);
        return [];
    }
    return (data as Transcricao[]) || [];
}

export async function salvarTranscricao(t: {
    tipo: TipoTranscricao;
    titulo: string;
    fonte_url?: string;
    texto: string;
    notas?: string;
}): Promise<Transcricao | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
        .from('transcricoes')
        .insert({
            user_id: user.id,
            tipo: t.tipo,
            titulo: t.titulo || null,
            fonte_url: t.fonte_url || null,
            texto: t.texto,
            notas: t.notas || '',
        })
        .select()
        .single();

    if (error) {
        console.error('Erro ao salvar transcrição:', error.message);
        return null;
    }
    return data as Transcricao;
}

export async function atualizarNotasTranscricao(id: string, notas: string): Promise<boolean> {
    const { error } = await supabase.from('transcricoes').update({ notas }).eq('id', id);
    if (error) {
        console.error('Erro ao atualizar notas:', error.message);
        return false;
    }
    return true;
}

export async function removerTranscricao(id: string): Promise<boolean> {
    const { error } = await supabase.from('transcricoes').delete().eq('id', id);
    if (error) {
        console.error('Erro ao remover transcrição:', error.message);
        return false;
    }
    return true;
}

// Upload do áudio gravado para o bucket privado, retornando o path.
export async function uploadAudioCulto(blob: Blob, ext: string): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Nome único sem depender de Date.now aleatório (usa timestamp do blob + random do crypto)
    const rand = crypto.randomUUID();
    const path = `${user.id}/${rand}.${ext}`;

    const { error } = await supabase.storage.from('cultos-audio').upload(path, blob, {
        contentType: blob.type || `audio/${ext}`,
        upsert: false,
    });
    if (error) {
        console.error('Erro ao subir áudio:', error.message);
        return null;
    }
    return path;
}
