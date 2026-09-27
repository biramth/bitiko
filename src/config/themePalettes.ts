import type { ThemeConfig } from '@/types/builder'

/** Palettes 1-clic : chaque entrée règle l'accent + les couleurs dérivées d'un
 *  coup. Toutes les teintes d'accent sont pré-vérifiées lisibles avec un texte
 *  blanc (contraste ≥ 4.5:1) ; les fonds secondaires sont des teintes douces
 *  qui gardent le texte encre lisible. */

export interface ThemePalette {
  key: string
  label: string
  /** [accent, secondaire] pour la pastille d'aperçu. */
  swatch: [string, string]
  themeColor: string
  patch: Partial<ThemeConfig>
}

export const THEME_PALETTES: ThemePalette[] = [
  {
    key: 'terracotta',
    label: 'Terracotta',
    swatch: ['#c2481c', '#f7e6d0'],
    themeColor: '#c2481c',
    patch: { secondaryColor: '#f7e6d0', backgroundColor: '#ffffff', textColor: '#17152e', buttonColor: '#c2481c', buttonTextColor: '#ffffff' },
  },
  {
    key: 'indigo',
    label: 'Indigo profond',
    swatch: ['#221f45', '#e4e3f2'],
    themeColor: '#221f45',
    patch: { secondaryColor: '#e4e3f2', backgroundColor: '#ffffff', textColor: '#17152e', buttonColor: '#221f45', buttonTextColor: '#ffffff' },
  },
  {
    key: 'sahel',
    label: 'Sahel',
    swatch: ['#8a5a00', '#faf0d7'],
    themeColor: '#8a5a00',
    patch: { secondaryColor: '#faf0d7', backgroundColor: '#fffdf7', textColor: '#231a05', buttonColor: '#8a5a00', buttonTextColor: '#ffffff' },
  },
  {
    key: 'foret',
    label: 'Forêt',
    swatch: ['#1d5c38', '#dcefe2'],
    themeColor: '#1d5c38',
    patch: { secondaryColor: '#dcefe2', backgroundColor: '#ffffff', textColor: '#10231a', buttonColor: '#1d5c38', buttonTextColor: '#ffffff' },
  },
  {
    key: 'ocean',
    label: 'Océan',
    swatch: ['#0f5b7a', '#d8edf5'],
    themeColor: '#0f5b7a',
    patch: { secondaryColor: '#d8edf5', backgroundColor: '#ffffff', textColor: '#0d1f2a', buttonColor: '#0f5b7a', buttonTextColor: '#ffffff' },
  },
  {
    key: 'bissap',
    label: 'Bissap',
    swatch: ['#8e1e4f', '#f9dfe9'],
    themeColor: '#8e1e4f',
    patch: { secondaryColor: '#f9dfe9', backgroundColor: '#ffffff', textColor: '#2a0f1c', buttonColor: '#8e1e4f', buttonTextColor: '#ffffff' },
  },
  {
    key: 'nuit',
    label: 'Nuit (sombre)',
    swatch: ['#f2b705', '#221f45'],
    themeColor: '#b98a04',
    patch: { secondaryColor: '#2c2852', backgroundColor: '#17152e', textColor: '#f5f3ff', buttonColor: '#b98a04', buttonTextColor: '#17152e' },
  },
  {
    key: 'sable',
    label: 'Sable (clair)',
    swatch: ['#5c4a1f', '#f4ecda'],
    themeColor: '#5c4a1f',
    patch: { secondaryColor: '#f4ecda', backgroundColor: '#fffdf7', textColor: '#2a2410', buttonColor: '#5c4a1f', buttonTextColor: '#ffffff' },
  },
]

/** Applique une palette au thème courant en conservant les choix structurels
 *  du marchand (police, arrondis, largeur, boutons secondaires…). */
export function applyPalette(themeConfig: ThemeConfig, palette: ThemePalette): { themeColor: string; themeConfig: ThemeConfig } {
  return {
    themeColor: palette.themeColor,
    themeConfig: {
      ...themeConfig,
      secondaryColor: palette.patch.secondaryColor ?? themeConfig.secondaryColor,
      backgroundColor: palette.patch.backgroundColor ?? themeConfig.backgroundColor,
      textColor: palette.patch.textColor ?? themeConfig.textColor,
      buttonColor: palette.patch.buttonColor ?? themeConfig.buttonColor,
      buttonTextColor: palette.patch.buttonTextColor ?? themeConfig.buttonTextColor,
    },
  }
}
