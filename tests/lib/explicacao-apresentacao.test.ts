import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

import { formatarExplicacao } from '@/lib/explicacao-apresentacao';
import { gerarExplicacaoLocal } from '@/lib/explicacao-local';

// Formato que a IA devolve (prompt do explicar_passagem)
const DA_IA = `🔍 **EXPLICAÇÃO DA PARTE LIDA**

• **Versículos 1–4 — A saudade do Templo:** O salmista diz que ama o Templo — e que até o pardal encontrou casa ali.
• **Versículos 5–7 — A caminhada:** Quem confia em Deus passa pelo vale seco e o transforma em fonte.

**Sentido central da parte:** Estar perto de Deus vale mais do que qualquer outra coisa.`;

describe('apresentação da explicação da parte', () => {
    it('título próprio, sem o cabeçalho repetido nem a lupa', () => {
        const md = formatarExplicacao(DA_IA, 'Explicação de Salmos 84:1-12');
        expect(md.startsWith('### Explicação de Salmos 84:1-12\n\n')).toBe(true);
        expect(md).not.toContain('EXPLICAÇÃO DA PARTE LIDA');
        expect(md).not.toContain('🔍');
    });

    it('cada tópico vira subtítulo + parágrafo, sem marcador e sem travessão no rótulo', () => {
        const md = formatarExplicacao(DA_IA, 'Explicação');
        expect(md).toContain('#### Versículos 1-4 · A saudade do Templo\n\nO salmista diz que ama o Templo');
        expect(md).toContain('#### Versículos 5-7 · A caminhada\n\nQuem confia em Deus');
        expect(md).toContain('#### Sentido central da parte\n\nEstar perto de Deus');
        expect(md).not.toMatch(/^•/m);
    });

    it('não muda nenhuma palavra do texto explicativo', () => {
        const md = formatarExplicacao(DA_IA, 'Explicação');
        // o travessão dentro do texto (não no rótulo) continua como veio
        expect(md).toContain('O salmista diz que ama o Templo — e que até o pardal encontrou casa ali.');
        expect(md).toContain('Quem confia em Deus passa pelo vale seco e o transforma em fonte.');
    });

    it('sem linhas em branco sobrando e sem texto devolve vazio', () => {
        expect(formatarExplicacao('\n\n\n**A:** b\n\n\n\nc\n\n', 'T')).toBe('### T\n\n#### A\n\nb\n\nc');
        expect(formatarExplicacao('   ', 'T')).toBe('');
    });

    it('a reserva local sai no mesmo formato', () => {
        const local = gerarExplicacaoLocal({
            referencia: 'Salmos 84:1-2',
            parte: 1,
            introducao: null,
            pericopes: [],
            versiculos: [{ verse: 1, text: 'Como eu amo o teu Templo.', chapter: 84 }, { verse: 2, text: 'Tenho saudade dos pátios.', chapter: 84 }],
        });
        const md = formatarExplicacao(local, 'Explicação de Salmos 84:1-2');
        expect(md).not.toContain('EXPLICAÇÃO DA PARTE LIDA');
        expect(md).toMatch(/^#### Versículos /m);
        expect(md).toMatch(/^#### Sentido central da parte/m);
    });
});

describe('ligação com a tela da leitura', () => {
    const pagina = readFileSync(resolve(__dirname, '../../src/app/plano-de-leitura/page.tsx'), 'utf8');

    it('usa o formatador, mostra espera no lugar certo e leva o leitor até a explicação', () => {
        expect(pagina).toContain('formatarExplicacao(conteudo, ');
        expect(pagina).not.toContain('**Entenda a passagem**\n*Parte ${page} de ${passagem?.referencia}*');
        expect(pagina).toContain('data-explicacao');
        expect(pagina).toContain('Preparando a explicação desta parte');
        expect(pagina).toContain('rolarParaExplicacao()');
    });

    it('a parte já explicada não chama a IA de novo', () => {
        const trecho = pagina.slice(pagina.indexOf('const handleExplicar = async'), pagina.indexOf('// Inicia uma opção do menu'));
        expect(trecho.indexOf('jaExplicada')).toBeGreaterThan(-1);
        expect(trecho.indexOf('jaExplicada')).toBeLessThan(trecho.indexOf('await gerarExplicacaoConteudo()'));
    });
});
