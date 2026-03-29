'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const authorizedEmail = process.env.NEXT_PUBLIC_AUTH_EMAIL;
    
    // Strict client-side check for the authorized email
    if (authorizedEmail && email.toLowerCase() !== authorizedEmail.toLowerCase()) {
      setMessage({ type: 'error', text: 'Unauthorized email address. Access denied.' });
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/my-dashboard/`,
        },
      });

      if (error) throw error;
      setMessage({ type: 'success', text: 'Check your email for the magic link!' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'An error occurred during sign in.' });
    } finally {
      setLoading(false);
    }
  };

  if (!isMounted) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#0a0a0a] z-[9999]">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative w-full max-w-md p-8 mx-4 bg-[#111111] border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-tr from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-500/20">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Access Locked</h1>
          <p className="text-gray-400 mt-2 text-center text-sm">
            Enter your authorized email to receive a magic link.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-xs font-medium text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 bg-[#1a1a1a] border border-white/5 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all duration-200"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="group relative w-full flex items-center justify-center px-4 py-3.5 bg-white text-black font-semibold rounded-xl hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 overflow-hidden"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
            ) : (
              <span className="flex items-center">
                Send Magic Link
                <svg xmlns="http://www.w3.org/2000/svg" className="ml-2 w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </span>
            )}
          </button>
        </form>

        {message && (
          <div className={`mt-6 p-4 rounded-xl text-sm font-medium border ${
            message.type === 'success' 
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
              : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
          } animate-in fade-in slide-in-from-top-2 duration-300`}>
            {message.text}
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-white/5 flex justify-center">
          <p className="text-[10px] text-gray-500 uppercase tracking-[0.2em]">
            &copy; {new Date().getFullYear()} Security System Active
          </p>
        </div>
      </div>
    </div>
  );
}
