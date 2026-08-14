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
}: GerarPalavraComReservaOpts): Promise<RespostaLLM> {
    const principal = await gerarTexto(prompt, {
        temperature,
        maxTokens,
        models: useTunnel ? modelosTunel : modelosReserva,
        baseUrl: useTunnel ? tunnelUrl : undefined,
        apiKey: useTunnel ? tunnelApiKey : undefined,
    });

    if (principal.ok || !useTunnel) return principal;

    console.warn(
        `⚠️ [PALAVRA DA MANHÃ] Túnel principal falhou (${principal.error || 'erro sem detalhe'}) — tentando OpenRouter de reserva com o mesmo prompt.`,
    );

    return gerarTexto(prompt, {
        temperature,
        maxTokens,
        models: modelosReserva,
        baseUrl: undefined,
        apiKey: undefined,
    });
}
