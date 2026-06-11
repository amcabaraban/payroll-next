'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';

const LEAVE_TYPES = {
    VL: { label: 'Vacation Leave', max: 10, color: 'bg-blue-100 text-blue-700' },
    SL: { label: 'Sick Leave', max: 5, color: 'bg-red-100 text-red-700' },
    EL: { label: 'Emergency Leave', max: 5, color: 'bg-orange-100 text-orange-700' },
    BL: { label: 'Birthday Leave', max: 1, color: 'bg-purple-100 text-purple-700' },
};

export default function LeavesPage() {
    const [user, setUser] = useState(null);
    const [employees, setEmployees] = useState([]);
    const [leaves, setLeaves] = useState([]);
    const [credits, setCredits] = useState(null);
    const [allCredits, setAllCredits] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [editingLeave, setEditingLeave] = useState(null);
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const [showLeaveModal, setShowLeaveModal] = useState(false);

    // Filters
    const [filterStatus, setFilterStatus] = useState('');
    const [filterEmployee, setFilterEmployee] = useState('');
    const [filterDateFrom, setFilterDateFrom] = useState('');
    const [filterDateTo, setFilterDateTo] = useState('');

    const [form, setForm] = useState({
        user_id: '', full_name: '', leave_type: 'VL',
        date_from: '', date_to: '', days: 1, reason: '',
    });

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (!userData) { router.push('/login'); return; }
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        
        if (parsedUser.role === 'employee') {
            fetchCredits(parsedUser.id);
            setForm(prev => ({ ...prev, user_id: parsedUser.id.toString(), full_name: parsedUser.name }));
            // Auto-load sariling leaves
            fetch(`/api/leaves?user_id=${parsedUser.id}`).then(r => r.json()).then(d => {
                if (d.success) setLeaves(d.data);
            });
            // Auto-set filter to self
            setFilterEmployee(parsedUser.id.toString());
        } else {
            fetchEmployees();
        }
    }, []);

    useEffect(() => {
        if (user && user.role === 'employee') {
            fetch(`/api/leaves?user_id=${user.id}`).then(r => r.json()).then(d => {
                if (d.success) setLeaves(d.data);
            });
        }
    }, [user]);

    useEffect(() => {
        if (user && (user.role === 'admin' || user.role === 'hr') && (filterStatus || filterEmployee || filterDateFrom || filterDateTo)) {
            let url = '/api/leaves';
            const params = [];
            if (filterEmployee) params.push(`user_id=${filterEmployee}`);
            if (params.length) url += '?' + params.join('&');
            
            fetch(url).then(r => r.json()).then(d => {
                if (d.success) setLeaves(d.data);
            });
        }
    }, [filterEmployee, filterStatus, filterDateFrom, filterDateTo, user]);

    useEffect(() => {
        if (filterEmployee) {
            fetchCredits(filterEmployee);
        }
    }, [filterEmployee]);

    const fetchEmployees = async () => {
        const res = await fetch('/api/employees');
        const data = await res.json();
        if (data.success) setEmployees(data.data);
    };

    const fetchCredits = async (userId) => {
        if (!userId) return;
        const res = await fetch(`/api/leaves/credits?user_id=${userId}`);
        const data = await res.json();
        if (data.success) setCredits(data.data);
    };

    const refreshLeaves = () => {
        if (user && user.role === 'employee') {
            fetch(`/api/leaves?user_id=${user.id}`).then(r => r.json()).then(d => {
                if (d.success) setLeaves(d.data);
            });
        }
    };

    const handleEmployeeSelect = (e) => {
        const empId = e.target.value;
        const emp = employees.find(em => em.id == empId);
        setForm(prev => ({ ...prev, user_id: empId, full_name: emp?.full_name || '' }));
        fetchCredits(empId);
    };

    const calculateDays = (from, to) => {
        if (!from || !to) return 0;
        const start = new Date(from);
        const end = new Date(to);
        let count = 0;
        const current = new Date(start);
        while (current <= end) {
            if (current.getDay() !== 0) count++;
            current.setDate(current.getDate() + 1);
        }
        return count;
    };

    const handleDateChange = (field, value) => {
        const newForm = { ...form, [field]: value };
        newForm.days = calculateDays(
            field === 'date_from' ? value : newForm.date_from,
            field === 'date_to' ? value : newForm.date_to
        );
        setForm(newForm);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.user_id || !form.date_from || !form.date_to) {
            setMessage('❌ Please fill all required fields');
            return;
        }
        setLoading(true);
        try {
            if (editingLeave) {
                const res = await fetch('/api/leaves', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: editingLeave.id, action: 'update', ...form }),
                });
                const data = await res.json();
                if (data.success) { setMessage('✅ Leave updated!'); setEditingLeave(null); }
                else setMessage('❌ ' + data.message);
            } else {
                const res = await fetch('/api/leaves', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
                const data = await res.json();
                if (data.success) setMessage('✅ Leave applied!');
                else setMessage('❌ ' + data.message);
            }
            setShowModal(false);
            refreshLeaves();
            if (form.user_id) fetchCredits(form.user_id);
            setForm({ user_id: form.user_id, full_name: form.full_name, leave_type: 'VL', date_from: '', date_to: '', days: 1, reason: '' });
        } catch (err) { setMessage('❌ Network error'); }
        setLoading(false);
        setTimeout(() => setMessage(''), 3000);
    };

    const handleEdit = (leave) => {
        setEditingLeave(leave);
        setForm({ user_id: leave.user_id.toString(), full_name: leave.full_name, leave_type: leave.leave_type, date_from: leave.date_from, date_to: leave.date_to, days: leave.days, reason: leave.reason || '' });
        setShowModal(true);
    };

    const handleApprove = async (id) => {
        const res = await fetch('/api/leaves', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status: 'approved' }) });
        const data = await res.json();
        if (data.success) { setMessage('✅ Leave approved!'); refreshLeaves(); }
        setTimeout(() => setMessage(''), 3000);
    };

    const handleReject = async (id) => {
        const res = await fetch('/api/leaves', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status: 'rejected' }) });
        const data = await res.json();
        if (data.success) { setMessage('❌ Leave rejected'); refreshLeaves(); }
        setTimeout(() => setMessage(''), 3000);
    };

    const handleCancel = async (id) => {
        if (!confirm('Are you sure?')) return;
        const res = await fetch('/api/leaves', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action: 'cancel' }) });
        const data = await res.json();
        if (data.success) { setMessage('❌ Leave cancelled'); refreshLeaves(); }
        setTimeout(() => setMessage(''), 3000);
    };

    const handlePrintLeaves = () => {
        const employeeName = filterEmployee ? employees.find(e => e.id == filterEmployee)?.full_name : 'All Employees';
        const statusText = filterStatus || 'All';
        
        // Get credits if single employee selected
        const empCredits = filterEmployee ? credits : null;
        
        const printWindow = window.open('', '_blank', 'width=1000,height=600');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Leave Records - ${employeeName}</title>
                <style>
                    body { font-family: Arial; padding: 20px; font-size: 11px; }
                    h2 { margin-block-end: 3px; }
                    p { margin: 0 0 15px 0; color: #666; font-size: 11px; }
                    table { inline-size: 100%; border-collapse: collapse; margin-block-end: 15px; }
                    th { background: #f3f4f6; padding: 6px; border: 1px solid #ddd; text-align: start; }
                    td { padding: 5px; border: 1px solid #ddd; }
                    .credits { display: flex; gap: 15px; margin-block-end: 15px; }
                    .credit-box { border: 1px solid #ddd; padding: 8px 12px; border-radius: 4px; text-align: center; }
                    .credit-box .label { font-size: 9px; color: #666; }
                    .credit-box .value { font-size: 16px; font-weight: bold; }
                    .approved { color: green; font-weight: bold; }
                    .rejected { color: red; }
                    .cancelled { color: gray; }
                    .pending { color: orange; }
                    @media print { body { padding: 10px; } }
                </style>
            </head>
            <body>
                <h2>Leave Records</h2>
                <p>Employee: ${employeeName} | Status: ${statusText} | Date: ${filterDateFrom || 'All'} - ${filterDateTo || 'All'}</p>
                
                ${empCredits ? `
                <h3>Leave Credits</h3>
                <div class="credits">
                    <div class="credit-box">
                        <div class="label">Vacation Leave</div>
                        <div class="value">${(empCredits.vl_total || 0) - (empCredits.vl_used || 0)} / ${empCredits.vl_total || 0}</div>
                    </div>
                    <div class="credit-box">
                        <div class="label">Sick Leave</div>
                        <div class="value">${(empCredits.sl_total || 0) - (empCredits.sl_used || 0)} / ${empCredits.sl_total || 0}</div>
                    </div>
                    <div class="credit-box">
                        <div class="label">Emergency Leave</div>
                        <div class="value">${(empCredits.el_total || 0) - (empCredits.el_used || 0)} / ${empCredits.el_total || 0}</div>
                    </div>
                    <div class="credit-box">
                        <div class="label">Birthday Leave</div>
                        <div class="value">${(empCredits.bl_total || 0) - (empCredits.bl_used || 0)} / ${empCredits.bl_total || 0}</div>
                    </div>
                </div>
                ` : ''}
                
                <table>
                    <thead>
                        <tr>
                            <th>Employee</th>
                            <th>Type</th>
                            <th>Date From</th>
                            <th>Date To</th>
                            <th>Days</th>
                            <th>Reason</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filteredLeaves.map(l => `
                            <tr>
                                <td>${l.full_name}</td>
                                <td>${l.leave_type}</td>
                                <td>${formatDate(l.date_from)}</td>
                                <td>${formatDate(l.date_to)}</td>
                                <td>${l.days}</td>
                                <td>${l.reason || '-'}</td>
                                <td class="${l.status}">${l.status.toUpperCase()}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <script>window.print(); window.close();</script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

    // Filter leaves
    const filteredLeaves = leaves.filter(l => {
        if (filterStatus && l.status !== filterStatus) return false;
        if (filterEmployee && l.user_id != filterEmployee) return false;
        if (filterDateFrom && l.date_from < filterDateFrom) return false;
        if (filterDateTo && l.date_to > filterDateTo) return false;
        return true;
    });

    if (!user) return null;

    return (
        <div className="flex min-h-screen bg-gray-100">
            <Sidebar user={user} />
            <div className="flex-1">
                <header className="bg-white shadow-sm p-4 flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-gray-700">🏖️ Leave Management</h2>
                    <div className="flex gap-2">
                        {(filterStatus || filterEmployee || filterDateFrom || filterDateTo) && (
                            <button onClick={handlePrintLeaves}
                                className="bg-gray-600 text-white px-4 py-2 rounded text-sm hover:bg-gray-700 no-print">
                                🖨️ Print
                            </button>
                        )}
                        <button onClick={() => setShowLeaveModal(true)} 
                            className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">
                            + Apply Leave
                        </button>
                    </div>
                </header>

                <main className="p-6">
                    {message && (
                        <div className={`px-4 py-3 rounded mb-4 ${message.includes('✅') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{message}</div>
                    )}

                    {/* Personal Leave Credits */}
                    {credits && (
                        <div className="grid grid-cols-4 gap-4 mb-6">
                            {Object.entries(LEAVE_TYPES).map(([key, val]) => (
                                <div key={key} className="bg-white rounded-lg shadow p-4">
                                    <p className="text-xs text-gray-500">{val.label} ({key})</p>
                                    <div className="flex items-end gap-2 mt-1">
                                        <p className="text-2xl font-bold">
                                            {Math.max(0, (credits[`${key.toLowerCase()}_total`] || 0) - (credits[`${key.toLowerCase()}_used`] || 0))}
                                        </p>
                                        <p className="text-sm text-gray-400">/ {credits[`${key.toLowerCase()}_total`] || 0}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Filters - Admin/HR only */}
                    {(user?.role === 'admin' || user?.role === 'hr') && (
                    <div className="bg-white rounded-lg shadow p-4 mb-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Employee</label>
                                <select value={filterEmployee} onChange={(e) => {
                                        setFilterEmployee(e.target.value);
                                        if (e.target.value === '') {
                                            setLeaves([]);
                                            setCredits(null);
                                            setFilterStatus('');
                                            setFilterDateFrom('');
                                            setFilterDateTo('');
                                        }
                                    }} className="w-full text-xs border rounded p-1.5">
                                    <option value="">Select Employees</option>
                                    {employees.map(emp => (<option key={emp.id} value={emp.id}>{emp.full_name}</option>))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Status</label>
                                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full text-xs border rounded p-1.5">
                                    <option value="">All Status</option>
                                    <option value="pending">Pending</option>
                                    <option value="approved">Approved</option>
                                    <option value="rejected">Rejected</option>
                                    <option value="cancelled">Cancelled</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Date From</label>
                                <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} className="w-full text-xs border rounded p-1.5" />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Date To</label>
                                <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} className="w-full text-xs border rounded p-1.5" />
                            </div>
                        </div>
                        {(filterStatus || filterEmployee || filterDateFrom || filterDateTo) && (
                            <button onClick={() => { setFilterStatus(''); setFilterEmployee(''); setFilterDateFrom(''); setFilterDateTo(''); }}
                                className="mt-2 text-xs text-red-500 hover:underline">Clear Filters</button>
                        )}
                    </div>
                    )}

                    {/* Leaves Table */}
                    {(user?.role === 'employee' || filterStatus || filterEmployee || filterDateFrom || filterDateTo) ? (
                        <div className="bg-white rounded-lg shadow overflow-hidden">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="p-3 text-left text-xs uppercase text-gray-500">Employee</th>
                                        <th className="p-3 text-left text-xs uppercase text-gray-500">Type</th>
                                        <th className="p-3 text-left text-xs uppercase text-gray-500">Date</th>
                                        <th className="p-3 text-center text-xs uppercase text-gray-500">Days</th>
                                        <th className="p-3 text-left text-xs uppercase text-gray-500">Reason</th>
                                        <th className="p-3 text-center text-xs uppercase text-gray-500">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredLeaves.length === 0 ? (
                                        <tr><td colSpan="6" className="text-center p-8 text-gray-400">No leaves found</td></tr>
                                    ) : (
                                        filteredLeaves.map(l => (
                                            <tr key={l.id} className="border-b">
                                                <td className="p-3 text-sm">{l.full_name}</td>
                                                <td className="p-3">
                                                    <span className={`px-2 py-1 rounded text-xs ${LEAVE_TYPES[l.leave_type]?.color || 'bg-gray-100'}`}>{l.leave_type}</span>
                                                </td>
                                                <td className="p-3 text-sm">{formatDate(l.date_from)} - {formatDate(l.date_to)}</td>
                                                <td className="p-3 text-center text-sm">{l.days}</td>
                                                <td className="p-3 text-sm text-gray-500">{l.reason || '-'}</td>
                                                <td className="p-3 text-center">
                                                    <span className={`px-2 py-1 rounded text-xs ${
                                                        l.status === 'approved' ? 'bg-green-100 text-green-700' :
                                                        l.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                                        l.status === 'cancelled' ? 'bg-gray-100 text-gray-700' :
                                                        'bg-yellow-100 text-yellow-700'}`}>{l.status}</span>
                                                    
                                                    {(user?.role === 'admin' || user?.role === 'hr') && l.status === 'pending' && (
                                                        <div className="flex gap-1 mt-1 justify-center">
                                                            <button onClick={() => handleApprove(l.id)} className="text-xs bg-green-500 text-white px-2 py-0.5 rounded hover:bg-green-600">✅</button>
                                                            <button onClick={() => handleReject(l.id)} className="text-xs bg-red-500 text-white px-2 py-0.5 rounded hover:bg-red-600">❌</button>
                                                        </div>
                                                    )}
                                                    {l.status === 'pending' && (
                                                        <div className="flex gap-1 mt-1 justify-center">
                                                            <button onClick={() => handleEdit(l)} className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded hover:bg-blue-600">✏️</button>
                                                            <button onClick={() => handleCancel(l.id)} className="text-xs bg-gray-500 text-white px-2 py-0.5 rounded hover:bg-gray-600">Cancel</button>
                                                        </div>
                                                    )}
                                                    {(user?.role === 'admin' || user?.role === 'hr') && l.status === 'approved' && (
                                                        <button onClick={() => handleCancel(l.id)} className="text-xs bg-gray-500 text-white px-2 py-0.5 rounded hover:bg-gray-600 mt-1">Cancel</button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-400">
                            👆 Use filters above to search leaves
                        </div>
                    )}
                    {/* Apply Leave Modal */}
                    {showLeaveModal && (
                        <div className="fixed inset-0 flex items-center justify-center z-50">
                            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
                                <h3 className="text-lg font-semibold mb-4">➕ Apply Leave</h3>
                                
                                <form onSubmit={async (e) => {
                                    e.preventDefault();
                                    if (!form.user_id || !form.date_from || !form.date_to) {
                                        setMessage('❌ Please fill all required fields');
                                        return;
                                    }
                                    setLoading(true);
                                    try {
                                        const res = await fetch('/api/leaves', { 
                                            method: 'POST', 
                                            headers: { 'Content-Type': 'application/json' }, 
                                            body: JSON.stringify(form) 
                                        });
                                        const data = await res.json();
                                        if (data.success) {
                                            setMessage('✅ Leave applied!');
                                            setShowLeaveModal(false);
                                            refreshLeaves();
                                            if (form.user_id) fetchCredits(form.user_id);
                                            setForm({ user_id: form.user_id, full_name: form.full_name, leave_type: 'VL', date_from: '', date_to: '', days: 1, reason: '' });
                                        } else {
                                            setMessage('❌ ' + data.message);
                                        }
                                    } catch (err) { 
                                        setMessage('❌ Network error'); 
                                    }
                                    setLoading(false);
                                    setTimeout(() => setMessage(''), 3000);
                                }} className="space-y-4">
                                    
                                    {/* Employee Select (for admin/HR) */}
                                    {(user?.role === 'admin' || user?.role === 'hr') && (
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Employee *</label>
                                            <select value={form.user_id} onChange={handleEmployeeSelect} className="w-full border rounded p-2" required>
                                                <option value="">Select Employee</option>
                                                {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.full_name}</option>)}
                                            </select>
                                        </div>
                                    )}
                                    
                                    {/* Leave Type */}
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Leave Type *</label>
                                        <select value={form.leave_type} onChange={(e) => setForm({...form, leave_type: e.target.value})} className="w-full border rounded p-2">
                                            {Object.entries(LEAVE_TYPES).map(([key, val]) => (
                                                <option key={key} value={key}>{val.label} ({key})</option>
                                            ))}
                                        </select>
                                    </div>
                                    
                                    {/* Dates */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Date From *</label>
                                            <input type="date" value={form.date_from} onChange={(e) => handleDateChange('date_from', e.target.value)} className="w-full border rounded p-2" required />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Date To *</label>
                                            <input type="date" value={form.date_to} onChange={(e) => handleDateChange('date_to', e.target.value)} className="w-full border rounded p-2" required />
                                        </div>
                                    </div>
                                    
                                    {/* Days (auto-calculated) */}
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Days</label>
                                        <input type="number" value={form.days} readOnly className="w-full border rounded p-2 bg-gray-50" />
                                    </div>
                                    
                                    {/* Reason */}
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Reason</label>
                                        <textarea value={form.reason} onChange={(e) => setForm({...form, reason: e.target.value})} className="w-full border rounded p-2" rows="3" placeholder="Optional reason for leave..." />
                                    </div>
                                    
                                    {/* Buttons */}
                                    <div className="flex gap-3 justify-end pt-4 border-t">
                                        <button type="button" onClick={() => setShowLeaveModal(false)} className="px-4 py-2 border rounded hover:bg-gray-50">Cancel</button>
                                        <button type="submit" disabled={loading} className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50">
                                            {loading ? '⏳ Applying...' : '✅ Submit Leave'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}