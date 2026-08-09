import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Lick } from '@/types/lick'

// licks.ts er hentelaget hele biblioteket og øvemodus står på. Grenene som
// betyr noe er de KALDE: mangler Supabase-konfigurasjon, svarer databasen med
// feil, eller er tabellen tom — da skal det bunta seed-korpuset tre inn slik at
// appen aldri viser en tom hylle. I tillegg holder en 5-minutters cache på
// vellykkede svar (feil caches ALDRI). Alt dette er tilstand på modulnivå, så
// hver test starter med `vi.resetModules()` og en fersk import.

const { createClientMock } = vi.hoisted(() => ({ createClientMock: vi.fn() }))
vi.mock('@/lib/supabase/client', () => ({ createClient: createClientMock }))

type Result = { data: unknown; error: unknown }

/** Minimal PostgREST-lignende stubb: kjeden er thenable, `maybeSingle()` ikke. */
function stubClient(result: Result) {
  const state = { froms: 0, selects: 0, filters: [] as [string, unknown][] }
  const builder: Record<string, unknown> = {}
  Object.assign(builder, {
    select: (...a: unknown[]) => {
      state.selects++
      void a
      return builder
    },
    eq: (col: string, val: unknown) => {
      state.filters.push([col, val])
      return builder
    },
    order: () => builder,
    maybeSingle: () => Promise.resolve(result),
    // Gjør kjeden ventbar, slik `fetchLicks` bruker den.
    then: (res: (r: Result) => unknown, rej?: (e: unknown) => unknown) =>
      Promise.resolve(result).then(res, rej),
  })
  const client = {
    from: (table: string) => {
      state.froms++
      void table
      return builder
    },
  }
  return { client, state }
}

/** Klient som kaster i stedet for å svare — fanges av `try/catch`-grenen. */
function throwingClient(message: string) {
  return {
    from: () => {
      throw new Error(message)
    },
  }
}

async function freshModule() {
  vi.resetModules()
  return import('./licks')
}

function row(over: Partial<Lick> = {}): Lick {
  return {
    id: 'db-1',
    slug: 'fra-databasen',
    name: 'Fra databasen',
    description: null,
    category: 'run',
    genre: 'gospel',
    difficulty: 1,
    original_key: 0,
    default_bpm: 90,
    beats: 4,
    time_signature: '4/4',
    notes: [{ p: 60, t: 0, d: 1, h: 'R' }],
    chords: [],
    tags: [],
    status: 'published',
    ...over,
  }
}

beforeEach(() => {
  createClientMock.mockReset()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('fetchLicks — fallback-grenene', () => {
  it('bruker seed-korpuset når Supabase ikke er konfigurert (createClient → null)', async () => {
    createClientMock.mockReturnValue(null)
    const { fetchLicks } = await freshModule()
    const licks = await fetchLicks()
    expect(licks.length).toBeGreaterThan(300)
    expect(licks.every((l) => l.id.startsWith('seed:'))).toBe(true)
    expect(licks.every((l) => l.status === 'published')).toBe(true)
    expect(licks.every((l) => l.submitted_by === null)).toBe(true)
  })

  it('har alle tre instrumentkorpusene med i fallbacken', async () => {
    createClientMock.mockReturnValue(null)
    const { fetchLicks } = await freshModule()
    const instruments = new Set((await fetchLicks()).map((l) => l.instrument ?? 'piano'))
    expect(instruments).toEqual(new Set(['piano', 'gitar', 'bass']))
  })

  it('faller tilbake når databasen svarer med feil', async () => {
    const { client } = stubClient({ data: null, error: { message: 'boom' } })
    createClientMock.mockReturnValue(client)
    const { fetchLicks } = await freshModule()
    expect((await fetchLicks()).length).toBeGreaterThan(300)
  })

  it('faller tilbake når tabellen er tom — ikke en tom hylle', async () => {
    const { client } = stubClient({ data: [], error: null })
    createClientMock.mockReturnValue(client)
    const { fetchLicks } = await freshModule()
    expect((await fetchLicks()).length).toBeGreaterThan(300)
  })

  it('faller tilbake når klienten kaster (nettverk nede)', async () => {
    createClientMock.mockReturnValue(throwingClient('nettverk nede'))
    const { fetchLicks } = await freshModule()
    expect((await fetchLicks()).length).toBeGreaterThan(300)
  })

  it('memoiserer fallback-importen — korpuset mappes bare én gang', async () => {
    createClientMock.mockReturnValue(null)
    const { fetchLicks } = await freshModule()
    const a = await fetchLicks()
    const b = await fetchLicks()
    expect(b).toBe(a) // samme array-referanse ⇒ ingen ny import/mapping
  })
})

describe('fetchLicks — den varme stien', () => {
  it('returnerer radene fra databasen når spørringen lykkes', async () => {
    const { client, state } = stubClient({ data: [row()], error: null })
    createClientMock.mockReturnValue(client)
    const { fetchLicks } = await freshModule()
    const licks = await fetchLicks()
    expect(licks).toEqual([row()])
    expect(state.froms).toBe(1)
    expect(state.filters).toEqual([['status', 'published']])
  })

  it('caches i 5 minutter — andre kall treffer ALDRI databasen igjen', async () => {
    const { client, state } = stubClient({ data: [row()], error: null })
    createClientMock.mockReturnValue(client)
    const { fetchLicks } = await freshModule()

    const first = await fetchLicks()
    const second = await fetchLicks()

    expect(state.froms).toBe(1) // ingen ny spørring
    expect(second).toBe(first) // samme cachede array
  })

  it('henter på nytt når cachen er utløpt (> 5 min)', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T12:00:00Z'))
    const { client, state } = stubClient({ data: [row()], error: null })
    createClientMock.mockReturnValue(client)
    const { fetchLicks } = await freshModule()

    await fetchLicks()
    vi.setSystemTime(new Date('2026-01-01T12:04:59Z')) // like innenfor TTL
    await fetchLicks()
    expect(state.froms).toBe(1)

    vi.setSystemTime(new Date('2026-01-01T12:05:01Z')) // utløpt
    await fetchLicks()
    expect(state.froms).toBe(2)
  })

  it('caches ALDRI en feil — neste kall prøver databasen på nytt', async () => {
    const { client, state } = stubClient({ data: null, error: { message: 'boom' } })
    createClientMock.mockReturnValue(client)
    const { fetchLicks } = await freshModule()

    await fetchLicks()
    await fetchLicks()
    expect(state.froms).toBe(2)
  })
})

describe('fetchLick (én lick)', () => {
  it('finner licken i seed-korpuset når Supabase mangler', async () => {
    createClientMock.mockReturnValue(null)
    const { fetchLicks, fetchLick } = await freshModule()
    const someSlug = (await fetchLicks())[0].slug
    const found = await fetchLick(someSlug)
    expect(found?.slug).toBe(someSlug)
    expect(found?.id).toBe(`seed:${someSlug}`)
  })

  it('gir null for en slug som ikke finnes — ikke et kast', async () => {
    createClientMock.mockReturnValue(null)
    const { fetchLick } = await freshModule()
    expect(await fetchLick('finnes-ikke-noe-sted')).toBeNull()
  })

  it('returnerer raden fra databasen når den finnes', async () => {
    const { client, state } = stubClient({ data: row({ slug: 'db-lick' }), error: null })
    createClientMock.mockReturnValue(client)
    const { fetchLick } = await freshModule()
    expect(await fetchLick('db-lick')).toEqual(row({ slug: 'db-lick' }))
    expect(state.filters).toEqual([
      ['slug', 'db-lick'],
      ['status', 'published'],
    ])
  })

  it('faller tilbake til seed når databasen svarer med feil', async () => {
    const { client } = stubClient({ data: null, error: { message: 'boom' } })
    createClientMock.mockReturnValue(client)
    const { fetchLicks, fetchLick } = await freshModule()
    createClientMock.mockReturnValue(null)
    const someSlug = (await fetchLicks())[0].slug

    createClientMock.mockReturnValue(client)
    const found = await fetchLick(someSlug)
    expect(found?.id).toBe(`seed:${someSlug}`)
  })

  it('faller tilbake til seed når klienten kaster', async () => {
    createClientMock.mockReturnValue(throwingClient('nettverk nede'))
    const { fetchLick } = await freshModule()
    expect(await fetchLick('finnes-ikke-noe-sted')).toBeNull() // fallback nådd, ingen kast
  })

  it('krever `published` — en upublisert slug faller til seed-oppslaget', async () => {
    const { client, state } = stubClient({ data: null, error: null })
    createClientMock.mockReturnValue(client)
    const { fetchLick } = await freshModule()
    await fetchLick('kladd')
    expect(state.filters).toContainEqual(['status', 'published'])
  })
})
