import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';
import {
    TAG_LEMBRETE,
    TAG_PALAVRA,
    TAG_VERSICULO,
    caixaDeFrase,
    cortarEmFrase,
    notificacaoLembrete,
    notificacaoPalavra,
    notificacaoVersiculo,
} from '../../src/lib/notificacoes';

// Mensagem no formato da Palavra da Manhã (título em maiúsculas, reflexão, citação)
const PALAVRA = `A PAZ QUE O MUNDO NÃO DÁ

Quando tudo parece fora do lugar, lembre-se de que Deus continua no controle. A paz dEle não depende das circunstâncias. Descanse nEle e siga em frente com fé, um passo de cada vez, confiando que Ele cuida de cada detalhe da sua vida.

«Deixo-lhes a paz; a minha paz lhes dou.» João 14:27`;

describe('título da Palavra em caixa de frase', () => {
    it('converte maiúsculas mantendo nomes de Deus', () => {
        expect(caixaDeFrase('O ERRO DO OUTRO NÃO JUSTIFICA O SEU')).toBe('O erro do outro não justifica o seu');
        expect(caixaDeFrase('DEUS CUIDA DE VOCÊ')).toBe('Deus cuida de você');
        expect(caixaDeFrase('O SENHOR É MEU PASTOR')).toBe('O Senhor é meu pastor');
        expect(caixaDeFrase('PERMANEÇA NELE')).toBe('Permaneça nEle');
        expect(caixaDeFrase('O ESPÍRITO SANTO GUIA')).toBe('O Espírito Santo guia');
        expect(caixaDeFrase('UM POVO SANTO')).toBe('Um povo santo');
        expect(caixaDeFrase('JESUS CRISTO VIVE')).toBe('Jesus Cristo vive');
    });
});

describe('notificação da Palavra da Manhã', () => {
    it('abre com o título em frase e segue com frases inteiras, sem a citação', () => {
        const n = notificacaoPalavra(PALAVRA);
        expect(n.title).toBe('🌅 Palavra da Manhã');
        expect(n.body.startsWith('A paz que o mundo não dá. Quando tudo parece fora do lugar')).toBe(true);
        expect(n.body.length).toBeLessThanOrEqual(170);
        expect(n.body).toMatch(/[.!?]$/);
        expect(n.body).not.toMatch(/«|A PAZ/);
        expect(n.tag).toBe(TAG_PALAVRA);
        expect(n.url).toBe('/');
    });

    it('não corta no meio da palavra quando a frase é comprida', () => {
        const longa = `TÍTULO CURTO\n\n${'palavra '.repeat(60).trim()} final.`;
        const n = notificacaoPalavra(longa, 120);
        expect(n.body.length).toBeLessThanOrEqual(120);
        expect(n.body.endsWith('palavra…')).toBe(true);
    });

    it('título com pergunta mantém a interrogação', () => {
        expect(notificacaoPalavra('VOCÊ CONFIA?\n\nEle nunca falhou com você.').body).toBe('Você confia? Ele nunca falhou com você.');
    });

    it('sem título usa as primeiras frases; sem mensagem avisa que está pronta', () => {
        expect(notificacaoPalavra('**Bom dia!** Deus renova as forças. Siga firme.').body).toBe('Bom dia! Deus renova as forças. Siga firme.');
        expect(notificacaoPalavra(null).body).toBe('Sua palavra de hoje está pronta. Toque para ler.');
    });

    it('antes: juntava o título em maiúsculas e cortava no meio da palavra', () => {
        const antigo = `${PALAVRA.replace(/[*#_>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 110)}…`;
        expect(antigo).toMatch(/^A PAZ QUE O MUNDO NÃO DÁ Quando/);
        expect(notificacaoPalavra(PALAVRA).body).not.toBe(antigo);
    });
});

describe('notificação do Versículo do Dia e lembretes', () => {
    it('versículo com referência no título e versão no texto', () => {
        const n = notificacaoVersiculo({ ref: 'Jó 19:25', texto: 'Eu sei que o meu defensor vive.', versao: 'NTLH' });
        expect(n.title).toBe('📖 Versículo do dia · Jó 19:25');
        expect(n.body).toBe('“Eu sei que o meu defensor vive.” (NTLH)');
        expect(n.tag).toBe(TAG_VERSICULO);
        expect(notificacaoVersiculo({ ref: 'Jó 19:25', texto: null, versao: 'NTLH' }).body).toBe('Toque para ler o versículo de hoje (NTLH).');
    });

    it('lembretes da tarde e da noite com a própria etiqueta', () => {
        expect(notificacaoLembrete(false)).toMatchObject({ title: '📖 Um momento com a Palavra', tag: TAG_LEMBRETE, url: '/planos' });
        expect(notificacaoLembrete(true)).toMatchObject({ title: '🌙 Sua leitura de hoje', tag: TAG_LEMBRETE, url: '/planos' });
    });

    it('cada tipo tem etiqueta diferente (um não apaga o outro)', () => {
        expect(new Set([TAG_PALAVRA, TAG_VERSICULO, TAG_LEMBRETE]).size).toBe(3);
    });

    it('corte em frase respeita o limite', () => {
        expect(cortarEmFrase('Uma. Duas frases aqui. Três frases completas.', 25)).toBe('Uma. Duas frases aqui.');
    });
});

describe('ligações com o envio e o celular', () => {
    const rota = readFileSync(resolve(__dirname, '../../src/app/api/cron/push-notifications/route.ts'), 'utf8');
    const sw = readFileSync(resolve(__dirname, '../../public/sw.js'), 'utf8');

    it('a rota da manhã usa os textos novos e manda a Palavra por último', () => {
        expect(rota).toContain('notificacaoVersiculo(verse)');
        expect(rota).toContain('notificacaoPalavra(palavra?.mensagem)');
        expect(rota).toContain('notificacaoLembrete(noite)');
        expect(rota.indexOf('notificacaoVersiculo(verse)')).toBeLessThan(rota.indexOf('notificacaoPalavra(palavra?.mensagem)'));
        expect(rota).not.toContain(".slice(0, 110)");
    });

    it('o celular usa a etiqueta de cada notificação e volta ao app aberto ao tocar', () => {
        expect(sw).toContain("tag: data.tag || 'pvc'");
        expect(sw).not.toContain("tag: 'devotional'");
        expect(sw).toContain("clients.matchAll({ type: 'window', includeUncontrolled: true })");
        expect(sw).toContain('aberta.focus()');
    });
});
