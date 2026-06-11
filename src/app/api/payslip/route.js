import { query, getRow } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/response';
import { computeDeductions } from '@/lib/tax';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('user_id');
        const dateFrom = searchParams.get('date_from');
        const dateTo = searchParams.get('date_to');

        if (!userId) return errorResponse('User ID is required');

        const employee = await getRow(
            'SELECT * FROM users WHERE id = ?',
            [userId]
        );

        if (!employee) return errorResponse('Employee not found');

        const records = await query(
            'SELECT * FROM attendance WHERE user_id = ? AND date >= ? AND date <= ? ORDER BY date, timestamp',
            [userId, dateFrom || '2024-01-01', dateTo || '2024-12-31']
        );

        const dailyRate = (Number(employee.salary) * 12) / 365;
        const hourlyRate = dailyRate / 8;

        const dailyRecords = {};
        for (const r of records) {
            if (!dailyRecords[r.date]) dailyRecords[r.date] = {};
            dailyRecords[r.date][r.type] = r.timestamp;
        }

        let totalHours = 0;
        let totalOT = 0;
        let totalND = 0;
        let totalLate = 0;

        for (const [date, times] of Object.entries(dailyRecords)) {
            if (times.in && times.out) {
                const inTime = new Date(times.in);
                const outTime = new Date(times.out);
                const hours = (outTime - inTime) / (1000 * 60 * 60) - 1;
                
                totalHours += Math.min(hours, 8);
                
                const startTime = new Date(inTime);
                startTime.setHours(8, 0, 0, 0);
                if (inTime > startTime) {
                    totalLate += (inTime - startTime) / (1000 * 60 * 60);
                }

                const endTime = new Date(inTime);
                endTime.setHours(17, 0, 0, 0);
                if (outTime > endTime) {
                    const hoursAfter = (outTime - endTime) / (1000 * 60 * 60);
                    if (hoursAfter > 1) {
                        totalOT += Math.ceil(hoursAfter - 1);
                    }
                }

                if (outTime.getHours() >= 22 || outTime.getHours() < 6) {
                    const ndStart = new Date(inTime);
                    ndStart.setHours(22, 0, 0, 0);
                    if (outTime > ndStart) {
                        totalND += (outTime - ndStart) / (1000 * 60 * 60);
                    }
                }
                if (inTime.getHours() < 6) {
                    const ndEnd = new Date(inTime);
                    ndEnd.setHours(6, 0, 0, 0);
                    totalND += Math.min((ndEnd - inTime) / (1000 * 60 * 60), 6 - inTime.getHours());
                }
            }
        }

        const regularPay = totalHours * hourlyRate;
        const otPay = totalOT * hourlyRate * 1.25;
        const ndPay = totalND * hourlyRate * 0.10;
        const lateDeduction = totalLate * hourlyRate;
        const grossPay = regularPay + otPay + ndPay;

        const deductions = computeDeductions(Number(employee.salary));
        const totalDeductions = deductions.totalContributions + lateDeduction;
        const netPay = grossPay - totalDeductions;

        return successResponse({
            employee,
            period: { from: dateFrom, to: dateTo },
            earnings: {
                regularPay: Math.round(regularPay * 100) / 100,
                overtimePay: Math.round(otPay * 100) / 100,
                nightDiff: Math.round(ndPay * 100) / 100,
                grossPay: Math.round(grossPay * 100) / 100,
            },
            deductions: {
                sss: deductions.sss,
                philhealth: deductions.philhealth,
                pagibig: deductions.pagibig,
                tax: deductions.tax,
                late: Math.round(lateDeduction * 100) / 100,
                total: Math.round(totalDeductions * 100) / 100,
            },
            summary: {
                totalHours: Math.round(totalHours * 100) / 100,
                totalOT: totalOT,
                netPay: Math.round(netPay * 100) / 100,
            }
        });
    } catch (error) {
        console.error('Payslip error:', error);
        return errorResponse('Failed to generate payslip: ' + error.message);
    }
}