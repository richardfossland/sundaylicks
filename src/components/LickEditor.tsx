'use client'

import { useMemo, useState } from 'react'
import { Play, Square, Trash2, Plus, Send, Loader2 } from 'lucide-react'
import type { LickNote, LickChord, Category, Genre, Difficulty, Hand, Lick } from '@/types/lick'
import { submissionSchema } from '@/lib/validation'
import { getUserId } from '@/lib/identity'
import { getEngine } from '@/lib/playback'
import { usePlayer } from '@/lib/store'
import { KEY_NAMES, NOTE_NAMES, isBlackKey, pitchClass, noteName } from '@/lib/music'
import { CATEGORY_LABEL, CATEGORY_ORDER, GENRE_LABEL, GENRE_ORDER, DIFFICULTY_LABEL } from '@/lib/labels'
import { cn } from '@/lib/cn'

const LO = 36 // C2
const HI = 84 // C6
const ROW_H = 12
const STEP_W = 26
const EPS = 1e-6

const DURATIONS: { d: number; label: string }[] = [
  { d: 0.25, label: '1/16' },
  { d: 0.5, label: '1/8' },
  { d: 1, label: '1/4' },
  { d: 2, label: '1/2' },
  { d: 4, label: '1/1' },
]
const QUALITIES = ['', 'm', '7', 'm7', 'maj7', 'm7b5', 'dim', 'sus4']

type SubmitState = 'idle' | 'sending' | 'ok' | 'error'

export function LickEditor() {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<Category>('run')
  const [genre, setGenre] = useState<Genre>('gospel')
  const [difficulty, setDifficulty] = useState<Difficulty>(1)
  const [originalKey, setOriginalKey] = useState(0)
  const [bpm, setBpm] = useState(90)
  const [beats, setBeats] = useState(8)
  const [tags, setTags] = useState('')
  const [notes, setNotes] = useState<LickNote[]>([])
  const [chords, setChords] = useState<LickChord[]>([])

  const [brushHand, setBrushHand] = useState<Hand>('R')
  const [brushDur, setBrushDur] = useState(1)

  const [submit, setSubmit] = useState<SubmitState>('idle')
  const [message, setMessage] = useState<string | null>(null)

  const isPlaying = usePlayer((s) => s.isPlaying)

  const steps = beats * 4
  const rows: number[] = []
  for (let m = HI; m >= LO; m--) rows.push(m)

  const content = useMemo(
    () => ({
      name,
      description: description.trim() ? description.trim() : null,
      category,
      genre,
      difficulty,
      original_key: originalKey,
      default_bpm: bpm,
      beats,
      time_signature: '4/4',
      notes,
      chords,
      tags: tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    }),
    [name, description, category, genre, difficulty, originalKey, bpm, beats, notes, chords, tags],
  )

  const validation = useMemo(() => submissionSchema.safeParse(content), [content])

  const toggleNote = (p: number, col: number) => {
    const t = col * 0.25
    const d = Math.min(brushDur, beats - t)
    if (d < 0.25 - EPS) return
    setNotes((prev) => {
      const existing = prev.findIndex((n) => n.p === p && Math.abs(n.t - t) < EPS && n.h === brushHand)
      if (existing >= 0) return prev.filter((_, i) => i !== existing)
      return [...prev, { p, t, d, h: brushHand }]
    })
  }

  const onGridPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    const col = Math.floor(e.nativeEvent.offsetX / STEP_W)
    const rowIdx = Math.floor(e.nativeEvent.offsetY / ROW_H)
    const p = HI - rowIdx
    if (col < 0 || col >= steps || p < LO || p > HI) return
    toggleNote(p, col)
  }

  const preview = () => {
    const engine = getEngine()
    if (usePlayer.getState().isPlaying) return engine.stop()
    if (!validation.success) return
    const lick: Lick = { ...content, id: 'preview', slug: 'preview', status: 'draft' }
    engine.build(lick, { targetKey: originalKey, hand: 'both', bpm, loop: true })
    void engine.play()
  }

  const send = async () => {
    if (!validation.success) return
    setSubmit('sending')
    setMessage(null)
    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...content, submitted_by: getUserId() }),
      })
      const json = (await res.json().catch(() => ({}))) as { error?: string; issues?: string[] }
      if (res.ok) {
        setSubmit('ok')
        setMessage('Takk! Licken din er sendt inn til gjennomgang.')
      } else {
        setSubmit('error')
        setMessage(json.error ?? `Innsending feilet (${res.status})`)
      }
    } catch {
      setSubmit('error')
      setMessage('Nettverksfeil — prøv igjen.')
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Metadata */}
      <div className="grid grid-cols-1 gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:grid-cols-2">
        <Field label="Navn">
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="F.eks. Min gospel-run" maxLength={80} />
        </Field>
        <Field label="Kategori">
          <select value={category} onChange={(e) => setCategory(e.target.value as Category)} className={inputCls}>
            {CATEGORY_ORDER.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABEL[c]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Sjanger">
          <select value={genre} onChange={(e) => setGenre(e.target.value as Genre)} className={inputCls}>
            {GENRE_ORDER.map((g) => (
              <option key={g} value={g}>
                {GENRE_LABEL[g]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Toneart">
          <select value={originalKey} onChange={(e) => setOriginalKey(Number(e.target.value))} className={inputCls}>
            {KEY_NAMES.map((k, i) => (
              <option key={i} value={i}>
                {k}-dur
              </option>
            ))}
          </select>
        </Field>
        <Field label="Nivå">
          <select value={difficulty} onChange={(e) => setDifficulty(Number(e.target.value) as Difficulty)} className={inputCls}>
            {([1, 2, 3] as Difficulty[]).map((d) => (
              <option key={d} value={d}>
                {DIFFICULTY_LABEL[d]}
              </option>
            ))}
          </select>
        </Field>
        <Field label={`Tempo: ${bpm} BPM`}>
          <input type="range" min={40} max={180} value={bpm} onChange={(e) => setBpm(Number(e.target.value))} className="w-full accent-[var(--color-amber)]" />
        </Field>
        <Field label="Lengde (slag)">
          <select value={beats} onChange={(e) => setBeats(Number(e.target.value))} className={inputCls}>
            {[4, 8, 12, 16].map((b) => (
              <option key={b} value={b}>
                {b} slag
              </option>
            ))}
          </select>
        </Field>
        <Field label="Beskrivelse" full>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} className={cn(inputCls, 'min-h-16 resize-y')} maxLength={400} placeholder="Kort om licken (valgfritt)" />
        </Field>
        <Field label="Tagger (komma)" full>
          <input value={tags} onChange={(e) => setTags(e.target.value)} className={inputCls} placeholder="gospel, run" />
        </Field>
      </div>

      {/* Brush */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <span className="text-sm text-[var(--color-muted)]">Pensel:</span>
        <div className="flex gap-1">
          {(['R', 'L'] as Hand[]).map((h) => (
            <button
              key={h}
              onClick={() => setBrushHand(h)}
              className={cn('rounded-full border px-3 py-1.5 text-sm', brushHand === h
                ? h === 'R'
                  ? 'border-[var(--color-amber)] bg-[var(--color-amber)]/15 text-[var(--color-amber)]'
                  : 'border-[var(--color-sea)] bg-[var(--color-sea)]/15 text-[var(--color-sea)]'
                : 'border-[var(--color-border)] text-[var(--color-muted)]')}
            >
              {h === 'R' ? 'Høyre' : 'Venstre'}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {DURATIONS.map((d) => (
            <button
              key={d.d}
              onClick={() => setBrushDur(d.d)}
              className={cn('rounded-lg border px-2.5 py-1.5 text-sm tabular-nums', brushDur === d.d ? 'border-[var(--color-ivory)] bg-[var(--color-ivory)]/10 text-[var(--color-ivory)]' : 'border-[var(--color-border)] text-[var(--color-muted)]')}
            >
              {d.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          <button onClick={() => setNotes([])} className="flex items-center gap-1.5 rounded-full border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-muted)] hover:text-[var(--color-ivory)]">
            <Trash2 className="h-4 w-4" /> Tøm noter
          </button>
          <button onClick={preview} disabled={!validation.success && !isPlaying} className="flex items-center gap-1.5 rounded-full bg-[var(--color-amber)] px-3.5 py-1.5 text-sm font-medium text-[#171210] disabled:opacity-50">
            {isPlaying ? <Square className="h-4 w-4" fill="currentColor" /> : <Play className="h-4 w-4" fill="currentColor" />}
            {isPlaying ? 'Stopp' : 'Forhåndsvis'}
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="scroll-x rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2">
        <p className="mb-2 px-1 text-xs text-[var(--color-muted)]">Klikk i rutenettet for å legge til / fjerne noter med valgt pensel.</p>
        <div className="max-h-[360px] overflow-y-auto">
          <div className="relative" style={{ width: steps * STEP_W, height: rows.length * ROW_H }}>
            {/* row shading + C labels */}
            {rows.map((p, i) => (
              <div key={p} className="absolute left-0" style={{ top: i * ROW_H, width: steps * STEP_W, height: ROW_H, background: isBlackKey(p) ? '#00000026' : 'transparent' }}>
                {pitchClass(p) === 0 && <span className="pointer-events-none absolute left-0.5 top-0 text-[8px] text-[#8a7c66]">{noteName(p)}</span>}
              </div>
            ))}
            {/* beat gridlines */}
            {Array.from({ length: beats + 1 }, (_, b) => (
              <div key={b} className="absolute top-0 bg-[var(--color-border)]" style={{ left: b * 4 * STEP_W, width: b % 4 === 0 ? 1.4 : 0.6, height: rows.length * ROW_H }} />
            ))}
            {/* notes */}
            {notes.map((n, i) => (
              <div
                key={i}
                className="pointer-events-none absolute rounded-sm"
                style={{
                  left: n.t * 4 * STEP_W + 1,
                  top: (HI - n.p) * ROW_H + 1,
                  width: Math.max(n.d * 4 * STEP_W - 2, 4),
                  height: ROW_H - 2,
                  background: n.h === 'R' ? 'var(--color-amber)' : 'var(--color-sea)',
                }}
              />
            ))}
            {/* click layer */}
            <div className="absolute inset-0 cursor-crosshair" onPointerDown={onGridPointer} />
          </div>
        </div>
      </div>

      {/* Chords (optional) */}
      <ChordEditor chords={chords} setChords={setChords} beats={beats} />

      {/* Validation + submit */}
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        {!validation.success && (
          <ul className="mb-3 list-disc space-y-1 pl-5 text-sm text-[var(--color-muted)]">
            {validation.error.issues.slice(0, 5).map((iss, i) => (
              <li key={i}>{iss.path.join('.') || 'felt'}: {iss.message}</li>
            ))}
          </ul>
        )}
        {message && (
          <p className={cn('mb-3 text-sm', submit === 'ok' ? 'text-[var(--color-sea)]' : 'text-[#C7534E]')}>{message}</p>
        )}
        <button
          onClick={send}
          disabled={!validation.success || submit === 'sending'}
          className="flex items-center gap-2 rounded-full bg-[var(--color-amber)] px-5 py-2.5 font-medium text-[#171210] disabled:opacity-50"
        >
          {submit === 'sending' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Send inn til gjennomgang
        </button>
      </div>
    </div>
  )
}

const inputCls =
  'w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-raised)] px-3 py-2 text-sm text-[var(--color-ivory)] outline-none focus:border-[var(--color-amber)]'

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={cn('flex flex-col gap-1.5', full && 'sm:col-span-2')}>
      <span className="text-sm text-[var(--color-muted)]">{label}</span>
      {children}
    </label>
  )
}

function ChordEditor({
  chords,
  setChords,
  beats,
}: {
  chords: LickChord[]
  setChords: (c: LickChord[]) => void
  beats: number
}) {
  const add = () => setChords([...chords, { t: 0, d: 2, r: 0, q: '' }])
  const update = (i: number, patch: Partial<LickChord>) =>
    setChords(chords.map((c, j) => (j === i ? { ...c, ...patch } : c)))
  const remove = (i: number) => setChords(chords.filter((_, j) => j !== i))

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm text-[var(--color-muted)]">Akkorder (valgfritt)</span>
        <button onClick={add} className="flex items-center gap-1.5 rounded-full border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-muted)] hover:text-[var(--color-ivory)]">
          <Plus className="h-4 w-4" /> Legg til
        </button>
      </div>
      <div className="flex flex-col gap-2">
        {chords.map((c, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2 text-sm">
            <label className="flex items-center gap-1 text-[var(--color-muted)]">
              slag
              <input type="number" min={0} max={beats} step={0.5} value={c.t} onChange={(e) => update(i, { t: Number(e.target.value) })} className="w-16 rounded border border-[var(--color-border)] bg-[var(--color-raised)] px-2 py-1 text-[var(--color-ivory)]" />
            </label>
            <label className="flex items-center gap-1 text-[var(--color-muted)]">
              lengde
              <input type="number" min={0.5} max={beats} step={0.5} value={c.d} onChange={(e) => update(i, { d: Number(e.target.value) })} className="w-16 rounded border border-[var(--color-border)] bg-[var(--color-raised)] px-2 py-1 text-[var(--color-ivory)]" />
            </label>
            <select value={c.r} onChange={(e) => update(i, { r: Number(e.target.value) })} className="rounded border border-[var(--color-border)] bg-[var(--color-raised)] px-2 py-1 text-[var(--color-ivory)]">
              {NOTE_NAMES.map((n, j) => (
                <option key={j} value={j}>{n}</option>
              ))}
            </select>
            <select value={c.q} onChange={(e) => update(i, { q: e.target.value })} className="rounded border border-[var(--color-border)] bg-[var(--color-raised)] px-2 py-1 text-[var(--color-ivory)]">
              {QUALITIES.map((q) => (
                <option key={q} value={q}>{q === '' ? 'dur' : q}</option>
              ))}
            </select>
            <button onClick={() => remove(i)} className="text-[var(--color-muted)] hover:text-[#C7534E]" aria-label="Fjern akkord">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
