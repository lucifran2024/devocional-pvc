'use client';

import { useEffect, useState } from 'react';
import { Check, Copy, Edit3, Loader2, Save, X } from 'lucide-react';
import { atualizarTextoTranscricao } from '@/lib/transcricoes';

export function SavedTranscriptEditor({ id, texto, onSaved }: { id: string; texto: string; onSaved?: (texto: string) => void }) {
    const [textoExibido, setTextoExibido] = useState(texto);
    const [editando, setEditando] = useState(false);
    const [rascunho, setRascunho] = useState(texto);
    const [copiado, setCopiado] = useState(false);
    const [salvando, setSalvando] = useState(false);
    const [mensagem, setMensagem] = useState('');

    useEffect(() => {
        setTextoExibido(texto);
        setRascunho(texto);
    }, [texto]);

    const copiar = async () => {
        await navigator.clipboard.writeText(editando ? rascunho : textoExibido);
        setCopiado(true);
        setTimeout(() => setCopiado(false), 1800);
    };

    const salvar = async () => {
        if (!rascunho.trim() || salvando) return;
        setSalvando(true);
        const ok = await atualizarTextoTranscricao(id, rascunho);
        setSalvando(false);
        if (!ok) {
            setMensagem('Não foi possível salvar. Tente novamente.');
            return;
        }
        const limpo = rascunho.trim();
        setTextoExibido(limpo);
        onSaved?.(limpo);
        setRascunho(limpo);
        setMensagem('Alterações salvas.');
        setEditando(false);
        setTimeout(() => setMensagem(''), 2200);
    };

    const cancelar = () => {
        setRascunho(textoExibido);
        setMensagem('');
        setEditando(false);
    };

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
                <button type="button" onClick={copiar} className="px-3 py-1.5 rounded-lg border border-border-subtle text-xs font-semibold text-text-secondary hover:text-amber-600 hover:bg-amber-500/10 flex items-center gap-1.5">
                    {copiado ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiado ? 'Copiado' : 'Copiar'}
                </button>
                {!editando ? (
                    <button type="button" onClick={() => setEditando(true)} className="px-3 py-1.5 rounded-lg border border-border-subtle text-xs font-semibold text-text-secondary hover:text-amber-600 hover:bg-amber-500/10 flex items-center gap-1.5">
                        <Edit3 className="w-3.5 h-3.5" /> Editar
                    </button>
                ) : (
                    <>
                        <button type="button" onClick={salvar} disabled={salvando || !rascunho.trim()} className="px-3 py-1.5 rounded-lg bg-amber-500 text-amber-950 text-xs font-bold disabled:opacity-50 flex items-center gap-1.5">
                            {salvando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Salvar alterações
                        </button>
                        <button type="button" onClick={cancelar} className="px-3 py-1.5 rounded-lg border border-border-subtle text-xs font-semibold text-text-muted flex items-center gap-1.5">
                            <X className="w-3.5 h-3.5" /> Cancelar
                        </button>
                    </>
                )}
            </div>
            {editando ? (
                <textarea value={rascunho} onChange={(e) => setRascunho(e.target.value)} rows={12}
                    className="w-full px-3 py-2 rounded-lg bg-surface-2 border border-border-subtle text-text-primary text-sm leading-relaxed resize-y focus:outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20" />
            ) : (
                <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap max-h-[40vh] overflow-y-auto">{textoExibido}</p>
            )}
            {mensagem && <p className={`text-xs ${mensagem.includes('salvas') ? 'text-emerald-600' : 'text-red-500'}`}>{mensagem}</p>}
        </div>
    );
}
