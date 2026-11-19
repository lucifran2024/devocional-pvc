type EsforcoRaciocinio = 'minimal' | 'low' | 'medium' | 'high';

/**
 * 19/11/2026: 70 s no túnel da Palavra da Manhã cobre oscilações sem ultrapassar
 * o teto de 150 s da Edge Function mesmo em retry (70+70=140 s) ou queda para a
 * reserva OpenRouter (70+40+40=150 s).
 */
export const TEMPO_TUNEL_PALAVRA_MANHA_MS = 70_000;

/**
 * 19/11/2026: o 9Router injeta providerThinking global (ex.: xhigh no Antigravity)
 * quando a requisição chega sem reasoning_effort, fazendo app-pvc rodar em THINK:high.
 * Enviar 'low' explicitamente no túnel honra o combo rápido sem alterar o 9Router.
 */
export const ESFORCO_TUNEL_PALAVRA_MANHA: EsforcoRaciocinio = 'low';

interface RespostaLLM {
    ok: boolean;
    text?: string;
    error?: string;
    [key: string]: unknown;
}

interface OpcoesGerarTexto {
    temperature?: number;
    maxTokens?: number;
    models?: string[];
    baseUrl?: string;
    apiKey?: string;
    timeoutMs?: number;
    reasoningEffort?: EsforcoRaciocinio;
}

type GerarTexto = (prompt: string, opts: OpcoesGerarTexto) => Promise<RespostaLLM>;

interface GerarPalavraComReservaOpts {
    prompt: string;
    temperature: number;
    maxTokens: number;
    useTunnel: boolean;
    tunnelUrl: string;
    tunnelApiKey: string;
    modelosTunel: string[];
    modelosReserva: string[];
    gerarTexto: GerarTexto;
    /** Nome da função no aviso de queda (padrão: Palavra da Manhã). */
    rotulo?: string;
    /** Tempo por modelo; sem ele vale o padrão do cliente (40 s). */
    timeoutMs?: number;
    /** Tempo específico para o túnel; sem ele usa timeoutMs (ou padrão 40 s). */
    tunnelTimeoutMs?: number;
    /** Esforço explícito aplicado somente ao túnel, nunca à reserva OpenRouter. */
    tunnelReasoningEffort?: EsforcoRaciocinio;
}

/**
 * Mantém o provedor/túnel preferido para a Palavra da Manhã e, se ele falhar,
 * repete o mesmo prompt no OpenRouter já configurado como reserva do app.
 * Nenhuma regra editorial, prompt ou pós-processamento é alterado aqui.
 */
export async function gerarPalavraComReserva({
    prompt,
    temperature,
    maxTokens,
    useTunnel,
    tunnelUrl,
    tunnelApiKey,
    modelosTunel,
    modelosReserva,
    gerarTexto,
    rotulo = 'PALAVRA DA MANHÃ',
    timeoutMs,
    tunnelTimeoutMs,
    tunnelReasoningEffort,
}: GerarPalavraComReservaOpts): Promise<RespostaLLM> {
    const tempoPrincipal = useTunnel ? (tunnelTimeoutMs ?? timeoutMs) : timeoutMs;
    const principal = await gerarTexto(prompt, {
        temperature,
        maxTokens,
        models: useTunnel ? modelosTunel : modelosReserva,
        baseUrl: useTunnel ? tunnelUrl : undefined,
        apiKey: useTunnel ? tunnelApiKey : undefined,
        ...(tempoPrincipal ? { timeoutMs: tempoPrincipal } : {}),
        ...(useTunnel && tunnelReasoningEffort ? { reasoningEffort: tunnelReasoningEffort } : {}),
    });

    if (principal.ok || !useTunnel) return principal;

    console.warn(
        `⚠️ [${rotulo}] Túnel principal falhou (${principal.error || 'erro sem detalhe'}) — tentando OpenRouter de reserva com o mesmo prompt.`,
    );

    return gerarTexto(prompt, {
        temperature,
        maxTokens,
        models: modelosReserva,
        baseUrl: undefined,
        apiKey: undefined,
        ...(timeoutMs ? { timeoutMs } : {}),
    });
}
