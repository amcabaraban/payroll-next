import { query } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/response';

export async function POST(request) {
    try {
        const { date_from, date_to } = await request.json();
        if (!date_from || !date_to) return errorResponse('Date range is required');

        const employees = await query("SELECT id, full_name, salary, salary_type FROM users WHERE role IN ('employee', 'hr')");
        
        const results = [];
        let processed = 0, skipped = 0;

        // Generate all days in cutoff
        const allCutoffDays = [];
        const cur = new Date(date_from + 'T00:00:00');
        const end = new Date(date_to + 'T00:00:00');
        while (cur <= end) {
            allCutoffDays.push(cur.toISOString().split('T')[0]);
            cur.setDate(cur.getDate() + 1);
        }
        const totalDays = allCutoffDays.length;

        for (const emp of employees) {
            try {
                const records = await query(
                    'SELECT * FROM attendance WHERE user_id = ? AND date >= ? AND date <= ?',
                    [emp.id, date_from, date_to]
                );

                const monthlySalary = Number(emp.salary);
                const dailyRate = (monthlySalary * 12) / 365;
                const hourlyRate = dailyRate / 8;

                // Track unique dates with records
                const recordDates = new Set();
                let otPay = 0;
                let absentDays = 0;

                for (const r of records) {
                    recordDates.add(r.date);
                    if (r.status === 'absent' || r.status === 'awol' || r.status === 'awl') {
                        absentDays++;
                    }
                    if (r.type === 'out' && r.timestamp) {
                        const outTime = new Date(r.timestamp);
                        const shiftEnd = new Date(r.timestamp);
                        shiftEnd.setHours(17, 0, 0, 0);
                        if (outTime > shiftEnd) {
                            const otHours = Math.ceil(((outTime - shiftEnd) / (1000 * 60 * 60)) - 1);
                            if (otHours > 0) otPay += otHours * hourlyRate * 1.25;
                        }
                    }
                }

                // For monthly: full half-month pay if no absences, otherwise daily rate × present days
                const presentDays = recordDates.size - absentDays;
                let regularPay;
                if (emp.salary_type === 'monthly' && absentDays === 0) {
                    regularPay = monthlySalary / 2;
                } else {
                    regularPay = dailyRate * presentDays;
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