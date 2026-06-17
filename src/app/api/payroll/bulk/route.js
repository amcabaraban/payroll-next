import { query, getRow } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/response';

const SHIFT_START = 8;
const SHIFT_END = 17;
const BREAK_HOURS = 1;
const WORKING_HOURS = 8;
const OT_GRACE_HOURS = 1;
const RD_DAYS = [0];

function isRestDay(dateStr) {
    return RD_DAYS.includes(new Date(dateStr + 'T00:00:00').getDay());
}

function isHoliday(dateStr, holidays) {
    return holidays.some(h => h.date === dateStr);
}

function getHolidayRate(dateStr, holidays) {
    const holiday = holidays.find(h => h.date === dateStr);
    return holiday ? Number(holiday.rate) : 1.0;
}

function calculateDay(clocks, dailyRate, holidays) {
    if (clocks.status === 'absent' || clocks.status === 'awol' || clocks.status === 'awl') {
        return { regularPay: 0, overtimePay: 0, holidayPay: 0, nightDiffPay: 0, deductions: 0, grossPay: 0, netPay: 0, hours: 0, otHours: 0, ndHours: 0 };
    }
    if (['VL', 'SL', 'EL', 'BL'].includes(clocks.status)) {
        return { regularPay: dailyRate, overtimePay: 0, holidayPay: 0, nightDiffPay: 0, deductions: 0, grossPay: dailyRate, netPay: dailyRate, hours: WORKING_HOURS, otHours: 0, ndHours: 0 };
    }
    if (clocks.status === 'RD Paid') {
        return { regularPay: dailyRate, overtimePay: 0, holidayPay: 0, nightDiffPay: 0, deductions: 0, grossPay: dailyRate, netPay: dailyRate, hours: 0, otHours: 0, ndHours: 0 };
    }

    const inTime = new Date(clocks.in);
    const outTime = new Date(clocks.out);
    if (outTime < inTime) outTime.setDate(outTime.getDate() + 1);

    const hoursWorked = (outTime - inTime) / (1000 * 60 * 60) - BREAK_HOURS;
    const hourlyRate = dailyRate / WORKING_HOURS;
    const formattedDate = clocks.date;

    const holidayRate = getHolidayRate(formattedDate, holidays);

    let lateHours = 0;
    if (holidayRate <= 1) {
        const shiftStart = new Date(inTime);
        shiftStart.setHours(SHIFT_START, 0, 0, 0);
        lateHours = inTime > shiftStart ? (inTime - shiftStart) / (1000 * 60 * 60) : 0;
    }

    const shiftEnd = new Date(inTime);
    shiftEnd.setHours(SHIFT_END, 0, 0, 0);
    let otHours = 0;
    if (outTime > shiftEnd) {
        const after = (outTime - shiftEnd) / (1000 * 60 * 60);
        if (after > OT_GRACE_HOURS) otHours = Math.ceil(after - OT_GRACE_HOURS);
    }

    let utHours = 0;
    if (holidayRate <= 1 && outTime < shiftEnd && hoursWorked < WORKING_HOURS) {
        utHours = WORKING_HOURS - hoursWorked;
        if (utHours < 0) utHours = 0;
    }

    let ndHours = 0;
    const ndStart = new Date(inTime);
    ndStart.setHours(22, 0, 0, 0);
    if (outTime > ndStart) {
        const ndEnd = new Date(inTime);
        ndEnd.setDate(ndEnd.getDate() + 1);
        ndEnd.setHours(6, 0, 0, 0);
        const ndEndTime = outTime < ndEnd ? outTime : ndEnd;
        if (ndEndTime > ndStart) ndHours = (ndEndTime - ndStart) / (1000 * 60 * 60);
    }
    if (ndHours > 8) ndHours = 8;

    let otMultiplier = 1.25;
    if (isRestDay(formattedDate)) otMultiplier = 1.30;
    if (holidayRate > 1) otMultiplier = holidayRate;

    const regularPay = dailyRate;
    const overtimePay = otHours * hourlyRate * otMultiplier;
    const nightDiffPay = ndHours * hourlyRate * 0.10;
    const lateDeduction = lateHours * hourlyRate;
    const utDeduction = utHours * hourlyRate;

    let holidayPay = 0;
    if (holidayRate > 1) holidayPay = dailyRate * (holidayRate - 1);

    const grossPay = regularPay + overtimePay + holidayPay + nightDiffPay;
    const deductions = lateDeduction + utDeduction;
    const netPay = grossPay - deductions;

    return {
        regularPay: Math.round(regularPay * 100) / 100,
        overtimePay: Math.round(overtimePay * 100) / 100,
        holidayPay: Math.round(holidayPay * 100) / 100,
        nightDiffPay: Math.round(nightDiffPay * 100) / 100,
        deductions: Math.round(deductions * 100) / 100,
        grossPay: Math.round(grossPay * 100) / 100,
        netPay: Math.round(netPay * 100) / 100,
        hours: Math.round(hoursWorked * 100) / 100,
        otHours,
        ndHours: Math.round(ndHours * 100) / 100,
    };
}

export async function POST(request) {
    try {
        const { date_from, date_to } = await request.json();
        if (!date_from || !date_to) return errorResponse('Date range is required');

        const employees = await query("SELECT id, full_name, salary, salary_type FROM users WHERE role IN ('employee', 'hr')");
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
                    if (!daily[r.date]) daily[r.date] = { date: r.date, in: null, out: null, status: 'present' };
                    if (r.type === 'in' && r.timestamp) daily[r.date].in = r.timestamp;
                    if (r.type === 'out' && r.timestamp) daily[r.date].out = r.timestamp;
                    if (r.status && r.status !== 'present') daily[r.date].status = r.status;
                }

                const allCutoffDays = [];
                const cur = new Date(date_from + 'T00:00:00');
                const end = new Date(date_to + 'T00:00:00');
                while (cur <= end) {
                    allCutoffDays.push(cur.toISOString().split('T')[0]);
                    cur.setDate(cur.getDate() + 1);
                }

                const dailyRate = emp.salary_type === 'monthly' ? (Number(emp.salary) * 12) / 365 : Number(emp.salary);
                
                let totalRegularPay = 0, totalOvertimePay = 0, totalHolidayPay = 0;
                let totalNightDiffPay = 0, totalDeductions = 0, presentDays = 0;

                for (const date of allCutoffDays) {
                    const d = daily[date] || { date, in: null, out: null, status: 'present' };
                    const isRD = isRestDay(date);
                    const isHol = isHoliday(date, holidays);

                    if (d.status === 'absent' || d.status === 'awol' || d.status === 'awl' || (!d.in && !d.out && !isRD)) continue;

                    if (isRD && d.status !== 'absent') {
                        totalRegularPay += dailyRate;
                        presentDays++;
                        continue;
                    }

                    if (!d.in && !d.out) continue;

                    presentDays++;
                    const clockIn = d.in || `${date} 08:00:00`;
                    const clockOut = d.out || `${date} 17:00:00`;
                    const result = calculateDay({ ...d, in: clockIn, out: clockOut, date, status: d.status }, dailyRate, holidays);

                    totalRegularPay += result.regularPay;
                    totalOvertimePay += result.overtimePay;
                    totalHolidayPay += result.holidayPay;
                    totalNightDiffPay += result.nightDiffPay;
                    totalDeductions += result.deductions;
                }

                const totalGross = totalRegularPay + totalOvertimePay + totalHolidayPay + totalNightDiffPay;
                const totalNet = totalGross - totalDeductions;

                await query(
                    `INSERT INTO payslips (user_id, full_name, period_from, period_to, regular_pay, overtime_pay, holiday_pay, night_diff_pay, gross_pay, total_deductions, net_pay)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                     ON DUPLICATE KEY UPDATE
                     regular_pay = VALUES(regular_pay), overtime_pay = VALUES(overtime_pay),
                     holiday_pay = VALUES(holiday_pay), night_diff_pay = VALUES(night_diff_pay),
                     gross_pay = VALUES(gross_pay), total_deductions = VALUES(total_deductions),
                     net_pay = VALUES(net_pay)`,
                    [emp.id, emp.full_name, date_from, date_to, totalRegularPay, totalOvertimePay, totalHolidayPay, totalNightDiffPay, totalGross, totalDeductions, totalNet]
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

        return successResponse({ processed, skipped, total: employees.length, period: { from: date_from, to: date_to }, results }, `Processed ${processed} of ${employees.length}`);
    } catch (error) {
        return errorResponse('Bulk error: ' + error.message);
    }
}