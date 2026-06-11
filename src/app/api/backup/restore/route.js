import { query } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/response';

export async function POST(request) {
    try {
        const data = await request.json();
        const { tables } = data;
        
        if (!tables) return errorResponse('Invalid backup file');
        
        // Disable foreign key checks
        await query('SET FOREIGN_KEY_CHECKS = 0');
        
        for (const [tableName, tableData] of Object.entries(tables)) {
            // Truncate table
            await query(`TRUNCATE TABLE \`${tableName}\``);
            
            // Insert data
            if (tableData.data && tableData.data.length > 0) {
                const columns = Object.keys(tableData.data[0]);
                const placeholders = columns.map(() => '?').join(', ');
                const sql = `INSERT INTO \`${tableName}\` (\`${columns.join('`, `')}\`) VALUES (${placeholders})`;
                
                for (const row of tableData.data) {
                    const values = columns.map(col => row[col]);
                    await query(sql, values);
                }
            }
        }
        
        // Re-enable foreign key checks
        await query('SET FOREIGN_KEY_CHECKS = 1');
        
        return successResponse(null, 'Database restored successfully!');
    } catch (error) {
        await query('SET FOREIGN_KEY_CHECKS = 1');
        return errorResponse('Restore failed: ' + error.message);
    }
}