'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
    Book, ChevronLeft, ChevronRight, ArrowLeft, Loader2, X,
    Heart, Copy, Share2, Lightbulb, Palette, StickyNote,
    Search, BookmarkIcon, Trash2, ChevronDown, Plus, Minus, Languages,
    CheckSquare, Square, XCircle, Wifi, WifiOff, Database, Download
} from 'lucide-react';
import { CosmicBackground } from '@/components/ui/CosmicBackground';
import { useToast } from '@/hooks/useToast';
import { ToastContainer } from '@/components/ui/ToastContainer';
import { getCachedChapter, cacheChapter } from '@/lib/bible-db';
import { OfflineManager } from './components/OfflineManager';
import { useOfflineInteractions } from './hooks/useOfflineInteractions';
import {
    getAllInteracoesPorTipo,
    salvarHistoricoLeitura,
    getUltimaLeitura,
    type BibliaInteracao
} from '@/lib/supabase';

// Tipo de livro
interface LivroBiblia { nome: string; abrev: string; capitulos: number; }

// Categorias organizadas da Bíblia
const CATEGORIAS_BIBLIA: { nome: string; emoji: string; cor: string; livros: LivroBiblia[] }[] = [
    // ===== ANTIGO TESTAMENTO =====
    {
        nome: 'Pentateuco (Lei)', emoji: '📜', cor: 'text-amber-400', livros: [
            { nome: 'Gênesis', abrev: 'gn', capitulos: 50 },
            { nome: 'Êxodo', abrev: 'ex', capitulos: 40 },
            { nome: 'Levítico', abrev: 'lv', capitulos: 27 },
            { nome: 'Números', abrev: 'nm', capitulos: 36 },
            { nome: 'Deuteronômio', abrev: 'dt', capitulos: 34 },
        ]
    },
    {
        nome: 'Históricos', emoji: '⚔️', cor: 'text-blue-400', livros: [
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
        nome: 'Poéticos / Sabedoria', emoji: '🎵', cor: 'text-purple-400', livros: [
            { nome: 'Jó', abrev: 'jó', capitulos: 42 },
            { nome: 'Salmos', abrev: 'sl', capitulos: 150 },
            { nome: 'Provérbios', abrev: 'pv', capitulos: 31 },
            { nome: 'Eclesiastes', abrev: 'ec', capitulos: 12 },
            { nome: 'Cantares', abrev: 'ct', capitulos: 8 },
        ]
    },
    {
        nome: 'Profetas Maiores', emoji: '🔥', cor: 'text-red-400', livros: [
            { nome: 'Isaías', abrev: 'is', capitulos: 66 },
            { nome: 'Jeremias', abrev: 'jr', capitulos: 52 },
            { nome: 'Lamentações', abrev: 'lm', capitulos: 5 },
            { nome: 'Ezequiel', abrev: 'ez', capitulos: 48 },
            { nome: 'Daniel', abrev: 'dn', capitulos: 12 },
        ]
    },
    {
        nome: 'Profetas Menores', emoji: '📣', cor: 'text-orange-400', livros: [
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
        nome: 'Evangelhos', emoji: '✝️', cor: 'text-emerald-400', livros: [
            { nome: 'Mateus', abrev: 'mt', capitulos: 28 },
            { nome: 'Marcos', abrev: 'mc', capitulos: 16 },
            { nome: 'Lucas', abrev: 'lc', capitulos: 24 },
            { nome: 'João', abrev: 'jo', capitulos: 21 },
        ]
    },
    {
        nome: 'História da Igreja', emoji: '🌍', cor: 'text-cyan-400', livros: [
            { nome: 'Atos', abrev: 'at', capitulos: 28 },
        ]
    },
    {
        nome: 'Cartas de Paulo', emoji: '✉️', cor: 'text-sky-400', livros: [
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
        nome: 'Cartas Gerais', emoji: '📨', cor: 'text-teal-400', livros: [
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
        nome: 'Profecia', emoji: '👑', cor: 'text-yellow-400', livros: [
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

export default function BibliotecaPage() {
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
    const [resultadosBusca, setResultadosBusca] = useState<any[]>([]);
    const [buscaLoading, setBuscaLoading] = useState(false);

    // Offline
    const [isOnline, setIsOnline] = useState(true);
    const [cameFromCache, setCameFromCache] = useState(false);
    const [offlineManagerAberto, setOfflineManagerAberto] = useState(false);

    // Fonte e versão
    const [fontSizeIndex, setFontSizeIndex] = useState(DEFAULT_FONT_INDEX);
    const [versaoBiblia, setVersaoBiblia] = useState(VERSOES_BIBLIA[0]); // NTLH padrão
    const [mostrarVersoes, setMostrarVersoes] = useState(false);

    // Painel de salvos
    const [painelAberto, setPainelAberto] = useState(false);
    const [painelAba, setPainelAba] = useState<'favoritos' | 'destaques' | 'notas'>('favoritos');
    const [painelItens, setPainelItens] = useState<BibliaInteracao[]>([]);
    const [painelLoading, setPainelLoading] = useState(false);

    const { toasts, removeToast, success, error: toastError } = useToast();
    const toolbarRef = useRef<HTMLDivElement>(null);
    const versiculosRef = useRef<HTMLDivElement>(null);
    const versiculoAnteriorRef = useRef<number | null>(null);

    // Helpers de fonte
    const fontConfig = FONT_SIZES[fontSizeIndex];
    const canIncrease = fontSizeIndex < FONT_SIZES.length - 1;
    const canDecrease = fontSizeIndex > 0;

    const aumentarFonte = () => {
        if (canIncrease) {
            const next = fontSizeIndex + 1;
            setFontSizeIndex(next);
            localStorage.setItem('biblia-font-size', String(next));
        }
    };
    const diminuirFonte = () => {
        if (canDecrease) {
            const next = fontSizeIndex - 1;
            setFontSizeIndex(next);
            localStorage.setItem('biblia-font-size', String(next));
        }
    };

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
                    fetch(`https://bolls.life/get-chapter/${codigo}/${bookId}/${cap}/`)
                        .then(r => r.ok ? r.json() : null)
                        .then(data => {
                            if (Array.isArray(data) && data.length > 0) {
                                const fresh = data.map((v: { verse: number; text: string }) => ({
                                    verse: v.verse,
                                    text: v.text.replace(/<[^>]*>/g, ''),
                                }));
                                cacheChapter(codigo, bookId, cap, fresh);
                                // Atualiza UI silenciosamente se mudou
                                setVersiculos(fresh);
                            }
                        })
                        .catch(() => { /* silencioso */ });
                }
                return;
            }
        } catch { /* IndexedDB indisponível, continua para fetch */ }

        // 2) Sem cache: buscar da API
        try {
            const response = await fetch(`https://bolls.life/get-chapter/${codigo}/${bookId}/${cap}/`);
            if (!response.ok) throw new Error('API não disponível');

            const data = await response.json();
            if (Array.isArray(data) && data.length > 0) {
                const versiculos = data.map((v: { verse: number; text: string }) => ({
                    verse: v.verse,
                    text: v.text.replace(/<[^>]*>/g, ''),
                }));
                setVersiculos(versiculos);

                // Salvar no cache para próxima vez
                cacheChapter(codigo, bookId, cap, versiculos).catch(() => { });
            } else {
                throw new Error('Formato inválido');
            }
        } catch {
            // 3) Sem cache + sem internet = mensagem de offline
            setError('Capítulo não disponível offline. Conecte à internet para baixar.');
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
            const el = document.getElementById(`verse-${scrollToVerse}`);
            if (el) {
                setTimeout(() => {
                    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    el.classList.add('ring-2', 'ring-amber-400/60');
                    setTimeout(() => el.classList.remove('ring-2', 'ring-amber-400/60'), 2000);
                }, 300);
            }
            setScrollToVerse(null);
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

    const selecionarCapituloTemp = async (cap: number) => {
        setCapituloSelecionadoTemp(cap);
        setFaseSelecao('versiculos');
        setLoadingVersiculosTemp(true);
        setTotalVersiculosTemp(0);

        // Buscar quantidade de versículos do capítulo
        try {
            const bookId = LIVRO_PARA_ID[livroSelecionadoTemp.abrev] || 1;
            const resp = await fetch(`https://bolls.life/get-chapter/${versaoBiblia.codigo}/${bookId}/${cap}/`);
            if (resp.ok) {
                const data = await resp.json();
                if (Array.isArray(data)) setTotalVersiculosTemp(data.length);
            }
        } catch { /* fallback */ }
        setLoadingVersiculosTemp(false);
    };

    const confirmarSelecao = (versiculo?: number) => {
        setLivroAtual(livroSelecionadoTemp);
        setCapituloAtual(capituloSelecionadoTemp);
        setScrollToVerse(versiculo || null);
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

        // Se clicou no mesmo versículo que estava aberto, fecha
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
        if (!termoBusca.trim()) return;
        setBuscaLoading(true);
        setResultadosBusca([]);

        try {
            const resp = await fetch(`https://bolls.life/search/${versaoBiblia.codigo}/${encodeURIComponent(termoBusca.trim())}/`);
            if (resp.ok) {
                const data = await resp.json();
                setResultadosBusca(Array.isArray(data) ? data.slice(0, 50) : []);
            }
        } catch {
            toastError('Erro na busca');
        } finally {
            setBuscaLoading(false);
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

        const tipo = aba === 'favoritos' ? 'favorito' : aba === 'destaques' ? 'destaque' : 'nota';
        const dados = await getAllInteracoesPorTipo(tipo, 200);
        setPainelItens(dados);
        setPainelLoading(false);
    };

    const removerItemPainel = async (id: number) => {
        await removerInteracao(id);
        setPainelItens(prev => prev.filter(i => i.id !== id));
        success('Removido!');
        await carregarInteracoes();
    };

    const navegarParaItem = (item: BibliaInteracao) => {
        navegarPara(item.livro_abrev, item.capitulo, item.versiculo);
        setPainelAberto(false);
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

    return (
        <CosmicBackground className="min-h-screen">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-surface-0/80 backdrop-blur-xl border-b border-border-subtle">
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
                        <button onClick={() => setBuscaAberta(!buscaAberta)} className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-amber-400 transition-colors" title="Buscar">
                            <Search className="w-5 h-5" />
                        </button>
                        <button onClick={() => setOfflineManagerAberto(true)} className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-amber-400 transition-colors" title="Offline">
                            <Download className="w-5 h-5" />
                        </button>
                        <button onClick={() => abrirPainel('favoritos')} className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-amber-400 transition-colors" title="Salvos">
                            <BookmarkIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Barra de busca expansível */}
                {buscaAberta && (
                    <div className="px-4 pb-3 animate-in slide-in-from-top duration-200">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={termoBusca}
                                onChange={e => setTermoBusca(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleBuscar()}
                                placeholder="Buscar na Bíblia..."
                                className="flex-1 bg-white/10 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 text-sm"
                                autoFocus
                            />
                            <button onClick={handleBuscar} disabled={buscaLoading} className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl text-sm transition-colors disabled:opacity-50">
                                {buscaLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Buscar'}
                            </button>
                        </div>

                        {/* Resultados de busca */}
                        {resultadosBusca.length > 0 && (
                            <div className="mt-2 max-h-64 overflow-y-auto space-y-1 bg-black/40 rounded-xl p-2">
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
                                            className="w-full text-left p-2.5 rounded-lg hover:bg-white/10 transition-colors"
                                        >
                                            <div className="text-amber-400 text-xs font-bold">{livro?.nome || `Livro ${r.book}`} {r.chapter}:{r.verse}</div>
                                            <div className="text-slate-300 text-sm mt-0.5 line-clamp-2">{r.text?.replace(/<[^>]*>/g, '')}</div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </header>

            {/* Barra de Navegação (Sticky) */}
            <div className="sticky top-[57px] z-40 bg-surface-0/80 backdrop-blur-xl border-b border-border-subtle">
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
                            <ChevronDown className="w-3 h-3 text-slate-500" />
                        </button>

                        {mostrarVersoes && (
                            <div className="absolute top-full right-0 mt-1.5 w-72 bg-surface-2/98 border border-border-subtle rounded-2xl shadow-2xl backdrop-blur-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                                <div className="p-2 border-b border-white/10">
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
                    <div className="flex items-center glass-panel rounded-xl overflow-hidden">
                        <button
                            onClick={diminuirFonte}
                            disabled={!canDecrease}
                            className="p-2.5 hover:bg-surface-2 transition-colors disabled:opacity-30"
                            title="Diminuir fonte"
                        >
                            <Minus className="w-4 h-4 text-text-primary" />
                        </button>
                        <span className="text-[10px] font-bold text-amber-400 px-1 min-w-[20px] text-center">{fontConfig.label}</span>
                        <button
                            onClick={aumentarFonte}
                            disabled={!canIncrease}
                            className="p-2.5 hover:bg-surface-2 transition-colors disabled:opacity-30"
                            title="Aumentar fonte"
                        >
                            <Plus className="w-4 h-4 text-text-primary" />
                        </button>
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

            {/* Backdrop para fechar dropdown de versões */}
            {mostrarVersoes && (
                <div className="fixed inset-0 z-30" onClick={() => setMostrarVersoes(false)} />
            )}

            {/* --- MODAL DE SELEÇÃO --- */}
            {modalAberto && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/90 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="glass-panel rounded-2xl max-w-lg w-full max-h-[80vh] flex flex-col overflow-hidden border border-border-subtle shadow-2xl">
                        <div className="p-4 border-b border-border-subtle flex items-center justify-between bg-surface-2/50">
                            {faseSelecao === 'capitulos' ? (
                                <button onClick={() => setFaseSelecao('livros')} className="flex items-center gap-1 text-amber-400 hover:text-amber-300 text-sm font-medium">
                                    <ArrowLeft className="w-4 h-4" /> Voltar
                                </button>
                            ) : faseSelecao === 'versiculos' ? (
                                <button onClick={() => setFaseSelecao('capitulos')} className="flex items-center gap-1 text-amber-400 hover:text-amber-300 text-sm font-medium">
                                    <ArrowLeft className="w-4 h-4" /> Voltar
                                </button>
                            ) : <div className="w-16" />}
                            <h3 className="text-lg font-bold text-text-primary">
                                {faseSelecao === 'livros' ? 'Escolha o Livro' : faseSelecao === 'capitulos' ? livroSelecionadoTemp.nome : `${livroSelecionadoTemp.nome} ${capituloSelecionadoTemp}`}
                            </h3>
                            <button onClick={() => setModalAberto(false)} className="p-2 rounded-lg hover:bg-surface-2 text-text-muted hover:text-text-primary"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="overflow-y-auto flex-1 p-2">
                            {faseSelecao === 'livros' && (
                                <div className="space-y-4 p-2">
                                    {CATEGORIAS_BIBLIA.map(cat => (
                                        <div key={cat.nome}>
                                            <div className="flex items-center gap-2 mb-2 sticky top-0 bg-surface-0/90 backdrop-blur-sm py-1.5 px-1 rounded-lg z-10">
                                                <span className="text-base">{cat.emoji}</span>
                                                <h4 className={`text-xs font-bold uppercase tracking-wider ${cat.cor}`}>{cat.nome}</h4>
                                                <div className="flex-1 h-px bg-border-subtle" />
                                            </div>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                                                {cat.livros.map(livro => (
                                                    <button key={livro.abrev} onClick={() => selecionarLivroTemp(livro)}
                                                        className={`p-2.5 rounded-xl text-left transition-all border ${livro.abrev === livroAtual.abrev ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' : 'bg-surface-1 border-transparent hover:bg-surface-2 text-text-secondary'}`}>
                                                        <div className="font-bold text-sm truncate">{livro.nome}</div>
                                                        <div className="text-[10px] text-text-muted mt-0.5">{livro.capitulos} caps</div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {faseSelecao === 'capitulos' && (
                                <div className="grid grid-cols-5 sm:grid-cols-6 gap-3 p-2">
                                    {Array.from({ length: livroSelecionadoTemp.capitulos }, (_, i) => i + 1).map(cap => (
                                        <button key={cap} onClick={() => selecionarCapituloTemp(cap)}
                                            className={`aspect-square flex items-center justify-center rounded-xl text-lg font-bold transition-all border ${(livroSelecionadoTemp.abrev === livroAtual.abrev && cap === capituloAtual) ? 'bg-amber-500 text-black border-amber-400' : 'bg-surface-1 border-border-subtle text-text-secondary hover:bg-surface-2'}`}>
                                            {cap}
                                        </button>
                                    ))}
                                </div>
                            )}
                            {faseSelecao === 'versiculos' && (
                                <div className="p-2">
                                    {/* Botão abrir capítulo inteiro */}
                                    <button onClick={() => confirmarSelecao()} className="w-full mb-3 py-3 px-4 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 font-bold text-sm hover:bg-amber-500/30 transition-colors">
                                        Abrir capítulo inteiro
                                    </button>

                                    <p className="text-text-muted text-xs text-center mb-3">Ou escolha um versículo para ir direto:</p>

                                    {loadingVersiculosTemp ? (
                                        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-amber-400 animate-spin" /></div>
                                    ) : totalVersiculosTemp > 0 ? (
                                        <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
                                            {Array.from({ length: totalVersiculosTemp }, (_, i) => i + 1).map(v => (
                                                <button key={v} onClick={() => confirmarSelecao(v)}
                                                    className="aspect-square flex items-center justify-center rounded-lg text-sm font-bold transition-all border bg-surface-1 border-border-subtle text-text-secondary hover:bg-amber-500/20 hover:border-amber-500/40 hover:text-amber-400">
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
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="glass-panel rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[85vh] flex flex-col overflow-hidden border border-border-subtle">
                        <div className="p-4 border-b border-border-subtle flex items-center justify-between bg-surface-2/50">
                            <div className="flex items-center gap-2">
                                <Lightbulb className="w-5 h-5 text-amber-400" />
                                <span className="font-bold text-text-primary text-base">Estudo — {livroAtual.nome} {capituloAtual}:{estudoVersiculo?.verse}</span>
                            </div>
                            <button onClick={() => setEstudoAberto(false)} className="p-2 rounded-lg hover:bg-surface-2 text-text-muted hover:text-text-primary"><X className="w-5 h-5" /></button>
                        </div>

                        {/* Versículo destacado */}
                        {estudoVersiculo && (
                            <div className="px-4 py-3 bg-amber-500/10 border-b border-amber-500/20">
                                <p className="text-amber-200 text-base italic">&ldquo;{estudoVersiculo.text}&rdquo;</p>
                            </div>
                        )}

                        <div className="flex-1 overflow-y-auto p-4">
                            {estudoLoading ? (
                                <div className="flex flex-col items-center justify-center py-12 gap-3">
                                    <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
                                    <p className="text-slate-400 text-sm">Gerando explicação...</p>
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
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="glass-panel rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[85vh] flex flex-col overflow-hidden border border-white/10">
                        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
                            <span className="font-bold text-white">Meus Salvos</span>
                            <button onClick={() => setPainelAberto(false)} className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
                        </div>

                        {/* Abas */}
                        <div className="flex border-b border-white/10">
                            {(['favoritos', 'destaques', 'notas'] as const).map(aba => (
                                <button key={aba} onClick={() => abrirPainel(aba)}
                                    className={`flex-1 py-3 text-sm font-medium transition-colors ${painelAba === aba ? 'text-amber-400 border-b-2 border-amber-400 bg-white/5' : 'text-slate-400 hover:text-white'}`}>
                                    {aba === 'favoritos' ? 'Favoritos' : aba === 'destaques' ? 'Destaques' : 'Notas'}
                                </button>
                            ))}
                        </div>

                        <div className="flex-1 overflow-y-auto p-3">
                            {painelLoading ? (
                                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-amber-400 animate-spin" /></div>
                            ) : painelItens.length === 0 ? (
                                <p className="text-center text-slate-500 py-8">Nenhum item salvo</p>
                            ) : (
                                <div className="space-y-2.5">
                                    {painelItens.map(item => (
                                        <div key={item.id} className="flex items-start gap-3 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors group">
                                            <button onClick={() => navegarParaItem(item)} className="flex-1 text-left">
                                                <div className="text-amber-400 text-sm font-bold">{item.livro_nome} {item.capitulo}:{item.versiculo}</div>
                                                <div className={`text-text-primary ${fontConfig.salvos} mt-1.5 line-clamp-4 leading-relaxed font-serif`}>{item.texto_versiculo}</div>
                                                {item.nota && <div className="text-text-muted text-sm mt-2 italic bg-surface-2 rounded-lg px-3 py-2">{item.nota}</div>}
                                            </button>
                                            <button onClick={() => removerItemPainel(item.id!)} className="p-2 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-text-muted hover:text-red-400 transition-all shrink-0">
                                                <Trash2 className="w-5 h-5" />
                                            </button>
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
                <div className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-xl animate-in fade-in duration-200">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/5">
                        <div className="flex items-center gap-2">
                            <StickyNote className="w-5 h-5 text-blue-400" />
                            <span className="font-bold text-white text-sm">
                                Anotação — {livroAtual.nome} {capituloAtual}:{notaFullscreenVerso}
                            </span>
                        </div>
                        <button onClick={() => { setNotaFullscreen(false); setNotaFullscreenVerso(null); }} className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Versículo em destaque */}
                    <div className="px-4 py-3 bg-amber-500/10 border-b border-amber-500/20">
                        <p className="text-amber-200 text-sm italic font-serif">
                            <sup className="text-xs font-bold mr-1 opacity-60">{notaFullscreenVerso}</sup>
                            {getVersiculoObj(notaFullscreenVerso)?.text}
                        </p>
                    </div>

                    {/* Área de texto grande */}
                    <div className="flex-1 p-4 flex flex-col">
                        <textarea
                            value={textoNota}
                            onChange={e => setTextoNota(e.target.value)}
                            placeholder="Escreva sua anotação, reflexão, oração, insight..."
                            className="flex-1 w-full bg-surface-1 border border-border-subtle rounded-2xl px-5 py-4 text-text-primary text-base leading-relaxed placeholder-text-muted focus:outline-none focus:border-blue-500/50 resize-none"
                            autoFocus
                        />
                    </div>

                    {/* Footer com ações */}
                    <div className="flex items-center justify-between px-4 py-3 border-t border-white/10 bg-white/5">
                        <div className="flex gap-2">
                            {notaFullscreenVerso && interacoesMap.notas[notaFullscreenVerso] && (
                                <button onClick={async () => {
                                    await removerPorVersiculoETipo('nota', notaFullscreenVerso);
                                    success('Nota removida');
                                    setNotaFullscreen(false);
                                    setNotaFullscreenVerso(null);
                                    await carregarInteracoes();
                                }} className="px-5 py-2.5 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 font-medium text-sm">
                                    Apagar nota
                                </button>
                            )}
                        </div>
                        <button onClick={salvarNotaFullscreen} disabled={!textoNota.trim()} className="px-6 py-2.5 rounded-xl bg-blue-500 text-white font-bold hover:bg-blue-400 disabled:opacity-50 text-sm transition-colors">
                            Salvar nota
                        </button>
                    </div>
                </div>
            )}

            {/* --- BARRA FLUTUANTE MULTI-SELEÇÃO --- */}
            {modoMultiSelecao && (
                <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-200">
                    <div className="bg-slate-900/98 border border-emerald-500/30 rounded-2xl p-2 shadow-2xl backdrop-blur-xl flex items-center gap-1.5">
                        {/* Contador */}
                        <div className="px-3 py-2 text-emerald-400 font-bold text-sm min-w-[60px] text-center">
                            {versiculosSelecionados.size} sel.
                        </div>

                        <div className="w-px h-8 bg-white/10" />

                        {/* Ações */}
                        <button
                            onClick={() => setMostrarCores(!mostrarCores)}
                            disabled={versiculosSelecionados.size === 0}
                            className="p-3 rounded-xl hover:bg-white/10 text-slate-300 hover:text-amber-400 transition-colors disabled:opacity-30"
                            title="Destacar"
                        >
                            <Palette className="w-5 h-5" />
                        </button>
                        <button
                            onClick={handleMultiFavoritar}
                            disabled={versiculosSelecionados.size === 0}
                            className="p-3 rounded-xl hover:bg-white/10 text-slate-300 hover:text-red-400 transition-colors disabled:opacity-30"
                            title="Favoritar"
                        >
                            <Heart className="w-5 h-5" />
                        </button>
                        <button
                            onClick={handleMultiCopiar}
                            disabled={versiculosSelecionados.size === 0}
                            className="p-3 rounded-xl hover:bg-white/10 text-slate-300 hover:text-green-400 transition-colors disabled:opacity-30"
                            title="Copiar"
                        >
                            <Copy className="w-5 h-5" />
                        </button>
                        <button
                            onClick={handleMultiCompartilhar}
                            disabled={versiculosSelecionados.size === 0}
                            className="p-3 rounded-xl hover:bg-white/10 text-slate-300 hover:text-blue-400 transition-colors disabled:opacity-30"
                            title="Compartilhar"
                        >
                            <Share2 className="w-5 h-5" />
                        </button>

                        <div className="w-px h-8 bg-white/10" />

                        {/* Fechar multi-seleção */}
                        <button
                            onClick={toggleMultiSelecao}
                            className="p-3 rounded-xl hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
                            title="Sair da seleção"
                        >
                            <XCircle className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Cores para multi-seleção */}
                    {mostrarCores && versiculosSelecionados.size > 0 && (
                        <div className="mt-2 flex items-center gap-2 bg-slate-900/98 border border-white/15 rounded-2xl p-2.5 justify-center animate-in fade-in duration-100">
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
                        <p className="text-slate-400 animate-pulse">Carregando escrituras...</p>
                    </div>
                )}

                {error && !loading && (
                    <div className="glass-panel rounded-xl p-8 text-center max-w-md mx-auto border border-orange-500/30 bg-orange-500/10">
                        <WifiOff className="w-12 h-12 text-orange-400 mx-auto mb-4" />
                        <p className="text-orange-200 font-bold text-lg mb-2">Sem conexão</p>
                        <p className="text-slate-400 text-sm mb-6">{error}</p>
                        <button onClick={() => buscarCapitulo(livroAtual.abrev, capituloAtual)} className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold">Tentar Novamente</button>
                    </div>
                )}

                {!loading && !error && versiculos.length > 0 && (
                    <div className="glass-panel rounded-2xl p-5 md:p-8 relative overflow-visible" ref={versiculosRef}>
                        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                        <div className={`space-y-1 ${fontConfig.value} leading-relaxed text-slate-200 font-serif relative`}>
                            {versiculos.map(v => (
                                <div key={v.verse}>
                                    {/* Título de seção */}
                                    {getTituloSecao(v.verse) && (
                                        <div className="pt-6 pb-3 first:pt-0">
                                            <h2 className={`${fontConfig.titulo} font-black text-amber-400/90 font-sans tracking-tight border-b border-amber-500/20 pb-2`}>
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
                                            ${!modoMultiSelecao && versiculoSelecionado === v.verse ? 'bg-white/10 ring-1 ring-amber-500/30' : ''}
                                            ${!modoMultiSelecao && versiculoSelecionado !== v.verse ? 'hover:bg-white/5' : ''}
                                            ${modoMultiSelecao && !versiculosSelecionados.has(v.verse) ? 'hover:bg-emerald-500/5' : ''}
                                        `}
                                    >
                                        <p className="inline">
                                            {modoMultiSelecao && (
                                                <span className="inline-block mr-1.5 align-middle">
                                                    {versiculosSelecionados.has(v.verse)
                                                        ? <CheckSquare className="w-4 h-4 text-emerald-400 inline" />
                                                        : <Square className="w-4 h-4 text-slate-500 inline" />
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
                                                <div className="flex items-center gap-1 bg-slate-900/95 border border-white/15 rounded-2xl p-1.5 shadow-2xl backdrop-blur-xl">
                                                    {/* Cores */}
                                                    <button onClick={() => setMostrarCores(!mostrarCores)} className="p-3 rounded-xl hover:bg-white/10 text-slate-300 hover:text-amber-400 transition-colors" title="Destacar">
                                                        <Palette className="w-5 h-5" />
                                                    </button>
                                                    {/* Favoritar */}
                                                    <button onClick={handleFavoritar} className={`p-3 rounded-xl hover:bg-white/10 transition-colors ${isFavorito(v.verse) ? 'text-red-400' : 'text-slate-300 hover:text-red-400'}`} title="Favoritar">
                                                        <Heart className={`w-5 h-5 ${isFavorito(v.verse) ? 'fill-red-400' : ''}`} />
                                                    </button>
                                                    {/* Copiar */}
                                                    <button onClick={handleCopiar} className="p-3 rounded-xl hover:bg-white/10 text-slate-300 hover:text-green-400 transition-colors" title="Copiar">
                                                        <Copy className="w-5 h-5" />
                                                    </button>
                                                    {/* Compartilhar */}
                                                    <button onClick={handleCompartilhar} className="p-3 rounded-xl hover:bg-white/10 text-slate-300 hover:text-blue-400 transition-colors" title="Compartilhar">
                                                        <Share2 className="w-5 h-5" />
                                                    </button>
                                                    {/* Estudar */}
                                                    <button onClick={handleEstudar} className="p-3 rounded-xl hover:bg-white/10 text-slate-300 hover:text-amber-400 transition-colors" title="Estudar">
                                                        <Lightbulb className="w-5 h-5" />
                                                    </button>
                                                    {/* Nota (abre fullscreen) */}
                                                    <button onClick={() => abrirNotaFullscreen(v.verse)} className={`p-3 rounded-xl hover:bg-white/10 transition-colors ${temNota(v.verse) ? 'text-blue-400' : 'text-slate-300 hover:text-blue-400'}`} title="Nota">
                                                        <StickyNote className="w-5 h-5" />
                                                    </button>
                                                    {/* Multi-seleção */}
                                                    <button onClick={toggleMultiSelecao} className="p-3 rounded-xl hover:bg-white/10 text-slate-300 hover:text-emerald-400 transition-colors" title="Selecionar vários">
                                                        <CheckSquare className="w-5 h-5" />
                                                    </button>
                                                </div>

                                                {/* Seletor de cores expandido */}
                                                {mostrarCores && (
                                                    <div className="mt-1.5 flex items-center gap-1.5 bg-slate-900/95 border border-white/15 rounded-2xl p-2 justify-center animate-in fade-in duration-100">
                                                        {CORES_DESTAQUE.map(cor => (
                                                            <button key={cor.id} onClick={() => handleDestacar(cor.id)}
                                                                className={`w-9 h-9 rounded-full border-2 transition-transform hover:scale-110 ${cor.bg} ${cor.border} ${interacoesMap.destaques[v.verse]?.cor === cor.id ? 'ring-2 ring-white scale-110' : ''}`}
                                                                title={cor.nome} />
                                                        ))}
                                                        {interacoesMap.destaques[v.verse] && (
                                                            <button onClick={() => handleDestacar(interacoesMap.destaques[v.verse].cor || 'yellow')}
                                                                className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-500 hover:text-red-400" title="Remover destaque">
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
                    <button onClick={irParaAnterior} disabled={capituloAtual <= 1} className="flex items-center gap-2 px-5 py-3 glass-panel rounded-xl disabled:opacity-30 hover:bg-white/10 transition-colors group">
                        <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        <span className="font-medium text-sm">Anterior</span>
                    </button>
                    <button onClick={irParaProximo} disabled={capituloAtual >= livroAtual.capitulos} className="flex items-center gap-2 px-5 py-3 glass-panel rounded-xl disabled:opacity-30 hover:bg-white/10 transition-colors group">
                        <span className="font-medium text-sm">Próximo</span>
                        <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            </main>

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
