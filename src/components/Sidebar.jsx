'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useTheme } from '@/context/ThemeContext';

export default function Sidebar({ user }) {
    const router = useRouter();
    const pathname = usePathname();
    const { theme, toggleTheme } = useTheme();
    
    // Menu para sa Employee
    const employeeMenu = [
        {
            title: 'MAIN MENU',
            items: [
                { name: 'Dashboard', path: '/dashboard', icon: '📊' },
                { name: 'My DTR', path: '/dashboard/attendance', icon: '📋' },
                { name: 'My Payslips', path: '/dashboard/payslip', icon: '📄' },
                { name: 'Leaves', path: '/dashboard/leaves', icon: '🏖️' },
            ],
        },
    ];

    // Menu para sa Admin at HR (pareho)
    const adminMenu = [
        {
            title: 'MAIN MENU',
            items: [
                { name: 'Dashboard', path: '/dashboard', icon: '📊' },
            ]
        },
        {
            title: 'EMPLOYEES',
            items: [
                { name: 'Employees', path: '/dashboard/employees-list', icon: '👥' },
                { name: 'Employee Records', path: '/dashboard/employee-summary', icon: '📊' },
                { name: 'Add Employee', path: '/dashboard/add-employee', icon: '➕' },
            ],
        },
        {
            title: 'ATTENDANCE',
            items: [
                { name: 'DTR Records', path: '/dashboard/attendance', icon: '📋' },
                { name: 'Leaves', path: '/dashboard/leaves', icon: '🏖️' },
                { name: 'Violations', path: '/dashboard/violations', icon: '⚠️' },
            ],
        },
        {
            title: 'MANAGEMENT',
            items: [
                { name: 'Departments', path: '/dashboard/departments', icon: '🏢' },
                { name: 'Branches', path: '/dashboard/branches', icon: '📍' },
                { name: 'Designations', path: '/dashboard/designations', icon: '👔' },
                { name: 'Shifts', path: '/dashboard/shifts', icon: '🕐' },
            ],
        },
        {
            title: 'PAYROLL',
            items: [
                { name: 'Calculate Salary', path: '/dashboard/payroll', icon: '💰' },
                { name: 'Generate Payslip', path: '/dashboard/payslip', icon: '📄' },
                { name: 'Government Loans', path: '/dashboard/loans', icon: '💳' },
                { name: '13th Month', path: '/dashboard/thirteenth-month', icon: '🎄' },
            ],
        },
        {
            title: 'SETTINGS',
            items: [
                { name: 'Company', path: '/dashboard/company-settings', icon: '🏢' },
                { name: 'Backup', path: '/dashboard/backup', icon: '💾' },
            ],
        },
    ];

    const menuItems = user?.role === 'employee' ? employeeMenu : adminMenu;

    const handleLogout = async () => {
        // Clear localStorage
        localStorage.removeItem('user');
        
        // Call logout API to clear cookie
        try {
            await fetch('/api/logout', { method: 'POST' });
        } catch (err) {
            console.error('Logout error:', err);
        }
        
        // Redirect to login
        router.push('/login');
    };

    return (
        <div className="w-64 bg-gray-900 text-white min-h-screen flex flex-col">
            <div className="p-5 border-b border-gray-700 text-center">
                <h1 className="text-md font-bold text-cyan-300">Employee Information<br/>& Payroll</h1>
                <p className="text-xs font-bold text-gray-400 mt-1">Management System</p>
            </div>

            {user && (
                <div className="p-4 border-b border-gray-700">
                    <p className="text-sm font-medium truncate">{user.name}</p>
                    <p className="text-xs text-gray-400 capitalize">{user.role}</p>
                </div>
            )}

            <nav className="flex-1 overflow-y-auto p-3">
                {menuItems.map((section, idx) => (
                    <div key={idx} className="mb-4">
                        <p className="text-xs text-gray-500 uppercase px-3 mb-2">{section.title}</p>
                        {section.items.map((item) => (
                            <button
                                key={item.name}
                                onClick={() => router.push(item.path)}
                                className={`w-full flex items-center gap-3 px-3 py-2 rounded text-sm mb-1 transition ${
                                    pathname === item.path
                                        ? 'bg-blue-600 text-white'
                                        : 'text-gray-300 hover:bg-gray-800'
                                }`}
                            >
                                <span>{item.icon}</span>
                                <span>{item.name}</span>
                            </button>
                        ))}
                    </div>
                ))}
            </nav>
            
            <div className="p-3 border-t border-gray-700">
                <button onClick={toggleTheme}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded text-sm text-gray-300 hover:bg-gray-800 transition mb-1">
                    <span>{theme === 'light' ? '🌙' : '☀️'}</span>
                    <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
                </button>
                
                <button onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded text-sm text-gray-300 hover:bg-red-600 transition">
                    <span>🚪</span>
                    <span>Logout</span>
                </button>
            </div>
        </div>
    );
}