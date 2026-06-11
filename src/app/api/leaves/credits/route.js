import { query, getRow } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/response';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('user_id');

        if (!userId) return errorResponse('User ID is required');

        let credits = await getRow(
            'SELECT * FROM leave_credits WHERE user_id = ?',
            [userId]
        );

        if (!credits) {
            await query('INSERT INTO leave_credits (user_id) VALUES (?)', [userId]);
            credits = {
                vl_used: 0, vl_total: 10,
                sl_used: 0, sl_total: 5,
                el_used: 0, el_total: 5,
                bl_used: 0, bl_total: 1,
            };
        }

        return successResponse(credits);
    } catch (error) {
        return errorResponse('Failed to fetch credits');
    }
}