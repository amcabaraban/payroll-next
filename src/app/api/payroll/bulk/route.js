import { query, getRow } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/response';

const SHIFT_START = 8;
const SHIFT_END = 17;
const BREAK_HOURS = 1;
const WORKING_HOURS = 8;
const OT_GRACE_HOURS = 1;
const RD_DAYS = [0];

function isRestDay(dateStr) {
    return RD_DAYS.includes(new Date(dateStr).getDay());
}

function isHoliday(dateStr, holidays) {
    return holidays.some(h => h.date === dateStr);
}

export async function POST(request) {
    try {
        const { date_from, date_to } = await request.json();

        if (!date_from || !date_to) {
            return errorResponse('Date range is required');
        }

        const employees = await query("SELECT id, full_name, salary, salary_type FROM users WHERE role = 'employee'");
        const holidays = await query('SELECT * FROM holidays');

        const results = [];
        let processed = 0;
        let skipped = 0;

        for (const emp of employees) {
            try {
                const records = await query(
                    'SELECT * FROM attendance WHERE user_id = ? AND date >= ? AND date <= ? ORDER BY date, timestamp',
                    [emp.id, date_from, date_to]
                );

                const daily = {};
                for (const r of records) {
                    if (!daily[r.date]) daily[r.date] = { in: null, out: null, status: 'present' };
                    if (r.type === 'in' && r.timestamp) daily[r.date].in = r.timestamp;
                    if (r.type === 'out' && r.timestamp) daily[r.date].out = r.timestamp;
                    if (r.status && r.status !== 'present') daily[r.date].status = r.status;
                }

                const allCutoffDays = [];
                const cur = new Date(date_from);
                const end = new Date(date_to);
                while (cur <= end) {
                    allCutoffDays.push(cur.toISOString().split('T')[0]);
                    cur.setDate(cur.getDate() + 1);
                }

                const dailyRate = emp.salary_type === 'monthly' ? (Number(emp.salary) * 12) / 365 : Number(emp.salary);
                const hourlyRate = dailyRate / WORKING_HOURS;
                
                let totalRegularPay = 0;
                let totalOvertimePay = 0;
                let totalNightDiffPay = 0;
                let totalDeductions = 0;
                let presentDays = 0;
                let absentDays = 0;

                for (const date of allCutoffDays) {
                    const d = daily[date] || { in: null, out: null, status: 'present' };
                    const isRD = isRestDay(date);
                    const isHol = isHoliday(date, holidays);

                    if (d.status === 'absent' || (!d.in && !d.out && !isRD)) {
                        absentDays++;
                        continue;
                    }

                    if (isRD) {
                        totalRegularPay += dailyRate;
                        presentDays++;
                        continue;
                    }

                    presentDays++;
                    totalRegularPay += dailyRate;

                    if (d.in && d.out) {
                        const inTime = new Date(d.in);
                        const outTime = new Date(d.out);
                        if (outTime < inTime) outTime.setDate(outTime.getDate() + 1);

                        const shiftEnd = new Date(inTime);
                        shiftEnd.setHours(SHIFT_END, 0, 0, 0);
                        if (outTime > shiftEnd) {
                            const after = (outTime - shiftEnd) / (1000 * 60 * 60);
                            if (after > OT_GRACE_HOURS) {
                                totalOvertimePay += Math.ceil(after - OT_GRACE_HOURS) * hourlyRate * 1.25;
                            }
                        }

                        const ndStart = new Date(inTime);
                        ndStart.setHours(22, 0, 0, 0);
                        if (outTime > ndStart) {
                            const ndHours = Math.min((outTime - ndStart) / (1000 * 60 * 60), 8);
                            totalNightDiffPay += ndHours * hourlyRate * 0.10;
                        }
                    }
                }

                const totalGross = totalRegularPay + totalOvertimePay + totalNightDiffPay;
                const totalNet = totalGross - totalDeductions;

                await query(
                    `INSERT INTO payslips (user_id, full_name, period_from, period_to, regular_pay, overtime_pay, holiday_pay, night_diff_pay, gross_pay, total_deductions, net_pay, total_days, absent_days)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                     ON DUPLICATE KEY UPDATE
                     regular_pay = VALUES(regular_pay), overtime_pay = VALUES(overtime_pay),
                     gross_pay = VALUES(gross_pay), total_deductions = VALUES(total_deductions),
                     net_pay = VALUES(net_pay), total_days = VALUES(total_days)`,
                    [emp.id, emp.full_name, date_from, date_to, totalRegularPay, totalOvertimePay, 0, totalNightDiffPay, totalGross, totalDeductions, totalNet, presentDays, absentDays]
                );

                results.push({
                    name: emp.full_name,
                    gross: Math.round(totalGross * 100) / 100,
                    net: Math.round(totalNet * 100) / 100,
                    status: 'success',
                });
                processed++;
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