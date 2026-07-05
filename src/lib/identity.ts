// Per-device anonymous id, held in localStorage. Used as `submitted_by` on
// user-contributed licks (PLAN §6 Fase 4) — no auth, just a stable handle.

const KEY = 'sundaylicks_user_id'

export function getUserId(): string {
  if (typeof window === 'undefined') return 'anon'
  let id = localStorage.getItem(KEY)
  if (!id) {
    id = 'u_' + crypto.randomUUID()
    localStorage.setItem(KEY, id)
  }
  return id
}
