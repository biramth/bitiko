import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Layers, NotebookPen, Pin, PinOff, Search, StickyNote, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Dialog } from '@/components/ui/Dialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { PageHeader } from '@/components/ui/PageHeader'
import { PageLoader } from '@/components/ui/PageLoader'
import { Spinner } from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/Toast'
import { useMyShop } from '@/features/shop-settings/useMyShop'
import { AllNotesView } from '@/features/notes/AllNotesView'
import { ColorPicker } from '@/features/notes/NoteParts'
import { isNoteEmpty, matchesSearch, noteCardClass } from '@/features/notes/notes'
import { createNote, deleteNote, listNotes, updateNote, type NoteColor, type NoteInput, type ShopNote } from '@/services/notes.service'
import { usePageSeo } from '@/hooks/usePageSeo'
import { timeAgo } from '@/utils/format'

const INPUT = 'w-full border-0 bg-transparent p-0 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-0'

/** Bloc-notes du commerçant : écrire vite, retrouver facilement. */
export function NotesPage() {
  usePageSeo({ title: 'Notes — Bitiko', noindex: true })
  const queryClient = useQueryClient()
  const toast = useToast()
  const { data: shop, isLoading } = useMyShop()
  const shopId = shop?.id ?? ''
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<ShopNote | null>(null)
  const [deleting, setDeleting] = useState<ShopNote | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const view: 'mine' | 'all' = searchParams.get('vue') === 'toutes' ? 'all' : 'mine'

  const notesQuery = useQuery({ queryKey: ['notes', shopId], queryFn: () => listNotes(shopId), enabled: !!shop })
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['notes'] })

  const create = useMutation({
    mutationFn: (input: NoteInput) => createNote(shopId, input),
    onSuccess: refresh,
    onError: () => toast.error('La note n’a pas pu être enregistrée.'),
  })
  const save = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<NoteInput> & { pinned?: boolean } }) => updateNote(id, patch),
    onSuccess: (_, { patch }) => {
      refresh()
      if (!('pinned' in patch)) setEditing(null)
    },
    onError: () => toast.error('Modification impossible.'),
  })
  const remove = useMutation({
    mutationFn: deleteNote,
    onSuccess: () => {
      refresh()
      setDeleting(null)
      toast.success('Note supprimée.')
    },
    onError: () => toast.error('Suppression impossible.'),
  })

  if (isLoading) return <PageLoader />
  if (!shop) return <p className="text-sm text-gray-500">Aucune boutique configurée.</p>

  const notes = notesQuery.data ?? []
  const visible = search.trim() ? notes.filter((n) => matchesSearch(n, search)) : notes
  const pinned = visible.filter((n) => n.pinned)
  const others = visible.filter((n) => !n.pinned)
  const togglePin = (note: ShopNote) => save.mutate({ id: note.id, patch: { pinned: !note.pinned } })

  const grid = (items: ShopNote[]) => (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((note) => (
        <li key={note.id} className={`group relative flex flex-col rounded-xl p-4 ring-1 ${noteCardClass(note.color)}`}>
          <button type="button" onClick={() => setEditing(note)} className="min-w-0 flex-1 pr-7 text-left">
            {note.title && <p className="mb-1 break-words font-semibold text-gray-900">{note.title}</p>}
            {note.body && <p className="line-clamp-[10] whitespace-pre-wrap break-words text-sm text-gray-700">{note.body}</p>}
          </button>
          <p className="mt-3 text-[11px] text-gray-400">Modifiée {timeAgo(note.updated_at)}</p>
          <button
            type="button"
            onClick={() => togglePin(note)}
            aria-label={note.pinned ? `Désépingler ${note.title ?? 'la note'}` : `Épingler ${note.title ?? 'la note'}`}
            className={`absolute right-2 top-2 rounded-lg p-1.5 hover:bg-black/5 ${note.pinned ? 'text-gray-700' : 'text-gray-400 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100'}`}
          >
            {note.pinned ? <PinOff size={15} aria-hidden /> : <Pin size={15} aria-hidden />}
          </button>
        </li>
      ))}
    </ul>
  )

  return (
    <div className="space-y-5">
      <PageHeader title="Notes" subtitle="Rappels, idées, infos fournisseurs… tout ce que vous ne voulez pas oublier, au même endroit." />

      <div role="tablist" aria-label="Notes affichées" data-guide="guide-notes-onglets" className="grid grid-cols-2 gap-2 sm:inline-grid sm:grid-cols-[repeat(2,max-content)]">
        {([
          { key: 'mine', label: 'Mes notes', hint: 'Le bloc-notes', icon: NotebookPen },
          { key: 'all', label: 'Toutes les notes', hint: 'Commandes, tontines, finances…', icon: Layers },
        ] as const).map(({ key, label, hint, icon: Icon }) => {
          const active = key === view
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setSearchParams(key === 'mine' ? {} : { vue: 'toutes' }, { replace: true })}
              className={`flex items-center gap-2.5 rounded-xl border px-4 py-2.5 text-left transition-colors ${
                active ? 'border-brand-300 bg-brand-50' : 'border-gray-200 bg-white hover:bg-gray-50'
              }`}
            >
              <Icon size={18} aria-hidden className={active ? 'text-brand-700' : 'text-gray-400'} />
              <span>
                <span className={`block text-sm font-semibold ${active ? 'text-brand-800' : 'text-gray-800'}`}>{label}</span>
                <span className="block text-xs text-gray-500">{hint}</span>
              </span>
            </button>
          )
        })}
      </div>

      {view === 'mine' && <Composer pending={create.isPending} onCreate={(input) => create.mutateAsync(input)} />}

      {(notes.length > 0 || view === 'all') && (
        <label className="relative block sm:max-w-sm">
          <span className="sr-only">Rechercher dans les notes</span>
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher dans les notes"
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </label>
      )}

      {view === 'all' ? (
        notesQuery.isLoading ? (
          <Spinner />
        ) : (
          <AllNotesView shopId={shopId} currency={shop.currency} blocNotes={notes} search={search} onOpenBloc={setEditing} />
        )
      ) : notesQuery.isLoading ? (
        <Spinner />
      ) : notesQuery.isError ? (
        <ErrorMessage />
      ) : notes.length === 0 ? (
        <Card padded={false}>
          <EmptyState icon={StickyNote} title="Aucune note pour l’instant" description="Écrivez votre première note ci-dessus : un fournisseur à rappeler, une commande à préparer, une idée…" />
        </Card>
      ) : visible.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-500">Aucune note ne correspond à « {search.trim()} ».</p>
      ) : (
        <div className="space-y-5">
          {pinned.length > 0 && (
            <section>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Épinglées</h2>
              {grid(pinned)}
            </section>
          )}
          {others.length > 0 && (
            <section>
              {pinned.length > 0 && <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Autres</h2>}
              {grid(others)}
            </section>
          )}
        </div>
      )}

      <Dialog open={!!editing} onClose={() => setEditing(null)} title="Modifier la note" size="md">
        {editing && (
          <NoteEditor
            key={editing.id}
            note={editing}
            pending={save.isPending}
            onCancel={() => setEditing(null)}
            onDelete={() => {
              setDeleting(editing)
              setEditing(null)
            }}
            onSave={(input) => save.mutate({ id: editing.id, patch: input })}
          />
        )}
      </Dialog>

      <ConfirmDialog
        open={!!deleting}
        title="Supprimer cette note ?"
        description="Elle sera définitivement effacée."
        confirmLabel="Supprimer"
        pendingLabel="Suppression…"
        pending={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
        onClose={() => setDeleting(null)}
      />
    </div>
  )
}

/** Saisie rapide : le titre et la couleur n'apparaissent qu'une fois qu'on commence à écrire. */
function Composer({ pending, onCreate }: { pending: boolean; onCreate: (input: NoteInput) => Promise<void> }) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [color, setColor] = useState<NoteColor>('default')
  const [expanded, setExpanded] = useState(false)
  const empty = isNoteEmpty({ title, body })

  const reset = () => {
    setTitle('')
    setBody('')
    setColor('default')
    setExpanded(false)
  }

  return (
    <form
      data-guide="guide-notes-saisie"
      className={`rounded-xl p-4 shadow-sm ring-1 ${noteCardClass(color)}`}
      onSubmit={async (e) => {
        e.preventDefault()
        if (empty) return
        try {
          await onCreate({ title: title.trim() || null, body: body.trim(), color })
          reset()
        } catch {
          // Message affiché par la page.
        }
      }}
    >
      {expanded && (
        <input
          aria-label="Titre"
          maxLength={120}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Titre (facultatif)"
          className={`${INPUT} mb-2 font-semibold`}
        />
      )}
      <textarea
        aria-label="Nouvelle note"
        rows={expanded ? 4 : 1}
        maxLength={10000}
        value={body}
        onFocus={() => setExpanded(true)}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) e.currentTarget.form?.requestSubmit()
        }}
        placeholder="Écrire une note…"
        className={`${INPUT} resize-none text-sm`}
      />
      {expanded && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <ColorPicker value={color} onChange={setColor} />
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={reset}>Fermer</Button>
            <Button type="submit" size="sm" loading={pending} disabled={empty}>Ajouter</Button>
          </div>
        </div>
      )}
    </form>
  )
}

function NoteEditor({
  note,
  pending,
  onCancel,
  onDelete,
  onSave,
}: {
  note: ShopNote
  pending: boolean
  onCancel: () => void
  onDelete: () => void
  onSave: (input: NoteInput) => void
}) {
  const [title, setTitle] = useState(note.title ?? '')
  const [body, setBody] = useState(note.body)
  const [color, setColor] = useState<NoteColor>(note.color)
  const empty = isNoteEmpty({ title, body })

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (!empty) onSave({ title: title.trim() || null, body: body.trim(), color })
      }}
    >
      <div className={`rounded-xl p-4 ring-1 ${noteCardClass(color)}`}>
        <input aria-label="Titre" maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre (facultatif)" className={`${INPUT} mb-2 font-semibold`} />
        <textarea
          aria-label="Texte de la note"
          rows={10}
          maxLength={10000}
          autoFocus
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Écrire une note…"
          className={`${INPUT} resize-y text-sm`}
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ColorPicker value={color} onChange={setColor} />
        <p className="text-xs text-gray-400">Créée le {new Date(note.created_at).toLocaleDateString('fr-FR')}</p>
      </div>
      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" icon={<Trash2 size={15} aria-hidden />} onClick={onDelete}>Supprimer</Button>
        <div className="flex flex-col-reverse gap-2 sm:flex-row [&>*]:w-full sm:[&>*]:w-auto">
          <Button variant="secondary" onClick={onCancel}>Annuler</Button>
          <Button type="submit" loading={pending} disabled={empty}>Enregistrer</Button>
        </div>
      </div>
    </form>
  )
}
