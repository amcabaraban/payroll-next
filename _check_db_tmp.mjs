import fs from 'fs';
import mysql from 'mysql2/promise';

const envFile = process.argv[2];
const content = fs.readFileSync(envFile, 'utf8');
const env = {};
for (const line of content.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const cfg = {
    host: env.DB_HOST || 'localhost',
    user: env.DB_USER || 'root',
    password: env.DB_PASSWORD || '',
    database: env.DB_NAME || 'payroll_next',
    port: parseInt(env.DB_PORT) || 3306,
    connectTimeout: 15000,
};
if (['1', 'true', 'yes'].includes(String(env.DB_SSL || '').toLowerCase())) {
    cfg.ssl = { rejectUnauthorized: false };
}

try {
    const conn = await mysql.createConnection(cfg);
    console.log('CONNECT: OK  host=' + cfg.host + ' user=' + cfg.user);
    const [tables] = await conn.query("SHOW TABLES");
    console.log('TABLES: ' + tables.map(t => Object.values(t)[0]).join(', '));
    const [cols] = await conn.query('SHOW COLUMNS FROM users');
    console.log('USERS COLUMNS:');
    for (const c of cols) console.log('  -', c.Field, c.Type, c.Null === 'YES' ? 'NULL' : 'NOT NULL');
    await conn.end();
} catch (e) {
    console.error('CONNECT FAIL:', (e.code || e.errno || ''), e.message);
}