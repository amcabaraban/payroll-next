import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

export async function getSession() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;
        if (!token) return null;
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch {
        return null;
    }
}