// Samler all lokal SundayLicks-data til ett JSON-objekt for «Eksporter dataene
// mine» i /innstillinger. Ren funksjon: tar en lagrings-lignende avleser
// (localStorage eller en test-shim) så kjernen kan testes uten DOM. Null-trygt —
// en nøkkel som mangler blir `null` i stedet for å kaste, og blokkert lagring
// gir en tom, gyldig konvolutt.
//
// ⚠️ v1 listet fire nøkler for hånd (progress/collections/session/prefs) og gikk
// dermed glipp av alt som er kommet til siden: daily, reel, reel_autoplay,
// onboarded, seen_intro, user_id … «Nullstill»-knappen i SettingsView feier
// derimot HELE `sundaylicks_`-prefikset. De to var altså uenige: brukeren fikk
// slettet mer enn hen fikk eksportert. v2 snur det om — vi går gjennom lageret
// og tar med ALT under prefikset, så eksport og nullstilling dekker det samme.
//
// sessionStorage er bevisst utelatt: der ligger bare flyktig visningstilstand
// (view-state/reel-rekkefølge med 30-minutters levetid), ikke data brukeren
// eier. Nullstilling feier den også, men det er ingenting å ta vare på der.

/** Prefikset ALLE appens lagringsnøkler deler. Eksport og nullstilling bruker det samme. */
export const EXPORT_PREFIX = 'sundaylicks_'

/** Nøkler som alltid er med i konvolutten (som `null` når de mangler) — v1-formen. */
const CORE_KEYS = ['progress', 'collections', 'session', 'prefs'] as const

/** Den lille delen av Storage-grensesnittet vi trenger (localStorage oppfyller den). */
export interface StorageLike {
  readonly length: number
  key(index: number): string | null
  getItem(key: string): string | null
}

export interface ExportBundle {
  app: 'sundaylicks'
  version: 2
  exportedAt: string
  /**
   * Én oppføring per lagringsnøkkel, uten prefikset (`sundaylicks_progress`
   * → `progress`). De fire v1-nøklene er alltid til stede, så gamle lesere
   * finner formen sin igjen.
   */
  data: Record<string, unknown> & {
    progress: unknown
    collections: unknown
    session: unknown
    prefs: unknown
  }
}

/**
 * Parser en lagret verdi. JSON der det er JSON; ellers råstrengen — flere
 * nøkler (f.eks. `sundaylicks_user_id`) lagrer en naken streng, og en eksport
 * som kastet dem ville ikke vært en fullstendig kopi av brukerens data.
 */
function readValue(storage: StorageLike, key: string): unknown {
  let raw: string | null
  try {
    raw = storage.getItem(key)
  } catch {
    return null
  }
  if (raw === null) return null
  try {
    return JSON.parse(raw)
  } catch {
    return raw
  }
}

export function collectExportData(storage: StorageLike): ExportBundle {
  // Grunnformen: v1-nøklene er alltid med, som null til løkka evt. fyller dem.
  const data = Object.fromEntries(CORE_KEYS.map((k) => [k, null])) as ExportBundle['data']

  // Samle nøkkelnavnene først: å lese ut mens vi itererer over indekser er
  // sårbart hvis lageret endrer seg under oss.
  const keys: string[] = []
  try {
    for (let i = 0; i < storage.length; i++) {
      const k = storage.key(i)
      if (k && k.startsWith(EXPORT_PREFIX) && k.length > EXPORT_PREFIX.length) keys.push(k)
    }
  } catch {
    /* lagring blokkert — vi svarer med en tom, gyldig konvolutt */
  }

  for (const full of keys) {
    data[full.slice(EXPORT_PREFIX.length)] = readValue(storage, full)
  }

  return {
    app: 'sundaylicks',
    version: 2,
    exportedAt: new Date().toISOString(),
    data,
  }
}
