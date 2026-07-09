// Liten, responsiv SVG-tangentrad for oppslagsverkets demoer. I motsetning til
// den store Keyboard.tsx (fast px, 160px høy — for stor i et lite kort) skalerer
// denne med `w-full` via viewBox, og er ren SVG uten hooks (SSR-trygg; den
// rendres uansett bare inne i den client-only DemoBlock).
//
// To måter å lyse opp tangenter på:
//   • `pitches` alene → alle tonene i grepet lyser (statisk keyboard-demo).
//   • `pitches` + `active` → `pitches` er den faste rekkevidden/formen, mens bare
//     tonene i `active` lyser fullt (progresjon: tangentene «følger» aktiv akkord
//     mens resten av formen ligger svakt igjen).
// Grunntonen (tone-klasse == `root`) males amber, øvrige lyste toner sea — samme
// hånd/overlay-konvensjon som resten av appen.

import { isBlackKey, noteName, pitchClass } from '@/lib/music'
import { cn } from '@/lib/cn'

const W = 14 // hvit tangentbredde
const H = 64 // full høyde
const BW = 8 // svart tangentbredde
const BH = 40 // svart tangenthøyde

interface Props {
  /** Tonene i grepet/rekkevidden (MIDI). Bestemmer også tangentområdet. */
  pitches: number[]
  /** Grunntonens tone-klasse (0–11) — males amber når den lyser. */
  root?: number
  /** Valgfrie etiketter under enkelttangenter (MIDI → tekst). */
  labels?: Record<number, string>
  /** Delmengde som lyser fullt akkurat nå (resten av `pitches` ligger svakt). */
  active?: Set<number>
  /** Gjør tangentene trykkbare — kall tilbake med MIDI-tonen. */
  onKeyPress?: (midi: number) => void
  className?: string
}

/** Utvid [min,max] til nærmeste C i begge ender, minst én oktav bredt. */
function padToC(min: number, max: number): [number, number] {
  let lo = min
  while (pitchClass(lo) !== 0) lo--
  let hi = max
  while (pitchClass(hi) !== 0) hi++
  if (hi - lo < 12) hi = lo + 12
  return [lo, hi]
}

export function MiniKeyboard({ pitches, root, labels, active, onKeyPress, className }: Props) {
  const pitchSet = new Set(pitches)
  const [lo, hi] = padToC(Math.min(...pitches), Math.max(...pitches))

  const whites: number[] = []
  for (let m = lo; m <= hi; m++) if (!isBlackKey(m)) whites.push(m)
  const width = whites.length * W

  const isRoot = (m: number) => root != null && pitchClass(m) === root
  const litOf = (m: number) => (active ? active.has(m) : pitchSet.has(m))

  /** Fyll + opasitet for en tangent, ut fra om den lyser / er del av formen. */
  function paint(m: number, black: boolean): { fill: string; opacity: number } {
    if (litOf(m)) return { fill: isRoot(m) ? 'var(--color-amber)' : 'var(--color-sea)', opacity: 1 }
    if (pitchSet.has(m)) return { fill: 'var(--color-sea)', opacity: 0.32 } // i formen, men stille nå
    return black ? { fill: 'var(--color-black-key)', opacity: 1 } : { fill: 'var(--color-ivory)', opacity: 1 }
  }

  function keyProps(m: number) {
    if (!onKeyPress) return {}
    return {
      role: 'button',
      'aria-label': noteName(m),
      onPointerDown: () => onKeyPress(m),
      className: 'cursor-pointer',
    } as const
  }

  return (
    <svg
      viewBox={`0 0 ${width} ${H}`}
      className={cn('block w-full max-w-[340px] select-none', className)}
      role="img"
      aria-label="Tangenter"
    >
      {/* Hvite tangenter */}
      {whites.map((m, i) => {
        const { fill, opacity } = paint(m, false)
        const label = labels?.[m]
        return (
          <g key={m} {...keyProps(m)}>
            <rect
              x={i * W}
              y={0}
              width={W - 1}
              height={H}
              rx={2}
              fill={fill}
              fillOpacity={opacity}
              stroke="var(--color-border)"
              strokeWidth={0.75}
            />
            {label && (
              <text
                x={i * W + (W - 1) / 2}
                y={H - 6}
                textAnchor="middle"
                className="pointer-events-none text-[7px] font-semibold"
                fill="var(--color-ink-on-amber)"
              >
                {label}
              </text>
            )}
          </g>
        )
      })}
      {/* Svarte tangenter (tegnes over hvite) */}
      {whites.map((m, i) => {
        const bm = m + 1
        if (!isBlackKey(bm) || bm > hi) return null
        const { fill, opacity } = paint(bm, true)
        const label = labels?.[bm]
        const x = (i + 1) * W - BW / 2
        return (
          <g key={bm} {...keyProps(bm)}>
            <rect x={x} y={0} width={BW} height={BH} rx={1.5} fill={fill} fillOpacity={opacity} />
            {label && (
              <text
                x={x + BW / 2}
                y={BH - 4}
                textAnchor="middle"
                className="pointer-events-none text-[6px] font-semibold"
                fill="var(--color-ivory)"
              >
                {label}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}
