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
        const cur = new Date(date_from);
        const endDate = new Date(date_to);
        while (cur <= endDate) {
            const yyyy = cur.getFullYear();
            const mm = String(cur.getMonth() + 1).padStart(2, '0');
            const dd = String(cur.getDate()).padStart(2, '0');
            allCutoffDays.push(`${yyyy}-${mm}-${dd}`);
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

                let absentCount = 0;
                let awlCount = 0;
                let otPay = 0;
                let ndPay = 0;
                let holidayPay = 0;

                const RD_DAYS = [0];
                const holidays = await query("SELECT * FROM holidays WHERE date >= ? AND date <= ?", [date_from, date_to]);
                const holidayDates = new Set(holidays.map(h => h.date));

                const processedDates = new Set();

                for (const r of records) {
                    // Count absences (unique per date)
                    if (!processedDates.has(r.date)) {
                        if (r.status === 'absent' || r.status === 'awol') {
                            absentCount++;
                            processedDates.add(r.date);
                        } else if (r.status === 'awl') {
                            awlCount++;
                            processedDates.add(r.date);
                        }
                    }

                    if (!r.timestamp || r.type === 'in') continue;

                    const date = r.date;
                    const isRestDay = new Date(date + 'T00:00:00').getDay() === 0;
                    const isHoliday = holidayDates.has(date);
                    const holidayRate = isHoliday ? 2.0 : 1.0;

                    const outTime = new Date(r.timestamp);
                    const shiftEnd = new Date(r.timestamp);
                    shiftEnd.setHours(17, 0, 0, 0);

                    // OT Pay
                    if (outTime > shiftEnd) {
                        const otHours = Math.ceil(((outTime - shiftEnd) / (1000 * 60 * 60)) - 1);
                        if (otHours > 0) {
                            let otMultiplier = 1.25;
                            if (isRestDay) otMultiplier = 1.30;
                            if (isHoliday) otMultiplier = holidayRate;
                            otPay += otHours * hourlyRate * otMultiplier;
                        }
                    }

                    // Night Diff
                    const ndStart = new Date(r.timestamp);
                    ndStart.setHours(22, 0, 0, 0);
                    if (outTime > ndStart) {
                        const ndEnd = new Date(r.timestamp);
                        ndEnd.setDate(ndEnd.getDate() + 1);
                        ndEnd.setHours(6, 0, 0, 0);
                        const ndEndTime = outTime < ndEnd ? outTime : ndEnd;
                        const ndHours = Math.min((ndEndTime - ndStart) / (1000 * 60 * 60), 8);
                        if (ndHours > 0) ndPay += ndHours * hourlyRate * 0.10;
                    }

                    // Holiday Pay
                    if (isHoliday && holidayRate > 1) {
                        holidayPay += dailyRate * (holidayRate - 1);
                    }
                }

                // CORRECT FORMULA: (monthly pay / 2) - (daily rate × absent days)
                const totalAbsences = absentCount + awlCount;
                const regularPay = Math.max(0, (monthlySalary / 2) - (dailyRate * totalAbsences));

                const grossPay = regularPay + otPay + ndPay + holidayPay;
                const netPay = grossPay;

                await query(
                    `INSERT INTO payslips (user_id, full_name, period_from, period_to, regular_pay, overtime_pay, holiday_pay, night_diff_pay, gross_pay, total_deductions, net_pay)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE
                    regular_pay = VALUES(regular_pay), overtime_pay = VALUES(overtime_pay),
                    holiday_pay = VALUES(holiday_pay), night_diff_pay = VALUES(night_diff_pay),
                    gross_pay = VALUES(gross_pay), total_deductions = VALUES(total_deductions),
                    net_pay = VALUES(net_pay)`,
                    [emp.id, emp.full_name, date_from, date_to, regularPay, otPay, holidayPay, ndPay, grossPay, 0, netPay]
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