'use client'

import { useEffect, useState } from 'react'
import { Play, Square, Check, X, Loader2, ShieldCheck } from 'lucide-react'
import type { Lick } from '@/types/lick'
import { getEngine } from '@/lib/playback'
import { installAudioUnlock } from '@/lib/audio-unlock'
import { usePlayer } from '@/lib/store'
import { KEY_NAMES } from '@/lib/music'
import { CATEGORY_LABEL, DIFFICULTY_LABEL } from '@/lib/labels'

export function AdminPanel() {
  const [password, setPassword] = useState('')
  const [authed, setAuthed] = useState(false)
  const [licks, setLicks] = useState<Lick[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const isPlaying = usePlayer((s) => s.isPlaying)
  useEffect(() => installAudioUnlock(), [])

  const headers = () => ({ 'content-type': 'application/json', 'x-admin-key': password })

  const login = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/licks', { headers: headers() })
      const json = (await res.json().catch(() => ({}))) as { licks?: Lick[]; error?: string }
      if (res.ok) {
        setAuthed(true)
        setLicks(json.licks ?? [])
      } else {
        setError(json.error ?? `Feil (${res.status})`)
      }
    } catch {
      setError('Nettverksfeil')
    } finally {
      setLoading(false)
    }
  }

  const act = async (id: string, action: 'approve' | 'reject') => {
    setBusyId(id)
    setError(null)
    try {
      const res = await fetch('/api/admin/licks', { method: 'POST', headers: headers(), body: JSON.stringify({ id, action }) })
      if (res.ok) {
        setLicks((prev) => prev.filter((l) => l.id !== id))
      } else {
        const json = (await res.json().catch(() => ({}))) as { error?: string }
        setError(json.error ?? `Feil (${res.status})`)
      }
    } catch {
      setError('Nettverksfeil')
    } finally {
      setBusyId(null)
    }
  }

  const previewLick = (lick: Lick) => {
    const engine = getEngine()
    if (usePlayer.getState().isPlaying && playingId === lick.id) {
      engine.stop()
      setPlayingId(null)
      return
    }
    engine.build(lick, { targetKey: lick.original_key, hand: 'both', bpm: lick.default_bpm, loop: true })
    void engine.play()
    setPlayingId(lick.id)
  }

  if (!authed) {
    return (
      <div className="mx-auto max-w-sm rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <div className="mb-4 flex items-center gap-2 text-[var(--color-ivory)]">
          <ShieldCheck className="h-5 w-5 text-[var(--color-amber)]" />
          <h1 className="font-display text-xl">Admin</h1>
        </div>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && login()}
          placeholder="Passord"
          className="mb-3 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-raised)] px-3 py-2 text-[var(--color-ivory)] outline-none focus:border-[var(--color-amber)]"
        />
        {error && <p className="mb-3 text-sm text-[#C7534E]">{error}</p>}
        <button onClick={login} disabled={loading || !password} className="flex w-full items-center justify-center gap-2 rounded-full bg-[var(--color-amber)] px-4 py-2.5 font-medium text-[#171210] disabled:opacity-50">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Logg inn
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-1 font-display text-3xl text-[var(--color-ivory)]">Innsendte licks</h1>
      <p className="mb-6 text-[var(--color-muted)]">{licks.length} venter på gjennomgang.</p>
      {error && <p className="mb-4 text-sm text-[#C7534E]">{error}</p>}
      {licks.length === 0 ? (
        <p className="py-16 text-center text-[var(--color-muted)]">Ingen innsendte licks akkurat nå.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {licks.map((l) => (
            <div key={l.id} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-xl text-[var(--color-ivory)]">{l.name}</h3>
                  <p className="mt-1 text-sm text-[var(--color-muted)]">
                    {CATEGORY_LABEL[l.category]} · {DIFFICULTY_LABEL[l.difficulty]} · {KEY_NAMES[l.original_key]}-dur ·{' '}
                    {l.default_bpm} BPM · {l.notes.length} noter
                    {l.submitted_by ? ` · av ${l.submitted_by.slice(0, 12)}…` : ''}
                  </p>
                  {l.description && <p className="mt-2 max-w-xl text-sm text-[var(--color-muted)]">{l.description}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => previewLick(l)} className="flex items-center gap-1.5 rounded-full border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-ivory)]">
                    {isPlaying && playingId === l.id ? <Square className="h-4 w-4" fill="currentColor" /> : <Play className="h-4 w-4" fill="currentColor" />}
                    Spill
                  </button>
                  <button onClick={() => act(l.id, 'approve')} disabled={busyId === l.id} className="flex items-center gap-1.5 rounded-full bg-[var(--color-sea)] px-3.5 py-1.5 text-sm font-medium text-[#171210] disabled:opacity-50">
                    <Check className="h-4 w-4" /> Godkjenn
                  </button>
                  <button onClick={() => act(l.id, 'reject')} disabled={busyId === l.id} className="flex items-center gap-1.5 rounded-full border border-[#C7534E] px-3.5 py-1.5 text-sm font-medium text-[#C7534E] disabled:opacity-50">
                    <X className="h-4 w-4" /> Avvis
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
