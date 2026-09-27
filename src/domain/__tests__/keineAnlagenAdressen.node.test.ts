import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

// ───────────────────────────────────────────────────────────────────────────
// Keine Anlagen-Adressen im Repo.
//
// Das Repo ist oeffentlich, und seit Issue #2 stehen hier Crestron- und
// Vissonic-Klinken — also genau die Geraete, deren echte Adressen es gibt.
// In `av-control-center` musste am 2026-09-22 die Historie neu geschrieben
// werden, weil die Adressen der Anlage im damals oeffentlichen Repo standen.
// Beispiele und Tests nehmen Platzhalter-Hostnamen (`kamera-1.lan`); echte
// Adressen gehoeren in das Dokument des Betreibers, nicht in den Quelltext.
// ───────────────────────────────────────────────────────────────────────────

const WURZEL = resolve(__dirname, '../../..')
const ORTE = ['src', 'electron', 'scripts', 'public', 'index.html', 'README.md', 'CLAUDE.md']
const PRIVAT = /\b(?:10\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])|192\.168)\.\d{1,3}\.\d{1,3}\b/g

function dateien(pfad: string): string[] {
  let st
  try {
    st = statSync(pfad)
  } catch {
    return []
  }
  if (st.isFile()) return [pfad]
  return readdirSync(pfad).flatMap((n) => (n === 'node_modules' ? [] : dateien(join(pfad, n))))
}

describe('Anlagen-Adressen', () => {
  it('stehen in keiner Datei des Repos', () => {
    const funde = ORTE.flatMap((o) => dateien(join(WURZEL, o)))
      .filter((d) => !d.endsWith('keineAnlagenAdressen.node.test.ts'))
      .flatMap((d) => (readFileSync(d, 'utf8').match(PRIVAT) ?? []).map((ip) => `${d}: ${ip}`))
    expect(funde).toEqual([])
  })

  it('erkennt, wogegen er steht', () => {
    // GEGENPROBE: ein Muster, das nichts findet, beweist nichts.
    expect('kamera 192.168.1.20'.match(PRIVAT)).toEqual(['192.168.1.20'])
    expect('10.0.0.5 und 172.20.1.1'.match(PRIVAT)).toEqual(['10.0.0.5', '172.20.1.1'])
    expect('Version 10.9.7, 172.32.0.1'.match(PRIVAT)).toBeNull()
  })
})
