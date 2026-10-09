// =====================================================
// Baixa as fotos dos produtos (migrações 02 e 03) para dentro do projeto.
//
// Como usar (na pasta ecommerce-pc-main, com Node 18 ou mais novo):
//     node database/baixar-imagens.mjs
//
// O que ele faz:
//  1. lê os endereços de foto que estão nos arquivos database/migracao-*.sql
//  2. baixa cada foto para frontend/public/imagens/produtos/
//  3. cria database/fotos-locais.sql, que troca no banco o endereço
//     da Pichau pelo caminho local (rode no Supabase depois)
// Pode rodar de novo: fotos já baixadas são puladas.
// =====================================================
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const pastaBanco = join(raiz, 'database');
const pastaFotos = join(raiz, 'frontend', 'public', 'imagens', 'produtos');

const urls = new Set();
for (const arquivo of (await readdir(pastaBanco)).filter((a) => /^migracao-.*\.sql$/.test(a)).sort()) {
    const sql = await readFile(join(pastaBanco, arquivo), 'utf8');
    for (const url of sql.match(/https:\/\/media\.pichau\.com\.br\/[^']+/g) ?? []) urls.add(url);
}
await mkdir(pastaFotos, { recursive: true });

const updates = [];
let falhas = 0;

for (const url of urls) {
    const arquivo = url.split('/').pop();
    const destino = join(pastaFotos, arquivo);
    try {
        if (!existsSync(destino)) {
            const resposta = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
            if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
            await writeFile(destino, Buffer.from(await resposta.arrayBuffer()));
            await new Promise((r) => setTimeout(r, 300));   // sem pressa: não sobrecarrega o site
        }
        updates.push(`UPDATE produto SET imagem = 'imagens/produtos/${arquivo}' WHERE imagem = '${url}';`);
        console.log('ok   ', arquivo);
    } catch (erro) {
        falhas++;
        console.log('FALHA', arquivo, '-', erro.message, '(continua usando o endereço da Pichau)');
    }
}

await writeFile(join(pastaBanco, 'fotos-locais.sql'),
    '-- Gerado por baixar-imagens.mjs: usa as fotos guardadas no projeto\n' +
    '-- (frontend/public/imagens/produtos) no lugar do endereço da Pichau.\n\n' +
    updates.join('\n') + '\n');

console.log(`\n${updates.length} fotos prontas, ${falhas} falhas.`);
console.log('Agora: rode database/fotos-locais.sql no Supabase e envie a pasta');
console.log('frontend/public/imagens/produtos para o GitHub.');
