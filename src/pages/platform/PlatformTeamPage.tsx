import { TeamTool } from '@/features/platform/TeamTool'
import { PageHeader } from '@/components/ui/PageHeader'
import { usePageSeo } from '@/hooks/usePageSeo'

export function PlatformTeamPage() {
  usePageSeo({ title: 'Équipe — Bitiko', noindex: true })
  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-8">
      <PageHeader title="Équipe" subtitle="Qui a accès à l’espace plateforme, et avec quel rôle." />
      <div className="mt-6">
        <TeamTool />
      </div>
    </div>
  )
}
