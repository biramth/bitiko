import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'

interface AuthContextValue {
  session: Session | null
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string) => Promise<{ error: string | null; hasSession: boolean }>
  signInWithGoogle: () => Promise<{ error: string | null }>
  resendConfirmation: (email: string) => Promise<{ error: string | null }>
  resetPasswordForEmail: (email: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  updateFullName: (fullName: string) => Promise<{ error: string | null }>
  updateEmail: (email: string) => Promise<{ error: string | null }>
  updatePassword: (password: string) => Promise<{ error: string | null }>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function authCallbackUrl() {
  return `${window.location.origin}/auth/callback`
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => subscription.subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: authCallbackUrl() },
    })
    if (error) return { error: error.message, hasSession: false }
    if (data.session) setSession(data.session)
    return { error: null, hasSession: !!data.session }
  }

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: authCallbackUrl() },
    })
    return { error: error?.message ?? null }
  }

  const resendConfirmation = async (email: string) => {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: authCallbackUrl() },
    })
    return { error: error?.message ?? null }
  }

  const resetPasswordForEmail = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reinitialiser-mot-de-passe`,
    })
    return { error: error?.message ?? null }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const updateFullName = async (fullName: string) => {
    const { data, error } = await supabase.auth.updateUser({ data: { full_name: fullName } })
    if (!error && data.user) setSession((prev) => (prev ? { ...prev, user: data.user } : prev))
    return { error: error?.message ?? null }
  }

  const updateEmail = async (email: string) => {
    const { error } = await supabase.auth.updateUser(
      { email },
      { emailRedirectTo: authCallbackUrl() },
    )
    return { error: error?.message ?? null }
  }

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password })
    return { error: error?.message ?? null }
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        loading,
        signIn,
        signUp,
        signInWithGoogle,
        resendConfirmation,
        resetPasswordForEmail,
        signOut,
        updateFullName,
        updateEmail,
        updatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
