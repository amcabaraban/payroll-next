'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';

export default function CompanySettingsPage() {
    const [user, setUser] = useState(null);
    const [form, setForm] = useState({
        company_name: '', address: '', contact_no: '', email: '',
        website: '', tin: '', sss_no: '', philhealth_no: '', pagibig_no: ''
    });
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (!userData) { router.push('/login'); return; }
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        
        if (parsedUser.role !== 'admin') {
            router.push('/dashboard');
            return;
        }
        
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        const res = await fetch('/api/company-settings');
        const data = await res.json();
        if (data.success && data.data) {
            setForm({
                company_name: data.data.company_name || '',
                address: data.data.address || '',
                contact_no: data.data.contact_no || '',
                email: data.data.email || '',
                website: data.data.website || '',
                tin: data.data.tin || '',
                sss_no: data.data.sss_no || '',
                philhealth_no: data.data.philhealth_no || '',
                pagibig_no: data.data.pagibig_no || '',
            });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        const res = await fetch('/api/company-settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
        });
        const data = await res.json();
        if (data.success) {
            setMessage('✅ Company settings saved!');
        } else {
            setMessage('❌ Failed to save');
        }
        setLoading(false);
        setTimeout(() => setMessage(''), 3000);
    };

    if (!user) return null;

    return (
        <div className="flex flex-col lg:flex-row h-screen overflow-hidden bg-gray-100">
            <Sidebar user={user} />
            <div className="flex-1">
                <header className="bg-white shadow-sm p-4">
                    <h2 className="text-lg font-semibold text-gray-700">🏢 Company Settings</h2>
                </header>

                <main className="p-6">
                    {message && (
                        <div className={`px-4 py-3 rounded mb-4 ${message.includes('✅') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {message}
                        </div>
                    )}

                    <div className="bg-white rounded-lg shadow p-6 max-w-3xl">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium mb-1">Company Name *</label>
                                    <input value={form.company_name} onChange={(e) => setForm({...form, company_name: e.target.value})}
                                        className="w-full border rounded p-2" required />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium mb-1">Address</label>
                                    <textarea value={form.address} onChange={(e) => setForm({...form, address: e.target.value})}
                                        className="w-full border rounded p-2" rows="2" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Contact No</label>
                                    <input value={form.contact_no} onChange={(e) => setForm({...form, contact_no: e.target.value})}
                                        className="w-full border rounded p-2" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Email</label>
                                    <input value={form.email} onChange={(e) => setForm({...form, email: e.target.value})}
                                        className="w-full border rounded p-2" type="email" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Website</label>
                                    <input value={form.website} onChange={(e) => setForm({...form, website: e.target.value})}
                                        className="w-full border rounded p-2" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">TIN</label>
                                    <input value={form.tin} onChange={(e) => setForm({...form, tin: e.target.value})}
                                        className="w-full border rounded p-2" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">SSS No</label>
                                    <input value={form.sss_no} onChange={(e) => setForm({...form, sss_no: e.target.value})}
                                        className="w-full border rounded p-2" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">PhilHealth No</label>
                                    <input value={form.philhealth_no} onChange={(e) => setForm({...form, philhealth_no: e.target.value})}
                                        className="w-full border rounded p-2" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Pag-IBIG No</label>
                                    <input value={form.pagibig_no} onChange={(e) => setForm({...form, pagibig_no: e.target.value})}
                                        className="w-full border rounded p-2" />
                                </div>
                            </div>

                            <div className="flex justify-end pt-4 border-t">
                                <button type="submit" disabled={loading}
                                    className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50">
                                    {loading ? 'Saving...' : '💾 Save Settings'}
                                </button>
                            </div>
                        </form>
                    </div>
                </main>
            </div>
        </div>
    );
}