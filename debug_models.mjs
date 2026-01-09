
const API_KEY = "AIzaSyAt5EwoxTxxU-dZqnJbLApNNsWVgJnnDE8";

async function listModels() {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;
    console.log(`Listando modelos em: ${url.replace(API_KEY, "HIDDEN")}`);

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            console.error("Erro ao listar modelos:", data.error);
        } else {
            console.log("Modelos Disponíveis:");
            if (data.models) {
                data.models.forEach(m => {
                    if (m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent")) {
                        console.log(`- ${m.name} (${m.displayName})`);
                    }
                });
            } else {
                console.log("Nenhum modelo retornado.");
            }
        }
    } catch (error) {
        console.error("Erro de conexão:", error);
    }
}

listModels();
