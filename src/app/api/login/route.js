import { NextResponse } from 'next/server';
import { getRow } from '@/lib/db';

export async function POST(request) {
    try {
        const { email, password } = await request.json();

        console.log('Login attempt:', email);

        if (!email || !password) {
            return NextResponse.json(
                { success: false, message: 'Email and password are required' },
                { status: 400 }
            );
        }

        // Find user
        const user = await getRow(
            'SELECT id, full_name, email, role, department, position FROM users WHERE email = ? AND password = ?',
            [email, password]
        );

        console.log('User found:', user ? 'Yes' : 'No');

        if (!user) {
            return NextResponse.json(
                { success: false, message: 'Invalid email or password' },
                { status: 401 }
            );
        }

        const response = NextResponse.json({
            success: true,
            message: 'Login successful',
            data: {
                user: {
                    id: user.id,
                    full_name: user.full_name,
                    email: user.email,
                    role: user.role,
                    department: user.department || '',
                    position: user.position || '',
                }
            }
        });

        // Set cookie
        response.cookies.set('user_data', JSON.stringify({
            id: user.id,
            full_name: user.full_name,
            role: user.role,
        }), {
            httpOnly: false,
            secure: false,
            sameSite: 'lax',
            maxAge: 60 * 60 * 8,
            path: '/',
        });

        return response;

    } catch (error) {
        console.error('Login API error:', error);
        return NextResponse.json(
            { success: false, message: 'Server error: ' + error.message },
            { status: 500 }
        );
    }
}