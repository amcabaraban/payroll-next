'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';

export default function EmployeesListPage() {
    const [user, setUser] = useState(null);
    const [employees, setEmployees] = useState([]);
    const [search, setSearch] = useState('');
    const [filterRole, setFilterRole] = useState('');
    const [filterDept, setFilterDept] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingEmp, setEditingEmp] = useState(null);
    const [message, setMessage] = useState('');
    const router = useRouter();
    const [profileTab, setProfileTab] = useState('personal');
    const [departments, setDepartments] = useState([]);
    const [designations, setDesignations] = useState([]);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [empToDelete, setEmpToDelete] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    // Form state
    const [form, setForm] = useState({
        full_name: '', email: '', role: 'employee',
        department: '', position: '', salary: '', phone: '', address: ''
    });

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (!userData) { router.push('/login'); return; }
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        
        // Only admin and HR can access
        if (parsedUser.role === 'employee') {
            router.push('/dashboard');
            return;
        }
        fetchDepartments();
        fetchDesignations();
    }, []);

    useEffect(() => { if (user) fetchEmployees(); }, [search, filterRole, filterDept, user]);

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

    const handleEdit = (emp) => {
        setEditingEmp(emp);
        setForm({
            full_name: emp.full_name || '',
            email: emp.email || '',
            role: emp.role || 'employee',
            department: emp.department ? emp.department.toString() : '',
            position: emp.position ? emp.position.toString() : '',
            salary: emp.salary || '',
            phone: emp.phone || '',
            address: emp.address || '',
            apply_tax: emp.apply_tax ?? 1,
            salary_type: emp.salary_type || 'monthly',
            // New fields
            sss: emp.sss || '',
            philhealth_no: emp.philhealth_no || '',
            tin: emp.tin || '',
            pagibig_no: emp.pagibig_no || '',
            birthday: emp.birthday || '',
            birthplace: emp.birthplace || '',
            marital_status: emp.marital_status || 'single',
            gender: emp.gender || 'Male',
            contact_no: emp.contact_no || '',
            emergency_contact: emp.emergency_contact || '',
            elementary: emp.elementary || '',
            elementary_year: emp.elementary_year || '',
            highschool: emp.highschool || '',
            highschool_year: emp.highschool_year || '',
            college: emp.college || '',
            college_year: emp.college_year || '',
            mother_name: emp.mother_name || '',
            father_name: emp.father_name || '',
            spouse_name: emp.spouse_name || '',
            dependents: emp.dependents || '',
            skills: emp.skills || '',
        });
        setShowModal(true);
    };

    const handleDeleteClick = (emp) => {
        setShowModal(false);
        setEmpToDelete(emp);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!empToDelete) return;
        setDeleteLoading(true);
        try {
            const res = await fetch(`/api/employees/${empToDelete.id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                setMessage('✅ ' + data.message);
                fetchEmployees();
            } else {
                setMessage('❌ ' + data.message);
            }
        } catch (err) {
            setMessage('❌ Failed to delete employee');
        }
        setDeleteLoading(false);
        setShowDeleteModal(false);
        setEmpToDelete(null);
        setTimeout(() => setMessage(''), 3000);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const url = editingEmp ? '/api/employees' : '/api/employees';
            const method = editingEmp ? 'PUT' : 'POST';
            const body = editingEmp 
                ? { ...form, id: editingEmp.id }
                : { ...form, password: 'default123' };

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (data.success) {
                setMessage(`✅ ${editingEmp ? 'Updated' : 'Added'} successfully!`);
                setShowModal(false);
                setEditingEmp(null);
                fetchEmployees();
                setTimeout(() => setMessage(''), 3000);
            }
        } catch (err) { console.error(err); }
    };

    const getRoleBadge = (role) => ({
        admin: 'bg-red-100 text-red-700',
        hr: 'bg-blue-100 text-blue-700',
        employee: 'bg-green-100 text-green-700',
    })[role] || 'bg-gray-100 text-gray-700';

    if (!user) return null;

    return (
        <div className="flex min-h-screen bg-gray-100">
            <Sidebar user={user} />
            <div className="flex-1">
                <header className="bg-white shadow-sm p-4 flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-gray-700">👥 Employees</h2>
                    <button onClick={() => { setEditingEmp(null); setForm({ 
                        full_name: '', email: '', role: 'employee', department: '', position: '', 
                        salary: '', phone: '', address: '', apply_tax: '1', salary_type: 'monthly',
                        sss: '', philhealth_no: '', tin: '', pagibig_no: '',
                        birthday: '', birthplace: '', marital_status: 'single', gender: 'Male',
                        contact_no: '', emergency_contact: '',
                        elementary: '', elementary_year: '', highschool: '', highschool_year: '',
                        college: '', college_year: '', mother_name: '', father_name: '',
                        spouse_name: '', dependents: '', skills: ''
                    }); setShowModal(true); }}
                        className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">
                        <span>+ Add Employee</span>
                    </button>
                </header>

                <main className="p-6">
                    {message && <div className="bg-green-100 text-green-700 px-4 py-3 rounded mb-4">{message}</div>}

                    {/* Filters */}
                    <div className="bg-white rounded-lg shadow p-4 mb-4">
                        <div className="flex gap-3">
                            <input type="text" placeholder="🔍 Search..." value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="flex-1 border rounded px-3 py-2 text-sm" />
                            <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)}
                                className="border rounded px-3 py-2 text-sm">
                                <option value="">All Roles</option>
                                <option value="admin">Admin</option>
                                <option value="hr">HR</option>
                                <option value="employee">Employee</option>
                            </select>
                            <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)}
                                className="border rounded px-3 py-2 text-sm">
                                <option value="">All Departments</option>
                                <option value="IT">IT</option>
                                <option value="Human Resources">HR</option>
                                <option value="Finance">Finance</option>
                                <option value="Management">Management</option>
                            </select>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="p-3 text-left text-xs uppercase text-gray-500">#</th>
                                    <th className="p-3 text-left text-xs uppercase text-gray-500">Name</th>
                                    <th className="p-3 text-left text-xs uppercase text-gray-500">Email</th>
                                    <th className="p-3 text-left text-xs uppercase text-gray-500">Role</th>
                                    <th className="p-3 text-left text-xs uppercase text-gray-500">Dept</th>
                                    <th className="p-3 text-left text-xs uppercase text-gray-500">Position</th>
                                    <th className="p-3 text-right text-xs uppercase text-gray-500">Salary</th>
                                    <th className="p-3 text-left text-xs uppercase text-gray-500">Salary Type</th>
                                    <th className="p-3 text-center text-xs uppercase text-gray-500">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {employees.map((emp) => (
                                    <tr key={emp.id} className="border-b hover:bg-gray-50">
                                        <td className="p-3 text-sm text-gray-500">{emp.id}</td>
                                        <td className="p-3 text-sm font-medium">{emp.full_name}</td>
                                        <td className="p-3 text-sm text-gray-500">{emp.email}</td>
                                        <td className="p-3"><span className={`px-2 py-1 rounded text-xs capitalize ${getRoleBadge(emp.role)}`}>{emp.role}</span></td>
                                        <td className="p-3 text-sm">{emp.department_name || emp.department || '-'}</td>
                                        <td className="p-3 text-sm text-gray-500">{emp.position_name || emp.position || '-'}</td>
                                        <td className="p-3 text-sm text-right">₱{Number(emp.salary).toLocaleString()}</td>
                                        <td className="p-3 text-sm">
                                            <span className={`px-2 py-1 rounded text-xs ${emp.salary_type === 'monthly' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                                                {emp.salary_type === 'monthly' ? 'Monthly' : 'Daily'}
                                            </span>
                                        </td>
                                        <td className="p-3 text-center">
                                            <button onClick={() => handleEdit(emp)}
                                                className="text-blue-600 hover:text-blue-800 mr-2 text-sm">✏️</button>
                                            <button onClick={() => handleDeleteClick(emp)}
                                                className="text-red-600 hover:text-red-800 text-sm">🗑️</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Edit/Add Modal */}
                    {showModal && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl p-6 max-h-[90vh] overflow-y-auto">
                                <h3 className="text-lg font-semibold mb-4">{editingEmp ? '✏️ Edit Employee' : '➕ Add Employee'}</h3>
                                
                                {/* Profile Tabs */}
                                <div className="border-b flex flex-wrap mb-4">
                                    {['personal', 'government', 'education', 'family', 'employment'].map(tab => (
                                        <button key={tab} onClick={() => setProfileTab(tab)}
                                            className={`px-3 py-1.5 text-xs font-medium capitalize ${profileTab === tab ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
                                            {tab === 'personal' ? '👤 Personal' : 
                                            tab === 'government' ? '🪪 Gov\'t IDs' : 
                                            tab === 'education' ? '🎓 Education' : 
                                            tab === 'family' ? '👨‍👩‍👧 Family' : '💼 Employment'}
                                        </button>
                                    ))}
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-4">
                                    {/* PERSONAL TAB */}
                                    {profileTab === 'personal' && (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium mb-1">Full Name *</label>
                                                <input value={form.full_name} onChange={(e) => setForm({...form, full_name: e.target.value})}
                                                    className="w-full border rounded p-2" required />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium mb-1">Email *</label>
                                                <input value={form.email} onChange={(e) => setForm({...form, email: e.target.value})}
                                                    className="w-full border rounded p-2" required />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium mb-1">Birthday</label>
                                                <input type="date" value={form.birthday?.split('T')[0] || ''} onChange={(e) => setForm({...form, birthday: e.target.value})}
                                                    className="w-full border rounded p-2" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium mb-1">Birthplace</label>
                                                <input value={form.birthplace} onChange={(e) => setForm({...form, birthplace: e.target.value})}
                                                    className="w-full border rounded p-2" placeholder="City, Province" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium mb-1">Gender</label>
                                                <select value={form.gender} onChange={(e) => setForm({...form, gender: e.target.value})}
                                                    className="w-full border rounded p-2">
                                                    <option value="Male">Male</option>
                                                    <option value="Female">Female</option>
                                                    <option value="Other">Other</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium mb-1">Marital Status</label>
                                                <select value={form.marital_status} onChange={(e) => setForm({...form, marital_status: e.target.value})}
                                                    className="w-full border rounded p-2">
                                                    <option value="single">Single</option>
                                                    <option value="married">Married</option>
                                                    <option value="widowed">Widowed</option>
                                                    <option value="separated">Separated</option>
                                                    <option value="divorced">Divorced</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium mb-1">Contact No</label>
                                                <input value={form.contact_no} onChange={(e) => setForm({...form, contact_no: e.target.value})}
                                                    className="w-full border rounded p-2" placeholder="09123456789" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium mb-1">Emergency Contact</label>
                                                <input value={form.emergency_contact} onChange={(e) => setForm({...form, emergency_contact: e.target.value})}
                                                    className="w-full border rounded p-2" placeholder="Name: 09123456789" />
                                            </div>
                                            <div className="col-span-2">
                                                <label className="block text-sm font-medium mb-1">Address</label>
                                                <textarea value={form.address} onChange={(e) => setForm({...form, address: e.target.value})}
                                                    className="w-full border rounded p-2" rows="2" placeholder="Full address" />
                                            </div>
                                        </div>
                                    )}

                                    {/* GOVERNMENT IDs TAB */}
                                    {profileTab === 'government' && (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium mb-1">SSS No</label>
                                                <input value={form.sss} onChange={(e) => setForm({...form, sss: e.target.value})}
                                                    className="w-full border rounded p-2" placeholder="XX-XXXXXXX-X" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium mb-1">PhilHealth No</label>
                                                <input value={form.philhealth_no} onChange={(e) => setForm({...form, philhealth_no: e.target.value})}
                                                    className="w-full border rounded p-2" placeholder="XX-XXXXXXXXX-X" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium mb-1">TIN</label>
                                                <input value={form.tin} onChange={(e) => setForm({...form, tin: e.target.value})}
                                                    className="w-full border rounded p-2" placeholder="XXX-XXX-XXX" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium mb-1">Pag-IBIG No</label>
                                                <input value={form.pagibig_no} onChange={(e) => setForm({...form, pagibig_no: e.target.value})}
                                                    className="w-full border rounded p-2" placeholder="XXXX-XXXX-XXXX" />
                                            </div>
                                        </div>
                                    )}

                                    {/* EDUCATION TAB */}
                                    {profileTab === 'education' && (
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium mb-1">Elementary</label>
                                                    <input value={form.elementary} onChange={(e) => setForm({...form, elementary: e.target.value})}
                                                        className="w-full border rounded p-2" placeholder="School name" />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium mb-1">Year Graduated</label>
                                                    <input value={form.elementary_year} onChange={(e) => setForm({...form, elementary_year: e.target.value})}
                                                        className="w-full border rounded p-2" placeholder="YYYY" />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium mb-1">High School</label>
                                                    <input value={form.highschool} onChange={(e) => setForm({...form, highschool: e.target.value})}
                                                        className="w-full border rounded p-2" placeholder="School name" />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium mb-1">Year Graduated</label>
                                                    <input value={form.highschool_year} onChange={(e) => setForm({...form, highschool_year: e.target.value})}
                                                        className="w-full border rounded p-2" placeholder="YYYY" />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium mb-1">College</label>
                                                    <input value={form.college} onChange={(e) => setForm({...form, college: e.target.value})}
                                                        className="w-full border rounded p-2" placeholder="School name" />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium mb-1">Year Graduated</label>
                                                    <input value={form.college_year} onChange={(e) => setForm({...form, college_year: e.target.value})}
                                                        className="w-full border rounded p-2" placeholder="YYYY" />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* FAMILY TAB */}
                                    {profileTab === 'family' && (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium mb-1">Father's Name</label>
                                                <input value={form.father_name} onChange={(e) => setForm({...form, father_name: e.target.value})}
                                                    className="w-full border rounded p-2" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium mb-1">Mother's Name</label>
                                                <input value={form.mother_name} onChange={(e) => setForm({...form, mother_name: e.target.value})}
                                                    className="w-full border rounded p-2" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium mb-1">Spouse Name</label>
                                                <input value={form.spouse_name} onChange={(e) => setForm({...form, spouse_name: e.target.value})}
                                                    className="w-full border rounded p-2" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium mb-1">Dependents</label>
                                                <textarea value={form.dependents} onChange={(e) => setForm({...form, dependents: e.target.value})}
                                                    className="w-full border rounded p-2" rows="2" placeholder="Name, Relationship, Age" />
                                            </div>
                                            <div className="col-span-2">
                                                <label className="block text-sm font-medium mb-1">Skills</label>
                                                <textarea value={form.skills} onChange={(e) => setForm({...form, skills: e.target.value})}
                                                    className="w-full border rounded p-2" rows="2" placeholder="e.g., Computer Literate, Driving, etc." />
                                            </div>
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
                                                <input type="date" 
                                                    value={form.date_hired ? form.date_hired.split('T')[0] : ''} 
                                                    onChange={(e) => setForm({...form, date_hired: e.target.value})}
                                                    className="w-full border rounded p-2" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium mb-1">Employment Status</label>
                                                <select value={form.employment_status || 'probationary'} 
                                                    onChange={(e) => setForm({...form, employment_status: e.target.value})}
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

                                    {/* Buttons */}
                                    <div className="flex gap-3 justify-end pt-4 border-t">
                                        <button type="button" onClick={() => setShowModal(false)}
                                            className="px-4 py-2 border rounded hover:bg-gray-50">Cancel</button>
                                        <button type="submit"
                                            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">
                                            {editingEmp ? 'Update' : 'Save'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                        {/* Delete Confirmation Modal */}
                            {showDeleteModal && empToDelete && (
                                <div className="fixed inset-0 flex items-center justify-center z-[60]">
                                    <div className="bg-white rounded-lg shadow-2xl w-full max-w-md p-6 border">
                                        <div className="text-center mb-4">
                                            <span className="text-5xl">⚠️</span>
                                        </div>
                                        <h3 className="text-lg font-semibold text-center mb-2">Delete Employee</h3>
                                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                                        <p className="text-sm font-bold text-red-700 mb-2">You are about to delete:</p>
                                        <p className="font-medium">{empToDelete.full_name}</p>
                                        <p className="text-xs text-gray-500">ID: {empToDelete.id} | {empToDelete.email}</p>
                                        <p className="text-xs text-gray-500">Role: {empToDelete.role} | Dept: {empToDelete.department_name || empToDelete.department || 'N/A'}</p>
                                        <p className="text-xs text-red-600 mt-2">⚠️ This will permanently delete ALL records including attendance, leaves, payslips, and loans!</p>
                                    </div>
                                    <div className="flex gap-3 justify-center">
                                        <button 
                                            onClick={() => { setShowDeleteModal(false); setEmpToDelete(null); }}
                                            className="px-6 py-2 border rounded hover:bg-gray-50">
                                            Cancel
                                        </button>
                                        <button 
                                            onClick={confirmDelete}
                                            disabled={deleteLoading}
                                            className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 font-bold">
                                            {deleteLoading ? '⏳ Deleting...' : '🗑️ Delete Permanently'}
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