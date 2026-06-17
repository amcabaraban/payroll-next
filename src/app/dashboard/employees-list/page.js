'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Pagination from '@/components/Pagination';

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

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const [form, setForm] = useState({
        full_name: '', email: '', role: 'employee',
        department: '', position: '', salary: '', phone: '', address: ''
    });

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (!userData) { router.push('/login'); return; }
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        if (parsedUser.role === 'employee') { router.push('/dashboard'); return; }
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
            if (data.success) {
                setEmployees(data.data);
                setCurrentPage(1);
            }
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
            full_name: emp.full_name || '', email: emp.email || '', role: emp.role || 'employee',
            department: emp.department ? emp.department.toString() : '', position: emp.position ? emp.position.toString() : '',
            salary: emp.salary || '', phone: emp.phone || '', address: emp.address || '',
            apply_tax: emp.apply_tax ?? 1, salary_type: emp.salary_type || 'monthly',
            sss: emp.sss || '', philhealth_no: emp.philhealth_no || '', tin: emp.tin || '', pagibig_no: emp.pagibig_no || '',
            birthday: emp.birthday || '', birthplace: emp.birthplace || '', marital_status: emp.marital_status || 'single', gender: emp.gender || 'Male',
            contact_no: emp.contact_no || '', emergency_contact: emp.emergency_contact || '',
            elementary: emp.elementary || '', elementary_year: emp.elementary_year || '', highschool: emp.highschool || '', highschool_year: emp.highschool_year || '',
            college: emp.college || '', college_year: emp.college_year || '', mother_name: emp.mother_name || '', father_name: emp.father_name || '',
            spouse_name: emp.spouse_name || '', dependents: emp.dependents || '', skills: emp.skills || '',
        });
        setShowModal(true);
    };

    const handleDeleteClick = (emp) => { setEmpToDelete(emp); setShowDeleteModal(true); };

    const confirmDelete = async () => {
        if (!empToDelete) return;
        setDeleteLoading(true);
        try {
            const res = await fetch(`/api/employees/${empToDelete.id}`, { method: 'DELETE' });
            const data = await res.json();
            setMessage(data.success ? '✅ ' + data.message : '❌ ' + data.message);
            if (data.success) fetchEmployees();
        } catch (err) { setMessage('❌ Failed'); }
        setDeleteLoading(false); setShowDeleteModal(false); setEmpToDelete(null);
        setTimeout(() => setMessage(''), 3000);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const method = editingEmp ? 'PUT' : 'POST';
            const body = editingEmp ? { ...form, id: editingEmp.id } : { ...form, password: 'default123' };
            const res = await fetch('/api/employees', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            const data = await res.json();
            if (data.success) {
                setMessage(`✅ ${editingEmp ? 'Updated' : 'Added'}!`);
                setShowModal(false); setEditingEmp(null); fetchEmployees();
                setTimeout(() => setMessage(''), 3000);
            }
        } catch (err) { console.error(err); }
    };

    const getRoleBadge = (role) => ({
        admin: 'bg-red-100 text-red-700', hr: 'bg-blue-100 text-blue-700', employee: 'bg-green-100 text-green-700',
    })[role] || 'bg-gray-100 text-gray-700';

    // Pagination logic
    const totalPages = Math.ceil(employees.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedEmployees = employees.slice(startIndex, startIndex + itemsPerPage);

    if (!user) return null;

    return (
        <div className="flex flex-col lg:flex-row h-screen overflow-hidden bg-gray-100">
            <Sidebar user={user} />
            <div className="flex-1 overflow-y-auto w-full">
                <header className="bg-white shadow-sm p-3 md:p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <h2 className="text-base md:text-lg font-semibold text-gray-700">👥 Employees</h2>
                    <button onClick={() => { setEditingEmp(null); setForm({ full_name: '', email: '', role: 'employee', department: '', position: '', salary: '', phone: '', address: '', apply_tax: '1', salary_type: 'monthly', sss: '', philhealth_no: '', tin: '', pagibig_no: '', birthday: '', birthplace: '', marital_status: 'single', gender: 'Male', contact_no: '', emergency_contact: '', elementary: '', elementary_year: '', highschool: '', highschool_year: '', college: '', college_year: '', mother_name: '', father_name: '', spouse_name: '', dependents: '', skills: '' }); setShowModal(true); }}
                        className="bg-blue-600 text-white px-3 md:px-4 py-1.5 md:py-2 rounded text-xs md:text-sm hover:bg-blue-700 w-full sm:w-auto text-center">
                        + Add Employee
                    </button>
                </header>

                <main className="p-3 md:p-6">
                    {message && <div className={`px-3 md:px-4 py-2 md:py-3 rounded mb-4 text-sm ${message.includes('✅') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{message}</div>}

                    {/* Filters */}
                    <div className="bg-white rounded-lg shadow p-3 md:p-4 mb-4">
                        <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
                            <input type="text" placeholder="🔍 Search by name, email..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 border rounded px-3 py-2 text-xs md:text-sm" />
                            <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className="border rounded px-3 py-2 text-xs md:text-sm">
                                <option value="">All Roles</option>
                                <option value="admin">Admin</option><option value="hr">HR</option><option value="employee">Employee</option>
                            </select>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        {/* Show entries */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 p-3 bg-gray-50 border-b">
                            <p className="text-xs md:text-sm text-gray-500">
                                Showing {employees.length > 0 ? startIndex + 1 : 0}-{Math.min(startIndex + itemsPerPage, employees.length)} of {employees.length} employees
                            </p>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">Per page:</span>
                                <select 
                                    value={itemsPerPage} 
                                    onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                                    className="border rounded px-2 py-1 text-xs"
                                >
                                    <option value="5">5</option>
                                    <option value="10">10</option>
                                    <option value="25">25</option>
                                    <option value="50">50</option>
                                </select>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[700px]">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="p-2 md:p-3 text-left text-xs uppercase text-gray-500">#</th>
                                        <th className="p-2 md:p-3 text-left text-xs uppercase text-gray-500">Name</th>
                                        <th className="p-2 md:p-3 text-left text-xs uppercase text-gray-500 hidden md:table-cell">Email</th>
                                        <th className="p-2 md:p-3 text-left text-xs uppercase text-gray-500">Role</th>
                                        <th className="p-2 md:p-3 text-left text-xs uppercase text-gray-500 hidden sm:table-cell">Dept</th>
                                        <th className="p-2 md:p-3 text-left text-xs uppercase text-gray-500 hidden lg:table-cell">Position</th>
                                        <th className="p-2 md:p-3 text-right text-xs uppercase text-gray-500">Salary</th>
                                        <th className="p-2 md:p-3 text-center text-xs uppercase text-gray-500">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {employees.length === 0 ? (
                                        <tr><td colSpan="8" className="text-center p-8 text-gray-400">No employees found</td></tr>
                                    ) : (
                                        paginatedEmployees.map((emp) => (
                                            <tr key={emp.id} className="border-b hover:bg-gray-50">
                                                <td className="p-2 md:p-3 text-sm text-gray-500">{emp.id}</td>
                                                <td className="p-2 md:p-3 text-sm font-medium">{emp.full_name}</td>
                                                <td className="p-2 md:p-3 text-sm text-gray-500 hidden md:table-cell">{emp.email}</td>
                                                <td className="p-2 md:p-3"><span className={`px-2 py-1 rounded text-xs capitalize ${getRoleBadge(emp.role)}`}>{emp.role}</span></td>
                                                <td className="p-2 md:p-3 text-sm hidden sm:table-cell">{emp.department_name || emp.department || '-'}</td>
                                                <td className="p-2 md:p-3 text-sm text-gray-500 hidden lg:table-cell">{emp.position_name || emp.position || '-'}</td>
                                                <td className="p-2 md:p-3 text-sm text-right">₱{Number(emp.salary).toLocaleString()}</td>
                                                <td className="p-2 md:p-3 text-center">
                                                    <button onClick={() => handleEdit(emp)} className="text-blue-600 hover:text-blue-800 mr-1 md:mr-2 text-sm">✏️</button>
                                                    <button onClick={() => handleDeleteClick(emp)} className="text-red-600 hover:text-red-800 text-sm">🗑️</button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <Pagination 
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={(page) => setCurrentPage(page)}
                        />
                    </div>

                    {/* Edit/Add Modal */}
                    {showModal && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl p-4 md:p-6 max-h-[90vh] overflow-y-auto">
                                <h3 className="text-base md:text-lg font-semibold mb-4">{editingEmp ? '✏️ Edit' : '➕ Add'} Employee</h3>
                                <div className="border-b flex flex-wrap mb-4 gap-1">
                                    {['personal', 'government', 'education', 'family', 'employment'].map(tab => (
                                        <button key={tab} onClick={() => setProfileTab(tab)} className={`px-2 md:px-3 py-1 md:py-1.5 text-xs font-medium capitalize ${profileTab === tab ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}>
                                            {tab}
                                        </button>
                                    ))}
                                </div>
                                <form onSubmit={handleSubmit} className="space-y-3 md:space-y-4">
                                    {profileTab === 'personal' && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                                            <div><label className="block text-xs md:text-sm font-medium mb-1">Full Name *</label><input value={form.full_name} onChange={(e) => setForm({...form, full_name: e.target.value})} className="w-full border rounded p-1.5 md:p-2 text-sm" required /></div>
                                            <div><label className="block text-xs md:text-sm font-medium mb-1">Email *</label><input value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} className="w-full border rounded p-1.5 md:p-2 text-sm" required /></div>
                                            <div><label className="block text-xs md:text-sm font-medium mb-1">Birthday</label><input type="date" value={form.birthday?.split('T')[0] || ''} onChange={(e) => setForm({...form, birthday: e.target.value})} className="w-full border rounded p-1.5 md:p-2 text-sm" /></div>
                                            <div><label className="block text-xs md:text-sm font-medium mb-1">Gender</label><select value={form.gender} onChange={(e) => setForm({...form, gender: e.target.value})} className="w-full border rounded p-1.5 md:p-2 text-sm"><option value="Male">Male</option><option value="Female">Female</option></select></div>
                                            <div><label className="block text-xs md:text-sm font-medium mb-1">Contact No</label><input value={form.contact_no} onChange={(e) => setForm({...form, contact_no: e.target.value})} className="w-full border rounded p-1.5 md:p-2 text-sm" /></div>
                                            <div className="sm:col-span-2"><label className="block text-xs md:text-sm font-medium mb-1">Address</label><textarea value={form.address} onChange={(e) => setForm({...form, address: e.target.value})} className="w-full border rounded p-1.5 md:p-2 text-sm" rows="2" /></div>
                                        </div>
                                    )}
                                    {profileTab === 'employment' && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                                            <div><label className="block text-xs md:text-sm font-medium mb-1">Role</label><select value={form.role} onChange={(e) => setForm({...form, role: e.target.value})} className="w-full border rounded p-1.5 md:p-2 text-sm"><option value="employee">Employee</option><option value="hr">HR</option><option value="admin">Admin</option></select></div>
                                            <div><label className="block text-xs md:text-sm font-medium mb-1">Department</label><select value={form.department} onChange={(e) => setForm({...form, department: e.target.value})} className="w-full border rounded p-1.5 md:p-2 text-sm"><option value="">Select</option>{departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
                                            <div><label className="block text-xs md:text-sm font-medium mb-1">Position</label><select value={form.position} onChange={(e) => setForm({...form, position: e.target.value})} className="w-full border rounded p-1.5 md:p-2 text-sm"><option value="">Select</option>{designations.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
                                            <div><label className="block text-xs md:text-sm font-medium mb-1">Salary (₱)</label><input type="number" value={form.salary} onChange={(e) => setForm({...form, salary: e.target.value})} className="w-full border rounded p-1.5 md:p-2 text-sm" /></div>
                                        </div>
                                    )}
                                    <div className="flex gap-2 md:gap-3 justify-end pt-3 md:pt-4 border-t">
                                        <button type="button" onClick={() => setShowModal(false)} className="px-3 md:px-4 py-1.5 md:py-2 border rounded text-sm hover:bg-gray-50">Cancel</button>
                                        <button type="submit" className="bg-blue-600 text-white px-4 md:px-6 py-1.5 md:py-2 rounded text-sm hover:bg-blue-700">{editingEmp ? 'Update' : 'Save'}</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* Delete Modal */}
                    {showDeleteModal && empToDelete && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-4 md:p-6">
                                <div className="text-center mb-4"><span className="text-4xl md:text-5xl">⚠️</span></div>
                                <h3 className="text-base md:text-lg font-semibold text-center mb-2">Delete Employee</h3>
                                <div className="bg-red-50 border border-red-200 rounded-lg p-3 md:p-4 mb-4">
                                    <p className="text-sm font-bold text-red-700 mb-2">Delete:</p>
                                    <p className="font-medium">{empToDelete.full_name}</p>
                                    <p className="text-xs text-gray-500">ID: {empToDelete.id} | {empToDelete.email}</p>
                                    <p className="text-xs text-red-600 mt-2">⚠️ Deletes ALL records permanently!</p>
                                </div>
                                <div className="flex gap-2 md:gap-3 justify-center">
                                    <button onClick={() => { setShowDeleteModal(false); setEmpToDelete(null); }} className="px-4 md:px-6 py-1.5 md:py-2 border rounded text-sm hover:bg-gray-50">Cancel</button>
                                    <button onClick={confirmDelete} disabled={deleteLoading} className="px-4 md:px-6 py-1.5 md:py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-50 font-bold">{deleteLoading ? '⏳' : '🗑️ Delete'}</button>
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}