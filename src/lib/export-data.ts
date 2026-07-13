// Samler all lokal SundayLicks-data til ett JSON-objekt for «Eksporter dataene
// mine» i /innstillinger. Ren funksjon: tar en getItem-avleser (localStorage.
// getItem eller en test-shim) så kjernen kan testes uten DOM. Null-trygt — en
// nøkkel som mangler eller er korrupt JSON blir `null` i stedet for å kaste.

const KEYS = {
  progress: 'sundaylicks_progress',
  collections: 'sundaylicks_collections',
  session: 'sundaylicks_session',
  prefs: 'sundaylicks_prefs',
} as const

export interface ExportBundle {
  app: 'sundaylicks'
  version: 1
  exportedAt: string
  data: {
    progress: unknown
    collections: unknown
    session: unknown
    prefs: unknown
  }
}

type GetItem = (key: string) => string | null

function parseKey(getItem: GetItem, key: string): unknown {
  const raw = getItem(key)
  if (raw === null) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function collectExportData(getItem: GetItem): ExportBundle {
  return {
    app: 'sundaylicks',
    version: 1,
    exportedAt: new Date().toISOString(),
    data: {
      progress: parseKey(getItem, KEYS.progress),
      collections: parseKey(getItem, KEYS.collections),
      session: parseKey(getItem, KEYS.session),
      prefs: parseKey(getItem, KEYS.prefs),
    },
  }
}
