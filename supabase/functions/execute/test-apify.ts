
import { load } from "https://deno.land/std@0.224.0/dotenv/mod.ts";

// Simular variáveis de ambiente localmente (se necessário, mas vamos tentar ler do .env ou pedir token)
// Como não tenho acesso direto ao .env do sistema aqui facilmente sem ler arquivos, vou tentar usar o Deno.env se disponível ou hardcodar temporariamente para teste (mas evitarei hardcodar para não commitar).
// Vou assumir que o usuário pode rodar isso com `deno run --allow-net --allow-env test-apify.ts` se tiver o .env configurado ou passar a variável.

const APIFY_TOKEN = Deno.env.get("APIFY_API_TOKEN");
const username = "evangelhoparatodos__";

console.log(`Testando Apify para usuário: ${username}`);
console.log(`Token presente: ${!!APIFY_TOKEN}`);

if (!APIFY_TOKEN) {
    console.error("ERRO: APIFY_API_TOKEN não definido.");
    Deno.exit(1);
}

const ACTOR_ID = "apify/instagram-scraper";
const url = `https://api.apify.com/v2/acts/${ACTOR_ID}/run-sync-get-dataset-items?token=${APIFY_TOKEN}`;

const input = {
    "usernames": [username],
    "resultsLimit": 3,
    "resultsType": "posts"
};

try {
    console.log("Enviando requisição para Apify...");
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(input)
    });

    if (!response.ok) {
        const errText = await response.text();
        console.error(`ERRO API (${response.status}):`, errText);
        Deno.exit(1);
    }

    const data = await response.json();
    console.log("Sucesso! Dados recebidos:");
    console.log(JSON.stringify(data, null, 2));

    if (!data || data.length === 0) {
        console.log("Aviso: Nenhum dado retornado (array vazio).");
    }

} catch (e) {
    console.error("Exceção:", e);
}
