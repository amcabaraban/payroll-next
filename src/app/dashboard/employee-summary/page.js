'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';

export default function EmployeeSummaryPage() {
    const [user, setUser] = useState(null);
    const [employees, setEmployees] = useState([]);
    const [selectedEmp, setSelectedEmp] = useState('');
    const [year, setYear] = useState(new Date().getFullYear().toString());
    const [summary, setSummary] = useState(null);
    const [activeTab, setActiveTab] = useState('info');
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

    const fetchSummary = async () => {
        if (!selectedEmp) return;
        setLoading(true);
        const res = await fetch(`/api/employee-summary?user_id=${selectedEmp}&year=${year}`);
        const data = await res.json();
        if (data.success) setSummary(data.data);
        setLoading(false);
    };

    useEffect(() => {
        if (selectedEmp) fetchSummary();
    }, [selectedEmp, year]);

    const formatPHP = (amount) => '₱' + Number(amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 });
    const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

    if (!user) return null;

    return (
        <div className="flex flex-col lg:flex-row h-screen overflow-hidden bg-gray-100">
            <Sidebar user={user} />
            <div className="flex-1 overflow-y-auto w-full">
                <header className="bg-white shadow-sm p-3 md:p-4">
                    <h2 className="text-base md:text-lg font-semibold text-gray-700">📊 Employee Master Record</h2>
                </header>

                <main className="p-3 md:p-6">
                    {/* Filters */}
                    <div className="bg-white rounded-lg shadow p-3 md:p-4 mb-4 md:mb-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                            <div>
                                <label className="block text-xs md:text-sm font-medium mb-1">Employee</label>
                                <select value={selectedEmp} onChange={(e) => setSelectedEmp(e.target.value)}
                                    disabled={user?.role === 'employee'}
                                    className="w-full border rounded p-1.5 md:p-2 text-xs md:text-sm">
                                    <option value="">-- Choose Employee --</option>
                                    {employees.map(emp => (<option key={emp.id} value={emp.id}>{emp.full_name}</option>))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs md:text-sm font-medium mb-1">Year</label>
                                <select value={year} onChange={(e) => setYear(e.target.value)}
                                    className="w-full border rounded p-1.5 md:p-2 text-xs md:text-sm">
                                    <option value="2024">2024</option>
                                    <option value="2025">2025</option>
                                    <option value="2026">2026</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {loading && <div className="text-center p-8 md:p-12 text-gray-400">Loading...</div>}

                    {summary && (
                        <div className="bg-white rounded-lg shadow mb-6">
                            {/* Tabs - Scrollable on mobile */}
                            <div className="border-b overflow-x-auto">
                                <div className="flex flex-nowrap min-w-max">
                                    {[
                                        { key: 'info', label: '👤 Info' },
                                        { key: 'salary', label: '💰 Salary' },
                                        { key: 'attendance', label: '📋 Attendance' },
                                        { key: 'leaves', label: '🏖️ Leaves' },
                                        { key: 'violations', label: '⚠️ Violations' },
                                        { key: 'thirteenth', label: '🎄 13th Month' },
                                    ].map(tab => (
                                        <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                                            className={`px-3 md:px-4 py-2 text-xs md:text-sm font-medium whitespace-nowrap border-b-2 transition ${
                                                activeTab === tab.key ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                                            }`}>
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            
                            {/* Tab Content */}
                            <div className="p-3 md:p-6">
                                {activeTab === 'info' && (
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                                        <div className="bg-gray-50 rounded-lg p-3">
                                            <p className="text-xs text-gray-500">Name</p>
                                            <p className="font-semibold text-sm">{summary.employee.full_name}</p>
                                        </div>
                                        <div className="bg-gray-50 rounded-lg p-3">
                                            <p className="text-xs text-gray-500">Department</p>
                                            <p className="font-semibold text-sm">{summary.employee.department_name || 'N/A'}</p>
                                        </div>
                                        <div className="bg-gray-50 rounded-lg p-3">
                                            <p className="text-xs text-gray-500">Position</p>
                                            <p className="font-semibold text-sm">{summary.employee.position_name || 'N/A'}</p>
                                        </div>
                                        <div className="bg-gray-50 rounded-lg p-3">
                                            <p className="text-xs text-gray-500">Basic Salary</p>
                                            <p className="font-semibold text-sm">{formatPHP(summary.employee.salary)}/mo</p>
                                        </div>
                                        <div className="bg-gray-50 rounded-lg p-3">
                                            <p className="text-xs text-gray-500">Email</p>
                                            <p className="text-sm break-all">{summary.employee.email}</p>
                                        </div>
                                        <div className="bg-gray-50 rounded-lg p-3">
                                            <p className="text-xs text-gray-500">Salary Type</p>
                                            <p className="capitalize text-sm">{summary.employee.salary_type}</p>
                                        </div>
                                        <div className="bg-gray-50 rounded-lg p-3">
                                            <p className="text-xs text-gray-500">Status</p>
                                            <p className="capitalize text-sm">{summary.employee.employment_status || 'N/A'}</p>
                                        </div>
                                        <div className="bg-gray-50 rounded-lg p-3">
                                            <p className="text-xs text-gray-500">Tax</p>
                                            <p className="text-sm">{summary.employee.apply_tax == 1 ? 'Applicable' : 'Exempt'}</p>
                                        </div>
                                        <div className="bg-gray-50 rounded-lg p-3 col-span-2 md:col-span-3 lg:col-span-4">
                                            <p className="text-xs text-gray-500">Leave Credits</p>
                                            <p className="text-sm">
                                                VL: {summary.credits?.vl_total - summary.credits?.vl_used}/{summary.credits?.vl_total} | 
                                                SL: {summary.credits?.sl_total - summary.credits?.sl_used}/{summary.credits?.sl_total} | 
                                                EL: {summary.credits?.el_total - summary.credits?.el_used}/{summary.credits?.el_total} | 
                                                BL: {summary.credits?.bl_total - summary.credits?.bl_used}/{summary.credits?.bl_total}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'salary' && (
                                    <>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-4">
                                            <div className="bg-green-50 rounded-lg p-3 md:p-4 text-center">
                                                <p className="text-xs text-gray-500">Total Gross ({year})</p>
                                                <p className="text-xl md:text-2xl font-bold text-green-700">{formatPHP(summary.salaryTotal?.total_gross)}</p>
                                            </div>
                                            <div className="bg-red-50 rounded-lg p-3 md:p-4 text-center">
                                                <p className="text-xs text-gray-500">Total Deductions ({year})</p>
                                                <p className="text-xl md:text-2xl font-bold text-red-700">{formatPHP(summary.salaryTotal?.total_deductions)}</p>
                                            </div>
                                            <div className="bg-blue-50 rounded-lg p-3 md:p-4 text-center">
                                                <p className="text-xs text-gray-500">Total Net Pay ({year})</p>
                                                <p className="text-xl md:text-2xl font-bold text-blue-700">{formatPHP(summary.salaryTotal?.total_net)}</p>
                                            </div>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full min-w-[500px] text-sm">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="p-2 md:p-3 text-left text-xs uppercase text-gray-500">Period</th>
                                                        <th className="p-2 md:p-3 text-right text-xs uppercase text-gray-500">Gross</th>
                                                        <th className="p-2 md:p-3 text-right text-xs uppercase text-gray-500">Deductions</th>
                                                        <th className="p-2 md:p-3 text-right text-xs uppercase text-gray-500 font-bold">Net</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {summary.payslips?.length === 0 ? (
                                                        <tr><td colSpan="4" className="text-center p-4 text-gray-400">No payslips</td></tr>
                                                    ) : (
                                                        summary.payslips?.map(p => (
                                                            <tr key={p.id} className="border-b">
                                                                <td className="p-2 md:p-3">{formatDate(p.period_from)} - {formatDate(p.period_to)}</td>
                                                                <td className="p-2 md:p-3 text-right">{formatPHP(p.gross_pay)}</td>
                                                                <td className="p-2 md:p-3 text-right text-red-600">{formatPHP(p.total_deductions)}</td>
                                                                <td className="p-2 md:p-3 text-right font-bold text-green-700">{formatPHP(p.net_pay)}</td>
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </>
                                )}

                                {activeTab === 'attendance' && (
                                    <div className="overflow-x-auto">
                                        <table className="w-full min-w-[500px] text-sm">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="p-2 md:p-3 text-left text-xs uppercase text-gray-500">Cutoff</th>
                                                    <th className="p-2 md:p-3 text-center text-xs uppercase text-gray-500">Present</th>
                                                    <th className="p-2 md:p-3 text-center text-xs uppercase text-gray-500">Absent</th>
                                                    <th className="p-2 md:p-3 text-center text-xs uppercase text-gray-500">AWOL</th>
                                                    <th className="p-2 md:p-3 text-center text-xs uppercase text-gray-500">AWL</th>
                                                    <th className="p-2 md:p-3 text-center text-xs uppercase text-gray-500">Leave</th>
                                                    <th className="p-2 md:p-3 text-center text-xs uppercase text-gray-500">Holiday</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {summary.attendanceSummary?.length === 0 ? (
                                                    <tr><td colSpan="7" className="text-center p-4 text-gray-400">No records</td></tr>
                                                ) : (
                                                    summary.attendanceSummary?.map((a, i) => (
                                                        <tr key={i} className="border-b">
                                                            <td className="p-2 md:p-3 font-medium">{a.cutoff}</td>
                                                            <td className="p-2 md:p-3 text-center text-green-600 font-medium">{a.present_days}</td>
                                                            <td className="p-2 md:p-3 text-center text-red-600">{a.absent_days}</td>
                                                            <td className="p-2 md:p-3 text-center text-red-800 font-bold">{a.awol_days}</td>
                                                            <td className="p-2 md:p-3 text-center text-orange-600">{a.awl_days}</td>
                                                            <td className="p-2 md:p-3 text-center text-blue-600">{a.leave_days}</td>
                                                            <td className="p-2 md:p-3 text-center text-purple-600">{a.holiday_days}</td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {activeTab === 'leaves' && (
                                    <div className="overflow-x-auto">
                                        <table className="w-full min-w-[500px] text-sm">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="p-2 md:p-3 text-left text-xs uppercase text-gray-500">Type</th>
                                                    <th className="p-2 md:p-3 text-left text-xs uppercase text-gray-500">Date</th>
                                                    <th className="p-2 md:p-3 text-center text-xs uppercase text-gray-500">Days</th>
                                                    <th className="p-2 md:p-3 text-left text-xs uppercase text-gray-500">Reason</th>
                                                    <th className="p-2 md:p-3 text-center text-xs uppercase text-gray-500">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {summary.leaves?.length === 0 ? (
                                                    <tr><td colSpan="5" className="text-center p-4 text-gray-400">No leave records</td></tr>
                                                ) : (
                                                    summary.leaves?.map(l => (
                                                        <tr key={l.id} className="border-b">
                                                            <td className="p-2 md:p-3"><span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-700">{l.leave_type}</span></td>
                                                            <td className="p-2 md:p-3 text-sm">{formatDate(l.date_from)} - {formatDate(l.date_to)}</td>
                                                            <td className="p-2 md:p-3 text-center">{l.days}</td>
                                                            <td className="p-2 md:p-3 text-sm text-gray-500">{l.reason || '-'}</td>
                                                            <td className="p-2 md:p-3 text-center">
                                                                <span className={`px-2 py-1 rounded text-xs ${
                                                                    l.status === 'approved' ? 'bg-green-100 text-green-700' :
                                                                    l.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                                                    l.status === 'cancelled' ? 'bg-gray-100 text-gray-700' :
                                                                    'bg-yellow-100 text-yellow-700'}`}>{l.status}</span>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {activeTab === 'violations' && (
                                    <div>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-6">
                                            <div className="bg-white border rounded-lg p-3 md:p-4 text-center">
                                                <p className="text-xs text-gray-500">Total</p>
                                                <p className="text-xl md:text-2xl font-bold">{summary.violations?.total || 0}</p>
                                            </div>
                                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 md:p-4 text-center">
                                                <p className="text-xs text-gray-500">Warnings</p>
                                                <p className="text-xl md:text-2xl font-bold text-yellow-600">{summary.violations?.warnings || 0}</p>
                                            </div>
                                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 md:p-4 text-center">
                                                <p className="text-xs text-gray-500">Suspensions</p>
                                                <p className="text-xl md:text-2xl font-bold text-orange-600">{summary.violations?.suspensions || 0}</p>
                                            </div>
                                            <div className="bg-red-50 border border-red-200 rounded-lg p-3 md:p-4 text-center">
                                                <p className="text-xs text-gray-500">Terminations</p>
                                                <p className="text-xl md:text-2xl font-bold text-red-600">{summary.violations?.terminations || 0}</p>
                                            </div>
                                        </div>
                                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 md:p-4 text-sm">
                                            <p className="font-medium mb-2">⚠️ Violation Policy:</p>
                                            <ul className="list-disc list-inside space-y-1 text-gray-600 text-xs md:text-sm">
                                                <li>1st Offense: <b>Warning</b></li>
                                                <li>2nd Offense: <b>Suspension</b></li>
                                                <li>3rd Offense: <b>Termination</b></li>
                                            </ul>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'thirteenth' && (
                                    <div className="overflow-x-auto">
                                        <table className="w-full min-w-[400px] text-sm">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="p-2 md:p-3 text-left text-xs uppercase text-gray-500">Year</th>
                                                    <th className="p-2 md:p-3 text-right text-xs uppercase text-gray-500">Total Basic Pay</th>
                                                    <th className="p-2 md:p-3 text-right text-xs uppercase text-gray-500 font-bold">13th Month Pay</th>
                                                    <th className="p-2 md:p-3 text-left text-xs uppercase text-gray-500">Release Date</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {summary.thirteenthMonth?.length === 0 ? (
                                                    <tr><td colSpan="4" className="text-center p-4 text-gray-400">No records</td></tr>
                                                ) : (
                                                    summary.thirteenthMonth?.map(t => (
                                                        <tr key={t.id} className="border-b">
                                                            <td className="p-2 md:p-3 font-medium">{t.year}</td>
                                                            <td className="p-2 md:p-3 text-right">{formatPHP(t.total_basic_pay)}</td>
                                                            <td className="p-2 md:p-3 text-right font-bold text-green-700">{formatPHP(t.thirteenth_month_pay)}</td>
                                                            <td className="p-2 md:p-3 text-sm">{t.release_date ? formatDate(t.release_date) : '-'}</td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {!summary && !loading && selectedEmp && (
                        <div className="bg-white rounded-lg shadow p-8 md:p-12 text-center text-gray-400 text-sm md:text-base">
                            Select an employee and year to view records
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}