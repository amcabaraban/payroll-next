'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export function useAuth() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const userData = localStorage.getItem('user');

        if (!userData) {
            router.replace('/login');
            return;
        }

        try {
            const parsedUser = JSON.parse(userData);
            setUser(parsedUser);
        } catch {
            localStorage.removeItem('user');
            router.replace('/login');
        } finally {
            setLoading(false);
        }
    }, []);

    const logout = async () => {
        localStorage.removeItem('user');
        try {
            await fetch('/api/logout', { method: 'POST' });
        } catch (err) {
            console.error('Logout error:', err);
        }
        setUser(null);
        router.replace('/login');
    };

    return { user, loading, logout };
}