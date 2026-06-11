// POST - Manual Time In/Out
export async function POST(request) {
    try {
        const data = await request.json();
        const { user_id, full_name, type, timestamp, date, notes } = data;

        if (!user_id || !type || !timestamp) {
            return errorResponse('User ID, type, and timestamp are required');
        }

        const result = await query(
            'INSERT INTO attendance (user_id, full_name, type, timestamp, date, notes) VALUES (?, ?, ?, ?, ?, ?)',
            [user_id, full_name, type, timestamp, date || new Date().toISOString().split('T')[0], notes || null]
        );

        return successResponse(
            { id: result.insertId, type, timestamp },
            `Manual ${type.toUpperCase()} recorded successfully!`
        );
    } catch (error) {
        console.error('Manual attendance error:', error);
        return errorResponse('Failed to record attendance');
    }
}