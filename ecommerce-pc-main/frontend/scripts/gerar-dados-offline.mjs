// Atualiza a cópia do catálogo usada quando o servidor está dormindo
// (veja o "MODO OFFLINE" em src/api/api.js).
//
// Rode quando mudar produtos no banco, com o endereço do backend:
//   npm run gerar-offline -- https://meu-backend.onrender.com
// (o servidor precisa estar acordado; abra o site antes se precisar)
import { writeFile, mkdir } from 'node:fs/promises';

const base = (process.argv[2] ?? 'http://localhost:3000').replace(/\/$/, '');
const pasta = new URL('../public/dados-offline/', import.meta.url);
await mkdir(pasta, { recursive: true });

for (const nome of ['produtos', 'categorias']) {
    const resposta = await fetch(`${base}/api/${nome}`);
    if (!resposta.ok) throw new Error(`${nome}: erro ${resposta.status}`);
    const dados = await resposta.json();
    await writeFile(new URL(`${nome}.json`, pasta), JSON.stringify(dados, null, 1));
    console.log(`${nome}.json salvo com ${dados.length} itens`);
}
