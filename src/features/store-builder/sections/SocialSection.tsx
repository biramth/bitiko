import { Link2, Plus, Trash2 } from 'lucide-react'
import { createSectionId } from '@/config/defaultLayout'
import { sectionHeadingClass } from '@/config/themeTokens'
import type { Shop } from '@/types'
import type { SocialSectionConfig, ThemeConfig } from '@/types/builder'
import { editorHelpClass, editorInputClass, editorLabelClass, type SectionEditorProps } from './shared'
import { resolveTextStyle } from '@/config/textStyle'
import { useInlineEdit } from '../inline/useInlineEdit'
import { InlineText } from '../inline/InlineText'
import { InlineStyleToolbar } from '../inline/InlineStyleToolbar'
import { TextStyleField } from '../components/TextStyleControls'
import { VisualPicker } from '../components/VisualPicker'
import { SwatchBlock, SwatchFrame } from '../components/LayoutSwatch'
import { useActiveShopSocialPosts } from '@/features/cms/useCmsContent'
import { socialEmbedSrc, type SocialEmbed } from './socialEmbeds'

const EMBED_FRAME_CLASS: Record<SocialEmbed['platform'], string> = {
  youtube: 'aspect-video w-full',
  tiktok: 'aspect-[9/16] max-h-[580px] w-full',
  instagram: 'aspect-[4/5] min-h-[420px] w-full',
  facebook: 'h-[520px] w-full',
}

const PLATFORM_LABEL: Record<SocialEmbed['platform'], string> = {
  tiktok: 'TikTok',
  instagram: 'Instagram',
  facebook: 'Facebook',
  youtube: 'YouTube',
}

export function SocialRenderer({
  shop,
  config,
  themeConfig,
  sectionId,
  editable = false,
}: {
  shop?: Shop | null
  config: SocialSectionConfig
  themeConfig: ThemeConfig
  sectionId?: string
  editable?: boolean
}) {
  const patch = useInlineEdit(sectionId)
  const cmsMode = config.source === 'cms'
  const { data: cmsPosts, isLoading: cmsLoading } = useActiveShopSocialPosts(cmsMode ? shop?.id : undefined)
  if (cmsMode && cmsLoading) return null
  const urls = cmsMode ? (cmsPosts ?? []).map((p) => p.url) : config.items.map((item) => item.url)
  const embeds = urls.flatMap((url, index) => {
    const embed = socialEmbedSrc(url)
    return embed ? [{ key: cmsMode ? `${index}-${url}` : config.items[index]?.id ?? String(index), embed }] : []
  })
  // Rien d'imposé : sans URL valide, le bloc s'efface côté visiteur (même
  // convention que Témoignages et FAQ — c'est au commerçant d'ajouter ses
  // publications, ici ou dans la page Contenu).
  if (embeds.length === 0 && !editable) return null

  return (
    <section className="mx-auto max-w-[var(--shop-content-width)] px-4 py-10 sm:px-6 sm:py-14">
      {(config.heading.trim() || editable) && (
        <InlineStyleToolbar editable={editable} style={config.headingStyle} onCommit={(headingStyle) => patch({ headingStyle })} label="Style du titre">
          <InlineText
            as="h2"
            editable={editable}
            value={config.heading}
            onCommit={(heading) => patch({ heading })}
            placeholder="Sur les réseaux"
            className={`text-center font-heading font-bold text-[var(--shop-text)] ${sectionHeadingClass(themeConfig)}`}
            style={resolveTextStyle(config.headingStyle)}
            label="Titre"
          />
        </InlineStyleToolbar>
      )}
      {embeds.length === 0 ? (
        <p className="mx-auto mt-6 max-w-md rounded-xl border border-dashed border-[var(--shop-text)]/20 px-4 py-8 text-center text-sm text-[var(--shop-text)]/55">
          {cmsMode
            ? 'Aucune publication : ajoute-les dans Contenu → Réseaux.'
            : 'Collez les liens de vos publications TikTok, Instagram, Facebook ou YouTube dans la barre latérale : elles apparaîtront ici.'}
        </p>
      ) : (config.layout ?? 'grid') === 'carousel' ? (
        <div className="mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [scrollbar-width:thin]">
          {embeds.map(({ key, embed }) => (
            <div key={key} className="w-[85%] shrink-0 snap-start min-[480px]:w-[46%] lg:w-[31%]">
              <SocialFrame embed={embed} />
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 items-start gap-4 min-[480px]:grid-cols-2 lg:grid-cols-3">
          {embeds.map(({ key, embed }) => (
            <SocialFrame key={key} embed={embed} />
          ))}
        </div>
      )}
    </section>
  )
}

function SocialFrame({ embed }: { embed: SocialEmbed }) {
  return (
    <iframe
      src={embed.embedUrl}
      title={`Publication ${PLATFORM_LABEL[embed.platform]}`}
      loading="lazy"
      referrerPolicy="strict-origin-when-cross-origin"
      sandbox="allow-scripts allow-same-origin allow-popups allow-presentation"
      allow="encrypted-media; picture-in-picture"
      className={`border-0 ${EMBED_FRAME_CLASS[embed.platform]}`}
      style={{ borderRadius: 'var(--shop-radius)' }}
    />
  )
}

const SOCIAL_LAYOUTS = [
  {
    value: 'grid' as const,
    label: 'Grille',
    preview: (
      <SwatchFrame className="flex-wrap content-between gap-1">
        {Array.from({ length: 6 }, (_, i) => <SwatchBlock key={i} className="h-[45%] w-[30%]" />)}
      </SwatchFrame>
    ),
  },
  {
    value: 'carousel' as const,
    label: 'Carrousel',
    preview: (
      <SwatchFrame className="items-center gap-1">
        <SwatchBlock className="h-3/4 w-1/3" />
        <SwatchBlock className="h-3/4 w-1/3" />
        <SwatchBlock className="h-3/4 w-1/3 opacity-50" />
      </SwatchFrame>
    ),
  },
]

export function SocialEditor({ config, onChange }: SectionEditorProps<SocialSectionConfig>) {
  return (
    <div className="space-y-4">
      <div>
        <label className={editorLabelClass}>Contenu</label>
        <select
          value={config.source ?? 'manual'}
          onChange={(e) => onChange({ ...config, source: e.target.value as 'manual' | 'cms' })}
          className={editorInputClass}
        >
          <option value="manual">Collées ici (manuel)</option>
          <option value="cms">Depuis la page Contenu (CMS)</option>
        </select>
        <p className={`mt-1 ${editorHelpClass}`}>Le CMS centralise tes publications — le bloc ne fait que les afficher.</p>
      </div>
      {config.source === 'cms' ? (
        <p className={editorHelpClass}>Ce bloc affiche tes publications actives, dans ton ordre. Gère-les dans Contenu → Réseaux.</p>
      ) : (
      <>
      <div>
        <label className={editorLabelClass}>Titre</label>
        <input value={config.heading} onChange={(e) => onChange({ ...config, heading: e.target.value })} placeholder="Sur les réseaux" className={editorInputClass} />
        <p className={`mt-1 ${editorHelpClass}`}>Vide = pas de titre au-dessus des publications.</p>
        <TextStyleField value={config.headingStyle} onChange={(headingStyle) => onChange({ ...config, headingStyle })} />
      </div>
      <div>
        <label className={editorLabelClass}>Disposition</label>
        <div className="mt-1">
          <VisualPicker
            columns={2}
            value={config.layout ?? 'grid'}
            onChange={(layout) => onChange({ ...config, layout })}
            options={SOCIAL_LAYOUTS}
          />
        </div>
      </div>
      <div className="space-y-2">
        <span className={editorLabelClass}>Publications ({config.items.length}/6)</span>
        {config.items.map((item, index) => {
          const embed = socialEmbedSrc(item.url)
          return (
            <div key={item.id} className="space-y-1.5 rounded-lg border border-gray-200 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className={`inline-flex items-center gap-1 text-xs font-semibold ${embed ? 'text-gray-600' : item.url.trim() ? 'text-red-600' : 'text-gray-400'}`}>
                  <Link2 size={12} aria-hidden />
                  {embed ? PLATFORM_LABEL[embed.platform] : item.url.trim() ? 'Lien non reconnu' : 'Nouveau lien'}
                </span>
                <button
                  type="button"
                  onClick={() => onChange({ ...config, items: config.items.filter((_, i) => i !== index) })}
                  aria-label={`Supprimer la publication ${index + 1}`}
                  className="rounded p-1 text-gray-400 hover:text-red-600"
                >
                  <Trash2 size={14} aria-hidden />
                </button>
              </div>
              <input
                value={item.url}
                onChange={(e) => onChange({ ...config, items: config.items.map((it, i) => (i === index ? { ...it, url: e.target.value } : it)) })}
                placeholder="https://www.tiktok.com/@…/video/…"
                inputMode="url"
                className={editorInputClass}
              />
            </div>
          )
        })}
        {config.items.length < 6 && (
          <button
            type="button"
            onClick={() => onChange({ ...config, items: [...config.items, { id: createSectionId('social-embed'), url: '' }] })}
            className="flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:text-brand-800"
          >
            <Plus size={15} aria-hidden /> Ajouter une publication
          </button>
        )}
        <p className={editorHelpClass}>TikTok, Instagram, Facebook, YouTube : collez l’URL de la publication (pas d’un profil). Les liens non reconnus ne s’affichent pas sur la boutique.</p>
      </div>
      </>
      )}
    </div>
  )
}
