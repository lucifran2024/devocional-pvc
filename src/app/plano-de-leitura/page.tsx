'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
    Book, Sparkles, Calendar, ArrowLeft, Send, Loader2,
    ChevronRight, RotateCcw, GraduationCap, Clock, Search,
    Globe, Rocket, Zap, Building, MessageSquare, ClipboardList, ArrowRight
} from 'lucide-react';
import { getDataHoje } from '@/lib/supabase';
import { getPassagemDoDia, getTeseCentral, type PassagemSecao6 } from '@/lib/secao6';
import { CosmicHeader } from '@/components/ui/CosmicHeader';
import { CosmicBackground } from '@/components/ui/CosmicBackground';
import ReactMarkdown from 'react-markdown';

// ===========================================
// TIPOS
// ===========================================

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

type MenuOption = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | null;

// ===========================================
// MENU OPTIONS CONFIG
// ===========================================

const MENU_OPTIONS = [
    { id: '1', icon: Book, label: 'Ler Passagem Comentada', desc: 'texto bíblico em telas + explicações.' },
    { id: '2', icon: Clock, label: 'Linha do Tempo', desc: 'personagens, cenário e sequência dos fatos.' },
    { id: '3', icon: Search, label: 'Estudo Profundo', desc: 'teologia, palavras-chave e simbolismos.' },
    { id: '4', icon: Globe, label: 'Contexto Histórico', desc: 'cultura, geografia e costumes.' },
    { id: '5', icon: Rocket, label: 'Aplicação Prática', desc: 'como viver isso nas próximas 24–48h.' },
    { id: '6', icon: Zap, label: 'Síntese Completa', desc: 'visão panorâmica e resumo executivo da passagem.' },
    { id: '7', icon: Building, label: 'Exposição Detalhada', desc: 'análise verso a verso ou em blocos, com profundidade teológica.' },
    { id: '8', icon: MessageSquare, label: 'Chat Pastoral', desc: 'tirar dúvidas e aprofundar meu entendimento sobre a passagem.' },
    { id: '9', icon: ClipboardList, label: 'Revisão & Quiz', desc: 'perguntas para testar se entendi bem a passagem.' },
] as const;

// ===========================================
// COMPONENTES PREMIUM
// ===========================================

function PremiumOptionCard({ option, onClick, disabled }: {
    option: typeof MENU_OPTIONS[number];
    onClick: () => void;
    disabled: boolean;
}) {
    const Icon = option.icon;
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className="group relative w-full text-left p-6 rounded-2xl glass-card hover:bg-white/[0.02] disabled:opacity-50 disabled:cursor-not-allowed flex flex-col gap-4 overflow-hidden"
        >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Icon className="w-24 h-24 -mr-8 -mt-8 text-white rotate-12" />
            </div>

            <div className="flex items-center justify-between z-10">
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-[#FCD34D] group-hover:scale-110 transition-transform duration-300">
                    <Icon className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">OPÇÃO {option.id}</span>
            </div>

            <div className="z-10">
                <h3 className="font-bold text-white text-lg mb-1 group-hover:text-[#FCD34D] transition-colors">{option.label}</h3>
                <p className="text-sm text-slate-400 group-hover:text-slate-300 leading-relaxed">{option.desc}</p>
            </div>
        </button>
    );
}

function ChatBubble({ message }: { message: ChatMessage }) {
    const isUser = message.role === 'user';
    return (
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-enter mb-6`}>
            <div className={`
                max-w-[85%] rounded-2xl px-6 py-4 relative
                ${isUser
                    ? 'bg-gradient-to-br from-amber-600 to-amber-700 text-white rounded-br-none shadow-lg shadow-amber-900/20'
                    : 'glass-panel text-slate-100 rounded-bl-none'
                }
            `}>
                <div className="text-sm md:text-base whitespace-pre-wrap leading-relaxed prose prose-invert prose-p:my-2 prose-strong:text-amber-300 prose-headings:text-amber-200 max-w-none">
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                </div>
            </div>
        </div>
    );
}

// ===========================================
// PÁGINA PRINCIPAL
// ===========================================

export default function PlanoLeituraPage() {
    const [passagem, setPassagem] = useState<PassagemSecao6 | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeOption, setActiveOption] = useState<MenuOption>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    const dataHoje = getDataHoje();

    // Carregar passagem do dia
    useEffect(() => {
        async function loadPassagem() {
            setLoading(true);
            try {
                // Tenta buscar do Storage primeiro (mais atualizado)
                const { getPassagemFromStorage } = await import('@/lib/supabase');
                const dataStorage = await getPassagemFromStorage(dataHoje);

                if (dataStorage) {
                    setPassagem(dataStorage);
                } else {
                    // Fallback para local se falhar ou não encontrar
                    console.log('⚠️ Fallback para dados locais');
                    const dataLocal = getPassagemDoDia(dataHoje);
                    setPassagem(dataLocal);
                }
            } catch (error) {
                console.error('Erro ao carregar passagem:', error);
                // Último recurso
                const dataLocal = getPassagemDoDia(dataHoje);
                setPassagem(dataLocal);
            } finally {
                setLoading(false);
            }
        }
        loadPassagem();
    }, [dataHoje]);

    // Scroll automático no chat
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Formatar data
    const formatarDataExtenso = (dataStr: string) => {
        return new Date(dataStr + 'T12:00:00').toLocaleDateString('pt-BR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    // Gerar resposta do menu inicial
    const gerarRespostaMenuInicial = (): string => {
        if (!passagem) return 'Preparando ambiente de estudo...';

        return `Olá! Sou seu Mentor Bíblico. 🌌
        
Como você deseja mergulhar na passagem de hoje (**${passagem.referencia}**)?

---

Escolha uma das opções abaixo ou digite o número correspondente:

1. 📖 **Ler Passagem Comentada**
2. 🧭 **Linha do Tempo**
3. 🔍 **Estudo Profundo**
4. 🌍 **Contexto Histórico**
5. 🚀 **Aplicação Prática**
6. ⚡ **Síntese Completa**
7. 🏛️ **Exposição Detalhada**
8. 💬 **Chat Pastoral**
9. 📝 **Revisão & Quiz**

Estou pronto para guiá-lo nesta jornada espiritual.`;
    };

    // Processar comando do usuário
    const processarComando = async (comando: string) => {
        const cmdLower = comando.toLowerCase().trim();

        // Comandos de navegação
        if (['menu', 'voltar', 'voltar ao menu'].includes(cmdLower)) {
            setActiveOption(null);
            return gerarRespostaMenuInicial();
        }

        // Números do menu
        const numMatch = cmdLower.match(/^[1-9]$/);
        if (numMatch) {
            const optionId = numMatch[0] as MenuOption;
            setActiveOption(optionId);
            return await gerarRespostaOpcao(optionId);
        }

        // Se está em chat pastoral (opção 8), processar como pergunta
        if (activeOption === '8') {
            return await processarChatPastoral(comando);
        }

        // Comando continuar
        if (['continuar', 'próximo', 'proximo', 'seguir', 'leia mais'].includes(cmdLower)) {
            return await processarContinuar();
        }

        // Comando não reconhecido
        return `Não entendi o comando. Digite um número de **1 a 9** ou **MENU** para ver as opções.`;
    };

    // Gerar resposta para cada opção
    const gerarRespostaOpcao = async (opcao: MenuOption): Promise<string> => {
        if (!passagem) return 'Passagem não carregada.';

        switch (opcao) {
            case '1':
                return gerarLeituraGuiada();
            case '2':
                return gerarLinhaTempo();
            case '3':
                return gerarEstudoProfundo();
            case '4':
                return gerarContextoHistorico();
            case '5':
                return gerarAplicacaoPratica();
            case '6':
                return gerarSinteseCompleta();
            case '7':
                return gerarExposicaoDetalhada();
            case '8':
                return `💬 **CHAT PASTORAL ATIVADO**

Agora estamos em modo de conversa direta sobre a passagem de hoje: **${passagem.referencia}**.

Você pode me perguntar:
• Dúvidas de interpretação ("o que esse versículo quer dizer?")
• Perguntas de estrutura ("como essa parte se conecta com o resto?")
• Aplicações pessoais ("como eu posso viver isso?")
• Conexões bíblicas ("existe paralelo em outro lugar?")

Faça sua pergunta, e vamos explorar juntos!

---
Digite **MENU** para voltar às opções.`;
            case '9':
                return gerarQuiz();
            default:
                return 'Opção não reconhecida.';
        }
    };

    // Opção 1: Leitura Guiada
    const gerarLeituraGuiada = (): string => {
        if (!passagem) return '';

        return `📲 **LEITURA BÍBLICA: ${passagem.referencia}**
📍 *Parte 1 de 3*

---

**Isaías 13:1-9** (NVI)

**1.** Sentença contra Babilônia, que Isaías, filho de Amoz, recebeu em visão.
**2.** Levantem uma bandeira no alto de um monte árido, gritem aos guerreiros; façam sinais para que eles entrem pelos portões da nobreza.
**3.** Eu mesmo dei ordens aos meus consagrados e convoquei os meus guerreiros para executarem a minha ira, os que se alegram com a minha exaltação.
**4.** Ouçam! Um barulho nas montanhas, como o de uma imensa multidão! Ouçam! Um tumulto de reinos, nações reunidas! O Senhor dos Exércitos está passando em revista um exército para a guerra.
**5.** Eles vêm de terras distantes, dos confins dos céus: o Senhor e os instrumentos da sua ira, para destruírem toda a terra.
**6.** Gemam, pois o dia do Senhor está perto; ele vem como uma destruição do Todo-Poderoso.
**7.** Por causa disso, todas as mãos desfalecerão, e todos os corações desmaiarão de medo.
**8.** O pavor se apoderará deles; dores e angústias os dominarão; contorcerão como mulher em trabalho de parto. Olharão espantados uns para os outros, seus rostos ardendo como chamas.
**9.** Vejam! O dia do Senhor está chegando, dia cruel, de ira e grande furor, para tornar em desolação a terra e destruir os seus pecadores.

---

🔍 **CONTEXTO & EXPLICAÇÃO**

• **O que está acontecendo:** Isaías recebe uma profecia contra a poderosa Babilônia.
• **Contexto:** Babilônia era símbolo de poder humano e orgulho – representava tudo que desafia a Deus.
• **Significado:** O "dia do Senhor" aponta para o juízo divino sobre a arrogância humana. Deus usa nações para cumprir seus propósitos.

---
Digite **CONTINUAR** para seguir para os próximos versículos.
Ou **MENU** para voltar.`;
    };

    // Opção 2: Linha do Tempo
    const gerarLinhaTempo = (): string => {
        if (!passagem) return '';

        return `🧭 **LINHA DO TEMPO: ${passagem.referencia}**

---

**📍 PERSONAGENS PRINCIPAIS**

• **Isaías** — O profeta, porta-voz de Deus, filho de Amoz
• **Babilônia** — A nação poderosa e orgulhosa (representação do mal)
• **Moabe** — Reino vizinho de Israel, também sob juízo
• **O Senhor dos Exércitos** — Deus como comandante supremo

---

**🏛️ CENÁRIO**

• **Época:** ~740-700 a.C., durante o reinado de reis de Judá
• **Local:** Profecia dada em Judá, sobre nações vizinhas
• **Clima emocional:** Tensão apocalíptica, juízo iminente, advertência severa

---

**📜 SEQUÊNCIA DOS FATOS**

1. **Cap. 13:** Anúncio do Dia do Senhor contra Babilônia
2. **Cap. 14:1-23:** Queda do rei da Babilônia (o "astro brilhante")
3. **Cap. 14:24-27:** Juízo contra a Assíria
4. **Cap. 14:28-32:** Profecia contra os filisteus
5. **Cap. 15:** Lamento sobre a destruição de Moabe

---

**⚔️ CONFLITO E RESOLUÇÃO**

• **Conflito:** O orgulho das nações desafia a soberania de Deus
• **Tensão:** Como o mal pode prosperar enquanto os justos sofrem?
• **Resolução:** O Dia do Senhor trará justiça — nenhum poder humano permanece

---

**✝️ ONDE CRISTO APARECE?**

A queda do "astro brilhante" (Is 14:12) prefigura a vitória de Cristo sobre Satanás. Jesus é o verdadeiro Rei que derrota todo orgulho e estabelece Seu reino eterno.

---
Digite outro **NÚMERO** para explorar outra opção ou **MENU** para voltar.`;
    };

    // Opção 3: Estudo Profundo
    const gerarEstudoProfundo = (): string => {
        if (!passagem) return '';

        return `🔍 **ESTUDO PROFUNDO: ${passagem.referencia}**

---

**📚 PALAVRAS-CHAVE**

${passagem.lexico_do_dia.map(p => `• **${p}**`).join('\n')}

---

**🎓 TERMOS TEOLÓGICOS**

**1. "O Dia do Senhor" (Yom YHWH)**
Expressão profética para o momento em que Deus intervém diretamente na história para julgar o mal e salvar seu povo. Não é um dia de 24 horas, mas um período de juízo divino.

**2. "Babilônia"**
Mais que uma cidade, representa o sistema mundial em oposição a Deus. No Apocalipse, "Babilônia" simboliza toda forma de idolatria e orgulho humano (Ap 17-18).

---

**🔗 PARALELOS BÍBLICOS**

• **Is 13:10** → **Mt 24:29** — Jesus cita Isaías ao falar do fim dos tempos
• **Is 14:12-15** → **Lc 10:18** — "Vi Satanás caindo do céu como um relâmpago"

---

**❓ PERGUNTAS TEOLÓGICAS**

**1. O que isso revela sobre Deus?**
Deus é soberano sobre todas as nações. Nenhum poder humano, por maior que seja, escapa do seu juízo. Ele é justo e não deixa o mal impune.

**2. O que revela sobre o coração humano?**
O orgulho é a raiz de todo pecado. Babilônia queria "subir acima das estrelas" — a ambição de ser Deus. Este é o pecado original repetido.

---

**⚠️ O QUE NÃO SIGNIFICA**

• ❌ Não é uma previsão literal sobre o atual país do Iraque
• ❌ Não significa que Deus é cruel — o juízo é consequência do pecado
• ❌ Não quer dizer que devemos temer o fim do mundo constantemente

---
Digite outro **NÚMERO** ou **MENU** para voltar.`;
    };

    // Opção 4: Contexto Histórico
    const gerarContextoHistorico = (): string => {
        if (!passagem) return '';

        return `🌍 **CONTEXTO HISTÓRICO: ${passagem.referencia}**

---

**🗺️ GEOGRAFIA**

• **Babilônia:** Localizada na Mesopotâmia (atual Iraque), entre os rios Tigre e Eufrates
• **Moabe:** A leste do Mar Morto, região montanhosa
• **Distância de Jerusalém:** ~900km até Babilônia, ~80km até Moabe

---

**👑 CENÁRIO POLÍTICO**

• **Época:** Século VIII a.C.
• **Judá:** Reino do sul, ainda independente mas sob ameaça
• **Assíria:** Superpotência dominante na época de Isaías
• **Babilônia:** Ainda subordinada à Assíria, mas profetizada como futura conquistadora

---

**🏛️ ESTRUTURA SOCIAL**

• **Profecias contra nações:** Prática comum dos profetas (também em Amós, Ezequiel)
• **Função:** Mostrar que Deus é Senhor de TODAS as nações, não só de Israel
• **Audiência:** Os israelitas, para ensinar sobre a soberania divina

---

**📿 COSTUMES E RELIGIÃO**

• **Babilônia:** Famosa pelos zigurates e adoração a Marduk
• **Moabe:** Adoravam Quemós, com sacrifícios de crianças
• **Israel:** Chamado a ser separado dessas práticas pagãs

---

**💡 POR QUE FAZ SENTIDO PARA OS PRIMEIROS LEITORES?**

Os israelitas viviam sob constante ameaça de impérios maiores. Ouvir que Deus julgaria até a poderosa Babilônia trazia:
1. **Consolo:** Deus vê a injustiça e agirá
2. **Advertência:** Israel também será julgado se pecar
3. **Esperança:** O Senhor está no controle da história

---

**🔄 CONEXÃO COM HOJE**

Assim como Babilônia representava o poder mundano, hoje enfrentamos "babilônias" modernas: sistemas de orgulho, consumismo, e ideologias que desafiam Deus. A mensagem permanece: nenhum poder humano prevalece contra o Senhor.

---
Digite outro **NÚMERO** ou **MENU** para voltar.`;
    };

    // Opção 5: Aplicação Prática
    const gerarAplicacaoPratica = (): string => {
        if (!passagem) return '';

        return `🚀 **APLICAÇÃO PRÁTICA: ${passagem.referencia}**

---

**O que posso viver nas próximas 24–48h?**

---

**1. 🏠 EM CASA: Examinar meu orgulho**

O rei de Babilônia caiu por querer "subir acima das estrelas". 

**Ação concreta:** Hoje, identifique uma área onde você se sente "superior" a alguém (família, cônjuge, filhos). Peça perdão internamente e demonstre humildade com um ato de serviço (lavar a louça, ouvir sem interromper).

---

**2. 💼 NO TRABALHO: Confiar na soberania de Deus**

Isaías mostra que até impérios caem quando Deus decide. Nenhum chefe, empresa ou crise econômica está acima do Senhor.

**Ação concreta:** Se você está ansioso com o trabalho, ore especificamente: "Senhor, Tu és o Senhor dos Exércitos, também sobre minha carreira. Ajuda-me a confiar."

---

**3. 💭 NO CORAÇÃO: Abandonar o "astro brilhante" interno**

Todos temos a tentação de querer brilhar mais que os outros. 

**Ação concreta:** Quando receber um elogio hoje, mentalmente redirecione a glória a Deus. Diga internamente: "Obrigado, Senhor, por usar alguém tão falho quanto eu."

---

**⚠️ O QUE EVITAR**

• ❌ Não use o texto para julgar outras nações ou pessoas
• ❌ Não tenha medo paralisante do juízo — a graça de Cristo nos cobre
• ❌ Não leia como curiosidade apocalíptica, mas como convite à humildade

---

**🙏 ORAÇÃO SUGERIDA**

*"Senhor, Tu resististe ao orgulho de Babilônia. Resiste também ao meu. Mostra-me onde estou querendo 'subir acima das estrelas' e me dá a graça de descer como Jesus desceu. Amém."*

---
Digite outro **NÚMERO** ou **MENU** para voltar.`;
    };

    // Opção 6: Síntese Completa
    const gerarSinteseCompleta = (): string => {
        if (!passagem) return '';

        const insights = passagem.insights_pre_minerados;

        return `⚡ **SÍNTESE COMPLETA: ${passagem.referencia}**

---

**🎯 A GRANDE IDEIA**

> **${insights[0]?.tese || 'O Dia do Senhor revela que nenhum poder humano permanece diante da soberania divina.'}**

---

**📋 PONTOS-CHAVE**

${insights.map((i, idx) => `${idx + 1}. **${i.familia}:** ${i.tese} *(${i.verso_suporte})*`).join('\n')}

---

**🔚 DESFECHO**

A tensão entre o orgulho humano e a soberania de Deus se resolve no **Dia do Senhor**:
- Babilônia cai — o orgulho é humilhado
- Moabe lamenta — o juízo é inevitável
- Mas há esperança implícita — quem se humilha diante de Deus encontra graça

---

**💎 RESUMO EXECUTIVO (para quem tem 30 segundos)**

Isaías 13-15 profetiza contra nações orgulhosas. **Babilônia**, símbolo do poder humano, cairá no "Dia do Senhor". **Moabe** também será destruída. A mensagem central: **nenhum império resiste a Deus**. Para nós hoje: humildade diante do Senhor é o único caminho seguro.

---

**✝️ CONEXÃO COM O EVANGELHO**

Cristo tomou sobre si o juízo que merecíamos. O "Dia do Senhor" que seria nossa condenação tornou-se, pela cruz, nosso dia de salvação.

---
Digite outro **NÚMERO** ou **MENU** para voltar.`;
    };

    // Opção 7: Exposição Detalhada
    const gerarExposicaoDetalhada = (): string => {
        if (!passagem) return '';

        return `🏛️ **EXPOSIÇÃO DETALHADA: ${passagem.referencia}**
📍 *Bloco 1 de 3: Isaías 13 — O Dia do Senhor contra Babilônia*

---

**VERSÍCULOS 1-5: O Exército Divino**

> "Sentença contra Babilônia, que Isaías, filho de Amoz, recebeu em visão."

**Sentido original:** A palavra "sentença" (hebr. *massa*) significa "peso/fardo". Isaías carrega uma mensagem pesada de juízo. Babilônia, embora ainda não seja a superpotência que será em 586 a.C., já representa o orgulho humano.

**Conexão bíblica:** Este padrão de "sentença contra nações" aparece em Amós 1-2 e Ezequiel 25-32. Deus julga todas as nações, não apenas Israel.

**Apontando para Cristo:** Jesus é o verdadeiro "Senhor dos Exércitos" (Mt 26:53). Ele poderia convocar legiões de anjos, mas escolheu a cruz.

---

**VERSÍCULOS 6-9: O Dia Terrível**

> "Gemam, pois o dia do Senhor está perto; ele vem como uma destruição do Todo-Poderoso."

**Sentido original:** O "Dia do Senhor" (Yom YHWH) é o motivo central dos profetas. É quando Deus invade a história para acertar as contas.

**Conexão bíblica:** Joel 2:1, Amós 5:18, Sofonias 1:14 — todos ecoam este tema. O NT o conecta à volta de Cristo (1 Ts 5:2).

**Apontando para Cristo:** Na cruz, Jesus enfrentou o "Dia do Senhor" em nosso lugar. O terror que deveria nos destruir caiu sobre Ele.

---

**VERSÍCULOS 10-16: Sinais Cósmicos**

> "As estrelas e constelações dos céus não darão sua luz."

**Sentido original:** Linguagem apocalíptica para descrever a magnitude do juízo. Não é literal, mas poética — o universo reage diante de Deus.

**Conexão bíblica:** Jesus usa estas imagens em Mateus 24:29 ao falar do fim dos tempos.

---

Digite **CONTINUAR** para o próximo bloco (Is 14: A Queda do Rei).
Ou **MENU** para voltar.`;
    };

    // Opção 9: Quiz
    const gerarQuiz = (): string => {
        if (!passagem) return '';

        return `📝 **REVISÃO & QUIZ: ${passagem.referencia}**

---

Agora é você que fala! Responda por escrito aqui ou pense/responda em voz alta. Se você escrever, eu consigo te dar feedback.

---

**PERGUNTA 1 — Compreensão**

> Qual nação é o principal alvo da profecia em Isaías 13?

*(Pense antes de responder...)*

---

**PERGUNTA 2 — Interpretação**

> O que o "Dia do Senhor" ensina sobre o caráter de Deus?

*Dica: pense em justiça, soberania, santidade...*

---

**PERGUNTA 3 — Aplicação Pessoal**

> Em que área da sua vida você pode estar agindo como "Babilônia" — com orgulho ou auto-suficiência?

*Seja honesto consigo mesmo...*

---

**PERGUNTA 4 — Conexão Bíblica**

> Isaías 14:12 fala de alguém que queria "subir acima das estrelas". Jesus disse algo parecido sobre Satanás. Você lembra onde?

*Dica: Lucas 10...*

---

**PERGUNTA 5 — Síntese**

> Se você tivesse que resumir Isaías 13-15 em UMA frase para um amigo, o que diria?

---

📬 **Escreva suas respostas abaixo!**
Eu te darei feedback. Ou digite **MENU** para voltar às opções.`;
    };

    // Processar pergunta do chat pastoral
    const processarChatPastoral = async (pergunta: string): Promise<string> => {
        if (!passagem) return 'Passagem não carregada.';

        // Simulação de resposta pastoral inteligente baseada no contexto
        // Em produção, isso seria uma chamada para a Edge Function com IA

        const perguntaLower = pergunta.toLowerCase();

        if (perguntaLower.includes('por que') || perguntaLower.includes('porque')) {
            return `Ótima pergunta! 

Baseado em **${passagem.referencia}**, posso te ajudar a entender...

${passagem.insights_pre_minerados.slice(0, 2).map(i => `• **${i.verso_suporte}:** ${i.tese}`).join('\n')}

O texto nos ensina que Deus é soberano sobre todas as nações. A Babilônia, por mais poderosa que fosse, não estava fora do alcance do juízo divino.

---

Faz sentido para você? Quer que aprofunde mais algum ponto?`;
        }

        if (perguntaLower.includes('como aplicar') || perguntaLower.includes('como viver')) {
            return `Essa é uma pergunta muito prática!

De **${passagem.referencia}**, podemos extrair aplicações diretas:

1. **Humildade:** O orgulho de Babilônia foi sua ruína. Onde você pode praticar humildade hoje?

2. **Confiança:** Deus está no controle — mesmo quando nações parecem invencíveis. Você pode descansar nisso.

3. **Vigilância:** O "Dia do Senhor" veio para Babilônia. Estamos vivendo de forma que nos preparamos para encontrar nosso Senhor?

---

Qual dessas aplicações ressoa mais com você hoje?`;
        }

        // Resposta genérica
        return `Obrigado por compartilhar essa reflexão sobre **${passagem.referencia}**!

Deixa eu te ajudar a pensar nisso à luz do texto...

O profeta Isaías nos mostra que:
${passagem.insights_pre_minerados[0] ? `• ${passagem.insights_pre_minerados[0].tese}` : ''}

A passagem de hoje nos confronta com a soberania de Deus sobre TODAS as nações e circunstâncias.

---

Quer explorar mais algum aspecto específico? Ou posso te sugerir reler os versículos ${passagem.insights_pre_minerados[0]?.verso_suporte || '13:1-9'}.`;
    };

    // Processar comando CONTINUAR
    const processarContinuar = async (): Promise<string> => {
        if (!passagem) return 'Passagem não carregada.';

        if (activeOption === '1') {
            return `📲 **LEITURA BÍBLICA: ${passagem.referencia}**
📍 *Parte 2 de 3*

---

**Isaías 13:10-22** (NVI)

**10.** As estrelas e constelações dos céus não darão sua luz. O sol ficará escuro ao nascer e a lua não fará brilhar a sua luz.
**11.** Castigarei o mundo por causa da sua maldade e os ímpios por causa da sua iniquidade. Porei fim à arrogância dos altivos e humilharei o orgulho dos cruéis.
**12.** Tornarei os homens mais raros do que o ouro puro, mais raros do que o ouro de Ofir.
**13.** Por isso farei tremer os céus; e a terra será sacudida do seu lugar na ira do Senhor dos Exércitos, no dia da sua ardente ira.

...

**19.** Babilônia, a joia dos reinos, glória e orgulho dos caldeus, será como Sodoma e Gomorra quando Deus as destruiu.
**20.** Nunca mais será habitada, ninguém viverá nela por todas as gerações.

---

🔍 **CONTEXTO & EXPLICAÇÃO**

• **O que está acontecendo:** Descrição apocalíptica do juízo — até os astros "se apagam" diante de Deus.
• **Contexto:** Linguagem poética para mostrar a magnitude do evento; o cosmos reage ao juízo.
• **Significado:** O orgulho será humilhado. Babilônia, a "jóia", se tornará ruína como Sodoma.

---
Digite **CONTINUAR** para os últimos versículos.
Ou **MENU** para voltar.`;
        }

        if (activeOption === '7') {
            return `🏛️ **EXPOSIÇÃO DETALHADA: ${passagem.referencia}**
📍 *Bloco 2 de 3: Isaías 14 — A Queda do "Astro Brilhante"*

---

**VERSÍCULOS 12-15: O Orgulho Fatal**

> "Como você caiu dos céus, ó estrela da manhã, filho da alvorada!"

**Sentido original:** O "astro brilhante" (hebr. *helel*) refere-se ao rei de Babilônia. A imagem é de alguém que queria ser como Deus e caiu.

**Conexão bíblica:** Jesus em Lucas 10:18: "Eu vi Satanás caindo do céu como um relâmpago." A queda do rei babilônico prefigura a queda do próprio inimigo.

**Apontando para Cristo:** Enquanto Lúcifer/Babilônia subiu e caiu, Cristo desceu e foi exaltado (Fp 2:5-11). O caminho de Deus é a humildade.

---

**OS "CINCO EU VOU" (v.13-14)**

1. "Subirei aos céus"
2. "Erguerei meu trono acima das estrelas"
3. "Sentarei no monte da assembleia"
4. "Subirei acima das nuvens"
5. "Serei como o Altíssimo"

**Significado:** Cada "eu vou" representa um degrau de orgulho. O pecado original foi querer "ser como Deus" (Gn 3:5).

---

Digite **CONTINUAR** para o bloco final (Isaías 15: Moabe).
Ou **MENU** para voltar.`;
        }

        return `✅ **LEITURA CONCLUÍDA!**

---

💎 **Resumo de Ouro:** Deus é soberano sobre todas as nações. O orgulho humano sempre será humilhado, mas há graça para os humildes.

🙏 **Sugestão de Oração:**

*"Senhor, obrigado por me lembrar que Tu estás no controle. Que eu não seja como Babilônia, buscando minha própria glória. Ajuda-me a viver com humildade, confiando na Tua soberania. Em nome de Jesus. Amém."*

---
Digite **MENU** para continuar estudando.`;
    };

    // Enviar mensagem (Lógica central)
    const submitMessage = async (text: string) => {
        if (!text.trim() || isProcessing) return;

        const userMessage: ChatMessage = {
            role: 'user',
            content: text.trim(),
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setIsProcessing(true);

        try {
            const resposta = await processarComando(userMessage.content);

            const assistantMessage: ChatMessage = {
                role: 'assistant',
                content: resposta,
                timestamp: new Date()
            };

            setMessages(prev => [...prev, assistantMessage]);
        } catch (error) {
            const errorMessage: ChatMessage = {
                role: 'assistant',
                content: 'Desculpe, ocorreu um erro. Tente novamente.',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsProcessing(false);
        }
    };

    // Handler do Input de Texto
    const handleSend = () => {
        submitMessage(inputValue);
    };

    // Handler dos Botões de Ação Rápida
    const handleQuickAction = (action: string) => {
        submitMessage(action);
    };

    // Selecionar opção do menu visual
    const handleMenuClick = async (optionId: string) => {
        const userMessage: ChatMessage = {
            role: 'user',
            content: optionId,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setIsProcessing(true);

        try {
            const resposta = await processarComando(optionId);

            const assistantMessage: ChatMessage = {
                role: 'assistant',
                content: resposta,
                timestamp: new Date()
            };

            setMessages(prev => [...prev, assistantMessage]);
        } finally {
            setIsProcessing(false);
        }
    };

    // Iniciar com mensagem de boas-vindas
    useEffect(() => {
        if (!loading && passagem && messages.length === 0) {
            const welcomeMessage: ChatMessage = {
                role: 'assistant',
                content: gerarRespostaMenuInicial(),
                timestamp: new Date()
            };
            setMessages([welcomeMessage]);
        }
    }, [loading, passagem]);

    // ===========================================
    // RENDER
    // ===========================================

    return (
        <CosmicBackground className="min-h-screen pb-20 overflow-x-hidden selection:bg-amber-500/30">

            {/* Navbar Placeholder (or Back Button) */}
            <div className="max-w-7xl mx-auto pt-8 px-6 mb-8 flex justify-between items-center z-10 relative">
                <Link href="/" className="btn-glass px-4 py-2 rounded-full flex items-center gap-2 text-sm font-medium group">
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Voltar ao Dashboard
                </Link>
                <div className="flex gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-xs text-slate-400 font-mono tracking-widest">ONLINE</span>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 z-10 relative">

                {/* Header Section */}
                <div className="text-center mb-16 animate-enter">
                    <span className="inline-block px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold tracking-[0.2em] mb-4">
                        MODO MENTOR
                    </span>
                    <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 tracking-tight">
                        Plano de <span className="text-gradient-gold">Leitura</span>
                    </h1>
                    <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                        Mergulhe nas Escrituras com profundidade, contexto e aplicação prática.
                    </p>
                </div>

                {!activeOption ? (
                    // -------------------------------------------
                    // VISTA INICIAL (MENU GRID)
                    // -------------------------------------------
                    <div className="animate-enter" style={{ animationDelay: '0.1s' }}>

                        {/* Daily Passage Card (Hero) */}
                        <div className="glass-panel rounded-3xl p-8 mb-12 flex flex-col md:flex-row items-center justify-between gap-8 border-amber-500/20 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 blur-[100px] rounded-full -mr-32 -mt-32 pointer-events-none"></div>

                            <div className="flex-1 text-center md:text-left z-10">
                                <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">PASSAGEM DE HOJE ({formatarDataExtenso(dataHoje)})</h2>

                                {loading ? (
                                    <div className="h-12 w-64 bg-white/5 rounded animate-pulse"></div>
                                ) : passagem ? (
                                    <div className="space-y-2">
                                        <h3 className="text-4xl md:text-5xl font-black text-white tracking-tight">{passagem.referencia}</h3>
                                        <div className="flex flex-wrap gap-2 justify-center md:justify-start mt-3">
                                            <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-300">
                                                Arquétipo: <span className="text-amber-400 font-bold">{passagem.arquetipo_maestro}</span>
                                            </span>
                                            <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-300">
                                                Tema: {passagem.insights_pre_minerados[0]?.tese.substring(0, 40)}...
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-red-400 bg-red-500/10 px-4 py-2 rounded-lg border border-red-500/20 inline-block">
                                        Passagem não encontrada para hoje. Verifique o Storage.
                                    </div>
                                )}
                            </div>

                            <div className="z-10">
                                <button className="btn-premium px-8 py-4 rounded-xl flex items-center gap-3 shadow-amber-500/20 text-lg">
                                    <Book className="w-5 h-5" />
                                    Começar Leitura
                                </button>
                            </div>
                        </div>

                        {/* Options Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {MENU_OPTIONS.map((option) => (
                                <PremiumOptionCard
                                    key={option.id}
                                    option={option}
                                    disabled={loading || !passagem}
                                    onClick={() => {
                                        if (passagem) {
                                            setActiveOption(option.id as MenuOption);
                                            // Adiciona mensagem inicial do usuário (simulada) e resposta do sistema
                                            const opcaoTexto = option.label;
                                            setMessages([
                                                { role: 'user', content: `Quero ver: ${opcaoTexto}`, timestamp: new Date() },
                                                // A resposta virá via useEffect ou chamada direta?
                                                // Na lógica original, chamávamos gerarRespostaOpcao
                                            ]);

                                            // Pequeno delay para efeito "pensando"
                                            setIsProcessing(true);
                                            setTimeout(async () => {
                                                const resp = await gerarRespostaOpcao(option.id as MenuOption);
                                                setMessages(prev => [...prev, { role: 'assistant', content: resp, timestamp: new Date() }]);
                                                setIsProcessing(false);
                                            }, 600);
                                        }
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                ) : (
                    // -------------------------------------------
                    // VISTA CHAT (INTERATIVA)
                    // -------------------------------------------
                    <div className="max-w-4xl mx-auto animate-enter">
                        <div className="glass-panel rounded-3xl min-h-[70vh] flex flex-col relative overflow-hidden border-amber-500/20">

                            {/* Chat Header */}
                            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-black/20 backdrop-blur-md sticky top-0 z-20">
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={() => setActiveOption(null)}
                                        className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white"
                                    >
                                        <ArrowLeft className="w-5 h-5" />
                                    </button>
                                    <div>
                                        <h2 className="font-bold text-white text-lg">
                                            {MENU_OPTIONS.find(o => o.id === activeOption)?.label}
                                        </h2>
                                        <p className="text-xs text-slate-400">
                                            {passagem?.referencia} • {passagem?.arquetipo_maestro}
                                        </p>
                                    </div>
                                </div>
                                <div className="p-2 bg-amber-500/10 rounded-full">
                                    <Sparkles className="w-5 h-5 text-amber-400" />
                                </div>
                            </div>

                            {/* Messages Area */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                {messages.map((msg, idx) => (
                                    <ChatBubble key={idx} message={msg} />
                                ))}

                                {isProcessing && (
                                    <div className="flex justify-start animate-pulse">
                                        <div className="glass-panel px-6 py-4 rounded-2xl rounded-bl-none flex items-center gap-3">
                                            <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
                                            <span className="text-sm text-slate-400">O Mentor está escrevendo...</span>
                                        </div>
                                    </div>
                                )}
                                <div ref={chatEndRef} />
                            </div>

                            {/* Input Area (Só aparece para opções interativas ou para "Continuar") */}
                            <div className="p-4 border-t border-white/5 bg-black/20 backdrop-blur-md">
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        submitMessage(inputValue);
                                    }}
                                    className="relative flex gap-2"
                                >
                                    {activeOption !== '8' && activeOption !== '9' ? (
                                        // Botões de ação rápida para modos de leitura
                                        <button
                                            type="button"
                                            onClick={() => submitMessage('Continuar')}
                                            className="w-full btn-premium py-4 rounded-xl flex items-center justify-center gap-2"
                                            disabled={isProcessing}
                                        >
                                            <ArrowRight className="w-5 h-5" />
                                            Continuar Leitura
                                        </button>
                                    ) : (
                                        // Input de texto para Chat/Quiz
                                        <>
                                            <input
                                                type="text"
                                                value={inputValue}
                                                onChange={(e) => setInputValue(e.target.value)}
                                                placeholder={activeOption === '8' ? "Faça uma pergunta sobre a passagem..." : "Digite sua resposta..."}
                                                disabled={isProcessing}
                                                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all"
                                            />
                                            <button
                                                type="submit"
                                                disabled={!inputValue.trim() || isProcessing}
                                                className="btn-premium px-6 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <Send className="w-5 h-5" />
                                            </button>
                                        </>
                                    )}
                                </form>
                            </div>

                        </div>
                    </div>
                )}
            </div>
        </CosmicBackground>
    );
}
