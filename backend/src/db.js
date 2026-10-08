import 'dotenv/config';
import pg from 'pg';

// Pool: conjunto de conexões reaproveitadas, em vez de abrir uma por consulta.
//
// Dois jeitos de configurar (no arquivo .env ou nas variáveis do Render):
//  1. Online (Supabase): DATABASE_URL=postgresql://usuario:senha@host:5432/postgres
//  2. Local (pgAdmin):   DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
function configuracao() {
    if (process.env.DATABASE_URL) {
        // Remove o "?sslmode=..." se vier na URL: o SSL é configurado logo abaixo
        const url = new URL(process.env.DATABASE_URL);
        url.searchParams.delete('sslmode');

        return {
            connectionString: url.toString(),
            // Banco na nuvem exige conexão criptografada (SSL)
            ssl: { rejectUnauthorized: false },
        };
    }

    return {
        host:     process.env.DB_HOST,
        port:     process.env.DB_PORT,
        database: process.env.DB_NAME,
        user:     process.env.DB_USER,
        password: process.env.DB_PASSWORD,
    };
}

export const pool = new pg.Pool(configuracao());
