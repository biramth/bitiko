import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import type { Session, User } from '@supabase/supabase-js'

interface AuthContextValue {
  session: Session | null
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string) => Promise<{ error: string | null; hasSession: boolean; alreadyExists: boolean }>
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
  const { pathname } = useLocation()
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const initialized = useRef(false)

  // supabase-js (~200 Ko) is dynamic-imported so it never blocks first paint.
  // The "/" home (marketing landing comme vitrine d'accueil) renders nothing
  // user-specific, so the client isn't even downloaded there — initialization
  // runs once, on the first navigation to any other path. The module registry
  // caches the import, so every later auth call is free.
  useEffect(() => {
    if (pathname === '/') {
      setLoading(false)
      return
    }
    if (initialized.current) return
    initialized.current = true
    setLoading(true)
    let active = true
    let unsubscribe: (() => void) | undefined
    import('@/lib/supabaseClient').then(({ supabase }) => {
      if (!active) return
      supabase.auth.getSession().then(({ data }) => {
        if (!active) return
        setSession(data.session)
        setLoading(false)
      })
      const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
        if (active) setSession(newSession)
      })
      unsubscribe = () => listener.subscription.unsubscribe()
    })
    return () => {
      active = false
      unsubscribe?.()
    }
  }, [pathname])

  const signIn = async (email: string, password: string) => {
    const { supabase } = await import('@/lib/supabaseClient')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }

  const signUp = async (email: string, password: string) => {
    const { supabase } = await import('@/lib/supabaseClient')
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: authCallbackUrl() },
    })
    if (error) return { error: error.message, hasSession: false, alreadyExists: false }
    if (data.session) setSession(data.session)
    // With email confirmation on, an existing email (confirmed or not) comes
    // back as an obfuscated user: no session, no email sent, and an empty
    // identities array. Surface that so the page offers a resend instead of a
    // dead-end "check your inbox" that will never receive anything.
    const alreadyExists =
      !data.session && !!data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0
    return { error: null, hasSession: !!data.session, alreadyExists }
  }

  const signInWithGoogle = async () => {
    const { supabase } = await import('@/lib/supabaseClient')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: authCallbackUrl() },
    })
    return { error: error?.message ?? null }
  }

  const resendConfirmation = async (email: string) => {
    const { supabase } = await import('@/lib/supabaseClient')
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: authCallbackUrl() },
    })
    return { error: error?.message ?? null }
  }

  const resetPasswordForEmail = async (email: string) => {
    const { supabase } = await import('@/lib/supabaseClient')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reinitialiser-mot-de-passe`,
    })
    return { error: error?.message ?? null }
  }

  const signOut = async () => {
    const { supabase } = await import('@/lib/supabaseClient')
    await supabase.auth.signOut()
  }

  const updateFullName = async (fullName: string) => {
    const { supabase } = await import('@/lib/supabaseClient')
    const { data, error } = await supabase.auth.updateUser({ data: { full_name: fullName } })
    if (!error && data.user) setSession((prev) => (prev ? { ...prev, user: data.user } : prev))
    return { error: error?.message ?? null }
  }

  const updateEmail = async (email: string) => {
    const { supabase } = await import('@/lib/supabaseClient')
    const { error } = await supabase.auth.updateUser(
      { email },
      { emailRedirectTo: authCallbackUrl() },
    )
    return { error: error?.message ?? null }
  }

  const updatePassword = async (password: string) => {
    const { supabase } = await import('@/lib/supabaseClient')
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
