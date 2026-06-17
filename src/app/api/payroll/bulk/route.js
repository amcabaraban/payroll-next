import { query } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/response';

export async function POST(request) {
    try {
        const { date_from, date_to } = await request.json();
        if (!date_from || !date_to) return errorResponse('Date range is required');

        const employees = await query("SELECT id, full_name, salary, salary_type FROM users WHERE role IN ('employee', 'hr')");

        const results = [];
        let processed = 0, skipped = 0;

        for (const emp of employees) {
            try {
                const records = await query(
                    'SELECT * FROM attendance WHERE user_id = ? AND date >= ? AND date <= ?',
                    [emp.id, date_from, date_to]
                );

                const dailyRate = emp.salary_type === 'monthly' 
                    ? (Number(emp.salary) * 12) / 365 
                    : Number(emp.salary);

                let regularPay = 0, otPay = 0;
                let presentDays = 0, absentDays = 0;
                const processedDates = new Set();

                for (const r of records) {
                    if (!processedDates.has(r.date)) {
                        processedDates.add(r.date);
                        if (r.status === 'absent' || r.status === 'awol' || r.status === 'awl') {
                            absentDays++;
                        } else {
                            presentDays++;
                            regularPay += dailyRate;
                        }
                    }
                    if (r.type === 'out' && r.timestamp) {
                        const outTime = new Date(r.timestamp);
                        const shiftEnd = new Date(r.timestamp);
                        shiftEnd.setHours(17, 0, 0, 0);
                        if (outTime > shiftEnd) {
                            const otHours = Math.ceil(((outTime - shiftEnd) / (1000 * 60 * 60)) - 1);
                            if (otHours > 0) otPay += otHours * (dailyRate / 8) * 1.25;
                        }
                    }
                }

                const grossPay = regularPay + otPay;
                const netPay = grossPay;

                await query(
                    `INSERT INTO payslips (user_id, full_name, period_from, period_to, regular_pay, overtime_pay, gross_pay, total_deductions, net_pay)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                     ON DUPLICATE KEY UPDATE
                     regular_pay = VALUES(regular_pay), overtime_pay = VALUES(overtime_pay),
                     gross_pay = VALUES(gross_pay), total_deductions = VALUES(total_deductions),
                     net_pay = VALUES(net_pay)`,
                    [emp.id, emp.full_name, date_from, date_to, regularPay, otPay, grossPay, 0, netPay]
                );

                results.push({
                    name: emp.full_name,
                    gross: Math.round(grossPay * 100) / 100,
                    net: Math.round(netPay * 100) / 100,
                    status: 'success',
                });
                processed++;
            } catch (err) {
                results.push({ name: emp.full_name, status: 'failed', error: err.message });
                skipped++;
            }
        }

        return successResponse({
            processed, skipped, total: employees.length,
            period: { from: date_from, to: date_to }, results,
        }, `Processed ${processed} of ${employees.length}`);
    } catch (error) {
        return errorResponse('Bulk error: ' + error.message);
    }
}