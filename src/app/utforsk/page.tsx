import { redirect } from 'next/navigation'

// /utforsk was folded into /ove (W2 — the "Øv"-modus library workspace).
// Kept as a redirect for old links/bookmarks rather than a 404.
export default function UtforskPage() {
  redirect('/ove')
}
