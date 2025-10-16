import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getCurrentUser, type AuthUser } from '../lib/auth';
import type { Session } from '@supabase/supabase-js';
import { AuthContext } from './AuthContextType';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async (authUserId?: string, authUserEmail?: string) => {
    try {
      // If we have user info from the session, use it directly
      if (authUserId && authUserEmail) {

        // Add a timeout to prevent hanging indefinitely
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Database query timeout after 5 seconds')), 5000);
        });

        const queryPromise = supabase
          .from('user_profiles')
          .select('username, api_token')
          .eq('id', authUserId)
          .single();

        try {
          const { data: profileData, error: profileError } = await Promise.race([
            queryPromise,
            timeoutPromise
          ]) as any;

          if (profileError) {
            // If profile doesn't exist or query fails, use email as username
            setUser({
              id: authUserId,
              email: authUserEmail,
              username: authUserEmail.split('@')[0],
              apiToken: null
            });
            return;
          }

          if (!profileData) {
            // Still allow login with temp data
            setUser({
              id: authUserId,
              email: authUserEmail,
              username: authUserEmail.split('@')[0],
              apiToken: null
            });
            return;
          }

          setUser({
            id: authUserId,
            email: authUserEmail,
            username: profileData.username,
            apiToken: profileData.api_token
          });
        } catch (timeoutError) {
          // Allow login anyway with temporary user data
          setUser({
            id: authUserId,
            email: authUserEmail,
            username: authUserEmail.split('@')[0],
            apiToken: null
          });
          return;
        }
      } else {
        // Fallback to fetching everything
        const { user: currentUser } = await getCurrentUser();
        setUser(currentUser);
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
      setUser(null);
    }
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        await refreshUser(session.user.id, session.user.email!);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session?.user) {
        await refreshUser(session.user.id, session.user.email!);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  const value = {
    user,
    session,
    loading,
    signOut,
    refreshUser
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

