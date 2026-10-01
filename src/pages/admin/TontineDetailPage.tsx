import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Download, HandCoins, Lock, LockOpen, Pencil, Plus, Search, Trash2, UserPlus, Users } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { PageLoader } from '@/components/ui/PageLoader'
import { Spinner } from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/Toast'
import { useUpgrade } from '@/features/billing/upgradeContext'
import { isPlanLimitError } from '@/features/billing/planLimit'
import { useMyShop } from '@/features/shop-settings/useMyShop'
import { whatsappUrl } from '@/features/booking/bookingHelpers'
import { downloadTextFile, exportFilename, frenchDate } from '@/features/finance/exportCsv'
import { paymentMethodLabel } from '@/features/finance/categories'
import { ContributionDialog } from '@/features/tontine/ContributionDialog'
import { MemberFormDialog } from '@/features/tontine/MemberFormDialog'
import { MemberSheet } from '@/features/tontine/MemberSheet'
import { SettleDialog, type SettleInput } from '@/features/tontine/SettleDialog'
import { TontineFormDialog } from '@/features/tontine/TontineFormDialog'
import { ProgressBar, StateBadge } from '@/features/tontine/TontineParts'
import { receiptMessage, reminderMessage } from '@/features/tontine/messages'
import { STATE_LABELS, daysUntil, frequencyEvery, memberProgress, type MemberProgress, type MemberState } from '@/features/tontine/schedule'
import { buildContributionsCsv, buildMembersCsv } from '@/features/tontine/tontineCsv'
import type { TontineMember } from '@/features/tontine/types'
import {
  createContribution,
  createMember,
  deleteMember,
  deleteTontine,
  getMemberBalances,
  getTontine,
  listAllContributions,
  listMembers,
  listRecentContributions,
  reopenMember,
  setTontineStatus,
  settleMember,
  tontineErrorCode,
  updateMember,
  updateTontine,
  type ContributionInput,
  type MemberInput,
  type TontineInput,
} from '@/services/tontine.service'
import { usePageSeo } from '@/hooks/usePageSeo'
import { formatCurrency, localDateIso } from '@/utils/format'

type Tab = 'members' | 'history'
type Filter = 'all' | MemberState

const FILTERS: Filter[] = ['all', 'late', 'on_track', 'complete', 'settled']

const ERROR_MESSAGES: Record<string, string> = {
  tontine_closed: 'Cette tontine est clôturée.',
  member_settled: 'Ce membre a déjà reçu sa remise.',
  tontine_has_unsettled_savings: 'Faites d’abord la remise des membres qui ont encore de l’épargne.',
  has_contributions: 'Des versements sont enregistrés : impossible de supprimer.',
}

interface Row {
  member: TontineMember
  progress: MemberProgress
}

/** Une tontine : ses membres, leurs versements, l'encaissement rapide et la remise. */
export function TontineDetailPage() {
  usePageSeo({ title: 'Tontine — Bitiko', noindex: true })
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToast()
  const { openUpgrade } = useUpgrade()
  const { data: shop, isLoading: shopLoading } = useMyShop()

  const [tab, setTab] = useState<Tab>('members')
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const [editingTontine, setEditingTontine] = useState(false)
  const [memberForm, setMemberForm] = useState<{ member: TontineMember | null } | null>(null)
  // « Ouvrir la fiche » depuis la page Notes : ?membre=<id> ouvre directement la fiche du membre.
  const [searchParams, setSearchParams] = useSearchParams()
  const [sheetId, setSheetId] = useState<string | null>(() => searchParams.get('membre'))
  const [collectId, setCollectId] = useState<string | null>(null)
  const [settleId, setSettleId] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<'close' | 'reopen' | 'delete' | 'delete-member' | 'reopen-member' | null>(null)
  const [exporting, setExporting] = useState(false)

  const tontineQuery = useQuery({ queryKey: ['tontine', 'detail', id], queryFn: () => getTontine(id), enabled: !!id })
  const membersQuery = useQuery({ queryKey: ['tontine', 'members', id], queryFn: () => listMembers(id), enabled: !!id })
  const balancesQuery = useQuery({ queryKey: ['tontine', 'balances', id], queryFn: () => getMemberBalances(id), enabled: !!id })
  const recentQuery = useQuery({
    queryKey: ['tontine', 'recent', id],
    queryFn: () => listRecentContributions(id),
    enabled: !!id && tab === 'history',
  })

  const tontine = tontineQuery.data ?? null
  const today = localDateIso()

  const rows: Row[] = useMemo(() => {
    if (!tontine) return []
    const balances = new Map((balancesQuery.data ?? []).map((b) => [b.member_id, b.saved]))
    return (membersQuery.data ?? []).map((member) => ({
      member,
      progress: memberProgress(tontine, member, member.status === 'settled' ? (member.settled_amount ?? 0) : (balances.get(member.id) ?? 0), today),
    }))
  }, [tontine, membersQuery.data, balancesQuery.data, today])

  const rowById = useMemo(() => new Map(rows.map((r) => [r.member.id, r])), [rows])
  const sheetRow = sheetId ? rowById.get(sheetId) ?? null : null
  const collectRow = collectId ? rowById.get(collectId) ?? null : null
  const settleRow = settleId ? rowById.get(settleId) ?? null : null

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['tontine'] })
  const fail = (e: unknown, fallback: string) => toast.error(ERROR_MESSAGES[tontineErrorCode(e) ?? ''] ?? fallback)

  const saveTontine = useMutation({
    mutationFn: (input: TontineInput) => updateTontine(id, input),
    onSuccess: () => {
      refresh()
      setEditingTontine(false)
      toast.success('Tontine mise à jour.')
    },
    onError: (e) => fail(e, 'Enregistrement impossible. Vérifiez les champs.'),
  })

  const saveMember = useMutation({
    mutationFn: ({ member, input }: { member: TontineMember | null; input: MemberInput }) =>
      member ? updateMember(member.id, input) : createMember(id, shop?.id ?? '', input),
    onSuccess: (_, { member }) => {
      refresh()
      setMemberForm(null)
      toast.success(member ? 'Membre mis à jour.' : 'Membre inscrit.')
    },
    onError: (e) => (isPlanLimitError(e) ? openUpgrade('tontine-members') : fail(e, 'Enregistrement impossible. Vérifiez les champs.')),
  })

  const settle = useMutation({
    mutationFn: ({ memberId, input }: { memberId: string; input: SettleInput }) => settleMember(memberId, input),
    onSuccess: (amount) => {
      refresh()
      queryClient.invalidateQueries({ queryKey: ['finance'] })
      setSettleId(null)
      toast.success(`Remise enregistrée (${formatCurrency(amount, shop?.currency)}).`)
    },
    onError: (e) => {
      if (isPlanLimitError(e)) {
        toast.error('Plafond de saisies Finances atteint ce mois-ci : désactivez « Compter cette vente » pour enregistrer la remise.')
        openUpgrade('finance-entries')
      } else fail(e, 'Remise impossible.')
    },
  })

  const action = useMutation({
    mutationFn: async (kind: NonNullable<typeof confirm>) => {
      if (kind === 'close') return setTontineStatus(id, 'closed')
      if (kind === 'reopen') return setTontineStatus(id, 'active')
      if (kind === 'delete') return deleteTontine(id)
      if (kind === 'delete-member' && sheetId) return deleteMember(sheetId)
      if (kind === 'reopen-member' && sheetId) return reopenMember(sheetId)
    },
    onSuccess: (_, kind) => {
      setConfirm(null)
      if (kind === 'delete') {
        queryClient.invalidateQueries({ queryKey: ['tontine'] })
        toast.success('Tontine supprimée.')
        navigate('/admin/tontines')
        return
      }
      refresh()
      if (kind === 'delete-member') setSheetId(null)
      if (kind === 'reopen-member') queryClient.invalidateQueries({ queryKey: ['finance'] })
      toast.success(
        { close: 'Tontine clôturée.', reopen: 'Tontine rouverte.', 'delete-member': 'Membre retiré.', 'reopen-member': 'Remise annulée.' }[kind] ?? 'Fait.',
      )
    },
    onError: (e, kind) => {
      setConfirm(null)
      if (kind === 'reopen' && isPlanLimitError(e)) openUpgrade('tontines')
      else fail(e, 'Action impossible.')
    },
  })

  if (shopLoading || tontineQuery.isLoading) return <PageLoader />
  if (!shop) return <p className="text-sm text-gray-500">Aucune boutique configurée.</p>
  if (tontineQuery.isError) return <ErrorMessage />
  if (!tontine) {
    return (
      <Card padded={false}>
        <EmptyState
          icon={Users}
          title="Tontine introuvable"
          action={<Link to="/admin/tontines" className="text-sm font-medium text-brand-700 hover:underline">Retour aux tontines</Link>}
        />
      </Card>
    )
  }

  const currency = shop.currency
  const money = (n: number) => formatCurrency(n, currency)
  const open = tontine.status === 'active'
  const activeRows = rows.filter((r) => r.member.status === 'active')
  const held = activeRows.reduce((sum, r) => sum + r.progress.saved, 0)
  const collected = rows.reduce((sum, r) => sum + r.progress.saved, 0)
  const late = activeRows.filter((r) => r.progress.state === 'late')
  const behind = late.reduce((sum, r) => sum + r.progress.behind, 0)
  const days = daysUntil(tontine.end_date, today)

  const needle = search.trim().toLowerCase()
  const visible = rows.filter(
    (r) =>
      (filter === 'all' || r.progress.state === filter) &&
      (!needle || r.member.name.toLowerCase().includes(needle) || (r.member.phone ?? '').includes(needle.replace(/\s/g, ''))),
  )
  const counts = rows.reduce<Record<string, number>>((acc, r) => ({ ...acc, [r.progress.state]: (acc[r.progress.state] ?? 0) + 1 }), { all: rows.length })

  const messageContext = (row: Row) => ({
    shopName: shop.name,
    tontineName: tontine.name,
    memberName: row.member.name,
    currency,
    target: row.progress.target,
  })

  const exportMembers = () =>
    downloadTextFile(exportFilename('tontine', shop.name, tontine.name.slice(0, 40)), buildMembersCsv(tontine, rows))
  const exportContributions = async () => {
    setExporting(true)
    try {
      const all = await listAllContributions(id)
      const names = new Map(rows.map((r) => [r.member.id, r.member.name]))
      downloadTextFile(exportFilename('versements', shop.name, tontine.name.slice(0, 40)), buildContributionsCsv(all, names))
    } catch {
      toast.error('Export impossible.')
    } finally {
      setExporting(false)
    }
  }

  const confirmCopy: Record<NonNullable<typeof confirm>, { title: string; description: string; label: string; tone: 'danger' | 'default' }> = {
    close: {
      title: 'Clôturer cette tontine ?',
      description: 'Plus aucun versement ni inscription ne sera possible. Vous pourrez la rouvrir si besoin.',
      label: 'Clôturer',
      tone: 'default',
    },
    reopen: { title: 'Rouvrir cette tontine ?', description: 'Les versements et inscriptions seront de nouveau possibles.', label: 'Rouvrir', tone: 'default' },
    delete: {
      title: 'Supprimer cette tontine ?',
      description: 'La tontine et ses membres seront supprimés. Possible uniquement tant qu’aucun versement n’est enregistré.',
      label: 'Supprimer',
      tone: 'danger',
    },
    'delete-member': {
      title: 'Retirer ce membre ?',
      description: 'Il n’a fait aucun versement : sa fiche sera supprimée.',
      label: 'Retirer',
      tone: 'danger',
    },
    'reopen-member': {
      title: 'Annuler la remise ?',
      description: 'Le membre redevient actif avec son épargne. La recette éventuellement ajoutée aux Finances est retirée.',
      label: 'Annuler la remise',
      tone: 'default',
    },
  }

  return (
    <div className="space-y-5">
      <div>
        <Link to="/admin/tontines" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900">
          <ArrowLeft size={15} aria-hidden /> Tontines
        </Link>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-heading text-xl font-bold text-gray-900">{tontine.name}</h1>
              {!open && <Badge tone="neutral">Clôturée</Badge>}
            </div>
            <p className="mt-1 text-sm text-gray-500">
              {money(tontine.installment_amount)} {frequencyEvery(tontine.frequency)} · du {frenchDate(tontine.start_date)} au {frenchDate(tontine.end_date)}
              {open && days >= 0 && ` · remise dans ${days} jour${days > 1 ? 's' : ''}`}
              {tontine.goal_label && ` · ${tontine.goal_label}`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {open && (
              <Button icon={<UserPlus size={15} aria-hidden />} onClick={() => setMemberForm({ member: null })}>
                Inscrire un membre
              </Button>
            )}
            <Button variant="secondary" icon={<Pencil size={15} aria-hidden />} onClick={() => setEditingTontine(true)}>Modifier</Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <p className="text-xs text-gray-500">En caisse</p>
          <p className="mt-1 break-words text-base font-semibold text-gray-900 sm:text-lg">{money(held)}</p>
        </Card>
        <Card>
          <p className="text-xs text-gray-500">Total versé</p>
          <p className="mt-1 break-words text-base font-semibold text-gray-900 sm:text-lg">{money(collected)}</p>
        </Card>
        <Card>
          <p className="text-xs text-gray-500">Membres</p>
          <p className="mt-1 text-base font-semibold text-gray-900 sm:text-lg">
            {rows.length}
            {rows.length - activeRows.length > 0 && <span className="text-sm font-normal text-gray-500"> · {rows.length - activeRows.length} remis</span>}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-gray-500">En retard</p>
          <p className={`mt-1 break-words text-base font-semibold sm:text-lg ${late.length > 0 ? 'text-amber-700' : 'text-gray-900'}`}>
            {late.length}
            {behind > 0 && <span className="text-sm font-normal"> · {money(behind)}</span>}
          </p>
        </Card>
      </div>

      <div role="tablist" aria-label="Sections de la tontine" className="flex gap-1.5">
        {([['members', 'Membres'], ['history', 'Derniers versements']] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${tab === key ? 'bg-ink-900 text-white' : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'members' ? (
        membersQuery.isLoading || balancesQuery.isLoading ? (
          <Spinner />
        ) : membersQuery.isError || balancesQuery.isError ? (
          <ErrorMessage />
        ) : rows.length === 0 ? (
          <Card padded={false}>
            <EmptyState
              icon={Users}
              title="Aucun membre pour l’instant"
              description="Inscrivez les clients qui veulent épargner : nom, téléphone et ce qu’ils veulent recevoir. L’objectif est proposé automatiquement."
              action={open ? <Button icon={<Plus size={15} aria-hidden />} onClick={() => setMemberForm({ member: null })}>Inscrire un membre</Button> : undefined}
            />
          </Card>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filtrer les membres">
                {FILTERS.filter((f) => f === 'all' || counts[f]).map((f) => (
                  <button
                    key={f}
                    type="button"
                    role="tab"
                    aria-selected={filter === f}
                    onClick={() => setFilter(f)}
                    className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ${filter === f ? 'bg-brand-50 text-brand-800 ring-brand-300' : 'bg-white text-gray-600 ring-gray-200 hover:bg-gray-50'}`}
                  >
                    {f === 'all' ? 'Tous' : STATE_LABELS[f]} · {counts[f] ?? 0}
                  </button>
                ))}
              </div>
              <label className="relative block sm:w-60">
                <span className="sr-only">Rechercher un membre</span>
                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Nom ou téléphone"
                  className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
              </label>
            </div>

            <ul className="space-y-2">
              {visible.map((row) => (
                <li key={row.member.id}>
                  <Card className="flex items-center gap-3 !p-3 sm:!p-4">
                    <button type="button" onClick={() => setSheetId(row.member.id)} className="min-w-0 flex-1 text-left">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-medium text-gray-900">{row.member.name}</p>
                        <StateBadge state={row.progress.state} />
                      </div>
                      {row.member.target_label && <p className="mt-0.5 truncate text-xs text-gray-500">{row.member.target_label}</p>}
                      <div className="mt-2 max-w-md">
                        <ProgressBar percent={row.progress.percent} state={row.progress.state} />
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        <span className="font-medium text-gray-800">{money(row.progress.saved)}</span> / {money(row.progress.target)}
                        {row.progress.state === 'late' && <span className="text-amber-700"> · {money(row.progress.behind)} de retard</span>}
                      </p>
                    </button>
                    {open && row.member.status === 'active' && (
                      <Button size="sm" icon={<HandCoins size={15} aria-hidden />} onClick={() => setCollectId(row.member.id)}>
                        <span className="hidden sm:inline">Encaisser</span>
                        <span className="sr-only sm:hidden">Encaisser {row.member.name}</span>
                      </Button>
                    )}
                  </Card>
                </li>
              ))}
              {visible.length === 0 && <li className="py-6 text-center text-sm text-gray-500">Aucun membre ne correspond.</li>}
            </ul>
          </div>
        )
      ) : recentQuery.isLoading ? (
        <Spinner />
      ) : recentQuery.isError ? (
        <ErrorMessage />
      ) : (recentQuery.data ?? []).length === 0 ? (
        <p className="rounded-xl bg-white px-4 py-8 text-center text-sm text-gray-500 ring-1 ring-gray-200">Aucun versement enregistré.</p>
      ) : (
        <ul className="divide-y divide-gray-100 rounded-xl bg-white ring-1 ring-gray-200">
          {(recentQuery.data ?? []).map((c) => (
            <li key={c.id}>
              <button type="button" onClick={() => setSheetId(c.member_id)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">{rowById.get(c.member_id)?.member.name ?? 'Membre'}</p>
                  <p className="text-xs text-gray-500">
                    {frenchDate(c.paid_on)}
                    {paymentMethodLabel(c.payment_method) && ` · ${paymentMethodLabel(c.payment_method)}`}
                  </p>
                </div>
                {c.cancelled_at ? (
                  <Badge tone="neutral">Annulé</Badge>
                ) : (
                  <p className="shrink-0 text-sm font-semibold text-emerald-700">+ {money(c.amount)}</p>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-2 border-t border-gray-200 pt-4">
        {rows.length > 0 && (
          <>
            <Button variant="secondary" size="sm" icon={<Download size={15} aria-hidden />} onClick={exportMembers}>Carnet (CSV)</Button>
            <Button variant="secondary" size="sm" icon={<Download size={15} aria-hidden />} loading={exporting} onClick={exportContributions}>
              Versements (CSV)
            </Button>
          </>
        )}
        {open ? (
          <Button variant="ghost" size="sm" icon={<Lock size={15} aria-hidden />} onClick={() => setConfirm('close')}>Clôturer</Button>
        ) : (
          <Button variant="ghost" size="sm" icon={<LockOpen size={15} aria-hidden />} onClick={() => setConfirm('reopen')}>Rouvrir</Button>
        )}
        {collected === 0 && (
          <Button variant="ghost" size="sm" icon={<Trash2 size={15} aria-hidden />} onClick={() => setConfirm('delete')}>Supprimer</Button>
        )}
      </div>

      <TontineFormDialog
        open={editingTontine}
        tontine={tontine}
        currency={currency}
        pending={saveTontine.isPending}
        onClose={() => setEditingTontine(false)}
        onSubmit={(input) => saveTontine.mutate(input)}
      />

      <MemberFormDialog
        open={!!memberForm}
        tontine={tontine}
        member={memberForm?.member ?? null}
        currency={currency}
        countryCode={shop.country_code}
        pending={saveMember.isPending}
        onClose={() => setMemberForm(null)}
        onSubmit={(input) => saveMember.mutate({ member: memberForm?.member ?? null, input })}
      />

      <MemberSheet
        member={sheetRow && !collectId && !settleId && !memberForm && !confirm ? sheetRow.member : null}
        progress={sheetRow?.progress ?? null}
        currency={currency}
        tontineOpen={open}
        reminderText={
          sheetRow && sheetRow.progress.state === 'late'
            ? reminderMessage({ ...messageContext(sheetRow), saved: sheetRow.progress.saved, behind: sheetRow.progress.behind, endDate: tontine.end_date })
            : null
        }
        onClose={() => {
          setSheetId(null)
          if (searchParams.has('membre')) setSearchParams({}, { replace: true })
        }}
        onCollect={() => sheetRow && setCollectId(sheetRow.member.id)}
        onEdit={() => sheetRow && setMemberForm({ member: sheetRow.member })}
        onSettle={() => sheetRow && setSettleId(sheetRow.member.id)}
        onReopen={() => setConfirm('reopen-member')}
        onDelete={() => setConfirm('delete-member')}
      />

      <ContributionDialog
        member={collectRow?.member ?? null}
        progress={collectRow?.progress ?? null}
        currency={currency}
        onClose={() => setCollectId(null)}
        onSubmit={async (input: ContributionInput) => {
          if (!collectRow) return
          try {
            await createContribution(collectRow.member.id, input)
            refresh()
          } catch (e) {
            fail(e, 'Encaissement impossible.')
            throw e
          }
        }}
        receiptUrl={(input, savedAfter) =>
          collectRow?.member.phone
            ? whatsappUrl(
                collectRow.member.phone,
                receiptMessage({ ...messageContext(collectRow), saved: savedAfter, amount: input.amount, paidOn: input.paid_on }),
              )
            : null
        }
      />

      <SettleDialog
        member={settleRow?.member ?? null}
        progress={settleRow?.progress ?? null}
        currency={currency}
        pending={settle.isPending}
        onClose={() => setSettleId(null)}
        onSubmit={(input) => settleRow && settle.mutate({ memberId: settleRow.member.id, input })}
      />

      <ConfirmDialog
        open={!!confirm}
        title={confirm ? confirmCopy[confirm].title : ''}
        description={confirm ? confirmCopy[confirm].description : undefined}
        confirmLabel={confirm ? confirmCopy[confirm].label : undefined}
        tone={confirm ? confirmCopy[confirm].tone : 'default'}
        pending={action.isPending}
        onConfirm={() => confirm && action.mutate(confirm)}
        onClose={() => setConfirm(null)}
      />
    </div>
  )
}
