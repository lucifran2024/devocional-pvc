import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

import { formatarExplicacao } from '@/lib/explicacao-apresentacao';

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

    it('título em markdown vira subtítulo como os em negrito', () => {
        expect(formatarExplicacao('## Salmo 96 · Um cântico novo\nTexto do salmo.', 'T')).toBe('### T\n\n#### Salmo 96 · Um cântico novo\n\nTexto do salmo.');
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

    it('envia o contexto do app e mostra o texto real da NTLH nas ligações', () => {
        const trecho = pagina.slice(pagina.indexOf('const gerarExplicacaoConteudo = async'), pagina.indexOf('// Gerar estudo via IA (Edge Function)'));
        expect(trecho).toContain('getIntroducaoLivro(livroId)');
        expect(trecho).toContain('posicao: `parte ${page} de ${getTotalPartesLeitura()} da leitura de hoje');
        expect(trecho).toMatch(/quantidade_versiculos: pedido\.quantidadeVersiculos,\s*contexto,/);
        expect(trecho).toContain('return await completarLigacoes(data.resultado);');
        expect(pagina).toContain('Na primeira vez leva uns 20 segundos; depois fica guardada para todos.');
    });

    it('sem a explicação local genérica: se a IA falhar, pede para tentar de novo (03/10/2026)', () => {
        expect(pagina).not.toContain('gerarExplicacaoLocal');
        const trecho = pagina.slice(pagina.indexOf('const handleExplicar = async'), pagina.indexOf('const buscarExplicacaoTestamento'));
        expect(trecho).toContain('setErroExplicacao(true)');
    });

    it('Entender a Passagem usa a explicação nova do Antigo e do Novo Testamento', () => {
        expect(pagina).toMatch(/case '2':\s*return await gerarEntenderPassagem\(\);/);
        expect(pagina).not.toContain("gerarEstudoIA('estudo_profundo')");
    });

    it('Meditar e Viver e Fixar em 1 Minuto: estudos novos, gerados só ao tocar (03/10/2026)', () => {
        expect(pagina).toMatch(/case '3':\s*return await gerarEstudoNovo\('aplicacao_pratica', 'Meditar e Viver'\);/);
        expect(pagina).toMatch(/case '4':\s*return await gerarEstudoNovo\('sintese_rapida', 'Fixar em 1 Minuto'\);/);
        expect(pagina).not.toContain("for (const tipo of ['aplicacao_pratica', 'sintese_rapida'])");
        expect(pagina).toContain('completarVersoParaGuardar(bruto)');
    });

    it('a parte já explicada não chama a IA de novo', () => {
        const trecho = pagina.slice(pagina.indexOf('const handleExplicar = async'), pagina.indexOf('// Inicia uma opção do menu'));
        expect(trecho.indexOf('jaExplicada')).toBeGreaterThan(-1);
        expect(trecho.indexOf('jaExplicada')).toBeLessThan(trecho.indexOf('await gerarExplicacaoConteudo()'));
    });
});
