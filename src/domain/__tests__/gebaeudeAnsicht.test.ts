import { describe, expect, it } from 'vitest'
import {
  ERSATZ_BREITE_M,
  etagenHoehen,
  gebaeudeAnsicht,
  projiziere,
  raumEcken,
  tiefe,
} from '../gebaeudeAnsicht'
import { heileGebaeude, leeresGebaeude, type Gebaeude } from '../modell'
import { leseGebaeude, serialisiereGebaeude } from '../gebaeudeDatei'

// ---------------------------------------------------------------------------
// Die Gebaeude-Ansicht (QW12): Etagen uebereinander, Raeume darauf, Strecken
// und Trassen dazwischen. Geprueft wird die Rechnung, und vor allem, wo sie
// NICHT rechnet: eine fehlende Hoehe, eine fehlende Lage, ein fehlender Raum.
// ---------------------------------------------------------------------------

const haus = (): Gebaeude => ({
  ...leeresGebaeude('h', 'Haus'),
  etagen: [
    { id: 'eg', name: 'EG', hoeheM: 0 },
    { id: '1og', name: '1. OG' },
    { id: '2og', name: '2. OG', hoeheM: 8 },
  ],
  raeume: [
    { id: 'saal', name: 'Saal', hausbezeichner: '0.01', etageId: 'eg', lage: { xM: 0, yM: 0, breiteM: 20, tiefeM: 15 } },
    { id: 'regie', name: 'Regie', hausbezeichner: '2.12', etageId: '2og', lage: { xM: 22, yM: 0, breiteM: 6, tiefeM: 5 } },
    { id: 'foyer', name: 'Foyer', hausbezeichner: '1.05', etageId: '1og' },
    { id: 'lager', name: 'Lager', hausbezeichner: '0.07', etageId: 'eg' },
  ],
  strecken: [
    {
      id: 'hs1',
      bezeichnung: 'HS-01',
      vonRaumId: 'saal',
      nachRaumId: 'regie',
      adern: [{ nr: 'V1' }, { nr: 'V2' }, { nr: 'V3' }],
    },
    { id: 'hs2', bezeichnung: 'HS-02', vonRaumId: 'regie', nachRaumId: 'weg' },
  ],
  trassen: [{ id: 't1', bezeichnung: 'Steigschacht S1', vonRaumId: 'saal', nachRaumId: 'foyer', belegung: 'teilbelegt' }],
  zuordnungen: [{ planKabelId: 'k1', hausStreckeId: 'hs1', ader: 'V1' }],
})

const opt = { geschosshoeheM: 4 }

describe('etagenHoehen', () => {
  it('eine angegebene Hoehe gilt, eine fehlende wird gestapelt und markiert', () => {
    expect(etagenHoehen(haus().etagen, 4)).toEqual([
      { id: 'eg', name: 'EG', y: 0, hoeheAngenommen: false },
      { id: '1og', name: '1. OG', y: 4, hoeheAngenommen: true },
      { id: '2og', name: '2. OG', y: 8, hoeheAngenommen: false },
    ])
  })

  it('unter der ersten angegebenen Etage nach unten', () => {
    expect(etagenHoehen([{ id: 'ug', name: 'UG' }, { id: 'eg', name: 'EG', hoeheM: 0 }], 3).map((e) => e.y)).toEqual([-3, 0])
  })
})

describe('gebaeudeAnsicht', () => {
  it('stellt jeden Raum auf seine Etage und an seine Lage', () => {
    const a = gebaeudeAnsicht(haus(), opt)
    expect(a.raeume.find((r) => r.id === 'regie')).toMatchObject({ x: 22, z: 0, breite: 6, tiefe: 5, y: 8, lageAngenommen: false })
  })

  it('reiht einen Raum ohne Lage hinter die gelegten seiner Etage und sagt es', () => {
    const a = gebaeudeAnsicht(haus(), opt)
    const lager = a.raeume.find((r) => r.id === 'lager')!
    expect(lager.lageAngenommen).toBe(true)
    expect(lager.x).toBeGreaterThan(20)
    expect(lager.breite).toBe(ERSATZ_BREITE_M)
    const foyer = a.raeume.find((r) => r.id === 'foyer')!
    expect(foyer).toMatchObject({ x: 0, y: 4, lageAngenommen: true })
  })

  it('zieht eine Hausstrecke von Decke zu Decke und zaehlt freie Adern', () => {
    const a = gebaeudeAnsicht(haus(), opt)
    const hs1 = a.verbindungen.find((v) => v.id === 'hs1')!
    expect(hs1.art).toBe('strecke')
    expect(hs1.von).toEqual({ x: 10, y: 3, z: 7.5 })
    expect(hs1.nach).toEqual({ x: 25, y: 11, z: 2.5 })
    expect(hs1.adern).toEqual({ gesamt: 3, frei: 2 })
  })

  it('zaehlt eine Strecke ohne Raum, statt sie ins Leere zu ziehen', () => {
    const a = gebaeudeAnsicht(haus(), opt)
    expect(a.verbindungen.some((v) => v.id === 'hs2')).toBe(false)
    expect(a.nichtGezeichnet).toBe(1)
  })

  it('fuehrt Trassen neben Strecken, abschaltbar', () => {
    expect(gebaeudeAnsicht(haus(), opt).verbindungen.some((v) => v.art === 'trasse')).toBe(true)
    expect(gebaeudeAnsicht(haus(), { ...opt, trassen: false }).verbindungen.some((v) => v.art === 'trasse')).toBe(false)
    expect(gebaeudeAnsicht(haus(), { ...opt, strecken: false }).verbindungen.some((v) => v.art === 'strecke')).toBe(false)
  })

  it('laesst ausgeblendete Etagen und Raeume weg, samt ihren Verbindungen', () => {
    const a = gebaeudeAnsicht(haus(), { ...opt, ausgeblendeteEtagen: new Set(['2og']) })
    expect(a.raeume.some((r) => r.id === 'regie')).toBe(false)
    expect(a.verbindungen.some((v) => v.id === 'hs1')).toBe(false)
    const b = gebaeudeAnsicht(haus(), { ...opt, ausgeblendeteRaeume: new Set(['foyer']) })
    expect(b.raeume.some((r) => r.id === 'foyer')).toBe(false)
    expect(b.verbindungen.some((v) => v.id === 't1')).toBe(false)
  })

  it('zeigt einen Raum ohne Etage auf Bezugshoehe und markiert ihn', () => {
    const g = haus()
    g.raeume.push({ id: 'x', name: 'Irgendwo', hausbezeichner: 'X' })
    expect(gebaeudeAnsicht(g, opt).raeume.find((r) => r.id === 'x')).toMatchObject({ y: 0, ohneEtage: true })
  })
})

describe('Projektion', () => {
  const mitte = { x: 0, z: 0 }

  it('hebt einen hoeheren Punkt auf dem Bildschirm nach oben', () => {
    expect(projiziere({ x: 0, y: 4, z: 0 }, 0, mitte).y).toBeLessThan(projiziere({ x: 0, y: 0, z: 0 }, 0, mitte).y)
  })

  it('dreht in Vierteln: vier Drehungen sind keine', () => {
    const p = { x: 3, y: 1, z: -2 }
    const a = projiziere(p, 0, mitte)
    expect(projiziere(p, 2, mitte).x).toBeCloseTo(-a.x)
    expect(tiefe(p, 0, mitte)).toBeCloseTo(-tiefe(p, 2, mitte))
  })

  it('ein Raum hat acht Ecken zwischen Boden und Decke', () => {
    const r = gebaeudeAnsicht(haus(), opt).raeume[0]
    const e = raumEcken(r)
    expect(e).toHaveLength(8)
    expect(new Set(e.map((p) => p.y))).toEqual(new Set([r.y, r.y + r.hoehe]))
  })
})

describe('Lage in der Datei', () => {
  it('reist mit und kommt unveraendert zurueck', () => {
    const g = haus()
    const zurueck = leseGebaeude(serialisiereGebaeude(g))!
    expect(zurueck.raeume.find((r) => r.id === 'saal')!.lage).toEqual({ xM: 0, yM: 0, breiteM: 20, tiefeM: 15 })
  })

  it('eine unvollstaendige Lage faellt beim Heilen weg, eine gueltige bleibt dasselbe Objekt', () => {
    const g = haus()
    const kaputt = { ...g, raeume: [...g.raeume, { id: 'k', name: 'K', hausbezeichner: 'K', lage: { xM: 1, yM: 2 } as never }] }
    const geheilt = heileGebaeude(kaputt)
    expect(geheilt.raeume.find((r) => r.id === 'k')!.lage).toBeUndefined()
    expect(heileGebaeude(g).raeume).toBe(g.raeume)
  })
})
