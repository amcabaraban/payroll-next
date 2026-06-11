'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';

export default function ThirteenthMonthPage() {
    const [user, setUser] = useState(null);
    const [employees, setEmployees] = useState([]);
    const [selectedEmp, setSelectedEmp] = useState('');
    const [year, setYear] = useState(new Date().getFullYear().toString());
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (!userData) { router.push('/login'); return; }
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        
        if (parsedUser.role === 'employee') {
            setSelectedEmp(parsedUser.id.toString());
        } else {
            fetchEmployees();
        }
    }, []);

    const fetchEmployees = async () => {
        const res = await fetch('/api/employees');
        const data = await res.json();
        if (data.success) setEmployees(data.data);
    };

    const computeThirteenthMonth = async () => {
        if (!selectedEmp) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/thirteenth-month?user_id=${selectedEmp}&year=${year}`);
            const data = await res.json();
            if (data.success) setResult(data.data);
        } catch (err) { console.error(err); }
        setLoading(false);
    };

    const handleSave13thMonth = async () => {
        if (!result) return;
        try {
            const res = await fetch('/api/thirteenth-month', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: result.employee.id,
                    full_name: result.employee.full_name,
                    department: result.employee.department,
                    year: result.year,
                    total_basic_pay: result.totalBasicPay,
                    thirteenth_month_pay: result.thirteenthMonthPay,
                }),
            });
            const data = await res.json();
            alert(data.message);
        } catch (err) {
            alert('Failed to save');
        }
    };

    const handlePrint13thMonth = () => {
    if (!result) return;
    
    const formatPHP = (amount) => '₱' + Number(amount).toLocaleString('en-PH', { minimumFractionDigits: 2 });
    
    const printWindow = window.open('', '_blank', 'width=800,height=600');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>13th Month Pay - ${result.employee.full_name}</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { font-family: Arial, sans-serif; padding: 40px; color: #1f2937; }
                    .header { border-block-end: 2px solid #2563eb; padding-block-end: 16px; margin-block-end: 24px; display: flex; justify-content: space-between; align-items: center; }
                    .logo { display: flex; align-items: center; gap: 12px; }
                    .logo-icon { inline-size: 50px; block-size: 50px; background: #2563eb; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 18px; }
                    .header h1 { color: #2563eb; font-size: 22px; }
                    .header p { font-size: 12px; color: #6b7280; }
                    .info { background: #f9fafb; padding: 16px; border-radius: 8px; margin-block-end: 24px; }
                    .info table { inline-size: 100%; }
                    .info td { padding: 4px 8px; font-size: 13px; }
                    .section { margin-block-end: 20px; }
                    .section h3 { font-size: 14px; border-block-end: 1px solid #e5e7eb; padding-block-end: 8px; margin-block-end: 12px; color: #2563eb; }
                    .row { display: flex; justify-content: space-between; font-size: 13px; margin-block-end: 6px; }
                    .row span:first-child { color: #6b7280; }
                    .row.total { font-weight: bold; border-block-start: 1px solid #e5e7eb; padding-block-start: 8px; margin-block-start: 8px; font-size: 14px; }
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
                        <div class="logo-icon">PM</div>
                        <div>
                            <h1>Payroll Management Inc.</h1>
                            <p>123 Business District, Makati City</p>
                            <p>Tel: (02) 8123-4567 | hr@payrollmgmt.com</p>
                        </div>
                    </div>
                    <div style="text-align:end">
                        <h2 style="font-size:20px;margin-block-end:4px">13TH MONTH PAY</h2>
                        <p style="font-size:12px;color:#6b7280">Year: ${result.year}</p>
                    </div>
                </div>
                
                <div class="info">
                    <table>
                        <tr><td style="color:#6b7280">Employee:</td><td><b>${result.employee.full_name}</b></td><td style="color:#6b7280">ID:</td><td>EMP-${String(result.employee.id).padStart(4, '0')}</td></tr>
                        <tr><td style="color:#6b7280">Department:</td><td>${result.employee.department || 'N/A'}</td><td style="color:#6b7280">Basic Salary:</td><td>${formatPHP(result.employee.salary)}/mo</td></tr>
                    </table>
                </div>
                
                <div class="section">
                    <h3>COMPUTATION</h3>
                    <div class="row"><span>Total Basic Pay (Jan - Dec ${result.year})</span><span>${formatPHP(result.totalBasicPay)}</span></div>
                    <div class="row"><span>Divided by 12 months</span><span>÷ 12</span></div>
                    <div class="row total"><span>13th Month Pay</span><span style="color:#2563eb">${formatPHP(result.thirteenthMonthPay)}</span></div>
                </div>
                
                <div class="net-pay">
                    <div class="label">13TH MONTH PAY</div>
                    <div class="amount">${formatPHP(result.thirteenthMonthPay)}</div>
                </div>
                
                <div class="footer">
                    <p>This is a computer-generated 13th month payslip. No signature required.</p>
                    <p>13th month pay is tax-exempt up to ₱90,000 under Philippine law.</p>
                    <p>Generated on ${new Date().toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                </div>
                <script>window.print();</script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    const formatPHP = (amount) => '₱' + Number(amount).toLocaleString('en-PH', { minimumFractionDigits: 2 });

    if (!user) return null;

    return (
        <div className="flex min-h-screen bg-gray-100">
            <Sidebar user={user} />
            <div className="flex-1">
                <header className="bg-white shadow-sm p-4">
                    <h2 className="text-lg font-semibold text-gray-700">🎄 13th Month Pay</h2>
                </header>

                <main className="p-6">
                    <div className="bg-white rounded-lg shadow p-4 mb-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                            <div>
                                <label className="block text-sm font-medium mb-1">Employee</label>
                                <select value={selectedEmp} 
                                    onChange={(e) => setSelectedEmp(e.target.value)}
                                    disabled={user?.role === 'employee'}>
                                    <option value="">-- Choose Employee --</option>
                                    {employees.map(emp => (
                                        <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Year</label>
                                <select value={year} onChange={(e) => setYear(e.target.value)}>
                                    <option value="2024">2024</option>
                                    <option value="2025">2025</option>
                                    <option value="2026">2026</option>
                                </select>
                            </div>
                            <div className="flex items-end gap-2">
                                <button onClick={computeThirteenthMonth} disabled={!selectedEmp || loading}
                                    className="bg-blue-600 text-white px-6 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50">
                                    {loading ? '⏳' : '💰'} Compute
                                </button>
                                {result && (
                                    <button onClick={handleSave13thMonth}
                                        className="bg-purple-600 text-white px-4 py-1.5 rounded text-sm hover:bg-purple-700 ml-2">
                                        💾 Save Record
                                    </button>
                                )}
                                {result && (
                                    <button onClick={handlePrint13thMonth}
                                        className="bg-green-600 text-white px-4 py-1.5 rounded text-sm hover:bg-green-700">
                                        🖨️ Print
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {result && (
                        <div className="bg-white rounded-lg shadow p-6">
                            <h3 className="text-lg font-semibold mb-4">13th Month Pay Summary</h3>
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="bg-blue-50 p-4 rounded-lg">
                                    <p className="text-sm text-gray-500">Employee</p>
                                    <p className="text-xl font-bold">{result.employee.full_name}</p>
                                </div>
                                <div className="bg-blue-50 p-4 rounded-lg">
                                    <p className="text-sm text-gray-500">Year</p>
                                    <p className="text-xl font-bold">{result.year}</p>
                                </div>
                            </div>

                            <div className="bg-gray-50 p-6 rounded-lg mb-6">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-gray-600">Total Basic Pay (Jan - Dec)</span>
                                    <span className="text-lg font-semibold">{formatPHP(result.totalBasicPay)}</span>
                                </div>
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-gray-600">Months</span>
                                    <span className="text-lg">÷ 12</span>
                                </div>
                                <div className="border-t pt-3 flex justify-between items-center">
                                    <span className="text-lg font-bold">13th Month Pay</span>
                                    <span className="text-2xl font-bold text-green-700">{formatPHP(result.thirteenthMonthPay)}</span>
                                </div>
                            </div>

                            <div className="text-sm text-gray-400">
                                <p>Formula: Total Basic Pay / 12 months</p>
                                <p>13th month pay is tax-exempt up to ₱90,000</p>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}