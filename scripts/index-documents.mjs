// =====================================================
// Script de Indexação de Documentos para RAG
// Divide documentos grandes em chunks e gera embeddings
// =====================================================

import { createClient } from '@supabase/supabase-js';

// Configuração
const SUPABASE_URL = 'https://tayopwdelkmelgmrtnoa.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'sb_secret_wuhtFrma935c00_pq8h1xQ_dkNTQPeX';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Configurações de chunking
const CHUNK_SIZE = 500; // palavras por chunk
const CHUNK_OVERLAP = 50; // palavras de sobreposição entre chunks

/**
 * Divide texto em chunks com sobreposição
 */
function splitIntoChunks(text, chunkSize = CHUNK_SIZE, overlap = CHUNK_OVERLAP) {
    const words = text.split(/\s+/);
    const chunks = [];

    let start = 0;
    while (start < words.length) {
        const end = Math.min(start + chunkSize, words.length);
        const chunk = words.slice(start, end).join(' ');
        chunks.push(chunk);
        start = end - overlap;
        if (start >= words.length - overlap) break;
    }

    return chunks;
}

/**
 * Gera embedding usando Gemini API
 */
async function generateEmbedding(text) {
    if (!GEMINI_API_KEY) {
        console.error('❌ GEMINI_API_KEY não configurada!');
        console.log('   Configure com: set GEMINI_API_KEY=sua-key');
        return null;
    }

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'models/text-embedding-004',
                    content: { parts: [{ text }] }
                })
            }
        );

        if (!response.ok) {
            const error = await response.text();
            console.error('❌ Erro na API Gemini:', error);
            return null;
        }

        const data = await response.json();
        return data.embedding?.values || null;
    } catch (error) {
        console.error('❌ Erro ao gerar embedding:', error);
        return null;
    }
}

/**
 * Baixa documento do Supabase Storage
 */
async function downloadDocument(bucket, path) {
    console.log(`📥 Baixando ${bucket}/${path}...`);

    const { data, error } = await supabase.storage
        .from(bucket)
        .download(path);

    if (error) {
        console.error('❌ Erro ao baixar:', error);
        return null;
    }

    return await data.text();
}

/**
 * Indexa um documento no banco de dados
 */
async function indexDocument(documentName, content) {
    console.log(`\n📄 Indexando: ${documentName}`);
    console.log(`   Tamanho: ${content.length} caracteres`);

    // Divide em chunks
    const chunks = splitIntoChunks(content);
    console.log(`   Chunks: ${chunks.length}`);

    // Remove chunks antigos deste documento
    const { error: deleteError } = await supabase
        .from('document_chunks')
        .delete()
        .eq('document_name', documentName);

    if (deleteError) {
        console.error('⚠️ Erro ao limpar chunks antigos:', deleteError);
    }

    // Processa cada chunk
    let successCount = 0;
    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        console.log(`   [${i + 1}/${chunks.length}] Gerando embedding...`);

        const embedding = await generateEmbedding(chunk);

        if (!embedding) {
            console.error(`   ❌ Falha no chunk ${i + 1}`);
            continue;
        }

        // Insere no banco
        const { error: insertError } = await supabase
            .from('document_chunks')
            .upsert({
                document_name: documentName,
                chunk_index: i,
                content: chunk,
                embedding: embedding,
                metadata: {
                    total_chunks: chunks.length,
                    word_count: chunk.split(/\s+/).length
                }
            }, { onConflict: 'document_name,chunk_index' });

        if (insertError) {
            console.error(`   ❌ Erro ao inserir chunk ${i + 1}:`, insertError);
        } else {
            successCount++;
        }

        // Rate limiting (evita sobrecarregar a API)
        await new Promise(r => setTimeout(r, 200));
    }

    console.log(`✅ ${documentName}: ${successCount}/${chunks.length} chunks indexados`);
    return successCount;
}

/**
 * Lista documentos disponíveis no Storage
 */
async function listStorageDocuments() {
    console.log('\n📂 Documentos disponíveis no Storage:');

    const { data, error } = await supabase.storage
        .from('pvc')
        .list('', { limit: 100 });

    if (error) {
        console.error('❌ Erro:', error);
        return [];
    }

    const docs = data.filter(f => f.name.endsWith('.txt') || f.name.endsWith('.TXT'));
    docs.forEach((f, i) => console.log(`   ${i + 1}. ${f.name}`));

    return docs;
}

/**
 * Função principal
 */
async function main() {
    console.log('🚀 RAG Document Indexer - Devocional PVC');
    console.log('=========================================\n');

    // Verifica se GEMINI_API_KEY está configurada
    if (!GEMINI_API_KEY) {
        console.log('⚠️ GEMINI_API_KEY não encontrada!');
        console.log('');
        console.log('Configure a variável de ambiente:');
        console.log('  Windows: set GEMINI_API_KEY=sua-key-aqui');
        console.log('  PowerShell: $env:GEMINI_API_KEY="sua-key-aqui"');
        console.log('');
        console.log('Obtenha sua key em: https://aistudio.google.com/app/apikey');
        return;
    }

    // Lista documentos para indexar
    const documentsToIndex = [
        { bucket: 'pvc', path: 'modos/BASE_DE_CONHECIMENTO_UNIFICADA_v2.txt', name: 'base_conhecimento' },
        { bucket: 'pvc', path: 'modos/Conhecimento_Compilado_Essencial.v1.4.txt', name: 'conhecimento_essencial' },
        { bucket: 'pvc', path: 'modos/BANCO_DE_OURO_EXEMPLOS E BANCO_MICRO_SHOTS.txt', name: 'banco_ouro_exemplos' },
    ];

    console.log('📚 Documentos a indexar:');
    documentsToIndex.forEach((d, i) => console.log(`   ${i + 1}. ${d.name} (${d.path})`));

    let totalChunks = 0;

    for (const doc of documentsToIndex) {
        try {
            const content = await downloadDocument(doc.bucket, doc.path);
            if (content) {
                const count = await indexDocument(doc.name, content);
                totalChunks += count;
            }
        } catch (err) {
            console.error(`❌ Erro em ${doc.name}:`, err);
        }
    }

    console.log('\n=========================================');
    console.log(`✅ Indexação completa! Total: ${totalChunks} chunks`);
    console.log('=========================================');
}

// Executa
main().catch(console.error);
