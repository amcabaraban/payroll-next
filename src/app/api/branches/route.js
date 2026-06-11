import { query } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/response';

export async function GET() {
    try {
        const branches = await query('SELECT * FROM branches ORDER BY name');
        return successResponse(branches);
    } catch (error) {
        return errorResponse('Failed to fetch branches');
    }
}

export async function POST(request) {
    try {
        const data = await request.json();
        const result = await query('INSERT INTO branches (name, code, address, contact_no) VALUES (?, ?, ?, ?)', [data.name, data.code || null, data.address || null, data.contact_no || null]);
        return successResponse({ id: result.insertId }, 'Branch added');
    } catch (error) {
        return errorResponse('Failed to add branch');
    }
}

export async function PUT(request) {
    try {
        const data = await request.json();
        await query('UPDATE branches SET name = ?, code = ?, address = ?, contact_no = ? WHERE id = ?', [data.name, data.code, data.address, data.contact_no, data.id]);
        return successResponse(null, 'Branch updated');
    } catch (error) {
        return errorResponse('Failed to update branch');
    }
}

export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        await query('DELETE FROM branches WHERE id = ?', [id]);
        return successResponse(null, 'Branch deleted');
    } catch (error) {
        return errorResponse('Failed to delete branch');
    }
}