'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';

export default function BranchesPage() {
    const [user, setUser] = useState(null);
    const [items, setItems] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [message, setMessage] = useState('');
    const [form, setForm] = useState({ name: '', code: '', address: '', contact_no: '' });
    const router = useRouter();

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (!userData) { router.push('/login'); return; }
        setUser(JSON.parse(userData));
        fetchItems();
    }, []);

    const fetchItems = async () => {
        const res = await fetch('/api/branches');
        const data = await res.json();
        if (data.success) setItems(data.data);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const method = editing ? 'PUT' : 'POST';
        const body = editing ? { ...form, id: editing.id } : form;
        const res = await fetch('/api/branches', {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        const data = await res.json();
        if (data.success) {
            setMessage(editing ? '✅ Updated!' : '✅ Added!');
            setShowModal(false);
            setEditing(null);
            setForm({ name: '', code: '', address: '', contact_no: '' });
            fetchItems();
        }
        setTimeout(() => setMessage(''), 2000);
    };

    const handleEdit = (item) => { 
        setEditing(item); 
        setForm({ name: item.name, code: item.code || '', address: item.address || '', contact_no: item.contact_no || '' }); 
        setShowModal(true); 
    };
    
    const handleDelete = async (id) => { 
        if (!confirm('Delete this branch?')) return; 
        await fetch(`/api/branches?id=${id}`, { method: 'DELETE' }); 
        fetchItems(); 
        setMessage('🗑️ Deleted'); 
        setTimeout(() => setMessage(''), 2000); 
    };

    if (!user) return null;

    return (
        <div className="flex flex-col lg:flex-row h-screen overflow-hidden bg-gray-100">
            <Sidebar user={user} />
            <div className="flex-1 overflow-y-auto w-full"></div>
            <div className="flex-1">
                <header className="bg-white shadow-sm p-4 flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-gray-700">📍 Branches</h2>
                    <button onClick={() => { setEditing(null); setForm({ name: '', code: '', address: '', contact_no: '' }); setShowModal(true); }}
                        className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">
                        <span>+ Add Branch</span>
                    </button>
                </header>
                <main className="p-6">
                    {message && <div className="bg-green-100 text-green-700 px-4 py-3 rounded mb-4">{message}</div>}
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="p-3 text-left text-xs uppercase text-gray-500">Name</th>
                                    <th className="p-3 text-left text-xs uppercase text-gray-500">Code</th>
                                    <th className="p-3 text-left text-xs uppercase text-gray-500">Address</th>
                                    <th className="p-3 text-left text-xs uppercase text-gray-500">Contact</th>
                                    <th className="p-3 text-center text-xs uppercase text-gray-500 w-20">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.length === 0 ? (
                                    <tr><td colSpan="5" className="text-center p-8 text-gray-400">No branches yet</td></tr>
                                ) : (
                                    items.map(item => (
                                        <tr key={item.id} className="border-b hover:bg-gray-50">
                                            <td className="p-3 text-sm font-medium">{item.name}</td>
                                            <td className="p-3 text-sm text-gray-500">{item.code || '-'}</td>
                                            <td className="p-3 text-sm text-gray-500">{item.address || '-'}</td>
                                            <td className="p-3 text-sm text-gray-500">{item.contact_no || '-'}</td>
                                            <td className="p-3 text-center">
                                                <button onClick={() => handleEdit(item)} className="text-blue-600 hover:text-blue-800 mr-2">✏️</button>
                                                <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-800">🗑️</button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    {showModal && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
                                <h3 className="text-lg font-semibold mb-4">{editing ? '✏️ Edit' : '➕ Add'} Branch</h3>
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Name *</label>
                                        <input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} className="w-full border rounded p-2" required />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Code</label>
                                        <input value={form.code} onChange={(e) => setForm({...form, code: e.target.value})} className="w-full border rounded p-2" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Address</label>
                                        <textarea value={form.address} onChange={(e) => setForm({...form, address: e.target.value})} className="w-full border rounded p-2" rows="2" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Contact No</label>
                                        <input value={form.contact_no} onChange={(e) => setForm({...form, contact_no: e.target.value})} className="w-full border rounded p-2" />
                                    </div>
                                    <div className="flex gap-3 justify-end pt-4 border-t">
                                        <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded hover:bg-gray-50">Cancel</button>
                                        <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">{editing ? 'Update' : 'Save'}</button>
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