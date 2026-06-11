import { query, getRow } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/response';

// GET - List violations
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('user_id');
        const year = searchParams.get('year') || new Date().getFullYear();

        let sql = `
            SELECT v.*, 
                (SELECT COUNT(*) FROM violations v2 WHERE v2.user_id = v.user_id AND v2.violation_type = 'absent_no_leave' AND v2.action_taken = 'none') as pending_count,
                (SELECT COUNT(*) FROM violations v2 WHERE v2.user_id = v.user_id AND v2.violation_type = 'absent_no_leave') as total_count
            FROM violations v
            WHERE YEAR(v.date) = ?
        `;
        const params = [year];

        if (userId) {
            sql += ' AND v.user_id = ?';
            params.push(userId);
        }

        sql += ' ORDER BY v.date DESC';
        const violations = await query(sql, params);
        return successResponse(violations);
    } catch (error) {
        return errorResponse('Failed to fetch violations');
    }
}

// POST - Record violation
export async function POST(request) {
    try {
        const data = await request.json();
        const { user_id, full_name, violation_type, date } = data;

        // Check if violation already exists for this date
        const existing = await query(
            'SELECT id FROM violations WHERE user_id = ? AND date = ? AND violation_type = ?',
            [user_id, date, violation_type]
        );

        if (existing.length > 0) {
            return errorResponse('Violation already recorded for this date');
        }

        // Count existing violations
        const countResult = await query(
            "SELECT COUNT(*) as count FROM violations WHERE user_id = ? AND violation_type = 'absent_no_leave'",
            [user_id]
        );
        const count = countResult[0].count;

        // Determine action based on count
        let action = 'none';
        if (count >= 2) action = 'termination';
        else if (count >= 1) action = 'suspension';
        else action = 'warning';

        const result = await query(
            'INSERT INTO violations (user_id, full_name, violation_type, date, action_taken, notes) VALUES (?, ?, ?, ?, ?, ?)',
            [user_id, full_name, violation_type, date, action, 
                action === 'warning' ? '1st Offense - Warning' :
                action === 'suspension' ? '2nd Offense - Suspension' :
                action === 'termination' ? '3rd Offense - Termination' : null]
        );

        return successResponse({ id: result.insertId, action }, `Violation recorded. Action: ${action}`);
    } catch (error) {
        return errorResponse('Failed to record violation');
    }
}
// DELETE - Remove violation
export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('user_id');
        const date = searchParams.get('date');

        await query(
            'DELETE FROM violations WHERE user_id = ? AND date = ?',
            [userId, date]
        );

        return successResponse(null, 'Violation removed');
    } catch (error) {
        return errorResponse('Failed to remove violation');
    }
}