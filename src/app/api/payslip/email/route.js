import nodemailer from 'nodemailer';
import { getRow } from '@/lib/db';

export async function POST(request) {
    try {
        const { user_id, period_from, period_to } = await request.json();
        
        if (!user_id) {
            return Response.json({ success: false, message: 'User ID is required' }, { status: 400 });
        }

        const emp = await getRow('SELECT id, full_name, email FROM users WHERE id = ?', [user_id]);
        if (!emp || !emp.email) {
            return Response.json({ success: false, message: 'Employee email not found' }, { status: 400 });
        }

        const company = await getRow('SELECT * FROM company_settings ORDER BY id DESC LIMIT 1');

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'a.cabarabanjr@gmail.com',
                pass: 'xfcy xbtw ndbq efbn',
            },
        });

        await transporter.sendMail({
            from: `"${company?.company_name || 'Payroll System'}" <a.cabarabanjr@gmail.com>`,
            to: emp.email,
            subject: `Payslip - ${period_from} to ${period_to}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-inline-size: 600px; margin: 0 auto;">
                    <div style="background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                        <h2>${company?.company_name || 'Payroll Management Inc.'}</h2>
                        <p style="margin: 0;">Payslip Notification</p>
                    </div>
                    <div style="border: 1px solid #e5e7eb; padding: 20px; border-radius: 0 0 8px 8px;">
                        <p>Dear <strong>${emp.full_name}</strong>,</p>
                        <p>Your payslip for <strong>${period_from} to ${period_to}</strong> is ready.</p>
                        <p>Log in to view and download your payslip.</p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="https://payroll-next-system.vercel.app/dashboard/payslip" 
                               style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
                                View Payslip
                            </a>
                        </div>
                        <p style="color: #6b7280; font-size: 12px;">This is an automated message.</p>
                    </div>
                </div>
            `,
        });

        return Response.json({ success: true, message: `Payslip emailed to ${emp.email}` });
    } catch (error) {
        return Response.json({ success: false, message: 'Failed: ' + error.message }, { status: 500 });
    }
}