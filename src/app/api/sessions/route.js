import { NextResponse } from 'next/server';
import { getRow } from '@/lib/db';

export async function GET(request) {
    try {
        const userId = request.cookies.get('auth_token')?.value;
        
        if (!userId) {
            return NextResponse.json(
                { success: false, message: 'Not authenticated' },
                { status: 401 }
            );
        }
        
        const user = await getRow(
            'SELECT id, full_name, role, department, position FROM users WHERE id = ?',
            [userId]
        );
        
        if (!user) {
            return NextResponse.json(
                { success: false, message: 'User not found' },
                { status: 401 }
            );
        }
        
        return NextResponse.json({
            success: true,
            user: {
                id: user.id,
                full_name: user.full_name,
                role: user.role,
                department: user.department,
                position: user.position,
            }
        });
        
    } catch (error) {
        return NextResponse.json(
            { success: false, message: 'Session check failed' },
            { status: 500 }
        );
    }
}