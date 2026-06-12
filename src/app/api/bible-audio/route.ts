import { NextResponse } from 'next/server';
import { getUsfmFromLivroId, getTestamento } from '@/lib/bible-usfm';

// ============================================
// ÁUDIO BÍBLICO — Bible Brain (Faith Comes By Hearing)
// Narração humana profissional em português, com timestamps
// por versículo quando disponíveis (destaque tipo "legenda").
// Requer BIBLE_BRAIN_API_KEY (chave gratuita em faithcomesbyhearing.com).
// ============================================

const DBT_BASE = 'https://4.dbt.io/api';
const API_KEY = process.env.BIBLE_BRAIN_API_KEY;
// Opcional: forçar um fileset específico (ex: 'PORARAN1DA')
const FILESET_OVERRIDE = process.env.BIBLE_BRAIN_FILESET;

interface FilesetCandidato {
    id: string;
    type: string;   // 'audio' | 'audio_drama'
    size: string;   // 'C' | 'OT' | 'NT' | ...
    bibleName: string;
}

interface AudioCacheEntry {
    audioUrl: string;
    duracao: number | null;
    timestamps: { verse: number; start: number }[];
    fonte: string;
    expiraEm: number;
}

// Caches em memória (por instância serverless)
let filesetsCache: { candidatos: FilesetCandidato[]; expiraEm: number } | null = null;
const audioCache = new Map<string, AudioCacheEntry>();

const FILESETS_TTL_MS = 6 * 60 * 60 * 1000; // 6h
const AUDIO_TTL_MS = 30 * 60 * 1000;        // 30min (URLs do CDN podem expirar)

async function dbtFetch(path: string): Promise<Record<string, unknown> | null> {
    try {
        const sep = path.includes('?') ? '&' : '?';
        const resp = await fetch(`${DBT_BASE}${path}${sep}v=4&key=${API_KEY}`, {
            headers: { Accept: 'application/json' },
        });
        if (!resp.ok) return null;
        return await resp.json();
    } catch {
        return null;
    }
}

// Descobre filesets de áudio em português, ordenados por preferência:
// narração pura ('audio') antes de dramatizada ('audio_drama'),
// Bíblia completa ('C') antes de testamento parcial.
async function descobrirFilesets(): Promise<FilesetCandidato[]> {
    if (filesetsCache && filesetsCache.expiraEm > Date.now()) {
        return filesetsCache.candidatos;
    }

    const json = await dbtFetch('/bibles?language_code=por&media=audio&limit=50');
    const bibles = (json?.data as Record<string, unknown>[] | undefined) || [];

    const candidatos: FilesetCandidato[] = [];
    for (const bible of bibles) {
        const nome = String(bible.name || bible.abbr || 'Bíblia');
        const filesetGroups = (bible.filesets as Record<string, Record<string, unknown>[]> | undefined) || {};
        for (const grupo of Object.values(filesetGroups)) {
            for (const fs of grupo) {
                const type = String(fs.type || '');
                if (type !== 'audio' && type !== 'audio_drama') continue;
                candidatos.push({
                    id: String(fs.id),
                    type,
                    size: String(fs.size || 'C'),
                    bibleName: nome,
                });
            }
        }
    }

    candidatos.sort((a, b) => {
        // narração pura primeiro
        if (a.type !== b.type) return a.type === 'audio' ? -1 : 1;
        // Bíblia completa primeiro
        if ((a.size === 'C') !== (b.size === 'C')) return a.size === 'C' ? -1 : 1;
        return 0;
    });

    filesetsCache = { candidatos, expiraEm: Date.now() + FILESETS_TTL_MS };
    console.log(`🎧 [BIBLE-AUDIO] ${candidatos.length} filesets pt descobertos`);
    return candidatos;
}

function filesetCobreLivro(fs: FilesetCandidato, testamento: 'OT' | 'NT'): boolean {
    if (fs.size === 'C') return true;
    return fs.size.includes(testamento);
}

async function buscarAudio(
    fs: string,
    book: string,
    chapter: number
): Promise<{ audioUrl: string; duracao: number | null } | null> {
    const json = await dbtFetch(`/bibles/filesets/${fs}/${book}/${chapter}`);
    const data = (json?.data as Record<string, unknown>[] | undefined) || [];
    const item = data[0];
    if (!item?.path) return null;
    return {
        audioUrl: String(item.path),
        duracao: typeof item.duration === 'number' ? item.duration : null,
    };
}

async function buscarTimestamps(
    fs: string,
    book: string,
    chapter: number
): Promise<{ verse: number; start: number }[]> {
    const json = await dbtFetch(`/timestamps/${fs}/${book}/${chapter}`);
    const data = (json?.data as Record<string, unknown>[] | undefined) || [];
    return data
        .map((t) => ({
            verse: parseInt(String(t.verse_start ?? t.verse ?? '0'), 10),
            start: Number(t.timestamp ?? t.timestamp_begin ?? 0),
        }))
        .filter((t) => t.verse > 0 && Number.isFinite(t.start))
        .sort((a, b) => a.start - b.start);
}

export async function GET(request: Request) {
    if (!API_KEY) {
        return NextResponse.json(
            { ok: false, error: 'sem_chave', mensagem: 'BIBLE_BRAIN_API_KEY não configurada' },
            { status: 503 }
        );
    }

    const { searchParams } = new URL(request.url);
    const livroId = parseInt(searchParams.get('livroId') || '0', 10);
    const capitulo = parseInt(searchParams.get('capitulo') || '0', 10);

    const book = getUsfmFromLivroId(livroId);
    if (!book || capitulo < 1) {
        return NextResponse.json({ ok: false, error: 'parametros_invalidos' }, { status: 400 });
    }

    const cacheKey = `${book}/${capitulo}`;
    const cached = audioCache.get(cacheKey);
    if (cached && cached.expiraEm > Date.now()) {
        return NextResponse.json({ ok: true, ...cached });
    }

    try {
        const testamento = getTestamento(livroId);
        let candidatos = await descobrirFilesets();

        if (FILESET_OVERRIDE) {
            candidatos = [
                { id: FILESET_OVERRIDE, type: 'audio', size: 'C', bibleName: 'Configurada' },
                ...candidatos.filter((c) => c.id !== FILESET_OVERRIDE),
            ];
        }

        // Tenta os candidatos em ordem até achar áudio para o capítulo
        for (const fs of candidatos.slice(0, 6)) {
            if (!filesetCobreLivro(fs, testamento)) continue;

            const audio = await buscarAudio(fs.id, book, capitulo);
            if (!audio) continue;

            // Timestamps são opcionais (sem eles o player toca sem destaque)
            const timestamps = await buscarTimestamps(fs.id, book, capitulo);

            const entry: AudioCacheEntry = {
                audioUrl: audio.audioUrl,
                duracao: audio.duracao,
                timestamps,
                fonte: fs.bibleName,
                expiraEm: Date.now() + AUDIO_TTL_MS,
            };
            audioCache.set(cacheKey, entry);

            console.log(`🎧 [BIBLE-AUDIO] ${book} ${capitulo} via ${fs.id} (${timestamps.length} timestamps)`);
            return NextResponse.json({ ok: true, ...entry });
        }

        return NextResponse.json({ ok: false, error: 'sem_audio' }, { status: 404 });
    } catch (e) {
        console.error('🎧 [BIBLE-AUDIO] Erro:', e);
        return NextResponse.json({ ok: false, error: 'erro_interno' }, { status: 500 });
    }
}
