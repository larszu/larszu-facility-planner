// ───────────────────────────────────────────────────────────────────────────
// Deutsche Übersetzung des Gebäude-Werkzeugs.
//
// Englisch ist die Quellsprache (E-28, Nutzer-Entscheidung 2026-09-11): sie
// steht als zweites Argument in `t()` direkt im JSX. Hier steht NUR die
// Übersetzung. Fehlt ein Schlüssel, erscheint der englische Quelltext — das
// ist kein Fehler, sondern die Rückfallebene.
//
// Eine weitere Sprache ist eine Datei wie diese plus ein Eintrag in
// `WOERTERBUECHER` (`i18n/index.ts`). Keine Zeile Logik.
//
// WAS HIER NICHT STEHT: die Normbegriffe. `TN-S`, `TN-C-S`, `TT`, `IT`,
// `RCD`, `CEE`, `KNX`, `DALI` sind Namen und keine Beschriftungen — sie
// stehen in jeder Sprache so da, und sie zu übersetzen hiesse, den
// Prüfbericht nicht mehr wiederzufinden.
//
// Sortiert nach Schlüssel, damit ein fehlender Eintrag beim Lesen auffällt
// und zwei Leute nicht an derselben Stelle einfügen.
// ───────────────────────────────────────────────────────────────────────────
export const de: Record<string, string> = {
  // ── Der Vorgabename eines neuen Gebäudes ──
  //
  // Er ist Anzeige UND Datum: die Kopfzeile zeigt ihn, wenn kein Name
  // eingetragen ist, und „Neues Gebäude" schreibt ihn hinein. Beides ist
  // richtig so — es ist ein Name, den der Nutzer ändert, sobald sein Haus
  // anders heisst. Die Rückfallebene beim Laden einer kaputten Datei
  // (`gebaeudeStore`, `gebaeudeDatei`) bleibt dagegen fest englisch: dort
  // gibt es keine Oberfläche, die eine Sprache hätte.
  'building.default': 'Gebäude',

  // ── Pflege, die abgelehnt werden kann (domain/pflege.ts) ──
  'care.core.duplicate': 'Diese Strecke hat schon eine Ader „{nr}".',
  'care.core.empty': 'Eine Ader braucht eine Bezeichnung — über sie nennt ein Plan-Kabel die Ader.',
  'care.core.missing': 'Die Strecke „{id}" hat keine Ader an Stelle {stelle}.',
  'care.floor.inUse':
    'Die Etage „{name}" ist noch diesen Räumen zugeordnet: {raeume}. Hänge sie zuerst an eine andere Etage — sonst verlören sie ihre Etage, ohne dass es jemand merkt.',
  'care.run.missing': 'Es gibt keine Strecke mit der Id „{id}".',

  // ── Was überall gleich heißt ──
  'common.add': 'Anlegen',
  'common.kind': 'Art',
  'common.name': 'Bezeichnung',
  'common.no': 'nein',
  'common.notStated': 'nicht angegeben',
  'common.note': 'Hinweis',
  'common.remove': 'Entfernen',
  'common.room': 'Raum',
  'common.yes': 'ja',

  // ── Der Vertrag (domain/vertrag.ts) ──
  'contract.defect.duplicate': 'Ein Mangel mit der Id „{id}" ist schon gemeldet.',
  'contract.defect.noFinding': 'Ein Mangel ohne Befund ist keine Meldung.',
  'contract.defect.noRecipient':
    'Das Gebäude kennt kein Objekt „{id}" — die Meldung hätte keinen Empfänger.',
  'contract.load.notStated':
    'Dauerleistung nicht angegeben. {a} A (Charakteristik {c}) ist die Auslöseschwelle, nicht die zulässige Dauerlast — sie ergibt sich erst mit Querschnitt, Länge, Häufung und Gleichzeitigkeit.',
  'contract.place.isRoute':
    '„{name}" ist eine Strecke und verbindet zwei Räume — sie hat keinen Ort. Frage ihre Enden.',
  'contract.place.noObject': 'Kein Gebäude-Objekt mit der Id „{id}".',
  'contract.place.noSuchRoom': 'Objekt „{id}" verweist auf den Raum „{raum}", den es nicht gibt.',
  'contract.siblings.noCircuit': 'Für „{name}" ist kein Stromkreis angegeben.',
  'contract.siblings.noPoint': 'Kein Anschlusspunkt mit der Id „{id}".',
  'contract.siblings.noSuchCircuit':
    '„{name}" verweist auf den Stromkreis „{kreis}", den es nicht gibt.',

  // ── Steuerung ──
  'control.address': 'Adresse',
  'control.addressKind': 'Adressart',
  'control.direction': 'Richtung',
  'control.direction.read': 'lesen',
  'control.direction.write': 'schalten',
  // ETS-Import (#2). „KNX", „ETS", „DPST" bleiben, wie sie heissen — Namen,
  // keine Beschriftungen.
  'ets.head': 'KNX-Gruppenadressen einlesen (ETS-Export)',
  'ets.intro':
    'Liest den Gruppenadress-Export, den ETS schreibt (CSV) – nicht die Projektdatei .knxproj. Einlesen gibt nichts frei: wähle die Adressen aus, die die Show benutzen darf, und sage zu jeder, was sie bewirkt.',
  'ets.file': 'ETS-Gruppenadress-Export (CSV)',
  'ets.done': '{n} Klinken freigegeben.',
  'ets.found': '{n} Gruppenadressen · {ordner} Ordner-Zeilen übersprungen · {unlesbar} unlesbar',
  'ets.duplicates': '{n} doppelte Adressen – die erste gilt',
  'ets.table.caption':
    'Der Gruppenname aus der ETS ist ein Vorschlag für die Bedeutung, kein Ersatz: er stammt von dem, der die Anlage programmiert hat, nicht von dem, der die Klinke freigibt.',
  'ets.take': 'Übernehmen',
  'ets.datapoint': 'Datenpunkt',
  'ets.takeOne': '{address} freigeben',
  'ets.directionOf': 'Richtung für {address}',
  'ets.meaningOf': 'Bedeutung von {address}',
  'ets.needMeaning': '{n} der gewählten Adressen haben noch keine Bedeutung – sie bleiben draussen.',
  'ets.release': '{n} Klinken freigeben',
  'ets.empty': 'Die Datei hat keine Zeilen.',
  'ets.nothing': 'Keine Gruppenadresse in dieser Datei. Ist es der ETS-Gruppenadress-Export (CSV)?',
  'control.empty':
    'Keine Klinke freigegeben. Solange hier nichts steht, darf die Show die Haussteuerung nicht ansprechen — und das ist die richtige Vorgabe: eine Adresse, die niemand beschrieben hat, ist keine Freigabe.',
  'control.kind.broadcast': 'Broadcast — ALLES am Bus',
  'control.kind.broadcast.short': 'Broadcast',
  'control.kind.group': 'Gruppe — alles in dieser Gruppe',
  'control.kind.group.short': 'Gruppe',
  'control.kind.short': 'Kurzadresse — ein Vorschaltgerät',
  'control.kind.short.short': 'Kurzadresse',
  'control.meaning': 'Bedeutung',
  'control.meaning.placeholder': 'Was passiert, wenn man sie benutzt',
  'control.release': 'Freigeben',
  'control.system': 'System',
  'control.table.caption':
    'Hervorgehoben: eine DALI-Adresse ohne Art. „3" ist dort ein Vorschaltgerät, eine Gruppe von dreissig Leuchten oder alles am Bus — die Adresse allein sagt das nicht.',

  // ── Mängel ──
  'defects.col.by': 'Von',
  'defects.col.object': 'Objekt',
  'defects.col.reported': 'Gemeldet',
  'defects.empty':
    'Kein Mangel gemeldet. Was hier fehlt, ist keine Zusicherung — es heisst nur, dass niemand etwas eingetragen hat.',
  'defects.finding': 'Befund',
  'defects.finding.placeholder': 'Was ist aufgefallen',
  'defects.kind.board': 'Verteilung: {name}',
  'defects.kind.circuit': 'Kreis: {name}',
  'defects.kind.hook': 'Klinke: {name}',
  'defects.kind.point': 'Punkt: {name}',
  'defects.kind.room': 'Raum: {name}',
  'defects.report': 'Melden',
  'defects.target.aria': 'Betroffenes Objekt',
  'defects.target.none': '— Objekt wählen —',

  // ── Verteilung ──
  'dist.basis.circuit': 'Stromkreis — Untergrenze, kein RCD angegeben',
  'dist.basis.rcd': 'RCD — vollständig',
  'dist.basis.unknown': 'nicht bekannt',
  'dist.circuit.add': 'Kreis anlegen',
  'dist.circuit.aria': 'Bezeichnung des Stromkreises',
  'dist.circuit.placeholder': 'Neuer Stromkreis',
  'dist.col.basis': 'Grundlage',
  'dist.col.circuits': 'Kreise',
  'dist.col.linkedWith': 'Hängt zusammen mit',
  'dist.col.point': 'Punkt',
  'dist.empty':
    'Noch keine Verteilung. Ein Schaltschrank ist der Ort, an dem die Kreise des Gebäudes anfangen — und der Grund, warum zwei Dosen in verschiedenen Räumen gemeinsam abschalten können.',
  'dist.kind.cabinet': 'Schaltschrank',
  'dist.kind.sub': 'Unterverteilung',
  'dist.new.aria': 'Bezeichnung der Verteilung',
  // suite#231 — jede Eintrage-Stelle steht jetzt in einem Block mit
  // Ueberschrift statt als nackte Feldzeile.
  'dist.create.head': 'Verteilung anlegen',
  'dist.circuit.head': 'Stromkreis anlegen',
  'dist.new.placeholder': 'Neuer Schaltschrank / neue Unterverteilung',
  'dist.rcd.placeholder': 'RCD (leer = nicht angegeben)',
  'dist.table.boards': 'Verteilungen',
  'dist.table.together': 'Was schaltet gemeinsam ab?',
  'dist.withNothing': 'mit nichts',

  // ── Datei ──
  'file.load.aria': 'Gebäude-Datei laden',
  'file.unreadable':
    'Das ist keine Gebäude-Datei dieses Werkzeugs, oder sie stammt aus einer neueren Fassung. Es wurde nichts übernommen.',
  'file.writeFailed':
    'Der letzte Stand konnte nicht gespeichert werden: {grund}. Was seither eingetragen wurde, steht nur im Fenster.',

  // ── Kopfzeile und Datei-Menü ──
  'menu.about': 'Über Facility Planner…',
  'menu.file': 'Datei',
  'menu.help': 'Hilfe',
  'menu.new': 'Neues Gebäude',
  'menu.new.confirm': 'Neues Gebäude — das aktuelle wird ersetzt. Fortfahren?',
  'menu.open': 'Öffnen…',
  'menu.save': 'Speichern',
  'menu.saveAs': 'Speichern unter…',
  'menu.saveAs.prompt': 'Dateiname',

  // ── Grundriss ──
  'plan.clearPosition': 'Lage löschen',
  'plan.hint.pickFirst': 'Wähle oben einen Punkt und klicke ins Feld, um ihn zu verorten.',
  'plan.hint.without': 'Noch ohne Lage: {namen}.',
  'plan.image.alt': 'Grundriss {name}',
  'plan.image.missing':
    'Das Bild liegt auf diesem Rechner nicht vor. Die Lagen bleiben gültig — sie stehen in Metern, nicht in Pixeln.',
  'plan.image.none':
    'Kein Grundriss hinterlegt. Die Lagen lassen sich trotzdem setzen, sobald ein Massstab da ist.',
  'plan.marker.title': '{name} — {x} m / {y} m',
  'plan.noScale':
    'Ohne Massstab wird nichts gesetzt. Ein Klick ins Bild ist ein Bruchteil einer Bildbreite; erst „Meter je Bildbreite" macht daraus eine Länge. Eine hier geratene Zahl sähe im Plan aus wie eine Auskunft des Hauses.',
  'plan.noRoom':
    'Noch kein Raum angelegt. Ein Grundriss gehört zu einem Raum — lege zuerst unter „Räume" einen an.',
  'plan.notPlaced': 'noch nicht verortet',
  'plan.pick.aria': 'Punkt zum Setzen',
  'plan.pick.none': 'Punkt zum Setzen …',
  'plan.scale': 'Meter je Bildbreite',
  'plan.scale.placeholder': 'm/Bild',
  'plan.source': 'Bildquelle',
  'plan.source.placeholder': 'Bildquelle (Pfad oder URL)',
  'plan.table.caption':
    'Punkte dieses Raums. „Noch nicht verortet" ist eine Angabe und keine Lücke — deshalb steht hier kein 0/0.',
  'plan.x.aria': 'x von {name} in Metern',
  'plan.y.aria': 'y von {name} in Metern',

  // ── Anschlusspunkte ──
  'points.breaker.aria': 'Absicherung von {name}',
  'points.col.breaker': 'Absicherung',
  'points.col.connector': 'Anschluss',
  'points.col.dimmed': 'Gedimmt',
  'points.col.form': 'Bauform',
  'points.col.free': 'Frei',
  'points.col.load': 'Dauerlast',
  'points.col.place': 'Ort',
  'points.col.switched': 'Geschaltet',
  'points.col.system': 'Netzform',
  'points.connector.aria': 'Anschlussart von {name}',
  'points.empty':
    'Noch kein Anschlusspunkt. Ein Punkt ist alles, woran der Aufbau Strom bekommt — die Einspeisung am Schaltschrank ebenso wie die Dose in der Wand. Beide tragen dieselben Angaben, weil ein Plan von beiden dasselbe wissen muss.',
  'points.form.aria': 'Bauform von {name}',
  'points.form.floorBox': 'Bodentank',
  'points.form.other': 'Sonstige',
  'points.form.trunking': 'Brüstungskanal',
  'points.form.underfloor': 'Unterflurdose',
  'points.form.wall': 'Wanddose',
  'points.form.wallOutlet': 'Wandauslass',
  'points.free': 'frei',
  'points.kind.feed': 'Einspeisung',
  'points.kind.outlet': 'Dose',
  'points.new.aria': 'Bezeichnung des Anschlusspunkts',
  'points.create.head': 'Anschlusspunkt anlegen',
  'points.new.placeholder': 'Neuer Anschlusspunkt',
  'points.rcd.aria': 'RCD-Typ von {name}',
  'points.room.default': 'Raum 1',
  'points.room.placeholder': 'Raum (wird mit angelegt)',
  'points.system.aria': 'Netzform von {name}',

  // ── Räume und Etagen ──
  'rooms.add': 'Raum anlegen',
  'rooms.create.head': 'Raum anlegen',
  'rooms.empty':
    'Noch kein Raum. Der Plan findet alles in diesem Gebäude über den Raum — unter dem Bezeichner, den das Haus benutzt, nicht unter einem, den der Plan erfindet.',
  'rooms.floor': 'Etage',
  'rooms.floor.add': 'Etage anlegen',
  'rooms.floor.aria': 'Etage von {name}',
  'rooms.floor.caption':
    'Die Reihenfolge dieser Liste ist die Reihenfolge der Etagen. Höhe: Fertigfußboden in Metern über dem Bezug des Hauses — leer heißt nicht angegeben, nicht 0.',
  'rooms.floor.col.order': 'Reihenfolge',
  'rooms.floor.col.rooms': 'Räume',
  'rooms.floor.create.head': 'Etage anlegen',
  'rooms.floor.down.aria': '{name} nach unten schieben',
  'rooms.floor.empty':
    'Noch keine Etage erfasst. Eine Etage wird hier einmal benannt und am Raum gewählt — so wird aus einem Tippfehler keine zweite Etage.',
  'rooms.floor.level': 'Höhe (m)',
  'rooms.floor.level.aria': 'Höhe von {name} in Metern',
  'rooms.floor.missing': 'fehlende Etage ({id})',
  'rooms.floor.name.aria': 'Bezeichnung der Etage {n}',
  'rooms.floor.name.placeholder': 'z. B. EG, 1. OG, UG',
  'rooms.floor.up.aria': '{name} nach oben schieben',
  'rooms.head': 'Räume',
  'rooms.houseId': 'Hausbezeichner',
  'rooms.houseId.aria': 'Hausbezeichner von {name}',
  'rooms.houseId.placeholder': 'wie am Türschild (z. B. EG.01)',
  'rooms.name.aria': 'Bezeichnung des Raums {id}',
  'rooms.name.placeholder': 'z. B. Großer Saal',

  // ── Trassen ──
  'routes.add': 'Trasse anlegen',
  'routes.best.free': 'frei',
  'routes.best.full': 'voll',
  'routes.best.none': 'keine Trasse zwischen diesen Räumen',
  'routes.best.partial': 'teilbelegt',
  'routes.best.unknown': 'unbekannt',
  'routes.col.best': 'Bester Weg',
  'routes.col.from': 'Von',
  'routes.col.to': 'Nach',
  'routes.empty': 'Noch keine Trasse erfasst.',
  'routes.from': 'von …',
  'routes.from.aria': 'Von Raum',
  'routes.load': 'Belegung',
  'routes.load.free': 'frei',
  'routes.load.full': 'voll',
  'routes.load.partial': 'teilbelegt',
  'routes.load.unknown': 'unbekannt — niemand hat nachgesehen',
  'routes.name': 'Bezeichnung',
  'routes.name.placeholder': 'Bezeichnung (z. B. Leerrohr Bühne–Regie)',
  'routes.needRooms':
    'Eine Trasse verbindet zwei Räume. Lege zuerst unter „Räume" mindestens zwei Räume an.',
  'routes.note': 'Hinweis',
  'routes.note.placeholder': 'Was liegt schon drin?',
  'routes.to': 'nach …',
  'routes.to.aria': 'Nach Raum',

  // ── Hausstrecken ──
  'runs.add': 'Strecke anlegen',
  'runs.col.cores': 'Adern',
  'runs.col.fromPlate': 'Endblende (von)',
  'runs.col.toPlate': 'Endblende (nach)',
  'runs.core.add': 'Ader anlegen',
  'runs.core.col.occupancy': 'Belegung',
  'runs.core.conflict': 'Konflikt: {kabel} auf derselben Ader',
  'runs.core.connector': 'Stecker',
  'runs.core.connector.aria': 'Stecker der Ader {nr}',
  'runs.core.connector.placeholder': 'z. B. BNC, LC-Duplex, RJ45',
  'runs.core.create.head': 'Ader anlegen',
  'runs.core.free': 'frei',
  'runs.core.nr': 'Ader',
  'runs.core.nr.aria': 'Bezeichnung der Ader {nr}',
  'runs.core.nr.placeholder': 'z. B. 3',
  'runs.core.signal': 'Signal',
  'runs.core.signal.aria': 'Signal der Ader {nr}',
  'runs.core.signal.placeholder': 'z. B. 12G-SDI, Dante, SMF',
  'runs.core.taken': 'belegt durch {kabel}',
  'runs.core.unknown': 'unbekannt — ein Plan-Kabel benutzt die Strecke, ohne eine Ader zu nennen',
  'runs.cores.count': '{n} Adern · {belegt} belegt',
  'runs.cores.empty':
    'Für diese Strecke ist keine Ader beschrieben. Bis dahin kann ein Plan-Kabel sie nur als Ganzes benutzen.',
  'runs.cores.head': 'Adern und Belegung',
  'runs.cores.none': 'nicht beschrieben',
  'runs.create.head': 'Hausstrecke anlegen',
  'runs.duplicateCore':
    'Die Aderbezeichnung „{nr}" kommt mehr als einmal vor. Eine Zuordnung darauf kann nicht sagen, welche gemeint ist.',
  'runs.empty': 'Noch keine Hausstrecke erfasst.',
  'runs.ends': '{von} ({vonBlende}) → {nach} ({nachBlende})',
  'runs.fromPlate.aria': 'Endblende von {name} im Von-Raum',
  'runs.name.placeholder': 'z. B. Tie-Line Bühne–Regie',
  'runs.needRooms':
    'Eine Hausstrecke verbindet zwei Räume. Lege zuerst unter „Räume" mindestens zwei Räume an.',
  'runs.pick.aria': 'Hausstrecke',
  'runs.plate.placeholder': 'z. B. B2, Wandfeld West',
  'runs.toPlate.aria': 'Endblende von {name} im Nach-Raum',
  'runs.unknownCore':
    'Plan-Kabel {kabel} ist der Ader „{ader}" zugeordnet, die diese Strecke nicht hat. Die Zuordnung bleibt stehen, bis der Plan sie ändert.',
  'runs.whole':
    'Als Ganzes benutzt von {kabel}. Welche Ader das belegt, ist nicht angegeben — deshalb gilt keine Ader dieser Strecke als frei.',

  // ── Einstellungen ──
  'settings.about': 'Über',
  'settings.about.body': 'Das Gebäude-Werkzeug der AV-Planner-Suite (ADR-006).',
  'settings.close': 'Schliessen',
  'settings.language': 'Sprache',
  'settings.language.hint':
    'Englisch ist die Quellsprache, Deutsch eine Übersetzung. Fehlt ein Eintrag, erscheint der englische Text.',
  'settings.theme': 'Thema',
  'settings.theme.dark': 'Dunkel',
  'settings.theme.dark.hint': 'Immer dunkel, unabhängig vom System.',
  'settings.theme.light': 'Hell',
  'settings.theme.light.hint': 'Immer hell, unabhängig vom System.',
  'settings.theme.system': 'Dem System folgen',
  'settings.theme.system.hint': 'Übernimmt, was das Betriebssystem sagt.',
  'settings.title': 'Einstellungen',

  // ── Schaltstellen ──
  'switches.add': 'Schaltstelle anlegen',
  'switches.assign.aria': 'Punkt zu {name} zuordnen',
  'switches.assign.none': 'hinzufügen …',
  'switches.col.assign': 'Punkt zuordnen',
  'switches.col.source': 'Quelle',
  'switches.col.switched': 'Geschaltet?',
  'switches.col.switches': 'Schaltet',
  'switches.empty': 'Noch keine Schaltstelle erfasst.',
  'switches.name.placeholder': 'Bezeichnung (z. B. Schalter Bühne links)',
  'switches.note.placeholder': 'Hinweis (z. B. schaltet ab 22:00)',
  'switches.origin.hint':
    'Vier Antworten und nicht zwei. „Unbekannt" heisst nicht „nein" — der Unterschied ist der, der im Aufbau zählt.',
  'switches.origin.no': 'nicht geschaltet',
  'switches.origin.point': 'benannte Stelle',
  'switches.origin.stated': 'Angabe des Betreibers, ohne Stelle',
  'switches.origin.title': 'Je Anschlusspunkt: woher wissen wir das?',
  'switches.origin.unknown': 'unbekannt — niemand hat es gesagt',
  'switches.room.none': 'Raum …',
  'switches.type': 'Bauart',
  'switches.type.dimmer': 'Dimmer',
  'switches.type.double': 'Serienschalter',
  'switches.type.intermediate': 'Kreuzschalter',
  'switches.type.key': 'Schlüsselschalter',
  'switches.type.push': 'Taster',
  'switches.type.single': 'Ausschalter',
  'switches.type.timer': 'Zeitschaltuhr',
  'switches.type.twoWay': 'Wechselschalter',

  // ── Reiter und ihre Fragen ──
  'tab.control': 'Steuerung',
  'tab.control.q': 'Welche Klinken der Haussteuerung stehen der Show offen?',
  'tab.defects': 'Mängel',
  'tab.defects.q': 'Was hat jemand von aussen über dieses Gebäude gemeldet?',
  'tab.distribution': 'Verteilung',
  'tab.distribution.q': 'Welche Kreise hängen zusammen — und woran?',
  'tab.floorPlan': 'Grundriss',
  'tab.floorPlan.q': 'Wo im Raum sitzt dieser Punkt — nicht nur in welchem?',
  'tab.rooms': 'Räume',
  'tab.rooms.q': 'Welche Etagen und Räume hat das Gebäude — unter seinen eigenen Namen?',
  'tab.runs': 'Hausstrecken',
  'tab.runs.q': 'Welche feste Leitung kann ein Plan-Kabel benutzen — und welche ihrer Adern sind noch frei?',
  // ── Statusleiste (suite#231, ADR-007 Abschnitt 6) ──────────────────────
  // Je Reiter eine Zahl aus dem Modell. Nichts davon wertet.
  'status.points': '{n} Anschlusspunkte · {r} Raeume',
  'status.floorPlan': '{n} von {all} Punkten verortet',
  'status.distribution': '{n} Verteilungen · {c} Stromkreise',
  'status.routes': '{n} Trassen',
  'status.rooms': '{e} Etagen · {r} Räume',
  'status.runs': '{n} Hausstrecken · {a} Adern',
  'status.switchPoints': '{n} Schaltstellen',
  'status.control': '{n} Steuerklinken',
  'status.defects': '{n} Maengel gemeldet',
  'defects.create.head': 'Mangel melden',
  'switches.create.head': 'Schaltstelle anlegen',
  'control.create.head': 'Steuerklinke freigeben',
  'routes.create.head': 'Trasse anlegen',

  'tab.points': 'Anschlusspunkte',
  'tab.points.q': 'Was gibt dieser Punkt her, wo ist er, und ist er frei?',
  'tab.routes': 'Trassen',
  'tab.routes.q': 'Welcher Weg zwischen zwei Räumen nimmt noch etwas auf?',
  'tab.switchPoints': 'Schaltstellen',
  'tab.switchPoints.q': 'Wer schaltet diese Dose ab — und wo sitzt er?',
  'tab.building': 'Gebäude',
  'tab.building.q': 'Wie liegen die Räume über- und nebeneinander — und welche Strecken und Trassen verbinden sie?',
  'status.building': '{r} Räume · {o} ohne Lage',
  'building3d.empty': 'Noch kein Raum. Etagen und Räume unter „Räume“ anlegen — jeder Raum steht dann hier auf seiner Etage.',
  'building3d.turnLeft': 'Nach links drehen',
  'building3d.turnRight': 'Nach rechts drehen',
  'building3d.runs': 'Hausstrecken',
  'building3d.routes': 'Trassen',
  'building3d.labels': 'Beschriftung',
  'building3d.storeyTitle': 'Gilt nur für Etagen ohne Höhenangabe',
  'building3d.storey': 'Geschosshöhe (m)',
  'building3d.noPosition':
    'Räume ohne Lage im Haus: {n}. Sie sind auf ihrer Etage eingereiht (gestrichelt) — die Lage unter „Räume“ eintragen.',
  'building3d.assumed':
    'Keine Höhe angegeben für: {floors}. Mit der Geschosshöhe gestapelt — eine Annahme, keine Messung.',
  'building3d.notDrawn': 'Strecken oder Trassen in einen ausgeblendeten oder fehlenden Raum, nicht gezeichnet: {n}.',
  'building3d.aria': 'Gebäude {name}: {r} Räume, {v} Verbindungen',
  'building3d.roomNoPos': '{id} · ohne Lage',
  'building3d.connection': '{name}: {from} → {to}',
  'building3d.runLabel': '{name} · {free}/{all} frei',
  'building3d.show': 'Anzeigen',
  'building3d.floors': 'Etagen und Räume',
  'building3d.noFloor': 'Ohne Etage',
  'rooms.position': 'Lage im Haus (m)',
  'rooms.position.title':
    'Wo der Raum im Haus liegt, in Metern vom Bezugspunkt: x, y, Breite, Tiefe. Die Gebäude-Ansicht stellt ihn dorthin.',
  'rooms.position.x': 'x',
  'rooms.position.y': 'y',
  'rooms.position.width': 'Breite',
  'rooms.position.depth': 'Tiefe',
  'rooms.position.aria': '{field} von {name} in Metern',
  'rooms.position.incomplete': 'unvollständig',
}
