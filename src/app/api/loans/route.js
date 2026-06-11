import { query, getRow } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/response';

// GET - List loans
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('user_id');

        let sql = 'SELECT * FROM loans WHERE 1=1';
        const params = [];

        if (userId) {
            sql += ' AND user_id = ?';
            params.push(userId);
        }

        sql += ' ORDER BY created_at DESC';
        const loans = await query(sql, params);

        // Get payments for each loan
        for (let loan of loans) {
            const payments = await query(
                'SELECT * FROM loan_payments WHERE loan_id = ? ORDER BY payment_date DESC',
                [loan.id]
            );
            loan.payments = payments;
        }

        return successResponse(loans);
    } catch (error) {
        return errorResponse('Failed to fetch loans');
    }
}

// POST - Add loan
export async function POST(request) {
    try {
        const data = await request.json();
        const { user_id, full_name, loan_type, loan_amount, monthly_amortization, total_months, start_date } = data;

        const result = await query(
            `INSERT INTO loans (user_id, full_name, loan_type, loan_amount, monthly_amortization, total_months, balance, start_date, status) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
            [user_id, full_name, loan_type, loan_amount, monthly_amortization, total_months, loan_amount, start_date]
        );

        return successResponse({ id: result.insertId }, 'Loan added');
    } catch (error) {
        return errorResponse('Failed to add loan');
    }
}

// PUT - Make payment
export async function PUT(request) {
    try {
        const data = await request.json();
        const { loan_id, amount, month_number, payment_date } = data;

        const loan = await getRow('SELECT * FROM loans WHERE id = ?', [loan_id]);
        if (!loan) return errorResponse('Loan not found');

        // Insert payment
        await query(
            'INSERT INTO loan_payments (loan_id, amount, payment_date, month_number) VALUES (?, ?, ?, ?)',
            [loan_id, amount, payment_date, month_number]
        );

        // Update loan balance and months paid
        const newBalance = loan.balance - amount;
        const newStatus = newBalance <= 0 ? 'paid' : 'active';

        await query(
            'UPDATE loans SET balance = ?, months_paid = months_paid + 1, status = ? WHERE id = ?',
            [newBalance, newStatus, loan_id]
        );

        return successResponse(null, 'Payment recorded');
    } catch (error) {
        return errorResponse('Failed to record payment');
    }
}