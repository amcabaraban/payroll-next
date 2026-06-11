import { query } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/response';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('user_id');

        if (!userId) return errorResponse('User ID is required');

        const payslips = await query(
            'SELECT * FROM payslips WHERE user_id = ? ORDER BY generated_date DESC LIMIT 12',
            [userId]
        );

        return successResponse(payslips);
    } catch (error) {
        return errorResponse('Failed to fetch payslips: ' + error.message);
    }
}