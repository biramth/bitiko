/**
 * Platform-team roles and what each one can do.
 *
 * This is the frontend mirror of the server-side gates in
 * api/admin/platform.ts — the server is the source
 * of truth (a member cannot self-promote), this only decides which tools the
 * workspace *shows*. Keep the two in sync when adding a role or capability.
 */

export type PlatformRole = 'owner' | 'admin' | 'dev' | 'marketing'

export type PlatformCapability =
  | 'view_analytics'
  | 'view_shops'
  | 'manage_payments'
  | 'send_campaigns'
  | 'manage_team'
  | 'support_access'
  | 'delete_users'
  | 'manage_business_types'
  | 'manage_countries'

export interface PlatformRoleInfo {
  key: PlatformRole
  label: string
  description: string
}

export const PLATFORM_ROLES: PlatformRoleInfo[] = [
  { key: 'owner', label: 'Propriétaire', description: 'Contrôle total, y compris qui possède la plateforme.' },
  { key: 'admin', label: 'Administrateur', description: 'Contrôle total, sauf la gestion des propriétaires.' },
  { key: 'dev', label: 'Développeur', description: 'Analytiques, boutiques, paiements, campagnes et support. Pas d’équipe.' },
  { key: 'marketing', label: 'Marketing', description: 'Analytiques, boutiques et campagnes uniquement.' },
]

const CAPABILITIES: Record<PlatformRole, PlatformCapability[]> = {
  owner: ['view_analytics', 'view_shops', 'manage_payments', 'send_campaigns', 'manage_team', 'support_access', 'delete_users', 'manage_business_types', 'manage_countries'],
  admin: ['view_analytics', 'view_shops', 'manage_payments', 'send_campaigns', 'manage_team', 'support_access', 'delete_users', 'manage_business_types', 'manage_countries'],
  dev: ['view_analytics', 'view_shops', 'manage_payments', 'send_campaigns', 'support_access'],
  marketing: ['view_analytics', 'view_shops', 'send_campaigns'],
}

export const CAPABILITY_LABELS: Record<PlatformCapability, string> = {
  view_analytics: 'Voir les analytiques',
  view_shops: 'Voir les boutiques',
  manage_payments: 'Gérer les paiements',
  send_campaigns: 'Envoyer des campagnes',
  manage_team: 'Gérer l’équipe',
  support_access: 'Accès support aux boutiques',
  delete_users: 'Supprimer des comptes utilisateurs',
  manage_business_types: 'Gérer les types d’activité et capabilities',
  manage_countries: 'Gérer les pays',
}

export function roleLabel(role: PlatformRole | null | undefined): string {
  return PLATFORM_ROLES.find((r) => r.key === role)?.label ?? '—'
}

export function can(role: PlatformRole | null | undefined, capability: PlatformCapability): boolean {
  if (!role) return false
  return CAPABILITIES[role]?.includes(capability) ?? false
}
