import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { getRow, query } from '@/lib/db';

function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

// Per-IP rate limiting so an attacker can't brute-force reset tokens
const resetAttempts = new Map();

export async function POST(request) {
    try {
        // Rate limiting check – first entry of X-Forwarded-For if present
        const ip = (request.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim() || 'unknown';
        const now = Date.now();
        const windowMs = 10 * 60 * 1000;
        const maxAttempts = 5;

        // Prune stale entries if the map grows large
        if (resetAttempts.size > 5000) {
            for (const [key, stamps] of resetAttempts) {
                const kept = stamps.filter(t => now - t < windowMs);
                if (kept.length === 0) resetAttempts.delete(key);
                else resetAttempts.set(key, kept);
            }
        }

        if (!resetAttempts.has(ip)) {
            resetAttempts.set(ip, []);
        }

        const attempts = resetAttempts.get(ip).filter(t => now - t < windowMs);

        if (attempts.length >= maxAttempts) {
            return NextResponse.json(
                { success: false, message: 'Too many attempts. Try again in 10 minutes.' },
                { status: 429 }
            );
        }

        attempts.push(now);
        resetAttempts.set(ip, attempts);

        // Body must be JSON; reject malformed payloads with 400 instead of 500
        let token, password;
        try {
            const body = await request.json();
            token = body?.token;
            password = body?.password;
        } catch {
            return NextResponse.json(
                { success: false, message: 'Invalid request body' },
                { status: 400 }
            );
        }

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