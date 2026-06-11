import { query } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/response';

export async function GET() {
    try {
        const shifts = await query('SELECT * FROM shifts ORDER BY name');
        return successResponse(shifts);
    } catch (error) {
        return errorResponse('Failed to fetch shifts');
    }
}

export async function POST(request) {
    try {
        const data = await request.json();
        const result = await query(
            'INSERT INTO shifts (name, time_in, time_out, description) VALUES (?, ?, ?, ?)', 
            [data.name, data.time_in, data.time_out, data.description || null]
        );
        return successResponse({ id: result.insertId }, 'Shift added');
    } catch (error) {
        return errorResponse('Failed to add shift');
    }
}

export async function PUT(request) {
    try {
        const data = await request.json();
        await query(
            'UPDATE shifts SET name = ?, time_in = ?, time_out = ?, description = ? WHERE id = ?', 
            [data.name, data.time_in, data.time_out, data.description, data.id]
        );
        return successResponse(null, 'Shift updated');
    } catch (error) {
        return errorResponse('Failed to update shift');
    }
}

export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        await query('DELETE FROM shifts WHERE id = ?', [id]);
        return successResponse(null, 'Shift deleted');
    } catch (error) {
        return errorResponse('Failed to delete shift');
    }
}