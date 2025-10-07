import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { DataLayer } from '@/services/dataLayer';

interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  clearExpiredToken: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  signUp: async () => ({ error: null }),
  signIn: async () => ({ error: null }),
  signOut: async () => {},
  clearExpiredToken: async () => {},
  loading: true,
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Function to fetch user profile using DataLayer
  const fetchProfile = async (userId: string) => {
    return await DataLayer.loadUserProfile(userId);
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Handle token expiration errors
        if (event === 'TOKEN_REFRESHED' && !session) {
          await supabase.auth.signOut({ scope: 'local' });
          localStorage.removeItem('supabase.auth.token');
          setSession(null);
          setUser(null);
          setProfile(null);
        } else {
          setSession(session);
          setUser(session?.user ?? null);
        }

        // End loading based on auth state immediately; fetch profile in background
        setLoading(false);

        if (session?.user) {
          fetchProfile(session.user.id).then((userProfile) => setProfile(userProfile));
        } else {
          setProfile(null);
        }
      }
    );

    // THEN check for existing session
    (async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        // Handle JWT expiration errors during session retrieval
        if (error && error.message?.includes('token is expired')) {
          await supabase.auth.signOut({ scope: 'local' });
          localStorage.removeItem('supabase.auth.token');
          setSession(null);
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }

        setSession(session);
        setUser(session?.user ?? null);
        // End loading as soon as session is known; fetch profile in background
        setLoading(false);

        if (session?.user) {
          fetchProfile(session.user.id).then((userProfile) => setProfile(userProfile));
        } else {
          setProfile(null);
        }
      } catch (error) {
        console.error('Error getting session:', error);
        setLoading(false);
      }
    })();

    // Failsafe: ensure loading does not hang more than 5s
    const timeoutId = setTimeout(() => setLoading(false), 5000);

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, displayName?: string) => {
    const redirectUrl = `${window.location.origin}/`;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          display_name: displayName,
        }
      }
    });

    // Create profile if signup was successful
    if (!error && data.user) {
      await DataLayer.createUserProfile(data.user.id, displayName || undefined);
    }

    return { error };
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      // Handle JWT expiration errors during sign in
      if (error && error.message?.includes('token is expired')) {
        await supabase.auth.signOut({ scope: 'local' });
        localStorage.removeItem('supabase.auth.token');

        // Retry sign in after clearing expired token
        const { error: retryError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        return { error: retryError };
      }

      return { error };
    } catch (error) {
      console.error('Sign in error:', error);
      return { error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const clearExpiredToken = async () => {
    await supabase.auth.signOut({ scope: 'local' });
    localStorage.removeItem('supabase.auth.token');
    setSession(null);
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      signUp,
      signIn,
      signOut,
      clearExpiredToken,
      loading
    }}>
      {children}
    </AuthContext.Provider>
  );
};