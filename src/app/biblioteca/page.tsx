'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
    Book, ChevronLeft, ChevronRight, ArrowLeft, Loader2, X,
    Heart, Copy, Share2, Lightbulb, Palette, StickyNote,
    Search, BookmarkIcon, Trash2, ChevronDown, Plus, Minus, Languages,
    CheckSquare, Square, XCircle, Wifi, WifiOff, Database, Download,
    BookmarkCheck
} from 'lucide-react';
import { CosmicBackground } from '@/components/ui/CosmicBackground';
import { useToast } from '@/hooks/useToast';
import { ToastContainer } from '@/components/ui/ToastContainer';
import { getCachedChapter, cacheChapter, searchVersesLocal } from '@/lib/bible-db';
import { OfflineManager } from './components/OfflineManager';
import { useOfflineInteractions } from './hooks/useOfflineInteractions';
import {
    getAllInteracoesPorTipo,
    salvarHistoricoLeitura,
    getUltimaLeitura,
    type BibliaInteracao
} from '@/lib/supabase';

// Mapa reverso: bookId → nome em português (para fallback bible-api.com)
const ID_PARA_NOME_BIBLIA: Record<number, string> = {
    1: 'Gênesis', 2: 'Êxodo', 3: 'Levítico', 4: 'Números', 5: 'Deuteronômio', 6: 'Josué', 7: 'Juízes', 8: 'Rute',
    9: '1 Samuel', 10: '2 Samuel', 11: '1 Reis', 12: '2 Reis', 13: '1 Crônicas', 14: '2 Crônicas',
    15: 'Esdras', 16: 'Neemias', 17: 'Ester', 18: 'Jó', 19: 'Salmos', 20: 'Provérbios', 21: 'Eclesiastes',
    22: 'Cantares', 23: 'Isaías', 24: 'Jeremias', 25: 'Lamentações', 26: 'Ezequiel', 27: 'Daniel',
    28: 'Oséias', 29: 'Joel', 30: 'Amós', 31: 'Obadias', 32: 'Jonas', 33: 'Miquéias', 34: 'Naum',
    35: 'Habacuque', 36: 'Sofonias', 37: 'Ageu', 38: 'Zacarias', 39: 'Malaquias', 40: 'Mateus',
    41: 'Marcos', 42: 'Lucas', 43: 'João', 44: 'Atos', 45: 'Romanos', 46: '1 Coríntios', 47: '2 Coríntios',
    48: 'Gálatas', 49: 'Efésios', 50: 'Filipenses', 51: 'Colossenses', 52: '1 Tessalonicenses',
    53: '2 Tessalonicenses', 54: '1 Timóteo', 55: '2 Timóteo', 56: 'Tito', 57: 'Filemom',
    58: 'Hebreus', 59: 'Tiago', 60: '1 Pedro', 61: '2 Pedro', 62: '1 João', 63: '2 João',
    64: '3 João', 65: 'Judas', 66: 'Apocalipse'
};

/**
 * Busca capítulo com fallback: tenta bolls.life (5s timeout), se falhar usa bible-api.com
 */
async function fetchBibliaComFallback(
    bookId: number, cap: number, versaoCodigo?: string
): Promise<{ verse: number; text: string }[]> {
    // Tentar API primária (bolls.life) com timeout
    const codigo = versaoCodigo || 'NTLH';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
        const resp = await fetch(
            `https://bolls.life/get-chapter/${codigo}/${bookId}/${cap}/`,
            { signal: controller.signal }
        );
        if (resp.ok) {
            const data = await resp.json();
            if (Array.isArray(data) && data.length > 0) return data;
        }
    } catch { /* timeout ou erro */ } finally { clearTimeout(timeout); }

    // Fallback: bible-api.com (tradução Almeida, sem versão específica)
    const nomeLivro = ID_PARA_NOME_BIBLIA[bookId];
    if (!nomeLivro) return [];
    try {
        console.log('🔄 [BIBLIA-FALLBACK] Buscando:', nomeLivro, cap);
        const resp = await fetch(
            `https://bible-api.com/${encodeURIComponent(nomeLivro)}+${cap}?translation=almeida`
        );
        if (resp.ok) {
            const data = await resp.json();
            if (data.verses && Array.isArray(data.verses)) {
                return data.verses.map((v: { verse: number; text: string }) => ({
                    verse: v.verse,
                    text: (v.text || '').replace(/\s+/g, ' ').trim()
                }));
            }
        }
    } catch (e) { console.error('❌ [BIBLIA-FALLBACK] Erro:', e); }
    return [];
}

// Tipo de livro
interface LivroBiblia { nome: string; abrev: string; capitulos: number; }

// Categorias organizadas da Bíblia
const CATEGORIAS_BIBLIA: { nome: string; emoji: string; cor: string; corBarra: string; livros: LivroBiblia[] }[] = [
    // ===== ANTIGO TESTAMENTO =====
    {
        nome: 'Pentateuco (Lei)', emoji: '📜', cor: 'text-amber-400', corBarra: 'bg-amber-400', livros: [
            { nome: 'Gênesis', abrev: 'gn', capitulos: 50 },
            { nome: 'Êxodo', abrev: 'ex', capitulos: 40 },
            { nome: 'Levítico', abrev: 'lv', capitulos: 27 },
            { nome: 'Números', abrev: 'nm', capitulos: 36 },
            { nome: 'Deuteronômio', abrev: 'dt', capitulos: 34 },
        ]
    },
    {
        nome: 'Históricos', emoji: '⚔️', cor: 'text-blue-400', corBarra: 'bg-blue-400', livros: [
            { nome: 'Josué', abrev: 'js', capitulos: 24 },
            { nome: 'Juízes', abrev: 'jz', capitulos: 21 },
            { nome: 'Rute', abrev: 'rt', capitulos: 4 },
            { nome: '1 Samuel', abrev: '1sm', capitulos: 31 },
            { nome: '2 Samuel', abrev: '2sm', capitulos: 24 },
            { nome: '1 Reis', abrev: '1rs', capitulos: 22 },
            { nome: '2 Reis', abrev: '2rs', capitulos: 25 },
            { nome: '1 Crônicas', abrev: '1cr', capitulos: 29 },
            { nome: '2 Crônicas', abrev: '2cr', capitulos: 36 },
            { nome: 'Esdras', abrev: 'ed', capitulos: 10 },
            { nome: 'Neemias', abrev: 'ne', capitulos: 13 },
            { nome: 'Ester', abrev: 'et', capitulos: 10 },
        ]
    },
    {
        nome: 'Poéticos / Sabedoria', emoji: '🎵', cor: 'text-purple-400', corBarra: 'bg-purple-400', livros: [
            { nome: 'Jó', abrev: 'jó', capitulos: 42 },
            { nome: 'Salmos', abrev: 'sl', capitulos: 150 },
            { nome: 'Provérbios', abrev: 'pv', capitulos: 31 },
            { nome: 'Eclesiastes', abrev: 'ec', capitulos: 12 },
            { nome: 'Cantares', abrev: 'ct', capitulos: 8 },
        ]
    },
    {
        nome: 'Profetas Maiores', emoji: '🔥', cor: 'text-red-400', corBarra: 'bg-red-400', livros: [
            { nome: 'Isaías', abrev: 'is', capitulos: 66 },
            { nome: 'Jeremias', abrev: 'jr', capitulos: 52 },
            { nome: 'Lamentações', abrev: 'lm', capitulos: 5 },
            { nome: 'Ezequiel', abrev: 'ez', capitulos: 48 },
            { nome: 'Daniel', abrev: 'dn', capitulos: 12 },
        ]
    },
    {
        nome: 'Profetas Menores', emoji: '📣', cor: 'text-orange-400', corBarra: 'bg-orange-400', livros: [
            { nome: 'Oséias', abrev: 'os', capitulos: 14 },
            { nome: 'Joel', abrev: 'jl', capitulos: 3 },
            { nome: 'Amós', abrev: 'am', capitulos: 9 },
            { nome: 'Obadias', abrev: 'ob', capitulos: 1 },
            { nome: 'Jonas', abrev: 'jn', capitulos: 4 },
            { nome: 'Miquéias', abrev: 'mq', capitulos: 7 },
            { nome: 'Naum', abrev: 'na', capitulos: 3 },
            { nome: 'Habacuque', abrev: 'hc', capitulos: 3 },
            { nome: 'Sofonias', abrev: 'sf', capitulos: 3 },
            { nome: 'Ageu', abrev: 'ag', capitulos: 2 },
            { nome: 'Zacarias', abrev: 'zc', capitulos: 14 },
            { nome: 'Malaquias', abrev: 'ml', capitulos: 4 },
        ]
    },
    // ===== NOVO TESTAMENTO =====
    {
        nome: 'Evangelhos', emoji: '✝️', cor: 'text-emerald-400', corBarra: 'bg-emerald-400', livros: [
            { nome: 'Mateus', abrev: 'mt', capitulos: 28 },
            { nome: 'Marcos', abrev: 'mc', capitulos: 16 },
            { nome: 'Lucas', abrev: 'lc', capitulos: 24 },
            { nome: 'João', abrev: 'jo', capitulos: 21 },
        ]
    },
    {
        nome: 'História da Igreja', emoji: '🌍', cor: 'text-cyan-400', corBarra: 'bg-cyan-400', livros: [
            { nome: 'Atos', abrev: 'at', capitulos: 28 },
        ]
    },
    {
        nome: 'Cartas de Paulo', emoji: '✉️', cor: 'text-sky-400', corBarra: 'bg-sky-400', livros: [
            { nome: 'Romanos', abrev: 'rm', capitulos: 16 },
            { nome: '1 Coríntios', abrev: '1co', capitulos: 16 },
            { nome: '2 Coríntios', abrev: '2co', capitulos: 13 },
            { nome: 'Gálatas', abrev: 'gl', capitulos: 6 },
            { nome: 'Efésios', abrev: 'ef', capitulos: 6 },
            { nome: 'Filipenses', abrev: 'fp', capitulos: 4 },
            { nome: 'Colossenses', abrev: 'cl', capitulos: 4 },
            { nome: '1 Tessalonicenses', abrev: '1ts', capitulos: 5 },
            { nome: '2 Tessalonicenses', abrev: '2ts', capitulos: 3 },
            { nome: '1 Timóteo', abrev: '1tm', capitulos: 6 },
            { nome: '2 Timóteo', abrev: '2tm', capitulos: 4 },
            { nome: 'Tito', abrev: 'tt', capitulos: 3 },
            { nome: 'Filemom', abrev: 'fm', capitulos: 1 },
        ]
    },
    {
        nome: 'Cartas Gerais', emoji: '📨', cor: 'text-teal-400', corBarra: 'bg-teal-400', livros: [
            { nome: 'Hebreus', abrev: 'hb', capitulos: 13 },
            { nome: 'Tiago', abrev: 'tg', capitulos: 5 },
            { nome: '1 Pedro', abrev: '1pe', capitulos: 5 },
            { nome: '2 Pedro', abrev: '2pe', capitulos: 3 },
            { nome: '1 João', abrev: '1jo', capitulos: 5 },
            { nome: '2 João', abrev: '2jo', capitulos: 1 },
            { nome: '3 João', abrev: '3jo', capitulos: 1 },
            { nome: 'Judas', abrev: 'jd', capitulos: 1 },
        ]
    },
    {
        nome: 'Profecia', emoji: '👑', cor: 'text-yellow-400', corBarra: 'bg-yellow-400', livros: [
            { nome: 'Apocalipse', abrev: 'ap', capitulos: 22 },
        ]
    },
];

// Lista flat para compatibilidade
const LIVROS_BIBLIA: LivroBiblia[] = CATEGORIAS_BIBLIA.flatMap(c => c.livros);

const LIVRO_PARA_ID: Record<string, number> = {
    'gn': 1, 'ex': 2, 'lv': 3, 'nm': 4, 'dt': 5, 'js': 6, 'jz': 7, 'rt': 8,
    '1sm': 9, '2sm': 10, '1rs': 11, '2rs': 12, '1cr': 13, '2cr': 14,
    'ed': 15, 'ne': 16, 'et': 17, 'jó': 18, 'sl': 19, 'pv': 20, 'ec': 21,
    'ct': 22, 'is': 23, 'jr': 24, 'lm': 25, 'ez': 26, 'dn': 27, 'os': 28,
    'jl': 29, 'am': 30, 'ob': 31, 'jn': 32, 'mq': 33, 'na': 34, 'hc': 35,
    'sf': 36, 'ag': 37, 'zc': 38, 'ml': 39, 'mt': 40, 'mc': 41, 'lc': 42,
    'jo': 43, 'at': 44, 'rm': 45, '1co': 46, '2co': 47, 'gl': 48, 'ef': 49,
    'fp': 50, 'cl': 51, '1ts': 52, '2ts': 53, '1tm': 54, '2tm': 55, 'tt': 56,
    'fm': 57, 'hb': 58, 'tg': 59, '1pe': 60, '2pe': 61, '1jo': 62, '2jo': 63,
    '3jo': 64, 'jd': 65, 'ap': 66
};

const CORES_DESTAQUE: { id: string; nome: string; bg: string; border: string }[] = [
    { id: 'yellow', nome: 'Amarelo', bg: 'bg-yellow-500/20', border: 'border-yellow-500/40' },
    { id: 'blue', nome: 'Azul', bg: 'bg-blue-500/20', border: 'border-blue-500/40' },
    { id: 'green', nome: 'Verde', bg: 'bg-green-500/20', border: 'border-green-500/40' },
    { id: 'pink', nome: 'Rosa', bg: 'bg-pink-500/20', border: 'border-pink-500/40' },
];

// Versões da Bíblia disponíveis (API bolls.life)
const VERSOES_BIBLIA = [
    { codigo: 'NTLH', nome: 'NTLH', nomeCompleto: 'Nova Tradução na Linguagem de Hoje' },
    { codigo: 'NVIPT', nome: 'NVI', nomeCompleto: 'Nova Versão Internacional' },
    { codigo: 'ARA', nome: 'ARA', nomeCompleto: 'Almeida Revista e Atualizada' },
    { codigo: 'NAA', nome: 'NAA', nomeCompleto: 'Nova Almeida Atualizada' },
    { codigo: 'NVT', nome: 'NVT', nomeCompleto: 'Nova Versão Transformadora' },
    { codigo: 'KJA', nome: 'KJA', nomeCompleto: 'King James Atualizada' },
    { codigo: 'ARC09', nome: 'ARC', nomeCompleto: 'Almeida Revista e Corrigida' },
    { codigo: 'ACF11', nome: 'ACF', nomeCompleto: 'Almeida Corrigida Fiel' },
    { codigo: 'ALM21', nome: 'A21', nomeCompleto: 'Almeida Século 21' },
    { codigo: 'MENS', nome: 'MSG', nomeCompleto: 'A Mensagem' },
];

// Configuração de tamanho de fonte
const FONT_SIZES = [
    { label: 'P', value: 'text-base md:text-lg', salvos: 'text-sm', titulo: 'text-lg md:text-xl' },
    { label: 'M', value: 'text-lg md:text-xl', salvos: 'text-base', titulo: 'text-xl md:text-2xl' },
    { label: 'G', value: 'text-xl md:text-2xl', salvos: 'text-lg', titulo: 'text-2xl md:text-3xl' },
    { label: 'GG', value: 'text-2xl md:text-3xl', salvos: 'text-xl', titulo: 'text-3xl md:text-4xl' },
];
const DEFAULT_FONT_INDEX = 1; // M = padrão

// Títulos de seção da Bíblia (livro:capítulo -> versículo -> título)
const TITULOS_SECAO: Record<string, Record<number, string>> = {
    // GÊNESIS
    'gn:1': { 1: 'A Criação do Mundo' },
    'gn:2': { 1: 'O Sétimo Dia — O Descanso', 4: 'O Jardim do Éden', 18: 'A Criação da Mulher' },
    'gn:3': { 1: 'A Desobediência do Homem', 14: 'O Castigo', 22: 'A Expulsão do Jardim' },
    'gn:4': { 1: 'Caim e Abel', 17: 'Os Descendentes de Caim', 25: 'Sete e Enos' },
    'gn:5': { 1: 'Os Descendentes de Adão' },
    'gn:6': { 1: 'A Maldade dos Homens', 9: 'Noé e a Arca' },
    'gn:7': { 1: 'O Dilúvio' },
    'gn:8': { 1: 'O Fim do Dilúvio', 20: 'O Sacrifício de Noé' },
    'gn:9': { 1: 'A Aliança de Deus com Noé', 18: 'Noé e seus Filhos' },
    'gn:10': { 1: 'A Descendência dos Filhos de Noé' },
    'gn:11': { 1: 'A Torre de Babel', 10: 'Os Descendentes de Sem', 27: 'Os Descendentes de Terá' },
    'gn:12': { 1: 'O Chamado de Abrão', 10: 'Abrão no Egito' },
    'gn:13': { 1: 'Abrão e Ló se Separam' },
    'gn:14': { 1: 'Abrão Salva Ló', 17: 'Melquisedeque Abençoa Abrão' },
    'gn:15': { 1: 'A Aliança de Deus com Abrão' },
    'gn:16': { 1: 'Agar e Ismael' },
    'gn:17': { 1: 'A Circuncisão — Sinal da Aliança', 15: 'Deus Promete um Filho a Sara' },
    'gn:18': { 1: 'Os Três Visitantes', 16: 'Abraão Intercede por Sodoma' },
    'gn:19': { 1: 'A Destruição de Sodoma e Gomorra', 30: 'Ló e suas Filhas' },
    'gn:20': { 1: 'Abraão e Abimeleque' },
    'gn:21': { 1: 'O Nascimento de Isaque', 8: 'Agar e Ismael são Expulsos', 22: 'Aliança com Abimeleque' },
    'gn:22': { 1: 'Deus Prova Abraão', 20: 'Os Filhos de Naor' },
    'gn:23': { 1: 'A Morte de Sara' },
    'gn:24': { 1: 'Isaque e Rebeca' },
    'gn:25': { 1: 'Os Últimos Anos de Abraão', 12: 'Os Filhos de Ismael', 19: 'Esaú e Jacó', 29: 'Esaú Vende seu Direito' },
    'gn:26': { 1: 'Isaque em Gerar', 12: 'Isaque Prospera', 34: 'As Esposas de Esaú' },
    'gn:27': { 1: 'Isaque Abençoa Jacó', 30: 'Esaú Pede a Bênção', 41: 'Jacó Foge para Harã' },
    'gn:28': { 1: 'Jacó Vai para a Mesopotâmia', 10: 'O Sonho de Jacó' },
    'gn:29': { 1: 'Jacó Chega à Casa de Labão', 15: 'Jacó Casa com Lia e Raquel', 31: 'Os Filhos de Jacó' },
    'gn:30': { 1: 'Mais Filhos de Jacó', 25: 'Jacó Enriquece' },
    'gn:31': { 1: 'Jacó Foge de Labão', 22: 'Labão Persegue Jacó', 43: 'O Acordo entre Jacó e Labão' },
    'gn:32': { 1: 'Jacó se Prepara para Encontrar Esaú', 22: 'Jacó Luta com Deus' },
    'gn:33': { 1: 'Jacó e Esaú se Encontram', 18: 'Jacó Chega a Siquém' },
    'gn:37': { 1: 'José e seus Irmãos', 12: 'José é Vendido', 29: 'Jacó Chora por José' },
    'gn:39': { 1: 'José na Casa de Potifar', 7: 'José e a Mulher de Potifar', 19: 'José na Prisão' },
    'gn:40': { 1: 'José Interpreta os Sonhos dos Presos' },
    'gn:41': { 1: 'Os Sonhos do Faraó', 37: 'José Governa o Egito' },
    'gn:42': { 1: 'Os Irmãos de José Vão ao Egito' },
    'gn:43': { 1: 'A Segunda Viagem ao Egito' },
    'gn:44': { 1: 'A Taça de José' },
    'gn:45': { 1: 'José se Revela aos Irmãos' },
    'gn:46': { 1: 'Jacó Vai para o Egito' },
    'gn:47': { 1: 'Jacó e o Faraó', 27: 'O Último Pedido de Jacó' },
    'gn:48': { 1: 'Jacó Abençoa os Filhos de José' },
    'gn:49': { 1: 'A Bênção de Jacó', 29: 'A Morte de Jacó' },
    'gn:50': { 1: 'O Sepultamento de Jacó', 15: 'José Perdoa seus Irmãos', 22: 'A Morte de José' },
    // ÊXODO
    'ex:1': { 1: 'Os Israelitas são Escravizados' },
    'ex:2': { 1: 'O Nascimento de Moisés', 11: 'Moisés Foge para Midiã' },
    'ex:3': { 1: 'Moisés e a Sarça Ardente', 13: 'Deus Revela seu Nome' },
    'ex:4': { 1: 'Os Sinais de Moisés', 18: 'Moisés Volta ao Egito' },
    'ex:5': { 1: 'Moisés e Arão Diante do Faraó' },
    'ex:7': { 14: 'A Primeira Praga — Água em Sangue' },
    'ex:8': { 1: 'A Segunda Praga — As Rãs', 16: 'A Terceira Praga — Os Piolhos', 20: 'A Quarta Praga — As Moscas' },
    'ex:9': { 1: 'A Quinta Praga — Peste nos Animais', 8: 'A Sexta Praga — As Úlceras', 13: 'A Sétima Praga — A Chuva de Pedras' },
    'ex:10': { 1: 'A Oitava Praga — Os Gafanhotos', 21: 'A Nona Praga — As Trevas' },
    'ex:11': { 1: 'A Última Praga Anunciada' },
    'ex:12': { 1: 'A Páscoa', 29: 'A Décima Praga — Morte dos Primogênitos', 37: 'A Saída do Egito' },
    'ex:14': { 1: 'A Travessia do Mar Vermelho' },
    'ex:15': { 1: 'O Cântico de Moisés', 22: 'As Águas Amargas' },
    'ex:16': { 1: 'O Maná e as Codornizes' },
    'ex:17': { 1: 'Água da Rocha', 8: 'Vitória sobre os Amalequitas' },
    'ex:19': { 1: 'O Povo no Monte Sinai' },
    'ex:20': { 1: 'Os Dez Mandamentos' },
    'ex:32': { 1: 'O Bezerro de Ouro' },
    'ex:34': { 1: 'As Novas Tábuas da Lei' },
    // SALMOS (alguns dos mais conhecidos)
    'sl:1': { 1: 'O Justo e o Ímpio' },
    'sl:23': { 1: 'O Senhor é meu Pastor' },
    'sl:51': { 1: 'Oração de Arrependimento' },
    'sl:91': { 1: 'A Proteção do Altíssimo' },
    'sl:119': { 1: 'A Palavra de Deus' },
    'sl:121': { 1: 'O Protetor de Israel' },
    'sl:139': { 1: 'Deus Conhece Tudo' },
    'sl:150': { 1: 'Tudo que Respira Louve ao Senhor' },
    // PROVÉRBIOS
    'pv:1': { 1: 'O Propósito dos Provérbios', 8: 'Conselho de um Pai', 20: 'A Sabedoria Clama' },
    'pv:31': { 1: 'Conselhos ao Rei', 10: 'A Mulher Virtuosa' },
    // ECLESIASTES
    'ec:1': { 1: 'Tudo é Vaidade' },
    'ec:3': { 1: 'Tempo para Tudo' },
    'ec:12': { 1: 'Lembra do teu Criador', 9: 'Conclusão' },
    // ISAÍAS
    'is:6': { 1: 'A Visão de Isaías' },
    'is:7': { 10: 'O Sinal de Emanuel' },
    'is:9': { 1: 'O Príncipe da Paz' },
    'is:40': { 1: 'Consolem o meu Povo' },
    'is:53': { 1: 'O Servo Sofredor' },
    'is:55': { 1: 'Convite à Salvação' },
    // DANIEL
    'dn:1': { 1: 'Daniel na Babilônia' },
    'dn:2': { 1: 'O Sonho de Nabucodonosor' },
    'dn:3': { 1: 'A Fornalha de Fogo' },
    'dn:5': { 1: 'A Escrita na Parede' },
    'dn:6': { 1: 'Daniel na Cova dos Leões' },
    // JONAS
    'jn:1': { 1: 'Jonas Foge de Deus' },
    'jn:2': { 1: 'A Oração de Jonas' },
    'jn:3': { 1: 'Jonas Prega em Nínive' },
    'jn:4': { 1: 'A Ira de Jonas' },
    // MATEUS
    'mt:1': { 1: 'A Genealogia de Jesus', 18: 'O Nascimento de Jesus' },
    'mt:2': { 1: 'A Visita dos Magos', 13: 'A Fuga para o Egito', 16: 'O Massacre dos Inocentes', 19: 'A Volta do Egito' },
    'mt:3': { 1: 'João Batista Prepara o Caminho', 13: 'O Batismo de Jesus' },
    'mt:4': { 1: 'A Tentação de Jesus', 12: 'Jesus Começa a Pregar', 18: 'A Chamada dos Primeiros Discípulos' },
    'mt:5': { 1: 'O Sermão da Montanha — As Bem-aventuranças', 13: 'Sal da Terra e Luz do Mundo', 17: 'A Lei e os Profetas', 21: 'Sobre a Ira', 27: 'Sobre o Adultério', 33: 'Sobre os Juramentos', 38: 'Sobre a Vingança', 43: 'O Amor aos Inimigos' },
    'mt:6': { 1: 'Sobre a Caridade', 5: 'Sobre a Oração', 9: 'O Pai Nosso', 16: 'Sobre o Jejum', 19: 'Tesouros no Céu', 25: 'Não se Preocupem' },
    'mt:7': { 1: 'Não Julguem', 7: 'Peçam, Busquem, Batam', 13: 'A Porta Estreita', 15: 'Pelos Frutos os Conhecereis', 24: 'A Casa na Rocha' },
    'mt:8': { 1: 'A Cura de um Leproso', 5: 'A Fé do Centurião', 14: 'Jesus Cura Muitos', 23: 'Jesus Acalma a Tempestade', 28: 'Os Endemoninhados Gadarenos' },
    'mt:13': { 1: 'A Parábola do Semeador', 24: 'A Parábola do Joio', 31: 'A Parábola do Grão de Mostarda', 44: 'A Parábola do Tesouro Escondido', 47: 'A Parábola da Rede' },
    'mt:14': { 1: 'A Morte de João Batista', 13: 'A Multiplicação dos Pães', 22: 'Jesus Anda sobre as Águas' },
    'mt:17': { 1: 'A Transfiguração' },
    'mt:19': { 16: 'O Jovem Rico' },
    'mt:20': { 1: 'A Parábola dos Trabalhadores', 29: 'Dois Cegos Recebem a Visão' },
    'mt:21': { 1: 'A Entrada Triunfal em Jerusalém', 12: 'Jesus Purifica o Templo' },
    'mt:22': { 1: 'A Parábola das Bodas', 15: 'O Tributo a César', 34: 'O Maior Mandamento' },
    'mt:25': { 1: 'A Parábola das Dez Virgens', 14: 'A Parábola dos Talentos', 31: 'O Juízo Final' },
    'mt:26': { 1: 'A Conspiração contra Jesus', 17: 'A Última Ceia', 36: 'O Getsêmani', 47: 'A Prisão de Jesus', 57: 'Jesus Diante do Sinédrio', 69: 'Pedro Nega Jesus' },
    'mt:27': { 1: 'Jesus Diante de Pilatos', 15: 'A Sentença de Morte', 27: 'Os Soldados Zombam de Jesus', 32: 'A Crucificação', 45: 'A Morte de Jesus', 57: 'O Sepultamento' },
    'mt:28': { 1: 'A Ressurreição', 16: 'A Grande Comissão' },
    // MARCOS
    'mc:1': { 1: 'João Batista Prepara o Caminho', 9: 'O Batismo de Jesus', 12: 'A Tentação no Deserto', 14: 'Jesus Começa a Pregar', 16: 'A Chamada dos Primeiros Discípulos', 21: 'Jesus Expulsa um Espírito Mau', 29: 'Jesus Cura Muitos' },
    'mc:4': { 35: 'Jesus Acalma a Tempestade' },
    'mc:5': { 1: 'O Endemoninhado Gadareno', 21: 'A Filha de Jairo e a Mulher com Hemorragia' },
    'mc:6': { 14: 'A Morte de João Batista', 30: 'A Multiplicação dos Pães', 45: 'Jesus Anda sobre as Águas' },
    'mc:10': { 17: 'O Jovem Rico', 46: 'O Cego Bartimeu' },
    'mc:11': { 1: 'A Entrada Triunfal', 15: 'Jesus Purifica o Templo' },
    'mc:14': { 1: 'A Conspiração', 12: 'A Última Ceia', 32: 'O Getsêmani', 43: 'A Prisão de Jesus', 53: 'Jesus Diante do Sinédrio', 66: 'Pedro Nega Jesus' },
    'mc:15': { 1: 'Jesus Diante de Pilatos', 21: 'A Crucificação', 33: 'A Morte de Jesus', 42: 'O Sepultamento' },
    'mc:16': { 1: 'A Ressurreição', 9: 'Jesus Aparece a Maria Madalena', 14: 'A Grande Comissão', 19: 'A Ascensão' },
    // LUCAS
    'lc:1': { 1: 'Introdução', 5: 'O Anúncio do Nascimento de João', 26: 'O Anúncio do Nascimento de Jesus', 46: 'O Cântico de Maria', 57: 'O Nascimento de João Batista' },
    'lc:2': { 1: 'O Nascimento de Jesus', 8: 'Os Pastores', 21: 'A Apresentação no Templo', 41: 'O Menino Jesus no Templo' },
    'lc:3': { 1: 'A Pregação de João Batista', 21: 'O Batismo de Jesus', 23: 'A Genealogia de Jesus' },
    'lc:4': { 1: 'A Tentação de Jesus', 14: 'Jesus Começa a Pregar', 16: 'Jesus em Nazaré' },
    'lc:10': { 25: 'A Parábola do Bom Samaritano', 38: 'Jesus Visita Marta e Maria' },
    'lc:15': { 1: 'A Parábola da Ovelha Perdida', 8: 'A Parábola da Moeda Perdida', 11: 'A Parábola do Filho Pródigo' },
    'lc:18': { 1: 'A Parábola do Juiz Iníquo', 9: 'O Fariseu e o Publicano', 15: 'Jesus e as Crianças', 18: 'O Jovem Rico' },
    'lc:19': { 1: 'Zaqueu', 28: 'A Parábola das Dez Minas', 41: 'Jesus Chora por Jerusalém', 45: 'Jesus Purifica o Templo' },
    'lc:22': { 1: 'A Conspiração', 7: 'A Última Ceia', 39: 'O Getsêmani', 47: 'A Prisão de Jesus', 54: 'Pedro Nega Jesus', 66: 'Jesus Diante do Sinédrio' },
    'lc:23': { 1: 'Jesus Diante de Pilatos', 26: 'A Crucificação', 44: 'A Morte de Jesus', 50: 'O Sepultamento' },
    'lc:24': { 1: 'A Ressurreição', 13: 'No Caminho de Emaús', 36: 'Jesus Aparece aos Discípulos', 50: 'A Ascensão' },
    // JOÃO
    'jo:1': { 1: 'O Verbo se Fez Carne', 19: 'O Testemunho de João Batista', 35: 'Os Primeiros Discípulos' },
    'jo:2': { 1: 'As Bodas de Caná', 13: 'Jesus Purifica o Templo' },
    'jo:3': { 1: 'Jesus e Nicodemos', 16: 'O Amor de Deus pelo Mundo', 22: 'Jesus e João Batista' },
    'jo:4': { 1: 'Jesus e a Mulher Samaritana', 43: 'Jesus Cura o Filho do Oficial' },
    'jo:5': { 1: 'A Cura no Tanque de Betesda' },
    'jo:6': { 1: 'A Multiplicação dos Pães', 16: 'Jesus Anda sobre as Águas', 22: 'O Pão da Vida' },
    'jo:8': { 1: 'A Mulher Adúltera', 12: 'Jesus — A Luz do Mundo' },
    'jo:9': { 1: 'Jesus Cura o Cego de Nascença' },
    'jo:10': { 1: 'O Bom Pastor', 22: 'Jesus e os Judeus' },
    'jo:11': { 1: 'A Morte de Lázaro', 17: 'Jesus — A Ressurreição e a Vida', 38: 'Jesus Ressuscita Lázaro' },
    'jo:13': { 1: 'Jesus Lava os Pés dos Discípulos', 21: 'Jesus Anuncia a Traição' },
    'jo:14': { 1: 'Jesus — O Caminho, a Verdade e a Vida', 15: 'A Promessa do Espírito Santo' },
    'jo:15': { 1: 'A Videira e os Ramos', 18: 'O Mundo Odeia os Discípulos' },
    'jo:17': { 1: 'A Oração de Jesus' },
    'jo:18': { 1: 'A Prisão de Jesus', 12: 'Jesus Diante de Anás e Caifás', 15: 'Pedro Nega Jesus', 28: 'Jesus Diante de Pilatos' },
    'jo:19': { 1: 'Jesus é Flagelado', 17: 'A Crucificação', 28: 'A Morte de Jesus', 38: 'O Sepultamento' },
    'jo:20': { 1: 'A Ressurreição', 10: 'Jesus Aparece a Maria Madalena', 19: 'Jesus Aparece aos Discípulos', 24: 'Jesus e Tomé' },
    'jo:21': { 1: 'Jesus Aparece na Galileia', 15: 'Jesus e Pedro' },
    // ATOS
    'at:1': { 1: 'A Promessa do Espírito Santo', 6: 'A Ascensão de Jesus', 12: 'A Escolha de Matias' },
    'at:2': { 1: 'O Dia de Pentecostes', 14: 'O Sermão de Pedro', 37: 'A Primeira Comunidade' },
    'at:3': { 1: 'A Cura do Coxo' },
    'at:7': { 54: 'A Morte de Estêvão' },
    'at:8': { 26: 'Filipe e o Etíope' },
    'at:9': { 1: 'A Conversão de Saulo', 32: 'Pedro Cura Enéias e Ressuscita Dorcas' },
    'at:10': { 1: 'Pedro e Cornélio' },
    'at:12': { 1: 'Pedro é Preso e Libertado' },
    'at:16': { 16: 'Paulo e Silas na Prisão' },
    'at:17': { 16: 'Paulo em Atenas' },
    'at:27': { 1: 'A Viagem de Paulo a Roma' },
    'at:28': { 1: 'Paulo em Malta', 16: 'Paulo em Roma' },
    // ROMANOS
    'rm:1': { 1: 'Saudação', 16: 'O Poder do Evangelho' },
    'rm:3': { 21: 'A Justiça pela Fé' },
    'rm:5': { 1: 'Paz com Deus', 12: 'Adão e Cristo' },
    'rm:6': { 1: 'Mortos para o Pecado' },
    'rm:8': { 1: 'Vida no Espírito', 28: 'Mais que Vencedores' },
    'rm:12': { 1: 'O Sacrifício Vivo', 9: 'O Amor Sincero' },
    'rm:13': { 1: 'Submissão às Autoridades', 8: 'O Amor ao Próximo' },
    // 1 CORÍNTIOS
    '1co:13': { 1: 'O Amor' },
    '1co:15': { 1: 'A Ressurreição de Cristo', 35: 'O Corpo Ressuscitado' },
    // GÁLATAS
    'gl:5': { 1: 'A Liberdade em Cristo', 16: 'As Obras da Carne e o Fruto do Espírito' },
    // EFÉSIOS
    'ef:6': { 10: 'A Armadura de Deus' },
    // FILIPENSES
    'fp:2': { 1: 'A Humildade de Cristo', 12: 'Brilhem como Estrelas' },
    'fp:4': { 4: 'Alegrem-se no Senhor', 10: 'Deus Supre as Necessidades' },
    // HEBREUS
    'hb:11': { 1: 'Os Heróis da Fé' },
    'hb:12': { 1: 'A Corrida da Fé' },
    // TIAGO
    'tg:1': { 1: 'Saudação', 2: 'Provações e Tentações', 19: 'Praticantes da Palavra' },
    'tg:2': { 1: 'A Fé e as Obras' },
    'tg:3': { 1: 'O Poder da Língua' },
    // 1 PEDRO
    '1pe:1': { 1: 'Esperança Viva' },
    '1pe:2': { 1: 'A Pedra Viva', 11: 'Vivam como Servos de Deus' },
    // 1 JOÃO
    '1jo:1': { 1: 'A Palavra da Vida', 5: 'Deus é Luz' },
    '1jo:4': { 1: 'O Amor de Deus', 7: 'Deus é Amor' },
    // APOCALIPSE
    'ap:1': { 1: 'Introdução', 9: 'A Visão de Cristo Glorificado' },
    'ap:2': { 1: 'Carta a Éfeso', 8: 'Carta a Esmirna', 12: 'Carta a Pérgamo', 18: 'Carta a Tiatira' },
    'ap:3': { 1: 'Carta a Sardes', 7: 'Carta a Filadélfia', 14: 'Carta a Laodiceia' },
    'ap:4': { 1: 'O Trono no Céu' },
    'ap:5': { 1: 'O Cordeiro e o Livro' },
    'ap:6': { 1: 'Os Selos' },
    'ap:7': { 1: 'Os 144 Mil Selados' },
    'ap:12': { 1: 'A Mulher e o Dragão' },
    'ap:19': { 1: 'O Cavaleiro no Cavalo Branco', 11: 'A Vitória Final' },
    'ap:20': { 1: 'Os Mil Anos', 11: 'O Juízo Final' },
    'ap:21': { 1: 'O Novo Céu e a Nova Terra', 9: 'A Nova Jerusalém' },
    'ap:22': { 1: 'O Rio da Vida', 6: 'A Vinda de Jesus', 16: 'Palavras Finais' },
};

interface Versiculo {
    verse: number;
    text: string;
}

// Mapa de interações por versículo para acesso rápido
interface InteracoesMap {
    destaques: Record<number, BibliaInteracao>;
    favoritos: Record<number, BibliaInteracao>;
    notas: Record<number, BibliaInteracao>;
}

export default function BibliotecaPageWrapper() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 text-amber-500 animate-spin" /></div>}>
            <BibliotecaPage />
        </Suspense>
    );
}

function BibliotecaPage() {
    const searchParams = useSearchParams();
    const abrirSalvos = searchParams.get('salvos') === '1';

    // Estado principal
    const [livroAtual, setLivroAtual] = useState(LIVROS_BIBLIA[0]);
    const [capituloAtual, setCapituloAtual] = useState(1);
    const [versiculos, setVersiculos] = useState<Versiculo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [inicializado, setInicializado] = useState(false);

    // Modal de seleção
    const [modalAberto, setModalAberto] = useState(false);
    const [faseSelecao, setFaseSelecao] = useState<'livros' | 'capitulos' | 'versiculos'>('livros');
    const [livroSelecionadoTemp, setLivroSelecionadoTemp] = useState(LIVROS_BIBLIA[0]);
    const [capituloSelecionadoTemp, setCapituloSelecionadoTemp] = useState(1);
    const [scrollToVerse, setScrollToVerse] = useState<number | null>(null);
    const [totalVersiculosTemp, setTotalVersiculosTemp] = useState(0);
    const [loadingVersiculosTemp, setLoadingVersiculosTemp] = useState(false);
    const [buscaLivro, setBuscaLivro] = useState('');

    // Mini-toolbar (single select)
    const [versiculoSelecionado, setVersiculoSelecionado] = useState<number | null>(null);
    const [toolbarPos, setToolbarPos] = useState({ top: 0, left: 0 });
    const [mostrarCores, setMostrarCores] = useState(false);
    const [mostrarNota, setMostrarNota] = useState(false);
    const [textoNota, setTextoNota] = useState('');

    // Multi-seleção de versículos
    const [modoMultiSelecao, setModoMultiSelecao] = useState(false);
    const [versiculosSelecionados, setVersiculosSelecionados] = useState<Set<number>>(new Set());

    // Nota fullscreen
    const [notaFullscreen, setNotaFullscreen] = useState(false);
    const [notaFullscreenVerso, setNotaFullscreenVerso] = useState<number | null>(null);

    // Interações (offline-first hook)
    const {
        interacoesMap,
        pendingCount,
        syncing,
        carregarInteracoes,
        salvarInteracao,
        removerInteracao,
        removerPorVersiculoETipo,
        atualizarNota,
    } = useOfflineInteractions(livroAtual.abrev, livroAtual.nome, capituloAtual);

    // Estudo IA
    const [estudoAberto, setEstudoAberto] = useState(false);
    const [estudoTexto, setEstudoTexto] = useState('');
    const [estudoLoading, setEstudoLoading] = useState(false);
    const [estudoVersiculo, setEstudoVersiculo] = useState<Versiculo | null>(null);

    // Busca
    const [buscaAberta, setBuscaAberta] = useState(false);
    const [termoBusca, setTermoBusca] = useState('');
    const [resultadosBusca, setResultadosBusca] = useState<{ book: number; chapter: number; verse: number; text: string }[]>([]);
    const [buscaLoading, setBuscaLoading] = useState(false);
    const [livrosEncontrados, setLivrosEncontrados] = useState<LivroBiblia[]>([]);

    // Offline
    const [isOnline, setIsOnline] = useState(true);
    const [cameFromCache, setCameFromCache] = useState(false);
    const [offlineManagerAberto, setOfflineManagerAberto] = useState(false);

    // Bookmarks de leitura
    interface Bookmark {
        id: string;
        nome: string;
        livro_abrev: string;
        livro_nome: string;
        capitulo: number;
        versiculo: number | null;
        created_at: string;
    }
    const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
    const [bookmarksAberto, setBookmarksAberto] = useState(false);
    const [novoBookmarkNome, setNovoBookmarkNome] = useState('');
    const [criandoBookmark, setCriandoBookmark] = useState(false);

    // Fonte e versão
    const [fontSizeIndex, setFontSizeIndex] = useState(DEFAULT_FONT_INDEX);
    const [versaoBiblia, setVersaoBiblia] = useState(VERSOES_BIBLIA[0]); // NTLH padrão
    const [mostrarVersoes, setMostrarVersoes] = useState(false);
    const [mostrarFontes, setMostrarFontes] = useState(false);

    // Painel de salvos
    const [painelAberto, setPainelAberto] = useState(abrirSalvos);
    const [painelAba, setPainelAba] = useState<'favoritos' | 'destaques' | 'notas'>('favoritos');
    const [painelItens, setPainelItens] = useState<BibliaInteracao[]>([]);
    const [painelLoading, setPainelLoading] = useState(abrirSalvos);

    // Carregar dados do painel quando aberto via query param
    useEffect(() => {
        if (abrirSalvos) {
            getAllInteracoesPorTipo('favorito', 200).then(dados => {
                setPainelItens(dados);
                setPainelLoading(false);
            });
        }
    }, [abrirSalvos]);
    const [painelNotaEditId, setPainelNotaEditId] = useState<number | null>(null);
    const [painelNotaTexto, setPainelNotaTexto] = useState('');
    const [painelBusca, setPainelBusca] = useState('');
    const [painelOrdem, setPainelOrdem] = useState<'recente' | 'antigo' | 'livro'>('recente');
    const [painelCorFiltro, setPainelCorFiltro] = useState<string | null>(null);
    const [painelCounts, setPainelCounts] = useState<{ favorito: number; destaque: number; nota: number } | null>(null);
    const [novaNotaAberta, setNovaNotaAberta] = useState(false);
    const [novaNotaRef, setNovaNotaRef] = useState('');
    const [novaNotaTexto, setNovaNotaTexto] = useState('');
    const [novaNotaSalvando, setNovaNotaSalvando] = useState(false);

    const { toasts, removeToast, success, error: toastError } = useToast();
    const toolbarRef = useRef<HTMLDivElement>(null);
    const versiculosRef = useRef<HTMLDivElement>(null);
    const versiculoAnteriorRef = useRef<number | null>(null);

    // Helpers de fonte
    const fontConfig = FONT_SIZES[fontSizeIndex];

    const trocarVersao = (versao: typeof VERSOES_BIBLIA[0]) => {
        setVersaoBiblia(versao);
        setMostrarVersoes(false);
        localStorage.setItem('biblia-versao', versao.codigo);
    };

    // ==========================================
    // INICIALIZAÇÃO: Carregar última leitura + prefs + online listener
    // ==========================================
    useEffect(() => {
        async function init() {
            // Restaurar preferências salvas
            const savedFont = localStorage.getItem('biblia-font-size');
            if (savedFont) {
                const idx = Number(savedFont);
                if (idx >= 0 && idx < FONT_SIZES.length) setFontSizeIndex(idx);
            }
            const savedVersao = localStorage.getItem('biblia-versao');
            if (savedVersao) {
                const v = VERSOES_BIBLIA.find(ver => ver.codigo === savedVersao);
                if (v) setVersaoBiblia(v);
            }

            // Status de conectividade
            setIsOnline(navigator.onLine);

            const ultima = await getUltimaLeitura();
            if (ultima) {
                const livro = LIVROS_BIBLIA.find(l => l.abrev === ultima.livro_abrev);
                if (livro) {
                    setLivroAtual(livro);
                    setCapituloAtual(ultima.capitulo);
                }
            }
            setInicializado(true);
        }
        init();

        // Online/offline listeners
        const goOnline = () => setIsOnline(true);
        const goOffline = () => setIsOnline(false);
        window.addEventListener('online', goOnline);
        window.addEventListener('offline', goOffline);

        // Carregar bookmarks do localStorage
        try {
            const stored = localStorage.getItem('biblia-bookmarks');
            if (stored) setBookmarks(JSON.parse(stored));
        } catch { /* ignore */ }

        return () => {
            window.removeEventListener('online', goOnline);
            window.removeEventListener('offline', goOffline);
        };
    }, []);

    // ==========================================
    // BUSCAR CAPÍTULO
    // ==========================================
    const buscarCapitulo = useCallback(async (livro: string, cap: number, versaoCodigo?: string) => {
        setLoading(true);
        setError(null);
        setVersiculoSelecionado(null);
        setCameFromCache(false);

        const codigo = versaoCodigo || versaoBiblia.codigo;
        const bookId = LIVRO_PARA_ID[livro] || 1;

        // 1) Tentar cache local primeiro (instantâneo)
        try {
            const cached = await getCachedChapter(codigo, bookId, cap);
            if (cached && cached.length > 0) {
                setVersiculos(cached);
                setCameFromCache(true);
                setLoading(false);

                // Background: atualiza cache se online (stale-while-revalidate)
                if (navigator.onLine) {
                    fetchBibliaComFallback(bookId, cap, codigo)
                        .then(data => {
                            if (data.length > 0) {
                                const fresh = data.map(v => ({
                                    verse: v.verse,
                                    text: (v.text || '').replace(/<[^>]*>/g, ''),
                                }));
                                cacheChapter(codigo, bookId, cap, fresh);
                                setVersiculos(fresh);
                            }
                        })
                        .catch(() => { /* silencioso */ });
                }
                return;
            }
        } catch { /* IndexedDB indisponível, continua para fetch */ }

        // 2) Sem cache: buscar da API (com fallback automático)
        try {
            const data = await fetchBibliaComFallback(bookId, cap, codigo);
            if (data.length > 0) {
                const versiculos = data.map(v => ({
                    verse: v.verse,
                    text: (v.text || '').replace(/<[^>]*>/g, ''),
                }));
                setVersiculos(versiculos);
                cacheChapter(codigo, bookId, cap, versiculos).catch(() => { });
            } else {
                throw new Error('Nenhum versículo retornado');
            }
        } catch {
            setError('Capítulo não disponível. Verifique sua conexão.');
            setVersiculos([]);
        } finally {
            setLoading(false);
        }
    }, [versaoBiblia.codigo]);

    // Carregar capítulo + interações quando muda
    useEffect(() => {
        if (!inicializado) return;
        buscarCapitulo(livroAtual.abrev, capituloAtual);
        carregarInteracoes();
        salvarHistoricoLeitura(livroAtual.abrev, livroAtual.nome, capituloAtual);
        // Limpar seleções ao mudar de capítulo
        setModoMultiSelecao(false);
        setVersiculosSelecionados(new Set());
        setMostrarCores(false);
    }, [livroAtual, capituloAtual, inicializado, buscarCapitulo, versaoBiblia, carregarInteracoes]);

    // Scroll para versículo específico quando carregado
    useEffect(() => {
        if (scrollToVerse && !loading && versiculos.length > 0) {
            const doScroll = () => {
                const el = document.getElementById(`verse-${scrollToVerse}`);
                if (el) {
                    setTimeout(() => {
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        el.classList.add('ring-2', 'ring-amber-400/60', 'bg-amber-500/10');
                        setTimeout(() => el.classList.remove('ring-2', 'ring-amber-400/60', 'bg-amber-500/10'), 2500);
                    }, 100);
                    setScrollToVerse(null);
                }
            };
            // Tenta imediatamente, e se não encontrar, tenta após o DOM atualizar
            requestAnimationFrame(() => {
                doScroll();
                // Retry após pequeno delay caso o DOM ainda não esteja pronto
                if (scrollToVerse) {
                    setTimeout(doScroll, 500);
                }
            });
        }
    }, [scrollToVerse, loading, versiculos]);

    // carregarInteracoes agora vem do hook useOfflineInteractions

    // ==========================================
    // NAVEGAÇÃO
    // ==========================================
    const irParaProximo = () => {
        if (capituloAtual < livroAtual.capitulos) setCapituloAtual(c => c + 1);
    };

    const irParaAnterior = () => {
        if (capituloAtual > 1) setCapituloAtual(c => c - 1);
    };

    const navegarPara = (abrev: string, cap: number, verse?: number) => {
        const livro = LIVROS_BIBLIA.find(l => l.abrev === abrev);
        if (livro) {
            setLivroAtual(livro);
            setCapituloAtual(cap);
            if (verse) setScrollToVerse(verse);
        }
    };

    // ==========================================
    // MODAL
    // ==========================================
    const abrirModal = () => {
        setLivroSelecionadoTemp(livroAtual);
        setFaseSelecao('livros');
        setModalAberto(true);
    };

    const selecionarLivroTemp = (livro: typeof LIVROS_BIBLIA[0]) => {
        setLivroSelecionadoTemp(livro);
        setFaseSelecao('capitulos');
    };

    // Normaliza string: minúsculas, sem acentos, sem espaços sobrando
    const normalizar = (s: string) => s
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();

    // Tenta identificar livro a partir do texto digitado (nome ou abreviação)
    const encontrarLivroPorTexto = (texto: string): typeof LIVROS_BIBLIA[0] | null => {
        const alvo = normalizar(texto);
        if (!alvo) return null;
        // 1) abreviação exata
        const porAbrev = LIVROS_BIBLIA.find(l => normalizar(l.abrev) === alvo);
        if (porAbrev) return porAbrev;
        // 2) nome exato
        const porNome = LIVROS_BIBLIA.find(l => normalizar(l.nome) === alvo);
        if (porNome) return porNome;
        // 3) nome começa com (prioriza mais curto/mais próximo)
        const comecaCom = LIVROS_BIBLIA
            .filter(l => normalizar(l.nome).startsWith(alvo))
            .sort((a, b) => a.nome.length - b.nome.length);
        if (comecaCom[0]) return comecaCom[0];
        // 4) nome contém
        const contem = LIVROS_BIBLIA.find(l => normalizar(l.nome).includes(alvo));
        return contem || null;
    };

    // Parse "joão 3:16" / "gn 1:1" / "salmos 23" / "1 co 13:4"
    const parseReferenciaBiblica = (texto: string): { livro: typeof LIVROS_BIBLIA[0]; capitulo: number; versiculo: number | null } | null => {
        const t = texto.trim();
        if (!t) return null;
        // Regex: captura "nome cap[:ver]"; nome pode ter "1 ", "2 ", "3 " prefixo e letras/acentos/espaços
        const match = t.match(/^([1-3]?\s*[A-Za-zÀ-ú]+(?:\s+[A-Za-zÀ-ú]+)?)\s+(\d{1,3})(?:\s*[:.]\s*(\d{1,3}))?\s*$/);
        if (!match) return null;
        const nomeTexto = match[1].replace(/\s+/g, ' ').trim();
        const capitulo = parseInt(match[2], 10);
        const versiculo = match[3] ? parseInt(match[3], 10) : null;
        const livro = encontrarLivroPorTexto(nomeTexto);
        if (!livro) return null;
        if (capitulo < 1 || capitulo > livro.capitulos) return null;
        return { livro, capitulo, versiculo };
    };

    const referenciaBusca = parseReferenciaBiblica(buscaLivro);

    // Filtra categorias pelo texto digitado (apenas quando NÃO é referência completa)
    const categoriasFiltradas = (() => {
        if (!buscaLivro.trim() || referenciaBusca) return CATEGORIAS_BIBLIA;
        const alvo = normalizar(buscaLivro);
        return CATEGORIAS_BIBLIA
            .map(cat => ({
                ...cat,
                livros: cat.livros.filter(l =>
                    normalizar(l.nome).includes(alvo) ||
                    normalizar(l.abrev).includes(alvo)
                ),
            }))
            .filter(cat => cat.livros.length > 0);
    })();

    const irParaReferencia = () => {
        if (!referenciaBusca) return;
        setLivroAtual(referenciaBusca.livro);
        setCapituloAtual(referenciaBusca.capitulo);
        setScrollToVerse(referenciaBusca.versiculo);
        setBuscaLivro('');
        setModalAberto(false);
    };

    // ==========================================
    // BOOKMARKS
    // ==========================================
    const salvarBookmark = () => {
        const nome = novoBookmarkNome.trim() || `${livroAtual.nome} ${capituloAtual}`;
        const bookmark: Bookmark = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            nome,
            livro_abrev: livroAtual.abrev,
            livro_nome: livroAtual.nome,
            capitulo: capituloAtual,
            versiculo: versiculoSelecionado,
            created_at: new Date().toISOString(),
        };
        const novos = [bookmark, ...bookmarks];
        setBookmarks(novos);
        localStorage.setItem('biblia-bookmarks', JSON.stringify(novos));
        setCriandoBookmark(false);
        setNovoBookmarkNome('');
        success(`Bookmark "${nome}" salvo!`);
    };

    const removerBookmark = (id: string) => {
        const novos = bookmarks.filter(b => b.id !== id);
        setBookmarks(novos);
        localStorage.setItem('biblia-bookmarks', JSON.stringify(novos));
        success('Bookmark removido');
    };

    const navegarParaBookmark = (bookmark: Bookmark) => {
        const livro = LIVROS_BIBLIA.find(l => l.abrev === bookmark.livro_abrev);
        if (livro) {
            setLivroAtual(livro);
            setCapituloAtual(bookmark.capitulo);
            if (bookmark.versiculo) setScrollToVerse(bookmark.versiculo);
        }
        setBookmarksAberto(false);
    };

    const bookmarkAtualExiste = bookmarks.some(
        b => b.livro_abrev === livroAtual.abrev && b.capitulo === capituloAtual
    );

    const selecionarCapituloTemp = async (cap: number) => {
        setCapituloSelecionadoTemp(cap);
        setFaseSelecao('versiculos');
        setLoadingVersiculosTemp(true);
        setTotalVersiculosTemp(0);

        // Buscar quantidade de versículos do capítulo (com fallback)
        try {
            const bookId = LIVRO_PARA_ID[livroSelecionadoTemp.abrev] || 1;
            const data = await fetchBibliaComFallback(bookId, cap, versaoBiblia.codigo);
            if (data.length > 0) setTotalVersiculosTemp(data.length);
        } catch { /* silencioso */ }
        setLoadingVersiculosTemp(false);
    };

    const confirmarSelecao = (versiculo?: number) => {
        setLivroAtual(livroSelecionadoTemp);
        setCapituloAtual(capituloSelecionadoTemp);
        setScrollToVerse(versiculo || null);
        setBuscaLivro('');
        setModalAberto(false);
    };

    const fecharModalSelecao = () => {
        setBuscaLivro('');
        setFaseSelecao('livros');
        setModalAberto(false);
    };

    // ==========================================
    // MINI-TOOLBAR: Clicar no versículo
    // ==========================================
    const handleVersiculoClick = (verse: number, event: React.MouseEvent) => {
        event.stopPropagation();

        // Modo multi-seleção: toggle do versículo
        if (modoMultiSelecao) {
            toggleVersiculoMulti(verse);
            return;
        }

        const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
        const containerRect = versiculosRef.current?.getBoundingClientRect();

        // Se clicou no mesmo versículo que estava aberto, closes
        if (versiculoAnteriorRef.current === verse) {
            setVersiculoSelecionado(null);
            setMostrarCores(false);
            setMostrarNota(false);
            versiculoAnteriorRef.current = null;
            return;
        }

        setVersiculoSelecionado(verse);
        versiculoAnteriorRef.current = verse;
        setMostrarCores(false);
        setMostrarNota(false);

        // Posicionar toolbar acima do versículo
        const top = rect.top - (containerRect?.top || 0) - 60;
        const left = Math.min(rect.width / 2, 200);
        setToolbarPos({ top, left });

        // Se tem nota existente, carregar texto
        const notaExistente = interacoesMap.notas[verse];
        setTextoNota(notaExistente?.nota || '');
    };

    // Fechar toolbar ao clicar fora
    useEffect(() => {
        const handleClickFora = (e: MouseEvent) => {
            if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
                // Verifica se clicou em algum versículo (não fechar se vai abrir outro)
                const target = e.target as HTMLElement;
                const versiculoDiv = target.closest('[id^="verse-"]');
                if (!versiculoDiv) {
                    setVersiculoSelecionado(null);
                    setMostrarCores(false);
                    setMostrarNota(false);
                    versiculoAnteriorRef.current = null;
                }
            }
        };
        document.addEventListener('mousedown', handleClickFora);
        return () => document.removeEventListener('mousedown', handleClickFora);
    }, []);

    // ==========================================
    // AÇÕES: Destacar, Favoritar, Copiar, etc.
    // ==========================================
    const getVersiculoObj = (verse: number): Versiculo | undefined => versiculos.find(v => v.verse === verse);

    const handleDestacar = async (cor: string) => {
        if (!versiculoSelecionado) return;
        const v = getVersiculoObj(versiculoSelecionado);
        if (!v) return;

        // Se já tem destaque, remove
        const existente = interacoesMap.destaques[versiculoSelecionado];
        if (existente && existente.cor === cor) {
            await removerPorVersiculoETipo('destaque', versiculoSelecionado);
            success('Destaque removido');
        } else {
            if (existente) await removerPorVersiculoETipo('destaque', versiculoSelecionado);
            await salvarInteracao({
                tipo: 'destaque', livro_abrev: livroAtual.abrev, livro_nome: livroAtual.nome,
                capitulo: capituloAtual, versiculo: v.verse, texto_versiculo: v.text, cor
            });
            success('Versículo destacado!');
        }
        await carregarInteracoes();
        setMostrarCores(false);
    };

    const handleFavoritar = async () => {
        if (!versiculoSelecionado) return;
        const v = getVersiculoObj(versiculoSelecionado);
        if (!v) return;

        const existente = interacoesMap.favoritos[versiculoSelecionado];
        if (existente) {
            await removerPorVersiculoETipo('favorito', versiculoSelecionado);
            success('Removido dos favoritos');
        } else {
            await salvarInteracao({
                tipo: 'favorito', livro_abrev: livroAtual.abrev, livro_nome: livroAtual.nome,
                capitulo: capituloAtual, versiculo: v.verse, texto_versiculo: v.text
            });
            success('Salvo nos favoritos!');
        }
        await carregarInteracoes();
    };

    const handleCopiar = async () => {
        if (!versiculoSelecionado) return;
        const v = getVersiculoObj(versiculoSelecionado);
        if (!v) return;

        const texto = `"${v.text}" — ${livroAtual.nome} ${capituloAtual}:${v.verse} (${versaoBiblia.nome})`;
        await navigator.clipboard.writeText(texto);
        success('Versículo copiado!');
    };

    const handleCompartilhar = async () => {
        if (!versiculoSelecionado) return;
        const v = getVersiculoObj(versiculoSelecionado);
        if (!v) return;

        const texto = `"${v.text}"\n— ${livroAtual.nome} ${capituloAtual}:${v.verse} (${versaoBiblia.nome})`;

        if (navigator.share) {
            try {
                await navigator.share({ title: `${livroAtual.nome} ${capituloAtual}:${v.verse}`, text: texto });
            } catch { /* cancelled */ }
        } else {
            await navigator.clipboard.writeText(texto);
            success('Copiado para compartilhar!');
        }
    };

    const handleSalvarNota = async () => {
        if (!versiculoSelecionado || !textoNota.trim()) return;
        const v = getVersiculoObj(versiculoSelecionado);
        if (!v) return;

        const existente = interacoesMap.notas[versiculoSelecionado];
        if (existente) {
            await atualizarNota(existente.id!, textoNota.trim());
        } else {
            await salvarInteracao({
                tipo: 'nota', livro_abrev: livroAtual.abrev, livro_nome: livroAtual.nome,
                capitulo: capituloAtual, versiculo: v.verse, texto_versiculo: v.text, nota: textoNota.trim()
            });
        }
        success('Nota salva!');
        setMostrarNota(false);
        await carregarInteracoes();
    };

    // ==========================================
    // MULTI-SELEÇÃO
    // ==========================================
    const toggleMultiSelecao = () => {
        if (modoMultiSelecao) {
            // Saindo do modo: limpar
            setModoMultiSelecao(false);
            setVersiculosSelecionados(new Set());
        } else {
            // Entrando no modo: se tem versículo individual selecionado, migra
            setModoMultiSelecao(true);
            if (versiculoSelecionado) {
                setVersiculosSelecionados(new Set([versiculoSelecionado]));
                setVersiculoSelecionado(null);
                setMostrarCores(false);
                setMostrarNota(false);
            }
        }
    };

    const toggleVersiculoMulti = (verse: number) => {
        setVersiculosSelecionados(prev => {
            const next = new Set(prev);
            if (next.has(verse)) next.delete(verse);
            else next.add(verse);
            return next;
        });
    };

    const multiSelecionados = Array.from(versiculosSelecionados).sort((a, b) => a - b);

    const handleMultiDestacar = async (cor: string) => {
        for (const verse of multiSelecionados) {
            const v = getVersiculoObj(verse);
            if (!v) continue;
            const existente = interacoesMap.destaques[verse];
            if (existente) await removerPorVersiculoETipo('destaque', verse);
            await salvarInteracao({
                tipo: 'destaque', livro_abrev: livroAtual.abrev, livro_nome: livroAtual.nome,
                capitulo: capituloAtual, versiculo: v.verse, texto_versiculo: v.text, cor
            });
        }
        success(`${multiSelecionados.length} versículos destacados!`);
        await carregarInteracoes();
        setMostrarCores(false);
    };

    const handleMultiFavoritar = async () => {
        let added = 0;
        for (const verse of multiSelecionados) {
            const v = getVersiculoObj(verse);
            if (!v) continue;
            const existente = interacoesMap.favoritos[verse];
            if (!existente) {
                await salvarInteracao({
                    tipo: 'favorito', livro_abrev: livroAtual.abrev, livro_nome: livroAtual.nome,
                    capitulo: capituloAtual, versiculo: v.verse, texto_versiculo: v.text
                });
                added++;
            }
        }
        success(`${added} versículos favoritados!`);
        await carregarInteracoes();
    };

    const handleMultiCopiar = async () => {
        const textos = multiSelecionados.map(verse => {
            const v = getVersiculoObj(verse);
            return v ? `(${v.verse}) ${v.text}` : '';
        }).filter(Boolean);
        const ref = `${livroAtual.nome} ${capituloAtual}:${multiSelecionados.join(',')} (${versaoBiblia.nome})`;
        await navigator.clipboard.writeText(`${textos.join('\n')}\n— ${ref}`);
        success(`${multiSelecionados.length} versículos copiados!`);
    };

    const handleMultiCompartilhar = async () => {
        const textos = multiSelecionados.map(verse => {
            const v = getVersiculoObj(verse);
            return v ? `(${v.verse}) ${v.text}` : '';
        }).filter(Boolean);
        const ref = `${livroAtual.nome} ${capituloAtual}:${multiSelecionados.join(',')} (${versaoBiblia.nome})`;
        const texto = `${textos.join('\n')}\n— ${ref}`;
        if (navigator.share) {
            try { await navigator.share({ title: ref, text: texto }); } catch { /* cancelled */ }
        } else {
            await navigator.clipboard.writeText(texto);
            success('Copiado para compartilhar!');
        }
    };

    // ==========================================
    // NOTA FULLSCREEN
    // ==========================================
    const abrirNotaFullscreen = (verse: number) => {
        const notaExistente = interacoesMap.notas[verse];
        setTextoNota(notaExistente?.nota || '');
        setNotaFullscreenVerso(verse);
        setNotaFullscreen(true);
        setVersiculoSelecionado(null);
        setMostrarNota(false);
    };

    const salvarNotaFullscreen = async () => {
        if (!notaFullscreenVerso || !textoNota.trim()) return;
        const v = getVersiculoObj(notaFullscreenVerso);
        if (!v) return;

        const existente = interacoesMap.notas[notaFullscreenVerso];
        if (existente) {
            await atualizarNota(existente.id!, textoNota.trim());
        } else {
            await salvarInteracao({
                tipo: 'nota', livro_abrev: livroAtual.abrev, livro_nome: livroAtual.nome,
                capitulo: capituloAtual, versiculo: v.verse, texto_versiculo: v.text, nota: textoNota.trim()
            });
        }
        success('Nota salva!');
        setNotaFullscreen(false);
        setNotaFullscreenVerso(null);
        await carregarInteracoes();
    };

    // ==========================================
    // ESTUDO IA
    // ==========================================
    const handleEstudar = async () => {
        if (!versiculoSelecionado) return;
        const v = getVersiculoObj(versiculoSelecionado);
        if (!v) return;

        setEstudoVersiculo(v);
        setEstudoAberto(true);
        setEstudoLoading(true);
        setEstudoTexto('');
        setVersiculoSelecionado(null);

        try {
            const resp = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/execute`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
                },
                body: JSON.stringify({
                    modo_id: 'explicar_passagem',
                    data: new Date().toISOString().split('T')[0],
                    referencia: `${livroAtual.nome} ${capituloAtual}:${v.verse}`,
                    versiculos: `(${v.verse}) ${v.text}`,
                    parte: 1
                })
            });

            const data = await resp.json();
            if (data.ok && data.resultado) {
                setEstudoTexto(data.resultado);
            } else {
                setEstudoTexto('Erro ao gerar explicação. Tente novamente.');
            }
        } catch {
            setEstudoTexto('Erro de conexão. Tente novamente.');
        } finally {
            setEstudoLoading(false);
        }
    };

    // ==========================================
    // BUSCA NA BÍBLIA
    // ==========================================
    const handleBuscar = async () => {
        const termo = termoBusca.trim();
        if (!termo) return;

        // Tentar interpretar como referência bíblica (ex: "João 3:16", "Josué 1-5", "Gn 1", "Salmos 23")
        // Aceita : ou - como separador de versículo, e ignora acentos
        const refMatch = termo.match(/^(\d?\s*[a-záàâãéèêíïóôõöúçñ]+)\s+(\d+)(?:\s*[:\-–]\s*(\d+)(?:\s*[-–]\s*(\d+))?)?$/i);
        if (refMatch) {
            const normalizar = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
            const alvo = normalizar(refMatch[1].trim());
            const cap = parseInt(refMatch[2]);
            const livroEncontrado = LIVROS_BIBLIA.find(l => {
                const nome = normalizar(l.nome);
                const abrev = normalizar(l.abrev);
                return nome === alvo || abrev === alvo || nome.startsWith(alvo);
            });
            if (livroEncontrado) {
                navegarPara(livroEncontrado.abrev, cap, refMatch[3] ? parseInt(refMatch[3]) : undefined);
                setBuscaAberta(false);
                setTermoBusca('');
                setResultadosBusca([]);
                setLivrosEncontrados([]);
                return;
            }
        }

        setBuscaLoading(true);
        setResultadosBusca([]);

        try {
            // 1) Busca LOCAL primeiro (Bíblia baixada): ignora acentos
            //    ("coracao" acha "coração"), aceita termos curtos ("fé") e
            //    funciona offline. A API bolls.life falha nesses casos.
            const locais = await searchVersesLocal(versaoBiblia.codigo, termo, 100);
            if (locais.length > 0) {
                setResultadosBusca(locais);
                return;
            }

            // 2) Fallback: API remota (exige acentos corretos e 3+ caracteres)
            if (termo.length >= 3 && navigator.onLine) {
                const resp = await fetch(`https://bolls.life/search/${versaoBiblia.codigo}/${encodeURIComponent(termo)}/`);
                if (resp.ok) {
                    const data = await resp.json();
                    const validos = Array.isArray(data) ? data.filter((d: { book?: number }) => d.book) : [];
                    setResultadosBusca(validos.slice(0, 100));
                } else {
                    toastError(`Busca falhou (${resp.status})`);
                }
            }
        } catch {
            toastError('Erro na busca — verifique conexão');
        } finally {
            setBuscaLoading(false);
        }
    };

    // Busca ao vivo: sugere livros instantaneamente e dispara busca de texto após debounce
    useEffect(() => {
        const termo = termoBusca.trim().toLowerCase();
        if (!termo) {
            setLivrosEncontrados([]);
            setResultadosBusca([]);
            return;
        }

        // Filtro local de livros (instantâneo)
        const matches = LIVROS_BIBLIA.filter(l =>
            l.nome.toLowerCase().includes(termo) ||
            l.abrev.toLowerCase().includes(termo)
        ).slice(0, 8);
        setLivrosEncontrados(matches);

        // Debounce para busca de texto (2+ chars; a busca local aceita termos
        // curtos como "fé" — a API remota continua exigindo 3+)
        if (termo.length < 2) {
            setResultadosBusca([]);
            return;
        }
        const refMatch = termo.match(/^(\d?\s*[a-záàâãéèêíïóôõöúçñ]+)\s+(\d+)(?:\s*[:\-–]\s*(\d+)(?:\s*[-–]\s*(\d+))?)?$/i);
        if (refMatch) {
            setResultadosBusca([]);
            // Auto-navegar se referência completa e livro conhecido
            const normalizar = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
            const alvo = normalizar(refMatch[1].trim());
            const livro = LIVROS_BIBLIA.find(l => {
                const nome = normalizar(l.nome);
                const abrev = normalizar(l.abrev);
                return nome === alvo || abrev === alvo || nome.startsWith(alvo);
            });
            if (livro) {
                const timer = setTimeout(() => {
                    handleBuscar();
                }, 600);
                return () => clearTimeout(timer);
            }
            return;
        }

        const timer = setTimeout(() => {
            handleBuscar();
        }, 500);
        return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [termoBusca, versaoBiblia.codigo]);

    const limparBusca = () => {
        setTermoBusca('');
        setResultadosBusca([]);
        setLivrosEncontrados([]);
    };

    // Highlight tolerante a acentos: "coracao" marca "coração" no resultado
    const ACCENT_CLASSES: Record<string, string> = {
        a: '[aáàâãä]', e: '[eéèêë]', i: '[iíìîï]', o: '[oóòôõö]', u: '[uúùûü]', c: '[cç]', n: '[nñ]',
    };
    const highlightTermo = (texto: string): string => {
        if (!termoBusca.trim()) return texto;
        const clean = texto.replace(/<[^>]*>/g, '');
        const base = termoBusca.trim().normalize('NFD').replace(/[̀-ͯ]/g, '');
        const pattern = base
            .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
            .split('')
            .map(ch => ACCENT_CLASSES[ch.toLowerCase()] || ch)
            .join('');
        try {
            return clean.replace(new RegExp(`(${pattern})`, 'gi'), '<mark class="bg-amber-400/40 text-inherit rounded px-0.5">$1</mark>');
        } catch {
            return clean;
        }
    };

    const getLivroByBookId = (bookId: number) => {
        const entry = Object.entries(LIVRO_PARA_ID).find(([, id]) => id === bookId);
        if (!entry) return null;
        return LIVROS_BIBLIA.find(l => l.abrev === entry[0]);
    };

    // ==========================================
    // PAINEL DE SALVOS
    // ==========================================
    const abrirPainel = async (aba: 'favoritos' | 'destaques' | 'notas') => {
        setPainelAba(aba);
        setPainelAberto(true);
        setPainelLoading(true);
        setPainelCorFiltro(null);

        // Carrega os 3 tipos em paralelo: a aba ativa + contadores das outras
        const [favoritos, destaques, notas] = await Promise.all([
            getAllInteracoesPorTipo('favorito', 200),
            getAllInteracoesPorTipo('destaque', 200),
            getAllInteracoesPorTipo('nota', 200),
        ]);
        const porAba = { favoritos, destaques, notas };
        setPainelItens(porAba[aba]);
        setPainelCounts({ favorito: favoritos.length, destaque: destaques.length, nota: notas.length });
        setPainelLoading(false);
    };

    const removerItemPainel = async (id: number) => {
        await removerInteracao(id);
        setPainelItens(prev => prev.filter(i => i.id !== id));
        const tipoAtual = painelAba === 'favoritos' ? 'favorito' : painelAba === 'destaques' ? 'destaque' : 'nota';
        setPainelCounts(prev => prev ? { ...prev, [tipoAtual]: Math.max(0, prev[tipoAtual] - 1) } : prev);
        success('Removido!');
        await carregarInteracoes();
    };

    const exportarSalvos = async () => {
        if (painelItensFiltrados.length === 0) return;
        const linhas = painelItensFiltrados.map(it => {
            const ref = `${it.livro_nome} ${it.capitulo}:${it.versiculo}`;
            return `"${it.texto_versiculo}" — ${ref}${it.nota ? `\n📝 ${it.nota}` : ''}`;
        });
        try {
            await navigator.clipboard.writeText(linhas.join('\n\n'));
            success(`${linhas.length} ${linhas.length === 1 ? 'item copiado' : 'itens copiados'}!`);
        } catch {
            toastError('Não foi possível copiar');
        }
    };

    const navegarParaItem = (item: BibliaInteracao) => {
        navegarPara(item.livro_abrev, item.capitulo, item.versiculo);
        setPainelAberto(false);
    };

    const copiarItemPainel = async (item: BibliaInteracao) => {
        const ref = `${item.livro_nome} ${item.capitulo}:${item.versiculo}`;
        const textoBase = `"${item.texto_versiculo}" — ${ref} (${versaoBiblia.nome})`;
        const texto = item.nota
            ? `${textoBase}\n\n📝 Nota: ${item.nota}`
            : textoBase;
        try {
            await navigator.clipboard.writeText(texto);
            success(item.nota ? 'Versículo + nota copiados!' : 'Versículo copiado!');
        } catch {
            toastError('Não foi possível copiar');
        }
    };

    const compartilharItemPainel = async (item: BibliaInteracao) => {
        const ref = `${item.livro_nome} ${item.capitulo}:${item.versiculo}`;
        const textoBase = `"${item.texto_versiculo}"\n— ${ref} (${versaoBiblia.nome})`;
        const texto = item.nota
            ? `${textoBase}\n\n📝 ${item.nota}`
            : textoBase;
        if (navigator.share) {
            try {
                await navigator.share({ title: ref, text: texto });
            } catch { /* user cancelled */ }
        } else {
            try {
                await navigator.clipboard.writeText(texto);
                success('Copiado para compartilhar!');
            } catch {
                toastError('Não foi possível compartilhar');
            }
        }
    };

    const iniciarEdicaoNotaPainel = (item: BibliaInteracao) => {
        setPainelNotaEditId(item.id!);
        setPainelNotaTexto(item.nota || '');
    };

    const salvarNotaPainel = async (item: BibliaInteracao) => {
        if (!painelNotaTexto.trim()) return;
        // Sempre atualiza o campo nota no registro existente (funciona tanto para adicionar nova nota quanto editar existente)
        await atualizarNota(item.id!, painelNotaTexto.trim());
        success('Nota salva!');
        setPainelNotaEditId(null);
        setPainelNotaTexto('');
        // Recarregar itens do painel
        await abrirPainel(painelAba);
        await carregarInteracoes();
    };

    const criarNovaNotaPainel = async () => {
        if (!novaNotaRef.trim() || !novaNotaTexto.trim()) return;
        // Interpretar referência (ex: "João 3:16", "Gn 1:1")
        const refMatch = novaNotaRef.trim().match(/^(\d?\s*[a-záàâãéèêíïóôõöúçñ]+)\s+(\d+):(\d+)$/i);
        if (!refMatch) {
            toastError('Formato inválido. Use: Livro capítulo:versículo (ex: João 3:16)');
            return;
        }
        const nomeLivro = refMatch[1].trim().toLowerCase();
        const cap = parseInt(refMatch[2]);
        const vers = parseInt(refMatch[3]);
        const livro = LIVROS_BIBLIA.find(l =>
            l.nome.toLowerCase() === nomeLivro ||
            l.abrev.toLowerCase() === nomeLivro ||
            l.nome.toLowerCase().startsWith(nomeLivro)
        );
        if (!livro) {
            toastError('Livro não encontrado');
            return;
        }
        if (cap < 1 || cap > livro.capitulos) {
            toastError(`${livro.nome} tem ${livro.capitulos} capítulos`);
            return;
        }
        setNovaNotaSalvando(true);
        try {
            const bookId = LIVRO_PARA_ID[livro.abrev] || 1;
            const data = await fetchBibliaComFallback(bookId, cap, versaoBiblia.codigo);
            if (data.length === 0) throw new Error('Erro ao buscar versículo');
            const versiculo = data.find((v: { verse: number }) => v.verse === vers);
            if (!versiculo) {
                toastError(`Versículo ${vers} não encontrado em ${livro.nome} ${cap}`);
                return;
            }
            const textoLimpo = (versiculo.text || '').replace(/<[^>]*>/g, '').trim();
            await salvarInteracao({
                tipo: 'nota',
                livro_abrev: livro.abrev,
                livro_nome: livro.nome,
                capitulo: cap,
                versiculo: vers,
                texto_versiculo: textoLimpo,
                nota: novaNotaTexto.trim()
            });
            success('Nota criada!');
            setNovaNotaAberta(false);
            setNovaNotaRef('');
            setNovaNotaTexto('');
            await abrirPainel('notas');
            await carregarInteracoes();
        } catch {
            toastError('Erro ao criar nota');
        } finally {
            setNovaNotaSalvando(false);
        }
    };

    // ==========================================
    // HELPERS VISUAIS
    // ==========================================
    const getCorClasse = (verse: number): string => {
        const destaque = interacoesMap.destaques[verse];
        if (!destaque) return '';
        const cor = CORES_DESTAQUE.find(c => c.id === destaque.cor);
        return cor ? `${cor.bg} ${cor.border} border-l-2` : '';
    };

    const isFavorito = (verse: number): boolean => !!interacoesMap.favoritos[verse];
    const temNota = (verse: number): boolean => !!interacoesMap.notas[verse];

    const getTituloSecao = (verse: number): string | null => {
        const chave = `${livroAtual.abrev}:${capituloAtual}`;
        const titulos = TITULOS_SECAO[chave];
        if (!titulos) return null;
        return titulos[verse] || null;
    };

    // Formata data relativa (ex: "agora", "há 5 min", "ontem", "há 3 dias", "15 abr")
    const formatarDataRelativa = (isoStr?: string): string => {
        if (!isoStr) return '';
        const agora = new Date();
        const data = new Date(isoStr);
        const diffMs = agora.getTime() - data.getTime();
        const diffMin = Math.floor(diffMs / 60000);
        const diffH = Math.floor(diffMs / 3600000);
        const diffDias = Math.floor(diffMs / 86400000);

        if (diffMin < 1) return 'agora';
        if (diffMin < 60) return `há ${diffMin} min`;
        if (diffH < 24) return `há ${diffH}h`;
        if (diffDias === 1) return 'ontem';
        if (diffDias < 7) return `há ${diffDias} dias`;
        if (diffDias < 30) return `há ${Math.floor(diffDias / 7)} sem`;
        // > 30 dias: mostra data curta
        return data.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace('.', '');
    };

    // Agrupa itens por faixa de tempo para exibição em seções
    const agruparItensPorTempo = (itens: BibliaInteracao[]): Array<{ titulo: string; items: BibliaInteracao[] }> => {
        const hoje: BibliaInteracao[] = [];
        const semana: BibliaInteracao[] = [];
        const mes: BibliaInteracao[] = [];
        const antigos: BibliaInteracao[] = [];
        const agora = new Date();
        for (const it of itens) {
            if (!it.created_at) { antigos.push(it); continue; }
            const d = new Date(it.created_at);
            const diffD = Math.floor((agora.getTime() - d.getTime()) / 86400000);
            if (diffD < 1) hoje.push(it);
            else if (diffD < 7) semana.push(it);
            else if (diffD < 30) mes.push(it);
            else antigos.push(it);
        }
        const grupos = [
            { titulo: 'Hoje', items: hoje },
            { titulo: 'Esta semana', items: semana },
            { titulo: 'Este mês', items: mes },
            { titulo: 'Antigos', items: antigos },
        ];
        return grupos.filter(g => g.items.length > 0);
    };

    // Filtra + ordena os itens do painel com base em busca/ordem/cor
    const painelItensFiltrados = (() => {
        const termo = painelBusca.trim().toLowerCase();
        let arr = termo
            ? painelItens.filter(it =>
                (it.livro_nome || '').toLowerCase().includes(termo) ||
                (it.texto_versiculo || '').toLowerCase().includes(termo) ||
                (it.nota || '').toLowerCase().includes(termo) ||
                `${it.livro_nome} ${it.capitulo}:${it.versiculo}`.toLowerCase().includes(termo)
            )
            : [...painelItens];

        if (painelAba === 'destaques' && painelCorFiltro) {
            arr = arr.filter(it => it.cor === painelCorFiltro);
        }

        if (painelOrdem === 'recente') {
            arr.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
        } else if (painelOrdem === 'antigo') {
            arr.sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''));
        } else if (painelOrdem === 'livro') {
            arr.sort((a, b) => {
                const livroCmp = (a.livro_nome || '').localeCompare(b.livro_nome || '');
                if (livroCmp !== 0) return livroCmp;
                if (a.capitulo !== b.capitulo) return a.capitulo - b.capitulo;
                return a.versiculo - b.versiculo;
            });
        }
        return arr;
    })();

    return (
        <CosmicBackground className="min-h-screen">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-white/80 dark:bg-surface-0/80 backdrop-blur-xl border-b border-slate-200 dark:border-border-subtle">
                <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>

                    <div className="flex items-center gap-2">
                        <Book className="w-5 h-5 text-amber-400" />
                        <span className="text-sm font-bold text-text-primary">Bíblia Sagrada</span>
                        {/* Indicador de conectividade */}
                        {!isOnline ? (
                            <span className="flex items-center gap-1 text-[10px] text-orange-400 bg-orange-500/15 px-1.5 py-0.5 rounded-full">
                                <WifiOff className="w-3 h-3" /> offline
                            </span>
                        ) : cameFromCache ? (
                            <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/15 px-1.5 py-0.5 rounded-full">
                                <Database className="w-3 h-3" /> cache
                            </span>
                        ) : null}
                        {/* Indicador de sync pendente */}
                        {syncing ? (
                            <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/15 px-1.5 py-0.5 rounded-full animate-pulse">
                                <Loader2 className="w-3 h-3 animate-spin" /> sync...
                            </span>
                        ) : pendingCount > 0 ? (
                            <span className="flex items-center gap-1 text-[10px] text-sky-400 bg-sky-500/15 px-1.5 py-0.5 rounded-full">
                                {pendingCount} pendente{pendingCount > 1 ? 's' : ''}
                            </span>
                        ) : null}
                    </div>

                    <div className="flex items-center gap-1">
                        <button onClick={() => setBuscaAberta(!buscaAberta)} className="p-2 rounded-lg hover:bg-surface-2 text-text-muted hover:text-amber-400 transition-colors" title="Buscar">
                            <Search className="w-5 h-5" />
                        </button>
                        <button onClick={() => setBookmarksAberto(true)} className="p-2 rounded-lg hover:bg-surface-2 text-text-muted hover:text-amber-400 transition-colors" title="Bookmarks">
                            <BookmarkCheck className="w-5 h-5" />
                        </button>
                        <button onClick={() => setOfflineManagerAberto(true)} className="p-2 rounded-lg hover:bg-surface-2 text-text-muted hover:text-amber-400 transition-colors" title="Offline">
                            <Download className="w-5 h-5" />
                        </button>
                        <button onClick={() => abrirPainel('favoritos')} className="p-2 rounded-lg hover:bg-surface-2 text-text-muted hover:text-amber-400 transition-colors" title="Salvos">
                            <BookmarkIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Barra de busca expansível */}
                {buscaAberta && (
                    <div className="px-4 pb-3 animate-in slide-in-from-top duration-200">
                        <div className="flex gap-2">
                            <div className="flex-1 relative">
                                <input
                                    type="text"
                                    value={termoBusca}
                                    onChange={e => setTermoBusca(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleBuscar()}
                                    placeholder="Buscar texto ou referência (ex: João 3:16)..."
                                    className="w-full bg-surface-2 border border-border-subtle rounded-xl px-4 py-2.5 pr-8 text-text-primary placeholder-slate-500 focus:outline-none focus:border-amber-500/50 text-sm"
                                    autoFocus
                                />
                                {termoBusca && (
                                    <button onClick={limparBusca} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-text-muted hover:text-text-primary transition-colors">
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                            <button onClick={handleBuscar} disabled={buscaLoading} className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl text-sm transition-colors disabled:opacity-50">
                                {buscaLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Buscar'}
                            </button>
                        </div>

                        {/* Sugestões de livros (local, instantâneo) */}
                        {livrosEncontrados.length > 0 && (
                            <div className="mt-2">
                                <span className="text-xs text-text-muted font-medium px-2">Livros</span>
                                <div className="mt-1 space-y-1 bg-slate-100 dark:bg-black/40 rounded-xl p-2 border border-slate-200 dark:border-transparent">
                                    {livrosEncontrados.map(livro => (
                                        <button
                                            key={livro.abrev}
                                            onClick={() => {
                                                navegarPara(livro.abrev, 1);
                                                setBuscaAberta(false);
                                                limparBusca();
                                            }}
                                            className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 dark:hover:bg-white/5 transition-colors flex items-center justify-between"
                                        >
                                            <span className="text-text-primary text-sm font-semibold">{livro.nome}</span>
                                            <span className="text-xs text-text-muted">{livro.capitulos} cap.</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Resultados de busca */}
                        {resultadosBusca.length > 0 && (
                            <div className="mt-2">
                                <div className="flex items-center justify-between px-2 mb-1.5">
                                    <span className="text-xs text-text-muted font-medium">
                                        {resultadosBusca.length} resultado{resultadosBusca.length !== 1 ? 's' : ''} encontrado{resultadosBusca.length !== 1 ? 's' : ''}
                                    </span>
                                    <span className="text-xs text-text-muted">{versaoBiblia.nome}</span>
                                </div>
                                <div className="max-h-72 overflow-y-auto space-y-1 bg-slate-100 dark:bg-black/40 rounded-xl p-2 border border-slate-200 dark:border-transparent">
                                    {resultadosBusca.map((r, i) => {
                                        const livro = getLivroByBookId(r.book);
                                        return (
                                            <button
                                                key={i}
                                                onClick={() => {
                                                    if (livro) {
                                                        navegarPara(livro.abrev, r.chapter, r.verse);
                                                        setBuscaAberta(false);
                                                        setResultadosBusca([]);
                                                        setTermoBusca('');
                                                    }
                                                }}
                                                className="w-full text-left p-2.5 rounded-lg hover:bg-white/10 dark:hover:bg-white/5 transition-colors group"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className="text-amber-400 text-xs font-bold whitespace-nowrap">{livro?.nome || `Livro ${r.book}`} {r.chapter}:{r.verse}</span>
                                                    <ChevronRight className="w-3 h-3 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </div>
                                                <div
                                                    className="text-text-secondary text-sm mt-0.5 line-clamp-2"
                                                    dangerouslySetInnerHTML={{ __html: highlightTermo(r.text || '') }}
                                                />
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Estado vazio após busca sem resultados */}
                        {!buscaLoading && resultadosBusca.length === 0 && livrosEncontrados.length === 0 && termoBusca.trim().length >= 2 && (
                            <div className="mt-3 text-center py-4">
                                <Search className="w-6 h-6 text-text-muted mx-auto mb-2 opacity-50" />
                                <p className="text-sm text-text-muted">Nenhum resultado para &quot;{termoBusca}&quot;</p>
                                <p className="text-xs text-text-muted mt-1">Tente outros termos ou busque por referência (ex: Gn 1, Sl 23)</p>
                                <button
                                    onClick={() => { setBuscaAberta(false); setOfflineManagerAberto(true); }}
                                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    Baixe a Bíblia para busca completa (sem acentos e offline)
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </header>

            {/* Barra de Navegação (Sticky) */}
            <div className="sticky top-[57px] z-40 bg-white/80 dark:bg-surface-0/80 backdrop-blur-xl border-b border-slate-200 dark:border-border-subtle">
                <div className="max-w-4xl mx-auto px-4 py-2.5 flex items-center justify-between gap-2">
                    <button onClick={abrirModal} className="flex-1 min-w-0 glass-panel px-3 py-2.5 rounded-xl flex items-center justify-between hover:bg-surface-2 transition-colors group">
                        <div className="text-left min-w-0">
                            <div className="text-[10px] text-text-muted uppercase tracking-wider">Leitura</div>
                            <div className="text-text-primary font-bold text-sm flex items-center gap-1 truncate">
                                {livroAtual.nome} {capituloAtual}
                                <ChevronDown className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
                            </div>
                        </div>
                    </button>

                    {/* Seletor de Versão */}
                    <div className="relative">
                        <button
                            onClick={() => setMostrarVersoes(!mostrarVersoes)}
                            className="glass-panel px-3 py-2.5 rounded-xl hover:bg-surface-2 transition-colors flex items-center gap-1.5"
                            title="Versão da Bíblia"
                        >
                            <Languages className="w-4 h-4 text-amber-400" />
                            <span className="text-xs font-bold text-amber-400">{versaoBiblia.nome}</span>
                            <ChevronDown className="w-3 h-3 text-text-muted" />
                        </button>

                        {mostrarVersoes && (
                            <div className="absolute top-full right-0 mt-1.5 w-72 bg-white/98 dark:bg-surface-2/98 border border-slate-200 dark:border-border-subtle rounded-2xl shadow-2xl backdrop-blur-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                                <div className="p-2 border-b border-slate-200 dark:border-border-subtle">
                                    <p className="text-[10px] text-text-muted uppercase tracking-wider px-2 py-1">Versão da Bíblia</p>
                                </div>
                                <div className="max-h-64 overflow-y-auto p-1.5">
                                    {VERSOES_BIBLIA.map(v => (
                                        <button
                                            key={v.codigo}
                                            onClick={() => trocarVersao(v)}
                                            className={`w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-center gap-3 ${versaoBiblia.codigo === v.codigo
                                                ? 'bg-amber-500/20 border border-amber-500/30'
                                                : 'hover:bg-surface-1 border border-transparent'
                                                }`}
                                        >
                                            <span className={`text-sm font-bold min-w-[40px] ${versaoBiblia.codigo === v.codigo ? 'text-amber-400' : 'text-text-primary'}`}>
                                                {v.nome}
                                            </span>
                                            <span className="text-xs text-text-muted truncate">{v.nomeCompleto}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Controle de Fonte */}
                    <div className="relative">
                        <button
                            onClick={() => setMostrarFontes(!mostrarFontes)}
                            className="glass-panel px-3 py-2.5 rounded-xl hover:bg-surface-2 transition-colors flex items-center gap-1"
                            title="Tamanho da fonte"
                        >
                            <span className="text-[11px] font-bold text-text-primary leading-none">A</span>
                            <span className="text-[15px] font-bold text-amber-400 leading-none">A</span>
                        </button>

                        {mostrarFontes && (
                            <div className="absolute top-full right-0 mt-1.5 w-56 bg-white/98 dark:bg-surface-2/98 border border-slate-200 dark:border-border-subtle rounded-2xl shadow-2xl backdrop-blur-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                                <div className="p-2 border-b border-slate-200 dark:border-border-subtle">
                                    <p className="text-[10px] text-text-muted uppercase tracking-wider px-2 py-1">Tamanho do texto</p>
                                </div>
                                <div className="flex items-end justify-between gap-1 p-3">
                                    {FONT_SIZES.map((f, idx) => (
                                        <button
                                            key={f.label}
                                            onClick={() => {
                                                setFontSizeIndex(idx);
                                                localStorage.setItem('biblia-font-size', String(idx));
                                            }}
                                            className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-xl border transition-all active:scale-95 ${fontSizeIndex === idx
                                                ? 'bg-amber-500/20 border-amber-500/50 text-amber-500 dark:text-amber-400'
                                                : 'border-transparent hover:bg-surface-1 text-text-secondary'
                                                }`}
                                            title={`Fonte ${f.label}`}
                                        >
                                            <span className="font-bold leading-none" style={{ fontSize: `${14 + idx * 4}px` }}>A</span>
                                            <span className="text-[9px] font-semibold uppercase tracking-wide opacity-70">{f.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-1">
                        <button onClick={irParaAnterior} disabled={capituloAtual <= 1} className="p-2.5 glass-panel rounded-xl disabled:opacity-30 hover:bg-surface-2 transition-colors">
                            <ChevronLeft className="w-5 h-5 text-text-primary" />
                        </button>
                        <button onClick={irParaProximo} disabled={capituloAtual >= livroAtual.capitulos} className="p-2.5 glass-panel rounded-xl disabled:opacity-30 hover:bg-surface-2 transition-colors">
                            <ChevronRight className="w-5 h-5 text-text-primary" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Backdrop para fechar dropdowns (versões / fontes) */}
            {(mostrarVersoes || mostrarFontes) && (
                <div className="fixed inset-0 z-30" onClick={() => { setMostrarVersoes(false); setMostrarFontes(false); }} />
            )}

            {/* --- MODAL DE SELEÇÃO --- */}
            {modalAberto && (
                <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center sm:p-4 bg-black/50 dark:bg-background/90 backdrop-blur-md animate-in fade-in duration-200">
                    <div
                        className="bg-white dark:bg-surface-1 sm:rounded-2xl w-full sm:max-w-lg h-[100dvh] sm:h-auto sm:max-h-[85vh] flex flex-col overflow-hidden sm:border border-slate-200 dark:border-border-subtle shadow-2xl"
                        style={{ paddingTop: 'env(safe-area-inset-top)' }}
                    >
                        <div className="px-4 py-3.5 border-b border-slate-200 dark:border-border-subtle flex items-center justify-between bg-white dark:bg-surface-1">
                            {faseSelecao === 'capitulos' ? (
                                <button onClick={() => setFaseSelecao('livros')} className="flex items-center gap-1.5 text-amber-500 dark:text-amber-400 hover:text-amber-600 dark:hover:text-amber-300 text-sm font-semibold">
                                    <ArrowLeft className="w-4 h-4" /> Voltar
                                </button>
                            ) : faseSelecao === 'versiculos' ? (
                                <button onClick={() => setFaseSelecao('capitulos')} className="flex items-center gap-1.5 text-amber-500 dark:text-amber-400 hover:text-amber-600 dark:hover:text-amber-300 text-sm font-semibold">
                                    <ArrowLeft className="w-4 h-4" /> Voltar
                                </button>
                            ) : <div className="w-16" />}
                            <h3 className="text-base sm:text-lg font-bold text-text-primary tracking-tight">
                                {faseSelecao === 'livros' ? 'Escolha o Livro' : faseSelecao === 'capitulos' ? livroSelecionadoTemp.nome : `${livroSelecionadoTemp.nome} ${capituloSelecionadoTemp}`}
                            </h3>
                            <button onClick={fecharModalSelecao} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-surface-2 text-text-muted hover:text-text-primary transition-colors"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="overflow-y-auto flex-1">
                            {faseSelecao === 'livros' && (
                                <>
                                    {/* Busca rápida por livro / referência */}
                                    <div className="sticky top-0 z-30 bg-white dark:bg-surface-1 px-4 pt-3 pb-2 border-b border-slate-200 dark:border-border-subtle">
                                        <div className="relative">
                                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-text-muted pointer-events-none" />
                                            <input
                                                type="text"
                                                value={buscaLivro}
                                                onChange={(e) => setBuscaLivro(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && referenciaBusca) {
                                                        e.preventDefault();
                                                        irParaReferencia();
                                                    }
                                                }}
                                                placeholder="Buscar livro ou referência (ex: João 3:16)"
                                                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-50 dark:bg-surface-2/60 border border-slate-200 dark:border-border-subtle text-[14px] text-slate-900 dark:text-text-primary placeholder:text-slate-400 dark:placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/40 transition"
                                                autoComplete="off"
                                                autoCorrect="off"
                                                spellCheck={false}
                                            />
                                            {buscaLivro && (
                                                <button
                                                    onClick={() => setBuscaLivro('')}
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-slate-200 dark:hover:bg-surface-2 text-slate-400 dark:text-text-muted hover:text-slate-700 dark:hover:text-text-primary transition-colors"
                                                    title="Limpar"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>

                                        {/* Botão ir direto para referência detectada */}
                                        {referenciaBusca && (
                                            <button
                                                onClick={irParaReferencia}
                                                className="mt-2 w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-amber-500/15 border border-amber-500/40 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 transition-colors active:scale-[0.99]"
                                            >
                                                <span className="flex items-center gap-2 text-sm font-semibold">
                                                    <Book className="w-4 h-4" />
                                                    Ir para {referenciaBusca.livro.nome} {referenciaBusca.capitulo}{referenciaBusca.versiculo ? `:${referenciaBusca.versiculo}` : ''}
                                                </span>
                                                <span className="text-[11px] font-medium opacity-70">Enter ↵</span>
                                            </button>
                                        )}
                                    </div>

                                    <div className="px-4 py-3 space-y-5">
                                        {categoriasFiltradas.length === 0 && (
                                            <div className="py-12 text-center">
                                                <Search className="w-10 h-10 mx-auto text-slate-300 dark:text-text-muted/40 mb-3" />
                                                <p className="text-sm font-medium text-slate-600 dark:text-text-secondary">Nenhum livro encontrado</p>
                                                <p className="text-xs text-slate-400 dark:text-text-muted mt-1">Tente &ldquo;Salmos&rdquo; ou &ldquo;João 3:16&rdquo;</p>
                                            </div>
                                        )}
                                        {categoriasFiltradas.map((categoria) => {
                                            const idxOriginal = CATEGORIAS_BIBLIA.findIndex(c => c.nome === categoria.nome);
                                            const semBusca = !buscaLivro.trim();
                                            const ehInicioAT = semBusca && idxOriginal === 0;
                                            const ehInicioNT = semBusca && idxOriginal === 5;
                                            return (
                                                <div key={categoria.nome}>
                                                    {/* Divisor AT / NT */}
                                                    {(ehInicioAT || ehInicioNT) && (
                                                        <div className="sticky top-[64px] z-20 bg-white/95 dark:bg-surface-1/95 backdrop-blur-md -mx-4 px-4 py-3 mb-3 border-b border-slate-200 dark:border-border-subtle">
                                                            <div className="flex items-baseline gap-2.5">
                                                                <span className="text-sm font-black uppercase tracking-[0.15em] text-slate-900 dark:text-text-primary">
                                                                    {ehInicioAT ? 'Antigo Testamento' : 'Novo Testamento'}
                                                                </span>
                                                                <span className="text-[11px] text-slate-400 dark:text-text-muted font-semibold tabular-nums">
                                                                    {ehInicioAT ? '39 livros' : '27 livros'}
                                                                </span>
                                                                <div className="flex-1 h-px bg-gradient-to-r from-slate-200 dark:from-border-subtle to-transparent" />
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Cabeçalho de categoria (span p/ evitar reset global de h4) */}
                                                    <div className="flex items-center gap-2.5 pb-2.5">
                                                        <span className={`h-4 w-1 rounded-full ${categoria.corBarra}`} />
                                                        <span role="heading" aria-level={4} className={`text-[13px] font-bold tracking-tight ${categoria.cor}`}>
                                                            {categoria.nome}
                                                        </span>
                                                        <span className="text-[11px] text-slate-400 dark:text-text-muted font-medium tabular-nums">
                                                            · {categoria.livros.length} {categoria.livros.length === 1 ? 'livro' : 'livros'}
                                                        </span>
                                                    </div>

                                                    {/* Livros da categoria */}
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                        {categoria.livros.map(livro => {
                                                            const isAtual = livro.abrev === livroAtual.abrev;
                                                            return (
                                                                <button key={livro.abrev} onClick={() => selecionarLivroTemp(livro)}
                                                                    className={`relative group overflow-hidden w-full flex items-center justify-between pl-4 pr-4 py-3.5 rounded-xl text-left transition-all border
                                                                        ${isAtual
                                                                            ? 'bg-amber-500/10 dark:bg-amber-500/15 border-amber-500/50 text-amber-700 dark:text-amber-300 shadow-sm shadow-amber-500/10'
                                                                            : 'bg-white dark:bg-surface-1/80 border-slate-200 dark:border-white/8 hover:bg-slate-50 dark:hover:bg-surface-2 text-slate-900 dark:text-text-primary hover:border-slate-300 dark:hover:border-white/15 active:scale-[0.98]'
                                                                        }`}
                                                                >
                                                                    {/* Barra lateral colorida por categoria */}
                                                                    <span className={`absolute left-0 top-2.5 bottom-2.5 w-1 rounded-r-full ${categoria.corBarra} ${isAtual ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'} transition-opacity`} />

                                                                    <span className="font-semibold text-[15px] tracking-tight truncate ml-1.5">{livro.nome}</span>
                                                                    <span className={`text-xs font-medium tabular-nums ml-3 shrink-0 ${isAtual ? 'text-amber-600 dark:text-amber-300' : 'text-slate-400 dark:text-text-muted'}`}>
                                                                        {livro.capitulos} {livro.capitulos === 1 ? 'cap' : 'caps'}
                                                                    </span>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                            )}
                            {faseSelecao === 'capitulos' && (
                                <div className="grid grid-cols-5 sm:grid-cols-6 gap-2.5 p-4">
                                    {Array.from({ length: livroSelecionadoTemp.capitulos }, (_, i) => i + 1).map(cap => {
                                        const isAtual = livroSelecionadoTemp.abrev === livroAtual.abrev && cap === capituloAtual;
                                        return (
                                            <button key={cap} onClick={() => selecionarCapituloTemp(cap)}
                                                className={`aspect-square flex items-center justify-center rounded-xl text-lg font-bold tabular-nums transition-all border active:scale-[0.95] ${isAtual
                                                    ? 'bg-amber-500 text-white border-amber-400 shadow-md shadow-amber-500/30'
                                                    : 'bg-white dark:bg-surface-1/80 border-slate-200 dark:border-white/8 text-slate-800 dark:text-text-primary hover:bg-amber-50 dark:hover:bg-amber-500/10 hover:border-amber-300 dark:hover:border-amber-500/40'
                                                    }`}>
                                                {cap}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                            {faseSelecao === 'versiculos' && (
                                <div className="p-4">
                                    {/* Botão abrir capítulo inteiro */}
                                    <button onClick={() => confirmarSelecao()} className="w-full mb-4 py-3.5 px-4 rounded-xl bg-amber-500 text-white font-bold text-sm hover:bg-amber-600 transition-colors shadow-md shadow-amber-500/20 active:scale-[0.98]">
                                        Abrir capítulo inteiro
                                    </button>

                                    <p className="text-slate-500 dark:text-text-muted text-xs text-center mb-4 font-medium">Ou escolha um versículo para ir direto:</p>

                                    {loadingVersiculosTemp ? (
                                        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-amber-400 animate-spin" /></div>
                                    ) : totalVersiculosTemp > 0 ? (
                                        <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
                                            {Array.from({ length: totalVersiculosTemp }, (_, i) => i + 1).map(v => (
                                                <button key={v} onClick={() => confirmarSelecao(v)}
                                                    className="aspect-square flex items-center justify-center rounded-lg text-sm font-bold tabular-nums transition-all border bg-white dark:bg-surface-1/80 border-slate-200 dark:border-white/8 text-slate-800 dark:text-text-primary hover:bg-amber-50 dark:hover:bg-amber-500/10 hover:border-amber-300 dark:hover:border-amber-500/40 active:scale-[0.95]">
                                                    {v}
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-center text-text-muted py-4">Não foi possível carregar versículos</p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODAL DE ESTUDO IA --- */}
            {estudoAberto && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 dark:bg-background/80 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-surface-1 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[85vh] flex flex-col overflow-hidden border border-slate-200 dark:border-border-subtle shadow-2xl">
                        <div className="p-4 border-b border-slate-200 dark:border-border-subtle flex items-center justify-between bg-slate-50 dark:bg-surface-2/50">
                            <div className="flex items-center gap-2">
                                <Lightbulb className="w-5 h-5 text-amber-400" />
                                <span className="font-bold text-text-primary text-base">Estudo — {livroAtual.nome} {capituloAtual}:{estudoVersiculo?.verse}</span>
                            </div>
                            <button onClick={() => setEstudoAberto(false)} className="p-2 rounded-lg hover:bg-surface-2 text-text-muted hover:text-text-primary"><X className="w-5 h-5" /></button>
                        </div>

                        {/* Versículo destacado */}
                        {estudoVersiculo && (
                            <div className="px-4 py-3 bg-amber-50 dark:bg-amber-500/10 border-b border-amber-200 dark:border-amber-500/20">
                                <p className="text-amber-900 dark:text-amber-200 text-base italic">&ldquo;{estudoVersiculo.text}&rdquo;</p>
                            </div>
                        )}

                        <div className="flex-1 overflow-y-auto p-4">
                            {estudoLoading ? (
                                <div className="flex flex-col items-center justify-center py-12 gap-3">
                                    <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
                                    <p className="text-text-muted text-sm">Gerando explicação...</p>
                                </div>
                            ) : (
                                <div className="text-text-primary text-lg md:text-xl leading-relaxed whitespace-pre-wrap">{estudoTexto}</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* --- PAINEL DE SALVOS --- */}
            {painelAberto && (
                <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-0 sm:p-4 bg-black/40 dark:bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
                    <div
                        className="bg-white dark:bg-surface-1 sm:rounded-2xl w-full sm:max-w-lg h-[100dvh] sm:h-auto sm:max-h-[85vh] flex flex-col overflow-hidden border border-slate-200 dark:border-border-subtle shadow-2xl"
                        style={{ paddingTop: 'env(safe-area-inset-top)' }}
                    >
                        <div className="p-4 border-b border-slate-200 dark:border-border-subtle flex items-center justify-between bg-gradient-to-r from-amber-50/50 to-orange-50/50 dark:from-surface-2 dark:to-surface-2">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-xl bg-amber-500/15 dark:bg-amber-500/20 border border-amber-400/30 flex items-center justify-center">
                                    <BookmarkIcon className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-bold text-slate-900 dark:text-text-primary leading-none">Meus Salvos</span>
                                    <span className="text-[10px] text-slate-500 dark:text-text-muted mt-0.5">
                                        {painelLoading ? 'carregando...' : `${painelItens.length} ${painelItens.length === 1 ? 'item' : 'itens'}${painelBusca ? ` · ${painelItensFiltrados.length} filtrado${painelItensFiltrados.length === 1 ? '' : 's'}` : ''}`}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                {painelAba === 'notas' && (
                                    <button
                                        onClick={() => { setNovaNotaAberta(!novaNotaAberta); setNovaNotaRef(''); setNovaNotaTexto(''); }}
                                        className={`p-2 rounded-lg transition-all ${novaNotaAberta ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400' : 'hover:bg-slate-200 dark:hover:bg-surface-2 text-slate-400 dark:text-text-muted hover:text-amber-600 dark:hover:text-amber-400'}`}
                                        title="Criar nova nota"
                                    >
                                        <Plus className="w-5 h-5" />
                                    </button>
                                )}
                                <button onClick={() => setPainelAberto(false)} className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-surface-2 text-slate-400 dark:text-text-muted hover:text-slate-700 dark:hover:text-text-primary"><X className="w-5 h-5" /></button>
                            </div>
                        </div>

                        {/* Abas com contadores */}
                        <div className="flex border-b border-slate-200 dark:border-border-subtle bg-white dark:bg-transparent">
                            {(['favoritos', 'destaques', 'notas'] as const).map(aba => {
                                const tipoKey = aba === 'favoritos' ? 'favorito' : aba === 'destaques' ? 'destaque' : 'nota';
                                const count = painelCounts ? painelCounts[tipoKey] : (aba === painelAba ? painelItens.length : null);
                                const icon = aba === 'favoritos' ? Heart : aba === 'destaques' ? Palette : StickyNote;
                                const Icon = icon;
                                return (
                                    <button key={aba} onClick={() => { setPainelBusca(''); abrirPainel(aba); }}
                                        className={`flex-1 py-3 px-2 text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 ${painelAba === aba ? 'text-amber-600 dark:text-amber-400 border-b-2 border-amber-500 dark:border-amber-400 bg-amber-50/50 dark:bg-surface-2' : 'text-slate-400 dark:text-text-muted hover:text-slate-700 dark:hover:text-text-primary'}`}>
                                        <Icon className="w-3.5 h-3.5" />
                                        <span>{aba === 'favoritos' ? 'Favoritos' : aba === 'destaques' ? 'Destaques' : 'Notas'}</span>
                                        {count !== null && count > 0 && (
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${painelAba === aba ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300' : 'bg-slate-100 dark:bg-surface-2 text-slate-500'}`}>
                                                {count}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Barra de busca + ordenação */}
                        {!painelLoading && painelItens.length > 0 && (
                            <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-200 dark:border-border-subtle bg-white dark:bg-surface-1">
                                <div className="flex-1 relative">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-text-muted pointer-events-none" />
                                    <input
                                        type="text"
                                        value={painelBusca}
                                        onChange={e => setPainelBusca(e.target.value)}
                                        placeholder="Buscar em salvos..."
                                        className="w-full bg-slate-50 dark:bg-surface-2 border border-slate-200 dark:border-border-subtle rounded-lg pl-8 pr-7 py-1.5 text-xs text-slate-800 dark:text-text-primary placeholder-slate-400 dark:placeholder-text-muted focus:outline-none focus:border-amber-400 dark:focus:border-amber-500/50"
                                    />
                                    {painelBusca && (
                                        <button onClick={() => setPainelBusca('')} className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-surface-1 text-slate-400 dark:text-text-muted">
                                            <X className="w-3 h-3" />
                                        </button>
                                    )}
                                </div>
                                <select
                                    value={painelOrdem}
                                    onChange={e => setPainelOrdem(e.target.value as typeof painelOrdem)}
                                    className="text-[11px] font-semibold bg-slate-50 dark:bg-surface-2 border border-slate-200 dark:border-border-subtle rounded-lg px-2 py-1.5 text-slate-700 dark:text-text-secondary focus:outline-none focus:border-amber-400 cursor-pointer"
                                    title="Ordenar"
                                >
                                    <option value="recente">Recente</option>
                                    <option value="antigo">Antigos</option>
                                    <option value="livro">Por livro</option>
                                </select>
                                <button
                                    onClick={exportarSalvos}
                                    className="p-1.5 rounded-lg border border-slate-200 dark:border-border-subtle bg-slate-50 dark:bg-surface-2 text-slate-400 dark:text-text-muted hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-300 dark:hover:border-emerald-500/40 transition-colors"
                                    title="Copiar todos os itens filtrados"
                                >
                                    <Copy className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        )}

                        {/* Filtro por cor (somente Destaques) */}
                        {!painelLoading && painelAba === 'destaques' && painelItens.length > 0 && (
                            <div className="flex items-center gap-1.5 px-3 py-2 border-b border-slate-200 dark:border-border-subtle bg-white dark:bg-surface-1">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-text-muted mr-1">Cor:</span>
                                <button
                                    onClick={() => setPainelCorFiltro(null)}
                                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all border ${painelCorFiltro === null
                                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-600 dark:text-amber-400'
                                        : 'border-slate-200 dark:border-border-subtle text-slate-400 dark:text-text-muted hover:border-slate-300'
                                        }`}
                                >
                                    Todas
                                </button>
                                {([['yellow', 'bg-yellow-400'], ['blue', 'bg-blue-400'], ['green', 'bg-green-400'], ['pink', 'bg-pink-400']] as const).map(([cor, classe]) => (
                                    <button
                                        key={cor}
                                        onClick={() => setPainelCorFiltro(painelCorFiltro === cor ? null : cor)}
                                        className={`w-6 h-6 rounded-full ${classe} transition-all border-2 ${painelCorFiltro === cor
                                            ? 'border-slate-700 dark:border-white scale-110 shadow-md'
                                            : 'border-transparent opacity-60 hover:opacity-100'
                                            }`}
                                        title={`Filtrar por ${cor}`}
                                    />
                                ))}
                            </div>
                        )}

                        <div className="flex-1 overflow-y-auto p-3 bg-white dark:bg-surface-1">
                            {/* Formulário de nova nota */}
                            {novaNotaAberta && painelAba === 'notas' && (
                                <div className="mb-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 animate-in fade-in slide-in-from-top-2 duration-150">
                                    <div className="flex items-center gap-2 mb-3">
                                        <StickyNote className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                        <span className="text-sm font-bold text-amber-700 dark:text-amber-400">Nova Nota</span>
                                    </div>
                                    <input
                                        type="text"
                                        value={novaNotaRef}
                                        onChange={e => setNovaNotaRef(e.target.value)}
                                        placeholder="Ex: João 3:16"
                                        className="w-full bg-white dark:bg-surface-1 border border-slate-200 dark:border-border-subtle rounded-xl px-3 py-2.5 text-slate-800 dark:text-text-primary text-sm placeholder-slate-400 dark:placeholder-text-muted focus:outline-none focus:border-amber-400 dark:focus:border-amber-500/50 mb-2"
                                    />
                                    <textarea
                                        value={novaNotaTexto}
                                        onChange={e => setNovaNotaTexto(e.target.value)}
                                        placeholder="Escreva sua anotação..."
                                        className="w-full bg-white dark:bg-surface-1 border border-slate-200 dark:border-border-subtle rounded-xl px-3 py-2.5 text-slate-800 dark:text-text-primary text-sm placeholder-slate-400 dark:placeholder-text-muted focus:outline-none focus:border-amber-400 dark:focus:border-amber-500/50 resize-none"
                                        rows={3}
                                    />
                                    <div className="flex justify-end gap-2 mt-2">
                                        <button
                                            onClick={() => { setNovaNotaAberta(false); setNovaNotaRef(''); setNovaNotaTexto(''); }}
                                            className="px-3 py-1.5 text-xs rounded-lg text-slate-500 dark:text-text-muted hover:bg-slate-100 dark:hover:bg-surface-2 font-medium"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            onClick={criarNovaNotaPainel}
                                            disabled={!novaNotaRef.trim() || !novaNotaTexto.trim() || novaNotaSalvando}
                                            className="px-3 py-1.5 text-xs rounded-lg bg-amber-500 text-black font-bold hover:bg-amber-400 disabled:opacity-40 transition-colors flex items-center gap-1.5"
                                        >
                                            {novaNotaSalvando && <Loader2 className="w-3 h-3 animate-spin" />}
                                            Criar Nota
                                        </button>
                                    </div>
                                </div>
                            )}

                            {painelLoading ? (
                                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-amber-500 dark:text-amber-400 animate-spin" /></div>
                            ) : painelItens.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                                    <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 flex items-center justify-center">
                                        {painelAba === 'favoritos' ? <Heart className="w-7 h-7 text-amber-400" /> : painelAba === 'destaques' ? <Palette className="w-7 h-7 text-amber-400" /> : <StickyNote className="w-7 h-7 text-amber-400" />}
                                    </div>
                                    <div>
                                        <p className="text-slate-700 dark:text-text-primary font-semibold text-sm">Nenhum{painelAba === 'favoritos' ? ' favorito' : painelAba === 'destaques' ? ' destaque' : 'a nota'} ainda</p>
                                        <p className="text-slate-400 dark:text-text-muted text-xs mt-1 max-w-[220px] mx-auto leading-relaxed">
                                            {painelAba === 'favoritos' ? 'Toque no coração ao lado de um versículo para salvá-lo aqui.' : painelAba === 'destaques' ? 'Pinte versículos durante a leitura para encontrá-los por cor.' : 'Toque no ícone + acima para criar sua primeira nota.'}
                                        </p>
                                    </div>
                                </div>
                            ) : painelItensFiltrados.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
                                    <Search className="w-6 h-6 text-slate-300 dark:text-text-muted" />
                                    <p className="text-slate-500 dark:text-text-muted text-sm">Nenhum resultado para <span className="font-semibold">“{painelBusca}”</span></p>
                                    <button onClick={() => setPainelBusca('')} className="text-amber-600 dark:text-amber-400 text-xs font-bold hover:underline">Limpar busca</button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {agruparItensPorTempo(painelItensFiltrados).map(grupo => (
                                        <div key={grupo.titulo}>
                                            <div className="flex items-center gap-2 px-1 mb-1.5">
                                                <h5 className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-text-muted">{grupo.titulo}</h5>
                                                <span className="text-[10px] text-slate-300 dark:text-text-muted">· {grupo.items.length}</span>
                                                <div className="flex-1 h-px bg-slate-200 dark:bg-border-subtle" />
                                            </div>
                                            <div className="space-y-2.5">
                                                {grupo.items.map(item => {
                                                    const corDestaque = item.tipo === 'destaque' && item.cor
                                                        ? ({ yellow: 'bg-yellow-400', blue: 'bg-blue-400', green: 'bg-green-400', pink: 'bg-pink-400' } as Record<string, string>)[item.cor]
                                                        : null;
                                                    const corBorda = item.tipo === 'destaque' && item.cor
                                                        ? ({ yellow: '#facc15', blue: '#60a5fa', green: '#4ade80', pink: '#f472b6' } as Record<string, string>)[item.cor]
                                                        : null;
                                                    return (
                                        <div key={item.id} className="p-4 rounded-xl bg-slate-50 dark:bg-surface-2 hover:bg-slate-100 dark:hover:bg-surface-2 transition-colors group border border-slate-100 dark:border-transparent" style={corBorda ? { borderLeft: `3px solid ${corBorda}` } : undefined}>
                                            <div className="flex items-start gap-3">
                                                <button onClick={() => navegarParaItem(item)} className="flex-1 text-left min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        {corDestaque && (
                                                            <span className={`w-2.5 h-2.5 rounded-full ${corDestaque} shrink-0`} aria-label="Cor do destaque" />
                                                        )}
                                                        <div className="text-amber-600 dark:text-amber-400 text-sm font-bold">{item.livro_nome} {item.capitulo}:{item.versiculo}</div>
                                                        {item.created_at && (
                                                            <span className="text-[10px] font-semibold text-slate-400 dark:text-text-muted bg-slate-100 dark:bg-surface-1 px-1.5 py-0.5 rounded-full" title={new Date(item.created_at).toLocaleString('pt-BR')}>
                                                                {formatarDataRelativa(item.created_at)}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className={`text-slate-800 dark:text-text-primary ${fontConfig.salvos} mt-1.5 leading-[1.8] font-serif`}>{item.texto_versiculo}</div>
                                                </button>
                                                <div className="flex items-center gap-0.5 shrink-0">
                                                    <button
                                                        onClick={() => copiarItemPainel(item)}
                                                        className="p-2 rounded-lg text-slate-300 dark:text-text-muted hover:bg-emerald-50 dark:hover:bg-emerald-500/15 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all"
                                                        title={item.nota ? 'Copiar versículo + nota' : 'Copiar versículo'}
                                                    >
                                                        <Copy className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => compartilharItemPainel(item)}
                                                        className="p-2 rounded-lg text-slate-300 dark:text-text-muted hover:bg-sky-50 dark:hover:bg-sky-500/15 hover:text-sky-600 dark:hover:text-sky-400 transition-all"
                                                        title="Compartilhar"
                                                    >
                                                        <Share2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => painelNotaEditId === item.id ? setPainelNotaEditId(null) : iniciarEdicaoNotaPainel(item)}
                                                        className={`p-2 rounded-lg transition-all ${painelNotaEditId === item.id ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-500' : item.nota ? 'text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10' : 'text-slate-300 dark:text-text-muted hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:text-blue-500 dark:hover:text-blue-400'}`}
                                                        title={item.nota ? 'Editar nota' : 'Adicionar nota'}
                                                    >
                                                        <StickyNote className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => removerItemPainel(item.id!)} className="p-2 rounded-lg text-slate-300 dark:text-text-muted hover:bg-red-50 dark:hover:bg-red-500/20 hover:text-red-500 dark:hover:text-red-400 transition-all" title="Remover">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Nota existente (visualização) */}
                                            {item.nota && painelNotaEditId !== item.id && (
                                                <div
                                                    onClick={() => iniciarEdicaoNotaPainel(item)}
                                                    className="text-slate-500 dark:text-text-muted text-sm mt-2 italic bg-slate-100 dark:bg-surface-1 rounded-lg px-3 py-2 border border-slate-200 dark:border-border-subtle cursor-pointer hover:border-blue-300 dark:hover:border-blue-500/30 transition-colors"
                                                >
                                                    {item.nota}
                                                </div>
                                            )}

                                            {/* Editor de nota inline */}
                                            {painelNotaEditId === item.id && (
                                                <div className="mt-3 animate-in fade-in slide-in-from-top-1 duration-150">
                                                    <textarea
                                                        value={painelNotaTexto}
                                                        onChange={e => setPainelNotaTexto(e.target.value)}
                                                        placeholder="Escreva sua anotação..."
                                                        className="w-full bg-white dark:bg-surface-1 border border-slate-200 dark:border-border-subtle rounded-xl px-3 py-2.5 text-slate-800 dark:text-text-primary text-sm placeholder-slate-400 dark:placeholder-text-muted focus:outline-none focus:border-blue-400 dark:focus:border-blue-500/50 resize-none"
                                                        rows={3}
                                                        autoFocus
                                                    />
                                                    <div className="flex justify-end gap-2 mt-2">
                                                        <button
                                                            onClick={() => { setPainelNotaEditId(null); setPainelNotaTexto(''); }}
                                                            className="px-3 py-1.5 text-xs rounded-lg text-slate-500 dark:text-text-muted hover:bg-slate-100 dark:hover:bg-surface-2 font-medium"
                                                        >
                                                            Cancelar
                                                        </button>
                                                        <button
                                                            onClick={() => salvarNotaPainel(item)}
                                                            disabled={!painelNotaTexto.trim()}
                                                            className="px-3 py-1.5 text-xs rounded-lg bg-amber-500 text-black font-bold hover:bg-amber-400 disabled:opacity-40 transition-colors"
                                                        >
                                                            Salvar
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* --- NOTA FULLSCREEN --- */}
            {notaFullscreen && notaFullscreenVerso && (
                <div className="fixed inset-0 z-[120] flex flex-col bg-white dark:bg-black/95 backdrop-blur-xl animate-in fade-in duration-200" style={{ height: '100dvh' }}>
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-border-subtle bg-slate-50 dark:bg-surface-2 shrink-0">
                        <button onClick={() => { setNotaFullscreen(false); setNotaFullscreenVerso(null); }} className="flex items-center gap-1.5 text-text-muted hover:text-text-primary text-sm font-medium">
                            <X className="w-5 h-5" />
                            <span className="hidden sm:inline">Fechar</span>
                        </button>
                        <div className="flex items-center gap-2">
                            <StickyNote className="w-4 h-4 text-blue-400" />
                            <span className="font-bold text-text-primary text-sm truncate max-w-[120px] sm:max-w-[180px]">
                                {livroAtual.nome} {capituloAtual}:{notaFullscreenVerso}
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                            <button
                                onClick={salvarNotaFullscreen}
                                disabled={!textoNota.trim()}
                                className="px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Salvar anotação"
                            >
                                Salvar
                            </button>
                            {notaFullscreenVerso && interacoesMap.notas[notaFullscreenVerso] && (
                                <button onClick={async () => {
                                    await removerPorVersiculoETipo('nota', notaFullscreenVerso);
                                    success('Nota removida');
                                    setNotaFullscreen(false);
                                    setNotaFullscreenVerso(null);
                                    await carregarInteracoes();
                                }} className="p-2 rounded-lg text-red-400 hover:bg-red-500/10" title="Apagar nota">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Versículo em destaque */}
                    <div className="px-4 py-2.5 bg-amber-50 dark:bg-amber-500/10 border-b border-amber-200 dark:border-amber-500/20 shrink-0">
                        <p className="text-amber-900 dark:text-amber-200 text-sm italic font-serif line-clamp-3">
                            <sup className="text-xs font-bold mr-1 opacity-60">{notaFullscreenVerso}</sup>
                            {getVersiculoObj(notaFullscreenVerso)?.text}
                        </p>
                    </div>

                    {/* Área de texto - ocupa todo espaço restante */}
                    <div className="flex-1 min-h-0 p-4 pb-4 flex flex-col overflow-y-auto">
                        <textarea
                            value={textoNota}
                            onChange={e => setTextoNota(e.target.value)}
                            placeholder="Escreva sua anotação, reflexão, oração, insight..."
                            className="flex-1 min-h-[120px] w-full bg-white dark:bg-surface-1 border border-slate-200 dark:border-border-subtle rounded-2xl px-5 py-4 text-slate-900 dark:text-text-primary text-base leading-relaxed placeholder-slate-400 dark:placeholder-text-muted focus:outline-none focus:border-blue-400 dark:focus:border-blue-500/50 resize-none"
                            autoFocus
                        />
                    </div>

                    {/* Barra fixa inferior com botão SALVAR sempre visível */}
                    <div className="hidden sm:block shrink-0 px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] border-t border-slate-200 dark:border-border-subtle bg-white/95 dark:bg-surface-1/95 backdrop-blur-xl">
                        <button
                            onClick={salvarNotaFullscreen}
                            disabled={!textoNota.trim()}
                            className="w-full py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-base transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-amber-500/20 active:scale-[0.98]"
                        >
                            {textoNota.trim() ? 'Salvar Anotação' : 'Digite sua anotação para salvar'}
                        </button>
                    </div>
                </div>
            )}

            {/* --- BARRA FLUTUANTE MULTI-SELEÇÃO --- */}
            {modoMultiSelecao && (
                <div className="fixed left-2 right-2 bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] md:left-1/2 md:right-auto md:bottom-4 md:-translate-x-1/2 z-[80] animate-in slide-in-from-bottom-4 duration-200">
                    <div className="bg-white/98 dark:bg-surface-1/98 border border-emerald-400/40 dark:border-emerald-500/30 rounded-2xl p-2 shadow-2xl backdrop-blur-xl overflow-x-auto">
                        <div className="flex items-center gap-1.5 min-w-max">
                            {/* Contador */}
                            <div className="px-3 py-2 text-emerald-400 font-bold text-sm min-w-[60px] text-center">
                                {versiculosSelecionados.size} sel.
                            </div>

                            <div className="w-px h-8 bg-surface-2" />

                            {/* Ações */}
                            <button
                                onClick={() => setMostrarCores(!mostrarCores)}
                                disabled={versiculosSelecionados.size === 0}
                                className="p-3 rounded-xl hover:bg-surface-2 text-text-secondary hover:text-amber-400 transition-colors disabled:opacity-30"
                                title="Destacar"
                            >
                                <Palette className="w-5 h-5" />
                            </button>
                            <button
                                onClick={handleMultiFavoritar}
                                disabled={versiculosSelecionados.size === 0}
                                className="p-3 rounded-xl hover:bg-surface-2 text-text-secondary hover:text-red-400 transition-colors disabled:opacity-30"
                                title="Favoritar"
                            >
                                <Heart className="w-5 h-5" />
                            </button>
                            <button
                                onClick={handleMultiCopiar}
                                disabled={versiculosSelecionados.size === 0}
                                className="p-3 rounded-xl hover:bg-surface-2 text-text-secondary hover:text-green-400 transition-colors disabled:opacity-30"
                                title="Copiar"
                            >
                                <Copy className="w-5 h-5" />
                            </button>
                            <button
                                onClick={handleMultiCompartilhar}
                                disabled={versiculosSelecionados.size === 0}
                                className="p-3 rounded-xl hover:bg-surface-2 text-text-secondary hover:text-blue-400 transition-colors disabled:opacity-30"
                                title="Compartilhar"
                            >
                                <Share2 className="w-5 h-5" />
                            </button>

                            <div className="w-px h-8 bg-surface-2" />

                            {/* Fechar multi-seleção */}
                            <button
                                onClick={toggleMultiSelecao}
                                className="p-3 rounded-xl hover:bg-red-500/20 text-text-muted hover:text-red-400 transition-colors"
                                title="Sair da seleção"
                            >
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Cores para multi-seleção */}
                    {mostrarCores && versiculosSelecionados.size > 0 && (
                        <div className="mt-1.5 flex items-center gap-1.5 bg-white/95 dark:bg-surface-2/95 border border-slate-200 dark:border-white/15 rounded-2xl p-2 justify-center animate-in fade-in duration-100 shadow-lg dark:shadow-none">
                            {CORES_DESTAQUE.map(cor => (
                                <button key={cor.id} onClick={() => handleMultiDestacar(cor.id)}
                                    className={`w-9 h-9 rounded-full border-2 transition-transform hover:scale-110 ${cor.bg} ${cor.border}`}
                                    title={cor.nome} />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Conteúdo Principal */}
            <main className="max-w-4xl mx-auto px-4 py-6">
                <h1 className="text-2xl md:text-3xl font-black text-text-primary mb-6 text-center tracking-tight">
                    {livroAtual.nome} <span className="text-amber-400">{capituloAtual}</span>
                    <span className="ml-2 text-xs font-medium text-text-muted bg-surface-2 px-2 py-0.5 rounded-full align-middle">{versaoBiblia.nome}</span>
                </h1>

                {loading && (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <Loader2 className="w-10 h-10 text-amber-400 animate-spin" />
                        <p className="text-text-muted animate-pulse">Carregando escrituras...</p>
                    </div>
                )}

                {error && !loading && (
                    <div className="glass-panel rounded-xl p-8 text-center max-w-md mx-auto border border-orange-500/30 bg-orange-500/10">
                        <WifiOff className="w-12 h-12 text-orange-400 mx-auto mb-4" />
                        <p className="text-orange-700 dark:text-orange-200 font-bold text-lg mb-2">Sem conexão</p>
                        <p className="text-text-muted text-sm mb-6">{error}</p>
                        <button onClick={() => buscarCapitulo(livroAtual.abrev, capituloAtual)} className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold">Tentar Novamente</button>
                    </div>
                )}

                {!loading && !error && versiculos.length > 0 && (
                    <div className="glass-panel rounded-2xl p-5 md:p-8 relative overflow-visible" ref={versiculosRef}>
                        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                        <div className={`space-y-1 ${fontConfig.value} leading-relaxed text-text-primary font-serif relative`}>
                            {versiculos.map(v => (
                                <div key={v.verse}>
                                    {/* Título de seção */}
                                    {getTituloSecao(v.verse) && (
                                        <div className="pt-6 pb-3 first:pt-0">
                                            <h2 className={`${fontConfig.titulo} font-black text-amber-700 dark:text-amber-400/90 font-sans tracking-tight border-b border-amber-300 dark:border-amber-500/20 pb-2`}>
                                                {getTituloSecao(v.verse)}
                                            </h2>
                                        </div>
                                    )}
                                    <div
                                        id={`verse-${v.verse}`}
                                        onClick={(e) => handleVersiculoClick(v.verse, e)}
                                        className={`relative pl-3 rounded-lg p-2 -ml-3 transition-all cursor-pointer select-none
                                            ${getCorClasse(v.verse)}
                                            ${modoMultiSelecao && versiculosSelecionados.has(v.verse) ? 'bg-emerald-500/15 ring-1 ring-emerald-500/40' : ''}
                                            ${!modoMultiSelecao && versiculoSelecionado === v.verse ? 'bg-surface-2 ring-1 ring-amber-500/30' : ''}
                                            ${!modoMultiSelecao && versiculoSelecionado !== v.verse ? 'hover:bg-surface-1' : ''}
                                            ${modoMultiSelecao && !versiculosSelecionados.has(v.verse) ? 'hover:bg-surface-1' : ''}
                                        `}
                                    >
                                        <p className="inline">
                                            {modoMultiSelecao && (
                                                <span className="inline-block mr-1.5 align-middle">
                                                    {versiculosSelecionados.has(v.verse)
                                                        ? <CheckSquare className="w-4 h-4 text-emerald-400 inline" />
                                                        : <Square className="w-4 h-4 text-text-muted inline" />
                                                    }
                                                </span>
                                            )}
                                            <sup className="text-xs text-amber-400 font-bold mr-1.5 select-none opacity-60">{v.verse}</sup>
                                            {v.text}
                                        </p>

                                        {/* Indicadores visuais */}
                                        <span className="inline-flex items-center gap-1 ml-1.5">
                                            {isFavorito(v.verse) && <Heart className="w-3.5 h-3.5 text-red-400 fill-red-400 inline" />}
                                            {temNota(v.verse) && <StickyNote className="w-3.5 h-3.5 text-blue-400 inline" />}
                                        </span>

                                        {/* MINI-TOOLBAR */}
                                        {versiculoSelecionado === v.verse && (
                                            <div ref={toolbarRef} className="absolute -top-16 left-1/2 -translate-x-1/2 z-30 animate-in fade-in slide-in-from-bottom-2 duration-150" onClick={e => e.stopPropagation()}>
                                                <div className="flex items-center gap-1 bg-white/95 dark:bg-surface-2/95 border border-slate-200 dark:border-border-subtle rounded-2xl p-1.5 shadow-2xl backdrop-blur-xl">
                                                    {/* Cores */}
                                                    <button onClick={() => setMostrarCores(!mostrarCores)} className="p-3 rounded-xl hover:bg-surface-1 text-text-secondary hover:text-amber-400 transition-colors" title="Destacar">
                                                        <Palette className="w-5 h-5" />
                                                    </button>
                                                    {/* Favoritar */}
                                                    <button onClick={handleFavoritar} className={`p-3 rounded-xl hover:bg-surface-1 transition-colors ${isFavorito(v.verse) ? 'text-red-400' : 'text-text-secondary hover:text-red-400'}`} title="Favoritar">
                                                        <Heart className={`w-5 h-5 ${isFavorito(v.verse) ? 'fill-red-400' : ''}`} />
                                                    </button>
                                                    {/* Copiar */}
                                                    <button onClick={handleCopiar} className="p-3 rounded-xl hover:bg-surface-1 text-text-secondary hover:text-green-400 transition-colors" title="Copiar">
                                                        <Copy className="w-5 h-5" />
                                                    </button>
                                                    {/* Compartilhar */}
                                                    <button onClick={handleCompartilhar} className="p-3 rounded-xl hover:bg-surface-1 text-text-secondary hover:text-blue-400 transition-colors" title="Compartilhar">
                                                        <Share2 className="w-5 h-5" />
                                                    </button>
                                                    {/* Estudar */}
                                                    <button onClick={handleEstudar} className="p-3 rounded-xl hover:bg-surface-1 text-text-secondary hover:text-amber-400 transition-colors" title="Estudar">
                                                        <Lightbulb className="w-5 h-5" />
                                                    </button>
                                                    {/* Nota (abre fullscreen) */}
                                                    <button onClick={() => abrirNotaFullscreen(v.verse)} className={`p-3 rounded-xl hover:bg-surface-1 transition-colors ${temNota(v.verse) ? 'text-blue-400' : 'text-text-secondary hover:text-blue-400'}`} title="Nota">
                                                        <StickyNote className="w-5 h-5" />
                                                    </button>
                                                    {/* Multi-seleção */}
                                                    <button onClick={toggleMultiSelecao} className="p-3 rounded-xl hover:bg-surface-1 text-text-secondary hover:text-emerald-400 transition-colors" title="Selecionar vários">
                                                        <CheckSquare className="w-5 h-5" />
                                                    </button>
                                                </div>

                                                {/* Seletor de cores expandido */}
                                                {mostrarCores && (
                                                    <div className="mt-1.5 flex items-center gap-1.5 bg-white/95 dark:bg-surface-2/95 border border-slate-200 dark:border-border-subtle rounded-2xl p-2 justify-center animate-in fade-in duration-100 shadow-lg dark:shadow-none">
                                                        {CORES_DESTAQUE.map(cor => (
                                                            <button key={cor.id} onClick={() => handleDestacar(cor.id)}
                                                                className={`w-9 h-9 rounded-full border-2 transition-transform hover:scale-110 ${cor.bg} ${cor.border} ${interacoesMap.destaques[v.verse]?.cor === cor.id ? 'ring-2 ring-white scale-110' : ''}`}
                                                                title={cor.nome} />
                                                        ))}
                                                        {interacoesMap.destaques[v.verse] && (
                                                            <button onClick={() => handleDestacar(interacoesMap.destaques[v.verse].cor || 'yellow')}
                                                                className="p-1.5 rounded-lg hover:bg-red-500/20 text-text-muted hover:text-red-400" title="Remover destaque">
                                                                <X className="w-5 h-5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                )}

                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Navegação Inferior */}
                <div className="flex justify-between items-center mt-8 gap-4">
                    <button onClick={irParaAnterior} disabled={capituloAtual <= 1} className="flex items-center gap-2 px-5 py-3 glass-panel rounded-xl disabled:opacity-30 hover:bg-surface-2 transition-colors group">
                        <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform text-text-primary" />
                        <span className="font-medium text-sm text-text-primary">Anterior</span>
                    </button>
                    <button onClick={irParaProximo} disabled={capituloAtual >= livroAtual.capitulos} className="flex items-center gap-2 px-5 py-3 glass-panel rounded-xl disabled:opacity-30 hover:bg-surface-2 transition-colors group">
                        <span className="font-medium text-sm text-text-primary">Próximo</span>
                        <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform text-text-primary" />
                    </button>
                </div>
            </main>

            {/* --- PAINEL DE BOOKMARKS --- */}
            {bookmarksAberto && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 dark:bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-surface-1 sm:rounded-2xl w-full sm:max-w-lg h-[70dvh] sm:h-auto sm:max-h-[75vh] flex flex-col overflow-hidden border border-slate-200 dark:border-border-subtle shadow-2xl">
                        {/* Header */}
                        <div className="p-4 border-b border-slate-200 dark:border-border-subtle flex items-center justify-between bg-gradient-to-r from-indigo-50/50 to-blue-50/50 dark:from-surface-2 dark:to-surface-2">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-xl bg-indigo-500/15 dark:bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center">
                                    <BookmarkCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-bold text-slate-900 dark:text-text-primary leading-none">Meus Bookmarks</span>
                                    <span className="text-[10px] text-slate-500 dark:text-text-muted mt-0.5">
                                        {bookmarks.length} {bookmarks.length === 1 ? 'marcador' : 'marcadores'}
                                    </span>
                                </div>
                            </div>
                            <button onClick={() => setBookmarksAberto(false)} className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-surface-2 text-slate-400 dark:text-text-muted">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Botão criar bookmark */}
                        <div className="px-4 pt-3 pb-2">
                            {criandoBookmark ? (
                                <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 animate-in fade-in duration-150">
                                    <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold mb-2">
                                        Salvar: {livroAtual.nome} {capituloAtual}
                                        {versiculoSelecionado ? `:${versiculoSelecionado}` : ''}
                                    </p>
                                    <input
                                        type="text"
                                        value={novoBookmarkNome}
                                        onChange={e => setNovoBookmarkNome(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') salvarBookmark(); }}
                                        placeholder={`Nome (padrão: ${livroAtual.nome} ${capituloAtual})`}
                                        className="w-full bg-white dark:bg-surface-1 border border-slate-200 dark:border-border-subtle rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-text-primary placeholder-slate-400 dark:placeholder-text-muted focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-500/50 mb-2"
                                        autoFocus
                                    />
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => { setCriandoBookmark(false); setNovoBookmarkNome(''); }} className="px-3 py-1.5 text-xs rounded-lg text-slate-500 dark:text-text-muted hover:bg-slate-100 dark:hover:bg-surface-2 font-medium">Cancelar</button>
                                        <button onClick={salvarBookmark} className="px-3 py-1.5 text-xs rounded-lg bg-indigo-500 text-white font-bold hover:bg-indigo-400 transition-colors">Salvar</button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setCriandoBookmark(true)}
                                    disabled={bookmarkAtualExiste}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-semibold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.99]"
                                >
                                    <Plus className="w-4 h-4" />
                                    {bookmarkAtualExiste ? 'Já marcado neste capítulo' : 'Marcar posição atual'}
                                </button>
                            )}
                        </div>

                        {/* Lista de bookmarks */}
                        <div className="flex-1 overflow-y-auto px-4 pb-4">
                            {bookmarks.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                                    <BookmarkCheck className="w-12 h-12 text-slate-200 dark:text-text-muted/30" />
                                    <p className="text-sm text-slate-500 dark:text-text-muted font-medium">Nenhum bookmark ainda</p>
                                    <p className="text-xs text-slate-400 dark:text-text-muted max-w-[200px]">Marque posições de leitura para continuar de onde parou.</p>
                                </div>
                            ) : (
                                <div className="space-y-2 pt-1">
                                    {bookmarks.map(bm => (
                                        <div key={bm.id} className="group flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-surface-2 hover:bg-slate-100 dark:hover:bg-surface-2 transition-colors border border-slate-100 dark:border-transparent">
                                            <button onClick={() => navegarParaBookmark(bm)} className="flex-1 text-left min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-indigo-600 dark:text-indigo-400 text-sm font-bold">{bm.livro_nome} {bm.capitulo}{bm.versiculo ? `:${bm.versiculo}` : ''}</span>
                                                </div>
                                                <p className="text-xs text-slate-500 dark:text-text-muted mt-0.5 truncate">{bm.nome}</p>
                                                {bm.created_at && (
                                                    <p className="text-[10px] text-slate-400 dark:text-text-muted mt-0.5">
                                                        {new Date(bm.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                    </p>
                                                )}
                                            </button>
                                            <button onClick={() => removerBookmark(bm.id)} className="p-2 rounded-lg text-slate-300 dark:text-text-muted hover:bg-red-50 dark:hover:bg-red-500/20 hover:text-red-500 dark:hover:text-red-400 transition-all opacity-0 group-hover:opacity-100" title="Remover">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* --- OFFLINE MANAGER --- */}
            {offlineManagerAberto && (
                <OfflineManager
                    versoes={VERSOES_BIBLIA}
                    onClose={() => setOfflineManagerAberto(false)}
                />
            )}

            <ToastContainer toasts={toasts} removeToast={removeToast} />
        </CosmicBackground>
    );
}
