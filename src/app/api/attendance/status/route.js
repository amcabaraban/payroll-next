import { query } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/response';

export async function POST(request) {
    try {
        const data = await request.json();
        const { user_id, date, status } = data;

        if (!user_id || !date || !status) {
            return errorResponse('User ID, date, and status are required');
        }

        // Update status on ALL records for this date
        const result = await query(
            'UPDATE attendance SET status = ?, timestamp = NULL WHERE user_id = ? AND date = ?',
            [status, user_id, date]
        );

        if (result.affectedRows === 0) {
            await query(
                'INSERT INTO attendance (user_id, full_name, type, timestamp, date, status) VALUES (?, ?, ?, NULL, ?, ?)',
                [user_id, 'System', 'in', date, status]
            );
        }

        return successResponse(null, 'Status saved');
    } catch (error) {
        return errorResponse('Failed to save status: ' + error.message);
    }
}