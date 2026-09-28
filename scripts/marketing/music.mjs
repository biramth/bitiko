// Musique de fond originale (synthétisée, libre de droits) pour la vidéo de démo.
// Usage : node scripts/marketing/music.mjs <durée en secondes> <sortie.wav> [pont sans batterie à N secondes]
// Pop douce à 96 BPM, progression C – G – Am – F : nappe, piano électrique en arpèges, basse, batterie légère.
import { writeFileSync } from 'node:fs'

const duration = Number(process.argv[2] ?? 142)
const out = process.argv[3] ?? 'music.wav'
const RATE = 44100
const BPM = 96
const BEAT = 60 / BPM
const BAR = BEAT * 4
const total = Math.ceil(duration * RATE)
const left = new Float32Array(total)
const right = new Float32Array(total)

const freq = (midi) => 440 * 2 ** ((midi - 69) / 12)
// Accords (notes MIDI) : C, G/B, Am, F.
const CHORDS = [
  { root: 48, notes: [60, 64, 67, 72] },
  { root: 43, notes: [59, 62, 67, 71] },
  { root: 45, notes: [57, 60, 64, 69] },
  { root: 41, notes: [57, 60, 65, 69] },
]

function add(buffer, start, samples) {
  const offset = Math.floor(start * RATE)
  for (let i = 0; i < samples.length && offset + i < total; i += 1) if (offset + i >= 0) buffer[offset + i] += samples[i]
}

function render(seconds, fn) {
  const n = Math.floor(seconds * RATE)
  const data = new Float32Array(n)
  for (let i = 0; i < n; i += 1) data[i] = fn(i / RATE, i)
  return data
}

/** Piano électrique doux : quelques harmoniques qui s'éteignent plus vite que la fondamentale. */
function keys(midi, length, velocity) {
  const f = freq(midi)
  return render(length, (t) => {
    const attack = Math.min(1, t / 0.006) * Math.min(1, (length - t) / 0.06)
    let v = 0
    for (let k = 1; k <= 4; k += 1) v += Math.sin(2 * Math.PI * f * k * t) * Math.exp(-t * (1.6 + k * 1.8)) / (k * k)
    return v * attack * velocity
  })
}

/** Nappe : sinus légèrement désaccordés, attaque et relâche lentes sur toute la mesure. */
function pad(midi, length, detune) {
  const f = freq(midi) * (1 + detune)
  return render(length, (t) => {
    const env = Math.min(1, t / 0.9) * Math.min(1, (length - t) / 0.9)
    const v = Math.sin(2 * Math.PI * f * t) + 0.35 * Math.sin(2 * Math.PI * f * 2 * t + 0.4) + 0.12 * Math.sin(2 * Math.PI * f * 3 * t)
    return v * Math.max(0, env) * 0.05
  })
}

function bass(midi, length) {
  const f = freq(midi)
  return render(length, (t) => {
    const env = Math.min(1, t / 0.01) * Math.exp(-t * 1.4) * Math.min(1, (length - t) / 0.05)
    return (Math.sin(2 * Math.PI * f * t) + 0.25 * Math.sin(2 * Math.PI * f * 2 * t)) * Math.max(0, env) * 0.22
  })
}

function kick() {
  let phase = 0
  return render(0.35, (t) => {
    const f = 45 + 80 * Math.exp(-t * 28)
    phase += (2 * Math.PI * f) / RATE
    return Math.sin(phase) * Math.exp(-t * 9) * Math.min(1, (0.35 - t) / 0.03) * 0.5
  })
}

let seed = 7
const noise = () => {
  seed = (seed * 1103515245 + 12345) % 2147483648
  return seed / 1073741824 - 1
}

function hat(velocity) {
  let last = 0
  return render(0.07, (t) => {
    const n = noise()
    const high = n - last
    last = n
    return high * Math.exp(-t * 70) * velocity
  })
}

function snap() {
  let smooth = 0
  return render(0.18, (t) => {
    smooth += (noise() - smooth) * 0.35
    return (smooth * 0.6 + Math.sin(2 * Math.PI * 190 * t) * 0.4) * Math.exp(-t * 26) * 0.12
  })
}

const bars = Math.ceil(duration / BAR)
const ARP = [0, 1, 2, 3, 2, 1, 2, 3]
// Pont sans batterie (secondes) : respiration au changement de chapitre de la vidéo.
const breakAt = Number(process.argv[4] ?? 0)
const breakBar = breakAt > 0 ? Math.floor(breakAt / BAR) : -1
for (let bar = 0; bar < bars; bar += 1) {
  const chord = CHORDS[bar % CHORDS.length]
  const start = bar * BAR
  const intro = bar < 4
  const outro = bar >= bars - 2
  const breakdown = breakBar >= 0 && bar >= breakBar - 1 && bar <= breakBar
  const drums = bar >= 8 && !outro && !breakdown
  const section = Math.floor(bar / 8)

  for (const note of chord.notes.slice(0, 3)) {
    add(left, start, pad(note, BAR + 0.4, -0.0015))
    add(right, start, pad(note, BAR + 0.4, 0.0015))
  }

  if (!intro) {
    for (let step = 0; step < 8; step += 1) {
      if (outro && step > 3) break
      const note = chord.notes[ARP[step]] + (section % 2 === 1 && step % 4 === 3 ? 12 : 0)
      const velocity = (step % 2 === 0 ? 0.13 : 0.09) * (outro ? 0.7 : 1)
      const sound = keys(note, BEAT * 1.4, velocity)
      const pan = step % 2 === 0 ? 0.65 : 0.35
      const time = start + step * (BEAT / 2)
      add(left, time, sound.map((v) => v * (1 - pan) * 2))
      add(right, time, sound.map((v) => v * pan * 2))
    }
    const b = bass(chord.root, BEAT * 1.9)
    add(left, start, b)
    add(right, start, b)
    const b2 = bass(chord.root + (bar % 2 ? 7 : 12), BEAT * 1.9)
    add(left, start + BEAT * 2, b2)
    add(right, start + BEAT * 2, b2)
  }

  if (drums) {
    for (const beat of [0, 2]) {
      const k = kick()
      add(left, start + beat * BEAT, k)
      add(right, start + beat * BEAT, k)
    }
    for (const beat of [1, 3]) {
      const s = snap()
      add(left, start + beat * BEAT, s)
      add(right, start + beat * BEAT, s)
    }
    for (let eighth = 0; eighth < 8; eighth += 1) {
      const h = hat(eighth % 2 ? 0.035 : 0.02)
      add(left, start + eighth * (BEAT / 2), h.map((v) => v * 0.8))
      add(right, start + eighth * (BEAT / 2), h)
    }
  }
}

// Fondus d'entrée et de sortie.
for (let i = 0; i < total; i += 1) {
  const t = i / RATE
  const fade = Math.min(1, t / 2) * Math.min(1, (duration - t) / 4)
  left[i] *= Math.max(0, fade)
  right[i] *= Math.max(0, fade)
}

let peak = 0
for (let i = 0; i < total; i += 1) peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]))
const gain = 0.89 / (peak || 1)

const data = Buffer.alloc(total * 4)
for (let i = 0; i < total; i += 1) {
  data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, left[i] * gain)) * 32767), i * 4)
  data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, right[i] * gain)) * 32767), i * 4 + 2)
}
const header = Buffer.alloc(44)
header.write('RIFF', 0)
header.writeUInt32LE(36 + data.length, 4)
header.write('WAVE', 8)
header.write('fmt ', 12)
header.writeUInt32LE(16, 16)
header.writeUInt16LE(1, 20)
header.writeUInt16LE(2, 22)
header.writeUInt32LE(RATE, 24)
header.writeUInt32LE(RATE * 4, 28)
header.writeUInt16LE(4, 32)
header.writeUInt16LE(16, 34)
header.write('data', 36)
header.writeUInt32LE(data.length, 40)
writeFileSync(out, Buffer.concat([header, data]))
console.log('✓ musique', out, duration.toFixed(1), 's')
