import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Mail, CheckCircle } from 'lucide-react';
import { getApiUrl } from '../services/api';

async function requestPasswordReset(email: string): Promise<void> {
  const base = getApiUrl();
  if (!base) {
    await new Promise((r) => setTimeout(r, 1500));
    return;
  }
  const url = `${base.replace(/\/$/, '')}/api/auth/forgot-password`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) throw new Error('Request failed');
}

export const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isSent, setIsSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      await requestPasswordReset(email);
      setIsSent(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        <Link to="/login" className="inline-flex items-center text-slate-400 hover:text-slate-600 mb-6 text-sm font-medium">
            <ChevronLeft size={16} /> Back to Login
        </Link>
        
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Reset Password</h1>
          <p className="text-slate-500 text-sm mt-1">Enter your email to receive reset instructions</p>
        </div>

        {isSent ? (
            <div className="bg-green-50 border border-green-100 rounded-xl p-6 text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600 mx-auto mb-3">
                    <CheckCircle size={24} />
                </div>
                <h3 className="font-bold text-green-800 mb-2">Check your email</h3>
                <p className="text-sm text-green-700">
                    If an account exists for <strong>{email}</strong>, we have sent password reset instructions.
                </p>
            </div>
        ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>
            )}
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email Address</label>
                <div className="relative">
                    <Mail className="absolute left-3 top-3 text-slate-400" size={20} />
                    <input
                    type="email"
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-lime-400 focus:border-transparent outline-none transition-all"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    />
                </div>
            </div>
            
            <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-lg transition-colors shadow-lg shadow-slate-900/20 flex items-center justify-center gap-2 mt-2"
            >
                {isLoading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                Send Reset Link
            </button>
            </form>
        )}
      </div>
    </div>
  );
};