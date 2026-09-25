// ───────────────────────────────────────────────────────────────────────────
// Räume — welche Etagen und Räume hat das Gebäude, unter seinen eigenen Namen?
//
// Die Vertragsfrage `ort` antwortet mit Raum, Etage und dem Bezeichner DES
// HAUSES. Bis 2026-09-24 gab es für keins der drei eine Stelle zum Pflegen:
// ein Raum entstand nur als Nebenprodukt des ersten Anschlusspunkts, und die
// Etage war ein Freitext, den keine Sicht las.
//
// ─── ETAGEN ALS LISTE, NICHT ALS FREITEXT (cable-planner#911) ─────────────
//
// Eine Etage wird hier EINMAL benannt und am Raum gewählt. Als Freitext war
// jeder Tippfehler eine neue Etage — „1.OG" und „1. OG" gruppierten zwei
// Stockwerke, wo eines ist. Die Reihenfolge ist die der Liste; verschoben
// wird mit den Pfeilen, nicht über eine Rangzahl, die neben der Liste eine
// zweite Wahrheit wäre.
//
// ─── EINE ETAGE MIT RÄUMEN WIRD NICHT ENTFERNT ─────────────────────────────
//
// Die Ablehnung steht in `pflege.ts` und nennt die Räume. Sie still auf
// „keine Etage" zu setzen verlöre eine Angabe, die jemand gemacht hat — und
// „nicht angegeben" stünde danach da, wo vorher eine Etage stand.
// ───────────────────────────────────────────────────────────────────────────
import { useState } from 'react'
import { useT } from '../i18n'
import { TabelleRahmen } from './TabelleRahmen'
import { Anlegen, Feld } from './Formular'
import { useGebaeudeStore } from '../domain/store/gebaeudeStore'
import { raeumeNachEtage } from '../domain/gebaeudeAuskunft'
import { istRaumLage, type Raum, type RaumLage } from '../domain/modell'

/**
 * Eine Höhe aus dem Eingabefeld. Leer ist „nicht angegeben" und nicht 0 —
 * 0 wäre die Aussage „liegt auf Bezugshöhe". `null` heisst: keine Zahl, die
 * Eingabe bleibt ungelesen.
 */
const hoeheAusEingabe = (roh: string): number | undefined | null => {
  if (roh.trim() === '') return undefined
  const n = Number(roh)
  return Number.isFinite(n) ? n : null
}

/**
 * Die Lage eines Raums im Haus: vier Zahlen, zusammen oder gar nicht.
 *
 * Ein Entwurf haelt die Eingabe, bis sie vollstaendig ist — sonst muesste die
 * erste getippte Zahl die drei anderen mit etwas auffuellen, und das waere
 * eine erfundene Lage. Alle vier leer loescht die Lage.
 */
function LageFelder({ raum, onSetzen }: { raum: Raum; onSetzen: (lage: RaumLage | undefined) => void }) {
  const { t, format } = useT()
  const aus = (l: RaumLage | undefined) =>
    l ? [String(l.xM), String(l.yM), String(l.breiteM), String(l.tiefeM)] : ['', '', '', '']
  const [entwurf, setEntwurf] = useState<string[]>(() => aus(raum.lage))
  const [gesehen, setGesehen] = useState(raum.lage)
  // Aendert sich die Lage von aussen (Datei geladen), gilt die neue.
  if (gesehen !== raum.lage) {
    setGesehen(raum.lage)
    setEntwurf(aus(raum.lage))
  }
  const uebernehmen = (felder: string[]) => {
    if (felder.every((f) => f.trim() === '')) {
      if (raum.lage) onSetzen(undefined)
      return
    }
    const [xM, yM, breiteM, tiefeM] = felder.map((f) => Number(f.replace(',', '.')))
    const lage = { xM, yM, breiteM, tiefeM }
    if (felder.every((f) => f.trim() !== '') && istRaumLage(lage)) onSetzen(lage)
  }
  const namen = [
    t('rooms.position.x', 'x'),
    t('rooms.position.y', 'y'),
    t('rooms.position.width', 'width'),
    t('rooms.position.depth', 'depth'),
  ]
  const offen = entwurf.some((f) => f.trim() !== '') && !istRaumLage({
    xM: Number(entwurf[0].replace(',', '.')),
    yM: Number(entwurf[1].replace(',', '.')),
    breiteM: Number(entwurf[2].replace(',', '.')),
    tiefeM: Number(entwurf[3].replace(',', '.')),
  })
  return (
    <div className="lage-felder">
      {entwurf.map((wert, i) => (
        <input
          key={i}
          type="number"
          step={0.1}
          value={wert}
          placeholder={namen[i]}
          onChange={(e) => setEntwurf(entwurf.map((w, j) => (j === i ? e.target.value : w)))}
          onBlur={() => uebernehmen(entwurf)}
          aria-label={format(t('rooms.position.aria', '{field} of {name} in metres'), { field: namen[i], name: raum.name })}
          className="schmal-zahl"
        />
      ))}
      {offen && <span className="hinweis">{t('rooms.position.incomplete', 'incomplete')}</span>}
    </div>
  )
}

export function Raeume() {
  const { t, format } = useT()
  const gebaeude = useGebaeudeStore((s) => s.gebaeude)
  const etageAnlegen = useGebaeudeStore((s) => s.etageAnlegen)
  const etageAendern = useGebaeudeStore((s) => s.etageAendern)
  const etageVerschieben = useGebaeudeStore((s) => s.etageVerschieben)
  const etageEntfernen = useGebaeudeStore((s) => s.etageEntfernen)
  const raumAnlegen = useGebaeudeStore((s) => s.raumAnlegen)
  const raumAendern = useGebaeudeStore((s) => s.raumAendern)

  const [etagenName, setEtagenName] = useState('')
  const [etagenHoehe, setEtagenHoehe] = useState('')
  const [raumName, setRaumName] = useState('')
  const [raumBezeichner, setRaumBezeichner] = useState('')
  const [raumEtage, setRaumEtage] = useState('')
  const [abgelehnt, setAbgelehnt] = useState<string | undefined>()

  const etagen = gebaeude.etagen
  // Die im Formular gewaehlte Etage kann inzwischen entfernt sein (entfernen
  // darf man eine Etage, solange kein Raum darauf steht). Dann gilt sie nicht
  // mehr — sonst bekaeme der naechste Raum einen Verweis ins Leere.
  const gewaehlteEtage = etagen.some((e) => e.id === raumEtage) ? raumEtage : ''
  const raeume = raeumeNachEtage(gebaeude)
  const hoehe = hoeheAusEingabe(etagenHoehe)
  const etageAnlegbar = etagenName.trim() !== '' && hoehe !== null
  // Ohne Hausbezeichner übernimmt der Raum seinen Namen — so macht es auch
  // die Anlage über den ersten Anschlusspunkt.
  const raumAnlegbar = raumName.trim() !== ''

  return (
    <section>
      <Anlegen
        titel={t('rooms.floor.create.head', 'Add a floor')}
        leer={etagen.length === 0}
        onAbsenden={() => {
          if (!etageAnlegbar) return
          etageAnlegen({
            name: etagenName.trim(),
            ...(hoehe === undefined ? {} : { hoeheM: hoehe }),
          })
          setEtagenName('')
          setEtagenHoehe('')
        }}
      >
        <Feld name={t('common.name', 'Name')}>
          <input
            value={etagenName}
            onChange={(e) => setEtagenName(e.target.value)}
            placeholder={t('rooms.floor.name.placeholder', 'e.g. Ground floor, 1st floor, Basement')}
          />
        </Feld>
        <Feld name={t('rooms.floor.level', 'Level (m)')} schmal>
          <input
            type="number"
            step={0.01}
            value={etagenHoehe}
            onChange={(e) => setEtagenHoehe(e.target.value)}
          />
        </Feld>
        <button type="submit" className="knopf-primaer" disabled={!etageAnlegbar}>
          {t('rooms.floor.add', 'Add floor')}
        </button>
      </Anlegen>

      {abgelehnt && <p className="fehler">{abgelehnt}</p>}

      {etagen.length === 0 ? (
        <div className="leer-flaeche">
          <p className="leer">
            {t(
              'rooms.floor.empty',
              'No floor recorded yet. A floor is named once here and chosen by the rooms — so a typo cannot turn into a second floor.',
            )}
          </p>
        </div>
      ) : (
        <TabelleRahmen>
          <table>
            <caption>
              {t(
                'rooms.floor.caption',
                'The order of this list is the order of the floors. Level: finished floor in metres above the reference of the building — empty means not stated, not 0.',
              )}
            </caption>
            <thead>
              <tr>
                <th>{t('common.name', 'Name')}</th>
                <th className="rechts">{t('rooms.floor.level', 'Level (m)')}</th>
                <th className="rechts">{t('rooms.floor.col.rooms', 'Rooms')}</th>
                <th>{t('rooms.floor.col.order', 'Order')}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {etagen.map((e, i) => (
                <tr key={e.id}>
                  <td>
                    <input
                      value={e.name}
                      onChange={(ev) => etageAendern(e.id, { name: ev.target.value })}
                      aria-label={format(t('rooms.floor.name.aria', 'Name of floor {n}'), { n: i + 1 })}
                    />
                  </td>
                  <td className="rechts">
                    <input
                      type="number"
                      step={0.01}
                      value={e.hoeheM === undefined ? '' : String(e.hoeheM)}
                      onChange={(ev) => {
                        const h = hoeheAusEingabe(ev.target.value)
                        if (h !== null) etageAendern(e.id, { hoeheM: h })
                      }}
                      aria-label={format(t('rooms.floor.level.aria', 'Level of {name} in metres'), {
                        name: e.name,
                      })}
                    />
                  </td>
                  <td className="rechts">{gebaeude.raeume.filter((r) => r.etageId === e.id).length}</td>
                  <td>
                    <button
                      type="button"
                      className="still"
                      disabled={i === 0}
                      onClick={() => etageVerschieben(e.id, -1)}
                      aria-label={format(t('rooms.floor.up.aria', 'Move {name} up'), { name: e.name })}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="still"
                      disabled={i === etagen.length - 1}
                      onClick={() => etageVerschieben(e.id, 1)}
                      aria-label={format(t('rooms.floor.down.aria', 'Move {name} down'), { name: e.name })}
                    >
                      ↓
                    </button>
                  </td>
                  <td>
                    <button type="button" onClick={() => setAbgelehnt(etageEntfernen(e.id, t))}>
                      {t('common.remove', 'Remove')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TabelleRahmen>
      )}

      <h3>{t('rooms.head', 'Rooms')}</h3>
      <Anlegen
        titel={t('rooms.create.head', 'Add a room')}
        leer={gebaeude.raeume.length === 0}
        onAbsenden={() => {
          if (!raumAnlegbar) return
          const name = raumName.trim()
          raumAnlegen({
            name,
            hausbezeichner: raumBezeichner.trim() || name,
            ...(gewaehlteEtage ? { etageId: gewaehlteEtage } : {}),
          })
          setRaumName('')
          setRaumBezeichner('')
        }}
      >
        <Feld name={t('common.name', 'Name')}>
          <input
            value={raumName}
            onChange={(e) => setRaumName(e.target.value)}
            placeholder={t('rooms.name.placeholder', 'e.g. Main hall')}
          />
        </Feld>
        <Feld name={t('rooms.houseId', 'House identifier')}>
          <input
            value={raumBezeichner}
            onChange={(e) => setRaumBezeichner(e.target.value)}
            placeholder={t('rooms.houseId.placeholder', 'as on the door sign (e.g. EG.01)')}
          />
        </Feld>
        <Feld name={t('rooms.floor', 'Floor')}>
          <select value={gewaehlteEtage} onChange={(e) => setRaumEtage(e.target.value)}>
            <option value="">{t('common.notStated', 'not stated')}</option>
            {etagen.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </Feld>
        <button type="submit" className="knopf-primaer" disabled={!raumAnlegbar}>
          {t('rooms.add', 'Add room')}
        </button>
      </Anlegen>

      {raeume.length === 0 ? (
        <div className="leer-flaeche">
          <p className="leer">
            {t(
              'rooms.empty',
              'No room yet. The plan finds everything in this building by room — under the identifier the building uses, not one the plan invents.',
            )}
          </p>
        </div>
      ) : (
        <TabelleRahmen>
          <table>
            <thead>
              <tr>
                <th>{t('common.name', 'Name')}</th>
                <th>{t('rooms.houseId', 'House identifier')}</th>
                <th>{t('rooms.floor', 'Floor')}</th>
                <th title={t('rooms.position.title', 'Where the room lies in the building, in metres from its reference point: x, y, width, depth. The Building view places the room there.')}>
                  {t('rooms.position', 'Position in the building (m)')}
                </th>
              </tr>
            </thead>
            <tbody>
              {raeume.map((r) => {
                // Ein Verweis auf eine Etage, die es nicht gibt (aus einer
                // eingelesenen Datei), bleibt als eigene Wahl sichtbar. Ohne
                // sie zeigte die Auswahl die erste Etage an, und der Raum
                // sähe zugeordnet aus, ohne es zu sein.
                const verwaist =
                  r.etageId !== undefined && !etagen.some((e) => e.id === r.etageId)
                return (
                  <tr key={r.id}>
                    <td>
                      <input
                        value={r.name}
                        onChange={(e) => raumAendern(r.id, { name: e.target.value })}
                        aria-label={format(t('rooms.name.aria', 'Name of room {id}'), { id: r.hausbezeichner })}
                      />
                    </td>
                    <td>
                      <input
                        value={r.hausbezeichner}
                        onChange={(e) => raumAendern(r.id, { hausbezeichner: e.target.value })}
                        aria-label={format(t('rooms.houseId.aria', 'House identifier of {name}'), { name: r.name })}
                      />
                    </td>
                    <td>
                      <select
                        value={r.etageId ?? ''}
                        onChange={(e) => raumAendern(r.id, { etageId: e.target.value || undefined })}
                        aria-label={format(t('rooms.floor.aria', 'Floor of {name}'), { name: r.name })}
                      >
                        <option value="">{t('common.notStated', 'not stated')}</option>
                        {verwaist && (
                          <option value={r.etageId}>
                            {format(t('rooms.floor.missing', 'missing floor ({id})'), { id: r.etageId ?? '' })}
                          </option>
                        )}
                        {etagen.map((e) => (
                          <option key={e.id} value={e.id}>
                            {e.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <LageFelder raum={r} onSetzen={(lage) => raumAendern(r.id, { lage })} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </TabelleRahmen>
      )}
    </section>
  )
}
