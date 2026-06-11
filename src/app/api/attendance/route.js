import { query } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/response';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('user_id');
        const dateFrom = searchParams.get('date_from') || '';
        const dateTo = searchParams.get('date_to') || '';

        if (!userId) return errorResponse('User ID is required');

        let sql = 'SELECT * FROM attendance WHERE user_id = ?';
        const params = [userId];

        if (dateFrom && dateTo) {
            sql += ' AND date >= ? AND date <= ?';
            params.push(dateFrom, dateTo);
        }

        sql += ' ORDER BY date ASC, timestamp ASC';
        const records = await query(sql, params);

        // Simple grouping: isang loop lang
        const grouped = {};
        for (const r of records) {
            const d = new Date(r.date);
            const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            
            if (!grouped[dateStr]) {
                grouped[dateStr] = { date: dateStr, timeIn: null, timeOut: null, status: 'present', notes: [], dtr_status: 'pending' };
            }
            
            if (r.type === 'in' && r.timestamp) grouped[dateStr].timeIn = r.timestamp;
            if (r.type === 'out' && r.timestamp) grouped[dateStr].timeOut = r.timestamp;
            
            if (r.status && r.status !== 'present') {
                grouped[dateStr].status = r.status;
            }
            if (r.dtr_status) {                          // ← Idagdag ito
                grouped[dateStr].dtr_status = r.dtr_status;
            }
            if (r.notes) grouped[dateStr].notes.push(r.notes);
        }

        const result = Object.values(grouped).map(day => ({
            date: day.date,
            timeIn: day.timeIn,
            timeOut: day.timeOut,
            status: day.status,
            dtr_status: day.dtr_status || 'pending',  // ← Idagdag ito
            notes: day.notes.join(', ') || '-',
        }));

        return successResponse(result);
    } catch (error) {
        console.error(error);
        return errorResponse('Failed to fetch attendance');
    }
}

// POST - UPSERT time in/out
export async function POST(request) {
    try {
        const data = await request.json();
        const { user_id, full_name, type, timestamp, date, notes, status } = data;

        if (!user_id || !type || !timestamp) {
            return errorResponse('User ID, type, and timestamp are required');
        }

        const existing = await query(
            'SELECT id FROM attendance WHERE user_id = ? AND date = ? AND type = ?',
            [user_id, date, type]
        );

        if (existing.length > 0) {
            await query(
                'UPDATE attendance SET timestamp = ?, status = ?, notes = ?, full_name = ? WHERE id = ?',
                [timestamp, status || 'present', notes || null, full_name, existing[0].id]
            );
        } else {
            await query(
                'INSERT INTO attendance (user_id, full_name, type, timestamp, date, notes, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [user_id, full_name, type, timestamp, date, notes || null, status || 'present']
            );
        }

        return successResponse(null, `${type.toUpperCase()} saved!`);
    } catch (error) {
        return errorResponse('Failed to save: ' + error.message);
    }
}