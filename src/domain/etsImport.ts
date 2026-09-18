// ───────────────────────────────────────────────────────────────────────────
// ETS-GRUPPENADRESSEN LESEN (#2, erster offener Punkt)
//
// „Import aus einer ETS-Projektdatei (KNX), damit die Klinken nicht von Hand
// abgetippt werden. BEDINGUNG: eine echte Beispieldatei oder eine Formatdoku —
// ohne die wäre der Leser geraten."
//
// ─── WAS GELESEN WIRD, UND WARUM NICHT DIE PROJEKTDATEI ───────────────────
//
// NICHT `.knxproj`. Die ist ein ZIP mit dem gesamten Projekt — Topologie,
// Geräte, Parameter, Applikationsprogramme —, teilweise verschlüsselt, und
// ihr inneres Schema wechselt mit jeder ETS-Fassung. Ein Leser dafür wäre
// genau das, was die Auflage verbietet: geraten, und beim nächsten ETS-Sprung
// still falsch.
//
// GELESEN WIRD DER GRUPPENADRESS-EXPORT, den ETS selbst anbietet
// („Gruppenadressen exportieren", CSV). Sein Aufbau ist von der KNX
// Association dokumentiert und in fremden Werkzeugen nachvollziehbar
// belegt — Kopfzeile und Spalten:
//
//   "Group name" · "Address" · "Central" · "Unfiltered" · "Description"
//   · "DatapointType" · "Security"
//
//   "Light & Power"                      "0/0/-"   ""  ""  ""          ""          "Auto"
//   "B0-0-L - Ceiling light - Switch"    "0/0/0"   ""  ""  "Kommentar" "DPST-1-1"  "Auto"
//
// Belegt an: KNX Association, „Group Address Export" (support.knx.org,
// Artikel 360022237580) und der Formatbeschreibung in `waldbaer/knx-ga-exporter`
// (README, Abschnitt CSV-Format), beide am 2026-09-18 gelesen.
//
// ─── DREI DINGE, DIE DIESER LESER NICHT BEHAUPTET ─────────────────────────
//
// 1. ER MACHT KEINE KLINKEN. Eine Klinke ist ein Vertragsgegenstand: jemand
//    hat sie FREIGEGEBEN. Eine ETS-Datei enthält alle Gruppenadressen des
//    Hauses — auch das Notlicht, die Jalousiesteuerung und die Heizung. Sie
//    alle zu Klinken zu machen hiesse, eine Freigabe zu erfinden, die niemand
//    erteilt hat. Der Leser liefert deshalb KANDIDATEN; welcher davon eine
//    Klinke wird, entscheidet ein Mensch.
// 2. ER RÄT DIE RICHTUNG NICHT. Ob eine Adresse gelesen oder geschaltet
//    werden darf, steht nicht in der Datei. Der Datenpunkttyp legt es nahe
//    (DPST-1-1 ist ein Schaltobjekt), aber „legt nahe" ist im Betrieb zu
//    wenig — wer eine Schaltadresse für eine Statusadresse hält, schaltet
//    beim Nachsehen das Licht aus. Die Vorgabe ist deshalb `lesen`: das ist
//    die harmlose Hälfte, und sie muss ohnehin bestätigt werden.
// 3. ER FÜLLT KEINE BEDEUTUNG. Der Gruppenname aus der ETS ist ein
//    VORSCHLAG für die Bedeutung, kein Ersatz: er stammt vom Programmierer
//    der Anlage und nicht vom Betreiber, der die Klinke freigibt. Ohne Name
//    im Export bleibt der Vorschlag leer, und die Klinke lässt sich nicht
//    anlegen — genau so, wie es beim Tippen von Hand auch ist.
// ───────────────────────────────────────────────────────────────────────────

import { quelle, type Uebersetzen } from '../i18n/quelle'

export interface EtsKandidat {
  /** Gruppenadresse, wie sie in der Datei steht: `1/2/3`, `1/3` oder `2563`. */
  adresse: string
  /** Gruppenname aus der ETS — Vorschlag für die Bedeutung, kein Ersatz. */
  name: string
  /** Freitext-Spalte „Description" der ETS, wenn gefüllt. */
  beschreibung?: string
  /** Datenpunkttyp, etwa `DPST-1-1`. Wird angezeigt, nicht ausgewertet. */
  datenpunkt?: string
}

export interface EtsBefund {
  kandidaten: EtsKandidat[]
  /** Haupt-/Mittelgruppen-Zeilen (`0/-/-`, `0/0/-`): Ordner, keine Adressen. */
  ordner: number
  /** Zeilen, deren Adresse keine KNX-Gruppenadresse ist. */
  unlesbar: number
  /** Adressen, die mehrfach in der Datei stehen. Die erste gewinnt. */
  doppelt: string[]
  /** Womit die Datei ihre Felder trennt — erkannt, nicht angenommen. */
  trenner: '\t' | ';' | ','
  /** Ob eine Kopfzeile erkannt wurde (ETS bietet sie optional an). */
  kopfzeile: boolean
  /** Leserlicher Grund, wenn gar nichts herauskam. */
  grund?: string
}

const TRENNER = ['\t', ';', ','] as const

/**
 * Der Trenner wird ERKANNT und nicht angenommen.
 *
 * ETS lässt ihn wählen, und die Voreinstellung hängt am Gebietsschema des
 * Rechners, auf dem exportiert wurde: derselbe Export ist in Deutschland
 * semikolon- und anderswo kommagetrennt. Ein fest eingebauter Trenner wäre
 * ein Leser, der bei jedem zweiten Haus scheitert — und zwar mit „Datei
 * leer" statt mit „falscher Trenner".
 *
 * Gemessen wird an der ERSTEN Zeile: gewählt ist der Trenner, der dort am
 * häufigsten AUSSERHALB von Anführungszeichen steht. Ausserhalb, weil ein
 * Gruppenname „Küche, Decke" heissen darf.
 */
export function erkenneTrenner(erste: string): '\t' | ';' | ',' {
  let bester: '\t' | ';' | ',' = '\t'
  let meiste = -1
  for (const t of TRENNER) {
    const n = zerlege(erste, t).length
    if (n > meiste) {
      meiste = n
      bester = t
    }
  }
  return bester
}

/** Eine CSV-Zeile in Felder, mit `""` als maskiertem Anführungszeichen. */
function zerlege(zeile: string, trenner: string): string[] {
  const felder: string[] = []
  let feld = ''
  let inAnfuehrung = false
  for (let i = 0; i < zeile.length; i++) {
    const c = zeile[i]
    if (inAnfuehrung) {
      if (c === '"') {
        if (zeile[i + 1] === '"') {
          feld += '"'
          i++
        } else inAnfuehrung = false
      } else feld += c
    } else if (c === '"') inAnfuehrung = true
    else if (c === trenner) {
      felder.push(feld)
      feld = ''
    } else feld += c
  }
  felder.push(feld)
  return felder
}

/**
 * Ist das eine Gruppenadresse — und wenn ja, eine echte?
 *
 * ETS kennt drei Darstellungen, und alle drei kommen im Export vor:
 * dreistufig (`1/2/3`), zweistufig (`1/3`) und frei (eine Zahl bis 65535).
 * Eine Stufe mit `-` ist eine ORDNER-Zeile (`0/0/-` ist die Mittelgruppe,
 * unter der die Adressen hängen) und keine Adresse.
 *
 * Die Grenzen sind die des Protokolls: Hauptgruppe 0–31, Mittelgruppe 0–7,
 * Untergruppe 0–255 (dreistufig) bzw. 0–2047 (zweistufig). Eine „32/1/1"
 * gibt es nicht; sie durchzulassen hiesse, eine Adresse anzubieten, die kein
 * Gerät je hört.
 */
export function adressArt(roh: string): 'adresse' | 'ordner' | 'unlesbar' {
  const s = roh.trim()
  if (!s) return 'unlesbar'
  if (s.includes('-')) return s.split('/').some((teil) => teil.trim() === '-') ? 'ordner' : 'unlesbar'

  const teile = s.split('/')
  const zahl = (x: string) => (/^\d+$/.test(x.trim()) ? Number(x.trim()) : NaN)

  if (teile.length === 3) {
    const [h, m, u] = teile.map(zahl)
    return h >= 0 && h <= 31 && m >= 0 && m <= 7 && u >= 0 && u <= 255 ? 'adresse' : 'unlesbar'
  }
  if (teile.length === 2) {
    const [h, u] = teile.map(zahl)
    return h >= 0 && h <= 31 && u >= 0 && u <= 2047 ? 'adresse' : 'unlesbar'
  }
  if (teile.length === 1) {
    const n = zahl(teile[0]!)
    return n >= 1 && n <= 65535 ? 'adresse' : 'unlesbar'
  }
  return 'unlesbar'
}

/** Sieht diese Zeile nach der Kopfzeile aus, die ETS optional mitschreibt? */
const istKopfzeile = (felder: readonly string[]): boolean => {
  const erste = (felder[0] ?? '').trim().toLowerCase()
  const zweite = (felder[1] ?? '').trim().toLowerCase()
  return (
    (erste.includes('group') && erste.includes('name')) ||
    erste === 'gruppenname' ||
    zweite === 'address' ||
    zweite === 'adresse'
  )
}

/**
 * Den Gruppenadress-Export lesen.
 *
 * Herauskommen KANDIDATEN, keine Klinken — siehe Kopf dieser Datei. Was nicht
 * gelesen werden konnte, wird GEZÄHLT und nicht verschwiegen: ein Import, der
 * still die Hälfte weglässt, ist schlimmer als einer, der gar nicht läuft.
 */
export function leseEtsExport(text: string, t: Uebersetzen = quelle): EtsBefund {
  const zeilen = text.split(/\r?\n/).filter((z) => z.trim() !== '')
  if (zeilen.length === 0) {
    return {
      kandidaten: [],
      ordner: 0,
      unlesbar: 0,
      doppelt: [],
      trenner: '\t',
      kopfzeile: false,
      grund: t('ets.empty', 'The file has no lines.'),
    }
  }

  const trenner = erkenneTrenner(zeilen[0]!)
  const reihen = zeilen.map((z) => zerlege(z, trenner))
  const kopfzeile = istKopfzeile(reihen[0]!)
  const daten = kopfzeile ? reihen.slice(1) : reihen

  const kandidaten: EtsKandidat[] = []
  const gesehen = new Set<string>()
  const doppelt: string[] = []
  let ordner = 0
  let unlesbar = 0

  for (const r of daten) {
    const name = (r[0] ?? '').trim()
    const adresse = (r[1] ?? '').trim()
    const art = adressArt(adresse)
    if (art === 'ordner') {
      ordner += 1
      continue
    }
    if (art === 'unlesbar') {
      unlesbar += 1
      continue
    }
    if (gesehen.has(adresse)) {
      doppelt.push(adresse)
      continue
    }
    gesehen.add(adresse)
    const beschreibung = (r[4] ?? '').trim()
    const datenpunkt = (r[5] ?? '').trim()
    kandidaten.push({
      adresse,
      name,
      ...(beschreibung ? { beschreibung } : {}),
      ...(datenpunkt ? { datenpunkt } : {}),
    })
  }

  return {
    kandidaten,
    ordner,
    unlesbar,
    doppelt,
    trenner,
    kopfzeile,
    ...(kandidaten.length === 0
      ? {
          grund: t(
            'ets.nothing',
            'No group address in this file. Is it the ETS group address export (CSV)?',
          ),
        }
      : {}),
  }
}
