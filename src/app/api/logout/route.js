import { NextResponse } from 'next/server';

export async function POST() {
    const isProduction = process.env.NODE_ENV === 'production';
    
    const response = NextResponse.json({
        success: true,
        message: 'Logged out successfully'
    });

    response.cookies.set('user_data', '', {
        httpOnly: false,
        secure: isProduction,
        sameSite: isProduction ? 'strict' : 'lax',
        maxAge: 0,
        path: '/',
    });

    return response;
}