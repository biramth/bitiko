const STORAGE_KEY = 'bitiko-onboarding-draft'

/** Ce que le marchand a déjà saisi : un rechargement ou un retour ne le fait pas repartir de zéro. */
export interface OnboardingDraft {
  name: string
  businessType: string
  whatsappNumber: string
  countryCode: string | null
}

const text = (value: unknown) => (typeof value === 'string' ? value : '')

/** Lit le brouillon du compte courant ; un brouillon d'un autre compte ou illisible est ignoré. */
export function loadDraft(userId: string | undefined): OnboardingDraft | null {
  if (!userId) return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Record<string, unknown> | null
    if (!parsed || parsed.userId !== userId) return null
    return {
      name: text(parsed.name).slice(0, 80),
      businessType: text(parsed.businessType),
      whatsappNumber: text(parsed.whatsappNumber).slice(0, 40),
      countryCode: typeof parsed.countryCode === 'string' ? parsed.countryCode : null,
    }
  } catch {
    return null
  }
}

export function saveDraft(userId: string | undefined, draft: OnboardingDraft): void {
  if (!userId) return
  const empty = !draft.name.trim() && !draft.businessType && !draft.whatsappNumber.trim()
  try {
    if (empty) window.localStorage.removeItem(STORAGE_KEY)
    else window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ userId, ...draft }))
  } catch {
    // localStorage indisponible (navigation privée) : le formulaire fonctionne, sans brouillon.
  }
}

export function clearDraft(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Rien à nettoyer.
  }
}
