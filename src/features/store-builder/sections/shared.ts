export const editorInputClass =
  'mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-400 focus:outline-none'

export const editorLabelClass = 'block text-sm font-medium text-gray-700'

export interface SectionEditorProps<TConfig> {
  config: TConfig
  onChange: (config: TConfig) => void
  shopId: string
  sectionId: string
}
