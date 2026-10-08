import { defineConfig } from 'vite';

export default defineConfig({
    server: {
        proxy: {
            // Tudo que começar com /api é encaminhado ao Express
            '/api': 'http://localhost:3000',
        },
    },
});