import { NextResponse } from 'next/server';
import { getUsfmFromLivroId, getTestamento } from '@/lib/bible-usfm';

// ============================================
// ÁUDIO BÍBLICO — suporta dois provedores:
//
// 1. API.Bible (American Bible Society) — RECOMENDADO para começar
//    Registro gratuito e acesso imediato em scripture.api.bible
//    Env var: API_BIBLE_KEY
//
// 2. Bible Brain (Faith Comes By Hearing) — tem timestamps por versículo
//    Requer aprovação manual (~1 semana)
//    Env var: BIBLE_BRAIN_API_KEY
//
// Se ambas estiverem configuradas, API.Bible tem prioridade.
// Se nenhuma estiver configurada, retorna 503 e o botão fica oculto.
// ============================================

// --- API.Bible ---
const API_BIBLE_KEY = process.env.API_BIBLE_KEY;
const APIBIBLE_BASE = 'https://api.scripture.api.bible/v1';

// --- Bible Brain ---
const BBT_API_KEY = process.env.BIBLE_BRAIN_API_KEY;
const DBT_BASE = 'https://4.dbt.io/api';
const FILESET_OVERRIDE = process.env.BIBLE_BRAIN_FILESET;

interface AudioCacheEntry {
    audioUrl: string;
    duracao: number | null;
    timestamps: { verse: number; start: number }[];
    fonte: string;
    expiraEm: number;
}

const audioCache = new Map<string, AudioCacheEntry>();
const AUDIO_TTL_MS = 30 * 60 * 1000; // 30min

// ---------- API.Bible ----------

interface ApiBibleInfo { id: string; name: string }
let apiBibleCache: { info: ApiBibleInfo; expiraEm: number } | null = null;

async function apiBibleFetch(path: string): Promise<Record<string, unknown> | null> {
    try {
        const resp = await fetch(`${APIBIBLE_BASE}${path}`, {
            headers: { 'api-key': API_BIBLE_KEY!, 'Accept': 'application/json' },
        });
        if (!resp.ok) return null;
        return await resp.json();
    } catch {
        return null;
    }
}

async function descobrirApiBible(): Promise<ApiBibleInfo | null> {
    const now = Date.now();
    if (apiBibleCache && apiBibleCache.expiraEm > now) return apiBibleCache.info;

    const json = await apiBibleFetch('/audio-bibles?language=por&limit=30');
    const bibles = (json?.data as Record<string, unknown>[] | undefined) || [];
    if (bibles.length === 0) return null;

    // Prefere versão Almeida; senão pega a primeira
    const almeida = bibles.find(b =>
        String(b.name || b.nameLocal || '').toLowerCase().includes('almeida')
    );
    const chosen = almeida || bibles[0];
    const info: ApiBibleInfo = {
        id: String(chosen.id),
        name: String(chosen.nameLocal || chosen.name || 'Bíblia em Português'),
    };
    apiBibleCache = { info, expiraEm: now + 6 * 60 * 60 * 1000 };
    console.log(`🎧 [BIBLE-AUDIO] API.Bible: ${info.name} (${info.id})`);
    return info;
}

async function buscarViaApiBible(
    book: string,
    chapter: number
): Promise<AudioCacheEntry | null> {
    const bible = await descobrirApiBible();
    if (!bible) return null;

    const chapterId = `${book}.${chapter}`;
    const json = await apiBibleFetch(`/audio-bibles/${bible.id}/chapters/${chapterId}`);
    const data = json?.data as Record<string, unknown> | undefined;
    if (!data) return null;

    // A URL pode estar em diferentes campos dependendo da versão da API
    const audioBlock = data.audio as Record<string, unknown> | undefined;
    const url = String(audioBlock?.url ?? data.url ?? data.path ?? '');
    if (!url || !url.startsWith('http')) return null;

    console.log(`🎧 [BIBLE-AUDIO] ${book} ${chapter} via API.Bible`);
    return {
        audioUrl: url,
        duracao: null,
        timestamps: [], // API.Bible não fornece timestamps por versículo
        fonte: bible.name,
        expiraEm: Date.now() + AUDIO_TTL_MS,
    };
}

// ---------- Bible Brain ----------

interface FilesetCandidato {
    id: string;
    type: string;
    size: string;
    bibleName: string;
}
let filesetsCache: { candidatos: FilesetCandidato[]; expiraEm: number } | null = null;

async function dbtFetch(path: string): Promise<Record<string, unknown> | null> {
    try {
        const sep = path.includes('?') ? '&' : '?';
        const resp = await fetch(`${DBT_BASE}${path}${sep}v=4&key=${BBT_API_KEY}`, {
            headers: { Accept: 'application/json' },
        });
        if (!resp.ok) return null;
        return await resp.json();
    } catch {
        return null;
    }
}

async function descobrirFilesets(): Promise<FilesetCandidato[]> {
    if (filesetsCache && filesetsCache.expiraEm > Date.now()) return filesetsCache.candidatos;

    const json = await dbtFetch('/bibles?language_code=por&media=audio&limit=50');
    const bibles = (json?.data as Record<string, unknown>[] | undefined) || [];
    const candidatos: FilesetCandidato[] = [];

    for (const bible of bibles) {
        const nome = String(bible.name || bible.abbr || 'Bíblia');
        const groups = (bible.filesets as Record<string, Record<string, unknown>[]> | undefined) || {};
        for (const grupo of Object.values(groups)) {
            for (const fs of grupo) {
                const type = String(fs.type || '');
                if (type !== 'audio' && type !== 'audio_drama') continue;
                candidatos.push({ id: String(fs.id), type, size: String(fs.size || 'C'), bibleName: nome });
            }
        }
    }

    candidatos.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'audio' ? -1 : 1;
        if ((a.size === 'C') !== (b.size === 'C')) return a.size === 'C' ? -1 : 1;
        return 0;
    });

    filesetsCache = { candidatos, expiraEm: Date.now() + 6 * 60 * 60 * 1000 };
    console.log(`🎧 [BIBLE-AUDIO] Bible Brain: ${candidatos.length} filesets pt`);
    return candidatos;
}

async function buscarViaBibleBrain(
    book: string,
    chapter: number,
    testamento: 'OT' | 'NT'
): Promise<AudioCacheEntry | null> {
    let candidatos = await descobrirFilesets();
    if (FILESET_OVERRIDE) {
        candidatos = [
            { id: FILESET_OVERRIDE, type: 'audio', size: 'C', bibleName: 'Configurada' },
            ...candidatos.filter(c => c.id !== FILESET_OVERRIDE),
        ];
    }

    for (const fs of candidatos.slice(0, 6)) {
        const cobre = fs.size === 'C' || fs.size.includes(testamento);
        if (!cobre) continue;

        const audioJson = await dbtFetch(`/bibles/filesets/${fs.id}/${book}/${chapter}`);
        const audioData = (audioJson?.data as Record<string, unknown>[] | undefined) || [];
        const item = audioData[0];
        if (!item?.path) continue;

        const tsJson = await dbtFetch(`/timestamps/${fs.id}/${book}/${chapter}`);
        const tsData = (tsJson?.data as Record<string, unknown>[] | undefined) || [];
        const timestamps = tsData
            .map(t => ({
                verse: parseInt(String(t.verse_start ?? t.verse ?? '0'), 10),
                start: Number(t.timestamp ?? t.timestamp_begin ?? 0),
            }))
            .filter(t => t.verse > 0 && Number.isFinite(t.start))
            .sort((a, b) => a.start - b.start);

        console.log(`🎧 [BIBLE-AUDIO] ${book} ${chapter} via Bible Brain ${fs.id} (${timestamps.length} timestamps)`);
        return {
            audioUrl: String(item.path),
            duracao: typeof item.duration === 'number' ? item.duration : null,
            timestamps,
            fonte: fs.bibleName,
            expiraEm: Date.now() + AUDIO_TTL_MS,
        };
    }
    return null;
}

// ---------- Handler principal ----------

export async function GET(request: Request) {
    const temChave = API_BIBLE_KEY || BBT_API_KEY;
    if (!temChave) {
        return NextResponse.json(
            { ok: false, error: 'sem_chave', mensagem: 'Configure API_BIBLE_KEY ou BIBLE_BRAIN_API_KEY' },
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

        // Tenta API.Bible primeiro (acesso imediato), depois Bible Brain (com timestamps)
        let entry: AudioCacheEntry | null = null;
        if (API_BIBLE_KEY) entry = await buscarViaApiBible(book, capitulo);
        if (!entry && BBT_API_KEY) entry = await buscarViaBibleBrain(book, capitulo, testamento);

        if (!entry) {
            return NextResponse.json({ ok: false, error: 'sem_audio' }, { status: 404 });
        }

        audioCache.set(cacheKey, entry);
        return NextResponse.json({ ok: true, ...entry });
    } catch (e) {
        console.error('🎧 [BIBLE-AUDIO] Erro:', e);
        return NextResponse.json({ ok: false, error: 'erro_interno' }, { status: 500 });
    }
}
