import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import type { Session, User } from '@supabase/supabase-js'

interface AuthContextValue {
  session: Session | null
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string, options?: { marketingOptIn?: boolean }) => Promise<{ error: string | null; hasSession: boolean; alreadyExists: boolean }>
  signInWithGoogle: () => Promise<{ error: string | null }>
  resendConfirmation: (email: string) => Promise<{ error: string | null }>
  refreshEmailVerification: () => Promise<boolean>
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
  const unsubscribeRef = useRef<(() => void) | undefined>(undefined)

  // The auth listener is app-lifetime: it must survive SPA navigations.
  // Unsubscribing on pathname change (the natural effect cleanup) silently
  // kills session updates — signOut() then clears the session without the UI
  // ever noticing. So unsubscribe only if the provider itself unmounts.
  useEffect(() => () => {
    unsubscribeRef.current?.()
  }, [])

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
    setLoading(true)
    let cancelled = false
    import('@/lib/supabaseClient').then(({ supabase }) => {
      if (cancelled) return
      initialized.current = true
      supabase.auth.getSession().then(({ data }) => {
        setSession(data.session)
        setLoading(false)
      })
      const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
        setSession(newSession)
      })
      unsubscribeRef.current = () => listener.subscription.unsubscribe()
    })
    return () => {
      cancelled = true
    }
  }, [pathname])

  const signIn = async (email: string, password: string) => {
    const { supabase } = await import('@/lib/supabaseClient')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }

  const signUp = async (email: string, password: string, options: { marketingOptIn?: boolean } = {}) => {
    const { supabase } = await import('@/lib/supabaseClient')
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: authCallbackUrl(),
        // Reporté sur profiles.marketing_opt_in à l'onboarding (le profil n'existe pas encore).
        ...(options.marketingOptIn ? { data: { marketing_opt_in: true } } : {}),
      },
    })
    if (error) return { error: error.message, hasSession: false, alreadyExists: false }
    if (data.session) {
      setSession(data.session)
      return { error: null, hasSession: true, alreadyExists: false }
    }
    // Avec la confirmation d'email active, signUp ne rend jamais de session.
    // L'Auth autorise la connexion d'un email non vérifié
    // (mailer_allow_unverified_email_sign_ins) : on connecte donc tout de
    // suite, le dashboard affiche un bandeau tant que l'email n'est pas
    // confirmé. Si la connexion échoue (réglage absent), on retombe sur
    // l'écran « vérifie ton email ».
    const { data: signedIn } = await supabase.auth.signInWithPassword({ email, password })
    if (signedIn.session) {
      setSession(signedIn.session)
      return { error: null, hasSession: true, alreadyExists: false }
    }
    // Un email déjà inscrit revient comme un utilisateur masqué : pas de
    // session, aucun email envoyé, identities vide.
    const alreadyExists = !!data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0
    return { error: null, hasSession: false, alreadyExists }
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

  // Le lien de confirmation peut être ouvert sur un autre appareil : la
  // session locale garde alors un utilisateur « non vérifié » jusqu'au
  // prochain rafraîchissement du jeton. On relit l'état côté Auth.
  const refreshEmailVerification = async () => {
    const { supabase } = await import('@/lib/supabaseClient')
    const { data } = await supabase.auth.getUser()
    if (!data.user?.email_confirmed_at) return false
    const { data: refreshed } = await supabase.auth.refreshSession()
    if (refreshed.session) setSession(refreshed.session)
    return true
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
    // Appareil partagé : le compte suivant ne doit pas recevoir les alertes de celui-ci.
    await import('@/lib/webPush').then((m) => m.disablePush()).catch(() => {})
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
        refreshEmailVerification,
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
