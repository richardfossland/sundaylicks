import { redirect } from 'next/navigation'

// /spice merged into "Spill smartere" (W4) — the "krydre en akkord/progresjon"
// flow now lives at /spill's "Krydre"-fane. Kept as a redirect (not deleted)
// so old bookmarks and the website toolbox link keep working.
export default function SpicePage() {
  redirect('/spill?fane=krydre')
}
