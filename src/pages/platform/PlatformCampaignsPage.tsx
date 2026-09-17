import { CampaignsTool } from '@/features/platform/CampaignsTool'
import { PageHeader } from '@/components/ui/PageHeader'
import { usePageSeo } from '@/hooks/usePageSeo'

export function PlatformCampaignsPage() {
  usePageSeo({ title: 'Campagnes — Bitiko', noindex: true })
  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-8">
      <PageHeader title="Campagnes" subtitle="Rédige, cible et envoie des emails aux commerçants." />
      <div className="mt-6">
        <CampaignsTool />
      </div>
    </div>
  )
}
