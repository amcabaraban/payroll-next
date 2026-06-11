'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';

export default function ViolationsPage() {
    const [user, setUser] = useState(null);
    const [employees, setEmployees] = useState([]);
    const [violations, setViolations] = useState([]);
    const [summary, setSummary] = useState([]);
    const [selectedEmp, setSelectedEmp] = useState('');
    const [filterEmployee, setFilterEmployee] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const router = useRouter();

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (!userData) { router.push('/login'); return; }
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        fetchEmployees();
        
        if (parsedUser.role === 'employee') {
            setFilterEmployee(parsedUser.id.toString());
            fetchViolations(parsedUser.id);
            fetchSummary(parsedUser.id);
        } else {
            fetchViolations();
            fetchSummary();
        }
    }, []);

    const fetchEmployees = async () => {
        const res = await fetch('/api/employees');
        const data = await res.json();
        if (data.success) setEmployees(data.data);
    };

    const fetchViolations = async (userId) => {
        let url = '/api/violations';
        if (userId) url += `?user_id=${userId}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.success) setViolations(data.data);
    };

    const fetchSummary = async (userId) => {
        let url = '/api/violations';
        if (userId) url += `?user_id=${userId}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.success) {
            // Group by user
            const grouped = {};
            data.data.forEach(v => {
                if (!grouped[v.user_id]) {
                    grouped[v.user_id] = { user_id: v.user_id, full_name: v.full_name, count: 0, last_action: '' };
                }
                grouped[v.user_id].count++;
                grouped[v.user_id].last_action = v.action_taken;
            });
            setSummary(Object.values(grouped));
        }
    };

    const handleFilterChange = (empId) => {
        setFilterEmployee(empId);
        if (empId) {
            fetchViolations(empId);
            fetchSummary(empId);
        } else {
            fetchViolations();
            fetchSummary();
        }
    };

    const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

    const getActionColor = (action) => {
        if (action === 'termination') return 'bg-red-600 text-white';
        if (action === 'suspension') return 'bg-orange-500 text-white';
        if (action === 'warning') return 'bg-yellow-500 text-white';
        return 'bg-gray-100 text-gray-700';
    };

    const getStatusColor = (count) => {
        if (count >= 3) return 'bg-red-100 text-red-700';
        if (count >= 2) return 'bg-orange-100 text-orange-700';
        if (count >= 1) return 'bg-yellow-100 text-yellow-700';
        return 'bg-green-100 text-green-700';
    };

    const getStatusText = (count) => {
        if (count >= 3) return '🔴 Termination';
        if (count >= 2) return '🟠 Suspension';
        if (count >= 1) return '🟡 Warning';
        return '🟢 Clear';
    };

    // Filter by employee if selected
    const filteredViolations = filterEmployee 
        ? violations.filter(v => v.user_id == filterEmployee)
        : violations;

    const filteredSummary = filterEmployee 
        ? summary.filter(s => s.user_id == filterEmployee)
        : summary;

    if (!user) return null;

    return (
        <div className="flex min-h-screen bg-gray-100">
            <Sidebar user={user} />
            <div className="flex-1">
                <header className="bg-white shadow-sm p-4">
                    <h2 className="text-lg font-semibold text-gray-700">⚠️ Attendance Violations</h2>
                </header>

                <main className="p-6">
                    {/* Legend */}
                    <div className="bg-white rounded-lg shadow p-4 mb-6">
                        <h3 className="font-semibold mb-2">Violation Policy</h3>
                        <div className="flex gap-6 text-sm">
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                                <span>1st Offense: <b>Warning</b></span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-orange-500"></span>
                                <span>2nd Offense: <b>Suspension</b></span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-red-500"></span>
                                <span>3rd Offense: <b>Termination</b></span>
                            </div>
                        </div>
                    </div>

                    {/* Employee Filter */}
                    {(user?.role === 'admin' || user?.role === 'hr') && (
                        <div className="bg-white rounded-lg shadow p-4 mb-4">
                            <div className="flex items-center gap-3">
                                <label className="text-sm font-medium text-gray-600">👤 Filter by Employee:</label>
                                <select 
                                    value={filterEmployee} 
                                    onChange={(e) => handleFilterChange(e.target.value)}
                                    className="border rounded px-3 py-2 text-sm flex-1 max-w-xs"
                                >
                                    <option value="">All Employees</option>
                                    {employees.map(emp => (
                                        <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                                    ))}
                                </select>
                                {filterEmployee && (
                                    <button 
                                        onClick={() => handleFilterChange('')}
                                        className="text-xs text-red-500 hover:underline"
                                    >
                                        Clear Filter
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Employee Summary */}
                    <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
                        <div className="p-4 border-b bg-gray-50">
                            <h3 className="font-semibold">
                                📊 Employee Violation Status
                                {filterEmployee && <span className="text-sm text-gray-500 ml-2">(Filtered)</span>}
                            </h3>
                        </div>
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="p-3 text-left text-xs uppercase text-gray-500">Employee</th>
                                    <th className="p-3 text-center text-xs uppercase text-gray-500">Absences w/o Leave</th>
                                    <th className="p-3 text-center text-xs uppercase text-gray-500">Status</th>
                                    <th className="p-3 text-center text-xs uppercase text-gray-500">Last Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredSummary.length === 0 ? (
                                    <tr><td colSpan="4" className="text-center p-8 text-gray-400">No violations recorded</td></tr>
                                ) : (
                                    filteredSummary.map(s => (
                                        <tr key={s.user_id} className="border-b">
                                            <td className="p-3 text-sm font-medium">{s.full_name}</td>
                                            <td className="p-3 text-center">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${getStatusColor(s.count)}`}>
                                                    {s.count}
                                                </span>
                                            </td>
                                            <td className="p-3 text-center text-sm font-medium">{getStatusText(s.count)}</td>
                                            <td className="p-3 text-center">
                                                <span className={`px-2 py-1 rounded text-xs ${getActionColor(s.last_action)}`}>
                                                    {s.last_action}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Violations History */}
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <div className="p-4 border-b bg-gray-50">
                            <h3 className="font-semibold">
                                📋 Violation History
                                {filterEmployee && <span className="text-sm text-gray-500 ml-2">(Filtered)</span>}
                            </h3>
                        </div>
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="p-3 text-left text-xs uppercase text-gray-500">Employee</th>
                                    <th className="p-3 text-left text-xs uppercase text-gray-500">Date</th>
                                    <th className="p-3 text-center text-xs uppercase text-gray-500">Type</th>
                                    <th className="p-3 text-center text-xs uppercase text-gray-500">Action</th>
                                    <th className="p-3 text-left text-xs uppercase text-gray-500">Notes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredViolations.length === 0 ? (
                                    <tr><td colSpan="5" className="text-center p-8 text-gray-400">No violations yet</td></tr>
                                ) : (
                                    filteredViolations.map(v => (
                                        <tr key={v.id} className="border-b">
                                            <td className="p-3 text-sm">{v.full_name}</td>
                                            <td className="p-3 text-sm">{formatDate(v.date)}</td>
                                            <td className="p-3 text-center">
                                                <span className="px-2 py-1 rounded text-xs bg-red-100 text-red-700">Absent w/o Leave</span>
                                            </td>
                                            <td className="p-3 text-center">
                                                <span className={`px-2 py-1 rounded text-xs ${getActionColor(v.action_taken)}`}>
                                                    {v.action_taken}
                                                </span>
                                            </td>
                                            <td className="p-3 text-sm text-gray-500">{v.notes || '-'}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </main>
            </div>
        </div>
    );
}