import 'dotenv/config';   
import pg from 'pg';

// Pool: conjunto de conexões reaproveitadas, em vez de abrir uma por consulta
export const pool = new pg.Pool({
    host:     process.env.DB_HOST,
    port:     process.env.DB_PORT,
    database: process.env.DB_NAME,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});