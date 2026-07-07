'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { dominantKey, type Key } from '@/lib/theory/keys'
import { generateTransition, type TransitionDevice } from '@/lib/theory/transitions'
import type { Lick } from '@/types/lick'
import { useSession } from '@/lib/session'
import { useCollections } from '@/lib/collections'
import { cn } from '@/lib/cn'
import { CircleOfFifths } from '@/components/CircleOfFifths'
import { Practice } from '@/components/Practice'
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

export default function TransitionsPage() {
  const sessionKey = useSession((s) => s.key)
  const loadSession = useSession((s) => s.load)
  const loadCollections = useCollections((s) => s.load)

  const [mode, setMode] = useState<FlowMode>('wander')
  const [from, setFrom] = useState<Key>(sessionKey)
  const [to, setTo] = useState<Key>(sessionKey)
  const [device, setDevice] = useState<TransitionDevice>('wander')
  const [fromChordValue, setFromChordValue] = useState<string | null>(null)
  const [toChordValue, setToChordValue] = useState<string | null>(null)
  const [bpm, setBpm] = useState('')
  const [activeLick, setActiveLick] = useState<Lick | null>(null)

  useEffect(() => {
    loadSession()
    loadCollections()
  }, [loadSession, loadCollections])

  // Seed "fra" from the player's current toneart once, after session hydrates
  // from localStorage (see useSession — same pattern as the dashboard).
  const syncedFromSession = useRef(false)
  useEffect(() => {
    if (syncedFromSession.current) return
    syncedFromSession.current = true
    setFrom(sessionKey)
    setTo(sessionKey)
  }, [sessionKey])

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

  if (activeLick) {
    return (
      <div>
        <div className="mx-auto max-w-4xl px-4 pt-6">
          <button
            onClick={() => setActiveLick(null)}
            className="inline-flex items-center gap-1.5 text-sm text-[var(--color-muted)] hover:text-[var(--color-ivory)]"
          >
            <ArrowLeft className="h-4 w-4" /> Tilbake til overganger
          </button>
        </div>
        <Practice slug={activeLick.slug} lick={activeLick} />
      </div>
    )
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
      <Link href="/" className="mb-6 inline-flex items-center gap-1.5 text-sm text-[var(--color-muted)] hover:text-[var(--color-ivory)]">
        <ArrowLeft className="h-4 w-4" /> Dashbord
      </Link>

      <header className="mb-8">
        <h1 className="font-display text-4xl text-[var(--color-ivory)] sm:text-5xl">Overganger</h1>
        <p className="mt-2 max-w-2xl text-[var(--color-muted)]">
          Kvintsirkelen som kart: vandre rundt i én toneart, eller finn en naturlig vei fra én toneart til en annen —
          hver overgang kommer i tre versjoner, fra enkel til avansert.
        </p>
      </header>

      <div className="mb-6 flex gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-raised)] p-1 text-sm">
        {(['wander', 'modulate'] as const).map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={mode === m}
            onClick={() => changeMode(m)}
            className={cn(
              'flex-1 rounded-full px-4 py-2 font-medium transition-colors',
              mode === m ? 'bg-[var(--color-amber)] text-[var(--color-ink-on-amber)]' : 'text-[var(--color-muted)] hover:text-[var(--color-ivory)]',
            )}
          >
            {MODE_LABEL[m]}
          </button>
        ))}
      </div>

      <section className="mb-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <CircleOfFifths from={from} to={effectiveTo} onSelectFrom={changeFrom} onSelectTo={changeTo} showTarget={mode === 'modulate'} />
      </section>

      <section className="mb-6 flex flex-col gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
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
                  ? 'border-[var(--color-sea)] bg-[var(--color-sea)]/15 text-[var(--color-sea)]'
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
                <select
                  value={fromChordOption?.value ?? ''}
                  onChange={(e) => setFromChordValue(e.target.value)}
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-raised)] px-2.5 py-1.5 text-[var(--color-ivory)] outline-none focus:border-[var(--color-amber)]"
                >
                  {fromChordOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {needsToChord(device) && (
              <label className="flex flex-col gap-1 text-sm text-[var(--color-muted)]">
                Til-akkord
                <select
                  value={toChordOption?.value ?? ''}
                  onChange={(e) => setToChordValue(e.target.value)}
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-raised)] px-2.5 py-1.5 text-[var(--color-ivory)] outline-none focus:border-[var(--color-amber)]"
                >
                  {toChordOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
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
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-raised)] px-2.5 py-1.5 text-[var(--color-ivory)] outline-none focus:border-[var(--color-amber)]"
          />
        </label>
      </section>

      <section className="flex flex-col gap-4">
        {results.length === 0 && <p className="text-sm text-[var(--color-muted)]">Fant ingen overganger for dette valget — prøv en annen akkord.</p>}
        {results.map((r) => (
          <ResultCard key={`${r.device}-${r.level}`} result={r} onPlay={setActiveLick} />
        ))}
      </section>
    </main>
  )
}
