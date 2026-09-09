# Facility Planner

Das **Gebäude** als eigenes Werkzeug: Anschlusspunkte, Verteilung und Kreise,
die benannten Klinken der Haussteuerung — und der eine Rückweg für Mängel.

**Source language:** `de`

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
| `hausStrecke(planKabelId)` | gehört diese Strecke dem Haus? |

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
```

**Hinweis zur Installation:** `npm install` bricht mit
`Cannot read properties of null (reading 'edgesOut')` ab — ein Fehler im
Abhängigkeits-Auflöser von npm 10.9 an der Peer-Gruppe von `vitest`, nicht in
diesem Projekt. `npm ci` (aus der Lockdatei) läuft durch, und CI benutzt
ohnehin `npm ci`. Wer die Lockdatei erneuern muss:
`npm install --legacy-peer-deps`.

## Stand

Erste Fassung: das Modell (Raum, Anschlusspunkt, Stromkreis, Verteilung,
Steuerklinke, Hausstrecke, Mangel), der Vertrag als reine Funktionen, ein
Speicher und vier Sichten darüber.

**Noch nicht hier:** der Grundriss, Prüfprotokolle nach Norm, die
Wartungshistorie, und die Verbindung zum Show-Plan (der Planer fragt den
Vertrag noch nicht ab). Der Abgleich der sechs Fragen gegen den ADR-Text lebt
in der Suite — dort liegen ADR und Code im selben Baum.
