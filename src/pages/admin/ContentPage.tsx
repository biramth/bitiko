import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, Megaphone, MessageCircleQuestion, Pencil, Plus, Share2, Star, Trash2 } from 'lucide-react'
import { useMyShop } from '@/features/shop-settings/useMyShop'
import { faqsCollection, promosCollection, socialPostsCollection, testimonialsCollection } from '@/services/cms.service'
import { invalidateCms } from '@/features/cms/useCmsContent'
import { isPromoLive } from '@/features/promos/promoTargeting'
import { socialEmbedSrc } from '@/features/store-builder/sections/socialEmbeds'
import { listCategories } from '@/services/category.service'
import { listProductOptions } from '@/services/product.service'
import { listShopServices } from '@/services/service.service'
import { usePageSeo } from '@/hooks/usePageSeo'
import { PageHeader } from '@/components/ui/PageHeader'
import { PageLoader } from '@/components/ui/PageLoader'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Dialog } from '@/components/ui/Dialog'
import { useToast } from '@/components/ui/Toast'
import { buttonClass, controlClass } from '@/components/ui/styles'
import type { ShopFaq, ShopPromo, ShopPromoScope, ShopSocialPost, ShopTestimonial } from '@/types/cms'
import { PROMO_SCOPES } from '@/types/cms'

/* ── Outillage partagé ─────────────────────────────────────────────────── */

interface CmsCrudApi {
  create: (shopId: string, values: Record<string, unknown>) => Promise<unknown>
  update: (id: string, patch: Record<string, unknown>) => Promise<void>
  remove: (id: string) => Promise<void>
  reorder: (ids: string[]) => Promise<void>
}

function useCmsCrud(api: CmsCrudApi, shopId: string | undefined, rows: { id: string }[] | undefined) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const invalidate = () => {
    if (shopId) invalidateCms(queryClient, shopId)
  }
  const onError = () => toast.error('Impossible d’enregistrer. Réessaie.')

  const createMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) => api.create(shopId!, values),
    onSuccess: () => {
      invalidate()
      toast.success('Créé.')
    },
    onError,
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Record<string, unknown> }) => api.update(id, patch),
    onSuccess: () => {
      invalidate()
      toast.success('Mis à jour.')
    },
    onError,
  })
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.remove(id),
    onSuccess: () => {
      invalidate()
      toast.success('Supprimé.')
    },
    onError,
  })
  const reorderMutation = useMutation({
    mutationFn: (ids: string[]) => api.reorder(ids),
    onSuccess: () => {
      invalidate()
      toast.success('Ordre mis à jour.')
    },
    onError,
  })
  const move = (id: string, direction: -1 | 1) => {
    if (!rows) return
    const ids = rows.map((r) => r.id)
    const index = ids.indexOf(id)
    const target = index + direction
    if (index < 0 || target < 0 || target >= ids.length) return
    ;[ids[index], ids[target]] = [ids[target], ids[index]]
    reorderMutation.mutate(ids)
  }

  return { createMutation, updateMutation, deleteMutation, move }
}

function RowShell({
  title,
  subtitle,
  active,
  onToggle,
  onMoveUp,
  onMoveDown,
  onEdit,
  onDelete,
  toggling,
}: {
  title: string
  subtitle?: string
  active: boolean
  onToggle: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onEdit: () => void
  onDelete: () => void
  toggling: boolean
}) {
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <div className="flex shrink-0 flex-col text-gray-300">
        <button type="button" onClick={onMoveUp} aria-label="Monter" className="rounded p-0.5 text-gray-400 hover:text-gray-700">
          <ArrowUp size={14} />
        </button>
        <button type="button" onClick={onMoveDown} aria-label="Descendre" className="rounded p-0.5 text-gray-400 hover:text-gray-700">
          <ArrowDown size={14} />
        </button>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900">{title}</p>
        {subtitle && <p className="mt-0.5 truncate text-xs text-gray-500">{subtitle}</p>}
      </div>
      <button
        type="button"
        onClick={onToggle}
        disabled={toggling}
        className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors disabled:opacity-50 ${
          active ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
        }`}
      >
        {active ? 'Actif' : 'Masqué'}
      </button>
      <div className="flex shrink-0 items-center gap-1">
        <button type="button" onClick={onEdit} aria-label={`Modifier ${title}`} className="rounded p-1 text-gray-400 hover:text-gray-700">
          <Pencil size={16} />
        </button>
        <button type="button" onClick={onDelete} aria-label={`Supprimer ${title}`} className="rounded p-1 text-gray-400 hover:text-red-600">
          <Trash2 size={16} />
        </button>
      </div>
    </li>
  )
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  )
}

function toLocalInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fromLocalInput(value: string): string | null {
  if (!value.trim()) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

function formatDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

/* ── Onglet Promos ─────────────────────────────────────────────────────── */

const SCOPE_LABEL = Object.fromEntries(PROMO_SCOPES.map((s) => [s.value, s.label])) as Record<ShopPromoScope, string>

function promoStatus(promo: ShopPromo): string {
  if (!promo.is_active) return 'Masquée'
  const now = new Date()
  if (promo.starts_at && new Date(promo.starts_at).getTime() > now.getTime()) return `Planifiée · dès le ${formatDate(promo.starts_at)}`
  if (promo.ends_at && new Date(promo.ends_at).getTime() <= now.getTime()) return 'Terminée'
  if (promo.ends_at) return `En cours · jusqu’au ${formatDate(promo.ends_at)}`
  return 'En cours'
}

function promoWhere(promo: ShopPromo, names: { product?: string; category?: string; service?: string }): string {
  const scope = SCOPE_LABEL[promo.scope as ShopPromoScope] ?? promo.scope
  const target =
    promo.scope === 'product' ? names.product : promo.scope === 'category' ? names.category : promo.scope === 'service' ? names.service : null
  return target ? `${scope} · ${target}` : scope
}

function PromoDialog({
  open,
  promo,
  products,
  categories,
  services,
  onClose,
  onSave,
  isPending,
}: {
  open: boolean
  promo: ShopPromo | null
  products: { id: string; name: string }[]
  categories: { id: string; name: string }[]
  services: { id: string; name: string }[]
  onClose: () => void
  onSave: (values: Record<string, unknown>) => void
  isPending: boolean
}) {
  const [title, setTitle] = useState(promo?.title ?? '')
  const [badge, setBadge] = useState(promo?.badge_label ?? '')
  const [scope, setScope] = useState<ShopPromoScope>((promo?.scope as ShopPromoScope) ?? 'site')
  const [productId, setProductId] = useState(promo?.product_id ?? '')
  const [categoryId, setCategoryId] = useState(promo?.category_id ?? '')
  const [serviceId, setServiceId] = useState(promo?.service_id ?? '')
  const [body, setBody] = useState(promo?.body ?? '')
  const [buttonLabel, setButtonLabel] = useState(promo?.button_label ?? '')
  const [buttonLink, setButtonLink] = useState(promo?.button_link ?? '')
  const [imageUrl, setImageUrl] = useState(promo?.image_url ?? '')
  const [startsAt, setStartsAt] = useState(toLocalInput(promo?.starts_at ?? null))
  const [endsAt, setEndsAt] = useState(toLocalInput(promo?.ends_at ?? null))
  const [isActive, setIsActive] = useState(promo?.is_active ?? true)

  if (!open) return null

  const save = () =>
    onSave({
      title: title.trim(),
      badge_label: badge.trim() || null,
      scope,
      product_id: scope === 'product' && productId ? productId : null,
      category_id: scope === 'category' && categoryId ? categoryId : null,
      service_id: scope === 'service' && serviceId ? serviceId : null,
      body: body.trim() || null,
      button_label: buttonLabel.trim() || null,
      button_link: buttonLink.trim() || null,
      image_url: imageUrl.trim() || null,
      starts_at: fromLocalInput(startsAt),
      ends_at: fromLocalInput(endsAt),
      is_active: isActive,
    })

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={promo ? 'Modifier la promo' : 'Nouvelle promo'}
      description="Une promo ne change jamais les prix : elle affiche une pastille et un bandeau."
      footer={
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} disabled={isPending} className={buttonClass({ variant: 'secondary' })}>
            Annuler
          </button>
          <button
            type="button"
            onClick={save}
            disabled={isPending || !title.trim() || (scope === 'product' && !productId) || (scope === 'category' && !categoryId) || (scope === 'service' && !serviceId)}
            className={buttonClass()}
          >
            {isPending ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <Field label="Titre">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Soldes d’hivernage" maxLength={80} className={controlClass()} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Pastille" hint="Ex : -20%, Nouveau. Vide = pas de pastille.">
            <input value={badge} onChange={(e) => setBadge(e.target.value.slice(0, 24))} placeholder="-20%" maxLength={24} className={controlClass()} />
          </Field>
          <Field label="Portée">
            <select value={scope} onChange={(e) => setScope(e.target.value as ShopPromoScope)} className={controlClass()}>
              {PROMO_SCOPES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        {scope === 'product' && (
          <Field label="Produit visé">
            <select value={productId} onChange={(e) => setProductId(e.target.value)} className={controlClass()}>
              <option value="">Choisir…</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
        )}
        {scope === 'category' && (
          <Field label="Catégorie visée" hint="Produits et prestations de cette catégorie.">
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={controlClass()}>
              <option value="">Choisir…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
        )}
        {scope === 'service' && (
          <Field label="Prestation visée">
            <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} className={controlClass()}>
              <option value="">Choisir…</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field label="Texte (optionnel)" hint="Affiché dans le bloc Promo du site.">
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={2} maxLength={280} placeholder="Jusqu’à -20% sur une sélection…" className={controlClass()} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Bouton (optionnel)">
            <input value={buttonLabel} onChange={(e) => setButtonLabel(e.target.value)} placeholder="J’en profite" maxLength={40} className={controlClass()} />
          </Field>
          <Field label="Lien du bouton">
            <input value={buttonLink} onChange={(e) => setButtonLink(e.target.value)} placeholder="/catalogue" className={controlClass()} />
          </Field>
        </div>
        <Field label="Image (optionnel)" hint="URL d’une image pour habiller le bandeau.">
          <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://…" inputMode="url" className={controlClass()} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Début (optionnel)">
            <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className={controlClass()} />
          </Field>
          <Field label="Fin (optionnel)">
            <input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className={controlClass()} />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="accent-brand-600" />
          Visible sur le site
        </label>
      </div>
    </Dialog>
  )
}

function PromosTab({ shopId }: { shopId: string }) {
  const toast = useToast()
  const { data: promos, isLoading, isError } = useQuery({
    queryKey: ['cms', 'promos', shopId],
    queryFn: () => promosCollection.list(shopId),
  })
  const { data: products } = useQuery({ queryKey: ['cms', 'promo-products', shopId], queryFn: () => listProductOptions(shopId) })
  const { data: categories } = useQuery({ queryKey: ['categories', shopId], queryFn: () => listCategories(shopId) })
  const { data: services } = useQuery({ queryKey: ['cms', 'promo-services', shopId], queryFn: () => listShopServices(shopId) })

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<ShopPromo | null>(null)
  const [deleting, setDeleting] = useState<ShopPromo | null>(null)
  const crud = useCmsCrud(promosCollection as unknown as CmsCrudApi, shopId, promos)

  if (isLoading) return <PageLoader />
  if (isError) return <ErrorMessage />

  const names = {
    product: Object.fromEntries((products ?? []).map((p) => [p.id, p.name])),
    category: Object.fromEntries((categories ?? []).map((c) => [c.id, c.name])),
    service: Object.fromEntries((services ?? []).map((s) => [s.id, s.name])),
  }
  const rows = promos ?? []
  const saving = crud.createMutation.isPending || crud.updateMutation.isPending

  const save = (values: Record<string, unknown>) => {
    if (editing) {
      crud.updateMutation.mutate(
        { id: editing.id, patch: values },
        { onSuccess: () => {
          setDialogOpen(false)
          setEditing(null)
        } },
      )
    } else {
      crud.createMutation.mutate(values, {
        onSuccess: () => {
          setDialogOpen(false)
        },
        onError: () => toast.error('Impossible de créer cette promo.'),
      })
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="max-w-xl text-sm text-gray-500">
          Pastilles auto sur les produits, prestations et catégories visés, plus bandeau via le bloc Promo (source CMS) dans Personnaliser.
        </p>
        <button
          type="button"
          onClick={() => {
            setEditing(null)
            setDialogOpen(true)
          }}
          className="flex items-center gap-2 whitespace-nowrap rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          <Plus size={16} /> Nouvelle promo
        </button>
      </div>
      {rows.length === 0 ? (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <EmptyState
            icon={Megaphone}
            title="Aucune promo"
            description="Soldes, nouveautés, offre de lancement : crée ta première promo."
            action={
              <button
                type="button"
                onClick={() => {
                  setEditing(null)
                  setDialogOpen(true)
                }}
                className="mt-3 flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
              >
                <Plus size={16} /> Créer ma première promo
              </button>
            }
          />
        </div>
      ) : (
        <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
          {rows.map((promo) => (
            <RowShell
              key={promo.id}
              title={`${promo.badge_label ? `${promo.badge_label} · ` : ''}${promo.title}`}
              subtitle={`${promoWhere(promo, { product: names.product[promo.product_id ?? ''], category: names.category[promo.category_id ?? ''], service: names.service[promo.service_id ?? ''] })} · ${promoStatus(promo)}`}
              active={promo.is_active && isPromoLive(promo)}
              onToggle={() => crud.updateMutation.mutate({ id: promo.id, patch: { is_active: !promo.is_active } })}
              onMoveUp={() => crud.move(promo.id, -1)}
              onMoveDown={() => crud.move(promo.id, 1)}
              onEdit={() => {
                setEditing(promo)
                setDialogOpen(true)
              }}
              onDelete={() => setDeleting(promo)}
              toggling={crud.updateMutation.isPending}
            />
          ))}
        </ul>
      )}
      <PromoDialog
        key={editing?.id ?? 'new'}
        open={dialogOpen}
        promo={editing}
        products={(products ?? []).map((p) => ({ id: p.id, name: p.name }))}
        categories={(categories ?? []).map((c) => ({ id: c.id, name: c.name }))}
        services={(services ?? []).map((s) => ({ id: s.id, name: s.name }))}
        onClose={() => {
          setDialogOpen(false)
          setEditing(null)
        }}
        onSave={save}
        isPending={saving}
      />
      <ConfirmDialog
        open={!!deleting}
        title="Supprimer cette promo ?"
        description={deleting ? `« ${deleting.title} » ne s’affichera plus sur le site.` : undefined}
        confirmLabel="Supprimer"
        pendingLabel="Suppression…"
        pending={crud.deleteMutation.isPending}
        onConfirm={() => {
          if (deleting) {
            crud.deleteMutation.mutate(deleting.id, { onSuccess: () => setDeleting(null) })
          }
        }}
        onClose={() => setDeleting(null)}
      />
    </div>
  )
}

/* ── Onglet Avis ───────────────────────────────────────────────────────── */

function TestimonialDialog({
  open,
  testimonial,
  onClose,
  onSave,
  isPending,
}: {
  open: boolean
  testimonial: ShopTestimonial | null
  onClose: () => void
  onSave: (values: Record<string, unknown>) => void
  isPending: boolean
}) {
  const [name, setName] = useState(testimonial?.name ?? '')
  const [text, setText] = useState(testimonial?.text ?? '')
  const [rating, setRating] = useState(testimonial?.rating ? String(testimonial.rating) : '')
  const [photoUrl, setPhotoUrl] = useState(testimonial?.photo_url ?? '')
  const [isActive, setIsActive] = useState(testimonial?.is_active ?? true)

  if (!open) return null

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={testimonial ? 'Modifier l’avis' : 'Nouvel avis'}
      description="Un vrai retour client — recopié depuis WhatsApp ou Google, avec son prénom."
      footer={
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} disabled={isPending} className={buttonClass({ variant: 'secondary' })}>
            Annuler
          </button>
          <button
            type="button"
            onClick={() =>
              onSave({
                name: name.trim(),
                text: text.trim(),
                rating: rating ? Number(rating) : null,
                photo_url: photoUrl.trim() || null,
                is_active: isActive,
              })
            }
            disabled={isPending || !name.trim() || !text.trim()}
            className={buttonClass()}
          >
            {isPending ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <Field label="Prénom / nom">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Awa" maxLength={60} className={controlClass()} />
        </Field>
        <Field label="Témoignage">
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={500} placeholder="« Livraison rapide, qualité au top… »" className={controlClass()} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Note (optionnel)">
            <select value={rating} onChange={(e) => setRating(e.target.value)} className={controlClass()}>
              <option value="">Sans note</option>
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {n} / 5
                </option>
              ))}
            </select>
          </Field>
          <Field label="Photo (optionnel)">
            <input value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} placeholder="https://…" inputMode="url" className={controlClass()} />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="accent-brand-600" />
          Visible sur le site
        </label>
      </div>
    </Dialog>
  )
}

function TestimonialsTab({ shopId }: { shopId: string }) {
  const { data: rows, isLoading, isError } = useQuery({
    queryKey: ['cms', 'testimonials', shopId],
    queryFn: () => testimonialsCollection.list(shopId),
  })
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<ShopTestimonial | null>(null)
  const [deleting, setDeleting] = useState<ShopTestimonial | null>(null)
  const crud = useCmsCrud(testimonialsCollection as unknown as CmsCrudApi, shopId, rows)

  if (isLoading) return <PageLoader />
  if (isError) return <ErrorMessage />

  const list = rows ?? []
  const saving = crud.createMutation.isPending || crud.updateMutation.isPending
  const save = (values: Record<string, unknown>) => {
    if (editing) {
      crud.updateMutation.mutate({ id: editing.id, patch: values }, { onSuccess: () => {
        setDialogOpen(false)
        setEditing(null)
      } })
    } else {
      crud.createMutation.mutate(values, { onSuccess: () => setDialogOpen(false) })
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="max-w-xl text-sm text-gray-500">
          Affichés via le bloc Témoignages (source CMS) dans Personnaliser. L’ordre ci-dessous est celui du site.
        </p>
        <button
          type="button"
          onClick={() => {
            setEditing(null)
            setDialogOpen(true)
          }}
          className="flex items-center gap-2 whitespace-nowrap rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          <Plus size={16} /> Nouvel avis
        </button>
      </div>
      {list.length === 0 ? (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <EmptyState
            icon={Star}
            title="Aucun avis"
            description="Ajoute tes premiers retours clients : c’est la preuve qui fait vendre."
            action={
              <button
                type="button"
                onClick={() => {
                  setEditing(null)
                  setDialogOpen(true)
                }}
                className="mt-3 flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
              >
                <Plus size={16} /> Ajouter un avis
              </button>
            }
          />
        </div>
      ) : (
        <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
          {list.map((t) => (
            <RowShell
              key={t.id}
              title={`« ${t.text.length > 90 ? `${t.text.slice(0, 90)}…` : t.text} » — ${t.name}`}
              subtitle={t.rating ? `Note : ${t.rating}/5` : undefined}
              active={t.is_active}
              onToggle={() => crud.updateMutation.mutate({ id: t.id, patch: { is_active: !t.is_active } })}
              onMoveUp={() => crud.move(t.id, -1)}
              onMoveDown={() => crud.move(t.id, 1)}
              onEdit={() => {
                setEditing(t)
                setDialogOpen(true)
              }}
              onDelete={() => setDeleting(t)}
              toggling={crud.updateMutation.isPending}
            />
          ))}
        </ul>
      )}
      <TestimonialDialog
        key={editing?.id ?? 'new'}
        open={dialogOpen}
        testimonial={editing}
        onClose={() => {
          setDialogOpen(false)
          setEditing(null)
        }}
        onSave={save}
        isPending={saving}
      />
      <ConfirmDialog
        open={!!deleting}
        title="Supprimer cet avis ?"
        confirmLabel="Supprimer"
        pendingLabel="Suppression…"
        pending={crud.deleteMutation.isPending}
        onConfirm={() => {
          if (deleting) crud.deleteMutation.mutate(deleting.id, { onSuccess: () => setDeleting(null) })
        }}
        onClose={() => setDeleting(null)}
      />
    </div>
  )
}

/* ── Onglet FAQ ────────────────────────────────────────────────────────── */

function FaqDialog({
  open,
  faq,
  onClose,
  onSave,
  isPending,
}: {
  open: boolean
  faq: ShopFaq | null
  onClose: () => void
  onSave: (values: Record<string, unknown>) => void
  isPending: boolean
}) {
  const [question, setQuestion] = useState(faq?.question ?? '')
  const [answer, setAnswer] = useState(faq?.answer ?? '')
  const [isActive, setIsActive] = useState(faq?.is_active ?? true)

  if (!open) return null

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={faq ? 'Modifier la question' : 'Nouvelle question'}
      description="Livraison, paiement, retours, rendez-vous : ce que tes clients demandent vraiment."
      footer={
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} disabled={isPending} className={buttonClass({ variant: 'secondary' })}>
            Annuler
          </button>
          <button
            type="button"
            onClick={() => onSave({ question: question.trim(), answer: answer.trim(), is_active: isActive })}
            disabled={isPending || !question.trim() || !answer.trim()}
            className={buttonClass()}
          >
            {isPending ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <Field label="Question">
          <input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Comment fonctionne la livraison ?" maxLength={160} className={controlClass()} />
        </Field>
        <Field label="Réponse">
          <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} rows={4} maxLength={1000} placeholder="On livre partout à Dakar sous 24 h…" className={controlClass()} />
        </Field>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="accent-brand-600" />
          Visible sur le site
        </label>
      </div>
    </Dialog>
  )
}

function FaqsTab({ shopId }: { shopId: string }) {
  const { data: rows, isLoading, isError } = useQuery({
    queryKey: ['cms', 'faqs', shopId],
    queryFn: () => faqsCollection.list(shopId),
  })
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<ShopFaq | null>(null)
  const [deleting, setDeleting] = useState<ShopFaq | null>(null)
  const crud = useCmsCrud(faqsCollection as unknown as CmsCrudApi, shopId, rows)

  if (isLoading) return <PageLoader />
  if (isError) return <ErrorMessage />

  const list = rows ?? []
  const saving = crud.createMutation.isPending || crud.updateMutation.isPending
  const save = (values: Record<string, unknown>) => {
    if (editing) {
      crud.updateMutation.mutate({ id: editing.id, patch: values }, { onSuccess: () => {
        setDialogOpen(false)
        setEditing(null)
      } })
    } else {
      crud.createMutation.mutate(values, { onSuccess: () => setDialogOpen(false) })
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="max-w-xl text-sm text-gray-500">
          Affichées via le bloc Questions fréquentes (source CMS) dans Personnaliser.
        </p>
        <button
          type="button"
          onClick={() => {
            setEditing(null)
            setDialogOpen(true)
          }}
          className="flex items-center gap-2 whitespace-nowrap rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          <Plus size={16} /> Nouvelle question
        </button>
      </div>
      {list.length === 0 ? (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <EmptyState
            icon={MessageCircleQuestion}
            title="Aucune question"
            description="Anticipe les hésitations : livraison, paiement, retours…"
            action={
              <button
                type="button"
                onClick={() => {
                  setEditing(null)
                  setDialogOpen(true)
                }}
                className="mt-3 flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
              >
                <Plus size={16} /> Ajouter une question
              </button>
            }
          />
        </div>
      ) : (
        <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
          {list.map((f) => (
            <RowShell
              key={f.id}
              title={f.question}
              subtitle={f.answer.length > 90 ? `${f.answer.slice(0, 90)}…` : f.answer}
              active={f.is_active}
              onToggle={() => crud.updateMutation.mutate({ id: f.id, patch: { is_active: !f.is_active } })}
              onMoveUp={() => crud.move(f.id, -1)}
              onMoveDown={() => crud.move(f.id, 1)}
              onEdit={() => {
                setEditing(f)
                setDialogOpen(true)
              }}
              onDelete={() => setDeleting(f)}
              toggling={crud.updateMutation.isPending}
            />
          ))}
        </ul>
      )}
      <FaqDialog
        key={editing?.id ?? 'new'}
        open={dialogOpen}
        faq={editing}
        onClose={() => {
          setDialogOpen(false)
          setEditing(null)
        }}
        onSave={save}
        isPending={saving}
      />
      <ConfirmDialog
        open={!!deleting}
        title="Supprimer cette question ?"
        confirmLabel="Supprimer"
        pendingLabel="Suppression…"
        pending={crud.deleteMutation.isPending}
        onConfirm={() => {
          if (deleting) crud.deleteMutation.mutate(deleting.id, { onSuccess: () => setDeleting(null) })
        }}
        onClose={() => setDeleting(null)}
      />
    </div>
  )
}

/* ── Onglet Réseaux ────────────────────────────────────────────────────── */

function SocialDialog({
  open,
  post,
  onClose,
  onSave,
  isPending,
}: {
  open: boolean
  post: ShopSocialPost | null
  onClose: () => void
  onSave: (values: Record<string, unknown>) => void
  isPending: boolean
}) {
  const [url, setUrl] = useState(post?.url ?? '')
  const [isActive, setIsActive] = useState(post?.is_active ?? true)
  const embed = socialEmbedSrc(url)

  if (!open) return null

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={post ? 'Modifier la publication' : 'Nouvelle publication'}
      description="Colle le lien d’une publication TikTok, Instagram, Facebook ou YouTube."
      footer={
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} disabled={isPending} className={buttonClass({ variant: 'secondary' })}>
            Annuler
          </button>
          <button
            type="button"
            onClick={() => onSave({ url: url.trim(), is_active: isActive })}
            disabled={isPending || !embed}
            className={buttonClass()}
          >
            {isPending ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <Field
          label="Lien de la publication"
          hint={url.trim() ? (embed ? `Reconnue : ${embed.platform}.` : 'Lien non reconnu — vérifie l’URL.') : 'TikTok, Instagram, Facebook ou YouTube.'}
        >
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.tiktok.com/@…/video/…" inputMode="url" className={controlClass()} />
        </Field>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="accent-brand-600" />
          Visible sur le site
        </label>
      </div>
    </Dialog>
  )
}

function SocialTab({ shopId }: { shopId: string }) {
  const { data: rows, isLoading, isError } = useQuery({
    queryKey: ['cms', 'social-posts', shopId],
    queryFn: () => socialPostsCollection.list(shopId),
  })
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<ShopSocialPost | null>(null)
  const [deleting, setDeleting] = useState<ShopSocialPost | null>(null)
  const crud = useCmsCrud(socialPostsCollection as unknown as CmsCrudApi, shopId, rows)

  if (isLoading) return <PageLoader />
  if (isError) return <ErrorMessage />

  const list = rows ?? []
  const saving = crud.createMutation.isPending || crud.updateMutation.isPending
  const save = (values: Record<string, unknown>) => {
    if (editing) {
      crud.updateMutation.mutate({ id: editing.id, patch: values }, { onSuccess: () => {
        setDialogOpen(false)
        setEditing(null)
      } })
    } else {
      crud.createMutation.mutate(values, { onSuccess: () => setDialogOpen(false) })
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="max-w-xl text-sm text-gray-500">
          Affichées via le bloc Réseaux sociaux (source CMS) dans Personnaliser.
        </p>
        <button
          type="button"
          onClick={() => {
            setEditing(null)
            setDialogOpen(true)
          }}
          className="flex items-center gap-2 whitespace-nowrap rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          <Plus size={16} /> Nouvelle publication
        </button>
      </div>
      {list.length === 0 ? (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <EmptyState
            icon={Share2}
            title="Aucune publication"
            description="Montre ton univers : tes vidéos et posts, directement sur ton site."
            action={
              <button
                type="button"
                onClick={() => {
                  setEditing(null)
                  setDialogOpen(true)
                }}
                className="mt-3 flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
              >
                <Plus size={16} /> Ajouter une publication
              </button>
            }
          />
        </div>
      ) : (
        <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
          {list.map((p) => {
            const embed = socialEmbedSrc(p.url)
            return (
              <RowShell
                key={p.id}
                title={embed ? `${embed.platform} · ${p.url.length > 60 ? `${p.url.slice(0, 60)}…` : p.url}` : p.url}
                subtitle={embed ? undefined : 'Lien non reconnu — ne s’affiche pas sur le site'}
                active={p.is_active}
                onToggle={() => crud.updateMutation.mutate({ id: p.id, patch: { is_active: !p.is_active } })}
                onMoveUp={() => crud.move(p.id, -1)}
                onMoveDown={() => crud.move(p.id, 1)}
                onEdit={() => {
                  setEditing(p)
                  setDialogOpen(true)
                }}
                onDelete={() => setDeleting(p)}
                toggling={crud.updateMutation.isPending}
              />
            )
          })}
        </ul>
      )}
      <SocialDialog
        key={editing?.id ?? 'new'}
        open={dialogOpen}
        post={editing}
        onClose={() => {
          setDialogOpen(false)
          setEditing(null)
        }}
        onSave={save}
        isPending={saving}
      />
      <ConfirmDialog
        open={!!deleting}
        title="Supprimer cette publication ?"
        confirmLabel="Supprimer"
        pendingLabel="Suppression…"
        pending={crud.deleteMutation.isPending}
        onConfirm={() => {
          if (deleting) crud.deleteMutation.mutate(deleting.id, { onSuccess: () => setDeleting(null) })
        }}
        onClose={() => setDeleting(null)}
      />
    </div>
  )
}

/* ── Page ──────────────────────────────────────────────────────────────── */

const TABS = [
  { key: 'promos', label: 'Promos', icon: Megaphone },
  { key: 'avis', label: 'Avis', icon: Star },
  { key: 'faq', label: 'FAQ', icon: MessageCircleQuestion },
  { key: 'reseaux', label: 'Réseaux', icon: Share2 },
] as const

type TabKey = (typeof TABS)[number]['key']

export function ContentPage() {
  usePageSeo({ title: 'Contenu — Bitiko', noindex: true })
  const { data: shop, isLoading: shopLoading } = useMyShop()
  const [tab, setTab] = useState<TabKey>('promos')

  if (shopLoading) return <PageLoader />
  if (!shop) return <ErrorMessage />

  return (
    <div className="pb-24">
      <PageHeader
        title="Contenu"
        subtitle="Promos, avis, FAQ et réseaux : gérés ici, affichés sur ton site via les blocs dans Personnaliser."
        actions={
          <Link to="/admin/personnaliser" className={buttonClass({ variant: 'secondary' })}>
            Placer les blocs
          </Link>
        }
      />
      <div className="mt-6 flex gap-1 overflow-x-auto border-b border-gray-200" role="tablist" aria-label="Contenu du site">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`flex shrink-0 items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === key ? 'border-brand-600 text-brand-700' : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Icon size={15} aria-hidden />
            {label}
          </button>
        ))}
      </div>
      <div className="mt-6" role="tabpanel">
        {tab === 'promos' && <PromosTab shopId={shop.id} />}
        {tab === 'avis' && <TestimonialsTab shopId={shop.id} />}
        {tab === 'faq' && <FaqsTab shopId={shop.id} />}
        {tab === 'reseaux' && <SocialTab shopId={shop.id} />}
      </div>
    </div>
  )
}
