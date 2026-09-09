'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const resetSchema = z
    .object({
        password: z
            .string()
            .min(1, 'Password is required')
            .min(6, 'Password must be at least 6 characters'),
        confirmPassword: z.string().min(1, 'Please confirm your password'),
    })
    .superRefine((data, ctx) => {
        if (data.password !== data.confirmPassword) {
            ctx.addIssue({
                code: 'custom',
                path: ['confirmPassword'],
                message: 'Passwords do not match',
            });
        }
    });

function ResetPasswordForm() {
    const [isLoading, setIsLoading] = useState(false);
    const [serverError, setServerError] = useState('');
    const [success, setSuccess] = useState(false);
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get('token');

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(resetSchema),
        defaultValues: {
            password: '',
            confirmPassword: '',
        },
    });

    const onSubmit = async (data) => {
        if (!token) return;

        setIsLoading(true);
        setServerError('');

        try {
            const response = await fetch('/api/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password: data.password }),
            });

            const result = await response.json();

            if (result.success) {
                setSuccess(true);
                setTimeout(() => router.push('/login'), 3000);
            } else {
                setServerError(result.message || 'Unable to reset your password. Please try again.');
            }
        } catch (err) {
            setServerError('Network error. Please check your connection.');
        } finally {
            setIsLoading(false);
        }
    };

    // No token in the URL -> the reset link is invalid/incomplete
    if (!token) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-gray-100 p-4">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-6 text-center">
                        <h1 className="text-2xl font-bold text-white">Payroll Management System</h1>
                        <p className="text-blue-100 mt-1 text-sm">Password Reset</p>
                    </div>
                    <div className="p-8">
                        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded mb-6">
                            This reset link is invalid or incomplete. Please request a new password reset link.
                        </div>
                        <a href="/forgot-password"
                            className="block w-full text-center bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700">
                            Request a New Reset Link
                        </a>
                        <p className="text-center text-sm text-gray-500 mt-6">
                            <a href="/login" className="text-blue-600 hover:underline">&larr; Back to Sign In</a>
                        </p>
                    </div>
                </div>
            </div>
        );
    }
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
                        Set a New Password
                    </h2>
                    <p className="text-gray-500 text-center text-sm mb-6">
                        Choose a strong password for your account
                    </p>

                    {/* Success Alert */}
                    {success && (
                        <div className="bg-green-50 border-l-4 border-green-500 text-green-700 p-4 rounded mb-6">
                            Password reset successfully! Redirecting you to sign in...
                        </div>
                    )}

                    {/* Error Alert */}
                    {serverError && (
                        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded mb-6">
                            {serverError}
                        </div>
                    )}

                    {success ? (
                        <a href="/login"
                            className="block w-full text-center bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700">
                            Back to Sign In
                        </a>
                    ) : (
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                            {/* New Password Field */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    New Password
                                </label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                        </svg>
                                    </span>
                                    <input
                                        {...register('password')}
                                        type="password"
                                        autoComplete="new-password"
                                        className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition disabled:bg-gray-50 disabled:cursor-not-allowed ${
                                            errors.password ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'
                                        }`}
                                        placeholder="••••••••"
                                        disabled={isLoading}
                                    />
                                </div>
                                {errors.password && (
                                    <p className="text-red-500 text-xs mt-1.5">{errors.password.message}</p>
                                )}
                            </div>

                            {/* Confirm Password Field */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Confirm New Password
                                </label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                        </svg>
                                    </span>
                                    <input
                                        {...register('confirmPassword')}
                                        type="password"
                                        autoComplete="new-password"
                                        className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition disabled:bg-gray-50 disabled:cursor-not-allowed ${
                                            errors.confirmPassword ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'
                                        }`}
                                        placeholder="••••••••"
                                        disabled={isLoading}
                                    />
                                </div>
                                {errors.confirmPassword && (
                                    <p className="text-red-500 text-xs mt-1.5">{errors.confirmPassword.message}</p>
                                )}
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center"
                            >
                                {isLoading ? 'Resetting...' : 'RESET PASSWORD'}
                            </button>
                        </form>
                    )}

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
export default function ResetPasswordPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-gray-100 p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center text-gray-500">
                        Loading...
                    </div>
                </div>
            }
        >
            <ResetPasswordForm />
        </Suspense>
    );
}