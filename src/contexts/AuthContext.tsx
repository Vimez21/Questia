"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import type { AuthError, Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/types";

type AuthResult = Promise<{ error: AuthError | null }>;
type Profile = Tables<"profiles">;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  profile: Profile | null;
  signUp: (email: string, password: string, fullName: string) => AuthResult;
  signIn: (email: string, password: string) => AuthResult;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => AuthResult;
  updatePassword: (password: string) => AuthResult;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}

async function loadProfile(user: User | null) {
  if (!user) {
    return null;
  }

  const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (!error && data) {
    return data;
  }

  const fallbackProfile = {
    id: user.id,
    full_name: (user.user_metadata?.full_name as string | undefined) || "Estudante",
  };

  const { data: inserted } = await supabase.from("profiles").upsert(fallbackProfile).select("*").single();
  return inserted || null;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);

  const refreshProfile = async () => {
    setProfile(await loadProfile(user));
  };

  useEffect(() => {
    let mounted = true;

    const syncSession = async (nextSession: Session | null) => {
      if (!mounted) {
        return;
      }

      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (nextSession?.user) {
        const nextProfile = await loadProfile(nextSession.user);
        if (mounted) {
          setProfile(nextProfile);
        }
      } else {
        setProfile(null);
      }

      if (mounted) {
        setLoading(false);
      }
    };

    supabase.auth.getSession().then(({ data }) => {
      void syncSession(data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void syncSession(nextSession);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });

    return { error };
  };

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    return { error };
  };

  return (
    <AuthContext.Provider
      value={{ user, session, loading, profile, signUp, signIn, signOut, resetPassword, updatePassword, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
};
