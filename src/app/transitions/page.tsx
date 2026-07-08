import { redirect } from 'next/navigation'

// /transitions merged into "Spill smartere" (W4) — the kvintsirkel/overganger
// flow now lives at /spill's "Overganger"-fane. Kept as a redirect (not
// deleted) so old bookmarks and the website toolbox link keep working.
export default function TransitionsPage() {
  redirect('/spill?fane=overganger')
}
