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
    if (clocks.status === 'absent' || clocks.status === 'Absent') {
        return { 
            status: 'Absent', regularPay: 0, overtimePay: 0, holidayPay: 0, nightDiffPay: 0, 
            lateDeduction: 0, undertimeDeduction: 0, grossPay: 0, deductions: 0, netPay: 0, 
            hours: 0, otHours: 0, ndHours: 0 
        };
    }

    if (clocks.status === 'awol' || clocks.status === 'awl') {
        return { 
            status: clocks.status === 'awol' ? 'AWOL' : 'AWL',
            regularPay: 0, overtimePay: 0, holidayPay: 0, nightDiffPay: 0, 
            lateDeduction: 0, undertimeDeduction: 0, grossPay: 0, deductions: 0, netPay: 0, 
            hours: 0, otHours: 0, ndHours: 0 
        };
    }

    if (['VL', 'SL', 'EL', 'BL'].includes(clocks.status)) {
        return { 
            status: clocks.status, regularPay: dailyRate, overtimePay: 0, holidayPay: 0, nightDiffPay: 0, 
            lateDeduction: 0, undertimeDeduction: 0, grossPay: dailyRate, deductions: 0, netPay: dailyRate, 
            hours: WORKING_HOURS, otHours: 0, ndHours: 0 
        };
    }

    if (clocks.status === 'RD Paid') {
        return { 
            status: 'RD Paid', regularPay: dailyRate, overtimePay: 0, holidayPay: 0, nightDiffPay: 0, 
            lateDeduction: 0, undertimeDeduction: 0, grossPay: dailyRate, deductions: 0, netPay: dailyRate, 
            hours: 0, otHours: 0, ndHours: 0 
        };
    }
    
    const inTime = new Date(clocks.in);
    const outTime = new Date(clocks.out);

    if (outTime < inTime) {
        outTime.setDate(outTime.getDate() + 1);
    }

    const outDateStr = outTime.toISOString().split('T')[0];
    const isOutRestDay = isRestDay(outDateStr);
    const isOutHoliday = isHoliday(outDateStr, holidays);

    const hoursWorked = (outTime - inTime) / (1000 * 60 * 60) - BREAK_HOURS;
    const hourlyRate = dailyRate / WORKING_HOURS;

    const dateForCheck = new Date(clocks.date);
    const formattedDate = `${dateForCheck.getFullYear()}-${String(dateForCheck.getMonth() + 1).padStart(2, '0')}-${String(dateForCheck.getDate()).padStart(2, '0')}`;

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

    let otMultiplier = 1.25;
    if (isRestDay(formattedDate) || isOutRestDay) otMultiplier = 1.30;
    if (holidayRate > 1) otMultiplier = holidayRate;
    if (isOutHoliday) {
        const outHolidayRate = getHolidayRate(outDateStr, holidays);
        if (outHolidayRate > 1) otMultiplier = Math.max(otMultiplier, outHolidayRate);
    }

    const regularPay = dailyRate;
    const overtimePay = otHours * hourlyRate * otMultiplier;
    const nightDiffPay = ndHours * hourlyRate * 0.10;
    const lateDeduction = lateHours * hourlyRate;
    const utDeduction = utHours * hourlyRate;

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

        // Pre-build Cutoff Dates Array
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

        // Gather Attendance Records
        const records = await query(
            'SELECT * FROM attendance WHERE user_id = ? AND date >= ? AND date <= ? ORDER BY date, timestamp',
            [userId, dateFrom, dateTo]
        );

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

        // Activity Check: Ensure monthly workers have at least one active sign/approved leave on working days
        let hasActivity = true;
        if (emp.salary_type === 'monthly') {
            hasActivity = false;
            for (const date of allCutoffDays) {
                if (!isRestDay(date)) {
                    const dayData = daily[date];
                    if (dayData && (dayData.hasTime || ['VL', 'SL', 'EL', 'BL'].includes(dayData.status))) {
                        hasActivity = true;
                        break;
                    }
                }
            }
        }

        const loanDeduction = { sss: 0, pagibig: 0, total: 0 };
        let govSss = 0;
        let govPhilhealth = 0;
        let govPagibig = 0;

        const firstDay = new Date(dateFrom).getDate();
        const monthlySalary = Number(emp.salary) || 0;

        // Process deductions only if employee is verified active
        if (firstDay <= 15 && hasActivity) {
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

            const calculatedSss = (monthlySalary / 2) * 0.045;
            govSss = Math.min(1125.00, Math.round(calculatedSss * 100) / 100);
            govPhilhealth = Math.round(monthlySalary * 0.025 * 100) / 100;
            govPagibig = 200.00;
        }
        
        const totalGovContributions = govSss + govPhilhealth + govPagibig;
        const holidays = await query('SELECT * FROM holidays');
        const dailyRate = emp.salary_type === 'monthly' ? (monthlySalary * 12) / 365 : monthlySalary;

        const calcs = [];
        for (const date of allCutoffDays) {
            const dayData = daily[date] || { date, in: null, out: null, status: 'present' };
            
            if (!hasActivity) {
                // Force completely inactive cutoff to reflect full absence uniformly
                dayData.status = 'absent';
            } else {
                if (emp.salary_type === 'monthly' && isRestDay(date) && dayData.status !== 'absent') dayData.status = 'present';
                if (dayData.status === 'present' && !dayData.in && !dayData.out && !isRestDay(date) && !['VL','SL','EL','BL'].includes(dayData.status) && !isHoliday(date, holidays)) dayData.status = 'absent';
            }
            
            if (emp.salary_type === 'monthly' && isRestDay(date) && dayData.status === 'present' && hasActivity) {
                calcs.push({
                    date: new Date(date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }),
                    clockIn: '-', clockOut: '-', hours: 0, otHours: 0, ndHours: 0,
                    regularPay: dailyRate, overtimePay: 0, holidayPay: 0, nightDiffPay: 0,
                    lateDeduction: 0, undertimeDeduction: 0, grossPay: dailyRate, deductions: 0, netPay: dailyRate,
                    status: 'RD Paid', isHoliday: false, isRestDay: true
                });
                continue;
            }
            
            if (dayData.status === 'absent' || !hasActivity) {
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
                    clockIn: dayData.in ? String(dayData.in).match(/(\d{2}):(\d{2})/)?.[0] || '-' : '-',
                    clockOut: dayData.out ? String(dayData.out).match(/(\d{2}):(\d{2})/)?.[0] || '-' : '-',
                    ...result,
                    isHoliday: isHoliday(date, holidays), isRestDay: isRestDay(date)
                });
            }
        }

        const presentDays = calcs.filter(c => ['Present', 'VL', 'SL', 'EL', 'BL', 'RD Paid'].includes(c.status)).length;
        const awlDays = calcs.filter(c => c.status === 'AWL').length;
        const absentDays = calcs.filter(c => c.status === 'Absent').length;

        let totalRegularPay;
        if (emp.salary_type === 'monthly') {
            if (!hasActivity) {
                totalRegularPay = 0;
            } else {
                const totalAbsences = absentDays + awlDays;
                totalRegularPay = Math.max(0, (monthlySalary / 2) - (dailyRate * totalAbsences));
            }
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
        const totalCombinedDeductions = sums.deductions + loanDeduction.total + totalGovContributions;
        const totalNet = totalGross - totalCombinedDeductions;

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
                totalDeductions: Math.round(totalCombinedDeductions * 100) / 100,
                attendanceDeductions: Math.round(sums.deductions * 100) / 100,
                loanDeduction: {
                    sss: loanDeduction.sss,
                    pagibig: loanDeduction.pagibig,
                    total: loanDeduction.total
                },
                govContributions: {
                    sss: govSss,
                    philhealth: govPhilhealth,
                    pagibig: govPagibig,
                    total: totalGovContributions
                },
                totalNetPay: Math.round(totalNet * 100) / 100,
            }
        });
    } catch (error) {
        console.error('Calculation error:', error);
        return errorResponse('Calculation error: ' + error.message);
    }
}