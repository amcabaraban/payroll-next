'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';

export default function DashboardPage() {
    const [user, setUser] = useState(null);
    const [employees, setEmployees] = useState([]);
    const [myPayslips, setMyPayslips] = useState([]);
    const [search, setSearch] = useState('');
    const [filterRole, setFilterRole] = useState('');
    const [filterDept, setFilterDept] = useState('');
    const router = useRouter();

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (!userData) { router.push('/login'); return; }
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        
        if (parsedUser.role === 'admin' || parsedUser.role === 'hr') {
            loadEmployees();
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

    const fetchEmployees = async () => {
        try {
            const params = new URLSearchParams();
            if (search) params.append('search', search);
            if (filterRole) params.append('role', filterRole);
            if (filterDept) params.append('department', filterDept);
            const res = await fetch(`/api/employees?${params.toString()}`);
            const data = await res.json();
            if (data.success) setEmployees(data.data);
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

    if (!user) return null;

    // EMPLOYEE VIEW
    if (user.role === 'employee') {
        return (
            <div className="flex flex-col lg:flex-row min-h-screen bg-gray-100">
                <Sidebar user={user} />
                <div className="flex-1 w-full">
                    <header className="bg-white shadow-sm p-4">
                        <h2 className="text-lg font-semibold text-gray-700">
                            Welcome, {user.name}!
                        </h2>
                    </header>
                    <main className="p-4 md:p-6">
                        {/* Quick Links */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-6">
                            <button onClick={() => router.push('/dashboard/attendance')}
                                className="bg-white rounded-lg shadow p-4 md:p-6 hover:shadow-md transition text-center">
                                <span className="text-2xl md:text-3xl">📋</span>
                                <p className="font-semibold mt-2 text-sm md:text-base">My DTR</p>
                                <p className="text-xs text-gray-400 hidden sm:block">View Attendance</p>
                            </button>
                            <button onClick={() => router.push('/dashboard/payslip')}
                                className="bg-white rounded-lg shadow p-4 md:p-6 hover:shadow-md transition text-center">
                                <span className="text-2xl md:text-3xl">📄</span>
                                <p className="font-semibold mt-2 text-sm md:text-base">My Payslips</p>
                                <p className="text-xs text-gray-400 hidden sm:block">View Salary</p>
                            </button>
                            <div className="bg-white rounded-lg shadow p-4 md:p-6 text-center">
                                <span className="text-2xl md:text-3xl">👤</span>
                                <p className="font-semibold mt-2 text-sm md:text-base">My Profile</p>
                                <p className="text-xs text-gray-400 truncate">{user.email}</p>
                            </div>
                        </div>

                        {/* Recent Payslips */}
                        <div className="bg-white rounded-lg shadow overflow-hidden">
                            <div className="p-4 border-b">
                                <h3 className="font-semibold">📄 Recent Payslips</h3>
                            </div>
                            {myPayslips.length === 0 ? (
                                <div className="p-8 text-center text-gray-400">No payslips yet</div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-[500px]">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="p-2 md:p-3 text-left text-xs uppercase text-gray-500">Period</th>
                                                <th className="p-2 md:p-3 text-right text-xs uppercase text-gray-500">Gross Pay</th>
                                                <th className="p-2 md:p-3 text-right text-xs uppercase text-gray-500">Deductions</th>
                                                <th className="p-2 md:p-3 text-right text-xs uppercase text-gray-500">Net Pay</th>
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
        <div className="flex flex-col lg:flex-row min-h-screen bg-gray-100">
            <Sidebar user={user} />
            <div className="flex-1 w-full">
                <header className="bg-white shadow-sm p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <h2 className="text-lg font-semibold text-gray-700">
                        Welcome back, {user.name?.split(' ')[0]}!
                    </h2>
                </header>

                <main className="p-4 md:p-6">
                    {/* Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4 mb-6">
                        <div className="bg-white rounded-lg shadow p-3 md:p-4">
                            <p className="text-gray-500 text-xs md:text-sm">Total Employees</p>
                            <p className="text-xl md:text-2xl font-bold text-gray-800">{employees.length}</p>
                        </div>
                        <div className="bg-white rounded-lg shadow p-3 md:p-4">
                            <p className="text-gray-500 text-xs md:text-sm">Admins</p>
                            <p className="text-xl md:text-2xl font-bold text-gray-800">{employees.filter(e => e.role === 'admin').length}</p>
                        </div>
                        <div className="bg-white rounded-lg shadow p-3 md:p-4">
                            <p className="text-gray-500 text-xs md:text-sm">Departments</p>
                            <p className="text-xl md:text-2xl font-bold text-gray-800">{new Set(employees.map(e => e.department)).size}</p>
                        </div>
                    </div>

                    {/* Search & Filter */}
                    <div className="bg-white rounded-lg shadow p-3 md:p-4 mb-4">
                        <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
                            <input type="text" placeholder="🔍 Search..." value={search}
                                onChange={(e) => { setSearch(e.target.value); fetchEmployees(); }}
                                className="flex-1 border rounded px-3 py-2 text-sm w-full" />
                            <select value={filterRole} onChange={(e) => { setFilterRole(e.target.value); fetchEmployees(); }}
                                className="border rounded px-3 py-2 text-sm">
                                <option value="">All Roles</option>
                                <option value="admin">Admin</option>
                                <option value="hr">HR</option>
                                <option value="employee">Employee</option>
                            </select>
                        </div>
                    </div>

                    {/* Add Button */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
                        <p className="text-sm text-gray-500">Showing {employees.length} employees</p>
                        <button onClick={() => router.push('/dashboard/add-employee')}
                            className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 w-full sm:w-auto text-center">
                            + Add Employee
                        </button>
                    </div>

                    {/* Employee Table */}
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[600px]">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="text-left p-2 md:p-3 text-xs font-medium text-gray-500 uppercase">ID</th>
                                        <th className="text-left p-2 md:p-3 text-xs font-medium text-gray-500 uppercase">Name</th>
                                        <th className="text-left p-2 md:p-3 text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Email</th>
                                        <th className="text-left p-2 md:p-3 text-xs font-medium text-gray-500 uppercase">Role</th>
                                        <th className="text-left p-2 md:p-3 text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Dept</th>
                                        <th className="text-right p-2 md:p-3 text-xs font-medium text-gray-500 uppercase">Salary</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {employees.length === 0 ? (
                                        <tr><td colSpan="6" className="text-center p-8 text-gray-400">No employees found</td></tr>
                                    ) : (
                                        employees.map((emp) => (
                                            <tr key={emp.id} className="border-b hover:bg-gray-50">
                                                <td className="p-2 md:p-3 text-sm text-gray-500">#{emp.id}</td>
                                                <td className="p-2 md:p-3 text-sm font-medium">{emp.full_name}</td>
                                                <td className="p-2 md:p-3 text-sm text-gray-500 hidden md:table-cell">{emp.email}</td>
                                                <td className="p-2 md:p-3">
                                                    <span className={`px-2 py-1 rounded text-xs capitalize ${
                                                        emp.role === 'admin' ? 'bg-red-100 text-red-700' :
                                                        emp.role === 'hr' ? 'bg-blue-100 text-blue-700' :
                                                        'bg-green-100 text-green-700'
                                                    }`}>{emp.role}</span>
                                                </td>
                                                <td className="p-2 md:p-3 text-sm hidden sm:table-cell">{emp.department_name || emp.department || '-'}</td>
                                                <td className="p-2 md:p-3 text-sm text-right font-medium">₱{Number(emp.salary).toLocaleString()}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}