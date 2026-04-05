'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth-store';

export default function LoginPage() {
  const router = useRouter();
  const { login, error, isLoading, clearError } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    clearError();

    // Basic validation
    if (!email.trim()) {
      setLocalError('Email is required');
      return;
    }
    if (!password) {
      setLocalError('Password is required');
      return;
    }

    try {
      await login(email, password);
      // Redirect to dashboard on successful login
      router.push('/');
    } catch (err) {
      // Error is already set by the store, but we can also use local state
      const errorMessage = err instanceof Error ? err.message : 'Login failed. Please try again.';
      setLocalError(errorMessage);
    }
  };

  const displayError = localError || error;

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo / Branding */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Samar-Minime</h1>
          <p className="text-neutral-400">Multi-Agent AI Operating System</p>
        </div>

        {/* Login Card */}
        <div className="bg-neutral-800 rounded-lg shadow-xl overflow-hidden border border-neutral-700">
          <div className="px-6 py-8">
            <h2 className="text-xl font-semibold text-white mb-6 text-center">Sign In</h2>

            {/* Error Alert */}
            {displayError && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-md text-red-400 text-sm">
                {displayError}
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-neutral-300 mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setLocalError('');
                  }}
                  disabled={isLoading}
                  className="w-full px-4 py-2 bg-neutral-700 border border-neutral-600 rounded-md text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="you@example.com"
                />
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-neutral-300 mb-2">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setLocalError('');
                  }}
                  disabled={isLoading}
                  className="w-full px-4 py-2 bg-neutral-700 border border-neutral-600 rounded-md text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="••••••••"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-6 px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-600" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-neutral-800 text-neutral-500">New to Samar?</span>
              </div>
            </div>

            {/* Register Link */}
            <Link
              href="/register"
              className="block w-full px-4 py-2 border border-neutral-600 text-neutral-300 font-medium rounded-md hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center transition-colors"
            >
              Create Account
            </Link>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-neutral-900 border-t border-neutral-700">
            <p className="text-xs text-neutral-500 text-center">
              By signing in, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </div>

        {/* Help Text */}
        <div className="mt-6 text-center">
          <p className="text-neutral-400 text-sm">
            Demo credentials available in documentation
          </p>
        </div>
      </div>
    </div>
  );
}