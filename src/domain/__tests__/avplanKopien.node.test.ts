import { describe, expect, it } from 'vitest'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

// ───────────────────────────────────────────────────────────────────────────
// Kopien der Suite-Pakete sind unveraendert (ADR-015).
//
// `src/avplan/<paket>/` ist eine zeichengleiche Kopie aus
// `av-planner-suite/packages/<paket>/src`, eingespielt von
// `npm run pakete:verteilen` samt MANIFEST.json. Eine Aenderung HIER waere
// beim naechsten Verteilen still weg — und bis dahin eine zweite Fassung,
// genau die Sorte, die ADR-015 abschafft.
// ───────────────────────────────────────────────────────────────────────────

const WURZEL = resolve(__dirname, '../../avplan')

const quelldateien = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const voll = join(dir, name)
    if (statSync(voll).isDirectory()) return quelldateien(voll)
    return /\.(ts|tsx)$/.test(name) ? [voll] : []
  })

const pakete = existsSync(WURZEL) ? readdirSync(WURZEL).filter((n) => existsSync(join(WURZEL, n, 'MANIFEST.json'))) : []

describe('Kopien der Suite-Pakete (ADR-015)', () => {
  it('es gibt mindestens eine — sonst prueft der Test nichts', () => {
    expect(pakete.length).toBeGreaterThan(0)
  })

  for (const paket of pakete) {
    it(`${paket} entspricht seinem Manifest`, () => {
      const dir = join(WURZEL, paket)
      const manifest = JSON.parse(readFileSync(join(dir, 'MANIFEST.json'), 'utf8')) as { dateien: Record<string, string> }
      const abweichend: string[] = []
      for (const [datei, sha] of Object.entries(manifest.dateien)) {
        const p = join(dir, datei)
        const ist = existsSync(p) ? createHash('sha256').update(readFileSync(p, 'utf8')).digest('hex') : 'fehlt'
        if (ist !== sha) abweichend.push(datei)
      }
      for (const voll of quelldateien(dir)) {
        const rel = relative(dir, voll).split('\\').join('/')
        if (!manifest.dateien[rel]) abweichend.push(`${rel} (nicht im Manifest)`)
      }
      expect(
        abweichend,
        `Kopie eines Suite-Pakets (ADR-015) — Aenderung gehoert nach av-planner-suite/packages/${paket}, dann npm run pakete:verteilen`,
      ).toEqual([])
    })
  }
})
