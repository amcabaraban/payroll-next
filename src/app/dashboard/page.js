'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import {
    Chart as ChartJS,
    ArcElement,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function DashboardPage() {
    const [user, setUser] = useState(null);
    const [employees, setEmployees] = useState([]);
    const [myPayslips, setMyPayslips] = useState([]);
    const [attendanceStats, setAttendanceStats] = useState(null);
    const [search, setSearch] = useState('');
    const [filterRole, setFilterRole] = useState('');
    const router = useRouter();

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (!userData) { router.push('/login'); return; }
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        
        if (parsedUser.role === 'admin' || parsedUser.role === 'hr') {
            loadEmployees();
            loadAttendanceStats();
        }
        
        if (parsedUser.role === 'employee') {
            fetchMyPayslips(parsedUser.id);
        }
    }, []);

    const loadEmployees = async () => {
        try {
            const res = await fetch('/api/employees');
            const data = await res.json();
            if (data.success) setEmployees(data.data);
        } catch (err) { console.error(err); }
    };

    const loadAttendanceStats = async () => {
        try {
            const now = new Date();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const year = now.getFullYear();
            const res = await fetch(`/api/attendance?date_from=${year}-${month}-01&date_to=${year}-${month}-15`);
            const data = await res.json();
            if (data.success) {
                const records = data.data || [];
                const present = records.filter(r => r.status === 'present').length;
                const absent = records.filter(r => r.status === 'absent').length;
                const awol = records.filter(r => r.status === 'awol').length;
                const awl = records.filter(r => r.status === 'awl').length;
                const leave = records.filter(r => ['VL','SL','EL','BL'].includes(r.status)).length;
                setAttendanceStats({ present, absent, awol, awl, leave });
            }
        } catch (err) { console.error(err); }
    };

    const fetchMyPayslips = async (userId) => {
        try {
            const res = await fetch(`/api/payslip/my?user_id=${userId}`);
            const data = await res.json();
            if (data.success) setMyPayslips(data.data);
        } catch (err) { console.error(err); }
    };

    const formatPHP = (amount) => '₱' + Number(amount).toLocaleString('en-PH', { minimumFractionDigits: 2 });
    const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

    // Chart data
    const roleChartData = {
        labels: ['Admin', 'HR', 'Employee'],
        datasets: [{
            data: [
                employees.filter(e => e.role === 'admin').length,
                employees.filter(e => e.role === 'hr').length,
                employees.filter(e => e.role === 'employee').length,
            ],
            backgroundColor: ['#ef4444', '#3b82f6', '#10b981'],
            borderWidth: 0,
        }],
    };

    const deptChartData = {
        labels: [...new Set(employees.map(e => e.department_name || e.department || 'N/A'))],
        datasets: [{
            label: 'Employees',
            data: [...new Set(employees.map(e => e.department_name || e.department || 'N/A'))].map(
                dept => employees.filter(e => (e.department_name || e.department) === dept).length
            ),
            backgroundColor: '#3b82f6',
            borderRadius: 6,
        }],
    };

    const attendanceChartData = attendanceStats ? {
        labels: ['Present', 'Absent', 'AWOL', 'AWL', 'Leave'],
        datasets: [{
            data: [attendanceStats.present, attendanceStats.absent, attendanceStats.awol, attendanceStats.awl, attendanceStats.leave],
            backgroundColor: ['#10b981', '#ef4444', '#991b1b', '#f59e0b', '#3b82f6'],
            borderWidth: 0,
        }],
    } : null;

    if (!user) return null;

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 15, font: { size: 11 } } } },
    };

    // EMPLOYEE VIEW
    if (user.role === 'employee') {
        return (
            <div className="flex flex-col lg:flex-row h-screen overflow-hidden bg-gray-100">
                <Sidebar user={user} />
                <div className="flex-1 overflow-y-auto w-full">
                    <header className="bg-white shadow-sm p-3 md:p-4">
                        <h2 className="text-base md:text-lg font-semibold text-gray-700">Welcome, {user.name}!</h2>
                    </header>
                    <main className="p-3 md:p-6">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-6">
                            <button onClick={() => router.push('/dashboard/attendance')}
                                className="bg-white rounded-lg shadow p-4 md:p-6 hover:shadow-md transition text-center">
                                <span className="text-2xl md:text-3xl">📋</span>
                                <p className="font-semibold mt-2 text-sm">My DTR</p>
                            </button>
                            <button onClick={() => router.push('/dashboard/payslip')}
                                className="bg-white rounded-lg shadow p-4 md:p-6 hover:shadow-md transition text-center">
                                <span className="text-2xl md:text-3xl">📄</span>
                                <p className="font-semibold mt-2 text-sm">My Payslips</p>
                            </button>
                            <div className="bg-white rounded-lg shadow p-4 md:p-6 text-center">
                                <span className="text-2xl md:text-3xl">👤</span>
                                <p className="font-semibold mt-2 text-sm">My Profile</p>
                                <p className="text-xs text-gray-400 truncate">{user.email}</p>
                            </div>
                        </div>
                        <div className="bg-white rounded-lg shadow overflow-hidden">
                            <div className="p-4 border-b"><h3 className="font-semibold">📄 Recent Payslips</h3></div>
                            {myPayslips.length === 0 ? (
                                <div className="p-8 text-center text-gray-400">No payslips yet</div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-[400px]">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="p-2 md:p-3 text-left text-xs uppercase text-gray-500">Period</th>
                                                <th className="p-2 md:p-3 text-right text-xs uppercase text-gray-500">Gross</th>
                                                <th className="p-2 md:p-3 text-right text-xs uppercase text-gray-500">Deductions</th>
                                                <th className="p-2 md:p-3 text-right text-xs uppercase text-gray-500">Net</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {myPayslips.map(p => (
                                                <tr key={p.id} className="border-b">
                                                    <td className="p-2 md:p-3 text-sm">{formatDate(p.period_from)} - {formatDate(p.period_to)}</td>
                                                    <td className="p-2 md:p-3 text-sm text-right">{formatPHP(p.gross_pay)}</td>
                                                    <td className="p-2 md:p-3 text-sm text-right text-red-600">{formatPHP(p.total_deductions)}</td>
                                                    <td className="p-2 md:p-3 text-sm text-right font-bold text-green-700">{formatPHP(p.net_pay)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </main>
                </div>
            </div>
        );
    }

    // ADMIN / HR VIEW
    return (
        <div className="flex flex-col lg:flex-row h-screen overflow-hidden bg-gray-100">
            <Sidebar user={user} />
            <div className="flex-1 overflow-y-auto w-full">
                <header className="bg-white shadow-sm p-3 md:p-4">
                    <h2 className="text-base md:text-lg font-semibold text-gray-700">Welcome back, {user.name?.split(' ')[0]}!</h2>
                </header>

                <main className="p-3 md:p-6">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4 mb-6">
                        <div className="bg-white rounded-lg shadow p-3 md:p-4">
                            <p className="text-gray-500 text-xs">Total Employees</p>
                            <p className="text-xl md:text-2xl font-bold">{employees.length}</p>
                        </div>
                        <div className="bg-white rounded-lg shadow p-3 md:p-4">
                            <p className="text-gray-500 text-xs">Admins</p>
                            <p className="text-xl md:text-2xl font-bold">{employees.filter(e => e.role === 'admin').length}</p>
                        </div>
                        <div className="bg-white rounded-lg shadow p-3 md:p-4">
                            <p className="text-gray-500 text-xs">Departments</p>
                            <p className="text-xl md:text-2xl font-bold">{new Set(employees.map(e => e.department)).size}</p>
                        </div>
                        <div className="bg-white rounded-lg shadow p-3 md:p-4">
                            <p className="text-gray-500 text-xs">Avg Salary</p>
                            <p className="text-xl md:text-2xl font-bold">
                                {employees.length > 0 ? formatPHP(employees.reduce((s, e) => s + Number(e.salary), 0) / employees.length) : '₱0'}
                            </p>
                        </div>
                    </div>

                    {/* Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6">
                        {/* Role Distribution */}
                        <div className="bg-white rounded-lg shadow p-4 md:p-6">
                            <h3 className="font-semibold text-sm md:text-base mb-4">👥 Employee Roles</h3>
                            <div className="h-48 md:h-56">
                                <Doughnut data={roleChartData} options={chartOptions} />
                            </div>
                        </div>

                        {/* Department Distribution */}
                        <div className="bg-white rounded-lg shadow p-4 md:p-6">
                            <h3 className="font-semibold text-sm md:text-base mb-4">🏢 By Department</h3>
                            <div className="h-48 md:h-56">
                                <Bar data={deptChartData} options={{ ...chartOptions, indexAxis: 'y' }} />
                            </div>
                        </div>

                        {/* Attendance Overview */}
                        {attendanceChartData && (
                            <div className="bg-white rounded-lg shadow p-4 md:p-6">
                                <h3 className="font-semibold text-sm md:text-base mb-4">📋 Attendance This Cutoff</h3>
                                <div className="h-48 md:h-56">
                                    <Doughnut data={attendanceChartData} options={chartOptions} />
                                </div>
                            </div>
                        )}

                        {/* Salary Overview */}
                        <div className="bg-white rounded-lg shadow p-4 md:p-6">
                            <h3 className="font-semibold text-sm md:text-base mb-4">💰 Salary Range</h3>
                            <div className="space-y-3">
                                <div>
                                    <div className="flex justify-between text-xs mb-1"><span>₱0 - ₱20k</span><span>{employees.filter(e => Number(e.salary) <= 20000).length}</span></div>
                                    <div className="w-full bg-gray-200 rounded-full h-2"><div className="bg-blue-500 h-2 rounded-full" style={{width: employees.length > 0 ? (employees.filter(e => Number(e.salary) <= 20000).length / employees.length * 100) + '%' : '0%'}}></div></div>
                                </div>
                                <div>
                                    <div className="flex justify-between text-xs mb-1"><span>₱20k - ₱50k</span><span>{employees.filter(e => Number(e.salary) > 20000 && Number(e.salary) <= 50000).length}</span></div>
                                    <div className="w-full bg-gray-200 rounded-full h-2"><div className="bg-green-500 h-2 rounded-full" style={{width: employees.length > 0 ? (employees.filter(e => Number(e.salary) > 20000 && Number(e.salary) <= 50000).length / employees.length * 100) + '%' : '0%'}}></div></div>
                                </div>
                                <div>
                                    <div className="flex justify-between text-xs mb-1"><span>₱50k - ₱100k</span><span>{employees.filter(e => Number(e.salary) > 50000 && Number(e.salary) <= 100000).length}</span></div>
                                    <div className="w-full bg-gray-200 rounded-full h-2"><div className="bg-orange-500 h-2 rounded-full" style={{width: employees.length > 0 ? (employees.filter(e => Number(e.salary) > 50000 && Number(e.salary) <= 100000).length / employees.length * 100) + '%' : '0%'}}></div></div>
                                </div>
                                <div>
                                    <div className="flex justify-between text-xs mb-1"><span>₱100k+</span><span>{employees.filter(e => Number(e.salary) > 100000).length}</span></div>
                                    <div className="w-full bg-gray-200 rounded-full h-2"><div className="bg-purple-500 h-2 rounded-full" style={{width: employees.length > 0 ? (employees.filter(e => Number(e.salary) > 100000).length / employees.length * 100) + '%' : '0%'}}></div></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}