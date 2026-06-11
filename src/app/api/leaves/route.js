import { query, getRow } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/response';

// GET - List leaves
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('user_id');

        let sql = `
            SELECT l.*, u.full_name, u.department,
                lc.vl_used, lc.vl_total, lc.sl_used, lc.sl_total,
                lc.el_used, lc.el_total, lc.bl_used, lc.bl_total
            FROM leaves l
            JOIN users u ON l.user_id = u.id
            LEFT JOIN leave_credits lc ON l.user_id = lc.user_id
            WHERE 1=1
        `;
        const params = [];

        if (userId) {
            sql += ' AND l.user_id = ?';
            params.push(userId);
        }

        sql += ' ORDER BY l.created_at DESC';
        const leaves = await query(sql, params);
        return successResponse(leaves);
    } catch (error) {
        return errorResponse('Failed to fetch leaves: ' + error.message);
    }
}

// POST - Apply for leave
export async function POST(request) {
    try {
        const data = await request.json();
        const { user_id, full_name, leave_type, date_from, date_to, days, reason } = data;

        if (!user_id || !leave_type || !date_from || !date_to) {
            return errorResponse('Required fields are missing');
        }

        // Check remaining credits
        const credits = await getRow(
            'SELECT * FROM leave_credits WHERE user_id = ?',
            [user_id]
        );

        if (credits) {
            const usedField = `${leave_type.toLowerCase()}_used`;
            const totalField = `${leave_type.toLowerCase()}_total`;
            const used = credits[usedField] || 0;
            const total = credits[totalField] || 0;
            
            if (used + days > total) {
                return errorResponse(`Insufficient ${leave_type} credits. Used: ${used}/${total}`);
            }
        } else {
            // Create credits if not exists
            await query('INSERT INTO leave_credits (user_id) VALUES (?)', [user_id]);
        }

        // Insert leave
        const result = await query(
            'INSERT INTO leaves (user_id, full_name, leave_type, date_from, date_to, days, reason) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [user_id, full_name, leave_type, date_from, date_to, days, reason || null]
        );

        // Update used credits
        await query(
            `UPDATE leave_credits SET ${leave_type.toLowerCase()}_used = ${leave_type.toLowerCase()}_used + ? WHERE user_id = ?`,
            [days, user_id]
        );

        return successResponse({ id: result.insertId }, 'Leave applied successfully!');
    } catch (error) {
        return errorResponse('Failed to apply leave: ' + error.message);
    }
}
// PUT - Update, Cancel, Approve, Reject leave
export async function PUT(request) {
    try {
        const data = await request.json();
        const { id, status, action } = data;

        if (!id) return errorResponse('Leave ID is required');

        const leave = await getRow('SELECT * FROM leaves WHERE id = ?', [id]);
        if (!leave) return errorResponse('Leave not found');

        // Cancel
        if (action === 'cancel' || status === 'cancelled') {
            await query("UPDATE leaves SET status = 'cancelled' WHERE id = ?", [id]);
            
            // Only decrement if used > 0
            if (leave.days > 0) {
                await query(
                    `UPDATE leave_credits SET ${leave.leave_type.toLowerCase()}_used = GREATEST(${leave.leave_type.toLowerCase()}_used - ?, 0) WHERE user_id = ?`, 
                    [leave.days, leave.user_id]
                );
            }
            
            await query("UPDATE attendance SET status = 'present' WHERE user_id = ? AND date >= ? AND date <= ? AND status IN ('VL','SL','EL','BL','leave')", [leave.user_id, leave.date_from, leave.date_to]);
            return successResponse(null, 'Leave cancelled');
        }

        // Approve
        if (status === 'approved') {
            await query('UPDATE leaves SET status = ? WHERE id = ?', [status, id]);

            // Auto-insert sa attendance - gumamit ng local date
            const startDate = new Date(leave.date_from);
            const endDate = new Date(leave.date_to);
            const curDate = new Date(startDate);
            
            while (curDate <= endDate) {
                const ds = `${curDate.getFullYear()}-${String(curDate.getMonth()+1).padStart(2,'0')}-${String(curDate.getDate()).padStart(2,'0')}`;
                
                // Skip Sunday (RD)
                if (curDate.getDay() !== 0) {
                    const exist = await query(
                        'SELECT id FROM attendance WHERE user_id = ? AND date = ? AND type = ?', 
                        [leave.user_id, ds, 'in']
                    );
                    if (exist.length === 0) {
                        await query(
                            'INSERT INTO attendance (user_id, full_name, type, timestamp, date, status) VALUES (?,?,?,NULL,?,?)', 
                            [leave.user_id, leave.full_name, 'in', ds, leave.leave_type]
                        );
                    } else {
                        await query(
                            "UPDATE attendance SET status = ? WHERE user_id = ? AND date = ?", 
                            [leave.leave_type, leave.user_id, ds]
                        );
                    }
                }
                curDate.setDate(curDate.getDate() + 1);
            }
            return successResponse(null, 'Leave approved!');
        }

        // Reject
        if (status === 'rejected') {
            await query('UPDATE leaves SET status = ? WHERE id = ?', [status, id]);
            await query(`UPDATE leave_credits SET ${leave.leave_type.toLowerCase()}_used = ${leave.leave_type.toLowerCase()}_used - ? WHERE user_id = ?`, [leave.days, leave.user_id]);
            return successResponse(null, 'Leave rejected');
        }

        return errorResponse('Invalid action');
    } catch (error) {
        return errorResponse('Failed: ' + error.message);
    }
}