import mysql from 'mysql2/promise';

// Use DATABASE_URL if available, otherwise use individual env vars
const pool = mysql.createPool(
    process.env.DATABASE_URL 
        ? { 
            uri: process.env.DATABASE_URL,
            waitForConnections: true,
            connectionLimit: 10,
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