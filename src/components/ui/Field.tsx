import { forwardRef, useId } from 'react'
import { controlClass } from '@/components/ui/styles'

interface FieldProps {
  label: string
  hint?: string
  error?: string | null
  required?: boolean
  className?: string
  children: (props: { id: string; invalid: boolean; describedBy?: string }) => React.ReactNode
}

/** Étiquette + contrôle + aide/erreur, avec `htmlFor` et `aria-describedby` câblés. */
export function Field({ label, hint, error, required, className = '', children }: FieldProps) {
  const id = useId()
  const messageId = `${id}-msg`
  const message = error || hint
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700">
        {label}
        {required && (
          <span className="ml-0.5 text-red-500" aria-hidden>
            *
          </span>
        )}
      </label>
      <div className="mt-1">
        {children({ id, invalid: !!error, describedBy: message ? messageId : undefined })}
      </div>
      {message && (
        <p id={messageId} role={error ? 'alert' : undefined} className={`mt-1 text-xs ${error ? 'text-red-600' : 'text-gray-500'}`}>
          {message}
        </p>
      )}
    </div>
  )
}

type ControlProps = { label: string; hint?: string; error?: string | null; wrapperClassName?: string }

export const TextField = forwardRef<HTMLInputElement, ControlProps & React.InputHTMLAttributes<HTMLInputElement>>(
  function TextField({ label, hint, error, wrapperClassName, className = '', required, ...rest }, ref) {
    return (
      <Field label={label} hint={hint} error={error} required={required} className={wrapperClassName}>
        {({ id, invalid, describedBy }) => (
          <input
            ref={ref}
            id={id}
            required={required}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            className={`${controlClass(invalid)} ${className}`}
            {...rest}
          />
        )}
      </Field>
    )
  },
)

export const TextAreaField = forwardRef<
  HTMLTextAreaElement,
  ControlProps & React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function TextAreaField({ label, hint, error, wrapperClassName, className = '', required, rows = 3, ...rest }, ref) {
  return (
    <Field label={label} hint={hint} error={error} required={required} className={wrapperClassName}>
      {({ id, invalid, describedBy }) => (
        <textarea
          ref={ref}
          id={id}
          rows={rows}
          required={required}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className={`${controlClass(invalid)} ${className}`}
          {...rest}
        />
      )}
    </Field>
  )
})

export const SelectField = forwardRef<HTMLSelectElement, ControlProps & React.SelectHTMLAttributes<HTMLSelectElement>>(
  function SelectField({ label, hint, error, wrapperClassName, className = '', required, children, ...rest }, ref) {
    return (
      <Field label={label} hint={hint} error={error} required={required} className={wrapperClassName}>
        {({ id, invalid, describedBy }) => (
          <select
            ref={ref}
            id={id}
            required={required}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            className={`${controlClass(invalid)} ${className}`}
            {...rest}
          >
            {children}
          </select>
        )}
      </Field>
    )
  },
)
