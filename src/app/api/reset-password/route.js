import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { getRow, query } from '@/lib/db';

function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

export async function POST(request) {
    try {
        const { token, password } = await request.json();

        if (!token || !password) {
            return NextResponse.json(
                { success: false, message: 'Token and new password are required' },
                { status: 400 }
            );
        }

        if (password.length < 6) {
            return NextResponse.json(
                { success: false, message: 'Password must be at least 6 characters' },
                { status: 400 }
            );
        }

        const tokenHash = hashToken(token);

        // Single-use: only a valid, unexpired token matches
        const user = await getRow(
            'SELECT id FROM users WHERE reset_token = ? AND reset_token_expires > NOW()',
            [tokenHash]
        );

        if (!user) {
            return NextResponse.json(
                { success: false, message: 'This reset link is invalid or has expired. Please request a new one.' },
                { status: 400 }
            );
        }

        // Hash the new password (same cost as the login route)
        const hashedPassword = bcrypt.hashSync(password, 10);

        await query(
            'UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
            [hashedPassword, user.id]
        );

        return NextResponse.json({
            success: true,
            message: 'Password reset successfully. You can now sign in with your new password.',
        });

    } catch (error) {
        console.error(
            'Reset password API error (run migrations/001_add_password_reset_columns.sql if reset_token column is missing):',
            error
        );
        return NextResponse.json(
            { success: false, message: 'Server error' },
            { status: 500 }
        );
    }
}