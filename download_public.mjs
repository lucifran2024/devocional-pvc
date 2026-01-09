
const PUBLIC_URL = "https://tayopwdelkmelgmrtnoa.supabase.co/storage/v1/object/public/pvc/secao6";
import fs from 'fs';

async function downloadPublic() {
    console.log(`🌍 Tentando baixar via URL pública: ${PUBLIC_URL}`);

    try {
        const res = await fetch(PUBLIC_URL);
        if (!res.ok) {
            console.error(`❌ Erro HTTP: ${res.status} ${res.statusText}`);
            const text = await res.text();
            console.log("Corpo do erro:", text);
            return;
        }

        const text = await res.text();
        console.log("✅ Download bem sucedido! Tamanho:", text.length);
        console.log("Início:", text.substring(0, 200));

        // Salvar
        fs.writeFileSync('SECAO6_LOCAL.json', text);
        console.log("💾 Salvo em SECAO6_LOCAL.json");

    } catch (err) {
        console.error("💥 Exceção:", err);
    }
}

downloadPublic();
