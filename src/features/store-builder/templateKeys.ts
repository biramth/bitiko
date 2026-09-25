/** Key-space helpers for the template library: distinguishes a `StoreTemplate`
 *  synthesized from a merchant's own saved theme or a past publish (see
 *  `savedThemeToTemplate`/`historyEntryToTemplate`) from one of the built-in
 *  per-vertical templates — applying one must skip onboarding-profile
 *  personalization and never overwrite the shop's vertical (see
 *  StoreBuilderPage's buildTarget). Kept in its own module so the panel file
 *  only exports components (React fast-refresh rule). */
export const SAVED_THEME_KEY_PREFIX = 'saved:'
export const HISTORY_KEY_PREFIX = 'history:'
export const isSavedThemeKey = (key: string) => key.startsWith(SAVED_THEME_KEY_PREFIX)
export const isRestoredDesignKey = (key: string) => key.startsWith(SAVED_THEME_KEY_PREFIX) || key.startsWith(HISTORY_KEY_PREFIX)
