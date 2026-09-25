# Facility Planner

Das **Gebäude** als eigenes Werkzeug: Anschlusspunkte, Verteilung und Kreise,
die benannten Klinken der Haussteuerung — und der eine Rückweg für Mängel.

**Source language:** `en`

Die Oberfläche startet auf Englisch — auch auf einem deutschen Rechner. Deutsch
ist die erste Übersetzung und steht in **Einstellungen → Language**; die Wahl
überlebt den Neustart. Fehlt zu einem Schlüssel die Übersetzung, erscheint der
englische Quelltext: das ist die Rückfallebene und kein Fehler. Eine weitere
Sprache ist eine Datei unter `src/i18n/` plus ein Eintrag in `WOERTERBUECHER` —
keine Zeile Logik.

Die **Normbegriffe** übersetzt niemand: `TN-S`, `RCD Typ B`, `CEE 63`, `KNX`,
`DALI` heissen in jeder Sprache so. Übersetzt wird, was das Werkzeug sagt —
nicht, wie die Anlage heisst.

## Warum es dieses Repo gibt

Der Schnitt ist in
[ADR-006 „Der Schnitt"](https://github.com/larszu/av-planner-suite/blob/main/docs/decisions/ADR-006-werkzeug-schnitt.md)
entschieden und begründet, die Issues sind
[cable-planner#665](https://github.com/larszu/cable-planner/issues/665) und
[cable-planner#667](https://github.com/larszu/cable-planner/issues/667).

Ein Gebäude hat einen anderen Lebenszyklus als eine Show: es steht Jahre, es
wird von wechselnden Leuten gepflegt, und es gehört dem Betreiber. Der
Prüfstein aus dem ADR trennt beides sauber:

> *Wird das am Abbautag wieder eingepackt?* Ja → Show-Plan. Nein → hierher.

Schaltschrank, UP-/AP-Dose, fest verlegte Leitung, Bus-Systeme: hierher.
Mehrfachsteckdose, Verteiler, Powerlock-Satz, die Wechselschaltung im Aufbau:
bleiben im `cable-planner`. **`cable-planner#666` zieht deshalb nicht um** —
die Schaltungslogik der Show ist dort gebaut und gehört dorthin.

## Der Vertrag: sechs Fragen, ein Rückweg

`src/domain/vertrag.ts` ist die ausführbare Fassung des ADR-Abschnitts
„Der Vertrag ‚Festinstallation'".

| Frage | wofür |
| --- | --- |
| `einspeisung(punktId)` | Anschlussart, Netzform, Absicherung, RCD-Typ, Dauerleistung |
| `ort(objektId)` | Raum/Etage nach dem Bezeichner **des Hauses** |
| `kreisGeschwister(punktId)` | was am selben RCD hängt |
| `verfuegbarkeit(punktId)` | frei / belegt / geschaltet / gedimmt |
| `steuerklinken()` | KNX/DALI/Crestron: nur die benannten Klinken, nicht das Bus-Modell |
| `hausStrecke(planKabelId)` | gehört diese Strecke dem Haus — und auf welcher Ader liegt das Kabel? |

**KNX-Gruppenadressen lassen sich einlesen** statt abzutippen: die Ansicht
„Steuerung" liest den Gruppenadress-Export, den ETS selbst schreibt (CSV) —
nicht die Projektdatei `.knxproj`. Die ist ein ZIP mit dem ganzen Projekt,
teilweise verschlüsselt, und ihr inneres Schema wechselt mit jeder
ETS-Fassung; ein Leser dafür wäre geraten und beim nächsten Sprung still
falsch. Der Trenner wird erkannt und nicht angenommen (derselbe Export ist je
nach Gebietsschema semikolon- oder kommagetrennt), Ordner-Zeilen (`0/0/-`)
werden übersprungen, Adressen ausserhalb der Protokollgrenzen gezählt statt
durchgelassen.

**Einlesen gibt nichts frei.** Eine ETS-Datei enthält alle Gruppenadressen des
Hauses — auch Notlicht, Jalousien und Heizung. Heraus kommen deshalb
*Kandidaten*: welcher davon eine Klinke wird, entscheidet ein Mensch, mit
Richtung (Vorgabe `lesen`, die harmlose Hälfte) und Bedeutung. Der Gruppenname
aus der ETS steht als Vorschlag im Feld; er stammt von dem, der die Anlage
programmiert hat, nicht von dem, der freigibt.

**Etagen sind eine Liste, kein Freitext** (cable-planner#911). Die Sicht
„Räume" pflegt die Etagen des Hauses — Name, Höhe der Fertigfußboden-Oberkante
in Metern über dem Bezug des Hauses, Reihenfolge — und jeder Raum wählt seine
Etage daraus. Die Reihenfolge ist die der Liste; es gibt kein Rangfeld daneben.
Eine fehlende Höhe bleibt leer und wird nicht zu 0. Eine Etage, auf der noch
Räume stehen, lässt sich nicht entfernen: die Ablehnung nennt die Räume, statt
sie still auf „keine Etage" zu setzen. `ort()` antwortet wie bisher mit
`etage: string` — dem Namen der Etage.

**Die Sicht „Gebäude" zeigt das Haus als Bild** (QW12): Etagen
übereinander, jeder Raum als Körper auf seiner Etage, Hausstrecken (mit freien
Adern, z. B. „HS-01 · 4/8 frei") und Trassen von Decke zu Decke. Gedreht wird in
Vierteln, Etagen und einzelne Räume lassen sich ausblenden. Wo ein Raum liegt,
steht unter „Räume" als **Lage im Haus** — x, y, Breite und Tiefe in Metern vom
Bezugspunkt, alle vier oder keine. Ein Raum ohne Lage wird auf seiner Etage
eingereiht und gestrichelt gezeichnet, eine Etage ohne Höhe mit der
Geschosshöhe gestapelt; die Sicht sagt beides. Gezeichnet wird isometrisch in
SVG, ohne 3D-Bibliothek.

**Hausstrecken haben Endblenden und Adern** (Issue #15). Die Sicht
„Hausstrecken" trägt zu jeder Strecke die Blende, an der sie im Von- und im
Nach-Raum endet („B2", „Wandfeld 3.OG-West"), und ihre Adern mit Bezeichnung,
Stecker und Signal — alles Freitext, weil die Technik schneller wechselt als
das Haus. Eine Zuordnung darf eine Ader nennen (`ader`); ohne sie gilt sie wie
bisher der ganzen Strecke. Die **Belegung je Ader wird abgeleitet**, nicht
eingetragen: `frei`, `belegt` (mit den Plan-Kabeln) oder `unbekannt`, wenn ein
Plan-Kabel die Strecke benutzt, ohne eine Ader zu nennen — dann ist keine Ader
sicher frei. Zwei Plan-Kabel auf derselben Ader sind ein Konflikt, eine
Zuordnung auf eine Ader, die die Strecke nicht führt, wird gemeldet und nicht
verworfen. Wer eine Ader umbenennt, nimmt die Zuordnungen auf sie mit.

**Das Dateiformat ist `avplan-facility` v2.** Geschrieben wird v2, gelesen
werden v1 und v2. Neu in v2:

```
gebaeude.etagen: { id, name, hoeheM? }[]
gebaeude.raeume[].etageId?
gebaeude.raeume[].lage?: { xM, yM, breiteM, tiefeM }   (optional, ohne Versionssprung)
gebaeude.strecken[].vonBlende?, .nachBlende?, .adern?: { nr, stecker?, signal? }[]
gebaeude.zuordnungen[].ader?
```

Eine v1-Datei wird beim Lesen geheilt: aus jedem unterschiedlichen Freitext
`raeume[].etage` (ohne Rand-Leerzeichen) wird eine Etage mit der Id
`etage:<Name>`, der Raum verweist per `etageId` darauf, und das Freitextfeld
fällt weg. Die Id hängt nur am Namen, damit dieselbe Datei überall dieselben
Etagen ergibt; die Reihenfolge ist die des ersten Auftretens und lässt sich
danach verschieben. Mehr wird nicht zusammengelegt — „EG" und „eg" bleiben
zwei Etagen, bis der Betreiber sie zusammenführt.

Der eine Rückweg ist `mangelMelden(hausObjektId, befund)`. Eine Show ändert das
Haus nicht, sie benutzt es; die Ausnahme ist die Aussage eines Menschen über
einen Defekt.

**Die Tür rechnet nicht selbst.** `belastbarkeit()` gibt `watt: null` mit Grund
zurück, wenn das Gebäude keine Dauerleistung angibt. `absicherungA × 230` wäre
die naheliegendste Zeile und die gefährlichste: der Nennstrom ist die
Auslöseschwelle des Schutzschalters, nicht die zulässige Dauerlast.

## Die Grenze zum Show-Plan

**Dieses Repo kennt kein Show-Modell.** Kein `EquipmentItem`, kein
`CablePlannerProject`, und vor allem kein `solveCircuit` — der Schaltbild-Rechner
der Show gehört dem Planer, und ihn hier nachzubauen hiesse, dieselbe Rechnung
zweimal zu führen. `npm run grenze:check` misst das, CI führt es aus.

## Befehle

```bash
npm ci          # Installation — siehe Hinweis unten
npm run dev     # Vite, Port 4185 (fest, strictPort)
npm run build   # tsc -b && vite build
npm run lint
npm test        # vitest + Grenze zum Show-Plan + Quellsprache
npm run ci:complete    # jeder *:check wird auch wirklich gefahren

npm run electron:dev   # Desktop-Fassung lokal starten (baut vorher)
npm run dist:win       # Windows: Setup + Portable nach release/
npm run dist:mac       # macOS: je ein DMG fuer Intel und Apple Silicon
```

**Hinweis zur Installation.** Hier stand, `npm install` breche ab. Das ist zu
pauschal, und die Korrektur steht hier statt einer stillen Änderung, weil der
alte Satz jemanden davon abhielt, das Naheliegende zu versuchen: **mit der
committeten `package-lock.json` läuft `npm install` durch** — also im normalen
Fall nach einem `clone`.

Es bricht mit `Cannot read properties of null (reading 'edgesOut')` ab, sobald
npm den Peer-Graph OHNE Lockdatei neu auflösen muss (Lockdatei gelöscht,
frisches Verzeichnis). Das ist ein Fehler im Auflöser, nicht in diesem Projekt;
dann hilft `npm install --legacy-peer-deps`. `npm ci` fasst die Auflösung nie
an und ist deshalb der Weg, den CI geht.

*Gemessen am 2026-09-09 mit npm 10.9.7, in beiden Fällen und in beiden neuen
Repos: mit Lockdatei grün, ohne Lockdatei rot.*

## Drei Wege, dasselbe Werkzeug zu benutzen

| Weg | Wie er entsteht | Wofür |
| --- | --- | --- |
| Desktop (Windows/macOS) | Tag `v*` → `.github/workflows/release.yml` | Die Aufnahme im Haus, ohne Browser mit der richtigen Adresse |
| Web-Seite | Push auf `main` → `.github/workflows/pages.yml` | Draufschauen, ohne etwas zu installieren |
| Eingebettet in die Suite | `av-planner-suite` vendoriert dieses Repo | Alle Werkzeuge unter einer Oberfläche |

**Sie teilen ihre Aufnahme nicht.** Die Ablage ist `localStorage`, und Electron
hält die in seinem eigenen `userData`-Bereich — Desktop-Fassung und
Browser-Fassung sind zwei Aufnahmen auf demselben Rechner. Das ist keine Panne,
sondern die Eigenschaft der Ablage.

**Die Web-Seite ist noch nicht live.** Eine GitHub-Pages-Site kann nur ein
Mensch in den Repo-Einstellungen anlegen (*Settings → Pages → Source:
**GitHub Actions***); der `GITHUB_TOKEN` darf es nicht. Solange sie fehlt, baut
`pages.yml` trotzdem und überspringt nur das Veröffentlichen — mit einer
Warnung am Lauf statt einer roten Spalte auf `main`. Sobald die Freigabe da
ist, veröffentlicht der nächste Push von selbst; an der Datei ist nichts zu
ändern.

**Keine gekaufte Signatur.** Die macOS-Pakete tragen eine Ad-hoc-Signatur, die
Windows-Installer gar keine. Beim ersten Start meldet sich der jeweilige
Wächter des Betriebssystems; das ist erwartet und kein Zeichen eines defekten
Downloads.

## Stand

Das Modell (Raum, Anschlusspunkt, Stromkreis, Verteilung, Steuerklinke,
Hausstrecke, Mangel, dazu Trasse, Schaltstelle und Grundriss aus Issue #1,
Etage aus cable-planner#911, Ader und Endblende aus Issue #15), der Vertrag
als reine Funktionen, ein Speicher und neun Sichten darüber.

**Der Grundriss liegt als Verweis vor, nicht als Bild.** Das Dokument trägt
die Adresse und den Massstab (`meterProBild`), und die Lage eines Punktes
steht in METERN. Fehlt der Scan auf einem Rechner, zeigt die Sicht ein leeres
Feld und die Lagen bleiben gültig — an Bildpixel gehängt wären sie beim
nächsten Scan falsch, ohne dass es jemand merkt. Ohne Massstab wird gar nichts
gesetzt: eine geratene Länge sähe im Plan aus wie eine Auskunft des Hauses.

**Die Verbindung zum Show-Plan steht — anders, als hier stand.** Der Satz
„der Planer fragt den Vertrag noch nicht ab" war stehengeblieben;
nachgemessen am 2026-09-18 im `cable-planner` liest der Planer die
`.avfacility`-Datei (`project.hausAuskunft`), zeigt sie in einer eigenen
Abschnitts-Ansicht und prüft **fünf** Dinge dagegen
(`lib/drawingChecks.ts`): eine Dose, die es in der neuen Auskunft nicht mehr
gibt · eine gedimmte Dose unter einem Schaltnetzteil · eine geschaltete Dose
(Warnung, kein Fehler — für die Saalbeleuchtung ist sie richtig, für den
Medienserver das Ende der Show) · eine Klinke, die es nicht mehr gibt · die
Summe der Plangeräte gegen die angegebene Dauerleistung. Und er hält sich an
dieselbe Regel wie dieses Repo: *wo das Haus schweigt, schweigt auch der
Check.*

**Was wirklich fehlt, ist schmaler:** die Datei trägt die ANGABEN, nicht die
BEGRÜNDUNGEN. `belastbarkeit()` antwortet hier mit `{ bekannt: false, grund }`
— der Planer sieht nur, dass nichts dasteht, und kann nicht sagen, warum.
Das zu ändern heisst, `avplan-facility` um ein Feld zu erweitern, und das ist
ein Versionssprung in beiden Repos und keine Änderung nebenbei.

**Noch nicht hier:** Prüfprotokolle nach Norm und die Wartungshistorie. Der
Abgleich der sechs Fragen gegen den ADR-Text lebt in der Suite — dort liegen
ADR und Code im selben Baum.
