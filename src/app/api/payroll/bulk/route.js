import { query, getRow } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/response';

export async function POST(request) {
    try {
        const { date_from, date_to } = await request.json();

        if (!date_from || !date_to) {
            return errorResponse('Date range is required');
        }

        // Get all employees
        const employees = await query(
            `SELECT u.id, u.full_name, u.salary, u.salary_type, u.apply_tax,
                    d.name as department_name, p.name as position_name
             FROM users u
             LEFT JOIN departments d ON u.department = d.id
             LEFT JOIN designations p ON u.position = p.id
             WHERE u.role = 'employee'`
        );

        const results = [];
        let totalProcessed = 0;
        let totalSkipped = 0;

        for (const emp of employees) {
            try {
                // Calculate salary using existing calculate API logic
                const holidays = await query('SELECT * FROM holidays');
                const records = await query(
                    'SELECT * FROM attendance WHERE user_id = ? AND date >= ? AND date <= ? ORDER BY date, timestamp',
                    [emp.id, date_from, date_to]
                );

                // Group by date
                const daily = {};
                for (const r of records) {
                    const d = r.date;
                    if (!daily[d]) daily[d] = { date: d, in: null, out: null, status: 'present', hasTime: false };
                    if (r.type === 'in' && r.timestamp) { daily[d].in = r.timestamp; daily[d].hasTime = true; }
                    if (r.type === 'out' && r.timestamp) { daily[d].out = r.timestamp; daily[d].hasTime = true; }
                    if (r.status && r.status !== 'present' && !daily[d].hasTime) daily[d].status = r.status;
                }

                // Generate days
                const allCutoffDays = [];
                const cur = new Date(date_from);
                const end = new Date(date_to);
                while (cur <= end) {
                    allCutoffDays.push(cur.toISOString().split('T')[0]);
                    cur.setDate(cur.getDate() + 1);
                }

                const RD_DAYS = [0];
                const dailyRate = (Number(emp.salary) * 12) / 365;
                let totalRegularPay = 0;
                let totalOvertimePay = 0;
                let totalHolidayPay = 0;
                let totalNightDiffPay = 0;
                let totalDeductions = 0;
                let presentDays = 0;
                let absentDays = 0;

                for (const date of allCutoffDays) {
                    const dayData = daily[date] || { date, in: null, out: null, status: 'present' };
                    const isRD = RD_DAYS.includes(new Date(date).getDay());
                    const isHoliday = holidays.some(h => h.date === date);

                    if (dayData.status === 'absent') {
                        absentDays++;
                        continue;
                    }

                    if (isRD && dayData.status !== 'absent') {
                        totalRegularPay += dailyRate;
                        presentDays++;
                        continue;
                    }

                    if (!dayData.in && !dayData.out && !isRD) {
                        absentDays++;
                        continue;
                    }

                    presentDays++;
                    totalRegularPay += dailyRate;

                    if (dayData.in && dayData.out) {
                        const inTime = new Date(dayData.in);
                        const outTime = new Date(dayData.out);
                        if (outTime < inTime) outTime.setDate(outTime.getDate() + 1);

                        const shiftEnd = new Date(inTime);
                        shiftEnd.setHours(17, 0, 0, 0);
                        if (outTime > shiftEnd) {
                            const after = (outTime - shiftEnd) / (1000 * 60 * 60);
                            if (after > 1) {
                                const otHours = Math.ceil(after - 1);
                                totalOvertimePay += otHours * (dailyRate / 8) * 1.25;
                            }
                        }

                        const ndStart = new Date(inTime);
                        ndStart.setHours(22, 0, 0, 0);
                        if (outTime > ndStart) {
                            const ndHours = Math.min((outTime - ndStart) / (1000 * 60 * 60), 8);
                            totalNightDiffPay += ndHours * (dailyRate / 8) * 0.10;
                        }
                    }

                    if (isHoliday) {
                        const holiday = holidays.find(h => h.date === date);
                        const rate = holiday ? Number(holiday.rate) : 1;
                        totalHolidayPay += dailyRate * (rate - 1);
                    }
                }

                const totalGross = totalRegularPay + totalOvertimePay + totalHolidayPay + totalNightDiffPay;
                const totalNet = totalGross - totalDeductions;

                // Save payslip
                await query(
                    `INSERT INTO payslips (user_id, full_name, period_from, period_to, regular_pay, overtime_pay, holiday_pay, night_diff_pay, gross_pay, total_deductions, net_pay, total_days, absent_days)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                     ON DUPLICATE KEY UPDATE
                     regular_pay = VALUES(regular_pay), overtime_pay = VALUES(overtime_pay),
                     holiday_pay = VALUES(holiday_pay), night_diff_pay = VALUES(night_diff_pay),
                     gross_pay = VALUES(gross_pay), total_deductions = VALUES(total_deductions),
                     net_pay = VALUES(net_pay), total_days = VALUES(total_days), absent_days = VALUES(absent_days)`,
                    [emp.id, emp.full_name, date_from, date_to, totalRegularPay, totalOvertimePay, totalHolidayPay, totalNightDiffPay, totalGross, totalDeductions, totalNet, presentDays, absentDays]
                );

                results.push({
                    id: emp.id,
                    name: emp.full_name,
                    gross: Math.round(totalGross * 100) / 100,
                    net: Math.round(totalNet * 100) / 100,
                    status: 'success',
                });
                totalProcessed++;

            } catch (err) {
                results.push({
                    id: emp.id,
                    name: emp.full_name,
                    status: 'failed',
                    error: err.message,
                });
                totalSkipped++;
            }
        }

        return successResponse({
            processed: totalProcessed,
            skipped: totalSkipped,
            total: employees.length,
            period: { from: date_from, to: date_to },
            results,
        }, `Processed ${totalProcessed} employees`);
    } catch (error) {
        return errorResponse('Bulk processing failed: ' + error.message);
    }
}