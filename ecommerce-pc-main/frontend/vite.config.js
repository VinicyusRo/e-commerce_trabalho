import { defineConfig } from 'vite';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const pasta = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    server: {
        proxy: {
            // Tudo que começar com /api é encaminhado ao Express
            '/api': 'http://localhost:3000',
        },
    },

    // O site tem várias páginas HTML. Por padrão o "vite build" só gera o
    // index.html, então listamos todas para irem para a versão online.
    build: {
        rolldownOptions: {
            input: {
                index:        resolve(pasta, 'index.html'),
                produto:      resolve(pasta, 'produto.html'),
                visualizador: resolve(pasta, 'visualizador.html'),
                carrinho:     resolve(pasta, 'carrinho.html'),
                checkout:     resolve(pasta, 'checkout.html'),
                login:        resolve(pasta, 'login.html'),
                conta:        resolve(pasta, 'conta.html'),
                montagem:     resolve(pasta, 'monte-seu-pc.html'),
            },
        },
    },
});
