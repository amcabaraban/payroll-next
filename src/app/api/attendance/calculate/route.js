import { query, getRow } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/response';

const SHIFT_START = 8;
const SHIFT_END = 17;
const BREAK_HOURS = 1;
const WORKING_HOURS = 8;
const OT_GRACE_HOURS = 1;
const RD_DAYS = [0]; // Sunday

function isRestDay(dateStr) {
    return RD_DAYS.includes(new Date(dateStr).getDay());
}

function isHoliday(dateStr, holidays) {
    const d = new Date(dateStr);
    const formatted = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return holidays.some(h => {
        const hd = new Date(h.date);
        const hFormatted = `${hd.getFullYear()}-${String(hd.getMonth() + 1).padStart(2, '0')}-${String(hd.getDate()).padStart(2, '0')}`;
        return hFormatted === formatted;
    });
}

function getHolidayRate(dateStr, holidays) {
    const d = new Date(dateStr);
    const formatted = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const holiday = holidays.find(h => {
        const hd = new Date(h.date);
        const hFormatted = `${hd.getFullYear()}-${String(hd.getMonth() + 1).padStart(2, '0')}-${String(hd.getDate()).padStart(2, '0')}`;
        return hFormatted === formatted;
    });
    return holiday ? Number(holiday.rate) : 1.0;
}

function calculateDay(clocks, dailyRate, holidays) {
    // Absent
    if (clocks.status === 'absent') {
        return { 
            status: 'Absent', regularPay: 0, overtimePay: 0, nightDiffPay: 0, 
            lateDeduction: 0, undertimeDeduction: 0, grossPay: 0, deductions: 0, netPay: 0, 
            hours: 0, otHours: 0, ndHours: 0 
        };
    }

    // AWOL and AWL = no pay
    if (clocks.status === 'awol' || clocks.status === 'awl') {
        return { 
            status: clocks.status === 'awol' ? 'AWOL' : 'AWL',
            regularPay: 0, overtimePay: 0, nightDiffPay: 0, 
            lateDeduction: 0, undertimeDeduction: 0, grossPay: 0, deductions: 0, netPay: 0, 
            hours: 0, otHours: 0, ndHours: 0 
        };
    }

    // Leave types
    if (['VL', 'SL', 'EL', 'BL'].includes(clocks.status)) {
        return { 
            status: clocks.status, regularPay: dailyRate, overtimePay: 0, nightDiffPay: 0, 
            lateDeduction: 0, undertimeDeduction: 0, grossPay: dailyRate, deductions: 0, netPay: dailyRate, 
            hours: WORKING_HOURS, otHours: 0, ndHours: 0 
        };
    }

    // RD Paid
    if (clocks.status === 'RD Paid') {
        return { 
            status: 'RD Paid', regularPay: dailyRate, overtimePay: 0, nightDiffPay: 0, 
            lateDeduction: 0, undertimeDeduction: 0, grossPay: dailyRate, deductions: 0, netPay: dailyRate, 
            hours: 0, otHours: 0, ndHours: 0 
        };
    }
    
    // Parse time manually to avoid timezone issues
    const inParts = String(clocks.in).match(/(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})/);
    const outParts = String(clocks.out).match(/(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})/);
    
    const inTime = new Date(parseInt(inParts[1]), parseInt(inParts[2])-1, parseInt(inParts[3]), parseInt(inParts[4]), parseInt(inParts[5]));
    const outTime = new Date(parseInt(outParts[1]), parseInt(outParts[2])-1, parseInt(outParts[3]), parseInt(outParts[4]), parseInt(outParts[5]));

    // Auto-detect next day
    if (outTime < inTime) {
        outTime.setDate(outTime.getDate() + 1);
    }

    // Check if out date is Sunday/Holiday
    const outDateStr = outTime.toISOString().split('T')[0];
    const isOutRestDay = isRestDay(outDateStr);
    const isOutHoliday = isHoliday(outDateStr, holidays);

    const hoursWorked = (outTime - inTime) / (1000 * 60 * 60) - BREAK_HOURS;
    const hourlyRate = dailyRate / WORKING_HOURS;

    const dateForCheck = new Date(clocks.date);
    const formattedDate = `${dateForCheck.getFullYear()}-${String(dateForCheck.getMonth() + 1).padStart(2, '0')}-${String(dateForCheck.getDate()).padStart(2, '0')}`;

    // Holiday rate
    const holidayRate = getHolidayRate(formattedDate, holidays);

    // ✅ FIXED: Late (skip for holidays)
    let lateHours = 0;
    if (holidayRate <= 1) {
        const shiftStart = new Date(inTime); 
        shiftStart.setHours(SHIFT_START, 0, 0, 0);
        lateHours = inTime > shiftStart ? (inTime - shiftStart) / (1000 * 60 * 60) : 0;
    }

    // OT (after 6PM including grace)
    const shiftEnd = new Date(inTime); 
    shiftEnd.setHours(SHIFT_END, 0, 0, 0);
    let otHours = 0;
    if (outTime > shiftEnd) {
        const after = (outTime - shiftEnd) / (1000 * 60 * 60);
        if (after > OT_GRACE_HOURS) otHours = Math.ceil(after - OT_GRACE_HOURS);
    }

    // ✅ FIXED: Undertime (skip for holidays)
    let utHours = 0;
    if (holidayRate <= 1 && outTime < shiftEnd && hoursWorked < WORKING_HOURS) {
        utHours = WORKING_HOURS - hoursWorked;
        if (utHours < 0) utHours = 0;
    }

    // Night Diff (10PM-6AM)
    let ndHours = 0;
    const ndStart = new Date(inTime); 
    ndStart.setHours(22, 0, 0, 0);
    const ndEnd = new Date(inTime);
    ndEnd.setDate(ndEnd.getDate() + 1);
    ndEnd.setHours(6, 0, 0, 0);

    if (outTime > ndStart) {
        const ndEndTime = outTime < ndEnd ? outTime : ndEnd;
        if (ndEndTime > ndStart) {
            ndHours = (ndEndTime - ndStart) / (1000 * 60 * 60);
        }
    }
    if (ndHours > 8) ndHours = 8;

    // OT Multiplier
    let otMultiplier = 1.25;
    if (isRestDay(formattedDate) || isOutRestDay) otMultiplier = 1.30;
    if (holidayRate > 1) otMultiplier = holidayRate;
    if (isOutHoliday) {
        const outHolidayRate = getHolidayRate(outDateStr, holidays);
        if (outHolidayRate > 1) otMultiplier = Math.max(otMultiplier, outHolidayRate);
    }

    // Pay computation
    const regularPay = dailyRate;
    const overtimePay = otHours * hourlyRate * otMultiplier;
    const nightDiffPay = ndHours * hourlyRate * 0.10;
    const lateDeduction = lateHours * hourlyRate;
    const utDeduction = utHours * hourlyRate;

    // Holiday pay (additional)
    let holidayPay = 0;
    if (holidayRate > 1) {
        holidayPay = dailyRate * (holidayRate - 1);
    }
    if (isOutHoliday && !isHoliday(formattedDate, holidays)) {
        const outRate = getHolidayRate(outDateStr, holidays);
        if (outRate > 1) holidayPay += dailyRate * (outRate - 1);
    }

    const grossPay = regularPay + overtimePay + holidayPay + nightDiffPay;
    const deductions = lateDeduction + utDeduction;
    const netPay = grossPay - deductions;

    return {
        status: 'Present',
        regularPay: Math.round(regularPay * 100) / 100,
        overtimePay: Math.round(overtimePay * 100) / 100,
        holidayPay: Math.round(holidayPay * 100) / 100,
        nightDiffPay: Math.round(nightDiffPay * 100) / 100,
        lateDeduction: Math.round(lateDeduction * 100) / 100,
        undertimeDeduction: Math.round(utDeduction * 100) / 100,
        grossPay: Math.round(grossPay * 100) / 100,
        deductions: Math.round(deductions * 100) / 100,
        netPay: Math.round(netPay * 100) / 100,
        hours: Math.round(hoursWorked * 100) / 100,
        otHours, 
        ndHours: Math.round(ndHours * 100) / 100,
    };
}

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('user_id');
        const dateFrom = searchParams.get('date_from');
        const dateTo = searchParams.get('date_to');

        if (!userId) return errorResponse('User ID is required');

        const emp = await getRow(
            `SELECT u.id, u.full_name, u.salary, u.salary_type, u.apply_tax, 
                    u.department, u.position,
                    d.name as department_name, 
                    p.name as position_name 
            FROM users u 
            LEFT JOIN departments d ON u.department = d.id 
            LEFT JOIN designations p ON u.position = p.id 
            WHERE u.id = ?`, 
            [userId]
        );
        if (!emp) return errorResponse('Employee not found');

        // LOAN AUTO-DEDUCTION (1st cutoff only)
        const loanDeduction = { sss: 0, pagibig: 0, total: 0 };

        const firstDay = new Date(dateFrom).getDate();
        if (firstDay <= 15) {
            const activeLoans = await query(
                "SELECT * FROM loans WHERE user_id = ? AND status = 'active'",
                [userId]
            );
            
            for (const loan of activeLoans) {
                if (loan.loan_type === 'SSS') {
                    loanDeduction.sss += Number(loan.monthly_amortization);
                } else {
                    loanDeduction.pagibig += Number(loan.monthly_amortization);
                }
                loanDeduction.total += Number(loan.monthly_amortization);
            }
        }

        const holidays = await query('SELECT * FROM holidays');
        
        const records = await query(
            'SELECT * FROM attendance WHERE user_id = ? AND date >= ? AND date <= ? ORDER BY date, timestamp',
            [userId, dateFrom, dateTo]
        );

        // Group by date
        const daily = {};
        for (const r of records) {
            const rd = new Date(r.date);
            const d = `${rd.getFullYear()}-${String(rd.getMonth() + 1).padStart(2, '0')}-${String(rd.getDate()).padStart(2, '0')}`;
            if (!daily[d]) daily[d] = { date: d, in: null, out: null, status: 'present', hasTime: false };
            
            if (r.type === 'in' && r.timestamp) { daily[d].in = r.timestamp; daily[d].hasTime = true; }
            if (r.type === 'out' && r.timestamp) { daily[d].out = r.timestamp; daily[d].hasTime = true; }
            
            if (r.status && r.status !== 'present' && !daily[d].hasTime) daily[d].status = r.status;
            if (['VL', 'SL', 'EL', 'BL'].includes(r.status)) daily[d].status = r.status;
        }

        // Generate all days in cutoff
        const allCutoffDays = [];
        const cur = new Date(dateFrom);
        const end = new Date(dateTo);
        while (cur <= end) {
            const dateStr = cur.toISOString().split('T')[0];
            if (emp.salary_type === 'monthly') {
                allCutoffDays.push(dateStr);
            } else {
                if (!RD_DAYS.includes(cur.getDay())) allCutoffDays.push(dateStr);
            }
            cur.setDate(cur.getDate() + 1);
        }

        // Daily rate
        const dailyRate = emp.salary_type === 'monthly' ? (Number(emp.salary) * 12) / 365 : Number(emp.salary);

        // Calculate each day
        const calcs = [];
        for (const date of allCutoffDays) {
            const dayData = daily[date] || { date, in: null, out: null, status: 'present' };
            
            if (emp.salary_type === 'monthly' && isRestDay(date) && dayData.status !== 'absent') dayData.status = 'present';
            if (dayData.status === 'present' && !dayData.in && !dayData.out && !isRestDay(date) && !['VL','SL','EL','BL'].includes(dayData.status) && !isHoliday(date, holidays)) dayData.status = 'absent';
            
            if (emp.salary_type === 'monthly' && isRestDay(date) && dayData.status === 'present') {
                calcs.push({
                    date: new Date(date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }),
                    clockIn: '-', clockOut: '-', hours: 0, otHours: 0, ndHours: 0,
                    regularPay: dailyRate, overtimePay: 0, holidayPay: 0, nightDiffPay: 0,
                    lateDeduction: 0, undertimeDeduction: 0, grossPay: dailyRate, deductions: 0, netPay: dailyRate,
                    status: 'RD Paid', isHoliday: false, isRestDay: true
                });
                continue;
            }
            
            if (dayData.status === 'absent') {
                calcs.push({
                    date: new Date(date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }),
                    clockIn: '-', clockOut: '-', hours: 0, otHours: 0, ndHours: 0,
                    regularPay: 0, overtimePay: 0, holidayPay: 0, nightDiffPay: 0,
                    lateDeduction: 0, undertimeDeduction: 0, grossPay: 0, deductions: 0, netPay: 0,
                    status: 'Absent', isHoliday: false, isRestDay: isRestDay(date)
                });
            } else {
                const clockIn = dayData.in || `${date} 08:00:00`;
                const clockOut = dayData.out || `${date} 17:00:00`;
                const result = calculateDay({ ...dayData, in: clockIn, out: clockOut, date: date }, dailyRate, holidays);
                calcs.push({
                    date: new Date(date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }),
                    clockIn: dayData.in ? String(dayData.in).match(/\d{2}:\d{2}/)?.[0] || '-' : '-',
                    clockOut: dayData.out ? String(dayData.out).match(/\d{2}:\d{2}/)?.[0] || '-' : '-',
                    ...result,
                    isHoliday: isHoliday(date, holidays), isRestDay: isRestDay(date)
                });
            }
        }

        // Summary
        const presentDays = calcs.filter(c => ['Present', 'VL', 'SL', 'EL', 'BL', 'RD Paid'].includes(c.status)).length;
        const absentDays = calcs.filter(c => c.status === 'Absent').length;

        let totalRegularPay;
        if (emp.salary_type === 'monthly') {
            totalRegularPay = absentDays === 0 ? Number(emp.salary) / 2 : dailyRate * presentDays;
        } else {
            totalRegularPay = calcs.reduce((s, c) => s + c.regularPay, 0);
        }

        const sums = calcs.reduce((s, c) => ({
            overtimePay: (s.overtimePay || 0) + (c.overtimePay || 0),
            holidayPay: (s.holidayPay || 0) + (c.holidayPay || 0),
            nightDiffPay: (s.nightDiffPay || 0) + (c.nightDiffPay || 0),
            deductions: (s.deductions || 0) + (c.deductions || 0),
        }), { overtimePay: 0, holidayPay: 0, nightDiffPay: 0, deductions: 0 });

        const totalGross = totalRegularPay + sums.overtimePay + sums.holidayPay + sums.nightDiffPay;
        const totalNet = totalGross - sums.deductions - loanDeduction.total;

        return successResponse({
            employee: emp,
            totalWorkingDays: allCutoffDays.length,
            calculations: calcs,
            summary: {
                totalDays: presentDays,
                absentDays: absentDays,
                totalRegularPay: Math.round(totalRegularPay * 100) / 100,
                totalOvertimePay: Math.round(sums.overtimePay * 100) / 100,
                totalHolidayPay: Math.round(sums.holidayPay * 100) / 100,
                totalNightDiffPay: Math.round(sums.nightDiffPay * 100) / 100,
                totalGrossPay: Math.round(totalGross * 100) / 100,
                totalDeductions: Math.round(sums.deductions * 100) / 100,
                loanDeduction: {
                    sss: loanDeduction.sss,
                    pagibig: loanDeduction.pagibig,
                    total: loanDeduction.total
                },
                totalNetPay: Math.round(totalNet * 100) / 100,
            }
        });
    } catch (error) {
        console.error('Calculation error:', error);
        return errorResponse('Calculation error: ' + error.message);
    }
}
