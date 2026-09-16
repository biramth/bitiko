import { Component, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { reportError } from '@/lib/analytics'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: unknown) {
    reportError(error, 'ErrorBoundary')
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
          <AlertTriangle size={36} className="text-red-400" aria-hidden />
          <h1 className="text-lg font-semibold text-gray-900">Une erreur est survenue</h1>
          <p className="max-w-sm text-sm text-gray-500">
            Quelque chose s'est mal passé. Recharge la page — si le problème persiste, réessaie
            plus tard.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Recharger
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
