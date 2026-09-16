import { forwardRef, useState } from 'react'
import { Eye, EyeOff, type LucideIcon } from 'lucide-react'

type PasswordInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  leadingIcon?: LucideIcon
}

/** Password field with a show/hide toggle and optional leading icon. */
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(function PasswordInput(
  { className = '', leadingIcon: Icon, ...props },
  ref,
) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative w-full">
      {Icon && (
        <Icon size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden />
      )}
      <input
        ref={ref}
        type={visible ? 'text' : 'password'}
        className={`${className} pr-10`}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
        aria-pressed={visible}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 transition-colors hover:text-gray-600 focus:outline-none"
        tabIndex={-1}
      >
        {visible ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
      </button>
    </div>
  )
})