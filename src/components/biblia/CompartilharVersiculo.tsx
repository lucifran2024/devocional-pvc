'use client';

import { useEffect, useRef, useState } from 'react';
import { Download, Loader2, Share2, Type, X } from 'lucide-react';
import { gerarImagemDoVersiculo, nomeDoArquivo, type EstiloImagem } from '@/lib/versiculo-imagem';

// Compartilhar o versículo (14/11/2026, função nova): além do texto, o
// versículo sai como imagem no desenho do app (papel ou preto), pronta para o
// WhatsApp, o Status ou a galeria. A imagem é desenhada no aparelho com o
// texto que está na tela; nada vai para servidor.
const ESTILOS: { id: EstiloImagem; nome: string }[] = [
    { id: 'papel', nome: 'Papel' },
    { id: 'preto', nome: 'Preto' },
];

function familiaDe(classe: string): string {
    const amostra = document.createElement('span');
    amostra.className = classe;
    amostra.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none';
    document.body.appendChild(amostra);
    const familia = getComputedStyle(amostra).fontFamily || 'serif';
    amostra.remove();
    return familia;
}

export function CompartilharVersiculo({ texto, referencia, versao, onFechar, onCompartilharTexto, onAviso }: {
    texto: string;
    referencia: string;
    versao: string;
    onFechar: () => void;
    onCompartilharTexto: () => void;
    onAviso: (mensagem: string) => void;
}) {
    const [estilo, setEstilo] = useState<EstiloImagem>('papel');
    // O resultado guarda para qual pedido ele vale: trocar a cor volta a mostrar
    // "montando" sem precisar limpar o estado dentro do efeito.
    const [resultado, setResultado] = useState<{ chave: string; blob?: Blob; url?: string } | null>(null);
    const fecharRef = useRef<HTMLButtonElement>(null);
    const chave = `${estilo}|${referencia}|${versao}|${texto}`;
    const pronto = resultado?.chave === chave ? resultado : null;
    const imagem = pronto?.blob && pronto.url ? { blob: pronto.blob, url: pronto.url } : null;
    const erro = !!pronto && !imagem;

    useEffect(() => {
        let ativo = true;
        let url: string | null = null;
        gerarImagemDoVersiculo({
            texto, referencia, versao, estilo,
            familiaSerif: familiaDe('reading-serif'),
            familiaSans: familiaDe('font-sans'),
        })
            .then((blob) => {
                if (!ativo) return;
                url = URL.createObjectURL(blob);
                setResultado({ chave, blob, url });
            })
            .catch(() => { if (ativo) setResultado({ chave }); });
        return () => {
            ativo = false;
            if (url) URL.revokeObjectURL(url);
        };
    }, [texto, referencia, versao, estilo, chave]);

    // Janela aberta: foco no Fechar, Esc fecha e a página de trás não rola
    useEffect(() => {
        fecharRef.current?.focus();
        const aoTeclar = (e: KeyboardEvent) => { if (e.key === 'Escape') onFechar(); };
        const antes = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', aoTeclar);
        return () => {
            window.removeEventListener('keydown', aoTeclar);
            document.body.style.overflow = antes;
        };
    }, [onFechar]);

    const salvar = () => {
        if (!imagem) return;
        const link = document.createElement('a');
        link.href = imagem.url;
        link.download = nomeDoArquivo(referencia);
        document.body.appendChild(link);
        link.click();
        link.remove();
        onAviso('Imagem salva.');
    };

    const compartilhar = async () => {
        if (!imagem) return;
        const arquivo = new File([imagem.blob], nomeDoArquivo(referencia), { type: 'image/png' });
        if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [arquivo] })) {
            try {
                await navigator.share({ files: [arquivo], title: referencia });
            } catch { /* a pessoa desistiu de compartilhar */ }
            return;
        }
        // Aparelho que não compartilha arquivo: a imagem vai para os downloads
        salvar();
    };

    return (
        <div className="fixed inset-0 z-[80] flex items-end justify-center md:items-center md:p-4">
            <div className="absolute inset-0 animate-[fadeIn_0.15s_ease-out] bg-black/60" onClick={onFechar} aria-hidden="true" />
            <div
                role="dialog"
                aria-modal="true"
                aria-label="Compartilhar versículo"
                className="relative w-full animate-[slideUp_0.22s_cubic-bezier(0.2,0.8,0.2,1)] rounded-t-[28px] bg-surface-1 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-2xl md:max-w-md md:rounded-[28px]"
            >
                <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border-strong md:hidden" aria-hidden="true" />
                <div className="mb-3 flex items-center justify-between px-1">
                    <p className="reading-serif text-[1.25rem] font-medium text-text-primary">Compartilhar {referencia}</p>
                    <button ref={fecharRef} type="button" onClick={onFechar} aria-label="Fechar" className="flex h-11 w-11 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface-2 hover:text-text-primary">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="flex min-h-[220px] items-center justify-center">
                    {imagem ? (
                        // eslint-disable-next-line @next/next/no-img-element -- imagem gerada no aparelho (blob), não passa pelo otimizador
                        <img src={imagem.url} alt={`Imagem com o texto de ${referencia}`} className="max-h-[44dvh] w-auto rounded-2xl" />
                    ) : erro ? (
                        <p role="alert" className="px-4 text-center text-sm text-text-secondary">Não foi possível montar a imagem neste aparelho. O texto ainda pode ser compartilhado.</p>
                    ) : (
                        <Loader2 className="h-6 w-6 animate-spin text-text-muted" aria-label="Montando a imagem" />
                    )}
                </div>

                <div className="mt-3 flex justify-center gap-2" role="group" aria-label="Cor da imagem">
                    {ESTILOS.map((e) => (
                        <button
                            key={e.id}
                            type="button"
                            onClick={() => setEstilo(e.id)}
                            aria-pressed={estilo === e.id}
                            className={`h-11 rounded-full px-5 text-sm font-semibold transition-colors ${estilo === e.id ? 'bg-amber-500/15 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300' : 'bg-surface-0 text-text-secondary hover:text-text-primary dark:bg-surface-2'}`}
                        >
                            {e.nome}
                        </button>
                    ))}
                </div>

                <div className="mt-4 flex flex-col gap-2">
                    <button type="button" onClick={compartilhar} disabled={!imagem} className="flex h-12 items-center justify-center gap-2 rounded-full bg-campo text-[0.9375rem] font-semibold text-campo-texto transition-[opacity,transform] hover:opacity-90 active:scale-[0.98] disabled:opacity-40">
                        <Share2 className="h-[18px] w-[18px]" /> Compartilhar imagem
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                        <button type="button" onClick={salvar} disabled={!imagem} className="flex h-12 items-center justify-center gap-2 rounded-full bg-surface-0 text-sm font-semibold text-text-primary transition-colors hover:bg-surface-2 disabled:opacity-40 dark:bg-surface-2 dark:hover:bg-border-strong/60">
                            <Download className="h-4 w-4" /> Salvar imagem
                        </button>
                        <button type="button" onClick={onCompartilharTexto} className="flex h-12 items-center justify-center gap-2 rounded-full bg-surface-0 text-sm font-semibold text-text-primary transition-colors hover:bg-surface-2 dark:bg-surface-2 dark:hover:bg-border-strong/60">
                            <Type className="h-4 w-4" /> Só o texto
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
