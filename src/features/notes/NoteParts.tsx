import type { NoteColor } from '@/services/notes.service'
import { NOTE_COLORS } from './notes'

export function ColorPicker({ value, onChange }: { value: NoteColor; onChange: (color: NoteColor) => void }) {
  return (
    <div role="radiogroup" aria-label="Couleur de la note" className="flex items-center gap-1.5">
      {NOTE_COLORS.map((c) => (
        <button
          key={c.code}
          type="button"
          role="radio"
          aria-checked={value === c.code}
          aria-label={c.label}
          title={c.label}
          onClick={() => onChange(c.code)}
          className={`h-6 w-6 rounded-full ring-1 transition-transform ${c.swatch} ${value === c.code ? 'scale-110 outline outline-2 outline-offset-2 outline-ink-900' : 'hover:scale-110'}`}
        />
      ))}
    </div>
  )
}
