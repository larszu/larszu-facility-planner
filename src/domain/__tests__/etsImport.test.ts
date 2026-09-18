// ───────────────────────────────────────────────────────────────────────────
// Der ETS-Gruppenadress-Export (#2).
//
// Die wichtigste Aussage steht im letzten Block: heraus kommen KANDIDATEN und
// keine Klinken. Eine ETS-Datei enthaelt alle Gruppenadressen des Hauses —
// auch Notlicht und Heizung. Sie alle freizugeben hiesse, eine Freigabe zu
// erfinden, die niemand erteilt hat.
// ───────────────────────────────────────────────────────────────────────────
import { describe, expect, it } from 'vitest'
import { adressArt, erkenneTrenner, leseEtsExport } from '../etsImport'

// Aufbau nach der Formatdoku der KNX Association (Group Address Export) und
// der Beschreibung in `waldbaer/knx-ga-exporter`.
const KOPF = '"Group name";"Address";"Central";"Unfiltered";"Description";"DatapointType";"Security"'
const DATEI = [
  KOPF,
  '"Light & Power";"0/-/-";"";"";"";"";"Auto"',
  '"Basement";"0/0/-";"";"";"";"";"Auto"',
  '"B0-0-L - Ceiling light - Switch";"0/0/1";"";"";"Kommentar";"DPST-1-1";"Auto"',
  '"B0-0-L - Ceiling light - Status";"0/0/2";"";"";"";"DPST-1-11";"Auto"',
].join('\n')

describe('erkenneTrenner', () => {
  it('erkennt Semikolon, Komma und Tabulator', () => {
    expect(erkenneTrenner('"a";"b";"c"')).toBe(';')
    expect(erkenneTrenner('"a","b","c"')).toBe(',')
    expect(erkenneTrenner('"a"\t"b"\t"c"')).toBe('\t')
  })

  it('laesst sich von einem Trenner IM Namen nicht taeuschen', () => {
    // „Kueche, Decke" ist ein zulaessiger Gruppenname. Ein Leser, der ihn
    // mitzaehlt, waehlt das Komma und zerlegt danach jede Zeile falsch.
    expect(erkenneTrenner('"Kueche, Decke";"0/0/1";"";"";"";"";"Auto"')).toBe(';')
  })
})

describe('adressArt', () => {
  it('nimmt die drei Darstellungen der ETS an', () => {
    expect(adressArt('1/2/3')).toBe('adresse')
    expect(adressArt('1/300')).toBe('adresse')
    expect(adressArt('2563')).toBe('adresse')
  })

  it('erkennt Ordner-Zeilen an der Stufe mit Strich', () => {
    expect(adressArt('0/-/-')).toBe('ordner')
    expect(adressArt('0/0/-')).toBe('ordner')
    expect(adressArt('0/-')).toBe('ordner')
  })

  it('haelt sich an die Grenzen des Protokolls', () => {
    // Eine 32/1/1 gibt es nicht. Sie durchzulassen hiesse, eine Adresse
    // anzubieten, die kein Geraet je hoert.
    expect(adressArt('32/1/1')).toBe('unlesbar')
    expect(adressArt('1/8/1')).toBe('unlesbar')
    expect(adressArt('1/1/256')).toBe('unlesbar')
    expect(adressArt('1/2048')).toBe('unlesbar')
    expect(adressArt('0')).toBe('unlesbar')
    expect(adressArt('')).toBe('unlesbar')
    expect(adressArt('Erdgeschoss')).toBe('unlesbar')
  })
})

describe('leseEtsExport', () => {
  it('liest die Adressen und ueberspringt die Ordner', () => {
    const b = leseEtsExport(DATEI)
    expect(b.kopfzeile).toBe(true)
    expect(b.trenner).toBe(';')
    expect(b.ordner).toBe(2)
    expect(b.kandidaten.map((k) => k.adresse)).toEqual(['0/0/1', '0/0/2'])
    expect(b.kandidaten[0]!.name).toBe('B0-0-L - Ceiling light - Switch')
    expect(b.kandidaten[0]!.beschreibung).toBe('Kommentar')
    expect(b.kandidaten[0]!.datenpunkt).toBe('DPST-1-1')
  })

  it('kommt auch ohne Kopfzeile zurecht', () => {
    // ETS bietet sie als Option an — „Export mit Kopfzeile".
    const b = leseEtsExport(DATEI.split('\n').slice(1).join('\n'))
    expect(b.kopfzeile).toBe(false)
    expect(b.kandidaten).toHaveLength(2)
  })

  it('zaehlt, was es nicht lesen konnte, statt es zu verschweigen', () => {
    // Ein Import, der still die Haelfte weglaesst, ist schlimmer als einer,
    // der gar nicht laeuft.
    const b = leseEtsExport([KOPF, '"Kaputt";"99/9/9";"";"";"";"";"Auto"'].join('\n'))
    expect(b.unlesbar).toBe(1)
    expect(b.kandidaten).toHaveLength(0)
    expect(b.grund).toBeTruthy()
  })

  it('nennt doppelte Adressen und nimmt die erste', () => {
    const b = leseEtsExport(
      [
        KOPF,
        '"Erste";"1/1/1";"";"";"";"";"Auto"',
        '"Zweite";"1/1/1";"";"";"";"";"Auto"',
      ].join('\n'),
    )
    expect(b.doppelt).toEqual(['1/1/1'])
    expect(b.kandidaten).toHaveLength(1)
    expect(b.kandidaten[0]!.name).toBe('Erste')
  })

  it('sagt bei einer leeren Datei, was los ist', () => {
    expect(leseEtsExport('   ').grund).toBeTruthy()
    expect(leseEtsExport('   ').kandidaten).toHaveLength(0)
  })

  it('haelt ein maskiertes Anfuehrungszeichen aus', () => {
    const b = leseEtsExport('"Saal ""gross""";"1/1/1";"";"";"";"";"Auto"')
    expect(b.kandidaten[0]!.name).toBe('Saal "gross"')
  })

  it('liefert Kandidaten und keine Klinken', () => {
    // Die Aussage dieser Datei. Ein Kandidat hat KEINE Richtung und KEINE
    // Bedeutung — beides entscheidet der Mensch, der freigibt. Der
    // Gruppenname ist ein Vorschlag und kein Ersatz: er stammt vom
    // Programmierer der Anlage, nicht vom Betreiber.
    const k = leseEtsExport(DATEI).kandidaten[0]!
    expect(Object.keys(k).sort()).toEqual(['adresse', 'beschreibung', 'datenpunkt', 'name'])
    expect('richtung' in k).toBe(false)
    expect('bedeutung' in k).toBe(false)
  })
})
