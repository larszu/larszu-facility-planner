// ───────────────────────────────────────────────────────────────────────────
// Hausstrecken — welche feste Leitung kann ein Plan-Kabel benutzen, und
// welche ihrer Adern ist noch frei? (Issue #15)
//
// Die Vertragsfrage `hausStrecke` hatte bis 2026-09-24 keine Sicht: eine
// Strecke war Bezeichnung plus zwei Räume, und eintragen liess sie sich nur
// über eine Datei. Im Aufbau fehlte damit genau das, wonach man vor der Wand
// sucht — an WELCHER Blende die Strecke endet und WELCHE Ader noch frei ist.
//
// ─── WARUM NICHT IN DEN TRASSEN ────────────────────────────────────────────
//
// Eine Trasse nimmt etwas auf, eine Hausstrecke führt etwas. Die Begründung
// steht in `Trassen.tsx` und gilt hier von der anderen Seite: zwei Fragen,
// zwei Listen.
//
// ─── DIE BELEGUNG WIRD NICHT EINGETRAGEN, SONDERN ABGELEITET ──────────────
//
// Frei oder belegt folgt aus den Zuordnungen, die der Plan erklärt hat
// (`streckenBelegung`). Ein Feld „belegt" an der Ader wäre die zweite
// Wahrheit neben der Zuordnung, und die beiden liefen beim ersten
// umgesteckten Kabel auseinander.
// ───────────────────────────────────────────────────────────────────────────
import { useState } from 'react'
import { useT } from '../i18n'
import { TabelleRahmen } from './TabelleRahmen'
import { Anlegen, Feld } from './Formular'
import { useGebaeudeStore } from '../domain/store/gebaeudeStore'
import { streckenBelegung, type AderStand } from '../domain/gebaeudeAuskunft'

type UebersetzFn = (key: string, en: string) => string
type FormatFn = (s: string, v: Record<string, string | number>) => string

/** Die Belegung einer Ader in einem Satz — als Funktion, damit sie die Sprache wechselt. */
const belegungText = (stand: AderStand, t: UebersetzFn, format: FormatFn): string => {
  const kabel = stand.planKabelIds.join(', ')
  if (stand.konflikt) {
    return format(t('runs.core.conflict', 'conflict: {kabel} on the same core'), { kabel })
  }
  switch (stand.zustand) {
    case 'belegt':
      return format(t('runs.core.taken', 'taken by {kabel}'), { kabel })
    case 'unbekannt':
      return t('runs.core.unknown', 'unknown — a plan cable uses the run without naming a core')
    default:
      return t('runs.core.free', 'free')
  }
}

/**
 * Die Bezeichnung einer Ader, festgeschrieben beim Verlassen des Feldes.
 *
 * NICHT bei jedem Tastendruck: auf dem Weg von „3" nach „13" steht kurz „1"
 * da, und wenn die Strecke schon eine Ader „1" hat, würde der Zwischenstand
 * abgelehnt — oder, schlimmer, die Zuordnungen auf „3" zögen über „1" mit
 * und landeten auf der falschen Ader. Abgelehnt wird erst der Endstand; dann
 * springt das Feld zurück, und der Grund steht über der Tabelle.
 */
function AderNr({
  nr,
  name,
  onFestschreiben,
}: {
  nr: string
  name: string
  onFestschreiben: (neu: string) => boolean
}) {
  const [wert, setWert] = useState(nr)
  return (
    <input
      className="schmal"
      value={wert}
      onChange={(e) => setWert(e.target.value)}
      onBlur={() => {
        if (!onFestschreiben(wert)) setWert(nr)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
      }}
      aria-label={name}
    />
  )
}

export function Strecken() {
  const { t, format } = useT()
  const gebaeude = useGebaeudeStore((s) => s.gebaeude)
  const streckeAnlegen = useGebaeudeStore((s) => s.streckeAnlegen)
  const streckeAendern = useGebaeudeStore((s) => s.streckeAendern)
  const aderAnlegen = useGebaeudeStore((s) => s.aderAnlegen)
  const aderUmbenennen = useGebaeudeStore((s) => s.aderUmbenennen)
  const aderAendern = useGebaeudeStore((s) => s.aderAendern)
  const aderEntfernen = useGebaeudeStore((s) => s.aderEntfernen)
  const entfernen = useGebaeudeStore((s) => s.entfernen)

  const [bezeichnung, setBezeichnung] = useState('')
  const [von, setVon] = useState('')
  const [nach, setNach] = useState('')
  const [vonBlende, setVonBlende] = useState('')
  const [nachBlende, setNachBlende] = useState('')
  const [gewaehlt, setGewaehlt] = useState('')
  const [aderNr, setAderNr] = useState('')
  const [stecker, setStecker] = useState('')
  const [signal, setSignal] = useState('')
  const [abgelehnt, setAbgelehnt] = useState<string | undefined>()

  const raeume = gebaeude.raeume
  const strecken = gebaeude.strecken
  const raumName = (id: string) => raeume.find((r) => r.id === id)?.name ?? '—'
  const anlegbar = bezeichnung.trim() !== '' && von !== '' && nach !== '' && von !== nach

  // Die gewählte Strecke — oder die erste, wenn die gewählte verschwunden ist.
  const strecke = strecken.find((s) => s.id === gewaehlt) ?? strecken[0]
  const belegung = strecke ? streckenBelegung(gebaeude, strecke.id) : undefined

  /** Freitext ohne Inhalt ist keine Angabe — das Feld fällt weg statt leer dazustehen. */
  const text = (v: string): string | undefined => (v === '' ? undefined : v)

  return (
    <section>
      <Anlegen
        titel={t('runs.create.head', 'Add a house run')}
        leer={strecken.length === 0}
        onAbsenden={() => {
          if (!anlegbar) return
          const id = streckeAnlegen({
            bezeichnung: bezeichnung.trim(),
            vonRaumId: von,
            nachRaumId: nach,
            ...(vonBlende.trim() ? { vonBlende: vonBlende.trim() } : {}),
            ...(nachBlende.trim() ? { nachBlende: nachBlende.trim() } : {}),
          })
          setGewaehlt(id)
          setBezeichnung('')
          setVonBlende('')
          setNachBlende('')
        }}
      >
        <Feld name={t('common.name', 'Name')}>
          <input
            value={bezeichnung}
            onChange={(e) => setBezeichnung(e.target.value)}
            placeholder={t('runs.name.placeholder', 'e.g. Tie line stage–control room')}
          />
        </Feld>
        <Feld name={t('routes.from.aria', 'From room')}>
          <select value={von} onChange={(e) => setVon(e.target.value)}>
            <option value="">{t('routes.from', 'from …')}</option>
            {raeume.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </Feld>
        <Feld name={t('runs.col.fromPlate', 'End plate (from)')}>
          <input
            value={vonBlende}
            onChange={(e) => setVonBlende(e.target.value)}
            placeholder={t('runs.plate.placeholder', 'e.g. B2, wall panel west')}
          />
        </Feld>
        <Feld name={t('routes.to.aria', 'To room')}>
          <select value={nach} onChange={(e) => setNach(e.target.value)}>
            <option value="">{t('routes.to', 'to …')}</option>
            {raeume.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </Feld>
        <Feld name={t('runs.col.toPlate', 'End plate (to)')}>
          <input
            value={nachBlende}
            onChange={(e) => setNachBlende(e.target.value)}
            placeholder={t('runs.plate.placeholder', 'e.g. B2, wall panel west')}
          />
        </Feld>
        <button type="submit" className="knopf-primaer" disabled={!anlegbar}>
          {t('runs.add', 'Add run')}
        </button>
      </Anlegen>

      {raeume.length < 2 && (
        <div className="leer-flaeche">
          <p className="leer">
            {t('runs.needRooms', 'A house run connects two rooms. Create at least two rooms under "Rooms" first.')}
          </p>
        </div>
      )}

      {abgelehnt && <p className="fehler">{abgelehnt}</p>}

      {strecken.length === 0 ? (
        <p className="leer">{t('runs.empty', 'No house run recorded yet.')}</p>
      ) : (
        <TabelleRahmen>
          <table>
            <thead>
              <tr>
                <th>{t('common.name', 'Name')}</th>
                <th>{t('routes.col.from', 'From')}</th>
                <th>{t('runs.col.fromPlate', 'End plate (from)')}</th>
                <th>{t('routes.col.to', 'To')}</th>
                <th>{t('runs.col.toPlate', 'End plate (to)')}</th>
                <th>{t('runs.col.cores', 'Cores')}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {strecken.map((s) => {
                const b = streckenBelegung(gebaeude, s.id)
                return (
                  <tr key={s.id}>
                    <td>{s.bezeichnung}</td>
                    <td>{raumName(s.vonRaumId)}</td>
                    <td>
                      <input
                        value={s.vonBlende ?? ''}
                        onChange={(e) => streckeAendern(s.id, { vonBlende: text(e.target.value) })}
                        aria-label={format(t('runs.fromPlate.aria', 'End plate of {name} in the from room'), {
                          name: s.bezeichnung,
                        })}
                      />
                    </td>
                    <td>{raumName(s.nachRaumId)}</td>
                    <td>
                      <input
                        value={s.nachBlende ?? ''}
                        onChange={(e) => streckeAendern(s.id, { nachBlende: text(e.target.value) })}
                        aria-label={format(t('runs.toPlate.aria', 'End plate of {name} in the to room'), {
                          name: s.bezeichnung,
                        })}
                      />
                    </td>
                    <td>
                      {/* Ohne Aderliste ist die Strecke nicht beschrieben —
                          das ist nicht dasselbe wie „0 Adern". */}
                      {!b || b.adern.length === 0 ? (
                        <span className="leise">{t('runs.cores.none', 'not described')}</span>
                      ) : (
                        format(t('runs.cores.count', '{n} cores · {belegt} taken'), {
                          n: b.adern.length,
                          belegt: b.adern.filter((a) => a.zustand === 'belegt').length,
                        })
                      )}
                    </td>
                    <td>
                      <button type="button" onClick={() => entfernen(s.id)}>
                        {t('common.remove', 'Remove')}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </TabelleRahmen>
      )}

      {strecke && belegung && (
        <>
          <h3>{t('runs.cores.head', 'Cores and occupancy')}</h3>
          <div className="leiste">
            <select
              value={strecke.id}
              onChange={(e) => {
                setGewaehlt(e.target.value)
                setAbgelehnt(undefined)
              }}
              aria-label={t('runs.pick.aria', 'House run')}
            >
              {strecken.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.bezeichnung}
                </option>
              ))}
            </select>
            <span className="leise">
              {format(t('runs.ends', '{von} ({vonBlende}) → {nach} ({nachBlende})'), {
                von: raumName(strecke.vonRaumId),
                vonBlende: strecke.vonBlende ?? t('common.notStated', 'not stated'),
                nach: raumName(strecke.nachRaumId),
                nachBlende: strecke.nachBlende ?? t('common.notStated', 'not stated'),
              })}
            </span>
          </div>

          <Anlegen
            titel={t('runs.core.create.head', 'Add a core')}
            leer={belegung.adern.length === 0}
            onAbsenden={() => {
              const grund = aderAnlegen(
                strecke.id,
                {
                  nr: aderNr,
                  ...(stecker.trim() ? { stecker: stecker.trim() } : {}),
                  ...(signal.trim() ? { signal: signal.trim() } : {}),
                },
                t,
              )
              setAbgelehnt(grund)
              // Stecker und Signal bleiben stehen: eine Strecke hat meist
              // mehrere Adern derselben Sorte, und man traegt sie nacheinander ein.
              if (!grund) setAderNr('')
            }}
          >
            <Feld name={t('runs.core.nr', 'Core')} schmal>
              <input
                value={aderNr}
                onChange={(e) => setAderNr(e.target.value)}
                placeholder={t('runs.core.nr.placeholder', 'e.g. 3')}
              />
            </Feld>
            <Feld name={t('runs.core.connector', 'Connector')}>
              <input
                value={stecker}
                onChange={(e) => setStecker(e.target.value)}
                placeholder={t('runs.core.connector.placeholder', 'e.g. BNC, LC duplex, RJ45')}
              />
            </Feld>
            <Feld name={t('runs.core.signal', 'Signal')}>
              <input
                value={signal}
                onChange={(e) => setSignal(e.target.value)}
                placeholder={t('runs.core.signal.placeholder', 'e.g. 12G-SDI, Dante, SMF')}
              />
            </Feld>
            <button type="submit" className="knopf-primaer" disabled={!aderNr.trim()}>
              {t('runs.core.add', 'Add core')}
            </button>
          </Anlegen>

          {belegung.ganzeStrecke.length > 0 && (
            <p className="hinweis">
              {format(
                t(
                  'runs.whole',
                  'Used as a whole by {kabel}. Which core that takes is not stated — so no core of this run counts as free.',
                ),
                { kabel: belegung.ganzeStrecke.join(', ') },
              )}
            </p>
          )}
          {belegung.unbekannteAdern.map((u) => (
            <p key={`${u.planKabelId}:${u.ader}`} className="warnung">
              {format(
                t(
                  'runs.unknownCore',
                  'Plan cable {kabel} is assigned to core "{ader}", which this run does not have. The assignment stays until the plan changes it.',
                ),
                { kabel: u.planKabelId, ader: u.ader },
              )}
            </p>
          ))}
          {belegung.doppelteNr.map((nr) => (
            <p key={nr} className="warnung">
              {format(
                t(
                  'runs.duplicateCore',
                  'The core designation "{nr}" appears more than once. An assignment to it cannot tell which one is meant.',
                ),
                { nr },
              )}
            </p>
          ))}

          {belegung.adern.length === 0 ? (
            <div className="leer-flaeche">
              <p className="leer">
                {t(
                  'runs.cores.empty',
                  'No core described for this run. Until then a plan cable can only use it as a whole.',
                )}
              </p>
            </div>
          ) : (
            <TabelleRahmen>
              <table>
                <thead>
                  <tr>
                    <th>{t('runs.core.nr', 'Core')}</th>
                    <th>{t('runs.core.connector', 'Connector')}</th>
                    <th>{t('runs.core.signal', 'Signal')}</th>
                    <th>{t('runs.core.col.occupancy', 'Occupancy')}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {belegung.adern.map((stand, i) => (
                    <tr key={`${i}:${stand.ader.nr}`} className={stand.konflikt ? 'warnung' : undefined}>
                      <td>
                        <AderNr
                          nr={stand.ader.nr}
                          name={format(t('runs.core.nr.aria', 'Designation of core {nr}'), { nr: stand.ader.nr })}
                          onFestschreiben={(neu) => {
                            const grund = aderUmbenennen(strecke.id, i, neu, t)
                            setAbgelehnt(grund)
                            return !grund
                          }}
                        />
                      </td>
                      <td>
                        <input
                          value={stand.ader.stecker ?? ''}
                          onChange={(e) => aderAendern(strecke.id, i, { stecker: text(e.target.value) })}
                          aria-label={format(t('runs.core.connector.aria', 'Connector of core {nr}'), {
                            nr: stand.ader.nr,
                          })}
                        />
                      </td>
                      <td>
                        <input
                          value={stand.ader.signal ?? ''}
                          onChange={(e) => aderAendern(strecke.id, i, { signal: text(e.target.value) })}
                          aria-label={format(t('runs.core.signal.aria', 'Signal of core {nr}'), {
                            nr: stand.ader.nr,
                          })}
                        />
                      </td>
                      <td>{belegungText(stand, t, format)}</td>
                      <td>
                        <button type="button" onClick={() => aderEntfernen(strecke.id, i)}>
                          {t('common.remove', 'Remove')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TabelleRahmen>
          )}
        </>
      )}
    </section>
  )
}
