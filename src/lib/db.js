import fs from 'fs';
import mysql from 'mysql2/promise';

// Build TLS options for remote databases (e.g. Aiven for MySQL, which
// requires SSL). Honor DB_SSL=true; if DB_SSL_CA_FILE points to a PEM/CA
// bundle it is used for verification, otherwise TLS is negotiated without
// certificate verification (explicitly opt-in via DB_SSL=true).
function buildSslOptions() {
    const enabled = ['1', 'true', 'yes'].includes(String(process.env.DB_SSL || '').toLowerCase());
    if (!enabled) return undefined;

    if (process.env.DB_SSL_CA_FILE) {
        try {
            const ca = fs.readFileSync(process.env.DB_SSL_CA_FILE, 'utf8');
            return { ca };
        } catch (error) {
            console.error(`⚠️ Could not read DB_SSL_CA_FILE (${process.env.DB_SSL_CA_FILE}):`, error.message);
        }
    }

    return { rejectUnauthorized: false };
}

// Use DATABASE_URL if available, otherwise use individual env vars
const pool = mysql.createPool(
    process.env.DATABASE_URL 
        ? { 
            uri: process.env.DATABASE_URL,
            waitForConnections: true,
            connectionLimit: 10,
            ssl: buildSslOptions(),
        }
        : {
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'payroll_next',
            port: parseInt(process.env.DB_PORT) || 3306,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
            enableKeepAlive: true,
            keepAliveInitialDelay: 0,
            ssl: buildSslOptions(),
        }
);

// Test connection
pool.getConnection()
    .then(connection => {
        console.log('✅ Database connected successfully');
        connection.release();
    })
    .catch(err => {
        console.error('❌ Database connection failed:', err.message);
    });

export async function query(sql, params = []) {
    try {
        const [rows] = await pool.execute(sql, params);
        return rows;
    } catch (error) {
        console.error('Query error:', error);
        throw error;
    }
}

export async function getRow(sql, params = []) {
    const rows = await query(sql, params);
    return rows[0] || null;
}

export default pool;