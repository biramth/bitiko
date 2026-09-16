/** Internal-only feature flags. These are compiled out of the Vercel build of
 *  `main` (where the flag is unset), so merchants never see them; on the
 *  `develop` branch they are turned on in the local env. */
export const BUILDER_INTERNAL = import.meta.env.VITE_BUILDER_INTERNAL === 'true'