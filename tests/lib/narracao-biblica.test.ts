import { describe, it, expect } from 'vitest';
import {
    anuncioDoCapitulo, separarVerso, pausaDepois, prepararVersos, montarFalas, montarBlocos,
    ssmlDoBloco, segmentosDoBloco, silabas, PAUSA, type Fala,
} from '@/lib/narracao-biblica';
import {
    escolherVozNarracao, VOZ_PADRAO, VOZES_NARRACAO, estiloDaVoz,
    VOZ_VOICESTUDIO_MASCULINA, VOZ_AZURE_RESERVA, vozAzureDeReserva,
} from '@/lib/vozes-narracao';
import { gravacaoVoiceStudio } from '@/lib/narracao-voicestudio';

// Trecho real da NTLH como vem da bolls.life (Salmo 23:1-2)
const SALMO_23 = [
    { verse: 1, text: '<b>Salmo de Davi.</b> O SENHOR é o meu pastor: <br>nada me faltará. <br>' },
    { verse: 2, text: 'Ele me faz descansar <br>em pastos verdes <br>e me leva a águas tranquilas. <br>' },
];

describe('narração bíblica — texto', () => {
    it('separa o título do salmo, as linhas do poema e normaliza SENHOR', () => {
        const { titulo, linhas } = separarVerso(SALMO_23[0].text);
        expect(titulo).toBe('Salmo de Davi.');
        expect(linhas).toEqual(['O Senhor é o meu pastor:', 'nada me faltará.']);
    });

    it('a pausa depois do versículo segue a pontuação', () => {
        expect(pausaDepois('e me leva a águas tranquilas.')).toBe(PAUSA.fimDeFrase);
        expect(pausaDepois('Ele disse: “Venham!”')).toBe(PAUSA.fimDeFrase);
        expect(pausaDepois('O SENHOR é o meu pastor:')).toBe(PAUSA.doisPontos);
        expect(pausaDepois('para o bem de vocês,')).toBe(PAUSA.virgula);
        expect(pausaDepois('perto dos teus altares')).toBe(PAUSA.semPontuacao);
    });

    it('anuncia o capítulo como se fala', () => {
        expect(anuncioDoCapitulo(19, 23)).toBe('Salmo 23.');
        expect(anuncioDoCapitulo(1, 1)).toBe('Gênesis, capítulo 1.');
        expect(anuncioDoCapitulo(9, 3)).toBe('Primeiro Samuel, capítulo 3.');
        expect(anuncioDoCapitulo(65, 1)).toBe('Judas.');
    });

    it('anuncia só onde o capítulo começa, inclusive no meio de uma parte do plano', () => {
        const versos = prepararVersos([
            { verse: 30, chapter: 1, text: 'E assim aconteceu.' },
            { verse: 31, chapter: 1, text: 'Deus viu que tudo era muito bom.' },
            { verse: 1, chapter: 2, text: 'Assim foram terminados o céu e a terra.' },
        ], 1);
        const falas = montarFalas(versos, 1);
        expect(falas.map(f => (f.tipo === 'anuncio' ? f.texto : `${f.verso.chapter}:${f.verso.verse}`)))
            .toEqual(['1:30', '1:31', 'Gênesis, capítulo 2.', '2:1']);
    });
});

describe('narração bíblica — blocos e SSML', () => {
    it('corta o bloco no fim de uma frase, não no meio', () => {
        const longo = 'palavra '.repeat(40).trim();
        const versos = prepararVersos([
            { verse: 1, text: `${longo},` },
            { verse: 2, text: `${longo},` },
            { verse: 3, text: `${longo}.` },
            { verse: 4, text: `${longo}.` },
        ], 1);
        const blocos = montarBlocos(montarFalas(versos, 40).slice(1), 500, 2000);
        const fimDoPrimeiro = blocos[0][blocos[0].length - 1] as Extract<Fala, { tipo: 'verso' }>;
        expect(blocos.length).toBe(2);
        expect(fimDoPrimeiro.verso.verse).toBe(3);
    });

    it('monta SSML com pausas, estilo só quando pedido e escapa o texto', () => {
        const falas = montarFalas(prepararVersos([...SALMO_23, { verse: 3, text: 'Pão & vinho <br>' }], 23), 19);
        const ssml = ssmlDoBloco(falas, { voz: 'pt-BR-FranciscaNeural', estilo: 'calm' });
        expect(ssml).toContain("<voice name='pt-BR-FranciscaNeural'>");
        expect(ssml).toContain("<mstts:express-as style='calm'>");
        expect(ssml).toContain('Salmo 23.<break');
        expect(ssml).toContain(`Salmo de Davi.<break time='${PAUSA.titulo}ms'/>`);
        expect(ssml).toContain(`em pastos verdes<break time='${PAUSA.linhaPoetica}ms'/>`);
        expect(ssml).toContain('Pão &amp; vinho');
        expect(ssml).not.toContain('<b>');

        const semEstilo = ssmlDoBloco(falas, { voz: 'pt-BR-ThalitaMultilingualNeural' });
        expect(semEstilo).not.toContain('express-as');
        expect(semEstilo).toContain("<lang xml:lang='pt-BR'>");
    });

    // 28/10/2026: opção comparada em amostras; Lucifran ficou com a leitura atual.
    it('frase corrida (desligada por padrão) só pausa na pontuação', () => {
        const falas = montarFalas(prepararVersos([
            ...SALMO_23,
            { verse: 3, text: 'Ele me dá novas forças <br>e me guia' },
            { verse: 4, text: 'por caminhos certos.' },
        ], 23), 19);
        const corrida = ssmlDoBloco(falas, { voz: 'pt-BR-MacerioMultilingualNeural', fraseCorrida: true });
        expect(corrida).toContain('em pastos verdes e me leva');
        expect(corrida).toContain('e me guia por caminhos certos.');
        expect(corrida).toContain(`nada me faltará.<break time='${PAUSA.fimDeFrase}ms'/>`);
        const atual = ssmlDoBloco(falas, { voz: 'pt-BR-MacerioMultilingualNeural' });
        expect(atual).toContain(`e me guia<break time='${PAUSA.semPontuacao}ms'/>`);
        // a marcação do versículo acompanha: sem a pausa, o verso 3 termina antes
        const fimV3 = (fc: boolean) => segmentosDoBloco(falas, 30, 0, fc).find(s => s.verse === 3)!.end;
        expect(fimV3(true)).toBeLessThan(fimV3(false) + 1e-9);
    });

    it('os tempos dos versículos seguem em ordem e fecham na duração do áudio', () => {
        const falas = montarFalas(prepararVersos(SALMO_23, 23), 19);
        const segs = segmentosDoBloco(falas, 20, 10);
        expect(segs.map(s => s.verse)).toEqual([1, 2]);
        expect(segs[0].start).toBeGreaterThan(10.5); // depois do anúncio
        expect(segs[1].start).toBeCloseTo(segs[0].end, 5);
        expect(segs[1].end).toBeCloseTo(30, 5);
    });

    it('número conta como fala longa', () => {
        expect(silabas('Salmo 23.')).toBeGreaterThan(silabas('Salmo dois.'));
    });
});

describe('vozes da narração', () => {
    it('aceita só as vozes da lista', () => {
        expect(escolherVozNarracao('pt-BR-MacerioMultilingualNeural')).toBe('pt-BR-MacerioMultilingualNeural');
        expect(escolherVozNarracao("pt-BR-X'/><voice name='y")).toBe(VOZ_PADRAO);
        expect(escolherVozNarracao(undefined)).toBe(VOZ_PADRAO);
        expect(VOZES_NARRACAO.length).toBeGreaterThanOrEqual(4);
    });

    it('só a Francisca usa o estilo calmo', () => {
        expect(estiloDaVoz('pt-BR-FranciscaNeural')).toBe('calm');
        expect(estiloDaVoz('pt-BR-ThalitaMultilingualNeural')).toBe('');
    });

    it('prioriza a voz masculina aprovada e preserva as vozes Azure anteriores', () => {
        expect(VOZ_PADRAO).toBe(VOZ_VOICESTUDIO_MASCULINA);
        expect(escolherVozNarracao(VOZ_VOICESTUDIO_MASCULINA)).toBe(VOZ_VOICESTUDIO_MASCULINA);
        expect(vozAzureDeReserva(VOZ_VOICESTUDIO_MASCULINA)).toBe(VOZ_AZURE_RESERVA);
        expect(vozAzureDeReserva('pt-BR-ThalitaMultilingualNeural')).toBe('pt-BR-ThalitaMultilingualNeural');
        expect(VOZES_NARRACAO.length).toBe(5);
    });

    it('não serve gravação de outra tradução, capítulo ou leitura parcial', () => {
        expect(gravacaoVoiceStudio(19, 23, SALMO_23)).toBeNull();
        expect(gravacaoVoiceStudio(19, 22, SALMO_23)).toBeNull();
        expect(gravacaoVoiceStudio(40, 23, SALMO_23)).toBeNull();
        expect(gravacaoVoiceStudio(19, 23, [
            ...SALMO_23,
            { verse: 3, text: 'texto incorreto' },
            { verse: 4, text: 'texto incorreto' },
            { verse: 5, text: 'texto incorreto' },
            { verse: 6, text: 'texto incorreto' },
        ])).toBeNull();
    });
});
