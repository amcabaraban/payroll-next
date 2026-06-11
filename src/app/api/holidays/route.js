import { query } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/response';

export async function GET() {
    try {
        const holidays = await query('SELECT * FROM holidays ORDER BY date ASC');
        return successResponse(holidays);
    } catch (error) {
        return errorResponse('Failed to fetch holidays');
    }
}

export async function POST(request) {
    try {
        const data = await request.json();
        await query('INSERT INTO holidays (name, date, type, rate) VALUES (?, ?, ?, ?)', 
            [data.name, data.date, data.type, data.rate]);
        return successResponse(null, 'Holiday added');
    } catch (error) {
        return errorResponse('Failed to add holiday');
    }
}

export async function PUT(request) {
    try {
        const data = await request.json();
        await query('UPDATE holidays SET name = ?, date = ?, type = ?, rate = ? WHERE id = ?',
            [data.name, data.date, data.type, data.rate, data.id]);
        return successResponse(null, 'Holiday updated');
    } catch (error) {
        return errorResponse('Failed to update holiday');
    }
}

export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        await query('DELETE FROM holidays WHERE id = ?', [id]);
        return successResponse(null, 'Holiday deleted');
    } catch (error) {
        return errorResponse('Failed to delete holiday');
    }
}