import { query } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/response';

export async function POST(request) {
    try {
        const data = await request.json();
        const { user_id, period_from, period_to } = data;

        // Check if payslip already exists for this period
        const existing = await query(
            'SELECT id FROM payslips WHERE user_id = ? AND period_from = ? AND period_to = ?',
            [user_id, period_from, period_to]
        );

        if (existing.length > 0) {
            // UPDATE existing
            await query(
                `UPDATE payslips SET 
                    full_name = ?, department = ?, position = ?,
                    basic_salary = ?, regular_hours = ?, regular_pay = ?,
                    overtime_hours = ?, overtime_pay = ?, night_diff_pay = ?,
                    gross_pay = ?, sss = ?, philhealth = ?, pagibig = ?,
                    tax = ?, late_deduction = ?, total_deductions = ?,
                    net_pay = ?, generated_date = NOW()
                WHERE id = ?`,
                [
                    data.full_name, data.department, data.position,
                    data.basic_salary, data.regular_hours, data.regular_pay,
                    data.overtime_hours, data.overtime_pay, data.night_diff_pay,
                    data.gross_pay, data.sss, data.philhealth, data.pagibig,
                    data.tax, data.late_deduction, data.total_deductions,
                    data.net_pay, existing[0].id
                ]
            );
            return successResponse({ id: existing[0].id }, 'Payslip updated!');
        } else {
            // INSERT new
            const result = await query(
                `INSERT INTO payslips (
                    user_id, full_name, department, position,
                    period_from, period_to, basic_salary,
                    regular_hours, regular_pay,
                    overtime_hours, overtime_pay,
                    night_diff_pay, gross_pay,
                    sss, philhealth, pagibig, tax,
                    late_deduction, total_deductions, net_pay
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    data.user_id, data.full_name, data.department, data.position,
                    data.period_from, data.period_to, data.basic_salary,
                    data.regular_hours, data.regular_pay,
                    data.overtime_hours, data.overtime_pay,
                    data.night_diff_pay, data.gross_pay,
                    data.sss, data.philhealth, data.pagibig, data.tax,
                    data.late_deduction, data.total_deductions, data.net_pay
                ]
            );
            return successResponse({ id: result.insertId }, 'Payslip saved!');
        }
    } catch (error) {
        return errorResponse('Failed to save payslip: ' + error.message);
    }
}