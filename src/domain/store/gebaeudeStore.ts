// ───────────────────────────────────────────────────────────────────────────
// Das Gebäude im Speicher.
//
// Die Domäne selbst (`modell.ts`, `vertrag.ts`) ist rein: sie rechnet und legt
// nichts ab. Dieser Store ist die einzige Stelle, die schreibt — und er hält
// dieselbe Trennung ein, die der Vertrag von aussen verlangt: **Lesen geht
// über den Vertrag, Schreiben über die Pflege.**
//
// WARUM DER MANGEL NICHT WIE DIE ANDEREN ÄNDERUNGEN AUSSIEHT. Räume, Punkte
// und Kreise pflegt der Betreiber; das ist gewöhnliches Bearbeiten. Ein Mangel
// ist etwas anderes — eine Aussage von aussen über das Gebäude, und der Vertrag
// (`mangelMelden`) darf sie ABLEHNEN. Der Store ruft ihn deshalb auf, statt
// selbst anzuhängen, und reicht die Ablehnung durch. Wer hier `maengel.push`
// schreibt, hat die einzige Prüfung übersprungen, die es auf diesem Weg gibt.
// ───────────────────────────────────────────────────────────────────────────
import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import { STORAGE_KEYS } from '../../lib/storageKeys'
import {
  heileGebaeude,
  leeresGebaeude,
  type Anschlusspunkt,
  type Etage,
  type Gebaeude,
  type HausStrecke,
  type Mangel,
  type Raum,
  type Schaltstelle,
  type Steuerklinke,
  type StreckenAder,
  type Stromkreis,
  type Trasse,
  type Verteilung,
} from '../modell'
import { mangelMelden } from '../vertrag'
import {
  aderAnlegen,
  aderUmbenennen,
  etageEntfernen,
  etageVerschieben,
  type PflegeErgebnis,
} from '../pflege'
import type { Uebersetzen } from '../../i18n/quelle'

const KEY = STORAGE_KEYS.gebaeude

const laden = (): Gebaeude => {
  try {
    const roh = localStorage.getItem(KEY)
    if (!roh) return leeresGebaeude('haus-1', 'Building')
    const g = JSON.parse(roh) as Partial<Gebaeude>
    // Fehlende Listen werden ERGAENZT und nicht als leer geglaubt: eine aeltere
    // Datei kennt ein spaeter dazugekommenes Feld nicht, und `undefined.map`
    // waere ein Absturz beim Oeffnen.
    //
    // ZWEI SCHRITTE UND NICHT EINER: der Spread fuellt fehlende TOP-Felder,
    // `heileGebaeude` fuellt Listen, die als `null` oder `undefined` IN der
    // Datei stehen. Der Spread allein reicht dafuer nicht — ein
    // ausgeschriebenes `"trassen": null` ueberschreibt die Vorgabe.
    return heileGebaeude({ ...leeresGebaeude(g.id ?? 'haus-1', g.name ?? 'Building'), ...g })
  } catch {
    return leeresGebaeude('haus-1', 'Building')
  }
}

/**
 * Schreiben — und ein gescheiterter Schreibvorgang wird GEMELDET.
 *
 * Ein leeres `catch` waere die bequeme Zeile und der teure Fehler: der
 * Speicher ist voll, die App meldet Erfolg, und beim naechsten Start ist das
 * Gebaeude weg. Genau dieser Befund steht im `light-planner` (`storage:check`).
 */
const sichern = (g: Gebaeude): string | undefined => {
  try {
    localStorage.setItem(KEY, JSON.stringify(g))
    return undefined
  } catch (e) {
    return e instanceof Error ? e.message : String(e)
  }
}

interface GebaeudeState {
  gebaeude: Gebaeude
  /** Letzter gescheiterter Schreibvorgang. Leer, solange alles gut ging. */
  schreibfehler?: string
  etageAnlegen: (e: Omit<Etage, 'id'>) => string
  etageAendern: (id: string, patch: Partial<Omit<Etage, 'id'>>) => void
  etageVerschieben: (id: string, richtung: -1 | 1) => void
  /** Gibt den Grund zurueck, wenn noch Raeume auf der Etage stehen. */
  etageEntfernen: (id: string, t?: Uebersetzen) => string | undefined
  raumAnlegen: (r: Omit<Raum, 'id'>) => string
  raumAendern: (id: string, patch: Partial<Omit<Raum, 'id'>>) => void
  streckeAnlegen: (s: Omit<HausStrecke, 'id'>) => string
  streckeAendern: (id: string, patch: Partial<Omit<HausStrecke, 'id' | 'adern'>>) => void
  /** Gibt den Grund zurueck, wenn die Bezeichnung leer oder schon vergeben ist. */
  aderAnlegen: (streckeId: string, ader: StreckenAder, t?: Uebersetzen) => string | undefined
  /**
   * Wie `aderAnlegen`; Zuordnungen auf die Ader ziehen mit (`pflege.ts`).
   * Adern werden ueber ihre STELLE angesprochen — ein eingelesener Name kann
   * doppelt vorkommen.
   */
  aderUmbenennen: (streckeId: string, stelle: number, neu: string, t?: Uebersetzen) => string | undefined
  aderAendern: (streckeId: string, stelle: number, patch: Partial<Omit<StreckenAder, 'nr'>>) => void
  aderEntfernen: (streckeId: string, stelle: number) => void
  punktAnlegen: (p: Omit<Anschlusspunkt, 'id'>) => string
  punktAendern: (id: string, patch: Partial<Omit<Anschlusspunkt, 'id'>>) => void
  kreisAnlegen: (k: Omit<Stromkreis, 'id'>) => string
  verteilungAnlegen: (v: Omit<Verteilung, 'id'>) => string
  klinkeAnlegen: (k: Omit<Steuerklinke, 'id'>) => string
  trasseAnlegen: (t: Omit<Trasse, 'id'>) => string
  schaltstelleAnlegen: (s: Omit<Schaltstelle, 'id'>) => string
  schaltstelleAendern: (id: string, patch: Partial<Omit<Schaltstelle, 'id'>>) => void
  /** Der eine Rueckweg. Gibt den Grund zurueck, wenn die Meldung abgelehnt wird. */
  mangelEintragen: (m: Omit<Mangel, 'id'>, t?: Uebersetzen) => string | undefined
  entfernen: (id: string) => void
  /**
   * Ein eingelesenes Gebaeude uebernehmen (Issue #2).
   *
   * ERSETZT, und zwar ganz. Ein Zusammenfuehren zweier Gebaeude waere die
   * naheliegende Bequemlichkeit und die falsche: zwei Haeuser haben
   * unabhaengig vergebene Ids, und ein `p1` von hier ist nicht das `p1` von
   * dort. Wer sie mischt, bekommt eine Dose mit der Absicherung einer
   * anderen — an dieser Zahl plant jemand eine Last.
   */
  gebaeudeSetzen: (g: Gebaeude) => void
}

const mit = (
  set: (fn: (s: GebaeudeState) => Partial<GebaeudeState>) => void,
  aendern: (g: Gebaeude) => Gebaeude,
) =>
  set((s) => {
    const neu = aendern(s.gebaeude)
    return { gebaeude: neu, schreibfehler: sichern(neu) }
  })

/** Ein Pflege-Schritt, der abgelehnt werden kann: uebernehmen oder den Grund zurueckgeben. */
const pflegen = (
  set: (fn: (s: GebaeudeState) => Partial<GebaeudeState>) => void,
  ergebnis: PflegeErgebnis,
): string | undefined => {
  if (!ergebnis.ok) return ergebnis.grund
  mit(set, () => ergebnis.gebaeude)
  return undefined
}

/** Eine Aenderung an EINER Strecke. */
const anStrecke = (g: Gebaeude, id: string, aendern: (s: HausStrecke) => HausStrecke): Gebaeude => ({
  ...g,
  strecken: g.strecken.map((s) => (s.id === id ? aendern(s) : s)),
})

export const useGebaeudeStore = create<GebaeudeState>((set, get) => ({
  gebaeude: laden(),
  gebaeudeSetzen: (g) =>
    set((s) => {
      const geheilt = heileGebaeude(g)
      return { gebaeude: geheilt, schreibfehler: sichern(geheilt) }
    }),

  etageAnlegen: (e) => {
    const id = uuidv4()
    mit(set, (g) => ({ ...g, etagen: [...g.etagen, { ...e, id }] }))
    return id
  },
  etageAendern: (id, patch) =>
    mit(set, (g) => ({
      ...g,
      etagen: g.etagen.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    })),
  etageVerschieben: (id, richtung) => mit(set, (g) => etageVerschieben(g, id, richtung)),
  etageEntfernen: (id, t) => pflegen(set, etageEntfernen(get().gebaeude, id, t)),

  raumAnlegen: (r) => {
    const id = uuidv4()
    mit(set, (g) => ({ ...g, raeume: [...g.raeume, { ...r, id }] }))
    return id
  },
  raumAendern: (id, patch) =>
    mit(set, (g) => ({
      ...g,
      raeume: g.raeume.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    })),
  punktAnlegen: (p) => {
    const id = uuidv4()
    mit(set, (g) => ({ ...g, punkte: [...g.punkte, { ...p, id }] }))
    return id
  },
  punktAendern: (id, patch) =>
    mit(set, (g) => ({
      ...g,
      punkte: g.punkte.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    })),
  streckeAnlegen: (st) => {
    const id = uuidv4()
    mit(set, (g) => ({ ...g, strecken: [...g.strecken, { ...st, id }] }))
    return id
  },
  streckeAendern: (id, patch) => mit(set, (g) => anStrecke(g, id, (s) => ({ ...s, ...patch }))),
  aderAnlegen: (streckeId, ader, t) => pflegen(set, aderAnlegen(get().gebaeude, streckeId, ader, t)),
  aderUmbenennen: (streckeId, stelle, neu, t) =>
    pflegen(set, aderUmbenennen(get().gebaeude, streckeId, stelle, neu, t)),
  aderAendern: (streckeId, stelle, patch) =>
    mit(set, (g) =>
      anStrecke(g, streckeId, (s) => ({
        ...s,
        adern: (s.adern ?? []).map((a, i) => (i === stelle ? { ...a, ...patch } : a)),
      })),
    ),
  // Die letzte Ader entfernt heisst: die Strecke ist nicht mehr beschrieben.
  // Eine leere Liste stuende sonst fuer „fuehrt nichts", und das sagt niemand,
  // der eine fest verlegte Leitung eintraegt. Zuordnungen auf die entfernte
  // Ader bleiben stehen und erscheinen als unbekannte Ader — sie sind eine
  // Erklaerung des Plans und nicht dieses Werkzeugs, das sie loeschen duerfte.
  aderEntfernen: (streckeId, stelle) =>
    mit(set, (g) =>
      anStrecke(g, streckeId, (s) => {
        const { adern, ...ohne } = s
        const rest = (adern ?? []).filter((_, i) => i !== stelle)
        return rest.length > 0 ? { ...ohne, adern: rest } : ohne
      }),
    ),
  kreisAnlegen: (k) => {
    const id = uuidv4()
    mit(set, (g) => ({ ...g, stromkreise: [...g.stromkreise, { ...k, id }] }))
    return id
  },
  verteilungAnlegen: (v) => {
    const id = uuidv4()
    mit(set, (g) => ({ ...g, verteilungen: [...g.verteilungen, { ...v, id }] }))
    return id
  },
  klinkeAnlegen: (k) => {
    const id = uuidv4()
    mit(set, (g) => ({ ...g, klinken: [...g.klinken, { ...k, id }] }))
    return id
  },
  trasseAnlegen: (t) => {
    const id = uuidv4()
    mit(set, (g) => ({ ...g, trassen: [...(g.trassen ?? []), { ...t, id }] }))
    return id
  },
  schaltstelleAnlegen: (st) => {
    const id = uuidv4()
    mit(set, (g) => ({ ...g, schaltstellen: [...(g.schaltstellen ?? []), { ...st, id }] }))
    return id
  },
  schaltstelleAendern: (id, patch) =>
    mit(set, (g) => ({
      ...g,
      schaltstellen: (g.schaltstellen ?? []).map((x) => (x.id === id ? { ...x, ...patch } : x)),
    })),

  mangelEintragen: (m, t) => {
    // Der Uebersetzer geht DURCH den Store an den Vertrag. Ohne ihn liefert
    // `mangelMelden` die englische Quelle — das ist die Rueckfallebene und
    // kein Platzhalter.
    const ergebnis = mangelMelden(get().gebaeude, { ...m, id: uuidv4() }, t)
    if (!ergebnis.ok) return ergebnis.grund
    mit(set, () => ergebnis.gebaeude)
    return undefined
  },

  entfernen: (id) =>
    mit(set, (g) => ({
      ...g,
      raeume: g.raeume.filter((x) => x.id !== id),
      punkte: g.punkte.filter((x) => x.id !== id),
      stromkreise: g.stromkreise.filter((x) => x.id !== id),
      verteilungen: g.verteilungen.filter((x) => x.id !== id),
      klinken: g.klinken.filter((x) => x.id !== id),
      strecken: g.strecken.filter((x) => x.id !== id),
      trassen: (g.trassen ?? []).filter((x) => x.id !== id),
      schaltstellen: (g.schaltstellen ?? []).filter((x) => x.id !== id),
      maengel: g.maengel.filter((x) => x.id !== id),
    })),
}))
