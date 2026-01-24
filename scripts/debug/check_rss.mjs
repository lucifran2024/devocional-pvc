// Node script - fetch is native in Node 18+
// Node script

const urls = [
    "https://www.ultimato.com.br/feed",
    "https://www.ultimato.com.br/feed/",
    "https://paodiario.org/feed/",
    "https://paodiario.org/rss",
    "https://voltemosaoevangelho.com/blog/feed/",
    "https://spurgeon.org/feed/"
];

async function checkRss() {
    console.log("🔍 Verificando RSS Feeds...");

    for (const url of urls) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);

            const res = await fetch(url, { signal: controller.signal });
            clearTimeout(timeout);

            if (res.ok) {
                const text = await res.text();
                if (text.includes('<rss') || text.includes('<feed') || text.includes('xml')) {
                    console.log(`✅ SUCESSO: ${url} (Tamanho: ${text.length})`);
                } else {
                    console.log(`❌ NÃO É RSS: ${url} (ContentType: ${res.headers.get('content-type')})`);
                }
            } else {
                console.log(`❌ FALHA (${res.status}): ${url}`);
            }
        } catch (e) {
            console.log(`❌ ERRO: ${url} - ${e.message}`);
        }
    }
}

checkRss();
