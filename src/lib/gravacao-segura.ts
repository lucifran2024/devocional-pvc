import { openDB, type IDBPDatabase } from 'idb';

// ============================================
// GRAVAÇÃO SEGURA — cópia da gravação do culto no próprio aparelho.
// Cada pedaço de 5 s do gravador é guardado no IndexedDB enquanto grava.
// Se o app fechar, o celular travar ou a internet cair no envio, a
// gravação continua lá e pode ser transcrita depois. A cópia é apagada
// quando o áudio chega inteiro ao servidor.
// ============================================

const BANCO = 'pvc-gravacoes';
const PEDACOS = 'pedacos';

interface Pedaco {
    sessao: string;
    seq: number;
    blob: Blob;
    mime: string;
    ext: string;
    criadoEm: number;
}

export interface GravacaoGuardada {
    sessao: string;
    pedacos: number;
    bytes: number;
    mime: string;
    ext: string;
    criadoEm: number;
}

let banco: Promise<IDBPDatabase> | null = null;

function abrir(): Promise<IDBPDatabase> {
    if (!banco) {
        banco = openDB(BANCO, 1, {
            upgrade(db) {
                const loja = db.createObjectStore(PEDACOS, { keyPath: ['sessao', 'seq'] });
                loja.createIndex('sessao', 'sessao');
            },
        });
    }
    return banco;
}

export async function guardarPedaco(sessao: string, seq: number, blob: Blob, mime: string, ext: string): Promise<void> {
    try {
        const db = await abrir();
        await db.put(PEDACOS, { sessao, seq, blob, mime, ext, criadoEm: Date.now() } satisfies Pedaco);
    } catch {
        // sem IndexedDB (aba privada etc.): a gravação segue só na memória
    }
}

export async function gravacoesGuardadas(): Promise<GravacaoGuardada[]> {
    try {
        const db = await abrir();
        const todos = (await db.getAll(PEDACOS)) as Pedaco[];
        const porSessao = new Map<string, GravacaoGuardada>();
        for (const p of todos) {
            const g = porSessao.get(p.sessao) ?? { sessao: p.sessao, pedacos: 0, bytes: 0, mime: p.mime, ext: p.ext, criadoEm: p.criadoEm };
            g.pedacos += 1;
            g.bytes += p.blob.size;
            g.criadoEm = Math.min(g.criadoEm, p.criadoEm);
            porSessao.set(p.sessao, g);
        }
        return [...porSessao.values()].sort((a, b) => b.criadoEm - a.criadoEm);
    } catch {
        return [];
    }
}

export async function juntarGravacao(sessao: string): Promise<Blob | null> {
    try {
        const db = await abrir();
        const pedacos = ((await db.getAllFromIndex(PEDACOS, 'sessao', sessao)) as Pedaco[]).sort((a, b) => a.seq - b.seq);
        if (pedacos.length === 0) return null;
        return new Blob(pedacos.map(p => p.blob), { type: pedacos[0].mime || `audio/${pedacos[0].ext}` });
    } catch {
        return null;
    }
}

export async function apagarGravacao(sessao: string): Promise<void> {
    try {
        const db = await abrir();
        const chaves = await db.getAllKeysFromIndex(PEDACOS, 'sessao', sessao);
        const tx = db.transaction(PEDACOS, 'readwrite');
        await Promise.all([...chaves.map(k => tx.store.delete(k)), tx.done]);
    } catch {
        // nada a fazer: a cópia fica até a próxima tentativa
    }
}

// 48 kbps → 6 KB por segundo
export function minutosAproximados(bytes: number): number {
    return Math.max(1, Math.round(bytes / 6000 / 60));
}
