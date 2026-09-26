import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ScrollText } from 'lucide-react'
import { listAuditLog, type AuditEntry } from '@/services/platform.service'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { controlClass } from '@/components/ui/styles'
import { AUDIT_ACTION_LABELS, auditSummary } from '@/features/platform/auditLabels'

export function AuditPanel() {
  const [action, setAction] = useState('')
  const [offset, setOffset] = useState(0)
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['platform-audit', action, offset],
    queryFn: () => listAuditLog({ action: action || undefined, offset }),
    retry: false,
  })

  const summaryOf = (entry: AuditEntry) => auditSummary(entry)

  return (
    <div>
      <div className="flex items-center gap-2">
        <select aria-label="Filtrer par action" value={action} onChange={(e) => { setAction(e.target.value); setOffset(0) }} className={`${controlClass()} sm:w-72`}>
          <option value="">Toutes les actions</option>
          {Object.entries(AUDIT_ACTION_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="mt-6"><Spinner /></div>
      ) : isError ? (
        <p className="mt-4 text-sm text-red-600">{error instanceof Error ? error.message : 'Erreur.'}</p>
      ) : !data || data.entries.length === 0 ? (
        <div className="mt-4"><EmptyState icon={ScrollText} title="Aucune entrée" description="Les actions sensibles de l’équipe apparaissent ici." /></div>
      ) : (
        <>
          <ul className="mt-4 divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
            {data.entries.map((entry) => (
              <li key={entry.id} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {AUDIT_ACTION_LABELS[entry.action] ?? entry.action}
                    {entry.shopName && <span className="font-normal text-gray-500"> — {entry.shopName}</span>}
                  </p>
                  <p className="truncate text-xs text-gray-500">
                    {entry.actorEmail}
                    {summaryOf(entry) && <> · {summaryOf(entry)}</>}
                  </p>
                </div>
                <time className="shrink-0 text-xs text-gray-400" dateTime={entry.createdAt}>
                  {new Date(entry.createdAt).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </time>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex justify-center gap-2">
            <Button variant="secondary" size="sm" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - 50))}>Plus récent</Button>
            <Button variant="secondary" size="sm" disabled={!data.hasMore} onClick={() => setOffset(offset + 50)}>Plus ancien</Button>
          </div>
        </>
      )}
    </div>
  )
}
