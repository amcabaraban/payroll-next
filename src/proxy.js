import { NextResponse } from 'next/server';

export default function proxy(request) {
    const { pathname } = request.nextUrl;
    const response = handleAuthAndHeaders(request, pathname);
    
    if (response) return response;
    
    // Continue with security headers
    const nextResponse = NextResponse.next();
    addSecurityHeaders(nextResponse);
    return nextResponse;
}

function handleAuthAndHeaders(request, pathname) {
    // Protect all dashboard routes
    if (pathname.startsWith('/dashboard')) {
        const userCookie = request.cookies.get('user_data')?.value;
        
        if (!userCookie) {
            const loginUrl = new URL('/login', request.url);
            return NextResponse.redirect(loginUrl);
        }
        
        try {
            const user = JSON.parse(userCookie);
            if (!user.id || !user.role) {
                return NextResponse.redirect(new URL('/login', request.url));
            }
        } catch {
            return NextResponse.redirect(new URL('/login', request.url));
        }
    }
    
    // Redirect away from login if already logged in
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
    
    return null;
}

function addSecurityHeaders(response) {
    // Content Security Policy
    const csp = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob: https:",
        "font-src 'self' data:",
        "connect-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
        "upgrade-insecure-requests",
    ].join('; ');
    
    response.headers.set('Content-Security-Policy', csp);
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
}

export const config = {
    matcher: [
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
};