import { describe, expect, it } from 'vitest'

import {
  VIEW_STATE_TTL_MS,
  clearViewState,
  loadViewState,
  parseViewState,
  saveViewState,
} from './view-state'

// ── Fixtures ─────────────────────────────────────────────────────────────────

interface Demo {
  tab: 'a' | 'b'
  query: string
}

/** Accept only {tab: 'a'|'b', query: string}; reject anything else. */
function validateDemo(data: Record<string, unknown>): Demo | null {
  const tab = data.tab
  const query = data.query
  if (tab !== 'a' && tab !== 'b') return null
  if (typeof query !== 'string') return null
  return { tab, query }
}

const now = 1_000_000

// ── parseViewState — round-trip ──────────────────────────────────────────────

describe('parseViewState — round-trip', () => {
  it('parses a freshly-stamped blob back into the validated state', () => {
    const raw = JSON.stringify({ tab: 'b', query: 'gospel', ts: now })
    expect(parseViewState(raw, validateDemo, now)).toEqual({ tab: 'b', query: 'gospel' })
  })

  it('strips unknown extra fields down to what the validator returns', () => {
    const raw = JSON.stringify({ tab: 'a', query: '', junk: 42, ts: now })
    expect(parseViewState(raw, validateDemo, now)).toEqual({ tab: 'a', query: '' })
  })
})

// ── parseViewState — staleness boundary ──────────────────────────────────────

describe('parseViewState — staleness boundary', () => {
  const raw = JSON.stringify({ tab: 'a', query: 'x', ts: now })

  it('is still valid exactly at the TTL boundary', () => {
    expect(parseViewState(raw, validateDemo, now + VIEW_STATE_TTL_MS)).toEqual({ tab: 'a', query: 'x' })
  })

  it('is stale one millisecond past the TTL', () => {
    expect(parseViewState(raw, validateDemo, now + VIEW_STATE_TTL_MS + 1)).toBeNull()
  })
})

// ── parseViewState — rejection ───────────────────────────────────────────────

describe('parseViewState — rejection', () => {
  it('returns null for null / empty input', () => {
    expect(parseViewState(null, validateDemo, now)).toBeNull()
    expect(parseViewState('', validateDemo, now)).toBeNull()
  })

  it('returns null for corrupt JSON', () => {
    expect(parseViewState('{not json', validateDemo, now)).toBeNull()
  })

  it('returns null for non-object JSON (primitive, null, array)', () => {
    expect(parseViewState('5', validateDemo, now)).toBeNull()
    expect(parseViewState('null', validateDemo, now)).toBeNull()
    expect(parseViewState('"str"', validateDemo, now)).toBeNull()
    expect(parseViewState(JSON.stringify([{ tab: 'a', query: '', ts: now }]), validateDemo, now)).toBeNull()
  })

  it('returns null when ts is missing', () => {
    expect(parseViewState(JSON.stringify({ tab: 'a', query: '' }), validateDemo, now)).toBeNull()
  })

  it('returns null when ts is non-finite / not a number', () => {
    // NaN / Infinity are not JSON-representable, so a non-finite ts arrives as a
    // string or null on the wire — both must be rejected.
    expect(parseViewState(JSON.stringify({ tab: 'a', query: '', ts: 'x' }), validateDemo, now)).toBeNull()
    expect(parseViewState(JSON.stringify({ tab: 'a', query: '', ts: null }), validateDemo, now)).toBeNull()
  })

  it('returns null when the validator rejects an otherwise-fresh blob', () => {
    expect(parseViewState(JSON.stringify({ tab: 'c', query: '', ts: now }), validateDemo, now)).toBeNull()
    expect(parseViewState(JSON.stringify({ tab: 'a', query: 5, ts: now }), validateDemo, now)).toBeNull()
  })
})

// ── Storage wrappers — node (no window) degrade to no-ops ─────────────────────

describe('storage wrappers — no window', () => {
  it('loadViewState returns null without throwing', () => {
    expect(loadViewState('sundaylicks_view_demo', validateDemo, now)).toBeNull()
  })

  it('saveViewState and clearViewState do not throw', () => {
    expect(() => saveViewState('sundaylicks_view_demo', { tab: 'a', query: '' }, now)).not.toThrow()
    expect(() => clearViewState('sundaylicks_view_demo')).not.toThrow()
  })
})
