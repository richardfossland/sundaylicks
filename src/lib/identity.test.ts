// Tester at enhets-id-en overlever blokkert lagring (Safari privat modus o.l.).
// Kjører i node-env, så `window` og `localStorage` stubbes eksplisitt.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/** Fersk import, så modulens minne-reserve nullstilles mellom testene. */
async function freshGetUserId() {
  vi.resetModules()
  return (await import('./identity')).getUserId
}

function throwingStorage() {
  return {
    getItem: () => {
      throw new DOMException('The operation is insecure.', 'SecurityError')
    },
    setItem: () => {
      throw new DOMException('The operation is insecure.', 'SecurityError')
    },
    removeItem: () => {},
  }
}

function memoryStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial))
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      map.set(k, v)
    },
    removeItem: (k: string) => {
      map.delete(k)
    },
    map,
  }
}

beforeEach(() => {
  vi.stubGlobal('window', {} as unknown as Window)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('getUserId', () => {
  it('returnerer «anon» uten window (SSR)', async () => {
    vi.unstubAllGlobals()
    const getUserId = await freshGetUserId()
    expect(getUserId()).toBe('anon')
  })

  it('lager og lagrer en id første gang', async () => {
    const store = memoryStorage()
    vi.stubGlobal('localStorage', store)
    const getUserId = await freshGetUserId()
    const id = getUserId()
    expect(id).toMatch(/^u_/)
    expect(store.map.get('sundaylicks_user_id')).toBe(id)
  })

  it('gjenbruker en lagret id', async () => {
    vi.stubGlobal('localStorage', memoryStorage({ sundaylicks_user_id: 'u_lagret' }))
    const getUserId = await freshGetUserId()
    expect(getUserId()).toBe('u_lagret')
  })

  it('kaster ikke når localStorage kaster — faller tilbake til en minne-id', async () => {
    vi.stubGlobal('localStorage', throwingStorage())
    const getUserId = await freshGetUserId()
    expect(() => getUserId()).not.toThrow()
    expect(getUserId()).toMatch(/^u_/)
  })

  it('minne-id-en er STABIL gjennom økta (samme handle på flere innsendinger)', async () => {
    vi.stubGlobal('localStorage', throwingStorage())
    const getUserId = await freshGetUserId()
    const first = getUserId()
    expect(getUserId()).toBe(first)
    expect(getUserId()).toBe(first)
  })

  it('faller tilbake også når bare setItem kaster (kvote/privat modus)', async () => {
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => {
        throw new DOMException('QuotaExceededError', 'QuotaExceededError')
      },
      removeItem: () => {},
    })
    const getUserId = await freshGetUserId()
    const first = getUserId()
    expect(first).toMatch(/^u_/)
    expect(getUserId()).toBe(first)
  })
})
