/** Lien d'évitement « Aller au contenu » : invisible sauf au clavier. */
export function SkipLink() {
  return (
    <a
      href="#contenu"
      className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[70] focus:rounded-lg focus:bg-ink-900 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
    >
      Aller au contenu
    </a>
  )
}
