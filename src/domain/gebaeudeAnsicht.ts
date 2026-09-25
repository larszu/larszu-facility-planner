// ───────────────────────────────────────────────────────────────────────────
// Das Gebaeude als Bild: Etagen uebereinander, Raeume darauf, Hausstrecken
// und Trassen dazwischen (QW12, cable-planner#916).
//
// REIN: keine Uhr, kein Store, kein DOM. Die Ansicht (`ui/GebaeudeAnsicht`)
// zeichnet nur, was hier gerechnet wird — so ist die Rechnung ohne Browser
// testbar, und das Bild sagt dasselbe wie die Tabellen.
//
// Gegenstueck im cable-planner: `lib/gebaeudeSzene.ts` (Raeume aus den Rahmen
// des Signalplans). Dieselbe Form — Meter, y nach oben —, aber eine eigene
// Rechnung: das Werkzeug haengt an keinem Paket des Plans (ADR-006), und die
// Frage ist eine andere. Hier zeigt das Haus sich selbst, dort sieht der Plan
// das Haus.
//
// NICHTS ERFINDEN. Eine Etage ohne Hoehe wird mit der Geschosshoehe
// gestapelt und traegt `hoeheAngenommen`. Ein Raum ohne Lage wird auf seiner
// Etage hinter die gelegten Raeume gereiht und traegt `lageAngenommen` —
// die Ansicht zeichnet ihn gestrichelt und sagt es. Eine Strecke, deren Raum
// fehlt, wird gezaehlt und nicht ins Leere gezogen.
// ───────────────────────────────────────────────────────────────────────────
import type { Gebaeude } from './modell'
import { streckenBelegung } from './gebaeudeAuskunft'

export interface Punkt3D {
  x: number
  y: number
  z: number
}

export interface AnsichtEtage {
  id: string
  name: string
  /** Fussbodenhoehe in Metern. */
  y: number
  hoeheAngenommen: boolean
}

export interface AnsichtRaum {
  id: string
  name: string
  hausbezeichner: string
  etageId?: string
  /** Grundflaeche: Ecke und Groesse in Metern, y = Fussboden. */
  x: number
  z: number
  breite: number
  tiefe: number
  y: number
  hoehe: number
  lageAngenommen: boolean
  /** Der Raum nennt keine Etage (oder eine, die es nicht gibt). */
  ohneEtage: boolean
}

export interface AnsichtVerbindung {
  id: string
  art: 'strecke' | 'trasse'
  bezeichnung: string
  vonRaumId: string
  nachRaumId: string
  von: Punkt3D
  nach: Punkt3D
  /** Nur Hausstrecken mit Adern: wie viele frei sind — `unbekannt` zaehlt nicht als frei. */
  adern?: { gesamt: number; frei: number }
}

export interface GebaeudeAnsicht {
  etagen: AnsichtEtage[]
  raeume: AnsichtRaum[]
  verbindungen: AnsichtVerbindung[]
  /** Strecken und Trassen, deren Raum fehlt oder ausgeblendet ist. */
  nichtGezeichnet: number
}

export interface AnsichtOptionen {
  /** Geschosshoehe fuer Etagen ohne Hoehenangabe, in m. */
  geschosshoeheM: number
  ausgeblendeteEtagen?: ReadonlySet<string>
  ausgeblendeteRaeume?: ReadonlySet<string>
  strecken?: boolean
  trassen?: boolean
}

/** Groesse eines Raums ohne Lage — nur fuer das Bild, nirgends gespeichert. */
export const ERSATZ_BREITE_M = 6
export const ERSATZ_TIEFE_M = 4
const ABSTAND_M = 1.5

/** Sichtbare Raumhoehe: unter der Geschosshoehe, damit die Etagen getrennt bleiben. */
export const raumHoehe = (geschosshoeheM: number): number => Math.max(1, geschosshoeheM * 0.75)

/**
 * Hoehe jeder Etage in Listenreihenfolge. Eine angegebene gilt; eine fehlende
 * wird von der naechsten angegebenen um je eine Geschosshoehe gestapelt —
 * unter der ersten angegebenen nach unten, darueber nach oben.
 */
export function etagenHoehen(
  etagen: readonly { id: string; name: string; hoeheM?: number }[],
  geschosshoeheM: number,
): AnsichtEtage[] {
  const bekannt = etagen.map((e, i) => (e.hoeheM !== undefined ? i : -1)).filter((i) => i >= 0)
  return etagen.map((e, i) => {
    if (e.hoeheM !== undefined) return { id: e.id, name: e.name, y: e.hoeheM, hoeheAngenommen: false }
    const darunter = [...bekannt].reverse().find((k) => k < i)
    if (darunter !== undefined) {
      return { id: e.id, name: e.name, y: etagen[darunter].hoeheM! + (i - darunter) * geschosshoeheM, hoeheAngenommen: true }
    }
    const darueber = bekannt.find((k) => k > i)
    if (darueber !== undefined) {
      return { id: e.id, name: e.name, y: etagen[darueber].hoeheM! - (darueber - i) * geschosshoeheM, hoeheAngenommen: true }
    }
    return { id: e.id, name: e.name, y: i * geschosshoeheM, hoeheAngenommen: true }
  })
}

export function gebaeudeAnsicht(gebaeude: Gebaeude, opt: AnsichtOptionen): GebaeudeAnsicht {
  const etagen = etagenHoehen(gebaeude.etagen, opt.geschosshoeheM)
  const etageById = new Map(etagen.map((e) => [e.id, e]))
  const hoehe = raumHoehe(opt.geschosshoeheM)

  // Raeume mit Lage zuerst: hinter ihnen wird je Etage eingereiht.
  const rechterRand = new Map<string, number>()
  const schluessel = (etageId: string | undefined) => (etageId && etageById.has(etageId) ? etageId : '\u0000ohne')
  for (const r of gebaeude.raeume) {
    if (!r.lage) continue
    const k = schluessel(r.etageId)
    rechterRand.set(k, Math.max(rechterRand.get(k) ?? 0, r.lage.xM + r.lage.breiteM))
  }
  const naechstesX = new Map<string, number>()

  const raeume: AnsichtRaum[] = []
  for (const r of gebaeude.raeume) {
    const etage = r.etageId ? etageById.get(r.etageId) : undefined
    if (etage && opt.ausgeblendeteEtagen?.has(etage.id)) continue
    if (opt.ausgeblendeteRaeume?.has(r.id)) continue
    const k = schluessel(r.etageId)
    let lage = r.lage
    if (!lage) {
      const start = naechstesX.get(k) ?? (rechterRand.has(k) ? rechterRand.get(k)! + ABSTAND_M * 2 : 0)
      lage = { xM: start, yM: 0, breiteM: ERSATZ_BREITE_M, tiefeM: ERSATZ_TIEFE_M }
      naechstesX.set(k, start + ERSATZ_BREITE_M + ABSTAND_M)
    }
    raeume.push({
      id: r.id,
      name: r.name,
      hausbezeichner: r.hausbezeichner,
      ...(r.etageId ? { etageId: r.etageId } : {}),
      x: lage.xM,
      z: lage.yM,
      breite: lage.breiteM,
      tiefe: lage.tiefeM,
      y: etage?.y ?? 0,
      hoehe,
      lageAngenommen: !r.lage,
      ohneEtage: !etage,
    })
  }

  const raumById = new Map(raeume.map((r) => [r.id, r]))
  const decke = (r: AnsichtRaum): Punkt3D => ({ x: r.x + r.breite / 2, y: r.y + r.hoehe, z: r.z + r.tiefe / 2 })
  const verbindungen: AnsichtVerbindung[] = []
  let nichtGezeichnet = 0

  if (opt.strecken !== false) {
    for (const s of gebaeude.strecken) {
      const von = raumById.get(s.vonRaumId)
      const nach = raumById.get(s.nachRaumId)
      if (!von || !nach) {
        nichtGezeichnet += 1
        continue
      }
      const b = streckenBelegung(gebaeude, s.id)
      verbindungen.push({
        id: s.id,
        art: 'strecke',
        bezeichnung: s.bezeichnung,
        vonRaumId: von.id,
        nachRaumId: nach.id,
        von: decke(von),
        nach: decke(nach),
        ...(b && b.adern.length > 0
          ? { adern: { gesamt: b.adern.length, frei: b.adern.filter((a) => a.zustand === 'frei').length } }
          : {}),
      })
    }
  }
  if (opt.trassen !== false) {
    for (const t of gebaeude.trassen) {
      const von = raumById.get(t.vonRaumId)
      const nach = raumById.get(t.nachRaumId)
      if (!von || !nach) {
        nichtGezeichnet += 1
        continue
      }
      verbindungen.push({
        id: t.id,
        art: 'trasse',
        bezeichnung: t.bezeichnung,
        vonRaumId: von.id,
        nachRaumId: nach.id,
        // Trassen knapp unter der Decke, damit sie neben einer Strecke
        // zwischen denselben Raeumen sichtbar bleiben.
        von: { ...decke(von), y: decke(von).y - 0.4 },
        nach: { ...decke(nach), y: decke(nach).y - 0.4 },
      })
    }
  }

  return { etagen, raeume, verbindungen, nichtGezeichnet }
}

// ─── DIE PROJEKTION ────────────────────────────────────────────────────────

export type Drehung = 0 | 1 | 2 | 3

export interface Punkt2D {
  x: number
  y: number
}

const COS30 = Math.cos(Math.PI / 6)

/**
 * Isometrische Projektion nach Blickrichtung (vier Viertelsdrehungen um die
 * senkrechte Achse durch `mitte`). y geht auf dem Bildschirm nach UNTEN,
 * deshalb zieht die Hoehe ab.
 */
export function projiziere(p: Punkt3D, drehung: Drehung, mitte: { x: number; z: number }): Punkt2D {
  const dx = p.x - mitte.x
  const dz = p.z - mitte.z
  const [x, z] =
    drehung === 0 ? [dx, dz] : drehung === 1 ? [dz, -dx] : drehung === 2 ? [-dx, -dz] : [-dz, dx]
  return { x: (x - z) * COS30, y: (x + z) * 0.5 - p.y }
}

/** Tiefe fuer die Zeichenreihenfolge: groesser heisst naeher am Betrachter. */
export function tiefe(p: Punkt3D, drehung: Drehung, mitte: { x: number; z: number }): number {
  const dx = p.x - mitte.x
  const dz = p.z - mitte.z
  const [x, z] =
    drehung === 0 ? [dx, dz] : drehung === 1 ? [dz, -dx] : drehung === 2 ? [-dx, -dz] : [-dz, dx]
  return x + z
}

/** Die acht Ecken eines Raums. */
export const raumEcken = (r: AnsichtRaum): Punkt3D[] => {
  const unten = r.y
  const oben = r.y + r.hoehe
  const xs = [r.x, r.x + r.breite]
  const zs = [r.z, r.z + r.tiefe]
  return [unten, oben].flatMap((y) => xs.flatMap((x) => zs.map((z) => ({ x, y, z }))))
}
