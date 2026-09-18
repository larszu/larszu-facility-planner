// ───────────────────────────────────────────────────────────────────────────
// Steuerung — welche Klinken der Haussteuerung stehen der Show offen?
//
// Das ist `cable#667` (KNX, DALI, Crestron, Vissonic), und zwar in der Form,
// die ADR-006 dafür festlegt: **nur die benannten Klinken, nicht das
// Bus-Modell.** Kein Gruppenadressbaum, keine Vorschaltgeräte, keine
// Programmzeilen. Der Plan will wissen, was er ansprechen darf und was das
// bewirkt.
//
// Eine Klinke ist deshalb ein VERTRAGSGEGENSTAND: jemand hat sie freigegeben
// und beschrieben. „Bedeutung" ist Klartext vom Betreiber und kein Pflichtfeld
// aus Ordnungsliebe — eine Adresse ohne Bedeutung ist eine Nummer, die jemand
// schaltet, ohne zu wissen, was passiert.
// ───────────────────────────────────────────────────────────────────────────
import { useState } from 'react'
import { useT } from '../i18n'
import { TabelleRahmen } from './TabelleRahmen'
import { Anlegen, Feld } from './Formular'
import { useGebaeudeStore } from '../domain/store/gebaeudeStore'
import { steuerklinken } from '../domain/vertrag'
import { adresseMehrdeutig } from '../domain/gebaeudeAuskunft'
import type { Adressart, Steuersystem } from '../domain/modell'
import { leseEtsExport, type EtsBefund, type EtsKandidat } from '../domain/etsImport'

const SYSTEME: Steuersystem[] = ['knx', 'dali', 'crestron', 'vissonic', 'sonstige']

export function Steuerung() {
  const { t } = useT()
  const gebaeude = useGebaeudeStore((s) => s.gebaeude)
  const klinkeAnlegen = useGebaeudeStore((s) => s.klinkeAnlegen)
  const [system, setSystem] = useState<Steuersystem>('knx')
  const [adresse, setAdresse] = useState('')
  const [bedeutung, setBedeutung] = useState('')
  const [richtung, setRichtung] = useState<'lesen' | 'schalten'>('schalten')
  // Issue #2 — bei DALI heisst „3" je nach Adressart etwas voellig
  // anderes: ein Vorschaltgeraet, eine Gruppe von dreissig Leuchten, oder
  // ueber Broadcast der ganze Bus samt Notlicht. Deshalb PFLICHT bei DALI
  // und nur dort: eine KNX-Gruppenadresse ist immer eine Gruppenadresse,
  // und ein Feld mit nur einer moeglichen Antwort wird ausgefuellt statt
  // gelesen.
  const [adressart, setAdressart] = useState<Adressart>('kurz')
  const brauchtAdressart = system === 'dali'

  const klinken = steuerklinken(gebaeude)

  return (
    <section>
      <Anlegen
        titel={t('control.create.head', 'Release a control hook')}
        leer={gebaeude.klinken.length === 0}
        onAbsenden={() => {
          const a = adresse.trim()
          const b = bedeutung.trim()
          // Beides verlangt: eine Adresse ohne Bedeutung ist eine Nummer,
          // die jemand schaltet, ohne zu wissen, was passiert.
          if (!a || !b) return
          klinkeAnlegen({
            system,
            adresse: a,
            richtung,
            bedeutung: b,
            ...(brauchtAdressart ? { adressart } : {}),
          })
          setAdresse('')
          setBedeutung('')
        }}
      >
        <Feld name={t('control.system', 'System')} schmal>
          <select value={system} onChange={(e) => setSystem(e.target.value as Steuersystem)}>
            {SYSTEME.map((s) => (
              <option key={s} value={s}>
                {s.toUpperCase()}
              </option>
            ))}
          </select>
        </Feld>
        <Feld name={t('control.address', 'Address')} schmal>
          <input value={adresse} onChange={(e) => setAdresse(e.target.value)} />
        </Feld>
        {brauchtAdressart && (
          <Feld name={t('control.addressKind', 'Address kind')}>
            <select value={adressart} onChange={(e) => setAdressart(e.target.value as Adressart)}>
              {/* Die Kennungen `kurz`/`gruppe`/`broadcast` bleiben, was sie
                  sind — Werte im Datensatz. Übersetzt wird, was davor steht. */}
              <option value="kurz">{t('control.kind.short', 'Short address — one ballast')}</option>
              <option value="gruppe">{t('control.kind.group', 'Group — everything in this group')}</option>
              <option value="broadcast">{t('control.kind.broadcast', 'Broadcast — EVERYTHING on the bus')}</option>
            </select>
          </Feld>
        )}
        <Feld name={t('control.direction', 'Direction')} schmal>
          <select value={richtung} onChange={(e) => setRichtung(e.target.value as 'lesen' | 'schalten')}>
            <option value="schalten">{t('control.direction.write', 'switch')}</option>
            <option value="lesen">{t('control.direction.read', 'read')}</option>
          </select>
        </Feld>
        <Feld name={t('control.meaning', 'Meaning')}>
          <input
            value={bedeutung}
            onChange={(e) => setBedeutung(e.target.value)}
            placeholder={t('control.meaning.placeholder', 'What happens when it is used')}
          />
        </Feld>
        <button type="submit" className="knopf-primaer" disabled={!adresse.trim() || !bedeutung.trim()}>
          {t('control.release', 'Release')}
        </button>
      </Anlegen>

      {/* ─── ETS-IMPORT (#2) ───────────────────────────────────────────
          Der Leser liefert KANDIDATEN. Eine ETS-Datei enthaelt alle
          Gruppenadressen des Hauses — auch Notlicht, Jalousien und
          Heizung. Sie alle zu Klinken zu machen hiesse, eine Freigabe zu
          erfinden, die niemand erteilt hat. */}
      <EtsEinlesen />

      {klinken.length === 0 ? (
        <div className="leer-flaeche">
          <p className="leer">
            {t(
              'control.empty',
              'No hook released. As long as nothing stands here, the show must not address the building control — and that is the right default: an address nobody has described is not a release.',
            )}
          </p>
        </div>
      ) : (
        <TabelleRahmen>
          <table>
            <caption>
              {t(
                'control.table.caption',
                'Highlighted: a DALI address without a kind. There, "3" is one ballast, a group of thirty luminaires, or everything on the bus — the address alone does not say which.',
              )}
            </caption>
            <thead>
              <tr>
                <th>{t('control.system', 'System')}</th>
                <th>{t('control.address', 'Address')}</th>
                <th>{t('common.kind', 'Kind')}</th>
                <th>{t('control.direction', 'Direction')}</th>
                <th>{t('control.meaning', 'Meaning')}</th>
              </tr>
            </thead>
            <tbody>
              {klinken.map((k) => (
                /* Eine DALI-Klinke ohne Adressart faellt AUF und wird nicht
                   still als Kurzadresse gelesen. Das trifft Dokumente, die vor
                   dem Feld entstanden sind — und die kleinstmoegliche Reichweite
                   anzunehmen ist dort die gefaehrliche Annahme. */
                <tr key={k.id} className={adresseMehrdeutig(k) ? 'warnung' : undefined}>
                  <td>{k.system.toUpperCase()}</td>
                  <td>{k.adresse}</td>
                  {/* Bei DALI ist die Art die halbe Auskunft: „Gruppe 3"
                      und „Kurzadresse 3" schalten Verschiedenes. Wo sie
                      fehlt, steht ein Strich und keine Vermutung. */}
                  <td>
                    {k.adressart
                      ? {
                          kurz: t('control.kind.short.short', 'short address'),
                          gruppe: t('control.kind.group.short', 'group'),
                          broadcast: t('control.kind.broadcast.short', 'broadcast'),
                        }[k.adressart]
                      : '—'}
                  </td>
                  <td>
                    {k.richtung === 'schalten'
                      ? t('control.direction.write', 'switch')
                      : t('control.direction.read', 'read')}
                  </td>
                  <td>{k.bedeutung}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TabelleRahmen>
      )}
    </section>
  )
}

/**
 * Gruppenadressen aus dem ETS-Export uebernehmen.
 *
 * Drei Schritte, und der mittlere ist der Punkt: lesen, AUSWAEHLEN,
 * freigeben. Ohne den mittleren waere der Import ein Knopf, der das ganze
 * Haus freigibt.
 *
 * Die Bedeutung ist auch hier Pflicht. Der Gruppenname aus der ETS steht als
 * Vorschlag im Feld — er stammt vom Programmierer der Anlage und nicht vom
 * Betreiber, der freigibt, und er laesst sich deshalb ueberschreiben.
 */
function EtsEinlesen() {
  const { t, format } = useT()
  const klinkeAnlegen = useGebaeudeStore((s) => s.klinkeAnlegen)
  const [befund, setBefund] = useState<EtsBefund | null>(null)
  const [gewaehlt, setGewaehlt] = useState<Record<string, boolean>>({})
  const [bedeutungen, setBedeutungen] = useState<Record<string, string>>({})
  const [richtungen, setRichtungen] = useState<Record<string, 'lesen' | 'schalten'>>({})
  const [uebernommen, setUebernommen] = useState(0)

  const einlesen = async (datei: File) => {
    const b = leseEtsExport(await datei.text(), t)
    setBefund(b)
    setUebernommen(0)
    setGewaehlt({})
    setRichtungen({})
    setBedeutungen(
      Object.fromEntries(b.kandidaten.map((k: EtsKandidat) => [k.adresse, k.name])),
    )
  }

  const freigeben = () => {
    const nehmen = (befund?.kandidaten ?? []).filter(
      (k) => gewaehlt[k.adresse] && (bedeutungen[k.adresse] ?? '').trim(),
    )
    for (const k of nehmen) {
      klinkeAnlegen({
        system: 'knx',
        adresse: k.adresse,
        // Die Vorgabe ist die harmlose Haelfte: Lesen aendert nichts.
        richtung: richtungen[k.adresse] ?? 'lesen',
        bedeutung: (bedeutungen[k.adresse] ?? '').trim(),
      })
    }
    setUebernommen(nehmen.length)
    setBefund(null)
  }

  const offen = (befund?.kandidaten ?? []).filter(
    (k) => gewaehlt[k.adresse] && !(bedeutungen[k.adresse] ?? '').trim(),
  ).length
  const bereit = (befund?.kandidaten ?? []).filter(
    (k) => gewaehlt[k.adresse] && (bedeutungen[k.adresse] ?? '').trim(),
  ).length

  return (
    <div className="block">
      <h3>{t('ets.head', 'Import KNX group addresses (ETS export)')}</h3>
      <p className="hinweis">
        {t(
          'ets.intro',
          'Reads the group address export ETS writes (CSV) — not the .knxproj project file. Nothing is released by reading: pick the addresses the show may use and say what each one does.',
        )}
      </p>
      <input
        type="file"
        accept=".csv,text/csv,text/plain"
        aria-label={t('ets.file', 'ETS group address export (CSV)')}
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void einlesen(f)
        }}
      />

      {uebernommen > 0 && (
        <p className="befund ja">
          {format(t('ets.done', '{n} hooks released.'), { n: uebernommen })}
        </p>
      )}

      {befund && (
        <>
          <p>
            {format(
              t('ets.found', '{n} group addresses · {ordner} folder rows skipped · {unlesbar} unreadable'),
              { n: befund.kandidaten.length, ordner: befund.ordner, unlesbar: befund.unlesbar },
            )}
            {befund.doppelt.length > 0 && (
              <>
                {' · '}
                {format(t('ets.duplicates', '{n} duplicate addresses — the first one wins'), {
                  n: befund.doppelt.length,
                })}
              </>
            )}
          </p>
          {befund.grund && <p className="befund nein">{befund.grund}</p>}

          {befund.kandidaten.length > 0 && (
            <>
              <TabelleRahmen>
                <table>
                  <caption>
                    {t(
                      'ets.table.caption',
                      'The group name from ETS is a suggestion for the meaning, not a substitute: it comes from whoever programmed the installation, not from whoever releases the hook.',
                    )}
                  </caption>
                  <thead>
                    <tr>
                      <th>{t('ets.take', 'Take')}</th>
                      <th>{t('control.address', 'Address')}</th>
                      <th>{t('ets.datapoint', 'Datapoint')}</th>
                      <th>{t('control.direction', 'Direction')}</th>
                      <th>{t('control.meaning', 'Meaning')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {befund.kandidaten.map((k) => (
                      <tr key={k.adresse}>
                        <td>
                          <input
                            type="checkbox"
                            aria-label={format(t('ets.takeOne', 'Release {address}'), {
                              address: k.adresse,
                            })}
                            checked={!!gewaehlt[k.adresse]}
                            onChange={(e) =>
                              setGewaehlt((g) => ({ ...g, [k.adresse]: e.target.checked }))
                            }
                          />
                        </td>
                        <td>{k.adresse}</td>
                        <td>{k.datenpunkt ?? '—'}</td>
                        <td>
                          <select
                            aria-label={format(t('ets.directionOf', 'Direction for {address}'), {
                              address: k.adresse,
                            })}
                            value={richtungen[k.adresse] ?? 'lesen'}
                            onChange={(e) =>
                              setRichtungen((r) => ({
                                ...r,
                                [k.adresse]: e.target.value as 'lesen' | 'schalten',
                              }))
                            }
                          >
                            <option value="lesen">{t('control.direction.read', 'read')}</option>
                            <option value="schalten">{t('control.direction.write', 'switch')}</option>
                          </select>
                        </td>
                        <td>
                          <input
                            aria-label={format(t('ets.meaningOf', 'Meaning of {address}'), {
                              address: k.adresse,
                            })}
                            value={bedeutungen[k.adresse] ?? ''}
                            placeholder={t('control.meaning.placeholder', 'What happens when it is used')}
                            onChange={(e) =>
                              setBedeutungen((b) => ({ ...b, [k.adresse]: e.target.value }))
                            }
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TabelleRahmen>

              {offen > 0 && (
                <p className="befund offen">
                  {format(
                    t('ets.needMeaning', '{n} of the picked addresses have no meaning yet — they stay out.'),
                    { n: offen },
                  )}
                </p>
              )}
              <button type="button" className="knopf-primaer" disabled={bereit === 0} onClick={freigeben}>
                {format(t('ets.release', 'Release {n} hooks'), { n: bereit })}
              </button>
            </>
          )}
        </>
      )}
    </div>
  )
}
