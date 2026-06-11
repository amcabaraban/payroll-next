'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { computeDeductions } from '@/lib/tax';

export default function PayslipPage() {
    const [user, setUser] = useState(null);
    const [employees, setEmployees] = useState([]);
    const [selectedEmp, setSelectedEmp] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [payslip, setPayslip] = useState(null);
    const [loading, setLoading] = useState(false);
    const printRef = useRef();
    const router = useRouter();

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (!userData) { router.push('/login'); return; }
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        
        if (parsedUser.role === 'employee') {
            setSelectedEmp(parsedUser.id.toString());
        }
        
        if (parsedUser.role === 'admin' || parsedUser.role === 'hr') {
            fetchEmployees();
        }
        
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        setDateFrom(`${year}-${month}-01`);
        setDateTo(`${year}-${month}-15`);
    }, []);

    const fetchEmployees = async () => {
        const res = await fetch('/api/employees');
        const data = await res.json();
        if (data.success) setEmployees(data.data);
    };

    const generatePayslip = async () => {
        if (!selectedEmp || !dateFrom || !dateTo) return;
        setLoading(true);
        try {
            // Fetch company settings
            const settingsRes = await fetch('/api/company-settings');
            const settingsData = await settingsRes.json();
            const company = settingsData.data || {};

            const res = await fetch(`/api/attendance/calculate?user_id=${selectedEmp}&date_from=${dateFrom}&date_to=${dateTo}`);
            const data = await res.json();
            
            if (data.success) {
                const emp = data.data.employee;
                const sum = data.data.summary;
                
                const lateUndertimeDeductions = sum.totalDeductions || 0;
                const loanDeduction = sum.loanDeduction || { sss: 0, pagibig: 0, total: 0 };
                const contributions = computeDeductions(Number(emp.salary), emp.apply_tax);
                const totalDeduct = contributions.totalContributions + lateUndertimeDeductions + loanDeduction.total;
                const netPay = sum.totalGrossPay - totalDeduct;
                
                setPayslip({
                    employee: emp,
                    company: company,
                    period: { from: dateFrom, to: dateTo },
                    earnings: {
                        regularPay: sum.totalRegularPay,
                        overtimePay: sum.totalOvertimePay,
                        holidayPay: sum.totalHolidayPay || 0,
                        nightDiff: sum.totalNightDiffPay || 0,
                        grossPay: sum.totalGrossPay,
                    },
                    deductions: {
                        sss: contributions.sss,
                        philhealth: contributions.philhealth,
                        pagibig: contributions.pagibig,
                        tax: contributions.tax,
                        late: lateUndertimeDeductions,
                        loanSSS: loanDeduction.sss || 0,
                        loanPagIBIG: loanDeduction.pagibig || 0,
                        loanTotal: loanDeduction.total || 0,
                        total: totalDeduct,
                    },
                    summary: {
                        totalDays: sum.totalDays,
                        netPay: netPay,
                    }
                });
            }
        } catch (err) { 
            console.error('Error:', err); 
        }
        setLoading(false);
    };

    const handlePrint = () => {
        if (!payslip) return;
        
        const printWindow = window.open('', '_blank', 'width=800,height=600');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Payslip - ${payslip.employee?.full_name || 'Employee'}</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { 
                        font-family: 'Segoe UI', Arial, sans-serif; 
                        font-size: 12px; 
                        color: #333;
                        padding: 20px;
                        max-inline-size: 800px;
                        margin: 0 auto;
                    }
                    .header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        border-block-end: 3px solid #2563eb;
                        padding-block-end: 15px;
                        margin-block-end: 20px;
                    }
                    .company-info h1 { font-size: 20px; color: #1e40af; margin-block-end: 3px; }
                    .company-info p { font-size: 10px; color: #666; margin: 1px 0; }
                    .payslip-title { text-align: end; }
                    .payslip-title h2 { font-size: 24px; color: #1e40af; }
                    .payslip-title p { font-size: 11px; color: #666; }
                    .employee-details {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 10px;
                        background: #f8fafc;
                        padding: 15px;
                        border-radius: 5px;
                        margin-block-end: 20px;
                    }
                    .detail-item { display: flex; justify-content: space-between; font-size: 11px; }
                    .detail-label { color: #666; }
                    .detail-value { font-weight: 600; }
                    .sections { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-block-end: 20px; }
                    .section { border: 1px solid #e2e8f0; border-radius: 5px; padding: 15px; }
                    .section h3 { font-size: 14px; margin-block-end: 10px; padding-block-end: 5px; border-block-end: 2px solid #e2e8f0; }
                    .earnings h3 { color: #16a34a; }
                    .deductions h3 { color: #dc2626; }
                    .line { display: flex; justify-content: space-between; margin: 5px 0; font-size: 11px; }
                    .line .label { color: #666; }
                    .line .amount { font-weight: 600; }
                    .subtotal { border-block-start: 1px solid #e2e8f0; padding-block-start: 8px; margin-block-start: 8px; font-weight: 700; font-size: 13px; }
                    .section-label { font-size: 10px; font-weight: 700; color: #999; text-transform: uppercase; margin: 10px 0 5px 0; }
                    .net-pay-box {
                        background: #2563eb;
                        color: white;
                        padding: 20px;
                        border-radius: 5px;
                        text-align: center;
                        margin-block-end: 20px;
                    }
                    .net-pay-box .label { font-size: 11px; opacity: 0.9; }
                    .net-pay-box .amount { font-size: 28px; font-weight: 700; margin-block-start: 5px; }
                    .footer { text-align: center; font-size: 10px; color: #999; border-block-start: 1px solid #e2e8f0; padding-block-start: 10px; }
                    @media print {
                        body { padding: 10px; }
                        @page { margin: 10mm; size: A4; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="company-info">
                        <h1>${payslip.company?.company_name || 'Payroll Management Inc.'}</h1>
                        <p>${payslip.company?.address || '123 Business District, Makati City'}</p>
                        <p>Tel: ${payslip.company?.contact_no || '(02) 8123-4567'} | ${payslip.company?.email || 'hr@payrollmgmt.com'}</p>
                    </div>
                    <div class="payslip-title">
                        <h2>PAYSLIP</h2>
                        <p>${formatDate(payslip.period?.from)} - ${formatDate(payslip.period?.to)}</p>
                    </div>
                </div>
                
                <div class="employee-details">
                    <div class="detail-item"><span class="detail-label">Employee:</span><span class="detail-value">${payslip.employee?.full_name || 'N/A'}</span></div>
                    <div class="detail-item"><span class="detail-label">ID:</span><span class="detail-value">EMP-${String(payslip.employee?.id || 0).padStart(4, '0')}</span></div>
                    <div class="detail-item"><span class="detail-label">Department:</span><span class="detail-value">${payslip.employee?.department || 'N/A'}</span></div>
                    <div class="detail-item"><span class="detail-label">Position:</span><span class="detail-value">${payslip.employee?.position || 'N/A'}</span></div>
                    <div class="detail-item"><span class="detail-label">Basic Salary:</span><span class="detail-value">${formatPHP(payslip.employee?.salary || 0)}/mo</span></div>
                    <div class="detail-item"><span class="detail-label">Days Worked:</span><span class="detail-value">${payslip.summary?.totalDays || 0} days</span></div>
                </div>
                
                <div class="sections">
                    <div class="section earnings">
                        <h3>EARNINGS</h3>
                        <div class="line"><span class="label">Regular Pay (${payslip.summary?.totalDays || 0} days)</span><span class="amount">${formatPHP(payslip.earnings?.regularPay || 0)}</span></div>
                        ${(payslip.earnings?.overtimePay || 0) > 0 ? `<div class="line"><span class="label">Overtime Pay</span><span class="amount">${formatPHP(payslip.earnings.overtimePay)}</span></div>` : ''}
                        ${(payslip.earnings?.holidayPay || 0) > 0 ? `<div class="line"><span class="label">Holiday Pay</span><span class="amount">${formatPHP(payslip.earnings.holidayPay)}</span></div>` : ''}
                        ${(payslip.earnings?.nightDiff || 0) > 0 ? `<div class="line"><span class="label">Night Differential</span><span class="amount">${formatPHP(payslip.earnings.nightDiff)}</span></div>` : ''}
                        <div class="line subtotal" style="color:#16a34a"><span>GROSS PAY</span><span>${formatPHP(payslip.earnings?.grossPay || 0)}</span></div>
                    </div>
                    
                    <div class="section deductions">
                        <h3>DEDUCTIONS</h3>
                        <div class="section-label">Government Contributions</div>
                        <div class="line"><span class="label">SSS</span><span class="amount">(${formatPHP(payslip.deductions?.sss || 0)})</span></div>
                        <div class="line"><span class="label">PhilHealth</span><span class="amount">(${formatPHP(payslip.deductions?.philhealth || 0)})</span></div>
                        <div class="line"><span class="label">Pag-IBIG</span><span class="amount">(${formatPHP(payslip.deductions?.pagibig || 0)})</span></div>
                        ${(payslip.deductions?.tax || 0) > 0 ? `<div class="line"><span class="label">Withholding Tax</span><span class="amount">(${formatPHP(payslip.deductions?.tax)})</span></div>` : ''}
                        ${(payslip.deductions?.late || 0) > 0 ? `<div class="section-label">Other Deductions</div><div class="line"><span class="label">Late/Undertime</span><span class="amount">(${formatPHP(payslip.deductions?.late)})</span></div>` : ''}
                        ${(payslip.deductions?.loanTotal || 0) > 0 ? `
                            <div class="section-label">Loan Payments</div>
                            ${(payslip.deductions?.loanSSS || 0) > 0 ? `<div class="line"><span class="label">SSS Loan</span><span class="amount">(${formatPHP(payslip.deductions?.loanSSS)})</span></div>` : ''}
                            ${(payslip.deductions?.loanPagIBIG || 0) > 0 ? `<div class="line"><span class="label">Pag-IBIG Loan</span><span class="amount">(${formatPHP(payslip.deductions?.loanPagIBIG)})</span></div>` : ''}
                        ` : ''}
                        <div class="line subtotal" style="color:#dc2626"><span>TOTAL DEDUCTIONS</span><span>(${formatPHP(payslip.deductions?.total || 0)})</span></div>
                    </div>
                </div>
                
                <div class="net-pay-box">
                    <div class="label">NET PAY</div>
                    <div class="amount">${formatPHP(payslip.summary?.netPay || 0)}</div>
                </div>
                
                <div class="footer">
                    <p>This is a computer-generated payslip. No signature required.</p>
                    <p>Generated: ${new Date().toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                </div>
                
                <script>
                    window.onload = function() {
                        window.print();
                        setTimeout(function() { window.close(); }, 500);
                    };
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    const handleEmailPayslip = async () => {
        if (!payslip) return;
        try {
            const res = await fetch('/api/payslip/email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: payslip.employee.id,
                    period_from: dateFrom,
                    period_to: dateTo,
                }),
            });
            const data = await res.json();
            alert(data.message);
        } catch (err) {
            alert('Failed to send email');
        }
    };

    const formatPHP = (amount) => '₱' + Number(amount).toLocaleString('en-PH', { minimumFractionDigits: 2 });
    const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

    if (!user) return null;

    return (
        <div className="flex min-h-screen bg-gray-100">
            <Sidebar user={user} />
            <div className="flex-1">
                <header className="bg-white shadow-sm p-4 flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-gray-700">📄 Generate Payslip</h2>
                </header>

                <main className="p-6">
                    {/* Filters */}
                    <div className="bg-white rounded-lg shadow p-4 mb-6 no-print">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-3">
                            <div>
                                <label className="block text-xs font-medium mb-1">Employee</label>
                                <select 
                                    value={selectedEmp} 
                                    onChange={(e) => setSelectedEmp(e.target.value)}
                                    disabled={user?.role === 'employee'}
                                    className="w-full border rounded p-2 text-sm"
                                >
                                    <option value="">-- Choose Employee --</option>
                                    {employees.map(emp => (
                                        <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium mb-1">Date From</label>
                                <input 
                                    type="date" 
                                    value={dateFrom} 
                                    onChange={(e) => setDateFrom(e.target.value)}
                                    className="w-full border rounded p-2 text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium mb-1">Date To</label>
                                <input 
                                    type="date" 
                                    value={dateTo} 
                                    onChange={(e) => setDateTo(e.target.value)}
                                    className="w-full border rounded p-2 text-sm"
                                />
                            </div>
                            <div className="flex items-end gap-2">
                                <button onClick={generatePayslip} disabled={loading}
                                    className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50">
                                    {loading ? '⏳' : '📄'} Generate
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Payslip */}
                    {payslip && (
                        <div ref={printRef}>
                            <div className="bg-white rounded-lg shadow p-8 max-w-3xl mx-auto print:shadow-none print:p-4">
                                {/* Company Header */}
                                <div className="border-b-2 border-blue-600 pb-4 mb-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                                                {(payslip.company?.company_name || 'PM').substring(0,2).toUpperCase()}
                                            </div>
                                            <div>
                                                <h1 className="text-2xl font-bold text-blue-600">{payslip.company?.company_name || 'Payroll Management Inc.'}</h1>
                                                <p className="text-sm text-gray-500">{payslip.company?.address || '123 Business District, Makati City'}</p>
                                                <p className="text-sm text-gray-500">Tel: {payslip.company?.contact_no || '(02) 8123-4567'} | Email: {payslip.company?.email || 'hr@payrollmgmt.com'}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <h2 className="text-xl font-bold text-gray-700">PAYSLIP</h2>
                                            <p className="text-sm text-gray-500">Period: {formatDate(dateFrom)} - {formatDate(dateTo)}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Employee Info */}
                                <div className="bg-gray-50 p-4 rounded mb-6">
                                    <table className="w-full">
                                        <tbody>
                                            <tr>
                                                <td className="py-1 text-xs text-gray-500 w-32">Employee Name</td>
                                                <td className="py-1 font-semibold text-sm">: {payslip.employee.full_name}</td>
                                                <td className="py-1 text-xs text-gray-500 w-32">Employee ID</td>
                                                <td className="py-1 font-semibold text-sm">: EMP-{String(payslip.employee.id).padStart(4, '0')}</td>
                                            </tr>
                                            <tr>
                                                <td className="py-1 text-xs text-gray-500">Department</td>
                                                <td className="py-1 font-semibold text-sm">: {payslip.employee.department_name || payslip.employee.department || 'N/A'}</td>
                                                <td className="py-1 text-xs text-gray-500">Position</td>
                                                <td className="py-1 font-semibold text-sm">: {payslip.employee.position_name || payslip.employee.position || 'N/A'}</td>
                                            </tr>
                                            <tr>
                                                <td className="py-1 text-xs text-gray-500">Period</td>
                                                <td className="py-1 font-semibold text-sm">: {formatDate(dateFrom)} - {formatDate(dateTo)}</td>
                                                <td className="py-1 text-xs text-gray-500">Basic Salary</td>
                                                <td className="py-1 font-semibold text-sm">: {formatPHP(payslip.employee.salary)}/mo</td>
                                            </tr>
                                            <tr>
                                                <td className="py-1 text-xs text-gray-500">Salary Type</td>
                                                <td className="py-1 font-semibold text-sm capitalize">: {payslip.employee.salary_type || 'monthly'}</td>
                                                <td className="py-1 text-xs text-gray-500">Days Worked</td>
                                                <td className="py-1 font-semibold text-sm">: {payslip.summary.totalDays} days</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                {/* Earnings & Deductions */}
                                <div className="grid grid-cols-2 gap-6 mb-6">
                                    {/* Earnings */}
                                    <div>
                                        <h3 className="font-semibold text-green-700 mb-3 border-b pb-2">EARNINGS</h3>
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-500">
                                                    Regular Pay ({payslip.summary.totalDays} {payslip.summary.totalDays > 1 ? 'days' : 'day'} × {formatPHP(payslip.earnings.regularPay / Math.max(payslip.summary.totalDays, 1))})
                                                </span>
                                                <span>{formatPHP(payslip.earnings.regularPay)}</span>
                                            </div>
                                            {payslip.earnings.overtimePay > 0 && (
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-500">Overtime Pay</span>
                                                    <span>{formatPHP(payslip.earnings.overtimePay)}</span>
                                                </div>
                                            )}
                                            {payslip.earnings.holidayPay > 0 && (
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-500">Holiday Pay</span>
                                                    <span>{formatPHP(payslip.earnings.holidayPay)}</span>
                                                </div>
                                            )}
                                            {payslip.earnings.nightDiff > 0 && (
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-500">Night Differential</span>
                                                    <span>{formatPHP(payslip.earnings.nightDiff)}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between font-bold text-sm border-t pt-2">
                                                <span>Gross Pay</span>
                                                <span className="text-green-700">{formatPHP(payslip.earnings.grossPay)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Deductions */}
                                    <div>
                                        <h3 className="font-semibold text-red-700 mb-3 border-b pb-2">DEDUCTIONS</h3>
                                        <div className="space-y-2">
                                            <p className="text-xs font-semibold text-gray-500 uppercase mt-1">Government Contributions</p>
                                            <div className="flex justify-between text-sm pl-3">
                                                <span className="text-gray-500">SSS</span>
                                                <span>{formatPHP(payslip.deductions.sss)}</span>
                                            </div>
                                            <div className="flex justify-between text-sm pl-3">
                                                <span className="text-gray-500">PhilHealth</span>
                                                <span>{formatPHP(payslip.deductions.philhealth)}</span>
                                            </div>
                                            <div className="flex justify-between text-sm pl-3">
                                                <span className="text-gray-500">Pag-IBIG</span>
                                                <span>{formatPHP(payslip.deductions.pagibig)}</span>
                                            </div>
                                            {payslip.deductions.tax > 0 && (
                                                <div className="flex justify-between text-sm pl-3">
                                                    <span className="text-gray-500">Withholding Tax</span>
                                                    <span>{formatPHP(payslip.deductions.tax)}</span>
                                                </div>
                                            )}
                                            
                                            {payslip.deductions.late > 0 && (
                                                <>
                                                    <p className="text-xs font-semibold text-gray-500 uppercase mt-2 pt-2 border-t">Other Deductions</p>
                                                    <div className="flex justify-between text-sm pl-3">
                                                        <span className="text-gray-500">Late/Undertime</span>
                                                        <span className="text-red-600">{formatPHP(payslip.deductions.late)}</span>
                                                    </div>
                                                </>
                                            )}
                                            
                                            {payslip.deductions.loanTotal > 0 && (
                                                <>
                                                    <p className="text-xs font-semibold text-orange-600 uppercase mt-2 pt-2 border-t">Loan Payments</p>
                                                    {payslip.deductions.loanSSS > 0 && (
                                                        <div className="flex justify-between text-sm pl-3">
                                                            <span className="text-gray-500">SSS Loan</span>
                                                            <span className="text-orange-600">{formatPHP(payslip.deductions.loanSSS)}</span>
                                                        </div>
                                                    )}
                                                    {payslip.deductions.loanPagIBIG > 0 && (
                                                        <div className="flex justify-between text-sm pl-3">
                                                            <span className="text-gray-500">Pag-IBIG Loan</span>
                                                            <span className="text-orange-600">{formatPHP(payslip.deductions.loanPagIBIG)}</span>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                            
                                            <div className="flex justify-between font-bold text-sm border-t pt-2 mt-2">
                                                <span>Total Deductions</span>
                                                <span className="text-red-700">{formatPHP(payslip.deductions.total)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Net Pay */}
                                <div className="bg-blue-600 text-white p-6 rounded-lg mb-6">
                                    <p className="text-sm opacity-80 text-center mb-3">NET PAY COMPUTATION</p>
                                    <div className="grid grid-cols-3 gap-4 text-center">
                                        <div>
                                            <p className="text-xs opacity-70">Gross Pay</p>
                                            <p className="text-lg font-bold">{formatPHP(payslip.earnings.grossPay)}</p>
                                        </div>
                                        <div className="flex items-center justify-center">
                                            <span className="text-2xl font-bold">−</span>
                                        </div>
                                        <div>
                                            <p className="text-xs opacity-70">Total Deductions</p>
                                            <p className="text-lg font-bold">{formatPHP(payslip.deductions.total)}</p>
                                        </div>
                                    </div>
                                    <div className="border-t border-blue-400 mt-4 pt-4 text-center">
                                        <p className="text-xs opacity-80">NET PAY</p>
                                        <p className="text-3xl font-bold">{formatPHP(payslip.summary.netPay)}</p>
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="text-center text-xs text-gray-400 border-t pt-4">
                                    <p>This is a computer-generated payslip. No signature required.</p>
                                    <p>Generated on {new Date().toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex justify-center gap-4 mt-4 no-print">
                                    <button onClick={handlePrint}
                                        className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700">
                                        🖨️ Print Payslip
                                    </button>
                                    <button onClick={handleEmailPayslip} disabled={!payslip}
                                        className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50">
                                        📧 Email Payslip
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}