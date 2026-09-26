import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Download, Lock, Pencil, Plus, Trash2, Wallet } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { Spinner } from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/Toast'
import { PlanLimitBanner } from '@/features/billing/PlanLimitBanner'
import { planLimitMessage } from '@/features/billing/planLimit'
import type { Plan } from '@/config/plans'
import type { Shop } from '@/types'
import {
  countEntriesCreatedThisMonth,
  createFinanceEntry,
  deleteFinanceEntry,
  listFinanceEntries,
  updateFinanceEntry,
  type FinanceEntryInput,
} from '@/services/finance.service'
import { formatCurrency, localDateIso } from '@/utils/format'
import type { FinanceEntry } from './bilan'
import { categoryLabel, paymentMethodLabel } from './categories'
import { EntryDialog } from './EntryDialog'
import { buildEntriesCsv, downloadTextFile, exportFilename, frenchDate } from './exportCsv'
import { isPeriodAllowed, type Period } from './periods'

type Filter = 'all' | 'expense' | 'income'

function monthPeriod(offset: number): Period {
  const now = new Date()
  const first = new Date(now.getFullYear(), now.getMonth() + offset, 1)
  const year = first.getFullYear()
  const month = first.getMonth()
  const label = first.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  return {
    preset: 'this_month',
    from: localDateIso(first),
    to: localDateIso(new Date(year, month + 1, 0)),
    label: label.charAt(0).toUpperCase() + label.slice(1),
    monthSpan: 1,
  }
}

/** Onglet « Journal » : la liste des dépenses et recettes saisies, mois par mois, avec ajout rapide. */
export function JournalView({ shop, plan }: { shop: Shop; plan: Plan }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const currency = shop.currency
  const currencyLabel = currency === 'XOF' ? 'F CFA' : currency

  const [offset, setOffset] = useState(0)
  const [filter, setFilter] = useState<Filter>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<FinanceEntry | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<FinanceEntry | null>(null)

  const period = monthPeriod(offset)
  const previousAllowed = isPeriodAllowed(monthPeriod(offset - 1), plan.financeHistoryMonths)

  const { data: entries = [], isLoading, isError } = useQuery({
    queryKey: ['finance', 'entries', shop.id, period.from, period.to],
    queryFn: () => listFinanceEntries(shop.id, period.from, period.to),
  })
  const { data: createdThisMonth = 0 } = useQuery({
    queryKey: ['finance', 'created-count', shop.id],
    queryFn: () => countEntriesCreatedThisMonth(shop.id),
    enabled: plan.maxMonthlyFinanceEntries !== null,
  })

  const limitReached = plan.maxMonthlyFinanceEntries !== null && createdThisMonth >= plan.maxMonthlyFinanceEntries

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['finance'] })

  const saveMutation = useMutation({
    mutationFn: (input: FinanceEntryInput) => (editing ? updateFinanceEntry(editing.id, input) : createFinanceEntry(shop.id, input)),
    onSuccess: () => {
      refresh()
      setDialogOpen(false)
      toast.success(editing ? 'Saisie modifiée.' : 'Saisie ajoutée au journal.')
      setEditing(null)
    },
    onError: (e) => toast.error(planLimitMessage(e) ?? 'Enregistrement impossible. Vérifiez les champs.'),
  })

  const removeMutation = useMutation({
    mutationFn: deleteFinanceEntry,
    onSuccess: () => {
      refresh()
      setDeleteTarget(null)
      toast.success('Saisie supprimée.')
    },
    onError: () => toast.error('Suppression impossible.'),
  })

  const income = entries.filter((e) => e.kind === 'income').reduce((sum, e) => sum + e.amount, 0)
  const expenses = entries.filter((e) => e.kind === 'expense').reduce((sum, e) => sum + e.amount, 0)
  const visible = filter === 'all' ? entries : entries.filter((e) => e.kind === filter)

  const openCreate = () => {
    setEditing(null)
    saveMutation.reset()
    setDialogOpen(true)
  }

  const exportCsv = () =>
    downloadTextFile(exportFilename('journal', shop.name, period.from.slice(0, 7)), buildEntriesCsv(entries))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center rounded-xl border border-gray-200 bg-white shadow-sm">
          <button
            type="button"
            onClick={() => setOffset(offset - 1)}
            disabled={!previousAllowed}
            aria-label="Mois précédent"
            className="rounded-l-xl p-2.5 text-gray-500 hover:bg-gray-50 hover:text-gray-900 disabled:cursor-not-allowed disabled:text-gray-300 disabled:hover:bg-transparent"
          >
            {previousAllowed ? <ChevronLeft size={18} aria-hidden /> : <Lock size={16} aria-hidden />}
          </button>
          <p className="min-w-40 px-2 text-center text-sm font-semibold text-gray-900" aria-live="polite">{period.label}</p>
          <button
            type="button"
            onClick={() => setOffset(offset + 1)}
            disabled={offset >= 0}
            aria-label="Mois suivant"
            className="rounded-r-xl p-2.5 text-gray-500 hover:bg-gray-50 hover:text-gray-900 disabled:cursor-not-allowed disabled:text-gray-300 disabled:hover:bg-transparent"
          >
            <ChevronRight size={18} aria-hidden />
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {entries.length > 0 && (
            <Button variant="secondary" icon={<Download size={15} aria-hidden />} onClick={exportCsv}>
              Exporter (CSV)
            </Button>
          )}
          <Button icon={<Plus size={15} aria-hidden />} onClick={openCreate} disabled={limitReached}>
            Ajouter une saisie
          </Button>
        </div>
      </div>

      {!previousAllowed && offset === 0 && (
        <p className="text-xs text-gray-400">
          Le plan gratuit affiche le mois en cours. L’historique complet est inclus dès le plan Essentiel.
        </p>
      )}

      <PlanLimitBanner
        used={createdThisMonth}
        max={plan.maxMonthlyFinanceEntries}
        singular="saisie ce mois-ci"
        plural="saisies ce mois-ci"
      />

      <div className="grid grid-cols-3 gap-3">
        <Card><p className="text-xs text-gray-500">Recettes saisies</p><p className="mt-1 truncate text-base font-semibold text-emerald-700 sm:text-lg">{formatCurrency(income, currency)}</p></Card>
        <Card><p className="text-xs text-gray-500">Dépenses</p><p className="mt-1 truncate text-base font-semibold text-rose-600 sm:text-lg">{formatCurrency(expenses, currency)}</p></Card>
        <Card><p className="text-xs text-gray-500">Solde du journal</p><p className={`mt-1 truncate text-base font-semibold sm:text-lg ${income - expenses >= 0 ? 'text-gray-900' : 'text-rose-600'}`}>{income - expenses < 0 ? '− ' : ''}{formatCurrency(Math.abs(income - expenses), currency)}</p></Card>
      </div>

      {entries.length > 0 && (
        <div role="tablist" aria-label="Filtrer" className="flex gap-1.5">
          {([['all', 'Tout'], ['expense', 'Dépenses'], ['income', 'Recettes']] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={filter === key}
              onClick={() => setFilter(key)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium ${filter === key ? 'bg-ink-900 text-white' : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50'}`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <Spinner />
      ) : isError ? (
        <ErrorMessage />
      ) : entries.length === 0 ? (
        <Card padded={false}>
          <EmptyState
            icon={Wallet}
            title="Aucune saisie ce mois-ci"
            description="Notez vos dépenses (stock, loyer, transport…) et les ventes faites hors ligne : Bitiko calcule votre bénéfice avec vos commandes et rendez-vous."
            action={
              <Button icon={<Plus size={15} aria-hidden />} onClick={openCreate} disabled={limitReached}>
                Ajouter ma première saisie
              </Button>
            }
          />
        </Card>
      ) : (
        <ul className="space-y-2">
          {visible.map((entry) => {
            const isIncome = entry.kind === 'income'
            return (
              <li key={entry.id}>
                <Card className="flex items-center gap-3 !p-3 sm:!p-4">
                  <div className="w-12 shrink-0 text-center">
                    <p className="text-lg font-semibold leading-none text-gray-900">{entry.entry_date.slice(8, 10)}</p>
                    <p className="mt-0.5 text-[11px] uppercase text-gray-400">{frenchDate(entry.entry_date).slice(3, 5)}/{entry.entry_date.slice(2, 4)}</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-gray-900">{entry.label}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
                      <Badge tone={isIncome ? 'success' : 'neutral'}>{categoryLabel(entry.category)}</Badge>
                      {paymentMethodLabel(entry.payment_method) && <span>{paymentMethodLabel(entry.payment_method)}</span>}
                    </p>
                  </div>
                  <p className={`shrink-0 text-right font-semibold ${isIncome ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {isIncome ? '+' : '−'} {formatCurrency(entry.amount, currency)}
                  </p>
                  <div className="flex shrink-0 items-center">
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(entry)
                        saveMutation.reset()
                        setDialogOpen(true)
                      }}
                      aria-label={`Modifier ${entry.label}`}
                      className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                    >
                      <Pencil size={15} aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(entry)}
                      aria-label={`Supprimer ${entry.label}`}
                      className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 size={15} aria-hidden />
                    </button>
                  </div>
                </Card>
              </li>
            )
          })}
        </ul>
      )}

      <p className="text-xs text-gray-400">
        Les commandes payées ou livrées et les rendez-vous terminés sont comptés automatiquement dans le bilan : inutile de les ressaisir ici.
      </p>

      <EntryDialog
        open={dialogOpen}
        entry={editing}
        currencyLabel={currencyLabel}
        pending={saveMutation.isPending}
        onClose={() => setDialogOpen(false)}
        onSubmit={(input) => saveMutation.mutate(input)}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Supprimer cette saisie ?"
        description={deleteTarget ? `« ${deleteTarget.label} » (${formatCurrency(deleteTarget.amount, currency)}) sera retirée du journal et du bilan.` : undefined}
        confirmLabel="Supprimer"
        pendingLabel="Suppression…"
        pending={removeMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) removeMutation.mutate(deleteTarget.id)
        }}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  )
}
