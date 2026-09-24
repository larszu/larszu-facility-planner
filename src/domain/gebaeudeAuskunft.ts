// ───────────────────────────────────────────────────────────────────────────
// Auskünfte über das Gebäude, die NICHT zum Vertrag gehören.
//
// ─── WARUM DAS EIN ZWEITES MODUL IST ───────────────────────────────────────
//
// `vertrag.ts` trägt die SECHS Fragen, die der Show-Plan an das Gebäude
// stellt, und `test/vertrag.test.ts` besteht darauf, dass es genau sechs
// bleiben — eine unbenannte siebte fällt dort durch. Das ist kein Formalismus:
// die Liste steht auch in ADR-006, und der Abgleich läuft in der Suite. Wer
// hier eine Funktion dazuschreibt, ändert stillschweigend einen Vertrag, den
// zwei Repos lesen.
//
// Die Auskünfte hier sind etwas anderes: sie beantworten Fragen, die das
// GEBÄUDE-Werkzeug an seine eigenen Daten stellt, damit seine Sichten etwas
// zeigen können. Der Plan fragt sie nicht. Sie deshalb in denselben Topf zu
// werfen hätte den Vertrag um Fragen wachsen lassen, die niemand von außen
// stellt — genau die Richtung, gegen die ADR-006 geschrieben ist.
// ───────────────────────────────────────────────────────────────────────────
import type {
  Anschlusspunkt,
  Gebaeude,
  Lage,
  Raum,
  Schaltstelle,
  Steuerklinke,
  StreckenAder,
  Trasse,
} from './modell'

/**
 * Woher wissen wir, dass dieser Punkt geschaltet ist?
 *
 * ─── DREI ANTWORTEN, NICHT ZWEI ────────────────────────────────────────────
 *
 * Es gibt zwei Quellen: das Feld `geschaltet` am Punkt (die Angabe des
 * Betreibers) und die Liste `schaltetPunkte` an einer Schaltstelle (die
 * benannte Stelle). Beide können fehlen, und das ist NICHT dasselbe wie „nicht
 * geschaltet":
 *
 *   'stelle'    eine benannte Schaltstelle nennt diesen Punkt
 *   'angabe'    der Betreiber hat `geschaltet: true` gesetzt, ohne Stelle
 *   'nein'      der Betreiber hat `geschaltet: false` gesetzt
 *   'unbekannt' niemand hat etwas gesagt
 *
 * Der Unterschied zwischen `nein` und `unbekannt` ist der, der im Aufbau zählt.
 * Wer ihn einebnet, schreibt „nicht geschaltet" auf ein Blatt, mit dem jemand
 * ein Netzteil an eine Dose hängt, die um 22:00 abfällt.
 */
export type Schaltherkunft =
  | { art: 'stelle'; stelle: Schaltstelle }
  | { art: 'angabe' }
  | { art: 'nein' }
  | { art: 'unbekannt' }

export const geschaltetVon = (gebaeude: Gebaeude, punktId: string): Schaltherkunft => {
  const stelle = (gebaeude.schaltstellen ?? []).find((s) => s.schaltetPunkte.includes(punktId))
  if (stelle) return { art: 'stelle', stelle }
  const punkt = gebaeude.punkte.find((p) => p.id === punktId)
  if (punkt?.geschaltet === true) return { art: 'angabe' }
  if (punkt?.geschaltet === false) return { art: 'nein' }
  return { art: 'unbekannt' }
}

/**
 * Die Trassen zwischen zwei Räumen — in BEIDEN Richtungen.
 *
 * Ein Leerrohr von A nach B ist dasselbe Leerrohr wie von B nach A. Wer nur
 * eine Richtung sucht, findet die Hälfte der Wege und plant eine zweite
 * Leitung, wo schon eine liegt.
 */
export const trassenZwischen = (
  gebaeude: Gebaeude,
  raumA: string,
  raumB: string,
): readonly Trasse[] =>
  (gebaeude.trassen ?? []).filter(
    (t) =>
      (t.vonRaumId === raumA && t.nachRaumId === raumB) ||
      (t.vonRaumId === raumB && t.nachRaumId === raumA),
  )

/**
 * Kann ich hier noch etwas durchziehen?
 *
 * Gibt die BESTE Belegung aller Trassen zwischen den beiden Räumen zurück —
 * `frei` schlägt `teilbelegt` schlägt `voll`. `unbekannt` gewinnt gegen
 * nichts: eine Trasse, bei der niemand nachgesehen hat, ist kein Weg, auf den
 * man sich verlässt, aber auch kein Ausschluss.
 */
export const wegFrei = (
  gebaeude: Gebaeude,
  raumA: string,
  raumB: string,
): 'frei' | 'teilbelegt' | 'voll' | 'unbekannt' | 'keine-trasse' => {
  const trassen = trassenZwischen(gebaeude, raumA, raumB)
  if (trassen.length === 0) return 'keine-trasse'
  const rang = { frei: 3, teilbelegt: 2, unbekannt: 1, voll: 0 } as const
  const beste = trassen.reduce((a, b) => (rang[a.belegung] >= rang[b.belegung] ? a : b))
  return beste.belegung
}

/**
 * Die Punkte eines Raums, die eine Lage im Grundriss haben.
 *
 * Punkte OHNE Lage fallen heraus statt bei (0,0) zu landen. Ein Stapel Marken
 * in der linken oberen Ecke sieht aus wie eine Aussage über das Gebäude und
 * ist keine.
 */
export const punkteMitLage = (
  gebaeude: Gebaeude,
  raumId: string,
): readonly (Anschlusspunkt & { lage: Lage })[] =>
  gebaeude.punkte.filter(
    (p): p is Anschlusspunkt & { lage: Lage } => p.raumId === raumId && !!p.lage,
  )

/**
 * Ist diese Steuer-Adresse mehrdeutig?
 *
 * ─── NUR BEI DALI, UND DORT IMMER ──────────────────────────────────────────
 *
 * Bei DALI heisst „3" je nach Adressart etwas voellig anderes: ein einzelnes
 * Vorschaltgeraet, eine Gruppe von dreissig Leuchten, oder — bei Broadcast —
 * alles am Bus, das Notlicht des Hauses eingeschlossen. Steht die Art nicht
 * dabei, ist die Adresse eine Zahl ohne Reichweite.
 *
 * DAS TRIFFT ÄLTERE DOKUMENTE. `adressart` kam am 2026-09-10 dazu; jede vorher
 * eingetragene DALI-Klinke hat sie nicht. Sie stillschweigend als Kurzadresse
 * zu lesen waere die bequeme Annahme und die gefaehrliche: sie macht aus einer
 * unbekannten Reichweite die kleinstmoegliche, und wer danach schaltet,
 * erfaehrt den Unterschied erst, wenn der Saal dunkel ist.
 *
 * Bei KNX, Crestron und Vissonic ist die Adresse aus sich heraus eindeutig —
 * dort fehlt nichts, wenn das Feld leer bleibt.
 */
export const adresseMehrdeutig = (klinke: Steuerklinke): boolean =>
  klinke.system === 'dali' && klinke.adressart === undefined

/**
 * Die Raeume in der Reihenfolge ihrer Etagen (cable-planner#911).
 *
 * Innerhalb einer Etage bleibt die Reihenfolge der Liste stehen. Raeume ohne
 * Etage — und solche, deren Etage es nicht gibt — stehen HINTEN und nicht
 * vorne: vorne saehen sie aus wie das Untergeschoss.
 */
export const raeumeNachEtage = (gebaeude: Gebaeude): readonly Raum[] => {
  const rang = new Map((gebaeude.etagen ?? []).map((e, i) => [e.id, i]))
  const ohne = rang.size
  return gebaeude.raeume
    .map((r, i) => ({ r, i, e: (r.etageId === undefined ? undefined : rang.get(r.etageId)) ?? ohne }))
    .sort((a, b) => a.e - b.e || a.i - b.i)
    .map((x) => x.r)
}

/**
 * Wie eine Ader belegt ist — ABGELEITET aus den Zuordnungen (Issue #15).
 *
 *   'frei'       keine Zuordnung nennt die Ader, und keine nimmt die ganze
 *                Strecke
 *   'belegt'     mindestens ein Plan-Kabel nennt GENAU diese Ader
 *   'unbekannt'  ein Plan-Kabel benutzt die Strecke, ohne eine Ader zu
 *                nennen — es kann diese sein
 *
 * DER DRITTE FALL IST DER, UM DEN ES GEHT. Eine Zuordnung aus v1 kennt keine
 * Adern; sie sagt „dieses Kabel liegt auf der Strecke". Beschreibt jemand
 * danach die vier Adern der Strecke, waere „alle vier frei" die bequeme
 * Ableitung und fuer eine davon falsch. Wer darauf ein zweites Signal legt,
 * findet es in der Show auf dem Bildschirm des ersten.
 */
export type AderZustand = 'frei' | 'belegt' | 'unbekannt'

export interface AderStand {
  ader: StreckenAder
  zustand: AderZustand
  /** Die Plan-Kabel, die erklaert auf DIESER Ader liegen. */
  planKabelIds: string[]
  /** Mehr als ein Plan-Kabel auf derselben Ader — zwei Signale, ein Leiter. */
  konflikt: boolean
}

export interface StreckenBelegung {
  adern: AderStand[]
  /** Plan-Kabel, deren Zuordnung keine Ader nennt: sie benutzen die GANZE Strecke. */
  ganzeStrecke: string[]
  /**
   * Zuordnungen auf eine Ader, die die Strecke nicht fuehrt. Sie werden
   * GEMELDET und nicht verworfen: ein Mensch hat sie erklaert, und
   * wahrscheinlicher als ein Irrtum ist eine umbenannte oder noch nicht
   * eingetragene Ader.
   */
  unbekannteAdern: { planKabelId: string; ader: string }[]
  /** Ader-Bezeichnungen, die in der Strecke mehr als einmal stehen. */
  doppelteNr: string[]
}

/**
 * Die Belegung einer Strecke, je Ader. `undefined` heisst: keine Strecke mit
 * dieser Id.
 */
export const streckenBelegung = (
  gebaeude: Gebaeude,
  streckeId: string,
): StreckenBelegung | undefined => {
  const strecke = gebaeude.strecken.find((s) => s.id === streckeId)
  if (!strecke) return undefined
  const adern = strecke.adern ?? []
  const nrs = new Set(adern.map((a) => a.nr))
  const aufAder = new Map<string, string[]>()
  const ganzeStrecke: string[] = []
  const unbekannteAdern: StreckenBelegung['unbekannteAdern'] = []

  for (const z of gebaeude.zuordnungen) {
    if (z.hausStreckeId !== streckeId) continue
    // Ein leerer Text nennt keine Ader — derselbe Schluss wie in `hausStrecke()`.
    if (typeof z.ader !== 'string' || z.ader.trim() === '') {
      ganzeStrecke.push(z.planKabelId)
    } else if (nrs.has(z.ader)) {
      aufAder.set(z.ader, [...(aufAder.get(z.ader) ?? []), z.planKabelId])
    } else {
      unbekannteAdern.push({ planKabelId: z.planKabelId, ader: z.ader })
    }
  }

  return {
    adern: adern.map((ader) => {
      const planKabelIds = aufAder.get(ader.nr) ?? []
      const zustand: AderZustand =
        planKabelIds.length > 0 ? 'belegt' : ganzeStrecke.length > 0 ? 'unbekannt' : 'frei'
      return { ader, zustand, planKabelIds, konflikt: planKabelIds.length > 1 }
    }),
    ganzeStrecke,
    unbekannteAdern,
    doppelteNr: [...new Set(adern.map((a) => a.nr).filter((nr, i, alle) => alle.indexOf(nr) !== i))],
  }
}
