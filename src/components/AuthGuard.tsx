'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { LoginPage } from './LoginPage';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      checkAuthorization(session);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      checkAuthorization(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAuthorization = (currentSession: any) => {
    const authorizedEmail = process.env.NEXT_PUBLIC_AUTH_EMAIL;
    if (!currentSession) {
      setAuthorized(false);
      return;
    }

    if (authorizedEmail && currentSession.user?.email?.toLowerCase() !== authorizedEmail.toLowerCase()) {
      // Logged in but not the authorized user - sign them out
      supabase.auth.signOut();
      setAuthorized(false);
      return;
    }

    setAuthorized(true);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#0a0a0a] z-[9999]">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!session || !authorized) {
    return <LoginPage />;
  }

  return <>{children}</>;
}
