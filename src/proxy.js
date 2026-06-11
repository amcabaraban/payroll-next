import { NextResponse } from 'next/server';

export default function proxy(request) {
    const { pathname } = request.nextUrl;
    
    // Protect all dashboard routes
    if (pathname.startsWith('/dashboard')) {
        const userCookie = request.cookies.get('user_data')?.value;
        
        if (!userCookie) {
            const loginUrl = new URL('/login', request.url);
            return NextResponse.redirect(loginUrl);
        }
        
        // Verify the cookie is valid JSON
        try {
            const user = JSON.parse(userCookie);
            if (!user.id || !user.role) {
                const loginUrl = new URL('/login', request.url);
                return NextResponse.redirect(loginUrl);
            }
        } catch {
            const loginUrl = new URL('/login', request.url);
            return NextResponse.redirect(loginUrl);
        }
    }
    
    // If already logged in, redirect away from login page
    if (pathname === '/login') {
        const userCookie = request.cookies.get('user_data')?.value;
        if (userCookie) {
            try {
                const user = JSON.parse(userCookie);
                if (user.id) {
                    return NextResponse.redirect(new URL('/dashboard', request.url));
                }
            } catch {}
        }
    }
    
    return NextResponse.next();
}