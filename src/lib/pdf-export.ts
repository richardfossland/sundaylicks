import { Renderer, Stave, Voice, Formatter, StaveConnector } from 'vexflow'
import type { Lick } from '@/types/lick'
import { transposedNotes } from './transpose'
import { buildStaveNotes } from './notation'
import { KEY_NAMES } from './music'

// Render a lick's notation to black-ink SVG and open it in a print window, so
// the browser's "Save as PDF" produces printable sheet music. Reuses the same
// buildStaveNotes() as the on-screen Notation component. Dependency-free.

function renderSvg(lick: Lick, targetKey: number): string {
  const notes = transposedNotes(lick, targetKey)
  const host = document.createElement('div')
  host.style.position = 'fixed'
  host.style.left = '-9999px'
  document.body.appendChild(host)
  try {
    const width = Math.max(360, 90 + lick.beats * 62)
    const renderer = new Renderer(host, Renderer.Backends.SVG)
    renderer.resize(width, 230)
    const ctx = renderer.getContext()
    const staveW = width - 20
    const treble = new Stave(10, 10, staveW).addClef('treble').addTimeSignature(lick.time_signature)
    const bass = new Stave(10, 110, staveW).addClef('bass').addTimeSignature(lick.time_signature)
    treble.setContext(ctx).draw()
    bass.setContext(ctx).draw()
    new StaveConnector(treble, bass).setType('brace').setContext(ctx).draw()
    new StaveConnector(treble, bass).setType('singleLeft').setContext(ctx).draw()
    for (const [hand, stave] of [['R', treble], ['L', bass]] as const) {
      const v = new Voice({ num_beats: lick.beats, beat_value: 4 }).setStrict(false)
      v.addTickables(buildStaveNotes(notes, hand, lick.beats))
      new Formatter().joinVoices([v]).format([v], staveW - 60)
      v.draw(ctx, stave)
    }
    return host.querySelector('svg')?.outerHTML ?? ''
  } finally {
    document.body.removeChild(host)
  }
}

export function printLickSheet(lick: Lick, targetKey: number, bpm: number) {
  const svg = renderSvg(lick, targetKey)
  const w = window.open('', '_blank')
  if (!w) return
  const title = lick.name
  const meta = `${KEY_NAMES[targetKey]}-dur · ${bpm} BPM`
  w.document.write(
    `<!doctype html><html><head><title>${title}</title>` +
      `<style>body{font-family:Georgia,serif;margin:40px;color:#111}` +
      `h1{font-size:24px;margin:0 0 4px}p{margin:0 0 20px;color:#555}` +
      `svg{max-width:100%}footer{margin-top:24px;color:#999;font-size:12px}</style></head>` +
      `<body><h1>${title}</h1><p>${meta}</p>${svg}` +
      `<footer>SundayLicks — licks.sundaysuite.app</footer>` +
      `<script>window.onload=function(){window.print()}</script></body></html>`,
  )
  w.document.close()
}
