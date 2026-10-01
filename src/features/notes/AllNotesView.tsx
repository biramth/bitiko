import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Pencil, StickyNote } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { Spinner } from '@/components/ui/Spinner'
import { listFeedNotes, type ShopNote } from '@/services/notes.service'
import { timeAgo } from '@/utils/format'
import { FEED_GROUPS, feedContext, feedGroup, feedLink, matchesSearch, type FeedGroup } from './notes'

interface Item {
  key: string
  group: FeedGroup
  at: string
  origin: string
  detail: string | null
  text: string
  link: string | null
  bloc: ShopNote | null
}

/** « Toutes les notes » : le bloc-notes et les notes laissées sur les fiches, en lecture seule, avec un lien vers chaque fiche. */
export function AllNotesView({
  shopId,
  currency,
  blocNotes,
  search,
  onOpenBloc,
}: {
  shopId: string
  currency: string
  blocNotes: ShopNote[]
  search: string
  onOpenBloc: (note: ShopNote) => void
}) {
  const [group, setGroup] = useState<FeedGroup | 'all'>('all')
  const { data: feed = [], isLoading, isError } = useQuery({ queryKey: ['notes', 'feed', shopId], queryFn: () => listFeedNotes(shopId) })

  if (isLoading) return <Spinner />
  if (isError) return <ErrorMessage />

  const items: Item[] = [
    ...blocNotes.map((note) => ({
      key: `bloc-${note.id}`,
      group: 'bloc' as const,
      at: note.updated_at,
      origin: 'Bloc-notes',
      detail: null,
      text: [note.title, note.body].filter(Boolean).join('\n'),
      link: null,
      bloc: note,
    })),
    ...feed.map((note, index) => {
      const { origin, detail } = feedContext(note, currency)
      return {
        key: `${note.source}-${note.target_id}-${note.sub_id ?? ''}-${index}`,
        group: feedGroup(note.source),
        at: note.noted_at,
        origin,
        detail,
        text: note.note,
        link: feedLink(note),
        bloc: null,
      }
    }),
  ].sort((a, b) => b.at.localeCompare(a.at))

  const searched = search.trim() ? items.filter((i) => matchesSearch({ title: `${i.origin} ${i.detail ?? ''}`, body: i.text }, search)) : items
  const counts = searched.reduce<Record<string, number>>((acc, i) => ({ ...acc, [i.group]: (acc[i.group] ?? 0) + 1 }), {})
  const visible = group === 'all' ? searched : searched.filter((i) => i.group === group)
  const groupLabel = (code: FeedGroup) => FEED_GROUPS.find((g) => g.code === code)?.label ?? ''

  if (items.length === 0) {
    return (
      <Card padded={false}>
        <EmptyState
          icon={StickyNote}
          title="Aucune note pour l’instant"
          description="Les notes du bloc-notes et celles laissées sur vos commandes, vos dépenses ou vos tontines apparaîtront ici."
        />
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filtrer par origine">
        {[{ code: 'all' as const, label: 'Toutes' }, ...FEED_GROUPS]
          .filter((g) => g.code === 'all' || counts[g.code])
          .map((g) => (
            <button
              key={g.code}
              type="button"
              role="tab"
              aria-selected={group === g.code}
              onClick={() => setGroup(g.code)}
              className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ${group === g.code ? 'bg-brand-50 text-brand-800 ring-brand-300' : 'bg-white text-gray-600 ring-gray-200 hover:bg-gray-50'}`}
            >
              {g.label} · {g.code === 'all' ? searched.length : counts[g.code]}
            </button>
          ))}
      </div>

      {visible.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-500">Aucune note ne correspond{search.trim() ? ` à « ${search.trim()} »` : ''}.</p>
      ) : (
        <ul className="space-y-2">
          {visible.map((item) => (
            <li key={item.key}>
              <Card className="!p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm">
                      <Badge tone={item.group === 'bloc' ? 'brand' : 'neutral'}>{groupLabel(item.group)}</Badge>
                      {item.group !== 'bloc' && <span className="min-w-0 truncate font-medium text-gray-900">{item.origin}</span>}
                    </p>
                    {item.detail && <p className="mt-1 text-xs text-gray-500">{item.detail}</p>}
                  </div>
                  <span className="shrink-0 text-[11px] text-gray-400">{timeAgo(item.at)}</span>
                </div>
                <p className="mt-2 line-clamp-6 whitespace-pre-wrap break-words text-sm text-gray-800">{item.text}</p>
                {item.link ? (
                  <Link to={item.link} className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline">
                    Ouvrir la fiche <ArrowRight size={14} aria-hidden />
                  </Link>
                ) : (
                  item.bloc && (
                    <button
                      type="button"
                      onClick={() => item.bloc && onOpenBloc(item.bloc)}
                      className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline"
                    >
                      <Pencil size={14} aria-hidden /> Modifier
                    </button>
                  )
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-gray-400">Les notes des fiches se modifient sur la fiche elle-même : « Ouvrir la fiche » vous y emmène.</p>
    </div>
  )
}
