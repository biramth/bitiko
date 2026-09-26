import { categoryLabel, paymentMethodLabel } from './categories'
import type { Bilan, FinanceEntry } from './bilan'

/** Séparateur « ; » et BOM UTF-8 : Excel (réglages français) ouvre le fichier directement,
 *  accents compris, sans assistant d'import. */
const SEPARATOR = ';'
const BOM = '﻿'

function cell(value: string | number | null | undefined): string {
  const text = value === null || value === undefined ? '' : String(value)
  // Neutralise l'injection de formules (=, +, -, @ en tête) sans altérer les nombres négatifs.
  const safe = /^[=+@]/.test(text) || (/^-/.test(text) && Number.isNaN(Number(text))) ? `'${text}` : text
  return /[";\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

function line(cells: (string | number | null | undefined)[]): string {
  return cells.map(cell).join(SEPARATOR)
}

/** 2026-09-05 → 05/09/2026 */
export function frenchDate(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split('-')
  return `${day}/${month}/${year}`
}

/** Journal complet : une ligne par dépense ou recette saisie. */
export function buildEntriesCsv(entries: FinanceEntry[]): string {
  const rows = [
    line(['Date', 'Type', 'Catégorie', 'Libellé', 'Montant', 'Mode de paiement', 'Note']),
    ...[...entries]
      .sort((a, b) => a.entry_date.localeCompare(b.entry_date))
      .map((e) =>
        line([
          frenchDate(e.entry_date),
          e.kind === 'income' ? 'Recette' : 'Dépense',
          categoryLabel(e.category),
          e.label,
          e.kind === 'income' ? e.amount : -e.amount,
          paymentMethodLabel(e.payment_method),
          e.note,
        ]),
      ),
  ]
  return BOM + rows.join('\r\n') + '\r\n'
}

/** Bilan de la période : en-tête, totaux, détail des recettes et des dépenses, mois par mois. */
export function buildBilanCsv(input: { shopName: string; periodLabel: string; currency: string; bilan: Bilan }): string {
  const { shopName, periodLabel, currency, bilan } = input
  const rows: string[] = [
    line(['Bilan simple', shopName]),
    line(['Période', periodLabel]),
    line(['Devise', currency]),
    '',
    line(['RÉSUMÉ', 'Montant']),
    line(['Recettes', bilan.totals.revenue]),
    line(['Dépenses', bilan.totals.expenses]),
    line([bilan.totals.result >= 0 ? 'Bénéfice' : 'Perte', bilan.totals.result]),
    line(['Marge (%)', bilan.totals.margin ?? '']),
    '',
    line(['RECETTES', 'Montant', 'Nombre']),
    line(['Ventes en ligne (commandes payées ou livrées)', bilan.revenueBySource.orders.amount, bilan.revenueBySource.orders.count]),
    line(['Prestations terminées', bilan.revenueBySource.appointments.amount, bilan.revenueBySource.appointments.count]),
    line(['Recettes saisies à la main', bilan.revenueBySource.manual.amount, bilan.revenueBySource.manual.count]),
    '',
    line(['DÉPENSES PAR CATÉGORIE', 'Montant', 'Part (%)']),
    ...bilan.expensesByCategory.map((c) => line([c.label, c.amount, c.share])),
    '',
    line(['MOIS PAR MOIS', 'Recettes', 'Dépenses', 'Résultat']),
    ...bilan.months.map((m) => line([m.month.slice(0, 7), m.revenue, m.expenses, m.result])),
  ]
  return BOM + rows.join('\r\n') + '\r\n'
}

/** Déclenche le téléchargement d'un fichier texte depuis le navigateur. */
export function downloadTextFile(filename: string, content: string, mime = 'text/csv;charset=utf-8'): void {
  const url = URL.createObjectURL(new Blob([content], { type: mime }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Nom de fichier propre : « bilan-mon-salon-2026-09.csv ». */
export function exportFilename(prefix: string, shopName: string, periodKey: string, extension = 'csv'): string {
  const slug = shopName
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
  return `${prefix}-${slug || 'boutique'}-${periodKey}.${extension}`
}
