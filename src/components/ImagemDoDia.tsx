'use client';

import { useState } from 'react';
import Image from 'next/image';
import { IMAGEM_RESERVA, getImagemDoDia, urlImagem } from '@/lib/imagem-do-dia';

const TAMANHOS = '(max-width: 768px) 100vw, 50vw';

// Foto do topo do início: uma diferente a cada dia. Enquanto carrega mostra
// um fundo neutro; sem internet (ou se a foto sair do ar) fica a do app.
export function ImagemDoDia() {
    const [foto] = useState(() => getImagemDoDia());
    const [pronta, setPronta] = useState(false);
    const [falhou, setFalhou] = useState(false);
    const usarReserva = !!foto.local || falhou;

    return (
        <div className="relative min-h-36 overflow-hidden bg-linear-to-br from-amber-100 to-emerald-100 md:min-h-80 dark:from-surface-2 dark:to-surface-2">
            {usarReserva ? (
                <Image src={IMAGEM_RESERVA.src} alt={foto.local ? foto.alt : IMAGEM_RESERVA.alt} fill sizes={TAMANHOS} className="object-cover" priority />
            ) : (
                // eslint-disable-next-line @next/next/no-img-element -- foto do Unsplash já otimizada por eles; a do app é a reserva
                <img
                    ref={(img) => { if (img?.complete && img.naturalWidth > 0) setPronta(true); }}
                    src={urlImagem(foto.id, 1200)}
                    srcSet={`${urlImagem(foto.id, 800)} 800w, ${urlImagem(foto.id, 1200)} 1200w, ${urlImagem(foto.id, 1600)} 1600w`}
                    sizes={TAMANHOS}
                    alt={foto.alt}
                    decoding="async"
                    fetchPriority="high"
                    referrerPolicy="no-referrer"
                    onLoad={() => setPronta(true)}
                    onError={() => setFalhou(true)}
                    className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 motion-reduce:transition-none ${pronta ? 'opacity-100' : 'opacity-0'}`}
                />
            )}
        </div>
    );
}
