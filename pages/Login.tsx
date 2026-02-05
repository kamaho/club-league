import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../services/auth';
import { getApiUrl } from '../services/api';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const useApi = !!getApiUrl();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const user = await authService.login(email, password);
      if (user) {
        // Use full navigation so app remounts with user in storage (avoids white screen after login)
        const base = window.location.pathname.replace(/\/$/, '') || '/';
        window.location.assign(`${base}#/`);
        return;
      } else {
        setError('Invalid email or password. Demo: admin@club.com / demo123');
      }
    } catch {
      setError('Login failed. Try admin@club.com / demo123');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSSO = (provider: 'google' | 'apple') => {
    if (useApi) {
      setError('Sign in with Google and Apple is coming soon. Use email and password for now.');
      return;
    }
    setIsLoading(true);
    authService.loginWithProvider(provider).then(() => {
      const base = window.location.pathname.replace(/\/$/, '') || '/';
      window.location.assign(`${base}#/`);
    }).finally(() => {
      setIsLoading(false);
    });
  };

  const quickFill = (val: string, pwd: string = 'demo123') => {
    setEmail(val);
    setPassword(pwd);
    setError('');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        <div className="text-center mb-8">
          <div className="bg-lime-400 w-12 h-12 rounded-lg flex items-center justify-center text-slate-900 font-black text-xl mx-auto mb-4 shadow-lg shadow-lime-200">CL</div>
          <h1 className="text-2xl font-bold text-slate-900">Welcome Back</h1>
          <p className="text-slate-500 text-sm mt-1">Sign in to manage your matches</p>
        </div>

        {/* SSO Buttons */}
        <div className="space-y-3 mb-6">
            <button 
                type="button"
                onClick={() => handleSSO('google')}
                className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 text-slate-700 font-semibold py-2.5 rounded-lg hover:bg-slate-50 transition-colors"
            >
                <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="Google" />
                Continue with Google
            </button>
            <button 
                type="button"
                onClick={() => handleSSO('apple')}
                className="w-full flex items-center justify-center gap-3 bg-slate-900 text-white font-semibold py-2.5 rounded-lg hover:bg-slate-800 transition-colors"
            >
                <img src="https://www.svgrepo.com/show/511330/apple-173.svg" className="w-5 h-5 invert" alt="Apple" />
                Continue with Apple
            </button>
        </div>

        <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-slate-500">Or continue with email</span>
            </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email Address</label>
            <input
              type="email"
              required
              className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-lime-400 focus:border-transparent outline-none transition-all"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-bold text-slate-500 uppercase">Password</label>
                <Link to="/forgot-password" className="text-xs text-lime-600 font-bold hover:underline">Forgot?</Link>
            </div>
            <input
              type="password"
              required
              className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-lime-400 focus:border-transparent outline-none transition-all"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          
          {error && <div className="p-3 bg-red-50 text-red-500 text-xs rounded-lg font-medium border border-red-100">{error}</div>}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-lg transition-colors shadow-lg shadow-slate-900/20 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
            Sign In
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-500">
            Don't have an account? <Link to="/signup" className="text-lime-600 font-bold hover:underline">Sign Up</Link>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100">
          <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase mb-3 text-center">DEMO ACCOUNTS</p>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => quickFill('bob@club.com')} type="button" className="text-xs bg-slate-100 hover:bg-slate-200 py-2 rounded text-slate-600 font-medium">
              Player (Bob)
            </button>
            <button onClick={() => quickFill('admin@club.com')} type="button" className="text-xs bg-slate-100 hover:bg-slate-200 py-2 rounded text-slate-600 font-medium">
              Admin (Alice)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};