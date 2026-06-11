import { query } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/response';

export async function GET() {
    try {
        const designations = await query(`
            SELECT d.*, dep.name as department_name 
            FROM designations d 
            LEFT JOIN departments dep ON d.department_id = dep.id 
            ORDER BY d.name
        `);
        return successResponse(designations);
    } catch (error) {
        return errorResponse('Failed to fetch designations');
    }
}

export async function POST(request) {
    try {
        const data = await request.json();
        const result = await query(
            'INSERT INTO designations (name, department_id, description) VALUES (?, ?, ?)', 
            [data.name, data.department_id || null, data.description || null]
        );
        return successResponse({ id: result.insertId }, 'Designation added');
    } catch (error) {
        return errorResponse('Failed to add designation');
    }
}

export async function PUT(request) {
    try {
        const data = await request.json();
        await query(
            'UPDATE designations SET name = ?, department_id = ?, description = ? WHERE id = ?', 
            [data.name, data.department_id, data.description, data.id]
        );
        return successResponse(null, 'Designation updated');
    } catch (error) {
        return errorResponse('Failed to update designation');
    }
}

export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        await query('DELETE FROM designations WHERE id = ?', [id]);
        return successResponse(null, 'Designation deleted');
    } catch (error) {
        return errorResponse('Failed to delete designation');
    }
}