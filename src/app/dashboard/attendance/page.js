'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';

const RD_DAYS = [0];

export default function AttendancePage() {
    const [user, setUser] = useState(null);
    const [employees, setEmployees] = useState([]);
    const [selectedEmp, setSelectedEmp] = useState('');
    const [selectedEmpName, setSelectedEmpName] = useState('');
    const [message, setMessage] = useState('');
    const [saving, setSaving] = useState(false);
    const router = useRouter();

    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [days, setDays] = useState([]);
    const [holidays, setHolidays] = useState([]); // Stores holidays fetched from your database

    // 1. Initial Authentication & Default Date Selection
    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (!userData) { router.push('/login'); return; }
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        fetchEmployees();
        
        if (parsedUser.role === 'employee') {
            setSelectedEmp(parsedUser.id.toString());
            setSelectedEmpName(parsedUser.name);
        }
        
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        setDateFrom(`${year}-${month}-01`);
        setDateTo(`${year}-${month}-15`);
    }, []);


    // 2. Fetch Holidays from Database based on selected date range
    useEffect(() => {
        const fetchHolidaysFromDB = async () => {
            if (!dateFrom || !dateTo) return;
            try {
                const res = await fetch(`/api/holidays?date_from=${dateFrom}&date_to=${dateTo}`);
                const data = await res.json();
                
                // Defensively check for both .rows (your schema) and .data wrappers
                const holidayRows = data.rows || data.data;
                
                if (holidayRows) {
                    setHolidays(holidayRows);
                }
            } catch (err) {
                console.error("Error pulling holidays:", err);
            }
        };

        fetchHolidaysFromDB();
    }, [dateFrom, dateTo]);

    // 3. Generate Calendar Grid with automated Rest Days and Holidays
    useEffect(() => {
        if (dateFrom && dateTo) {
            const daysArray = [];
            const start = new Date(dateFrom);
            const end = new Date(dateTo);
            const current = new Date(start);

            while (current <= end) {
                // Formatting dates cleanly using local system configurations to avoid standard ISO timezone drop-backs
                const year = current.getFullYear();
                const monthStr = String(current.getMonth() + 1).padStart(2, '0');
                const dateStrNum = String(current.getDate()).padStart(2, '0');
                const dateStr = `${year}-${monthStr}-${dateStrNum}`;

                const dayOfWeek = current.getDay();
                const isRD = RD_DAYS.includes(dayOfWeek);
                
                // Scan loaded holidays for a calendar date match
                const matchedHoliday = holidays.find(h => h.date === dateStr);
                const isHoliday = !!matchedHoliday;

                // Priority Fallback Matrix: Holiday -> Rest Day -> Regular Shift Present
                let defaultStatus = 'present';
                if (isHoliday) {
                    defaultStatus = 'holiday';
                } else if (isRD) {
                    defaultStatus = 'rd';
                }

                daysArray.push({
                    date: dateStr,
                    day: current.toLocaleDateString('en-PH', { weekday: 'short' }),
                    display: `${monthStr}-${dateStrNum}`,
                    timeIn: '',
                    timeOut: '',
                    status: defaultStatus,
                    isRD: isRD,
                    isHoliday: isHoliday,
                    holidayName: matchedHoliday ? matchedHoliday.name : null
                });

                current.setDate(current.getDate() + 1);
            }
            setDays(daysArray);
            if (selectedEmp) loadRecordsForDays(daysArray);
        }
    }, [dateFrom, dateTo, selectedEmp, holidays]);

    const fetchEmployees = async () => {
        const res = await fetch('/api/employees');
        const data = await res.json();
        if (data.success) setEmployees(data.data);
    };

    const loadRecordsForDays = async (currentDays) => {
        try {
            const params = new URLSearchParams();
            params.append('user_id', selectedEmp);
            params.append('date_from', dateFrom);
            params.append('date_to', dateTo);
            const res = await fetch(`/api/attendance?${params.toString()}`);
            const data = await res.json();
            if (data.success && data.data) {
                const updatedDays = currentDays.map(day => {
                    const record = data.data.find(r => r.date === day.date);
                    if (!record) return day;
                    return {
                        ...day,
                        timeIn: record.timeIn ? formatTimeForInput(record.timeIn) : '',
                        timeOut: record.timeOut ? formatTimeForInput(record.timeOut) : '',
                        status: record.status || day.status, // Database saved entries will safely override defaults
                        dtr_status: record.dtr_status || 'pending',
                        _originalStatus: record.status || day.status,
                    };
                });
                setDays(updatedDays);
            }
        } catch (err) { console.error(err); }
    };

    const formatTimeForInput = (timestamp) => {
        if (!timestamp) return '';
        try {
            const str = String(timestamp);
            const match = str.match(/(\d{2}):(\d{2})/);
            if (match) return `${match[1]}:${match[2]}`;
            return str.substring(11, 16);
        } catch (e) { return ''; }
    };

    const handleEmployeeChange = (e) => {
        const empId = e.target.value;
        setSelectedEmp(empId);
        if (empId) {
            const emp = employees.find(em => em.id == empId);
            setSelectedEmpName(emp?.full_name || '');
            const df = dateFrom;
            setDateFrom('');
            setTimeout(() => setDateFrom(df), 100);
        } else {
            setSelectedEmpName('');
            setDays([]);
        }
    };

    const handleStatusChange = (index, value) => {
        const updatedDays = [...days];
        if (updatedDays[index]._originalStatus === undefined) {
            updatedDays[index]._originalStatus = updatedDays[index].status;
        }
        updatedDays[index].status = value;
        updatedDays[index]._changed = true;
        if (value !== 'present' && value !== 'rd') {
            updatedDays[index].timeIn = '';
            updatedDays[index].timeOut = '';
        }
        setDays(updatedDays);
    };

    const handleTimeChange = (index, type, value) => {
        const updatedDays = [...days];
        if (type === 'in') updatedDays[index].timeIn = value;
        if (type === 'out') updatedDays[index].timeOut = value;
        updatedDays[index]._changed = true;
        setDays(updatedDays);
    };

    const getStatus = (timeIn, timeOut, status, isRD, isHoliday) => {
        const holidayMark = isHoliday ? ' 🎉' : '';
        if (isRD && status === 'present' && timeIn && timeOut) {
            const inParts = timeIn.split(':').map(Number);
            const outParts = timeOut.split(':').map(Number);
            let inMin = inParts[0] * 60 + inParts[1];
            let outMin = outParts[0] * 60 + outParts[1];
            if (outMin < inMin) outMin += 24 * 60;
            const hrs = Math.ceil((outMin - inMin - 60) / 60);
            return <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-200 text-yellow-800">RD Duty +{hrs}h{holidayMark}</span>;
        }
        if (isRD && status === 'rd') return <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-700">RD{holidayMark}</span>;
        if (status === 'awol') return <span className="px-2 py-1 rounded text-xs font-medium bg-red-200 text-red-800">🚫 AWOL</span>;
        if (status === 'awl') return <span className="px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-700">📝 AWL</span>;
        if (status === 'absent') return <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-700">Absent</span>;
        if (status === 'holiday') return <span className="px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-700">Holiday{holidayMark}</span>;
        if (status === 'VL') return <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700">🌴 VL{holidayMark}</span>;
        if (status === 'SL') return <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-700">🤒 SL{holidayMark}</span>;
        if (status === 'EL') return <span className="px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-700">🚨 EL{holidayMark}</span>;
        if (status === 'BL') return <span className="px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-700">🎂 BL{holidayMark}</span>;
        if (status === 'present' && !timeIn && !timeOut) return <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-700">⚠️ No Time{holidayMark}</span>;
        if (!timeIn || !timeOut) return <span className="text-xs text-gray-300">-{holidayMark}</span>;

        const inParts = timeIn.split(':').map(Number);
        const outParts = timeOut.split(':').map(Number);
        let inMinutes = inParts[0] * 60 + inParts[1];
        let outMinutes = outParts[0] * 60 + outParts[1];
        let isNextDay = false;
        if (outMinutes < inMinutes) { outMinutes += 24 * 60; isNextDay = true; }
        
        const shiftStart = 8 * 60;
        const shiftEnd = 17 * 60;
        const otStart = 18 * 60;
        let result = [];
        
        if (isHoliday) result.push(<span key="hol" className="text-purple-600 font-bold">🎉 Holiday</span>);
        if (inMinutes > shiftStart) { const lateMins = inMinutes - shiftStart; result.push(<span key="late" className="text-orange-600">Late {Math.floor(lateMins/60)}h</span>); }
        if (outMinutes > otStart) { const otMins = outMinutes - otStart; result.push(<span key="ot" className="text-blue-600">OT +{Math.ceil(otMins/60)}h</span>); }
        if (isNextDay) result.push(<span key="nd" className="text-pink-600 text-xs">Next Day</span>);
        if (outMinutes > 22 * 60) result.push(<span key="ndiff" className="text-indigo-600 text-xs">ND</span>);
        
        if (result.length === 0 && !isHoliday) return <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">On Time</span>;
        if (result.length === 0 && isHoliday) return <span className="px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-700">🎉 Holiday</span>;
        return <div className="flex flex-wrap gap-1 justify-center">{result.map((r, i) => <span key={i} className="px-1 py-0.5 rounded text-xs font-medium">{r}</span>)}</div>;
    };

    const handleSave = async (index) => {
        const day = days[index];
        if (!selectedEmp) return;
        if (day.dtr_status === 'approved' && user?.role === 'employee') { setMessage('❌ DTR is approved.'); setTimeout(() => setMessage(''), 2000); return; }
        if ((day.status === 'present' || day.status === 'rd') && !day.timeIn && !day.timeOut) { setMessage('❌ Enter Time In/Out'); setTimeout(() => setMessage(''), 3000); return; }
        setSaving(true);
        try {
            await fetch('/api/attendance/status', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: parseInt(selectedEmp), full_name: selectedEmpName, date: day.date, status: day.status }) });
            if (day.status === 'awol') {
                await fetch('/api/violations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: parseInt(selectedEmp), full_name: selectedEmpName, violation_type: 'absent_no_leave', date: day.date }) });
            } else {
                await fetch('/api/violations/remove', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: parseInt(selectedEmp), date: day.date }) });
            }
            if ((day.status === 'present' || day.status === 'rd') && day.timeIn) await fetch('/api/attendance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: parseInt(selectedEmp), full_name: selectedEmpName, type: 'in', timestamp: `${day.date} ${day.timeIn}:00`, date: day.date, status: 'present' }) });
            if ((day.status === 'present' || day.status === 'rd') && day.timeOut) await fetch('/api/attendance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: parseInt(selectedEmp), full_name: selectedEmpName, type: 'out', timestamp: `${day.date} ${day.timeOut}:00`, date: day.date, status: 'present' }) });
            const updatedDays = [...days];
            updatedDays[index]._changed = false;
            updatedDays[index]._originalStatus = day.status;
            setDays(updatedDays);
            setMessage('✅ Saved!');
            setTimeout(() => setMessage(''), 2000);
        } catch (err) { setMessage('❌ Error saving'); }
        setSaving(false);
    };

    const handleSaveAll = async () => {
        if (!selectedEmp) { setMessage('❌ Select employee first'); return; }
        setSaving(true);
        let count = 0;
        for (let i = 0; i < days.length; i++) {
            const day = days[i];
            if (!day._changed) continue;
            if ((day.status === 'present' || day.status === 'rd') && !day.timeIn && !day.timeOut) continue;
            try {
                await fetch('/api/attendance/status', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: parseInt(selectedEmp), full_name: selectedEmpName, date: day.date, status: day.status }) });
                if (day.status === 'awol') { await fetch('/api/violations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: parseInt(selectedEmp), full_name: selectedEmpName, violation_type: 'absent_no_leave', date: day.date }) }); }
                else { await fetch('/api/violations/remove', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: parseInt(selectedEmp), date: day.date }) }); }
                if ((day.status === 'present' || day.status === 'rd') && day.timeIn) await fetch('/api/attendance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: parseInt(selectedEmp), full_name: selectedEmpName, type: 'in', timestamp: `${day.date} ${day.timeIn}:00`, date: day.date, status: 'present' }) });
                if ((day.status === 'present' || day.status === 'rd') && day.timeOut) await fetch('/api/attendance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: parseInt(selectedEmp), full_name: selectedEmpName, type: 'out', timestamp: `${day.date} ${day.timeOut}:00`, date: day.date, status: 'present' }) });
                count++;
            } catch (err) { console.error(err); }
        }
        setDays(prev => prev.map(d => ({ ...d, _changed: false, _originalStatus: d.status })));
        setMessage(`✅ ${count} days saved!`);
        setSaving(false);
        setTimeout(() => setMessage(''), 3000);
    };

    const handlePrintDTR = () => {
        const printWindow = window.open('', '_blank', 'width=1000,height=600');
        const table = document.querySelector('.bg-white.rounded-lg.shadow.overflow-hidden table').outerHTML;
        printWindow.document.write(`<!DOCTYPE html><html><head><title>DTR - ${selectedEmpName}</title><style>body{font-family:Arial;padding:20px}table{inline-size:100%;border-collapse:collapse;font-size:11px}th{background:#f3f4f6;padding:6px;border:1px solid #ddd}td{padding:5px;border:1px solid #ddd}@media print{body{padding:10px}}</style></head><body><h2>DTR</h2><p>${selectedEmpName} | ${dateFrom} to ${dateTo}</p>${table}<script>window.print();window.close()</script></body></html>`);
        printWindow.document.close();
    };

    const handleApproveDTR = async () => {
        if (!selectedEmp) return;
        if (!confirm('Approve DTR? Employee cannot edit after.')) return;
        try {
            const res = await fetch('/api/dtr/approve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: parseInt(selectedEmp), date_from: dateFrom, date_to: dateTo }) });
            const data = await res.json();
            setMessage(data.success ? '✅ DTR Approved!' : '❌ Failed');
            if (data.success && selectedEmp) loadRecordsForDays([...days]);
        } catch (err) { setMessage('❌ Error'); }
        setTimeout(() => setMessage(''), 3000);
    };

    const setCutoffPeriod = (period) => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        switch(period) {
            case 'first15': setDateFrom(`${year}-${month}-01`); setDateTo(`${year}-${month}-15`); break;
            case 'second15': setDateFrom(`${year}-${month}-16`); const ld = new Date(year, now.getMonth()+1, 0).getDate(); setDateTo(`${year}-${month}-${String(ld).padStart(2,'0')}`); break;
            case 'fullMonth': setDateFrom(`${year}-${month}-01`); const ldf = new Date(year, now.getMonth()+1, 0).getDate(); setDateTo(`${year}-${month}-${String(ldf).padStart(2,'0')}`); break;
        }
    };

    if (!user) return null;

    return (
        <div className="flex flex-col lg:flex-row min-h-screen bg-gray-100">
            <Sidebar user={user} />
            <div className="flex-1 w-full">
                <header className="bg-white shadow-sm p-3 md:p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <h2 className="text-base md:text-lg font-semibold text-gray-700">📋 Daily Time Record (DTR)</h2>
                    <div className="flex flex-wrap gap-1.5 md:gap-2">
                        <button onClick={handlePrintDTR} className="bg-gray-600 text-white px-2 md:px-4 py-1.5 md:py-2 rounded text-xs md:text-sm hover:bg-gray-700">🖨️ Print</button>
                        {(user?.role === 'admin' || user?.role === 'hr') && selectedEmp && (
                            <button onClick={handleApproveDTR} className="bg-purple-600 text-white px-2 md:px-4 py-1.5 md:py-2 rounded text-xs md:text-sm hover:bg-purple-700">✅ Approve</button>
                        )}
                        <button onClick={handleSaveAll} disabled={!selectedEmp || saving} className="bg-green-600 text-white px-2 md:px-4 py-1.5 md:py-2 rounded text-xs md:text-sm hover:bg-green-700 disabled:opacity-50">{saving ? '⏳' : '💾 Save All'}</button>
                    </div>
                </header>

                <main className="p-3 md:p-6">
                    {message && <div className={`px-3 md:px-4 py-2 md:py-3 rounded mb-4 text-sm ${message.includes('✅') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{message}</div>}

                    <div className="bg-white rounded-lg shadow p-3 md:p-4 mb-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-4 mb-3">
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Employee *</label>
                                <select value={selectedEmp} onChange={handleEmployeeChange} disabled={user?.role === 'employee'} className="w-full border rounded p-1.5 md:p-2 text-xs md:text-sm">
                                    <option value="">-- Choose --</option>
                                    {employees.map(emp => (<option key={emp.id} value={emp.id}>{emp.full_name}</option>))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Date From</label>
                                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full border rounded p-1.5 md:p-2 text-xs md:text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Date To</label>
                                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full border rounded p-1.5 md:p-2 text-xs md:text-sm" />
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-1 md:gap-2">
                            <button onClick={() => setCutoffPeriod('first15')} className="px-2 py-1 text-xs rounded border border-blue-300 text-blue-600 hover:bg-blue-50">1st-15th</button>
                            <button onClick={() => setCutoffPeriod('second15')} className="px-2 py-1 text-xs rounded border border-green-300 text-green-600 hover:bg-green-50">16th-EOM</button>
                            <button onClick={() => setCutoffPeriod('fullMonth')} className="px-2 py-1 text-xs rounded border border-purple-300 text-purple-600 hover:bg-purple-50">Full Month</button>
                        </div>
                    </div>

                    {selectedEmp ? (
                        <div className="bg-white rounded-lg shadow overflow-hidden">
                            <div className="p-2 md:p-3 bg-blue-50 border-b text-sm">
                                <span className="font-medium">{selectedEmpName}</span>
                                <span className="ml-2 text-xs text-gray-500">{dateFrom} to {dateTo} ({days.length} days)</span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[600px]">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="p-1.5 md:p-2 text-center text-xs uppercase text-gray-500">Date</th>
                                            <th className="p-1.5 md:p-2 text-center text-xs uppercase text-gray-500">Day</th>
                                            <th className="p-1.5 md:p-2 text-center text-xs uppercase text-gray-500">Status</th>
                                            <th className="p-1.5 md:p-2 text-center text-xs uppercase text-gray-500">In</th>
                                            <th className="p-1.5 md:p-2 text-center text-xs uppercase text-gray-500">Out</th>
                                            <th className="p-1.5 md:p-2 text-center text-xs uppercase text-gray-500">Result</th>
                                            <th className="p-1.5 md:p-2 text-center text-xs uppercase text-gray-500">Save</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {days.map((day, index) => (
                                            <tr key={day.date} className={`border-b ${day.isRD && day.status === 'rd' ? 'bg-yellow-50' : day._changed ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                                                <td className="p-1 md:p-1.5 text-center text-xs font-mono">{day.display}</td>
                                                <td className={`p-1 md:p-1.5 text-center text-xs ${day.isRD ? 'text-orange-500' : 'text-gray-500'}`}>{day.day}</td>
                                                <td className="p-1 md:p-1.5 text-center">
                                                    <select value={day.status} onChange={(e) => handleStatusChange(index, e.target.value)} disabled={(day.dtr_status === 'approved' && user?.role === 'employee')} className="text-xs border rounded p-0.5 md:p-1 w-full">
                                                        {day.isRD && <option value="rd">🏠 RD</option>}
                                                        <option value="present">✅ Present</option>
                                                        <option value="absent">❌ Absent</option>
                                                        <option value="awol">🚫 AWOL</option>
                                                        <option value="awl">📝 AWL</option>
                                                        <option value="holiday">🎉 Holiday</option>
                                                        <option value="leave">🏖️ Leave</option>
                                                    </select>
                                                </td>
                                                <td className="p-1 md:p-1.5 text-center">
                                                    <input type="time" value={day.timeIn} onChange={(e) => handleTimeChange(index, 'in', e.target.value)} disabled={(day.status !== 'present' && day.status !== 'rd') || (day.dtr_status === 'approved' && user?.role === 'employee')} className="w-full text-center text-xs disabled:bg-gray-100 p-0.5 md:p-1" />
                                                </td>
                                                <td className="p-1 md:p-1.5 text-center">
                                                    <input type="time" value={day.timeOut} onChange={(e) => handleTimeChange(index, 'out', e.target.value)} disabled={(day.status !== 'present' && day.status !== 'rd') || (day.dtr_status === 'approved' && user?.role === 'employee')} className="w-full text-center text-xs disabled:bg-gray-100 p-0.5 md:p-1" />
                                                </td>
                                                <td className="p-1 md:p-1.5 text-center">{getStatus(day.timeIn, day.timeOut, day.status, day.isRD, day.isHoliday)}</td>
                                                <td className="p-1 md:p-1.5 text-center">
                                                    <button onClick={() => handleSave(index)} disabled={(day.dtr_status === 'approved' && user?.role === 'employee')} className="text-xs bg-blue-500 text-white px-1.5 md:px-2 py-0.5 md:py-1 rounded hover:bg-blue-600 disabled:opacity-30">Save</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-lg shadow p-8 md:p-12 text-center text-gray-400">👆 Select an employee to view DTR</div>
                    )}
                </main>
            </div>
        </div>
    );
}