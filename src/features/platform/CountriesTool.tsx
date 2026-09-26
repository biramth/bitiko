import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Globe, Lock } from 'lucide-react'
import { listCountries, listCurrencies } from '@/services/country.service'
import { setCountryEnabled } from '@/services/platform.service'
import { can } from '@/features/platform/permissions'
import { usePlatformRole } from '@/features/platform/usePlatformRole'
import { Spinner } from '@/components/ui/Spinner'

/**
 * The super-admin "Pays" tool: which countries merchants can pick when they
 * onboard or change their settings, each with its dialling rules and currency.
 * Opening/closing a country is a one-click toggle; Sénégal is the home market
 * and is deliberately locked on. The write goes through
 * api/admin/platform.ts?action=country-set (owner/admin only).
 */
export function CountriesTool() {
  const queryClient = useQueryClient()
  const { data: role } = usePlatformRole()

  const { data: countries = [], isLoading, isError, error } = useQuery({
    queryKey: ['countries-all'],
    queryFn: listCountries,
    retry: false,
  })
  const { data: currencies = [] } = useQuery({
    queryKey: ['currencies'],
    queryFn: listCurrencies,
    retry: false,
  })

  const toggle = useMutation({
    mutationFn: ({ code, enabled }: { code: string; enabled: boolean }) => setCountryEnabled(code, enabled),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['countries-all'] }),
  })

  const symbolFor = (code: string) => currencies.find((c) => c.code === code)?.symbol ?? code

  if (isLoading) return <Spinner />
  if (isError) return <p className="text-sm text-red-600">{error instanceof Error ? error.message : 'Erreur.'}</p>

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <Globe size={16} aria-hidden /> Où Bitiko ouvre des boutiques
        </h3>
        <p className="mt-1 text-xs text-gray-500">
          Un pays désactivé n&apos;est plus proposé aux commerçants (les boutiques déjà créées continuent de
          fonctionner). Sénégal reste toujours activé.
        </p>
        {toggle.isError && <p className="mt-2 text-sm text-red-600">{(toggle.error as Error).message}</p>}
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-100 text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">Pays</th>
              <th className="px-4 py-3 font-medium">Indicatif</th>
              <th className="px-4 py-3 font-medium">Format national</th>
              <th className="px-4 py-3 font-medium">Devise</th>
              <th className="px-4 py-3 font-medium">Statut</th>
              <th className="px-4 py-3 text-right" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {countries.map((country) => (
              <tr key={country.code}>
                <td className="px-4 py-3">
                  <span className="font-medium text-gray-900">{country.name}</span>
                  <span className="ml-2 text-xs text-gray-400">{country.code}</span>
                </td>
                <td className="px-4 py-3 font-mono text-gray-600">{country.dial_code}</td>
                <td className="px-4 py-3 text-gray-600">
                  {country.trunk_prefix} + {country.national_number_length} chiffres
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {symbolFor(country.currency_code)} <span className="text-gray-400">({country.currency_code})</span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      country.is_enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {country.is_enabled ? 'Activé' : 'Désactivé'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {country.code === 'SN' ? (
                    <span
                      className="inline-flex items-center gap-1.5 text-xs text-gray-400"
                      title="Le Sénégal reste toujours activé."
                    >
                      <Lock size={13} aria-hidden /> Verrouillé
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggle.mutate({ code: country.code, enabled: !country.is_enabled })}
                      disabled={toggle.isPending || !can(role, 'manage_countries')}
                      className={`inline-flex rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-60 ${
                        country.is_enabled
                          ? 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                          : 'bg-brand-600 text-white hover:bg-brand-700'
                      }`}
                    >
                      {country.is_enabled ? 'Désactiver' : 'Activer'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}