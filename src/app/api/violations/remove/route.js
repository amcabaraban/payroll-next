import { query } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/response';

export async function POST(request) {
    try {
        const data = await request.json();
        const { user_id, date } = data;

        await query(
            'DELETE FROM violations WHERE user_id = ? AND date = ?',
            [user_id, date]
        );

        return successResponse(null, 'Violation removed');
    } catch (error) {
        return errorResponse('Failed to remove violation');
    }
}