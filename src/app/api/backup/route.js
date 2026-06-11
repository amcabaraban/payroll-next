import { query } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/response';

// GET - Create backup
export async function GET() {
    try {
        const backup = { tables: {} };
        
        // Get all tables
        const tables = await query('SHOW TABLES');
        
        for (const row of tables) {
            const tableName = Object.values(row)[0];
            const data = await query(`SELECT * FROM \`${tableName}\``);
            const columns = await query(`SHOW CREATE TABLE \`${tableName}\``);
            
            backup.tables[tableName] = {
                createSQL: columns[0]['Create Table'],
                data: data
            };
        }
        
        const backupJSON = JSON.stringify(backup, null, 2);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `payroll_backup_${timestamp}.json`;
        
        return new Response(backupJSON, {
            headers: {
                'Content-Type': 'application/json',
                'Content-Disposition': `attachment; filename="${filename}"`
            }
        });
    } catch (error) {
        return errorResponse('Backup failed: ' + error.message);
    }
}