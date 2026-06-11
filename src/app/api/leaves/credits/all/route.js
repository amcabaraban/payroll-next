import { query } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/response';

export async function GET() {
    try {
        const credits = await query(`
            SELECT u.id, u.full_name, u.department, u.role,
                lc.vl_used, lc.vl_total, 
                lc.sl_used, lc.sl_total,
                lc.el_used, lc.el_total,
                lc.bl_used, lc.bl_total,
                (lc.vl_total - lc.vl_used) as vl_remaining,
                (lc.sl_total - lc.sl_used) as sl_remaining,
                (lc.el_total - lc.el_used) as el_remaining,
                (lc.bl_total - lc.bl_used) as bl_remaining
            FROM users u
            LEFT JOIN leave_credits lc ON u.id = lc.user_id
            WHERE u.role != 'admin'
            ORDER BY u.full_name
        `);
        return successResponse(credits);
    } catch (error) {
        return errorResponse('Failed to fetch credits');
    }
}