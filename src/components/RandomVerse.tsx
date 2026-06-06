'use client';

import { useState, useCallback } from 'react';
import { RefreshCw, BookOpen, Copy, Check } from 'lucide-react';

// Versículos curados — frases fortes, curtas, compartilháveis
const VERSES = [
    { text: 'O Senhor é o meu pastor; nada me faltará.', ref: 'Salmos 23:1' },
    { text: 'Posso todas as coisas naquele me fortalece.', ref: 'Filipenses 4:13' },
    { text: 'Confia no Senhor de todo o teu coração e não te estribes no teu próprio entendimento.', ref: 'Provérbios 3:5' },
    { text: 'Porque eu bem sei os pensamentos que penso de vós, diz o Senhor; pensamentos de paz e não de mal, para vos dar o fim que esperais.', ref: 'Jeremias 29:11' },
    { text: 'Mas os que esperam no Senhor renovarão as suas forças,levantarão as asas como águias; correrão, e não se cansarão; caminharão, e não se enfadarão.', ref: 'Isaías 40:31' },
    { text: 'Lancem sobre Ele toda a ansiedade, porque Ele cuida de vocês.', ref: '1 Pedro 5:7' },
    { text: 'Perto está o Senhor dos que têm o coração quebrantado; e salva os de espírito oprimido.', ref: 'Salmos 34:18' },
    { text: 'Não temas, porque eu sou contigo; não te assombres, porque eu sou o teu Deus; eu te fortaleço, e te ajudo, e te sustento com a destra da minha justiça.', ref: 'Isaías 41:10' },
    { text: 'Bendirei o Senhor em todo o tempo; o seu louvor estará continuamente na minha boca.', ref: 'Salmos 34:1' },
    { text: 'O Senhor é a minha luz e a minha salvação; a quem temerei?', ref: 'Salmos 27:1' },
    { text: 'E sabemos que todas as coisas contribuem juntamente para o bem daqueles que amam a Deus.', ref: 'Romanos 8:28' },
    { text: 'Porque Deus não nos deu espírito de covardia, mas de poder, de amor e de moderação.', ref: '2 Timóteo 1:7' },
    { text: 'Entrega o teu caminho ao Senhor; confia nele, e ele tudo fará.', ref: 'Salmos 37:5' },
    { text: 'Alegrai-vos sempre no Senhor; outra vez digo, alegrai-vos.', ref: 'Filipenses 4:4' },
    { text: 'Se Deus é por nós, quem será contra nós?', ref: 'Romanos 8:31' },
    { text: 'Clama a mim, e responder-te-ei, e anunciar-te-ei coisas grandes e firmes, que não sabes.', ref: 'Jeremias 33:3' },
    { text: 'O Senhor é bom,fortaleza no dia da tribulação; e conhece os que nele confiam.', ref: 'Naum 1:7' },
    { text: 'Vinde a mim, todos os que estais cansados e sobrecarregados, e eu vos aliviarei.', ref: 'Mateus 11:28' },
    { text: 'Mas buscai primeiro o reino de Deus, e a sua justiça, e todas estas cousas vos serão acrescentadas.', ref: 'Mateus 6:33' },
    { text: 'Porque onde estiverem dois ou três reunidos em meu nome, ali estou no meio deles.', ref: 'Mateus 18:20' },
];

function getDailyIndex(): number {
    // Usa a data como seed para que o versículo do dia seja o mesmo para todos
    const today = new Date();
    const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    return seed % VERSES.length;
}

export function RandomVerse() {
    const [verseIndex, setVerseIndex] = useState(getDailyIndex);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [copied, setCopied] = useState(false);

    const verse = VERSES[verseIndex];

    const handleCopy = useCallback(() => {
        const texto = `📖 *VERSÍCULO DO DIA*\n\n"${verse.text}"\n— ${verse.ref}\n\n📲 _Devocional PVC_`;
        navigator.clipboard.writeText(texto);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }, [verse]);

    const handleRefresh = useCallback(() => {
        setIsRefreshing(true);
        // Escolhe um versículo diferente do atual
        let next = verseIndex;
        while (next === verseIndex) {
            next = Math.floor(Math.random() * VERSES.length);
        }
        setVerseIndex(next);
        setTimeout(() => setIsRefreshing(false), 400);
    }, [verseIndex]);

    return (
        <div className="w-full max-w-2xl mx-auto mt-8">
            <div className="relative glass-panel rounded-2xl p-6 border border-amber-500/10 hover:border-amber-500/20 transition-all group">
                {/* Brilho sutil */}
                <div className="absolute top-0 left-0 w-[200px] h-[200px] bg-amber-500/[0.03] rounded-full blur-[60px] -ml-10 -mt-10 pointer-events-none" />

                <div className="relative z-10">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-amber-500/70" />
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted">
                                Versículo do Dia
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleCopy}
                                className={`p-1.5 rounded-lg transition-all ${
                                    copied
                                        ? 'text-green-500 bg-green-500/10'
                                        : 'text-text-muted hover:text-amber-500 hover:bg-amber-500/10'
                                }`}
                                title="Copiar versículo"
                            >
                                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                            <button
                                onClick={handleRefresh}
                                disabled={isRefreshing}
                                className="p-1.5 rounded-lg hover:bg-amber-500/10 text-text-muted hover:text-amber-500 transition-all"
                                title="Sortear outro versículo"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                    </div>

                    {/* Versículo */}
                    <blockquote className="text-base md:text-lg font-medium text-text-primary leading-relaxed mb-3 italic">
                        &ldquo;{verse.text}&rdquo;
                    </blockquote>

                    {/* Referência */}
                    <cite className="text-xs font-bold text-amber-500/80 tracking-wide not-italic">
                        — {verse.ref}
                    </cite>
                </div>
            </div>
        </div>
    );
}
