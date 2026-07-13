'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { dominantKey, type Key } from '@/lib/theory/keys'
import { generateTransition, type TransitionDevice } from '@/lib/theory/transitions'
import type { Lick } from '@/types/lick'
import { useSession } from '@/lib/session'
import { useCollections } from '@/lib/collections'
import { ACCENT_CLASSES } from '@/lib/modes'
import { loadViewState, saveViewState } from '@/lib/view-state'
import { Select } from '@/components/Select'
import { cn } from '@/lib/cn'
import { CircleOfFifths } from '@/components/CircleOfFifths'
import { ResultCard } from './ResultCard'
import {
  DEVICES_FOR_MODE,
  chordOptionsFor,
  needsFromChord,
  needsToChord,
  resolveChordOption,
  resolveDevice,
  type FlowMode,
} from './adapter'

// Tone.js touches the AudioContext — must never run during SSR / the Cloudflare
// Worker render, same as the /lick/[slug] page.
const Practice = dynamic(() => import('@/components/Practice').then((m) => m.Practice), {
  ssr: false,
  loading: () => <p className="py-10 text-center text-[var(--color-muted)]">Laster spilleren …</p>,
})

const DEVICE_LABEL: Record<TransitionDevice, string> = {
  wander: 'Turnaround',
  reharm: 'Reharmonisering',
  'bass-walk': 'Gående bass',
  modulate: 'Modulasjon',
}

const MODE_LABEL: Record<FlowMode, string> = {
  wander: 'Vandre i tonearten',
  modulate: 'Modulér til ny toneart',
}

const ember = ACCENT_CLASSES.ember

/** sessionStorage key for this tab's browse state (see lib/view-state.ts). */
const VIEW_KEY = 'sundaylicks_view_over'

const DEVICES: TransitionDevice[] = ['modulate', 'wander', 'reharm', 'bass-walk']

interface OverViewState {
  mode: FlowMode
  from: Key
  to: Key
  device: TransitionDevice
  fromChordValue: string | null
  toChordValue: string | null
  bpm: string
}

/** Validate a stored Key down to {root 0–11, mode}, or null. */
function asKey(v: unknown): Key | null {
  if (typeof v !== 'object' || v === null) return null
  const k = v as Record<string, unknown>
  if (typeof k.root !== 'number' || !Number.isInteger(k.root) || k.root < 0 || k.root > 11) return null
  if (k.mode !== 'major' && k.mode !== 'minor') return null
  return { root: k.root, mode: k.mode }
}

/** Reject a stored blob whose fields no longer map to anything valid. */
function validateOverState(d: Record<string, unknown>): OverViewState | null {
  const { mode, from, to, device, fromChordValue, toChordValue, bpm } = d
  if (mode !== 'wander' && mode !== 'modulate') return null
  const fromKey = asKey(from)
  const toKey = asKey(to)
  if (!fromKey || !toKey) return null
  if (!DEVICES.includes(device as TransitionDevice)) return null
  if (fromChordValue !== null && typeof fromChordValue !== 'string') return null
  if (toChordValue !== null && typeof toChordValue !== 'string') return null
  if (typeof bpm !== 'string') return null
  return { mode, from: fromKey, to: toKey, device: device as TransitionDevice, fromChordValue, toChordValue, bpm }
}

/**
 * "Overganger" — the /transitions flow, unchanged in substance (kvintsirkel +
 * device + resultatkort), just inlined: no more "back to dashboard" link (the
 * mode switcher in AppShell covers that) and playing a result previews it
 * inline below instead of swapping out the whole page, matching Krydre's
 * preview pattern.
 */
export function OverTab() {
  const sessionKey = useSession((s) => s.key)
  const loadCollections = useCollections((s) => s.load)

  const [mode, setMode] = useState<FlowMode>('wander')
  const [from, setFrom] = useState<Key>(sessionKey)
  const [to, setTo] = useState<Key>(sessionKey)
  const [device, setDevice] = useState<TransitionDevice>('wander')
  const [fromChordValue, setFromChordValue] = useState<string | null>(null)
  const [toChordValue, setToChordValue] = useState<string | null>(null)
  const [bpm, setBpm] = useState('')
  const [preview, setPreview] = useState<Lick | null>(null)

  const previewRef = useRef<HTMLDivElement>(null)
  // Gates the save effect until the mount restore has run.
  const hydratedRef = useRef(false)

  useEffect(() => {
    loadCollections()
  }, [loadCollections])

  // Seed "fra" from the player's current toneart once, after session hydrates
  // from localStorage (see useSession — same pattern as the dashboard).
  const syncedFromSession = useRef(false)
  useEffect(() => {
    if (syncedFromSession.current) return
    syncedFromSession.current = true
    setFrom(sessionKey)
    setTo(sessionKey)
  }, [sessionKey])

  // Restore the tab's browse state saved on the last in-app trip to the player,
  // so a fane-bytte or return from øving keeps the kvintsirkel picks, device and
  // tempo instead of resetting. Runs once at mount, AFTER the seed effect above,
  // so it wins; marking `syncedFromSession` also stops the async session
  // hydration from re-seeding "fra/til" over the restored keys. Never `preview`.
  useEffect(() => {
    const saved = loadViewState(VIEW_KEY, validateOverState)
    if (saved) {
      setMode(saved.mode)
      setFrom(saved.from)
      setTo(saved.to)
      setDevice(saved.device)
      setFromChordValue(saved.fromChordValue)
      setToChordValue(saved.toChordValue)
      setBpm(saved.bpm)
      syncedFromSession.current = true
    }
    hydratedRef.current = true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Persist on every change once hydrated (re-stamps the TTL). Never `preview`.
  useEffect(() => {
    if (!hydratedRef.current) return
    saveViewState(VIEW_KEY, { mode, from, to, device, fromChordValue, toChordValue, bpm })
  }, [mode, from, to, device, fromChordValue, toChordValue, bpm])

  // In "vandre" mode there is only ever one key — always mirror `from`.
  const effectiveTo = mode === 'wander' ? from : to

  const fromChordOptions = useMemo(() => chordOptionsFor(from), [from])
  const toChordOptions = useMemo(() => chordOptionsFor(effectiveTo), [effectiveTo])

  const fromChordOption = useMemo(
    () => (needsFromChord(device) ? resolveChordOption(fromChordValue, fromChordOptions, 4) : undefined), // default: V
    [device, fromChordValue, fromChordOptions],
  )
  const toChordOption = useMemo(
    () => (needsToChord(device) ? resolveChordOption(toChordValue, toChordOptions, mode === 'wander' ? 3 : 0) : undefined), // IV within-key, else I of the new key
    [device, toChordValue, toChordOptions, mode],
  )

  const results = useMemo(() => {
    try {
      return generateTransition({
        from: { key: from, chord: fromChordOption ? { t: 0, d: 4, r: fromChordOption.root, q: fromChordOption.quality } : undefined },
        to: { key: effectiveTo, chord: toChordOption ? { t: 0, d: 4, r: toChordOption.root, q: toChordOption.quality } : undefined },
        device,
        bpm: bpm ? Number(bpm) : undefined,
      })
    } catch {
      return []
    }
  }, [from, effectiveTo, device, fromChordOption, toChordOption, bpm])

  const changeMode = (m: FlowMode) => {
    setMode(m)
    setDevice((d) => resolveDevice(m, d))
    // Give "modulér" a non-trivial default target the first time it's opened.
    if (m === 'modulate' && to.root === from.root && to.mode === from.mode) {
      setTo(dominantKey(from))
    }
  }

  const changeFrom = (key: Key) => {
    setFrom(key)
    setFromChordValue(null)
  }

  const changeTo = (key: Key) => {
    setTo(key)
    setToChordValue(null)
  }

  const play = (lick: Lick) => {
    setPreview(lick)
    requestAnimationFrame(() => previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-raised)] p-1 text-sm">
        {(['wander', 'modulate'] as const).map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={mode === m}
            onClick={() => changeMode(m)}
            className={cn(
              'flex-1 rounded-full px-4 py-2 font-medium transition-colors',
              mode === m ? cn(ember.bg, ember.ink) : 'text-[var(--color-muted)] hover:text-[var(--color-ivory)]',
            )}
          >
            {MODE_LABEL[m]}
          </button>
        ))}
      </div>

      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <CircleOfFifths from={from} to={effectiveTo} onSelectFrom={changeFrom} onSelectTo={changeTo} showTarget={mode === 'modulate'} />
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <div className="flex flex-wrap items-center gap-2">
          {DEVICES_FOR_MODE[mode].map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={device === d}
              onClick={() => setDevice(d)}
              className={cn(
                'rounded-full border px-3.5 py-2 text-sm font-medium transition-colors',
                device === d
                  ? cn(ember.border, ember.softBg, ember.softText)
                  : 'border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-ivory)]',
              )}
            >
              {DEVICE_LABEL[d]}
            </button>
          ))}
        </div>

        {(needsFromChord(device) || needsToChord(device)) && (
          <div className="flex flex-wrap gap-4">
            {needsFromChord(device) && (
              <label className="flex flex-col gap-1 text-sm text-[var(--color-muted)]">
                Fra-akkord
                <Select value={fromChordOption?.value ?? ''} onChange={setFromChordValue}>
                  {fromChordOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </label>
            )}
            {needsToChord(device) && (
              <label className="flex flex-col gap-1 text-sm text-[var(--color-muted)]">
                Til-akkord
                <Select value={toChordOption?.value ?? ''} onChange={setToChordValue}>
                  {toChordOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </label>
            )}
          </div>
        )}

        <label className="flex w-40 flex-col gap-1 text-sm text-[var(--color-muted)]">
          Tempo (valgfritt)
          <input
            type="number"
            min={20}
            max={300}
            value={bpm}
            onChange={(e) => setBpm(e.target.value)}
            placeholder="Auto"
            className="rounded-full border border-[var(--color-border)] bg-[var(--color-raised)] px-3.5 py-2 text-sm text-[var(--color-ivory)] outline-none focus:border-[var(--color-amber)]"
          />
        </label>
      </section>

      <section className="flex flex-col gap-4">
        {results.length === 0 && (
          <p className="text-sm text-[var(--color-muted)]">Fant ingen overganger for dette valget — prøv en annen akkord.</p>
        )}
        {results.map((r) => (
          <ResultCard key={`${r.device}-${r.level}`} result={r} onPlay={play} />
        ))}
      </section>

      {/* Preview panel — same inline-below pattern as Krydre, instead of the
          old full-page swap. */}
      <div ref={previewRef} className="scroll-mt-20">
        {preview ? (
          <Practice slug={preview.slug} lick={preview} />
        ) : (
          <p className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center text-[var(--color-muted)]">
            Trykk «Øv på denne» på en overgang over for å spille den her — metronom, transponering og vent-modus
            fungerer som vanlig.
          </p>
        )}
      </div>
    </div>
  )
}
