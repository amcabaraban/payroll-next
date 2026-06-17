import { NextResponse } from 'next/server';
import { getRow, query } from '@/lib/db';
import bcrypt from 'bcryptjs';

// Rate limiting
const loginAttempts = new Map();

export async function POST(request) {
    try {
        // Rate limiting check
        const ip = request.headers.get('x-forwarded-for') || 'unknown';
        const now = Date.now();
        const windowMs = 60 * 1000;
        const maxAttempts = 5;

        if (!loginAttempts.has(ip)) {
            loginAttempts.set(ip, []);
        }

        const attempts = loginAttempts.get(ip).filter(t => now - t < windowMs);
        loginAttempts.set(ip, attempts);

        if (attempts.length >= maxAttempts) {
            return NextResponse.json(
                { success: false, message: 'Too many attempts. Try again in 1 minute.' },
                { status: 429 }
            );
        }

        const { email, password } = await request.json();

        if (!email || !password) {
            return NextResponse.json(
                { success: false, message: 'Email and password are required' },
                { status: 400 }
            );
        }

        // Find user by email ONLY (not password in query)
        const user = await getRow(
            'SELECT id, full_name, email, role, password FROM users WHERE email = ?',
            [email]
        );

        if (!user) {
            attempts.push(now);
            return NextResponse.json(
                { success: false, message: 'Invalid email or password' },
                { status: 401 }
            );
        }

        // Verify password
        const validPassword = user.password.startsWith('$2')
            ? bcrypt.compareSync(password, user.password)
            : password === user.password;

        if (!validPassword) {
            attempts.push(now);
            return NextResponse.json(
                { success: false, message: 'Invalid email or password' },
                { status: 401 }
            );
        }

        // Auto-upgrade plain password to hashed
        if (!user.password.startsWith('$2')) {
            const hashed = bcrypt.hashSync(password, 10);
            await query('UPDATE users SET password = ? WHERE id = ?', [hashed, user.id]);
        }

        // Don't send password back
        const { password: _, ...safeUser } = user;

        const response = NextResponse.json({
            success: true,
            message: 'Login successful',
            data: {
                user: {
                    id: safeUser.id,
                    full_name: safeUser.full_name,
                    email: safeUser.email,
                    role: safeUser.role,
                }
            }
        });

        // Secure cookie
        response.cookies.set('user_data', JSON.stringify({
            id: user.id,
            full_name: user.full_name,
            role: user.role,
        }), {
            httpOnly: true, // Changed to true - not accessible by JavaScript
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict', // Changed from lax to strict
            maxAge: 60 * 60 * 8,
            path: '/',
        });

        return response;

    } catch (error) {
        console.error('Login API error:', error);
        return NextResponse.json(
            { success: false, message: 'Server error' },
            { status: 500 }
        );
    }
}