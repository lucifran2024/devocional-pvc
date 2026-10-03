import { buscarTextoVersiculo } from '@/lib/daily-verse';

// ===========================================
// LIGAÇÕES DA EXPLICAÇÃO — a IA só indica a referência (02/10/2026: ela
// "citava" versículos de memória com texto diferente da NTLH). Aqui o app
// busca o texto real na NTLH e o acrescenta logo abaixo da referência.
// Sem texto encontrado, fica só a referência: nunca uma citação inventada.
// ===========================================

const INICIO_SECAO = /^\s*\*\*\s*Liga[çc][ãa]o na B[íi]blia/iu;
const OUTRA_SECAO = /^\s*\*\*[^*]+\*\*/u;
const REFERENCIA = /((?:[1-3]\s)?\p{Lu}\p{L}+(?:\s(?:dos|das|de|da|do)\s\p{Lu}\p{L}+)?)\s(\d{1,3}):(\d{1,3})(?:\s?[-–]\s?(\d{1,3}))?/gu;

type BuscarTexto = (ref: string) => Promise<string | null>;

export async function completarLigacoes(texto: string, buscar: BuscarTexto = buscarTextoVersiculo, maximo = 2): Promise<string> {
    const linhas = String(texto || '').split('\n');
    const inicio = linhas.findIndex((l) => INICIO_SECAO.test(l));
    if (inicio < 0) return texto;
    let fim = linhas.length;
    for (let i = inicio + 1; i < linhas.length; i++) {
        if (OUTRA_SECAO.test(linhas[i])) {
            fim = i;
            break;
        }
    }

    const saida: string[] = [];
    const vistas = new Set<string>();
    let usadas = 0;
    for (let i = 0; i < linhas.length; i++) {
        saida.push(linhas[i]);
        if (i < inicio || i >= fim) continue;
        for (const m of linhas[i].matchAll(REFERENCIA)) {
            if (usadas >= maximo) break;
            const ref = `${m[1]} ${m[2]}:${m[3]}${m[4] ? `-${m[4]}` : ''}`;
            if (vistas.has(ref)) continue;
            vistas.add(ref);
            const versiculo = await buscar(ref).catch(() => null);
            if (!versiculo?.trim()) continue;
            saida.push('', `*“${versiculo.trim()}” (${ref}, NTLH)*`, '');
            usadas++;
        }
    }
    return usadas ? saida.join('\n') : texto;
}

// "Verso para guardar" (Meditar e Viver, 03/10/2026): a IA dá só a referência;
// o app põe o texto exato da NTLH logo abaixo — verso para memorizar não pode
// vir de memória da IA. Sem texto encontrado, fica só a referência.
const VERSO_PARA_GUARDAR = /^\s*\*\*\s*Verso para guardar/iu;

export async function completarVersoParaGuardar(texto: string, buscar: BuscarTexto = buscarTextoVersiculo): Promise<string> {
    const linhas = String(texto || '').split('\n');
    const i = linhas.findIndex((l) => VERSO_PARA_GUARDAR.test(l));
    if (i < 0) return texto;
    // a referência pode estar na mesma linha do título ou na linha seguinte
    for (const j of [i, i + 1]) {
        const m = [...String(linhas[j] || '').matchAll(REFERENCIA)][0];
        if (!m) continue;
        const ref = `${m[1]} ${m[2]}:${m[3]}${m[4] ? `-${m[4]}` : ''}`;
        const versiculo = await buscar(ref).catch(() => null);
        if (!versiculo?.trim()) return texto;
        // A IA às vezes já escreve o verso; se ele já está na linha, não repete
        const semPontuacao = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
        const inicioDoVerso = semPontuacao(versiculo).split(' ').slice(0, 6).join(' ');
        if (inicioDoVerso && semPontuacao(linhas[j]).includes(inicioDoVerso)) return texto;
        linhas.splice(j + 1, 0, '', `*“${versiculo.trim()}” (${ref}, NTLH)*`, '');
        return linhas.join('\n');
    }
    return texto;
}
