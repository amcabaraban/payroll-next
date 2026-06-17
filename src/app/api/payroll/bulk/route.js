import { query } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/response';

export async function POST(request) {
    try {
        const { date_from, date_to } = await request.json();

        if (!date_from || !date_to) {
            return errorResponse('Date range is required');
        }

        const employees = await query(
            `SELECT id, full_name FROM users WHERE role = 'employee'`
        );

        const results = [];
        let processed = 0;
        let skipped = 0;

        for (const emp of employees) {
            try {
                // Call the existing calculate API
                const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/attendance/calculate?user_id=${emp.id}&date_from=${date_from}&date_to=${date_to}`);
                const data = await res.json();

                if (data.success) {
                    const sum = data.data.summary;
                    
                    // Save to payslips table
                    await query(
                        `INSERT INTO payslips (user_id, full_name, period_from, period_to, regular_pay, overtime_pay, holiday_pay, gross_pay, total_deductions, net_pay, total_days, absent_days)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                         ON DUPLICATE KEY UPDATE
                         regular_pay = VALUES(regular_pay), overtime_pay = VALUES(overtime_pay),
                         holiday_pay = VALUES(holiday_pay), gross_pay = VALUES(gross_pay),
                         total_deductions = VALUES(total_deductions), net_pay = VALUES(net_pay),
                         total_days = VALUES(total_days), absent_days = VALUES(absent_days)`,
                        [
                            emp.id, emp.full_name, date_from, date_to,
                            sum.totalRegularPay, sum.totalOvertimePay, sum.totalHolidayPay,
                            sum.totalGrossPay, sum.totalDeductions, sum.totalNetPay,
                            sum.totalDays, sum.absentDays
                        ]
                    );

                    results.push({
                        name: emp.full_name,
                        gross: sum.totalGrossPay,
                        net: sum.totalNetPay,
                        status: 'success',
                    });
                    processed++;
                } else {
                    results.push({
                        name: emp.full_name,
                        status: 'failed',
                        error: data.message || 'No data',
                    });
                    skipped++;
                }
            } catch (err) {
                results.push({
                    name: emp.full_name,
                    status: 'failed',
                    error: err.message,
                });
                skipped++;
            }
        }

        return successResponse({
            processed,
            skipped,
            total: employees.length,
            period: { from: date_from, to: date_to },
            results,
        }, `Processed ${processed} of ${employees.length} employees`);
    } catch (error) {
        return errorResponse('Bulk processing failed: ' + error.message);
    }
}