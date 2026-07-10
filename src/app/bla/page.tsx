import type { Metadata } from 'next'
import { AppShell } from '@/components/AppShell'
import { BlaView } from './BlaView'

export const metadata: Metadata = {
  title: 'Bla gjennom licks — SundayLicks',
  description:
    'Bla deg gjennom hele lick-biblioteket som en feed: hør og se hver lick, hopp videre — eller trykk deg inn og øv.',
}

// Ingen useSearchParams i treet → ingen Suspense-boundary nødvendig.
export default function BlaPage() {
  return (
    <AppShell mode="ove">
      <BlaView />
    </AppShell>
  )
}
