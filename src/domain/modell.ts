// ───────────────────────────────────────────────────────────────────────────
// Das Gebaeude, so weit der Show-Plan es braucht (ADR-006, Schritt 2).
//
// Dieses Paket ist die Vorstufe von `larszu/facility-planner`. ADR-006 sagt
// die Reihenfolge: „Paket vor Repo. Erst die Domaene in ein `@avplan/*`-Paket
// schneiden, das der Planer benutzt — noch im selben Repo. Bricht dabei etwas,
// bricht es sichtbar und an einer Stelle."
//
// ─── WAS HIER NICHT STEHT, UND WARUM ───────────────────────────────────────
//
// Kein Bus-Modell (KNX-Gruppenadressbaum, DALI-Vorschaltgeraete), keine
// Pruefprotokolle nach Norm, keine Wartungshistorie, keine Grundriss-Geometrie.
// Das alles gehoert dem Gebaeude-Werkzeug und nicht diesem Vertrag. Hier steht
// nur, was der Show-Plan FRAGT — sechs Fragen, aufgezaehlt im ADR, und was
// zu ihrer Beantwortung noetig ist.
//
// Wer hier ein Feld ergaenzt, das keine der sechs Fragen beantwortet, hat das
// Werkzeug angefangen und nicht den Vertrag. Der Waechter in
// `test/vertrag.test.ts` misst die Fragen gegen das ADR; das Modell misst er
// nicht — dafuer steht dieser Absatz.
// ───────────────────────────────────────────────────────────────────────────

/**
 * Wie man an einem Punkt ansteckt. Geschlossene Liste, weil der Plan darauf
 * seine eigene Steckerseite abbildet — ein freier Text waere an dieser Stelle
 * ein Namensvergleich mit anderen Mitteln (ADR-002).
 */
export type Anschlussart = 'cee63' | 'cee32' | 'cee16' | 'powerlock' | 'klemme' | 'schuko'

/** Netzform der Anlage. Entscheidet, ob ein Trenntrafo noetig ist. */
export type Netzform = 'TN-S' | 'TN-C-S' | 'TT' | 'IT'

/** Ausloesecharakteristik des Leitungsschutzschalters. */
export type Charakteristik = 'B' | 'C' | 'D'

/**
 * Fehlerstromschutz-Typ. `keiner` ist eine ANGABE und nicht die Abwesenheit
 * einer Angabe — wer es nicht weiss, laesst den Punkt weg, statt `keiner` zu
 * schreiben.
 */
export type RcdTyp = 'A' | 'F' | 'B' | 'keiner'

/** Montageart einer Dose. Nur fuer `art: 'dose'` sinnvoll. */
export type Montage = 'up' | 'ap' | 'boden' | 'bruestung'

/**
 * Die BAUFORM einer Dose — was fuer ein Gehaeuse dort sitzt (Issue #1).
 *
 * ─── WARUM DAS NICHT DASSELBE IST WIE `montage` ────────────────────────────
 *
 * `montage` sagt, WIE das Gehaeuse an der Wand haengt: unter Putz, auf Putz,
 * im Boden, in der Bruestung. Das war bis 2026-09-10 die einzige
 * Unterscheidung, und sie beantwortet die Frage nicht, die im Aufbau gestellt
 * wird: „passt der Stecker da rein, und komme ich mit dem Deckel zu?"
 *
 * Ein Bodentank und eine Unterflurdose sind beide `montage: 'boden'` und
 * verhalten sich vollkommen verschieden — der Tank nimmt einen ganzen Satz
 * Kupplungen auf und laesst den Deckel offen stehen, die Unterflurdose fasst
 * einen Stecker und muss buendig schliessen, damit niemand darueber stolpert.
 * Wer nur `montage` fuehrt, plant beides als dasselbe.
 *
 * OFFEN GELASSEN ist `sonstige`: das Haus hat Bauformen, die keine Liste
 * vorwegnimmt. Sie mit `hinweis` zu beschreiben ist ehrlicher, als sie in eine
 * der fuenf zu pressen.
 */
export type Bauform =
  | 'wanddose'
  | 'bodentank'
  | 'unterflurdose'
  | 'bruestungskanal'
  | 'wandauslass'
  | 'sonstige'

/**
 * Wo ein Objekt im Raum sitzt — in Metern, vom Bezugspunkt des Grundrisses.
 *
 * METER UND NICHT PIXEL. Ein Grundriss wird ausgetauscht, neu gescannt oder
 * anders skaliert; eine Pixel-Lage waere danach falsch, ohne dass es jemand
 * merkt. Der Massstab steht am Raum (`Raum.grundriss.meterProBild`), die Lage
 * am Objekt — so ueberlebt sie den Bildwechsel.
 */
export interface Lage {
  xM: number
  yM: number
}

/** Bauart einer festen Schaltstelle des Hauses (Issue #1). */
export type Schalterbauart =
  | 'ausschalter'
  | 'serienschalter'
  | 'wechselschalter'
  | 'kreuzschalter'
  | 'taster'
  | 'zeitschaltuhr'
  | 'dimmer'
  | 'schluesselschalter'

/**
 * Eine feste Schalterstelle des Hauses (Issue #1).
 *
 * ─── WARUM DAS EIN EIGENES OBJEKT IST UND KEIN FLAG ────────────────────────
 *
 * Am `Anschlusspunkt` steht bisher `geschaltet?: boolean` — „haengt an einer
 * Schaltstelle". Das reicht, um zu warnen („dein Netzteil haengt an einem
 * Lichtschalter"), und reicht nicht fuer die Frage danach: WELCHE Stelle ist
 * das, wo sitzt sie, und was haengt noch daran?
 *
 * Genau diese Frage stellt jemand im Aufbau, wenn das Licht ausgeht: er sucht
 * den Schalter. Ein Boolean kann darauf nicht antworten, ein Datensatz mit
 * Raum und Bezeichnung schon. `geschaltet` bleibt als schnelle Antwort
 * bestehen und wird aus dieser Liste abgeleitet, wenn eine Stelle den Punkt
 * nennt — zwei Wege zu derselben Aussage, aber nur EINE Quelle.
 *
 * Die Zeitschaltuhr ist der Fall, der am meisten weh tut und deshalb in der
 * Liste steht: sie schaltet nachts ab, waehrend niemand danebensteht.
 */
export interface Schaltstelle {
  id: string
  bezeichnung: string
  raumId: string
  bauart: Schalterbauart
  /** Die Punkte, die diese Stelle schaltet — verweist auf `Anschlusspunkt.id`. */
  schaltetPunkte: string[]
  /** Freitext des Betreibers („schaltet ab 22:00", „nur mit Schluessel"). */
  hinweis?: string
  lage?: Lage
}

/**
 * Wie voll eine Trasse ist — als ANGABE des Hauses, nicht als Rechnung.
 *
 * `unbekannt` ist der Vorgabewert und keine Luecke: wer nicht nachgesehen hat,
 * sagt das. Eine geratene Belegung liest sich im Plan genauso wie eine
 * gemessene, und die Folge steht dann als „passt noch rein" auf einem Blatt,
 * mit dem jemand auf die Leiter steigt.
 */
export type Belegung = 'frei' | 'teilbelegt' | 'voll' | 'unbekannt'

/**
 * Ein Punkt, an dem der Show-Aufbau Strom bekommt.
 *
 * Einspeisung (der CEE-63-Abgang am Schaltschrank) und Dose (die UP-Dose in
 * der Wand) sind hier EIN Typ mit einem Unterscheidungsfeld, weil der Plan
 * dieselben sechs Angaben von beiden braucht. Zwei Typen haetten dieselben
 * Felder zweimal gefuehrt — und die zweite Fassung waere die gewesen, die
 * beim naechsten Feld vergessen wird.
 */
export interface Anschlusspunkt {
  id: string
  bezeichnung: string
  art: 'einspeisung' | 'dose'
  /** Raum, in dem der Punkt sitzt — verweist auf `Raum.id`. */
  raumId: string
  anschlussart: Anschlussart
  netzform: Netzform
  /** Nennstrom der Absicherung in Ampere. */
  absicherungA: number
  charakteristik: Charakteristik
  rcdTyp: RcdTyp
  /**
   * Zulaessige DAUERLEISTUNG in Watt — falls das Gebaeude sie angibt.
   *
   * OPTIONAL, und das ist der Kern: sie ist NICHT `absicherungA × Spannung`.
   * Der Nennstrom ist die Ausloeseschwelle, nicht die Belastbarkeit;
   * Leitungslaenge, Haeufung, Umgebungstemperatur und Gleichzeitigkeit gehen
   * ein. Wer die Zahl rechnet, wo sie fehlt, liefert eine Vermutung, die als
   * Messung gelesen wird — siehe `belastbarkeit()`.
   */
  dauerleistungW?: number
  /** Stromkreis, an dem der Punkt haengt — verweist auf `Stromkreis.id`. */
  stromkreisId?: string
  montage?: Montage
  /** Bauform des Gehaeuses. Nur fuer `art: 'dose'` sinnvoll. */
  bauform?: Bauform
  /** Wo der Punkt im Raum sitzt, falls der Raum einen Grundriss hat. */
  lage?: Lage
  /**
   * Der Punkt haengt an einer Schaltstelle (Lichtschalter, Zeitschaltuhr).
   *
   * BLEIBT NEBEN `Schaltstelle` bestehen und ist kein Doppel: dieses Feld ist
   * die Angabe des Betreibers „der ist geschaltet", auch wenn niemand die
   * Stelle benannt hat. `geschaltetVon()` im Vertrag fuehrt beide zusammen und
   * sagt, welche der beiden Quellen geantwortet hat — sonst saehe „ich weiss
   * es nicht" aus wie „nein".
   */
  geschaltet?: boolean
  /** Der Punkt haengt an einem Dimmer. Fuer ein Netzteil unbrauchbar. */
  gedimmt?: boolean
  /** Was dort dauerhaft angeschlossen ist, wenn der Punkt belegt ist. */
  belegtDurch?: string
  /** Freitext des Betreibers („nur bis 10 A", „nur Reinigung"). */
  hinweis?: string
}

/**
 * Ein Stromkreis des Gebaeudes — die Abgangsklemme im Schaltschrank.
 *
 * NICHT zu verwechseln mit dem Stromkreis der Show (`cable-planner`
 * `types/circuit.ts`): der wird am Abbautag wieder eingepackt, dieser bleibt.
 * Die Grenze steht in ADR-006 unter „Wo die Grenze zwischen den beiden
 * Strom-Zeilen liegt".
 */
export interface Stromkreis {
  id: string
  bezeichnung: string
  /** Verteilung/Schaltschrank, aus dem der Kreis kommt. */
  verteilungId: string
  /**
   * Der Fehlerstromschutzschalter, hinter dem der Kreis haengt. Mehrere Kreise
   * teilen sich ueblicherweise einen — genau das beantwortet
   * `kreisGeschwister()`.
   */
  rcdId?: string
  absicherungA?: number
  charakteristik?: Charakteristik
}

/** Schaltschrank oder Unterverteilung — das erste Modell aus Issue #665. */
export interface Verteilung {
  id: string
  bezeichnung: string
  raumId: string
  art: 'schaltschrank' | 'unterverteilung'
}

/**
 * Der Grundriss eines Raums — als Verweis, nicht als Bild (Issue #1).
 *
 * ─── WARUM HIER KEIN BILD LIEGT ────────────────────────────────────────────
 *
 * Weil dieses Paket der VERTRAG ist und nicht das Werkzeug. Ein eingebetteter
 * Grundriss waere je nach Haus ein paar Megabyte, und die traegt der Vertrag
 * dann durch jede Runde: `hausForeign` haelt fremde Felder fest, der Planer
 * schickt sie zurueck, und aus einer Datei mit sechs Anschlusspunkten wird
 * eine Datei mit sechs Anschlusspunkten und einem Scan.
 *
 * Was hier steht, ist die ADRESSE des Bildes und der MASSSTAB. Damit kann jede
 * Oberflaeche es zeigen, und keine muss es mitschleppen. Fehlt das Bild am
 * Zielrechner, bleibt die Lage der Punkte trotzdem gueltig — sie ist in Metern
 * angegeben und nicht in Pixeln.
 */
export interface Grundriss {
  /** Wo das Bild liegt: Dateipfad oder URL. */
  quelle: string
  /** Wie viele Meter eine Bildbreite abdeckt. Ohne das ist die Lage sinnlos. */
  meterProBild: number
}

/**
 * Eine Etage des Gebaeudes (cable-planner#911).
 *
 * ─── WARUM EIN OBJEKT UND KEIN FREITEXT MEHR ──────────────────────────────
 *
 * Bis 2026-09-24 stand am Raum `etage?: string`. Jeder Tippfehler war damit
 * eine neue Etage: „1.OG", „1. OG" und „OG1" sind drei Stockwerke fuer jeden,
 * der die Raeume danach gruppiert — und keine Sicht las das Feld, also fiel
 * es niemandem auf. Als Objekt gibt es jede Etage einmal, und der Raum
 * VERWEIST darauf.
 *
 * DIE REIHENFOLGE IST DIE DER LISTE (`Gebaeude.etagen`). Ein eigenes
 * Rangfeld waere die zweite Wahrheit neben der Listenposition, und die beiden
 * liefen beim ersten Verschieben auseinander. Auch `hoeheM` ist keine
 * Reihenfolge: sie fehlt oft, und eine Etage ohne Hoehe liesse sich dann
 * nirgends einsortieren.
 */
export interface Etage {
  id: string
  name: string
  /**
   * Hoehe der Fertigfussboden-Oberkante in Metern ueber dem Bezug des Hauses.
   * Fehlt sie, fehlt sie — `0` waere die Aussage „liegt auf Bezugshoehe".
   */
  hoeheM?: number
}

/**
 * Wo ein Raum im Haus liegt: seine Grundflaeche auf der Etage, in Metern vom
 * Bezugspunkt des Hauses (x nach rechts, y in die Tiefe).
 *
 * Wozu: die Gebaeude-Ansicht stellt die Raeume danach nebeneinander und
 * uebereinander, und eine Hausstrecke vom Saal im EG in die Regie im 2. OG
 * laeuft dann dorthin, wo die Regie wirklich liegt. Fehlt die Lage, fehlt
 * sie — die Ansicht reiht den Raum schematisch ein und sagt das, statt eine
 * Lage zu erfinden.
 */
export interface RaumLage {
  xM: number
  yM: number
  breiteM: number
  tiefeM: number
}

/** Eine vollstaendige Lage: Ursprung endlich, Breite und Tiefe groesser null. */
export const istRaumLage = (l: unknown): l is RaumLage => {
  if (!l || typeof l !== 'object') return false
  const o = l as Record<string, unknown>
  return (
    Number.isFinite(o.xM) &&
    Number.isFinite(o.yM) &&
    typeof o.breiteM === 'number' &&
    o.breiteM > 0 &&
    typeof o.tiefeM === 'number' &&
    o.tiefeM > 0
  )
}

/** Ein Raum des Gebaeudes, mit dem Bezeichner DES HAUSES. */
export interface Raum {
  id: string
  name: string
  /** Die Etage — verweist auf `Etage.id`. Fehlt sie, ist sie nicht angegeben. */
  etageId?: string
  grundriss?: Grundriss
  /** Lage im Haus. Fehlt sie, ist sie nicht angegeben. */
  lage?: RaumLage
  /**
   * Der Bezeichner, unter dem das Haus diesen Raum fuehrt (TIA-606, hauseigenes
   * Schema, Tuerschild). Der Plan zeigt ihn an und druckt ihn; er erfindet
   * keinen eigenen.
   */
  hausbezeichner: string
}

/** Bussystem einer Haussteuerung. Erweiterbar, aber aufgezaehlt. */
export type Steuersystem = 'knx' | 'dali' | 'crestron' | 'vissonic' | 'sonstige'

/**
 * Eine benannte Klinke der Haussteuerung (Issue #667).
 *
 * DAS BUS-MODELL BLEIBT DRAUSSEN. Der Plan will wissen, was er ansprechen darf
 * und was das bewirkt — nicht, wie die Gruppenadressen des Hauses strukturiert
 * sind. Eine Klinke ist deshalb ein Vertragsgegenstand: jemand hat sie
 * freigegeben und beschrieben.
 */
export interface Steuerklinke {
  id: string
  system: Steuersystem
  /** Adresse im jeweiligen System (KNX-Gruppenadresse, DALI-Kurzadresse, …). */
  adresse: string
  /**
   * WELCHE Art Adresse das ist (Issue #2).
   *
   * ─── WARUM DAS BEI DALI NICHT EGAL IST ───────────────────────────────────
   *
   * Bei DALI heisst „3" je nach Adressart etwas voellig anderes:
   *
   *   Kurzadresse 3   ein einzelnes Vorschaltgeraet
   *   Gruppe 3        alles, was in Gruppe 3 steht — koennen 30 Leuchten sein
   *   Broadcast       ALLES am Bus, auch das Notlicht des Hauses
   *
   * Die Adresse allein sagt das nicht. Wer eine Gruppenadresse fuer eine
   * Kurzadresse haelt, schaltet im Zweifel den halben Saal — und merkt es
   * erst, wenn es dunkel ist. Deshalb steht die Art als eigenes Feld und
   * nicht als Konvention im Adress-Text.
   *
   * OPTIONAL, weil sie nur bei DALI wirklich zwei Bedeutungen hat: eine
   * KNX-Gruppenadresse ist immer eine Gruppenadresse, und ein Pflichtfeld,
   * das in vier von fuenf Systemen nur eine moegliche Antwort hat, wird
   * ausgefuellt statt gelesen.
   */
  adressart?: Adressart
  richtung: 'lesen' | 'schalten'
  /** Was passiert, wenn man sie benutzt. Klartext, vom Betreiber. */
  bedeutung: string
}

/** Art einer Steuer-Adresse. Siehe `Steuerklinke.adressart`. */
export type Adressart = 'kurz' | 'gruppe' | 'broadcast'

/**
 * Eine Trasse des Hauses — der WEG, auf dem eine Leitung liegt (Issue #1).
 *
 * ─── WIE SIE SICH VON `HausStrecke` UNTERSCHEIDET ──────────────────────────
 *
 * `HausStrecke` ist eine fest verlegte LEITUNG von Raum zu Raum — etwas, das
 * ein Plan-Kabel ersetzen kann (deshalb `Zuordnung`). Eine Trasse ist der
 * Kanal, das Leerrohr, der Kabelbruecken-Weg: sie fuehrt nichts, sie NIMMT
 * etwas AUF.
 *
 * Der Unterschied ist im Aufbau der zwischen „da liegt schon eine Leitung, die
 * ich benutzen darf" und „da kann ich meine eigene durchziehen". Beides in
 * einem Typ zu fuehren hiesse, `belegung` an einem Objekt zu haben, bei dem
 * die Frage nicht gestellt wird, und `Zuordnung` an einem, bei dem sie nicht
 * beantwortbar ist.
 */
export interface Trasse {
  id: string
  bezeichnung: string
  vonRaumId: string
  nachRaumId: string
  belegung: Belegung
  /** Freier Querschnitt in mm², falls das Haus ihn angibt. */
  freiQuerschnittMm2?: number
  /** Was schon drinliegt. Klartext des Betreibers. */
  hinweis?: string
}

/**
 * Eine Ader (ein Port) einer Hausstrecke (Issue #15).
 *
 * ALLES FREITEXT, mit Absicht. Eine Tie-Line fuehrt „SDI 3", eine
 * Glasfaser „Faser 7/8", ein Datenkabel „Port 12" — und Stecker wie Signal
 * wandern mit der Technik („12G-SDI", „ST 2110", „SMF OS2"). Eine
 * geschlossene Liste waere hier die Liste von heute, und das Haus steht
 * laenger als sie.
 */
export interface StreckenAder {
  /** Bezeichnung der Ader am Haus („1", „SDI 3"). Eindeutig je Strecke. */
  nr: string
  /** Steckgesicht an der Blende („BNC", „LC-Duplex", „RJ45"). */
  stecker?: string
  /** Was die Ader fuehrt („12G-SDI", „Dante", „SMF"). */
  signal?: string
}

/** Eine fest verlegte Strecke des Hauses (Tie-Line, Leerrohr, Steigleitung). */
export interface HausStrecke {
  id: string
  bezeichnung: string
  vonRaumId: string
  nachRaumId: string
  /**
   * Die Blende (Anschlussfeld, Wandfeld), an der die Strecke im VON-Raum
   * endet — Bezeichner des Hauses („B2", „Wandfeld 3.OG-West"). Der Raum
   * allein sagt im Aufbau nicht, an welcher Wand man stecken muss.
   */
  vonBlende?: string
  /** Dasselbe am NACH-Ende. */
  nachBlende?: string
  /**
   * Die Adern der Strecke. FEHLT die Liste, hat niemand sie beschrieben —
   * das ist nicht dasselbe wie eine Strecke ohne Adern, und deshalb wird sie
   * beim Heilen auch nicht zu `[]` aufgefuellt.
   */
  adern?: StreckenAder[]
}

/**
 * Die ERKLAERTE Entsprechung zwischen einem Kabel des Plans und einer Strecke
 * des Hauses (ADR-002).
 *
 * Sie steht als Datensatz da, weil sie nur so entstehen kann: ein Mensch hat
 * gesagt, dass dieses Plan-Kabel diese Hausstrecke benutzt. Ein Namensvergleich
 * waere geraten, und geraten sieht hier genauso aus wie gewusst.
 */
export interface Zuordnung {
  planKabelId: string
  hausStreckeId: string
  /**
   * Die Ader (`StreckenAder.nr`), die das Plan-Kabel benutzt (Issue #15).
   * Fehlt sie, gilt die Zuordnung der GANZEN Strecke, wie vor v2.
   */
  ader?: string
  /** Wer die Zuordnung erklaert hat — der Beleg, nicht die Zierde. */
  erklaertVon?: string
}

/** Ein gemeldeter Mangel am Gebaeude — der einzige Rueckweg des Plans. */
export interface Mangel {
  id: string
  /** Id des Gebaeude-Objekts (Punkt, Kreis, Klinke, Strecke, Verteilung). */
  hausObjektId: string
  befund: string
  /** ISO-Zeitpunkt. Wird ANGEGEBEN — dieses Paket liest keine Uhr. */
  gemeldetAm: string
  gemeldetVon?: string
}

/**
 * Das Gebaeude, wie der Vertrag es sieht.
 *
 * `hausForeign` ist die ADR-005-Stelle: was das Gebaeude-Werkzeug schickt und
 * dieser Vertrag nicht kennt, wird unveraendert mitgefuehrt statt verworfen.
 * Ohne das Feld verliert jede Runde durch den Planer die Haelfte der Datei —
 * und zwar still.
 */
export interface Gebaeude {
  id: string
  name: string
  /** Die Etagen; ihre Reihenfolge ist die dieser Liste (cable-planner#911). */
  etagen: Etage[]
  raeume: Raum[]
  punkte: Anschlusspunkt[]
  stromkreise: Stromkreis[]
  verteilungen: Verteilung[]
  klinken: Steuerklinke[]
  strecken: HausStrecke[]
  /** Leerrohre, Kanaele, Kabelwege — was etwas AUFNIMMT (Issue #1). */
  trassen: Trasse[]
  /** Feste Schalterstellen des Hauses (Issue #1). */
  schaltstellen: Schaltstelle[]
  zuordnungen: Zuordnung[]
  maengel: Mangel[]
  hausForeign?: Record<string, unknown>
}

/** Ein leeres Gebaeude — Ausgangspunkt und Vorgabe fuer Tests. */
export const leeresGebaeude = (id: string, name: string): Gebaeude => ({
  id,
  name,
  etagen: [],
  raeume: [],
  punkte: [],
  stromkreise: [],
  verteilungen: [],
  klinken: [],
  strecken: [],
  trassen: [],
  schaltstellen: [],
  zuordnungen: [],
  maengel: [],
})

/** Ein Raum, wie ihn `avplan-facility` v1 schrieb: die Etage als Freitext. */
type RaumMitFreitext = Raum & { etage?: unknown }

/**
 * Die Id einer aus Freitext gewonnenen Etage — aus dem NAMEN abgeleitet.
 *
 * NICHT ZUFAELLIG, weil dieselbe v1-Datei an mehr als einer Stelle geheilt
 * wird: beim Laden hier, beim Einlesen einer Datei, in der Suite. Mit einer
 * Zufalls-Id bekaeme dieselbe Etage bei jedem Heilen eine andere, und wer
 * zwei geheilte Fassungen nebeneinanderlegt, saehe zwei Gebaeude. Belegt eine
 * vorhandene Etage die Id schon, wird hochgezaehlt — auch das haengt nur an
 * der Eingabe.
 */
const etagenIdAusName = (name: string, belegt: ReadonlySet<string>): string => {
  const basis = `etage:${name}`
  if (!belegt.has(basis)) return basis
  let n = 2
  while (belegt.has(`${basis}:${n}`)) n += 1
  return `${basis}:${n}`
}

/**
 * Freitext-Etagen (v1) in Etagen-Objekte ueberfuehren.
 *
 * Gleicher Text (ohne Rand-Leerzeichen) ist dieselbe Etage, und eine schon
 * vorhandene Etage GLEICHEN Namens wird wiederverwendet statt verdoppelt.
 * Mehr wird nicht zusammengelegt: „EG" und „eg" koennen zwei Schreibweisen
 * sein oder zwei Gebaeudeteile, und das entscheidet hier niemand fuer den
 * Betreiber. Er sieht beide in der Liste und legt sie selbst zusammen.
 *
 * Hat ein Raum schon eine `etageId`, gewinnt sie: sie ist die neuere Angabe.
 * Das Freitextfeld faellt in JEDEM Fall weg — stuende es neben `etageId`
 * weiter, gaebe es die Etage zweimal, und die zweite Fassung liefe beim
 * naechsten Umbenennen weg.
 *
 * Die Reihenfolge neuer Etagen ist die ihres ersten Auftretens. Eine
 * richtigere gibt es aus Freitext nicht; sie steht als Liste da und laesst
 * sich verschieben.
 *
 * Idempotent: ein geheiltes Gebaeude hat kein `etage` mehr, und ein Raum
 * ohne das Feld kommt als DASSELBE Objekt zurueck.
 */
const etagenAusFreitext = (
  etagen: Etage[],
  raeume: Raum[],
): { etagen: Etage[]; raeume: Raum[] } => {
  // Ein beschaedigter Eintrag (null, Zahl) ist kein Raum mit Freitext-Etage;
  // `in` auf ihm wuerfe, und das Laden fiele dann auf ein LEERES Gebaeude
  // zurueck, das die naechste Aenderung ueber die Ablage schriebe.
  const mitFreitext = (r: unknown): boolean => !!r && typeof r === 'object' && 'etage' in r
  if (!raeume.some(mitFreitext)) return { etagen, raeume }
  const alle = [...etagen]
  const belegt = new Set(alle.map((e) => e.id))
  const neueRaeume = raeume.map((r): Raum => {
    if (!mitFreitext(r)) return r
    const { etage, ...rest } = r as RaumMitFreitext
    const name = typeof etage === 'string' ? etage.trim() : ''
    if (rest.etageId !== undefined || name === '') return rest
    let ziel = alle.find((e) => e.name === name)
    if (!ziel) {
      ziel = { id: etagenIdAusName(name, belegt), name }
      alle.push(ziel)
      belegt.add(ziel.id)
    }
    return { ...rest, etageId: ziel.id }
  })
  return { etagen: alle, raeume: neueRaeume }
}

/**
 * Eine unvollstaendige oder unsinnige Lage (aus einer Datei) faellt weg. Eine
 * halbe Lage — Ursprung ohne Groesse — waere eine Flaeche, die jemand erfinden
 * muesste, um sie zu zeichnen. Idempotent: ohne kaputte Lage kommt dieselbe
 * Liste zurueck.
 */
const lagenHeilen = (raeume: Raum[]): Raum[] => {
  const kaputt = (r: unknown): boolean =>
    !!r && typeof r === 'object' && 'lage' in r && (r as Raum).lage !== undefined && !istRaumLage((r as Raum).lage)
  if (!raeume.some(kaputt)) return raeume
  return raeume.map((r) => {
    if (!kaputt(r)) return r
    const { lage: _weg, ...rest } = r
    void _weg
    return rest
  })
}

/**
 * Ein geladenes Gebaeude auf den heutigen Stand bringen.
 *
 * ─── WARUM DAS NICHT `?? []` AN JEDER LESESTELLE IST ───────────────────────
 *
 * Weil das dieselbe Entscheidung an zwanzig Stellen waere, und die
 * einundzwanzigste wird vergessen. `trassen` und `schaltstellen` kamen am
 * 2026-09-10 dazu; jede Datei, die vorher geschrieben wurde, hat die Felder
 * nicht. Ohne diese Funktion wirft die erste Schleife darueber, und zwar
 * nicht beim Laden, sondern irgendwo in einer Sicht.
 *
 * Dieselbe Rolle wie `healProjectPositions` im `cable-planner`: EINE Stelle,
 * an der ein altes Dokument zum aktuellen Schema wird — seit
 * `avplan-facility` v2 auch die Freitext-Etage (`etagenAusFreitext`).
 */
export const heileGebaeude = (g: Gebaeude): Gebaeude => {
  const { etagen, raeume } = etagenAusFreitext(g.etagen ?? [], g.raeume ?? [])
  return {
    ...g,
    etagen,
    raeume: lagenHeilen(raeume),
    punkte: g.punkte ?? [],
    stromkreise: g.stromkreise ?? [],
    verteilungen: g.verteilungen ?? [],
    klinken: g.klinken ?? [],
    strecken: g.strecken ?? [],
    trassen: g.trassen ?? [],
    schaltstellen: g.schaltstellen ?? [],
    zuordnungen: g.zuordnungen ?? [],
    maengel: g.maengel ?? [],
  }
}
