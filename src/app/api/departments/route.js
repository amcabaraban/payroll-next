import { query } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/response';

export async function GET() {
    try {
        const departments = await query('SELECT * FROM departments ORDER BY name');
        return successResponse(departments);
    } catch (error) {
        return errorResponse('Failed to fetch departments');
    }
}

export async function POST(request) {
    try {
        const data = await request.json();
        const result = await query('INSERT INTO departments (name, code, description) VALUES (?, ?, ?)', [data.name, data.code, data.description || null]);
        return successResponse({ id: result.insertId }, 'Department added');
    } catch (error) {
        return errorResponse('Failed to add department');
    }
}

export async function PUT(request) {
    try {
        const data = await request.json();
        await query('UPDATE departments SET name = ?, code = ?, description = ? WHERE id = ?', [data.name, data.code, data.description, data.id]);
        return successResponse(null, 'Department updated');
    } catch (error) {
        return errorResponse('Failed to update department');
    }
}

export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        await query('DELETE FROM departments WHERE id = ?', [id]);
        return successResponse(null, 'Department deleted');
    } catch (error) {
        return errorResponse('Failed to delete department');
    }
}