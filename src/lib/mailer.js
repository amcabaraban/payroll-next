import nodemailer from 'nodemailer';

// Centralized email configuration.
// Uses SMTP_USER / SMTP_PASS from .env(.local/.production) when available,
// otherwise falls back to the same Gmail account used by the payslip
// email feature so password reset emails work out of the box.
const SMTP_USER = process.env.SMTP_USER || 'a.cabarabanjr@gmail.com';
const SMTP_PASS = process.env.SMTP_PASS || 'xfcy xbtw ndbq efbn';

export function getMailTransporter() {
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: SMTP_USER,
            pass: SMTP_PASS,
        },
    });
}

export function getMailFrom() {
    return SMTP_USER;
}