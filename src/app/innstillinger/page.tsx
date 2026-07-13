import type { Metadata } from 'next'
import { AppShell } from '@/components/AppShell'
import { SettingsView } from './SettingsView'

export const metadata: Metadata = {
  title: 'Innstillinger — SundayLicks',
  description:
    'Juster toneart, lyd, blavisning og øvingsstandarder — og eksporter eller nullstill dataene dine. Alt lagres lokalt på enheten din.',
}

// Modus-agnostisk side (ingen `mode` → bar merkevare-chrome i topbaren).
export default function InnstillingerPage() {
  return (
    <AppShell>
      <SettingsView />
    </AppShell>
  )
}
