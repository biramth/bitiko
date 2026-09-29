/** Petit carillon (Web Audio, sans fichier) joué à l'arrivée d'une commande ou d'une demande. */

let context: AudioContext | null = null

function audioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Ctor = window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  context ??= new Ctor()
  return context
}

/** Les navigateurs n'autorisent le son qu'après une interaction : à appeler depuis un clic ou une touche. */
export function unlockChime(): void {
  try {
    const ctx = audioContext()
    if (ctx?.state === 'suspended') void ctx.resume()
  } catch {
    // Audio indisponible : l'alerte visuelle suffit.
  }
}

export function playChime(): void {
  try {
    const ctx = audioContext()
    if (!ctx || ctx.state !== 'running') return
    const now = ctx.currentTime
    ;[880, 1318.5].forEach((frequency, index) => {
      const start = now + index * 0.16
      const oscillator = ctx.createOscillator()
      const gain = ctx.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.value = frequency
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(0.25, start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.45)
      oscillator.connect(gain).connect(ctx.destination)
      oscillator.start(start)
      oscillator.stop(start + 0.5)
    })
  } catch {
    // Audio indisponible : l'alerte visuelle suffit.
  }
}
