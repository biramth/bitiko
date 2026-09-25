import { Users, Star, MapPin, Phone, Mail, Clock } from 'lucide-react'
import { useTeamMembers } from '@/features/team/useTeamMembers'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import type { Shop } from '@/types'
import type { TeamSectionConfig, ThemeConfig } from '@/types/builder'
import { SECTION_HEADING_SCALE } from '@/config/themeTokens'
import { editorHelpClass, editorInputClass, editorLabelClass, type SectionEditorProps } from './shared'
import { resolveTextStyle } from '@/config/textStyle'
import { useInlineEdit } from '../inline/useInlineEdit'
import { InlineText } from '../inline/InlineText'
import { InlineStyleToolbar } from '../inline/InlineStyleToolbar'
import { TextStyleField } from '../components/TextStyleControls'

const LAYOUTS = [
  { value: 'grid', label: 'Grille', preview: <div className="grid grid-cols-2 gap-1"><div className="h-6 w-full bg-gray-200 rounded" /><div className="h-6 w-full bg-gray-200 rounded" /><div className="h-6 w-full bg-gray-200 rounded" /><div className="h-6 w-full bg-gray-200 rounded" /></div> },
  { value: 'list', label: 'Liste', preview: <div className="space-y-1"><div className="h-4 w-3/4 bg-gray-200 rounded" /><div className="h-4 w-3/4 bg-gray-200 rounded" /><div className="h-4 w-3/4 bg-gray-200 rounded" /></div> },
  { value: 'carousel', label: 'Carrousel', preview: <div className="flex gap-1"><div className="h-6 w-1/3 bg-gray-200 rounded" /><div className="h-6 w-1/3 bg-gray-200 rounded" /><div className="h-6 w-1/3 bg-gray-200 rounded opacity-50" /></div> },
] as const

type TeamLayout = 'grid' | 'list' | 'carousel'

export function TeamRenderer({
  shop,
  config,
  themeConfig,
  sectionId,
  editable = false,
}: { shop: Shop; config: TeamSectionConfig; themeConfig: ThemeConfig; sectionId?: string; editable?: boolean }) {
  const patch = useInlineEdit(sectionId)
  const { data: team, isLoading, isError } = useTeamMembers(shop.id)

  if (isLoading) return <Spinner />
  if (isError) return <div className="text-center py-8 text-red-600">Erreur de chargement de l'équipe</div>
  if (!team || team.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="Aucun membre d'équipe"
        description="Ajoutez des membres dans l'onglet Équipe pour les afficher ici."
      />
    )
  }

  return (
    <section className="mx-auto max-w-[var(--shop-content-width)] px-4 py-10 sm:px-6 sm:py-14">
      <div className="mb-8 flex items-end justify-between border-b border-ink-900/10 pb-4">
        <h2 className={`font-heading font-bold text-[var(--shop-text)] ${SECTION_HEADING_SCALE[themeConfig.textScale]}`}>
          {config.heading || 'Notre équipe'}
        </h2>
      </div>

      {config.layout === 'grid' && (
        <div className="grid grid-cols-1 gap-x-4 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {team.map((member) => (
            <TeamCard key={member.id} member={member} themeConfig={themeConfig} />
          ))}
        </div>
      )}

      {config.layout === 'list' && (
        <div className="space-y-4">
          {team.map((member) => (
            <TeamListItem key={member.id} member={member} themeConfig={themeConfig} />
          ))}
        </div>
      )}

      {config.layout === 'carousel' && (
        <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 [scrollbar-width:thin]">
          {team.map((member) => (
            <div key={member.id} className="w-[80%] shrink-0 snap-start sm:w-[60%] lg:w-[40%]">
              <TeamCard member={member} themeConfig={themeConfig} />
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function TeamCard({ member, themeConfig }: { member: any; themeConfig: ThemeConfig }) {
  return (
    <article className="group bg-[var(--shop-surface)] rounded-2xl border border-[var(--shop-border)] overflow-hidden transition-shadow hover:shadow-xl">
      {member.avatarUrl && (
        <div className="aspect-square relative overflow-hidden">
          <img
            src={member.avatarUrl}
            alt={member.name}
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
          />
        </div>
      )}
      <div className="p-4">
        <h3 className="font-heading font-semibold text-[var(--shop-text)]">{member.name}</h3>
        {member.role && <p className="mt-1 text-sm text-[var(--shop-text)]/60">{member.role}</p>}
        {member.specialty && <p className="mt-1 text-sm text-brand-600">{member.specialty}</p>}
        <div className="mt-3 flex items-center gap-4 text-xs text-[var(--shop-text)]/60">
          {member.phone && (
            <span className="flex items-center gap-1">
              <Phone size={12} />
              {member.phone}
            </span>
          )}
          {member.email && (
            <span className="flex items-center gap-1">
              <Mail size={12} />
              {member.email}
            </span>
          )}
        </div>
        {member.rating && (
          <div className="mt-3 flex items-center gap-1">
            <Star className="h-4 w-4 text-amber-500 fill-current" />
            <span className="text-sm font-medium text-[var(--shop-text)]">{member.rating.toFixed(1)}</span>
          </div>
        )}
      </div>
    </article>
  )
}

function TeamListItem({ member, themeConfig }: { member: any; themeConfig: ThemeConfig }) {
  return (
    <article className="flex items-center gap-4 p-4 rounded-xl border border-[var(--shop-border)] bg-[var(--shop-surface)] group hover:shadow-md">
      <div className="h-16 w-16 shrink-0 rounded-full bg-brand-100 overflow-hidden">
        {member.avatarUrl ? (
          <img src={member.avatarUrl} alt={member.name} className="w-full h-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Users className="h-8 w-8 text-brand-600" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-[var(--shop-text)] truncate">{member.name}</h3>
        {member.role && <p className="text-sm text-[var(--shop-text)]/60">{member.role}</p>}
        {member.specialty && <p className="text-sm text-brand-600">{member.specialty}</p>}
      </div>
      <div className="text-right text-sm text-[var(--shop-text)]/60">
        {member.rating && (
          <div className="flex items-center gap-1 justify-end">
            <Star className="h-4 w-4 text-amber-500 fill-current" />
            {member.rating.toFixed(1)}
          </div>
        )}
      </div>
    </article>
  )
}

export function TeamEditor({ config, onChange }: SectionEditorProps<TeamSectionConfig>) {
  return (
    <div className="space-y-4">
      <div>
        <label className={editorLabelClass}>Titre</label>
        <input value={config.heading} onChange={(e) => onChange({ ...config, heading: e.target.value })} className={editorInputClass} />
        <p className={`mt-1 ${editorHelpClass}`}>Vide = « Notre équipe ».</p>
        <TextStyleField value={config.headingStyle} onChange={(headingStyle) => onChange({ ...config, headingStyle })} />
      </div>
      <div>
        <label className={editorLabelClass}>Disposition</label>
        <div className="mt-1">
          <VisualPicker
            columns={3}
            value={config.layout}
            onChange={(layout) => onChange({ ...config, layout })}
            options={LAYOUTS}
          />
        </div>
      </div>
    </div>
  )
}