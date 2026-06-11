'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';

export default function LoansPage() {
    const [user, setUser] = useState(null);
    const [employees, setEmployees] = useState([]);
    const [loans, setLoans] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showPayModal, setShowPayModal] = useState(false);
    const [selectedLoan, setSelectedLoan] = useState(null);
    const [message, setMessage] = useState('');
    const router = useRouter();

    const [form, setForm] = useState({
        user_id: '', full_name: '', loan_type: 'SSS',
        loan_amount: '', monthly_amortization: '', total_months: '', start_date: ''
    });

    const [payForm, setPayForm] = useState({
        loan_id: '', amount: '', payment_date: new Date().toISOString().split('T')[0], month_number: ''
    });

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (!userData) { router.push('/login'); return; }
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        fetchEmployees();
        fetchLoans();
    }, []);

    const fetchEmployees = async () => {
        const res = await fetch('/api/employees');
        const data = await res.json();
        if (data.success) setEmployees(data.data);
    };

    const fetchLoans = async () => {
        const res = await fetch('/api/loans');
        const data = await res.json();
        if (data.success) setLoans(data.data);
    };

    const handleAddLoan = async (e) => {
        e.preventDefault();
        const emp = employees.find(em => em.id == form.user_id);
        const res = await fetch('/api/loans', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...form, full_name: emp?.full_name || '' }),
        });
        const data = await res.json();
        if (data.success) {
            setMessage('✅ Loan added!');
            setShowAddModal(false);
            setForm({ user_id: '', full_name: '', loan_type: 'SSS', loan_amount: '', monthly_amortization: '', total_months: '', start_date: '' });
            fetchLoans();
        }
        setTimeout(() => setMessage(''), 3000);
    };

    const handlePayment = async (e) => {
        e.preventDefault();
        const res = await fetch('/api/loans', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payForm),
        });
        const data = await res.json();
        if (data.success) {
            setMessage('✅ Payment recorded!');
            setShowPayModal(false);
            setPayForm({ loan_id: '', amount: '', payment_date: new Date().toISOString().split('T')[0], month_number: '' });
            fetchLoans();
        }
        setTimeout(() => setMessage(''), 3000);
    };

    const formatPHP = (amount) => '₱' + Number(amount).toLocaleString('en-PH', { minimumFractionDigits: 2 });
    const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

    if (!user) return null;

    return (
        <div className="flex min-h-screen bg-gray-100">
            <Sidebar user={user} />
            <div className="flex-1">
                <header className="bg-white shadow-sm p-4 flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-gray-700">💰 Loan Management</h2>
                    <button onClick={() => setShowAddModal(true)}
                        className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">
                        + Add Loan
                    </button>
                </header>

                <main className="p-6">
                    {message && <div className="bg-green-100 text-green-700 px-4 py-3 rounded mb-4">{message}</div>}

                    {/* Loans Table */}
                    <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="p-3 text-left">Employee</th>
                                    <th className="p-3 text-left">Type</th>
                                    <th className="p-3 text-right">Amount</th>
                                    <th className="p-3 text-right">Monthly</th>
                                    <th className="p-3 text-center">Progress</th>
                                    <th className="p-3 text-right">Balance</th>
                                    <th className="p-3 text-center">Status</th>
                                    <th className="p-3 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loans.length === 0 ? (
                                    <tr><td colSpan="8" className="text-center p-8 text-gray-400">No loans yet</td></tr>
                                ) : (
                                    loans.map(loan => (
                                        <tr key={loan.id} className="border-b">
                                            <td className="p-3 font-medium">{loan.full_name}</td>
                                            <td className="p-3">
                                                <span className={`px-2 py-1 rounded text-xs ${loan.loan_type === 'SSS' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                                                    {loan.loan_type}
                                                </span>
                                            </td>
                                            <td className="p-3 text-right">{formatPHP(loan.loan_amount)}</td>
                                            <td className="p-3 text-right">{formatPHP(loan.monthly_amortization)}</td>
                                            <td className="p-3 text-center">{loan.months_paid}/{loan.total_months}</td>
                                            <td className="p-3 text-right font-medium">{formatPHP(loan.balance)}</td>
                                            <td className="p-3 text-center">
                                                <span className={`px-2 py-1 rounded text-xs ${loan.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                    {loan.status}
                                                </span>
                                            </td>
                                            <td className="p-3 text-center">
                                                {loan.status !== 'paid' && (
                                                    <button onClick={() => { setSelectedLoan(loan); setPayForm({ loan_id: loan.id, amount: loan.monthly_amortization, payment_date: new Date().toISOString().split('T')[0], month_number: loan.months_paid + 1 }); setShowPayModal(true); }}
                                                        className="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600">
                                                        💰 Pay
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Add Loan Modal */}
                    {showAddModal && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
                                <h3 className="text-lg font-semibold mb-4">➕ Add Loan</h3>
                                <form onSubmit={handleAddLoan} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Employee *</label>
                                        <select value={form.user_id} onChange={(e) => setForm({...form, user_id: e.target.value})} className="w-full border rounded p-2" required>
                                            <option value="">Select Employee</option>
                                            {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.full_name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Loan Type *</label>
                                        <select value={form.loan_type} onChange={(e) => setForm({...form, loan_type: e.target.value})} className="w-full border rounded p-2">
                                            <option value="SSS">SSS Loan</option>
                                            <option value="PAGIBIG">Pag-IBIG Loan</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Loan Amount *</label>
                                        <input type="number" value={form.loan_amount} onChange={(e) => setForm({...form, loan_amount: e.target.value})} className="w-full border rounded p-2" required />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Monthly Amortization *</label>
                                        <input type="number" value={form.monthly_amortization} onChange={(e) => setForm({...form, monthly_amortization: e.target.value})} className="w-full border rounded p-2" required />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Total Months *</label>
                                        <input type="number" value={form.total_months} onChange={(e) => setForm({...form, total_months: e.target.value})} className="w-full border rounded p-2" required />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Start Date *</label>
                                        <input type="date" value={form.start_date} onChange={(e) => setForm({...form, start_date: e.target.value})} className="w-full border rounded p-2" required />
                                    </div>
                                    <div className="flex gap-3 justify-end pt-4 border-t">
                                        <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 border rounded hover:bg-gray-50">Cancel</button>
                                        <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">Save</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* Pay Modal */}
                    {showPayModal && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
                                <h3 className="text-lg font-semibold mb-4">💰 Record Payment</h3>
                                <p className="text-sm text-gray-500 mb-4">{selectedLoan?.full_name} - {selectedLoan?.loan_type} Loan</p>
                                <form onSubmit={handlePayment} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Amount *</label>
                                        <input type="number" value={payForm.amount} onChange={(e) => setPayForm({...payForm, amount: e.target.value})} className="w-full border rounded p-2" required />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Payment Date *</label>
                                        <input type="date" value={payForm.payment_date} onChange={(e) => setPayForm({...payForm, payment_date: e.target.value})} className="w-full border rounded p-2" required />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Month #</label>
                                        <input type="number" value={payForm.month_number} onChange={(e) => setPayForm({...payForm, month_number: e.target.value})} className="w-full border rounded p-2" required />
                                    </div>
                                    <div className="flex gap-3 justify-end pt-4 border-t">
                                        <button type="button" onClick={() => setShowPayModal(false)} className="px-4 py-2 border rounded hover:bg-gray-50">Cancel</button>
                                        <button type="submit" className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700">Record Payment</button>
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