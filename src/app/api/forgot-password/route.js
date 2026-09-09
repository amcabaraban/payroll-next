import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { getRow, query } from '@/lib/db';
import { getMailTransporter, getMailFrom } from '@/lib/mailer';

// Per-IP rate limiting so the endpoint can't be used to spam emails
const resetRequests = new Map();

function hashToken(token) {
    // Only the hash is stored in the DB; the raw token is sent by email
    return crypto.createHash('sha256').update(token).digest('hex');
}

export async function POST(request) {
    try {
        // Rate limiting check
        const ip = request.headers.get('x-forwarded-for') || 'unknown';
        const now = Date.now();
        const windowMs = 10 * 60 * 1000;
        const maxRequests = 3;

        if (!resetRequests.has(ip)) {
            resetRequests.set(ip, []);
        }

        const requests = resetRequests.get(ip).filter(t => now - t < windowMs);

        if (requests.length >= maxRequests) {
            return NextResponse.json(
                { success: false, message: 'Too many requests. Try again in 10 minutes.' },
                { status: 429 }
            );
        }

        requests.push(now);
        resetRequests.set(ip, requests);

        const { email } = await request.json();

        if (!email) {
            return NextResponse.json(
                { success: false, message: 'Email is required' },
                { status: 400 }
            );
        }

        const user = await getRow(
            'SELECT id, full_name, email FROM users WHERE email = ?',
            [email]
        );

        // Always respond with the same message whether or not the email
        // exists, so the endpoint cannot be used to probe registered emails.
        if (user) {
            const token = crypto.randomBytes(32).toString('hex');
            const tokenHash = hashToken(token);
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
            const resetLink = `${appUrl}/reset-password?token=${token}`;

            // Invalidate any previous tokens and set a 30-minute expiry
            await query(
                'UPDATE users SET reset_token = ?, reset_token_expires = DATE_ADD(NOW(), INTERVAL 30 MINUTE) WHERE id = ?',
                [tokenHash, user.id]
            );

            const transporter = getMailTransporter();

            await transporter.sendMail({
                from: `"Payroll Management System" <${getMailFrom()}>`,
                to: user.email,
                subject: 'Reset your password',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <div style="background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                            <h2>Payroll Management System</h2>
                            <p style="margin: 0;">Password Reset</p>
                        </div>
                        <div style="border: 1px solid #e5e7eb; padding: 20px; border-radius: 0 0 8px 8px;">
                            <p>Dear <strong>${user.full_name}</strong>,</p>
                            <p>We received a request to reset your password. Click the button below to choose a new one. This link is valid for <strong>30 minutes</strong>.</p>
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="${resetLink}"
                                   style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
                                    Reset Password
                                </a>
                            </div>
                            <p style="color: #6b7280; font-size: 12px;">If you didn't request this, you can safely ignore this email.</p>
                        </div>
                    </div>
                `,
            });
        }

        return NextResponse.json({
            success: true,
            message: 'If an account exists for that email, a password reset link has been sent.',
        });

    } catch (error) {
        console.error(
            'Forgot password API error (run migrations/001_add_password_reset_columns.sql if reset_token column is missing):',
            error
        );
        return NextResponse.json(
            { success: false, message: 'Server error' },
            { status: 500 }
        );
    }
}