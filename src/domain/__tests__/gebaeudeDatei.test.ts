import { describe, expect, it } from 'vitest'
import {
  FACILITY_FORMAT,
  FACILITY_FORMAT_VERSION,
  leseGebaeude,
  serialisiereGebaeude,
} from '../gebaeudeDatei'
import { heileGebaeude, leeresGebaeude, type Gebaeude } from '../modell'
import { ort } from '../vertrag'

// ───────────────────────────────────────────────────────────────────────────
// Die Gebäude-Datei (Issue #2, letzter offener Haken).
//
// Was hier zählt, ist nicht „JSON geht rein und raus", sondern die eine
// Zusage, an der der ganze Vertrag hängt: **„nicht angegeben" ist nicht
// „nein".** Beim Lesen ist sie leichter zu brechen als beim Rechnen — ein
// `?? false` in der Heilung sieht nach Sorgfalt aus und macht aus „das Haus
// sagt nichts dazu" die Zusicherung „diese Dose hängt an keinem Schalter".
// Danach plant jemand ein Netzteil darauf.
// ───────────────────────────────────────────────────────────────────────────

const haus = (): Gebaeude => {
  const g = leeresGebaeude('haus-1', 'Stadthalle')
  g.etagen.push({ id: 'e1', name: 'EG', hoeheM: 0 })
  g.raeume.push({ id: 'r1', name: 'Saal', etageId: 'e1', hausbezeichner: 'EG.01' })
  g.punkte.push({
    id: 'p1',
    bezeichnung: 'Bühne links',
    art: 'einspeisung',
    raumId: 'r1',
    anschlussart: 'cee32',
    netzform: 'TN-S',
    absicherungA: 32,
    charakteristik: 'C',
    rcdTyp: 'A',
    montage: 'boden',
    bauform: 'bodentank',
    // ABSICHTLICH nicht gesetzt: `geschaltet` und `dauerleistungW`.
    // Genau diese beiden dürfen den Weg durch die Datei nicht als `false`
    // bzw. `0` überleben.
  })
  g.raeume.push({ id: 'r2', name: 'Regie', hausbezeichner: '1.04' })
  g.strecken.push({
    id: 's1',
    bezeichnung: 'Tie-Line Saal–Regie',
    vonRaumId: 'r1',
    nachRaumId: 'r2',
    vonBlende: 'B2',
    nachBlende: 'Wandfeld 1.OG-West',
    adern: [{ nr: '1', stecker: 'BNC', signal: '12G-SDI' }, { nr: '2' }],
  })
  g.zuordnungen.push({ planKabelId: 'kabel-7', hausStreckeId: 's1', ader: '1', erklaertVon: 'LZ' })
  g.klinken.push({
    id: 'k1',
    system: 'dali',
    adresse: '7',
    adressart: 'kurz',
    richtung: 'schalten',
    bedeutung: 'Saallicht Reihe 1',
  })
  return g
}

describe('avplan-facility: die Auskunft des Hauses als Datei', () => {
  it('1. der Round-Trip verliert nichts', () => {
    const g = haus()
    const zurueck = leseGebaeude(serialisiereGebaeude(g))
    expect(zurueck).toEqual(g)
  })

  it('2. „nicht angegeben" bleibt nicht angegeben — kein `?? false`', () => {
    const zurueck = leseGebaeude(serialisiereGebaeude(haus()))
    const p = zurueck!.punkte[0]!
    expect(p.geschaltet, 'aus „keine Angabe" darf kein „hängt an keinem Schalter" werden').toBeUndefined()
    expect(p.dauerleistungW, 'und keine gerechnete Dauerleistung').toBeUndefined()
  })

  it('3. die Klinke kommt mit Adressart heraus, wie sie hineinging', () => {
    // Der Unterschied zwischen DALI-Kurzadresse und Gruppenadresse ist der
    // Unterschied zwischen „eine Leuchte" und „die halbe Halle".
    const k = leseGebaeude(serialisiereGebaeude(haus()))!.klinken[0]!
    expect(k.adressart).toBe('kurz')
    expect(k.bedeutung).toBe('Saallicht Reihe 1')
  })

  it('4. eine fremde Datei wird abgewiesen und nicht halb gelesen', () => {
    expect(leseGebaeude('kein json')).toBeNull()
    expect(leseGebaeude(JSON.stringify({ format: 'etwas-anderes', version: 1 }))).toBeNull()
    expect(leseGebaeude(JSON.stringify({ format: FACILITY_FORMAT, version: 1 }))).toBeNull()
  })

  it('5. eine NEUERE Fassung wird abgewiesen', () => {
    // Halb zu lesen waere hier teurer als gar nicht: die fehlenden Felder
    // sind Auskuenfte ueber Strom, an denen jemand eine Last plant.
    const zuNeu = JSON.stringify({
      format: FACILITY_FORMAT,
      version: FACILITY_FORMAT_VERSION + 1,
      gebaeude: haus(),
    })
    expect(leseGebaeude(zuNeu)).toBeNull()
  })

  it('6. fehlende Listen werden ergänzt, damit niemand über `undefined` läuft', () => {
    // Der Unterschied zur Regel oben: eine LISTE, die es geben MUSS, ist
    // keine Auskunft — sie ist Gerüst. Eine fehlende `punkte`-Liste heisst
    // „keine eingetragen", und das ist eine leere Liste.
    const duenn = JSON.stringify({
      format: FACILITY_FORMAT,
      version: 1,
      gebaeude: { id: 'haus-2', name: 'Halle 2' },
    })
    const g = leseGebaeude(duenn)
    expect(g?.punkte).toEqual([])
    expect(g?.klinken).toEqual([])
    expect(g?.name).toBe('Halle 2')
  })

  it('7. ein Grundriss-BILD reist nicht mit', () => {
    // Sonst wird aus einer 30-kB-Auskunft eine 4-MB-Datei, die per Mail
    // nicht mehr durchgeht. Der Plan braucht die Lage in Metern.
    const json = serialisiereGebaeude(haus())
    expect(json).not.toContain('data:image')
    expect(json).not.toContain('base64')
  })

  it('8. geschrieben wird Version 2', () => {
    expect(FACILITY_FORMAT_VERSION).toBe(2)
    expect(JSON.parse(serialisiereGebaeude(haus())).version).toBe(2)
  })

  it('9. Etagen, Blenden, Adern und die Ader der Zuordnung überstehen die Runde', () => {
    const g = leseGebaeude(serialisiereGebaeude(haus()))!
    expect(g.etagen).toEqual([{ id: 'e1', name: 'EG', hoeheM: 0 }])
    expect(g.raeume[0]!.etageId).toBe('e1')
    expect(g.strecken[0]).toMatchObject({ vonBlende: 'B2', nachBlende: 'Wandfeld 1.OG-West' })
    expect(g.strecken[0]!.adern).toEqual([{ nr: '1', stecker: 'BNC', signal: '12G-SDI' }, { nr: '2' }])
    expect(g.zuordnungen[0]!.ader).toBe('1')
  })

  it('10. eine Etage in Höhe 0 bleibt 0, eine ohne Höhe bleibt ohne', () => {
    // 0 heisst „auf Bezugshöhe", fehlend heisst „nicht angegeben".
    const h = haus()
    h.etagen.push({ id: 'e2', name: '1. OG' })
    const g = leseGebaeude(serialisiereGebaeude(h))!
    expect(g.etagen[0]!.hoeheM).toBe(0)
    expect('hoeheM' in g.etagen[1]!).toBe(false)
  })
})

// ─── Version 1: so, wie sie am 2026-09-18 geschrieben wurde ────────────────
//
// Wörtlich als JSON und nicht über `haus()`: das Modell hat das Feld `etage`
// nicht mehr, und eine über das Modell gebaute v1-Datei wäre schon keine mehr.

const V1 = JSON.stringify({
  format: 'avplan-facility',
  version: 1,
  exportiertAm: '2026-09-18T10:00:00.000Z',
  app: 'facility-planner',
  gebaeude: {
    id: 'haus-alt',
    name: 'Altbau',
    raeume: [
      { id: 'r1', name: 'Saal', etage: 'EG', hausbezeichner: 'EG.01' },
      { id: 'r2', name: 'Foyer', etage: 'EG ', hausbezeichner: 'EG.02' },
      { id: 'r3', name: 'Regie', etage: '1. OG', hausbezeichner: 'OG1.04' },
      { id: 'r4', name: 'Lager', etage: '', hausbezeichner: 'UG.01' },
      { id: 'r5', name: 'Technik', hausbezeichner: 'UG.02' },
    ],
    punkte: [],
    stromkreise: [],
    verteilungen: [],
    klinken: [],
    strecken: [{ id: 's1', bezeichnung: 'Tie-Line Saal–Regie', vonRaumId: 'r1', nachRaumId: 'r3' }],
    trassen: [],
    schaltstellen: [],
    zuordnungen: [{ planKabelId: 'kabel-7', hausStreckeId: 's1', erklaertVon: 'LZ' }],
    maengel: [],
  },
})

describe('avplan-facility v1 wird weiter gelesen und geheilt', () => {
  it('1. aus dem Freitext werden Etagen, und die Räume verweisen darauf', () => {
    const g = leseGebaeude(V1)!
    expect(g.etagen).toEqual([
      { id: 'etage:EG', name: 'EG' },
      { id: 'etage:1. OG', name: '1. OG' },
    ])
    // „EG" und „EG " sind dieselbe Etage: der Rand ist kein Name.
    expect(g.raeume.map((r) => r.etageId)).toEqual([
      'etage:EG',
      'etage:EG',
      'etage:1. OG',
      undefined,
      undefined,
    ])
  })

  it('2. das Freitextfeld ist danach weg — eine Wahrheit, nicht zwei', () => {
    const g = leseGebaeude(V1)!
    for (const r of g.raeume) expect('etage' in r, r.id).toBe(false)
  })

  it('3. ein leerer Freitext wird keine Etage und kein Verweis', () => {
    const lager = leseGebaeude(V1)!.raeume.find((r) => r.id === 'r4')!
    expect('etageId' in lager).toBe(false)
  })

  it('4. der Vertrag antwortet wie unter v1', () => {
    const g = leseGebaeude(V1)!
    expect(ort(g, 'r3')).toMatchObject({ gefunden: true, etage: '1. OG', hausbezeichner: 'OG1.04' })
    expect('etage' in ort(g, 'r5')).toBe(false)
  })

  it('5. Strecken und Zuordnungen bekommen nichts dazu, was niemand angegeben hat', () => {
    // Eine v1-Strecke hat keine beschriebenen Adern. `adern: []` hiesse
    // „führt nichts", und eine Zuordnung ohne Ader gilt weiter der ganzen Strecke.
    const g = leseGebaeude(V1)!
    expect(g.strecken[0]).toEqual({
      id: 's1',
      bezeichnung: 'Tie-Line Saal–Regie',
      vonRaumId: 'r1',
      nachRaumId: 'r3',
    })
    expect(g.zuordnungen[0]).toEqual({ planKabelId: 'kabel-7', hausStreckeId: 's1', erklaertVon: 'LZ' })
  })

  it('6. die Heilung ist idempotent — zweimal geheilt ist einmal geheilt', () => {
    const einmal = leseGebaeude(V1)!
    expect(heileGebaeude(einmal)).toEqual(einmal)
    expect(heileGebaeude(heileGebaeude(einmal))).toEqual(einmal)
  })

  it('7. dieselbe v1-Datei ergibt überall dieselben Etagen-Ids', () => {
    // Beim Laden, beim Einlesen, in der Suite: wer zweimal heilt, bekommt
    // dasselbe Gebäude und nicht zwei mit verschiedenen Etagen.
    expect(leseGebaeude(V1)).toEqual(leseGebaeude(V1))
  })

  it('8. als v2 geschrieben und wieder gelesen bleibt alles, wie es war', () => {
    const g = leseGebaeude(V1)!
    expect(leseGebaeude(serialisiereGebaeude(g))).toEqual(g)
  })
})

describe('Freitext-Etagen neben schon vorhandenen Etagen', () => {
  // Ein Dokument, das halb umgestellt ist — etwa ein Raum, der den Umweg
  // über ein Werkzeug gegangen ist, das `etage` noch schreibt.
  const gemischt = (): Gebaeude =>
    ({
      ...leeresGebaeude('h', 'Haus'),
      etagen: [
        { id: 'e-eg', name: 'EG', hoeheM: 0 },
        { id: 'etage:UG', name: 'Keller' },
      ],
      raeume: [
        { id: 'r1', name: 'Saal', etage: 'EG', hausbezeichner: 'S' },
        { id: 'r2', name: 'Regie', etageId: 'e-eg', etage: '1. OG', hausbezeichner: 'R' },
        { id: 'r3', name: 'Lager', etage: 'UG', hausbezeichner: 'L' },
      ],
    }) as unknown as Gebaeude

  it('eine Etage gleichen Namens wird benutzt und nicht verdoppelt', () => {
    const g = heileGebaeude(gemischt())
    expect(g.raeume[0]!.etageId).toBe('e-eg')
    expect(g.etagen.filter((e) => e.name === 'EG')).toHaveLength(1)
  })

  it('ein schon gesetzter Verweis gewinnt gegen den Freitext', () => {
    const g = heileGebaeude(gemischt())
    expect(g.raeume[1]!.etageId).toBe('e-eg')
    expect(g.etagen.some((e) => e.name === '1. OG')).toBe(false)
  })

  it('eine belegte Id wird nicht überschrieben, sondern weitergezählt', () => {
    // „etage:UG" gehört schon der Etage „Keller". Eine zweite Etage unter
    // derselben Id machte aus zwei Stockwerken eines.
    const g = heileGebaeude(gemischt())
    expect(g.raeume[2]!.etageId).toBe('etage:UG:2')
    expect(g.etagen.find((e) => e.id === 'etage:UG')!.name).toBe('Keller')
    expect(g.etagen.find((e) => e.id === 'etage:UG:2')!.name).toBe('UG')
  })
})

describe('beschaedigte Raum-Eintraege', () => {
  it('ein null-Raum bringt die Etagen-Migration nicht zum Absturz', () => {
    const roh = {
      ...leeresGebaeude('g', 'Halle'),
      raeume: [null, { id: 'r1', name: 'Saal', hausbezeichner: 'S', etage: 'EG' }],
    } as unknown as Gebaeude
    const g = heileGebaeude(roh)
    expect(g.etagen.map((e) => e.name)).toEqual(['EG'])
  })
})
