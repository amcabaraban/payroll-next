'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';

export default function BackupPage() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(false);
    const [restoring, setRestoring] = useState(false);
    const [message, setMessage] = useState('');
    const fileInputRef = useRef(null);
    const router = useRouter();

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (!userData) { router.push('/login'); return; }
        const parsedUser = JSON.parse(userData);
        
        if (parsedUser.role !== 'admin') {
            router.push('/dashboard');
            return;
        }
        
        setUser(parsedUser);
    }, []);

    const handleBackup = async () => {
        setLoading(true);
        setMessage('');
        try {
            const res = await fetch('/api/backup');
            
            if (!res.ok) throw new Error('Backup failed');
            
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const timestamp = new Date().toISOString().split('T')[0];
            a.download = `payroll_backup_${timestamp}.json`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            
            setMessage('✅ Backup downloaded successfully!');
        } catch (err) {
            setMessage('❌ Backup failed: ' + err.message);
        }
        setLoading(false);
        setTimeout(() => setMessage(''), 5000);
    };

    const handleRestore = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        if (!confirm('⚠️ WARNING: This will overwrite all current data! Are you sure?')) {
            fileInputRef.current.value = '';
            return;
        }
        
        setRestoring(true);
        setMessage('');
        
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            
            const res = await fetch('/api/backup/restore', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            
            const result = await res.json();
            
            if (result.success) {
                setMessage('✅ Database restored successfully! Refreshing...');
                setTimeout(() => window.location.reload(), 2000);
            } else {
                setMessage('❌ ' + result.message);
            }
        } catch (err) {
            setMessage('❌ Invalid backup file');
        }
        
        setRestoring(false);
        fileInputRef.current.value = '';
    };

    if (!user) return null;

    return (
        <div className="flex min-h-screen bg-gray-100">
            <Sidebar user={user} />
            <div className="flex-1">
                <header className="bg-white shadow-sm p-4">
                    <h2 className="text-lg font-semibold text-gray-700">💾 Database Backup & Restore</h2>
                </header>

                <main className="p-6">
                    {message && (
                        <div className={`px-4 py-3 rounded mb-4 ${
                            message.includes('✅') ? 'bg-green-100 text-green-700' : 
                            message.includes('❌') ? 'bg-red-100 text-red-700' : 
                            'bg-blue-100 text-blue-700'
                        }`}>
                            {message}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-6">
                        {/* Backup Card */}
                        <div className="bg-white rounded-lg shadow p-6">
                            <div className="text-center mb-4">
                                <span className="text-5xl">💾</span>
                            </div>
                            <h3 className="text-lg font-semibold text-center mb-2">Download Backup</h3>
                            <p className="text-sm text-gray-500 text-center mb-4">
                                Download a complete backup of your database. Includes all employees, attendance, payroll, and settings.
                            </p>
                            <button onClick={handleBackup} disabled={loading}
                                className="w-full bg-blue-600 text-white px-4 py-3 rounded hover:bg-blue-700 disabled:opacity-50 font-medium">
                                {loading ? '⏳ Creating Backup...' : '📥 Download Backup'}
                            </button>
                        </div>

                        {/* Restore Card */}
                        <div className="bg-white rounded-lg shadow p-6">
                            <div className="text-center mb-4">
                                <span className="text-5xl">📤</span>
                            </div>
                            <h3 className="text-lg font-semibold text-center mb-2">Restore Backup</h3>
                            <p className="text-sm text-gray-500 text-center mb-4">
                                Restore from a previous backup file. ⚠️ This will overwrite all current data!
                            </p>
                            <label className={`w-full bg-orange-600 text-white px-4 py-3 rounded hover:bg-orange-700 cursor-pointer font-medium text-center block ${
                                restoring ? 'opacity-50' : ''
                            }`}>
                                {restoring ? '⏳ Restoring...' : '📤 Upload & Restore'}
                                <input 
                                    ref={fileInputRef}
                                    type="file" 
                                    accept=".json" 
                                    onChange={handleRestore} 
                                    className="hidden"
                                    disabled={restoring}
                                />
                            </label>
                        </div>
                    </div>

                    {/* Info Card */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                        <h4 className="font-semibold text-blue-800 mb-2">📌 Backup Tips</h4>
                        <ul className="text-sm text-blue-700 space-y-1">
                            <li>• Download a backup before making major changes</li>
                            <li>• Store backups in multiple locations (cloud, USB, email)</li>
                            <li>• Schedule regular backups (weekly recommended)</li>
                            <li>• Keep backup files secure - they contain sensitive payroll data</li>
                            <li>• Test restore on a development database first</li>
                        </ul>
                    </div>
                </main>
            </div>
        </div>
    );
}