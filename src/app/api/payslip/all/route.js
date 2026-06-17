import { query } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/response';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const dateFrom = searchParams.get('date_from');
        const dateTo = searchParams.get('date_to');

        let sql = 'SELECT * FROM payslips WHERE 1=1';
        const params = [];

        if (dateFrom) { sql += ' AND period_from >= ?'; params.push(dateFrom); }
        if (dateTo) { sql += ' AND period_to <= ?'; params.push(dateTo); }

        sql += ' ORDER BY full_name ASC';

        const payslips = await query(sql, params);
        return successResponse(payslips);
    } catch (error) {
        return errorResponse('Failed: ' + error.message);
    }
}