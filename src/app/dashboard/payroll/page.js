'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { computeDeductions } from '@/lib/tax';

export default function PayrollPage() {
    const [user, setUser] = useState(null);
    const [employees, setEmployees] = useState([]);
    const [selectedEmp, setSelectedEmp] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [payrollData, setPayrollData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);
    const router = useRouter();

    useEffect(() => {
        // Check authentication
        const userData = localStorage.getItem('user');
        
        if (!userData) {
            router.replace('/login');
            return;
        }
        
        try {
            const parsedUser = JSON.parse(userData);
            
            if (!parsedUser.id || !parsedUser.role) {
                localStorage.removeItem('user');
                router.replace('/login');
                return;
            }
            
            setUser(parsedUser);
            
            if (parsedUser.role === 'employee') {
                router.push('/dashboard');
                return;
            }
            
            fetchEmployees();
            
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            setDateFrom(`${year}-${month}-01`);
            setDateTo(`${year}-${month}-15`);
        } catch {
            localStorage.removeItem('user');
            router.replace('/login');
        } finally {
            setIsCheckingAuth(false);
        }
    }, []);

    const fetchEmployees = async () => {
        const res = await fetch('/api/employees');
        const data = await res.json();
        if (data.success) setEmployees(data.data);
    };

    // RD configuration: 0=Sunday, 1=Monday, ..., 6=Saturday
    const RD_DAYS = [0]; // [0] = Sunday lang

    const countWorkingDays = (from, to) => {
        let count = 0;
        const start = new Date(from);
        const end = new Date(to);
        const current = new Date(start);
        while (current <= end) {
            if (!RD_DAYS.includes(current.getDay())) count++;
            current.setDate(current.getDate() + 1);
        }
        return count;
    };

    const isRestDay = (dateStr) => {
        const d = new Date(dateStr);
        return RD_DAYS.includes(d.getDay());
    };

    const setCutoffPeriod = (period) => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        switch(period) {
            case 'first15':
                setDateFrom(`${year}-${month}-01`);
                setDateTo(`${year}-${month}-15`);
                break;
            case 'second15':
                setDateFrom(`${year}-${month}-16`);
                const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
                setDateTo(`${year}-${month}-${String(lastDay).padStart(2, '0')}`);
                break;
            case 'fullMonth':
                setDateFrom(`${year}-${month}-01`);
                const lastDayFull = new Date(year, now.getMonth() + 1, 0).getDate();
                setDateTo(`${year}-${month}-${String(lastDayFull).padStart(2, '0')}`);
                break;
        }
    };

    const calculatePayroll = async () => {
        if (!selectedEmp || !dateFrom || !dateTo) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/attendance/calculate?user_id=${selectedEmp}&date_from=${dateFrom}&date_to=${dateTo}`);
            const data = await res.json();
            if (data.success) setPayrollData(data.data);
        } catch (err) { console.error(err); }
        setLoading(false);
    };

    const formatPHP = (amount) => '₱' + Number(amount).toLocaleString('en-PH', { minimumFractionDigits: 2 });
    const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

    const handlePrintPayslip = async () => {
        if (!payrollData) return;

        const emp = payrollData.employee;
        const sum = payrollData.summary;
        const calcs = payrollData.calculations;
        const deductions = computeDeductions(Number(payrollData.employee.salary), payrollData.employee.apply_tax);
        
        // Fetch company settings
        const settingsRes = await fetch('/api/company-settings');
        const settingsData = await settingsRes.json();
        const company = settingsData.data || {};


        // Get loan deductions
        const loanDeduction = sum.loanDeduction || { sss: 0, pagibig: 0, total: 0 };
        
        // Late/Undertime ONLY (without loans)
        const lateDeductions = sum.totalDeductions || 0;

        // Filter Present days only
        const presentCalcs = calcs.filter(c => c.status !== 'Absent');
        const totalND = presentCalcs.reduce((s, c) => s + (c.nightDiffPay || 0), 0);

        // Total deductions = contributions + late/undertime + loan
        const totalDeduct = deductions.totalContributions + lateDeductions + loanDeduction.total;
        const netPay = sum.totalGrossPay - totalDeduct;

        const printWindow = window.open('', '_blank', 'width=800,height=600');
        printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
    <title>Payslip - ${emp.full_name}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; padding: 40px; color: #1f2937; }
        .header { border-block-end: 2px solid #2563eb; padding-block-end: 16px; margin-block-end: 24px; display: flex; justify-content: space-between; align-items: center; }
        .logo { display: flex; align-items: center; gap: 12px; }
        .logo-icon { inline-size: 50px; block-size: 50px; background: #2563eb; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 18px; }
        .header h1 { color: #2563eb; font-size: 22px; }
        .header p { font-size: 12px; color: #6b7280; }
        .info { background: #f9fafb; padding: 16px; border-radius: 8px; margin-block-end: 24px; }
        .info td { padding: 4px 8px; font-size: 13px; }
        .columns { display: flex; gap: 32px; margin-block-end: 24px; }
        .col { flex: 1; }
        .col h3 { font-size: 14px; border-block-end: 1px solid #e5e7eb; padding-block-end: 8px; margin-block-end: 12px; }
        .earn h3 { color: #059669; }
        .deduct h3 { color: #dc2626; }
        .row { display: flex; justify-content: space-between; font-size: 13px; margin-block-end: 6px; }
        .row span:first-child { color: #6b7280; }
        .row.total { font-weight: bold; border-block-start: 1px solid #e5e7eb; padding-block-start: 8px; margin-block-start: 8px; font-size: 14px; }
        .section-label { font-size: 10px; font-weight: 700; color: #999; text-transform: uppercase; margin: 10px 0 5px 0; }
        .net-pay { background: #2563eb; color: white; padding: 24px; text-align: center; border-radius: 8px; margin-block-end: 24px; }
        .net-pay .label { font-size: 13px; opacity: 0.8; }
        .net-pay .amount { font-size: 32px; font-weight: bold; margin-block-start: 4px; }
        .footer { text-align: center; font-size: 11px; color: #9ca3af; border-block-start: 1px solid #e5e7eb; padding-block-start: 16px; }
        @media print { body { padding: 20px; } }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">
            <div class="logo-icon">${(company.company_name || 'PM').substring(0,2).toUpperCase()}</div>
            <div>
                <h1>${company.company_name || 'Payroll Management Inc.'}</h1>
                <p>${company.address || ''}</p>
                <p>Tel: ${company.contact_no || ''} | ${company.email || ''}</p>
            </div>
        </div>
        <div style="text-align:end">
            <h2 style="font-size:20px;margin-block-end:4px">PAYSLIP</h2>
            <p style="font-size:12px;color:#6b7280">${formatDate(dateFrom)} - ${formatDate(dateTo)}</p>
        </div>
    </div>
    <div class="info">
        <table>
            <tr><td style="color:#6b7280">Employee:</td><td><b>${emp.full_name}</b></td><td style="color:#6b7280">ID:</td><td>EMP-${String(emp.id).padStart(4, '0')}</td></tr>
            <tr><td style="color:#6b7280">Department:</td><td>${emp.department || 'N/A'}</td><td style="color:#6b7280">Position:</td><td>${emp.position || 'N/A'}</td></tr>
            <tr><td style="color:#6b7280">Period:</td><td>${formatDate(dateFrom)} - ${formatDate(dateTo)}</td><td style="color:#6b7280">Basic Salary:</td><td>₱${Number(emp.salary).toLocaleString()}/mo</td></tr>
        </table>
    </div>
    <div class="columns">
        <div class="col earn">
            <h3>EARNINGS</h3>
            <div class="row"><span>Regular Pay (${sum.totalDays} days)</span><span>${formatPHP(sum.totalRegularPay)}</span></div>
            ${sum.totalOvertimePay > 0 ? `<div class="row"><span>Overtime Pay</span><span>${formatPHP(sum.totalOvertimePay)}</span></div>` : ''}
            ${sum.totalHolidayPay > 0 ? `<div class="row"><span>Holiday Pay</span><span>${formatPHP(sum.totalHolidayPay)}</span></div>` : ''}
            ${totalND > 0 ? `<div class="row"><span>Night Differential</span><span>${formatPHP(totalND)}</span></div>` : ''}
            <div class="row total"><span>Gross Pay</span><span style="color:#059669">${formatPHP(sum.totalGrossPay)}</span></div>
        </div>
        <div class="col deduct">
            <h3>DEDUCTIONS</h3>
            <div class="section-label">Government Contributions</div>
            <div class="row"><span>SSS</span><span>${formatPHP(deductions.sss)}</span></div>
            <div class="row"><span>PhilHealth</span><span>${formatPHP(deductions.philhealth)}</span></div>
            <div class="row"><span>Pag-IBIG</span><span>${formatPHP(deductions.pagibig)}</span></div>
            ${deductions.tax > 0 ? `<div class="row"><span>Withholding Tax</span><span>${formatPHP(deductions.tax)}</span></div>` : ''}
            ${lateDeductions > 0 ? `<div class="section-label">Other Deductions</div><div class="row"><span>Late/Undertime</span><span>${formatPHP(lateDeductions)}</span></div>` : ''}
            ${loanDeduction.total > 0 ? `
            <div class="section-label">Loan Payments (1st Cutoff)</div>
            ${loanDeduction.sss > 0 ? `<div class="row"><span>SSS Loan</span><span>${formatPHP(loanDeduction.sss)}</span></div>` : ''}
            ${loanDeduction.pagibig > 0 ? `<div class="row"><span>Pag-IBIG Loan</span><span>${formatPHP(loanDeduction.pagibig)}</span></div>` : ''}
            ` : ''}
            <div class="row total"><span>Total Deductions</span><span style="color:#dc2626">${formatPHP(totalDeduct)}</span></div>
        </div>
    </div>
    <div class="net-pay">
        <div class="label">NET PAY</div>
        <div class="amount">${formatPHP(netPay)}</div>
    </div>
    <div class="footer">
        <p>This is a computer-generated payslip. No signature required.</p>
        <p>Generated on ${new Date().toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
    </div>
    <script>window.print(); setTimeout(function(){ window.close(); }, 1000);</script>
</body>
</html>`);
        printWindow.document.close();
    };

    // Show loading while checking auth
    if (isCheckingAuth) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-500">Checking authentication...</p>
                </div>
            </div>
        );
    }

    // If no user, redirect handled by useEffect
    if (!user) return null;

    // Calculations for RD
    const totalDays = dateFrom && dateTo ? 
        Math.ceil((new Date(dateTo) - new Date(dateFrom)) / (1000 * 60 * 60 * 24)) + 1 : 0;
    const workingDays = dateFrom && dateTo ? countWorkingDays(dateFrom, dateTo) : 0;
    const rdays = totalDays - workingDays;

    return (
        <div className="flex min-h-screen bg-gray-100">
            <Sidebar user={user} />
            <div className="flex-1">
                <header className="bg-white shadow-sm p-4">
                    <h2 className="text-lg font-semibold text-gray-700">💰 Salary Calculation</h2>
                </header>

                <main className="p-6">
                    {/* Settings */}
                    <div className="bg-white rounded-lg shadow p-4 mb-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                            <div>
                                <label className="block text-sm font-medium mb-1">Employee</label>
                                <select value={selectedEmp} onChange={(e) => setSelectedEmp(e.target.value)}>
                                    <option value="">-- Choose Employee --</option>
                                    {employees.map(emp => (
                                        <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Date From</label>
                                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Date To</label>
                                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                            <button onClick={() => setCutoffPeriod('first15')}
                                className="px-2 py-1 text-xs rounded border border-blue-300 text-blue-600 hover:bg-blue-50">1st-15th</button>
                            <button onClick={() => setCutoffPeriod('second15')}
                                className="px-2 py-1 text-xs rounded border border-green-300 text-green-600 hover:bg-green-50">16th-EOM</button>
                            <button onClick={() => setCutoffPeriod('fullMonth')}
                                className="px-2 py-1 text-xs rounded border border-purple-300 text-purple-600 hover:bg-purple-50">Full Month</button>
                            <span className="text-xs text-gray-400 ml-2">
                                | Total: {totalDays} days | Working: {workingDays} days | RD: {rdays} days
                            </span>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={calculatePayroll} disabled={!selectedEmp || loading}
                                className="bg-blue-600 text-white px-6 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50">
                                {loading ? '⏳ Calculating...' : '📊 Calculate Salary'}
                            </button>
                            {payrollData && (
                                <button onClick={handlePrintPayslip}
                                    className="bg-green-600 text-white px-6 py-2 rounded text-sm hover:bg-green-700">
                                    🖨️ Print Payslip
                                </button>
                            )}
                            <button onClick={handleBulkProcess} disabled={bulkLoading}
                                className="bg-purple-600 text-white px-6 py-2 rounded text-sm hover:bg-purple-700 disabled:opacity-50">
                                {bulkLoading ? '⏳ Processing...' : '⚡ Process All Employees'}
                            </button>
                            {bulkResult && (
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
                                    <p className="font-semibold text-green-700">
                                        ✅ Processed: {bulkResult.processed} | Skipped: {bulkResult.skipped} | Total: {bulkResult.total}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Period: {bulkResult.period?.from} to {bulkResult.period?.to}
                                    </p>
                                    <div className="mt-3 max-h-48 overflow-y-auto">
                                        {bulkResult.results?.map((r, i) => (
                                            <div key={i} className={`text-xs py-1 ${r.status === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                                                {r.status === 'success' ? '✅' : '❌'} {r.name} - Gross: ₱{r.gross?.toLocaleString()} | Net: ₱{r.net?.toLocaleString()}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Results */}
                    {payrollData && (
                        <>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                <div className="bg-white rounded-lg shadow p-4">
                                    <p className="text-xs text-gray-500 uppercase">Employee</p>
                                    <p className="text-lg font-bold">{payrollData.employee.full_name}</p>
                                    <p className="text-sm text-gray-400">{formatPHP(payrollData.employee.salary)}/mo</p>
                                </div>
                                <div className="bg-white rounded-lg shadow p-4">
                                    <p className="text-xs text-gray-500 uppercase">Period</p>
                                    <p className="text-lg font-bold">{payrollData.summary.totalDays} days worked</p>
                                    <p className="text-xs text-gray-400">{totalDays} total | {rdays} RD</p>
                                </div>
                                {payrollData.summary.loanDeduction?.total > 0 && (
                                    <div className="bg-orange-50 rounded-lg shadow p-3">
                                        <p className="text-xs text-gray-400">Loan Deduction</p>
                                        <p className="text-lg font-semibold text-orange-600">
                                            {formatPHP(payrollData.summary.loanDeduction.total)}
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            SSS: {formatPHP(payrollData.summary.loanDeduction.sss)} | 
                                            PAGIBIG: {formatPHP(payrollData.summary.loanDeduction.pagibig)}
                                        </p>
                                    </div>
                                )}
                                <div className="bg-green-50 rounded-lg shadow p-4">
                                    <p className="text-xs text-gray-500 uppercase">Net Pay</p>
                                    <p className="text-2xl font-bold text-green-700">{formatPHP(payrollData.summary.totalNetPay)}</p>
                                </div>
                                <div className="bg-blue-50 rounded-lg shadow p-4">
                                    <p className="text-xs text-gray-500 uppercase">Gross Pay</p>
                                    <p className="text-2xl font-bold text-blue-700">{formatPHP(payrollData.summary.totalGrossPay)}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                                <div className="bg-white rounded-lg shadow p-3">
                                    <p className="text-xs text-gray-400">Regular Pay</p>
                                    <p className="text-lg font-semibold">{formatPHP(payrollData.summary.totalRegularPay)}</p>
                                </div>
                                <div className="bg-orange-50 rounded-lg shadow p-3">
                                    <p className="text-xs text-gray-400">OT Pay</p>
                                    <p className="text-lg font-semibold text-orange-600">{formatPHP(payrollData.summary.totalOvertimePay)}</p>
                                </div>
                                <div className="bg-purple-50 rounded-lg shadow p-3">
                                    <p className="text-xs text-gray-400">Holiday Pay</p>
                                    <p className="text-lg font-semibold text-purple-600">{formatPHP(payrollData.summary.totalHolidayPay)}</p>
                                </div>
                                <div className="bg-indigo-50 rounded-lg shadow p-3">
                                    <p className="text-xs text-gray-400">Night Diff</p>
                                    <p className="text-lg font-semibold text-indigo-600">{formatPHP(payrollData.calculations.reduce((s, c) => s + (c.nightDiffPay || 0), 0))}</p>
                                </div>
                                <div className="bg-red-50 rounded-lg shadow p-3">
                                    <p className="text-xs text-gray-400">Deductions</p>
                                    <p className="text-lg font-semibold text-red-600">{formatPHP(payrollData.summary.totalDeductions)}</p>
                                </div>
                            </div>

                            <div className="bg-white rounded-lg shadow overflow-hidden">
                                <div className="p-4 border-b bg-gray-50">
                                    <h3 className="font-semibold">📋 Daily Breakdown</h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="p-2 text-left">Date</th>
                                                <th className="p-2 text-center">In</th>
                                                <th className="p-2 text-center">Out</th>
                                                <th className="p-2 text-center">Hrs</th>
                                                <th className="p-2 text-center">OT</th>
                                                <th className="p-2 text-center">ND</th>
                                                <th className="p-2 text-right">Reg Pay</th>
                                                <th className="p-2 text-right">OT Pay</th>
                                                <th className="p-2 text-right">ND Pay</th>
                                                <th className="p-2 text-right">Deduct</th>
                                                <th className="p-2 text-right font-bold">Net</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {payrollData.calculations.map((c, i) => (
                                                <tr key={i} className={`border-b hover:bg-gray-50 ${isRestDay(c.date) ? 'bg-yellow-50' : ''}`}>
                                                    <td className="p-2">
                                                        {c.date}
                                                        {c.isHoliday && ' 🎉'}
                                                        {isRestDay(c.date) && ' 🏠 RD'}
                                                    </td>
                                                    <td className="p-2 text-center">{c.clockIn}</td>
                                                    <td className="p-2 text-center">{c.clockOut}</td>
                                                    <td className="p-2 text-center">{c.hours}</td>
                                                    <td className="p-2 text-center">{c.otHours > 0 ? <span className="text-orange-600">{c.otHours}h</span> : '-'}</td>
                                                    <td className="p-2 text-center">{c.nightDiffHours > 0 ? <span className="text-indigo-600">{c.nightDiffHours}h</span> : '-'}</td>
                                                    <td className="p-2 text-right">{formatPHP(c.regularPay)}</td>
                                                    <td className="p-2 text-right">{c.overtimePay > 0 ? formatPHP(c.overtimePay) : '-'}</td>
                                                    <td className="p-2 text-center">{c.ndHours > 0 ? <span className="text-indigo-600">{c.ndHours}h</span> : '-'}</td>
                                                    <td className="p-2 text-right text-red-600">{c.deductions > 0 ? formatPHP(c.deductions) : '-'}</td>
                                                    <td className="p-2 text-right font-bold">{formatPHP(c.netPay)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-gray-100 font-bold">
                                            <tr>
                                                <td colSpan="6" className="p-2 text-right">TOTALS:</td>
                                                <td className="p-2 text-right">{formatPHP(payrollData.summary.totalRegularPay)}</td>
                                                <td className="p-2 text-right">{formatPHP(payrollData.summary.totalOvertimePay)}</td>
                                                <td className="p-2 text-right text-indigo-600">{formatPHP(payrollData.summary.totalNightDiffPay)}</td>
                                                <td className="p-2 text-right text-red-600">{formatPHP(payrollData.summary.totalDeductions)}</td>
                                                <td className="p-2 text-right text-green-700">{formatPHP(payrollData.summary.totalNetPay)}</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}
                </main>
            </div>
        </div>
    );
}
