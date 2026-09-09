'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const forgotSchema = z.object({
    email: z
        .string()
        .min(1, 'Email is required')
        .email('Please enter a valid email'),
});

export default function ForgotPasswordPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [notice, setNotice] = useState({ type: '', text: '' });

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(forgotSchema),
        defaultValues: {
            email: '',
        },
    });

    const onSubmit = async (data) => {
        setIsLoading(true);
        setNotice({ type: '', text: '' });

        try {
            const response = await fetch('/api/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            const result = await response.json();

            if (result.success) {
                setNotice({ type: 'success', text: result.message });
            } else {
                setNotice({
                    type: 'error',
                    text: result.message || 'Something went wrong. Please try again.',
                });
            }
        } catch (err) {
            setNotice({ type: 'error', text: 'Network error. Please check your connection.' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-gray-100 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-6 text-center">
                    <h1 className="text-2xl font-bold text-white">
                        Payroll Management System
                    </h1>
                    <p className="text-blue-100 mt-1 text-sm">
                        Employee Management & Payroll Solution
                    </p>
                </div>

                {/* Form */}
                <div className="p-8">
                    <h2 className="text-xl font-semibold text-gray-800 text-center mb-2">
                        Forgot Password
                    </h2>
                    <p className="text-gray-500 text-center text-sm mb-6">
                        Enter your account email and we&apos;ll send you a password reset link
                    </p>

                    {/* Notice */}
                    {notice.type === 'error' && (
                        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded mb-6">
                            {notice.text}
                        </div>
                    )}
                    {notice.type === 'success' && (
                        <div className="bg-green-50 border-l-4 border-green-500 text-green-700 p-4 rounded mb-6">
                            {notice.text}
                        </div>
                    )}

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                        {/* Email Field */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Email Address
                            </label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                </span>
                                <input
                                    {...register('email')}
                                    type="email"
                                    autoComplete="email"
                                    className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition disabled:bg-gray-50 disabled:cursor-not-allowed ${
                                        errors.email ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'
                                    }`}
                                    placeholder="admin123@gmail.com"
                                    disabled={isLoading}
                                />
                            </div>
                            {errors.email && (
                                <p className="text-red-500 text-xs mt-1.5">{errors.email.message}</p>
                            )}
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center"
                        >
                            {isLoading ? 'Sending...' : 'SEND RESET LINK'}
                        </button>
                    </form>

                    {/* Footer */}
                    <p className="text-center text-sm text-gray-500 mt-6">
                        <a href="/login" className="text-blue-600 hover:underline">
                            &larr; Back to Sign In
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
}