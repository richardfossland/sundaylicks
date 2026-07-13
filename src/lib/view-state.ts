// View-state persistence: keep a page's browse/filter UI (which tab, which
// filters, which search, which expanded panels) alive across an in-app trip to
// the practice player and back, so returning does not silently reset everything
// the user had set up. Mirrors reel.ts's two-layer shape:
//   1. A pure, testable core (parseViewState) that never touches storage or the
//      clock — both are passed in — so validation + staleness are unit-testable.
//   2. Thin, window-guarded sessionStorage wrappers (loadViewState /
//      saveViewState / clearViewState) that degrade silently when storage is
//      blocked and are safe to import in a Node/SSR context.
//
// Each caller supplies its own `validate` so a corrupt or outdated blob (e.g. a
// filter value that no longer exists) is rejected wholesale rather than crashing
// the view — same defensive posture as reel.ts / session.ts.
//
// ⚠️ DELIBERATE DIFFERENCE FROM reel.ts: here `ts` is RE-STAMPED on EVERY save,
// so the 30-minute TTL measures "time since the last interaction", not time
// since the state was first created. reel.ts pins `ts` to when the shuffle SEED
// was minted (saving the scroll index must NOT rewrite it) because the reel
// needs a stable order for the whole session. View-state has no such invariant:
// filters just need to be *fresh* — an actively-used view keeps refreshing its
// own window, and one abandoned for half an hour is discarded so a much later
// visit starts clean. saveViewState therefore always writes a new ts.

/** How long a saved view stays "current" since the last interaction. */
export const VIEW_STATE_TTL_MS = 30 * 60 * 1000 // 30 minutes

// ── Pure core ────────────────────────────────────────────────────────────────

/**
 * Validate + parse a stored view blob. Returns null when it is absent, corrupt,
 * not a plain object, missing/`non-finite` `ts`, stale (last saved more than
 * VIEW_STATE_TTL_MS before `now`), or rejected by the caller's `validate` — i.e.
 * exactly the cases in which the caller should fall back to its defaults. The
 * boundary is inclusive: a blob saved exactly VIEW_STATE_TTL_MS ago is still
 * valid, one millisecond older is not (matches parseReelState).
 *
 * `validate` receives the parsed object (which still carries `ts`) and returns
 * the clean state it recognises, or null to reject the whole blob.
 */
export function parseViewState<T>(
  raw: string | null,
  validate: (data: Record<string, unknown>) => T | null,
  now: number,
): T | null {
  if (!raw) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null
  const obj = parsed as Record<string, unknown>
  if (typeof obj.ts !== 'number' || !Number.isFinite(obj.ts)) return null
  if (now - obj.ts > VIEW_STATE_TTL_MS) return null // stale — start from defaults
  return validate(obj)
}

// ── Storage (window-guarded, degrades silently) ─────────────────────────────

/**
 * The saved state for `key` if present, fresh, and accepted by `validate`;
 * otherwise null. Call this once, in a mount effect, so reading sessionStorage
 * stays out of the server render (hydration safety).
 */
export function loadViewState<T>(
  key: string,
  validate: (data: Record<string, unknown>) => T | null,
  now: number = Date.now(),
): T | null {
  if (typeof window === 'undefined') return null
  let raw: string | null = null
  try {
    raw = sessionStorage.getItem(key)
  } catch {
    return null
  }
  return parseViewState(raw, validate, now)
}

/**
 * Persist `state` under `key`, RE-STAMPING `ts` to `now` (see the header note:
 * the TTL tracks the last interaction). A no-op without `window` or when storage
 * is blocked. Should run from a save effect gated on the caller's hydratedRef so
 * it never fires before the restore has been applied.
 */
export function saveViewState(key: string, state: object, now: number = Date.now()): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(key, JSON.stringify({ ...state, ts: now }))
  } catch {
    /* storage full / blocked — ignore */
  }
}

/** Drop the saved state for `key`. A no-op without `window` or when blocked. */
export function clearViewState(key: string): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(key)
  } catch {
    /* blocked — ignore */
  }
}
