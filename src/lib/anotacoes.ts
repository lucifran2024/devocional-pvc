import { supabase } from '@/lib/supabase';

// ===========================================
// ANOTAÇÕES LIVRES (caderno) — CRUD.
// As anotações "da Bíblia" (notas/favoritos de versículos) usam as funções
// já existentes getAllInteracoesPorTipo em supabase.ts.
// ===========================================

export interface AnotacaoLivre {
    id: string;
    titulo: string | null;
    texto: string;
    created_at: string;
    updated_at: string;
}

export async function getAnotacoesLivres(): Promise<AnotacaoLivre[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from('anotacoes_livres')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

    if (error) {
        console.error('Erro ao buscar anotações livres:', error.message);
        return [];
    }
    return (data as AnotacaoLivre[]) || [];
}

export async function criarAnotacaoLivre(titulo: string, texto: string): Promise<AnotacaoLivre | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
        .from('anotacoes_livres')
        .insert({ user_id: user.id, titulo: titulo || null, texto })
        .select()
        .single();

    if (error) {
        console.error('Erro ao criar anotação:', error.message);
        return null;
    }
    return data as AnotacaoLivre;
}

export async function atualizarAnotacaoLivre(id: string, titulo: string, texto: string): Promise<boolean> {
    const { error } = await supabase
        .from('anotacoes_livres')
        .update({ titulo: titulo || null, texto, updated_at: new Date().toISOString() })
        .eq('id', id);

    if (error) {
        console.error('Erro ao atualizar anotação:', error.message);
        return false;
    }
    return true;
}

export async function removerAnotacaoLivre(id: string): Promise<boolean> {
    const { error } = await supabase
        .from('anotacoes_livres')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Erro ao remover anotação:', error.message);
        return false;
    }
    return true;
}
