import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { ROUTES } from '@/constants/navigation';

export interface UserProfile {
  id: string;
  user_id: string;
  username: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: 'student' | 'admin' | string;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  initialized: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

async function fetchProfile(userId: string): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error && error.code !== 'PGRST116') throw error;
    return data as unknown as UserProfile | null;
  } catch {
    return null;
  }
}

async function ensureProfileForUser(user: User | null | undefined): Promise<UserProfile | null> {
  if (!user) return null;

  const existingProfile = await fetchProfile(user.id);
  if (existingProfile) return existingProfile;

  const fullName = (typeof user.user_metadata?.full_name === 'string' && user.user_metadata.full_name)
    ? user.user_metadata.full_name
    : (typeof user.user_metadata?.name === 'string' && user.user_metadata.name)
      ? user.user_metadata.name
      : '';

  const role = typeof user.user_metadata?.role === 'string' && user.user_metadata.role
    ? user.user_metadata.role
    : 'student';

  const email = user.email ?? '';

  try {
    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        user_id: user.id,
        email,
        full_name: fullName,
        username: email ? email.split('@')[0] : null,
        role,
        status: 'active',
      }, { onConflict: 'user_id' })
      .select()
      .maybeSingle();

    if (error && error.code !== '23505') throw error;
    return (data ?? null) as unknown as UserProfile | null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  const refreshProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      return;
    }
    const p = await ensureProfileForUser(user);
    setProfile(p);
  }, [user]);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        ensureProfileForUser(u).then((p) => {
          if (mounted) setProfile(p);
        });
      }
      setLoading(false);
      setInitialized(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        ensureProfileForUser(u).then((p) => {
          if (mounted) setProfile(p);
        });
      } else {
        setProfile(null);
      }
      setLoading(false);
      setInitialized(true);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error(error.message);
      throw error;
    }

    const signedInUser = data.user;
    if (signedInUser) {
      const profileData = await ensureProfileForUser(signedInUser);
      setUser(signedInUser);
      setProfile(profileData);
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) {
      toast.error(error.message);
      throw error;
    }
    if (data.user) {
      const profileData = await ensureProfileForUser(data.user);
      if (profileData) {
        setUser(data.user);
        setProfile(profileData);
      }
    }
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(error.message);
      throw error;
    }
    setUser(null);
    setProfile(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, initialized, signIn, signUp, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}