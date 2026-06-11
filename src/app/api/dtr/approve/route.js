import { query } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/response';

export async function POST(request) {
    try {
        const { user_id, date_from, date_to } = await request.json();
        
        await query(
            "UPDATE attendance SET dtr_status = 'approved' WHERE user_id = ? AND date >= ? AND date <= ?",
            [user_id, date_from, date_to]
        );
        
        return successResponse(null, 'DTR Approved!');
    } catch (error) {
        return errorResponse('Failed to approve DTR');
    }
}