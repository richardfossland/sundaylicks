// Per-device anonymous id, held in localStorage. Used as `submitted_by` on
// user-contributed licks (PLAN §6 Fase 4) — no auth, just a stable handle.
//
// ⚠️ localStorage KAN kaste, ikke bare returnere null: Safari i privat modus
// (og «blokker alle informasjonskapsler» i flere nettlesere) kaster
// SecurityError/QuotaExceededError både på getItem og setItem. Uten vakt boblet
// unntaket opp gjennom innsendingsskjemaet og ble vist som «Nettverksfeil —
// prøv igjen», altså en umulig-å-forstå blindvei der innsending aldri kunne
// lykkes. Derfor: alt i try/catch, med en STABIL id i minnet som reserve — den
// varer så lenge fana lever, så to innsendinger i samme økt får samme handle
// (og teller mot samme kvote i /api/submit).

const KEY = 'sundaylicks_user_id'

/** Reserve-id når lagring er blokkert. Mintes én gang per lastet side. */
let memoryId: string | null = null

function fallbackId(): string {
  if (!memoryId) memoryId = 'u_' + crypto.randomUUID()
  return memoryId
}

export function getUserId(): string {
  if (typeof window === 'undefined') return 'anon'
  try {
    const existing = localStorage.getItem(KEY)
    if (existing) return existing
    const id = 'u_' + crypto.randomUUID()
    localStorage.setItem(KEY, id)
    return id
  } catch {
    // Lagring blokkert (privat modus / cookies av) — kjør videre på minne-id.
    return fallbackId()
  }
}
