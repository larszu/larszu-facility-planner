import { beforeEach, describe, expect, it } from 'vitest'
import { aderAnlegen, aderUmbenennen, etageEntfernen, etageVerschieben } from '../pflege'
import { heileGebaeude, leeresGebaeude, type Gebaeude } from '../modell'
import { useGebaeudeStore } from '../store/gebaeudeStore'

// ---------------------------------------------------------------------------
// Pflege-Schritte, die abgelehnt werden können (`pflege.ts`).
//
// Gemessen wird vor allem, was NICHT passieren darf: eine Etage verschwindet
// und nimmt still die Angabe ihrer Räume mit, oder eine Ader wird umbenannt
// und lässt das Plan-Kabel auf einem Namen zurück, den es nicht mehr gibt.
// ---------------------------------------------------------------------------

const haus = (): Gebaeude =>
  heileGebaeude({
    ...leeresGebaeude('h', 'Haus'),
    etagen: [
      { id: 'e-ug', name: 'UG', hoeheM: -3.5 },
      { id: 'e-eg', name: 'EG', hoeheM: 0 },
      { id: 'e-og', name: 'OG' },
    ],
    raeume: [
      { id: 'r-saal', name: 'Saal', etageId: 'e-eg', hausbezeichner: 'EG.01' },
      { id: 'r-foyer', name: 'Foyer', etageId: 'e-eg', hausbezeichner: 'EG.02' },
      { id: 'r-regie', name: 'Regie', hausbezeichner: 'OG.04' },
    ],
    strecken: [
      {
        id: 's1',
        bezeichnung: 'Tie-Line',
        vonRaumId: 'r-saal',
        nachRaumId: 'r-regie',
        adern: [{ nr: '1', stecker: 'BNC' }, { nr: '2' }],
      },
    ],
    zuordnungen: [
      { planKabelId: 'kabel-7', hausStreckeId: 's1', ader: '1' },
      { planKabelId: 'kabel-8', hausStreckeId: 's1' },
    ],
  })

describe('Etage entfernen (cable-planner#911)', () => {
  it('eine Etage mit Räumen wird ABGELEHNT, und die Räume werden genannt', () => {
    const e = etageEntfernen(haus(), 'e-eg')
    expect(e.ok).toBe(false)
    expect(!e.ok && e.grund).toContain('Saal, Foyer')
  })

  it('eine leere Etage geht, und sonst ändert sich nichts', () => {
    const vorher = haus()
    const e = etageEntfernen(vorher, 'e-og')
    expect(e.ok).toBe(true)
    if (!e.ok) return
    expect(e.gebaeude.etagen.map((x) => x.id)).toEqual(['e-ug', 'e-eg'])
    expect(e.gebaeude.raeume).toBe(vorher.raeume)
  })

  it('eine unbekannte Id ist nichts zu tun, kein Fehler', () => {
    const g = haus()
    expect(etageEntfernen(g, 'e-weg')).toEqual({ ok: true, gebaeude: g })
  })
})

describe('Etage verschieben', () => {
  it('tauscht mit dem Nachbarn', () => {
    expect(etageVerschieben(haus(), 'e-og', -1).etagen.map((e) => e.id)).toEqual(['e-ug', 'e-og', 'e-eg'])
    expect(etageVerschieben(haus(), 'e-ug', 1).etagen.map((e) => e.id)).toEqual(['e-eg', 'e-ug', 'e-og'])
  })

  it('am Rand bleibt alles, wie es ist', () => {
    const g = haus()
    expect(etageVerschieben(g, 'e-ug', -1)).toBe(g)
    expect(etageVerschieben(g, 'e-og', 1)).toBe(g)
  })
})

describe('Ader anlegen (Issue #15)', () => {
  it('hängt an und nimmt den Rand der Bezeichnung weg', () => {
    const e = aderAnlegen(haus(), 's1', { nr: ' 3 ', signal: 'Dante' })
    expect(e.ok && e.gebaeude.strecken[0]!.adern).toEqual([
      { nr: '1', stecker: 'BNC' },
      { nr: '2' },
      { nr: '3', signal: 'Dante' },
    ])
  })

  it('lehnt eine leere und eine doppelte Bezeichnung ab', () => {
    expect(aderAnlegen(haus(), 's1', { nr: '  ' }).ok).toBe(false)
    const doppelt = aderAnlegen(haus(), 's1', { nr: '2' })
    expect(!doppelt.ok && doppelt.grund).toContain('"2"')
  })

  it('beginnt die Liste, wo noch keine war', () => {
    const g = haus()
    g.strecken = [{ ...g.strecken[0]!, adern: undefined }]
    const e = aderAnlegen(g, 's1', { nr: 'SDI 1' })
    expect(e.ok && e.gebaeude.strecken[0]!.adern).toEqual([{ nr: 'SDI 1' }])
  })
})

describe('Ader umbenennen', () => {
  it('die Zuordnung zieht mit — dieselbe Ader, ein anderes Schild', () => {
    const e = aderUmbenennen(haus(), 's1', 0, 'SDI 1')
    expect(e.ok).toBe(true)
    if (!e.ok) return
    expect(e.gebaeude.strecken[0]!.adern![0]).toEqual({ nr: 'SDI 1', stecker: 'BNC' })
    expect(e.gebaeude.zuordnungen[0]).toEqual({ planKabelId: 'kabel-7', hausStreckeId: 's1', ader: 'SDI 1' })
    // Die Zuordnung auf die ganze Strecke bleibt, wie sie war.
    expect(e.gebaeude.zuordnungen[1]).toEqual({ planKabelId: 'kabel-8', hausStreckeId: 's1' })
  })

  it('lehnt einen Namen ab, den eine andere Ader schon trägt', () => {
    const e = aderUmbenennen(haus(), 's1', 0, '2')
    expect(e.ok).toBe(false)
  })

  it('bei doppeltem alten Namen bleibt die Zuordnung stehen — sie wäre geraten', () => {
    const g = haus()
    g.strecken = [{ ...g.strecken[0]!, adern: [{ nr: '1' }, { nr: '1' }] }]
    const e = aderUmbenennen(g, 's1', 1, '5')
    expect(e.ok && e.gebaeude.strecken[0]!.adern).toEqual([{ nr: '1' }, { nr: '5' }])
    expect(e.ok && e.gebaeude.zuordnungen[0]!.ader).toBe('1')
  })

  it('derselbe Name ist nichts zu tun', () => {
    const g = haus()
    expect(aderUmbenennen(g, 's1', 1, ' 2 ')).toEqual({ ok: true, gebaeude: g })
  })

  it('eine Stelle, die es nicht gibt, wird abgelehnt', () => {
    expect(aderUmbenennen(haus(), 's1', 5, '9').ok).toBe(false)
    expect(aderUmbenennen(haus(), 's-weg', 0, '9').ok).toBe(false)
  })
})

describe('der Store reicht die Ablehnung durch', () => {
  beforeEach(() => useGebaeudeStore.getState().gebaeudeSetzen(haus()))

  it('eine abgelehnte Etage bleibt stehen, und die Räume behalten sie', () => {
    const grund = useGebaeudeStore.getState().etageEntfernen('e-eg')
    const g = useGebaeudeStore.getState().gebaeude
    expect(grund).toBeDefined()
    expect(g.etagen.some((e) => e.id === 'e-eg')).toBe(true)
    expect(g.raeume.filter((r) => r.etageId === 'e-eg')).toHaveLength(2)
  })

  it('die letzte Ader entfernt heisst: nicht mehr beschrieben, nicht „führt nichts"', () => {
    const { aderEntfernen } = useGebaeudeStore.getState()
    aderEntfernen('s1', 1)
    aderEntfernen('s1', 0)
    expect('adern' in useGebaeudeStore.getState().gebaeude.strecken[0]!).toBe(false)
  })
})
