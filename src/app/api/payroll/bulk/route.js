import { query } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/response';

export async function POST(request) {
    try {
        const { date_from, date_to } = await request.json();
        if (!date_from || !date_to) return errorResponse('Date range is required');

        const employees = await query("SELECT id, full_name FROM users WHERE role IN ('employee', 'hr')");
        
        const results = [];
        let processed = 0, skipped = 0;

        for (const emp of employees) {
            try {
                // Use the existing calculate API internally
                const baseUrl = process.env.VERCEL_URL 
                    ? `https://${process.env.VERCEL_URL}` 
                    : 'http://localhost:3000';
                
                const res = await fetch(`${baseUrl}/api/attendance/calculate?user_id=${emp.id}&date_from=${date_from}&date_to=${date_to}`);
                const data = await res.json();

                if (data.success) {
                    const sum = data.data.summary;
                    
                    await query(
                        `INSERT INTO payslips (user_id, full_name, period_from, period_to, regular_pay, overtime_pay, holiday_pay, night_diff_pay, gross_pay, total_deductions, net_pay)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                         ON DUPLICATE KEY UPDATE
                         regular_pay = VALUES(regular_pay), overtime_pay = VALUES(overtime_pay),
                         holiday_pay = VALUES(holiday_pay), night_diff_pay = VALUES(night_diff_pay),
                         gross_pay = VALUES(gross_pay), total_deductions = VALUES(total_deductions),
                         net_pay = VALUES(net_pay)`,
                        [emp.id, emp.full_name, date_from, date_to, sum.totalRegularPay, sum.totalOvertimePay, sum.totalHolidayPay || 0, sum.totalNightDiffPay || 0, sum.totalGrossPay, sum.totalDeductions, sum.totalNetPay]
                    );
                    
                    results.push({
                        name: emp.full_name,
                        gross: sum.totalGrossPay,
                        net: sum.totalNetPay,
                        status: 'success',
                    });
                    processed++;
                } else {
                    results.push({ name: emp.full_name, status: 'failed', error: data.message || 'No data' });
                    skipped++;
                }
            } catch (err) {
                results.push({ name: emp.full_name, status: 'failed', error: err.message });
                skipped++;
            }
        }

        return successResponse({
            processed,
            skipped,
            total: employees.length,
            period: { from: date_from, to: date_to },
            results,
        }, `Processed ${processed} of ${employees.length}`);
    } catch (error) {
        return errorResponse('Bulk error: ' + error.message);
    }
}