import { useRef, useState } from 'react'
import Papa from 'papaparse'
import { AlertTriangle, Check, Download, Loader2, Upload, X } from 'lucide-react'
import { bulkCreateProducts, type BulkProductRow } from '@/services/product.service'
import type { Category } from '@/types'

const TEMPLATE_HEADERS = ['nom', 'description', 'prix', 'stock', 'categorie']
const TEMPLATE_EXAMPLE = ['Robe en wax', 'Description du produit', '18000', '10', 'Vêtements']

interface ParsedRow {
  raw: Record<string, string>
  row: BulkProductRow | null
  error: string | null
  categoryWarning: string | null
}

function downloadTemplate() {
  const csv = [TEMPLATE_HEADERS.join(','), TEMPLATE_EXAMPLE.join(',')].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'modele-produits-bitiko.csv'
  link.click()
  URL.revokeObjectURL(url)
}

function parseRow(raw: Record<string, string>, categories: Category[]): ParsedRow {
  const name = (raw.nom ?? '').trim()
  const priceRaw = (raw.prix ?? '').trim().replace(',', '.')
  const stockRaw = (raw.stock ?? '').trim()
  const categoryName = (raw.categorie ?? '').trim()

  if (!name) return { raw, row: null, error: 'Nom manquant', categoryWarning: null }

  const price = Number(priceRaw)
  if (priceRaw === '' || Number.isNaN(price) || price < 0) {
    return { raw, row: null, error: 'Prix invalide', categoryWarning: null }
  }

  const stock = stockRaw === '' ? 0 : Number(stockRaw)
  if (Number.isNaN(stock) || stock < 0) {
    return { raw, row: null, error: 'Stock invalide', categoryWarning: null }
  }

  const categoryExists = categoryName
    ? categories.some((c) => c.name.trim().toLowerCase() === categoryName.toLowerCase())
    : true

  return {
    raw,
    row: {
      name,
      description: (raw.description ?? '').trim() || null,
      price,
      stock,
      categoryName: categoryName || null,
    },
    error: null,
    categoryWarning: categoryName && !categoryExists ? `Catégorie « ${categoryName} » introuvable — ignorée` : null,
  }
}

export function ProductImportDialog({
  open,
  onClose,
  shopId,
  categories,
  maxActiveProducts,
  onImported,
}: {
  open: boolean
  onClose: () => void
  shopId: string
  categories: Category[]
  maxActiveProducts: number | null
  onImported: () => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<ParsedRow[] | null>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ created: number; inactive: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const reset = () => {
    setRows(null)
    setResult(null)
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setResult(null)
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase(),
      complete: (results) => {
        if (results.data.length === 0) {
          setError('Le fichier ne contient aucune ligne.')
          return
        }
        setRows(results.data.map((raw) => parseRow(raw, categories)))
      },
      error: () => setError('Impossible de lire ce fichier CSV.'),
    })
  }

  const validRows = (rows ?? []).filter((r) => r.row !== null)
  const invalidCount = (rows ?? []).length - validRows.length

  const handleImport = async () => {
    if (validRows.length === 0) return
    setImporting(true)
    setError(null)
    try {
      const outcome = await bulkCreateProducts(
        shopId,
        validRows.map((r) => r.row as BulkProductRow),
        categories,
        maxActiveProducts,
      )
      setResult(outcome)
      onImported()
    } catch {
      setError("L'import a échoué. Vérifiez le fichier et réessayez.")
    } finally {
      setImporting(false)
    }
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={handleClose}>
      <div
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-heading text-lg font-bold text-gray-900">Importer des produits (CSV)</h2>
          <button type="button" onClick={handleClose} aria-label="Fermer" className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        {result ? (
          <div className="text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <Check size={26} aria-hidden />
            </span>
            <p className="mt-3 text-sm text-gray-700">
              {result.created} produit{result.created > 1 ? 's' : ''} importé{result.created > 1 ? 's' : ''}.
              {result.inactive > 0 && (
                <>
                  {' '}
                  {result.inactive} enregistré{result.inactive > 1 ? 's' : ''} inactif{result.inactive > 1 ? 's' : ''} (limite de produits actifs du plan gratuit atteinte).
                </>
              )}
            </p>
            <button
              type="button"
              onClick={handleClose}
              className="mt-4 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
            >
              Fermer
            </button>
          </div>
        ) : !rows ? (
          <div>
            <p className="text-sm text-gray-500">
              Colonnes attendues : <code className="font-mono text-xs">nom, description, prix, stock, categorie</code>{' '}
              (description et categorie optionnelles — la catégorie doit correspondre exactement au nom d'une catégorie existante).
            </p>
            <button
              type="button"
              onClick={downloadTemplate}
              className="mt-3 flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:text-brand-800"
            >
              <Download size={14} /> Télécharger un modèle
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-4 flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 py-10 text-gray-400 transition-colors hover:border-brand-300 hover:text-brand-600"
            >
              <Upload size={24} />
              <span className="text-sm font-medium">Choisir un fichier CSV</span>
            </button>
            <input ref={fileInputRef} type="file" accept=".csv,text/csv" onChange={handleFile} className="hidden" />

            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          </div>
        ) : (
          <div>
            <p className="text-sm text-gray-600">
              {validRows.length} ligne{validRows.length > 1 ? 's' : ''} prête{validRows.length > 1 ? 's' : ''} à importer
              {invalidCount > 0 && `, ${invalidCount} ignorée${invalidCount > 1 ? 's' : ''} (erreur)`}.
            </p>
            <div className="mt-3 max-h-72 space-y-1.5 overflow-y-auto rounded-lg border border-gray-200 p-2">
              {rows.map((r, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-2 rounded-lg px-2 py-1.5 text-xs ${
                    r.error ? 'bg-red-50 text-red-700' : r.categoryWarning ? 'bg-amber-50 text-amber-700' : 'bg-gray-50 text-gray-700'
                  }`}
                >
                  {r.error ? (
                    <AlertTriangle size={13} className="mt-0.5 shrink-0" aria-hidden />
                  ) : (
                    <Check size={13} className="mt-0.5 shrink-0 text-emerald-600" aria-hidden />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="font-medium">{r.raw.nom || '(sans nom)'}</span>
                    {r.error && <span> — {r.error}</span>}
                    {r.categoryWarning && <span> — {r.categoryWarning}</span>}
                  </span>
                </div>
              ))}
            </div>

            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={reset}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Choisir un autre fichier
              </button>
              <button
                type="button"
                onClick={handleImport}
                disabled={importing || validRows.length === 0}
                className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
              >
                {importing && <Loader2 size={14} className="animate-spin" />}
                Importer {validRows.length} produit{validRows.length > 1 ? 's' : ''}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
