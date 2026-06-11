import { query, getRow } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/response';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('user_id');
        const year = searchParams.get('year') || new Date().getFullYear();

        if (!userId) return errorResponse('User ID is required');

        // Employee info
        const emp = await getRow(
            `SELECT u.*, d.name as department_name, des.name as position_name 
            FROM users u 
            LEFT JOIN departments d ON u.department = d.id 
            LEFT JOIN designations des ON u.position = des.id 
            WHERE u.id = ?`, 
            [userId]
        );
        
        if (!emp) return errorResponse('Employee not found');

        // Leave credits
        const credits = await getRow(
            'SELECT * FROM leave_credits WHERE user_id = ?', [userId]
        );

        // Payslip history - total per cutoff
        const payslips = await query(
            'SELECT * FROM payslips WHERE user_id = ? AND YEAR(period_from) = ? ORDER BY period_from DESC',
            [userId, year]
        );

        // Total salary received
        const salaryTotal = await query(
            'SELECT SUM(gross_pay) as total_gross, SUM(total_deductions) as total_deductions, SUM(net_pay) as total_net FROM payslips WHERE user_id = ? AND YEAR(period_from) = ?',
            [userId, year]
        );

        // Attendance summary per cutoff
        const attendanceSummary = await query(`
            SELECT 
                CASE 
                    WHEN DAY(date) <= 15 THEN CONCAT(YEAR(date), '-', LPAD(MONTH(date),2,'0'), '-1st')
                    ELSE CONCAT(YEAR(date), '-', LPAD(MONTH(date),2,'0'), '-2nd')
                END as cutoff,
                COUNT(*) as total_days,
                SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_days,
                SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent_days,
                SUM(CASE WHEN status = 'awol' THEN 1 ELSE 0 END) as awol_days,
                SUM(CASE WHEN status = 'awl' THEN 1 ELSE 0 END) as awl_days,
                SUM(CASE WHEN status IN ('VL','SL','EL','BL') THEN 1 ELSE 0 END) as leave_days,
                SUM(CASE WHEN status = 'holiday' THEN 1 ELSE 0 END) as holiday_days
            FROM attendance 
            WHERE user_id = ? AND YEAR(date) = ?
            GROUP BY cutoff
            ORDER BY cutoff DESC
        `, [userId, year]);

        // Violations
        const violations = await query(
            "SELECT COUNT(*) as total, SUM(CASE WHEN action_taken = 'warning' THEN 1 ELSE 0 END) as warnings, SUM(CASE WHEN action_taken = 'suspension' THEN 1 ELSE 0 END) as suspensions, SUM(CASE WHEN action_taken = 'termination' THEN 1 ELSE 0 END) as terminations FROM violations WHERE user_id = ?",
            [userId]
        );

        // 13th month records
        const thirteenthMonth = await query(
            'SELECT * FROM thirteenth_month WHERE user_id = ? ORDER BY year DESC', [userId]
        );

        // Leave history
        const leaves = await query(
            'SELECT * FROM leaves WHERE user_id = ? ORDER BY created_at DESC LIMIT 20', [userId]
        );

        return successResponse({
            employee: emp,
            credits,
            payslips,
            salaryTotal: salaryTotal[0],
            attendanceSummary,
            violations: violations[0],
            thirteenthMonth,
            leaves,
        });
    } catch (error) {
        return errorResponse('Failed to fetch summary: ' + error.message);
    }
}