import { getSupabaseAdmin } from './supabaseAdmin.js'

export type AdminAuditAction =
  | 'support_access'
  | 'user_delete'
  | 'team_add'
  | 'biztype_save'
  | 'payment_approve'
  | 'payment_reject'
  | 'promo_save'
  | 'template_save'

/**
 * Records a sensitive backoffice action in admin_audit_log (service-role only,
 * no FK — an audit row must never block the deletion it describes).
 * Best-effort by default (returns false on failure, never throws): the audit
 * trail must not break the action it observes. Pass `required: true` for flows
 * that need the trace first — then it throws instead.
 */
export async function logAdminAudit(
  entry: {
    actorUserId: string
    actorEmail: string
    action: AdminAuditAction
    targetUserId?: string
    targetShopId?: string
    details?: Record<string, unknown>
  },
  required = false,
): Promise<boolean> {
  try {
    const admin = getSupabaseAdmin()
    const { error } = await admin.from('admin_audit_log').insert({
      actor_user_id: entry.actorUserId,
      actor_email: entry.actorEmail,
      action: entry.action,
      target_user_id: entry.targetUserId ?? null,
      target_shop_id: entry.targetShopId ?? null,
      details: entry.details ?? {},
    })
    if (error) throw error
    return true
  } catch (err) {
    if (required) throw err
    console.error('logAdminAudit failed (non-blocking)', err)
    return false
  }
}
