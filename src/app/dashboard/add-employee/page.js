'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';

export default function AddEmployeePage() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [profileTab, setProfileTab] = useState('personal');
    const router = useRouter();
    const [departments, setDepartments] = useState([]);
    const [designations, setDesignations] = useState([]);

    const [form, setForm] = useState({
        full_name: '', email: '', password: '', role: 'employee',
        department: '', position: '', salary: '', phone: '', address: '',
        apply_tax: '1', salary_type: 'monthly',
        sss: '', philhealth_no: '', tin: '', pagibig_no: '',
        birthday: '', birthplace: '', marital_status: 'single', gender: 'Male',
        contact_no: '', emergency_contact: '',
        elementary: '', elementary_year: '', highschool: '', highschool_year: '',
        college: '', college_year: '', mother_name: '', father_name: '',
        spouse_name: '', dependents: '', skills: ''
    });

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (!userData) { router.push('/login'); return; }
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        
        if (parsedUser.role !== 'admin' && parsedUser.role !== 'hr') {
            router.push('/dashboard');
        }
        fetchDepartments();
        fetchDesignations();
    }, []);

    const fetchDepartments = async () => {
        const res = await fetch('/api/departments');
        const data = await res.json();
        if (data.success) setDepartments(data.data);
    };

    const fetchDesignations = async () => {
        const res = await fetch('/api/designations');
        const data = await res.json();
        if (data.success) setDesignations(data.data);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.full_name || !form.email || !form.password) {
            setMessage('❌ Name, email, and password are required');
            setTimeout(() => setMessage(''), 3000);
            return;
        }
        setLoading(true);
        try {
            const res = await fetch('/api/employees', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (data.success) {
                setMessage('✅ Employee added successfully!');
                setForm({
                    full_name: '', email: '', password: '', role: 'employee',
                    department: '', position: '', salary: '', phone: '', address: '',
                    apply_tax: '1', salary_type: 'monthly',
                    sss: '', philhealth_no: '', tin: '', pagibig_no: '',
                    birthday: '', birthplace: '', marital_status: 'single', gender: 'Male',
                    contact_no: '', emergency_contact: '',
                    elementary: '', elementary_year: '', highschool: '', highschool_year: '',
                    college: '', college_year: '', mother_name: '', father_name: '',
                    spouse_name: '', dependents: '', skills: ''
                });
                setTimeout(() => router.push('/dashboard/employees-list'), 1500);
            } else {
                setMessage('❌ ' + data.message);
            }
        } catch (err) { setMessage('❌ Network error'); }
        setLoading(false);
        setTimeout(() => setMessage(''), 3000);
    };

    if (!user) return null;

    return (
        <div className="flex flex-col lg:flex-row h-screen overflow-hidden bg-gray-100">
            <Sidebar user={user} />
            <div className="flex-1 overflow-y-auto w-full"></div>
            <div className="flex-1">
                <header className="bg-white shadow-sm p-4 flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-gray-700">➕ Add New Employee</h2>
                    <button onClick={() => router.push('/dashboard/add-employee')}
                        className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">
                        <span>+ Add Employee</span>
                    </button>
                </header>

                <main className="p-6">
                    {message && (
                        <div className={`px-4 py-3 rounded mb-4 ${message.includes('✅') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {message}
                        </div>
                    )}

                    <div className="bg-white rounded-lg shadow">
                        {/* Tabs */}
                        <div className="border-b flex flex-wrap px-6 pt-4">
                            {[
                                { key: 'personal', label: '👤 Personal', icon: '👤' },
                                { key: 'government', label: '🪪 Government IDs', icon: '🪪' },
                                { key: 'education', label: '🎓 Education', icon: '🎓' },
                                { key: 'family', label: '👨‍👩‍👧 Family', icon: '👨‍👩‍👧' },
                                { key: 'employment', label: '💼 Employment', icon: '💼' },
                            ].map(tab => (
                                <button key={tab.key} onClick={() => setProfileTab(tab.key)}
                                    className={`px-4 py-2 text-sm font-medium border-b-2 transition ${profileTab === tab.key ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        <form onSubmit={handleSubmit} className="p-6">
                            {/* PERSONAL TAB */}
                            {profileTab === 'personal' && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Full Name *</label>
                                        <input value={form.full_name} onChange={(e) => setForm({...form, full_name: e.target.value})} className="w-full border rounded p-2" required />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Email *</label>
                                        <input type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} className="w-full border rounded p-2" required />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Password *</label>
                                        <input type="password" value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} className="w-full border rounded p-2" required />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Birthday</label>
                                        <input type="date" value={form.birthday} onChange={(e) => setForm({...form, birthday: e.target.value})} className="w-full border rounded p-2" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Birthplace</label>
                                        <input value={form.birthplace} onChange={(e) => setForm({...form, birthplace: e.target.value})} className="w-full border rounded p-2" placeholder="City, Province" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Gender</label>
                                        <select value={form.gender} onChange={(e) => setForm({...form, gender: e.target.value})} className="w-full border rounded p-2">
                                            <option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Marital Status</label>
                                        <select value={form.marital_status} onChange={(e) => setForm({...form, marital_status: e.target.value})} className="w-full border rounded p-2">
                                            <option value="single">Single</option><option value="married">Married</option><option value="widowed">Widowed</option><option value="separated">Separated</option><option value="divorced">Divorced</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Contact No</label>
                                        <input value={form.contact_no} onChange={(e) => setForm({...form, contact_no: e.target.value})} className="w-full border rounded p-2" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Emergency Contact</label>
                                        <input value={form.emergency_contact} onChange={(e) => setForm({...form, emergency_contact: e.target.value})} className="w-full border rounded p-2" placeholder="Name: 09123456789" />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium mb-1">Address</label>
                                        <textarea value={form.address} onChange={(e) => setForm({...form, address: e.target.value})} className="w-full border rounded p-2" rows="2" />
                                    </div>
                                </div>
                            )}

                            {/* GOVERNMENT IDs TAB */}
                            {profileTab === 'government' && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="block text-sm font-medium mb-1">SSS No</label><input value={form.sss} onChange={(e) => setForm({...form, sss: e.target.value})} className="w-full border rounded p-2" /></div>
                                    <div><label className="block text-sm font-medium mb-1">PhilHealth No</label><input value={form.philhealth_no} onChange={(e) => setForm({...form, philhealth_no: e.target.value})} className="w-full border rounded p-2" /></div>
                                    <div><label className="block text-sm font-medium mb-1">TIN</label><input value={form.tin} onChange={(e) => setForm({...form, tin: e.target.value})} className="w-full border rounded p-2" /></div>
                                    <div><label className="block text-sm font-medium mb-1">Pag-IBIG No</label><input value={form.pagibig_no} onChange={(e) => setForm({...form, pagibig_no: e.target.value})} className="w-full border rounded p-2" /></div>
                                </div>
                            )}

                            {/* EDUCATION TAB */}
                            {profileTab === 'education' && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="block text-sm font-medium mb-1">Elementary</label><input value={form.elementary} onChange={(e) => setForm({...form, elementary: e.target.value})} className="w-full border rounded p-2" /></div>
                                    <div><label className="block text-sm font-medium mb-1">Year</label><input value={form.elementary_year} onChange={(e) => setForm({...form, elementary_year: e.target.value})} className="w-full border rounded p-2" /></div>
                                    <div><label className="block text-sm font-medium mb-1">High School</label><input value={form.highschool} onChange={(e) => setForm({...form, highschool: e.target.value})} className="w-full border rounded p-2" /></div>
                                    <div><label className="block text-sm font-medium mb-1">Year</label><input value={form.highschool_year} onChange={(e) => setForm({...form, highschool_year: e.target.value})} className="w-full border rounded p-2" /></div>
                                    <div><label className="block text-sm font-medium mb-1">College</label><input value={form.college} onChange={(e) => setForm({...form, college: e.target.value})} className="w-full border rounded p-2" /></div>
                                    <div><label className="block text-sm font-medium mb-1">Year</label><input value={form.college_year} onChange={(e) => setForm({...form, college_year: e.target.value})} className="w-full border rounded p-2" /></div>
                                </div>
                            )}

                            {/* FAMILY TAB */}
                            {profileTab === 'family' && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="block text-sm font-medium mb-1">Father's Name</label><input value={form.father_name} onChange={(e) => setForm({...form, father_name: e.target.value})} className="w-full border rounded p-2" /></div>
                                    <div><label className="block text-sm font-medium mb-1">Mother's Name</label><input value={form.mother_name} onChange={(e) => setForm({...form, mother_name: e.target.value})} className="w-full border rounded p-2" /></div>
                                    <div><label className="block text-sm font-medium mb-1">Spouse Name</label><input value={form.spouse_name} onChange={(e) => setForm({...form, spouse_name: e.target.value})} className="w-full border rounded p-2" /></div>
                                    <div className="col-span-2"><label className="block text-sm font-medium mb-1">Dependents</label><textarea value={form.dependents} onChange={(e) => setForm({...form, dependents: e.target.value})} className="w-full border rounded p-2" rows="2" placeholder="Name, Relationship, Age" /></div>
                                    <div className="col-span-2"><label className="block text-sm font-medium mb-1">Skills</label><textarea value={form.skills} onChange={(e) => setForm({...form, skills: e.target.value})} className="w-full border rounded p-2" rows="2" /></div>
                                </div>
                            )}

                            {/* EMPLOYMENT TAB */}
                            {profileTab === 'employment' && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Role</label>
                                        <select value={form.role} onChange={(e) => setForm({...form, role: e.target.value})}
                                            className="w-full border rounded p-2">
                                            <option value="employee">Employee</option>
                                            <option value="hr">HR</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Department</label>
                                        <select value={form.department} onChange={(e) => setForm({...form, department: e.target.value})}
                                            className="w-full border rounded p-2">
                                            <option value="">Select Department</option>
                                            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Position / Designation</label>
                                        <select value={form.position} onChange={(e) => setForm({...form, position: e.target.value})}
                                            className="w-full border rounded p-2">
                                            <option value="">Select Designation</option>
                                            {designations.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Salary (₱)</label>
                                        <input type="number" value={form.salary} onChange={(e) => setForm({...form, salary: e.target.value})}
                                            className="w-full border rounded p-2" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Salary Type</label>
                                        <select value={form.salary_type} onChange={(e) => setForm({...form, salary_type: e.target.value})}
                                            className="w-full border rounded p-2">
                                            <option value="monthly">Monthly</option>
                                            <option value="daily">Daily</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Withholding Tax</label>
                                        <select value={form.apply_tax} onChange={(e) => setForm({...form, apply_tax: e.target.value})}
                                            className="w-full border rounded p-2">
                                            <option value="1">Apply Tax</option>
                                            <option value="0">Tax Exempt</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Phone</label>
                                        <input value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})}
                                            className="w-full border rounded p-2" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Date Hired</label>
                                        <input type="date" value={form.date_hired?.split('T')[0] || ''} 
                                            onChange={(e) => setForm({...form, date_hired: e.target.value})}
                                            className="w-full border rounded p-2" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Employment Status</label>
                                        <select value={form.employment_status} onChange={(e) => setForm({...form, employment_status: e.target.value})}
                                            className="w-full border rounded p-2">
                                            <option value="probationary">Probationary</option>
                                            <option value="regular">Regular</option>
                                            <option value="contractual">Contractual</option>
                                            <option value="resigned">Resigned</option>
                                            <option value="terminated">Terminated</option>
                                        </select>
                                    </div>
                                </div>
                            )}

                            {/* Submit */}
                            <div className="flex gap-3 justify-end pt-6 border-t mt-6">
                                <button type="button" onClick={() => router.push('/dashboard/employees-list')}
                                    className="px-4 py-2 border rounded hover:bg-gray-50">Cancel</button>
                                <button type="submit" disabled={loading}
                                    className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50">
                                    {loading ? '⏳ Saving...' : '💾 Save Employee'}
                                </button>
                            </div>
                        </form>
                    </div>
                </main>
            </div>
        </div>
    );
}