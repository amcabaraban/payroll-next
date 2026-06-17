import { query, getRow } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/response';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('user_id');
        const year = searchParams.get('year') || new Date().getFullYear();

        if (!userId) return errorResponse('User ID is required');

        const emp = await getRow('SELECT id, full_name, salary, salary_type FROM users WHERE id = ?', [userId]);
        if (!emp) return errorResponse('Employee not found');

        const monthlySalary = Number(emp.salary);
        
        // Get payslips for the year
        const payslips = await query(
            'SELECT SUM(regular_pay) as total_regular, SUM(gross_pay) as total_gross FROM payslips WHERE user_id = ? AND YEAR(period_from) = ?',
            [userId, year]
        );

        // Get total basic pay from payslips
        const totalBasicFromPayslips = payslips[0]?.total_regular || 0;
        
        // Count how many months have payslips
        const monthsWithPayslips = await query(
            'SELECT COUNT(DISTINCT MONTH(period_from)) as months FROM payslips WHERE user_id = ? AND YEAR(period_from) = ?',
            [userId, year]
        );
        
        const monthsCount = monthsWithPayslips[0]?.months || 0;
        
        // If less than 12 months, calculate remaining based on monthly salary
        const remainingMonths = 12 - monthsCount;
        const estimatedTotal = totalBasicFromPayslips + (monthlySalary * remainingMonths / 2); // /2 because each payslip is half-month
        
        const totalBasic = monthsCount > 0 ? Math.max(estimatedTotal, monthlySalary * 12) : monthlySalary * 12;
        const thirteenthMonth = totalBasic / 12;

        return successResponse({
            employee: emp,
            year: parseInt(year),
            totalBasicPay: Math.round(totalBasic * 100) / 100,
            thirteenthMonthPay: Math.round(thirteenthMonth * 100) / 100,
        });
    } catch (error) {
        return errorResponse('Failed to compute 13th month: ' + error.message);
    }
}

// POST - Save 13th month record
export async function POST(request) {
    try {
        const data = await request.json();
        const { user_id, full_name, department, year, total_basic_pay, thirteenth_month_pay, notes } = data;

        // Check if already exists for this user + year
        const existing = await query(
            'SELECT id FROM thirteenth_month WHERE user_id = ? AND year = ?',
            [user_id, year]
        );

        if (existing.length > 0) {
            // Update
            await query(
                `UPDATE thirteenth_month SET 
                    total_basic_pay = ?, thirteenth_month_pay = ?, 
                    release_date = CURDATE(), notes = ?
                WHERE id = ?`,
                [total_basic_pay, thirteenth_month_pay, notes || null, existing[0].id]
            );
            return successResponse({ id: existing[0].id }, '13th month record updated!');
        } else {
            // Insert
            const result = await query(
                `INSERT INTO thirteenth_month 
                (user_id, full_name, department, year, total_basic_pay, thirteenth_month_pay, release_date, notes) 
                VALUES (?, ?, ?, ?, ?, ?, CURDATE(), ?)`,
                [user_id, full_name, department || null, year, total_basic_pay, thirteenth_month_pay, notes || null]
            );
            return successResponse({ id: result.insertId }, '13th month record saved!');
        }
    } catch (error) {
        return errorResponse('Failed to save: ' + error.message);
    }
}