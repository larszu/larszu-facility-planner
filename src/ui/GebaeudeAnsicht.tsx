import { useMemo, useState } from 'react'
import { useT } from '../i18n'
import { useGebaeudeStore } from '../domain/store/gebaeudeStore'
import {
  gebaeudeAnsicht,
  projiziere,
  tiefe,
  type AnsichtRaum,
  type Drehung,
  type Punkt3D,
} from '../domain/gebaeudeAnsicht'

/** Bildpunkte je Meter. Nur Darstellung: gerechnet wird in Metern. */
const PX_JE_M = 16
const RAND_PX = 40

/** Eine Normale in die Blickrichtung gedreht — dieselbe Viertelsdrehung wie `projiziere`. */
const drehe = (nx: number, nz: number, d: Drehung): [number, number] =>
  d === 0 ? [nx, nz] : d === 1 ? [nz, -nx] : d === 2 ? [-nx, -nz] : [-nz, nx]

/**
 * Das Gebaeude als Bild: Etagen uebereinander, Raeume als Koerper darauf,
 * Hausstrecken und Trassen von Decke zu Decke.
 *
 * Isometrisch in SVG und nicht als WebGL-Szene: das Werkzeug bleibt ohne
 * three.js, das Bild ist scharf, druckbar und in jedem Browser da. Gedreht
 * wird in Vierteln — mehr braucht es nicht, um jede Seite zu sehen.
 */
export function GebaeudeAnsicht() {
  const { t, format } = useT()
  const gebaeude = useGebaeudeStore((s) => s.gebaeude)
  const [drehung, setDrehung] = useState<Drehung>(0)
  const [strecken, setStrecken] = useState(true)
  const [trassen, setTrassen] = useState(true)
  const [beschriftung, setBeschriftung] = useState(true)
  const [geschoss, setGeschoss] = useState(4)
  const [ausEtagen, setAusEtagen] = useState<ReadonlySet<string>>(new Set())
  const [ausRaeume, setAusRaeume] = useState<ReadonlySet<string>>(new Set())

  const ansicht = useMemo(
    () =>
      gebaeudeAnsicht(gebaeude, {
        geschosshoeheM: geschoss,
        ausgeblendeteEtagen: ausEtagen,
        ausgeblendeteRaeume: ausRaeume,
        strecken,
        trassen,
      }),
    [gebaeude, geschoss, ausEtagen, ausRaeume, strecken, trassen],
  )

  const umschalten = (menge: ReadonlySet<string>, id: string): Set<string> => {
    const neu = new Set(menge)
    if (neu.has(id)) neu.delete(id)
    else neu.add(id)
    return neu
  }

  if (gebaeude.raeume.length === 0) {
    return (
      <section>
        <div className="leer-flaeche">
          <p className="leer">
            {t(
              'building3d.empty',
              'No room yet. Create floors and rooms under "Rooms" — each room then stands on its floor here.',
            )}
          </p>
        </div>
      </section>
    )
  }

  const mitte = (() => {
    const xs = ansicht.raeume.flatMap((r) => [r.x, r.x + r.breite])
    const zs = ansicht.raeume.flatMap((r) => [r.z, r.z + r.tiefe])
    const m = (a: number[]) => (a.length ? (Math.min(...a) + Math.max(...a)) / 2 : 0)
    return { x: m(xs), z: m(zs) }
  })()
  const p2 = (p: Punkt3D) => {
    const q = projiziere(p, drehung, mitte)
    return { x: q.x * PX_JE_M, y: q.y * PX_JE_M }
  }
  const pfad = (punkte: Punkt3D[]) =>
    punkte
      .map(p2)
      .map((q) => `${q.x.toFixed(1)},${q.y.toFixed(1)}`)
      .join(' ')

  // Die sichtbaren Flaechen eines Raums: Deckel und die beiden Seiten, deren
  // Normale zum Betrachter zeigt (in Blickrichtung +x' oder +z').
  const flaechen = (r: AnsichtRaum) => {
    const u = r.y
    const o = r.y + r.hoehe
    const x0 = r.x
    const x1 = r.x + r.breite
    const z0 = r.z
    const z1 = r.z + r.tiefe
    const seiten: { normale: [number, number]; ecken: [number, number][] }[] = [
      { normale: [1, 0], ecken: [[x1, z0], [x1, z1]] },
      { normale: [-1, 0], ecken: [[x0, z1], [x0, z0]] },
      { normale: [0, 1], ecken: [[x1, z1], [x0, z1]] },
      { normale: [0, -1], ecken: [[x0, z0], [x1, z0]] },
    ]
    const sichtbar = seiten.filter((s) => {
      const [a, b] = drehe(s.normale[0], s.normale[1], drehung)
      return a + b > 0
    })
    return {
      seiten: sichtbar.map((s) => [
        { x: s.ecken[0][0], y: u, z: s.ecken[0][1] },
        { x: s.ecken[1][0], y: u, z: s.ecken[1][1] },
        { x: s.ecken[1][0], y: o, z: s.ecken[1][1] },
        { x: s.ecken[0][0], y: o, z: s.ecken[0][1] },
      ]),
      deckel: [
        { x: x0, y: o, z: z0 },
        { x: x1, y: o, z: z0 },
        { x: x1, y: o, z: z1 },
        { x: x0, y: o, z: z1 },
      ],
    }
  }

  const reihenfolge = [...ansicht.raeume].sort(
    (a, b) =>
      a.y - b.y ||
      tiefe({ x: a.x + a.breite / 2, y: 0, z: a.z + a.tiefe / 2 }, drehung, mitte) -
        tiefe({ x: b.x + b.breite / 2, y: 0, z: b.z + b.tiefe / 2 }, drehung, mitte),
  )

  const allePunkte = [
    ...ansicht.raeume.flatMap((r) => {
      const f = flaechen(r)
      return [...f.deckel, ...f.seiten.flat()]
    }),
    ...ansicht.verbindungen.flatMap((v) => [v.von, v.nach]),
  ].map(p2)
  const minX = Math.min(...allePunkte.map((q) => q.x), 0) - RAND_PX
  const maxX = Math.max(...allePunkte.map((q) => q.x), 0) + RAND_PX
  const minY = Math.min(...allePunkte.map((q) => q.y), 0) - RAND_PX
  const maxY = Math.max(...allePunkte.map((q) => q.y), 0) + RAND_PX

  const ohneLage = ansicht.raeume.filter((r) => r.lageAngenommen).length
  const angenommen = ansicht.etagen.filter((e) => e.hoeheAngenommen)
  const raumName = (id: string) => gebaeude.raeume.find((r) => r.id === id)?.name ?? id

  return (
    <section className="gebaeude-ansicht">
      <div className="leiste">
        <button type="button" onClick={() => setDrehung(((drehung + 3) % 4) as Drehung)}>
          {t('building3d.turnLeft', 'Turn left')}
        </button>
        <button type="button" onClick={() => setDrehung(((drehung + 1) % 4) as Drehung)}>
          {t('building3d.turnRight', 'Turn right')}
        </button>
        <label className="wahl">
          <input type="checkbox" checked={strecken} onChange={(e) => setStrecken(e.target.checked)} />
          {t('building3d.runs', 'House runs')}
        </label>
        <label className="wahl">
          <input type="checkbox" checked={trassen} onChange={(e) => setTrassen(e.target.checked)} />
          {t('building3d.routes', 'Cable routes')}
        </label>
        <label className="wahl">
          <input type="checkbox" checked={beschriftung} onChange={(e) => setBeschriftung(e.target.checked)} />
          {t('building3d.labels', 'Labels')}
        </label>
        <label className="wahl" title={t('building3d.storeyTitle', 'Used only for floors without a level')}>
          {t('building3d.storey', 'Storey height (m)')}
          <input
            type="number"
            min={2}
            max={20}
            step={0.5}
            value={geschoss}
            onChange={(e) => {
              const v = Number(e.target.value)
              if (Number.isFinite(v) && v >= 2 && v <= 20) setGeschoss(v)
            }}
            className="schmal-zahl"
          />
        </label>
      </div>

      {(ohneLage > 0 || angenommen.length > 0 || ansicht.nichtGezeichnet > 0) && (
        <div className="hinweis-block">
          {ohneLage > 0 && (
            <p className="hinweis">
              {format(
                t(
                  'building3d.noPosition',
                  'Rooms without a position in the building: {n}. They are lined up on their floor (dashed) — enter the position under "Rooms".',
                ),
                { n: ohneLage },
              )}
            </p>
          )}
          {angenommen.length > 0 && (
            <p className="hinweis">
              {format(
                t('building3d.assumed', 'No level given for: {floors}. Stacked with the storey height — an assumption, not a measurement.'),
                { floors: angenommen.map((e) => e.name).join(', ') },
              )}
            </p>
          )}
          {ansicht.nichtGezeichnet > 0 && (
            <p className="hinweis">
              {format(
                t('building3d.notDrawn', 'Runs or routes into a hidden or missing room, not drawn: {n}.'),
                { n: ansicht.nichtGezeichnet },
              )}
            </p>
          )}
        </div>
      )}

      <div className="gebaeude-flaeche">
        <div className="gebaeude-bild">
          <svg
            viewBox={`${minX.toFixed(0)} ${minY.toFixed(0)} ${(maxX - minX).toFixed(0)} ${(maxY - minY).toFixed(0)}`}
            role="img"
            aria-label={format(t('building3d.aria', 'Building {name}: {r} rooms, {v} connections'), {
              name: gebaeude.name,
              r: ansicht.raeume.length,
              v: ansicht.verbindungen.length,
            })}
          >
            {reihenfolge.map((r) => {
              const f = flaechen(r)
              const mitteOben = p2({ x: r.x + r.breite / 2, y: r.y + r.hoehe, z: r.z + r.tiefe / 2 })
              return (
                <g key={r.id} className={r.lageAngenommen ? 'raum angenommen' : 'raum'}>
                  {f.seiten.map((s, i) => (
                    <polygon key={i} points={pfad(s)} className="raum-seite" />
                  ))}
                  <polygon points={pfad(f.deckel)} className="raum-deckel" />
                  {beschriftung && (
                    <text x={mitteOben.x} y={mitteOben.y} className="raum-text">
                      {r.name}
                      <tspan x={mitteOben.x} dy="1.2em" className="raum-text-leise">
                        {r.lageAngenommen
                          ? format(t('building3d.roomNoPos', '{id} · no position'), { id: r.hausbezeichner })
                          : r.hausbezeichner}
                      </tspan>
                    </text>
                  )}
                </g>
              )
            })}
            {ansicht.verbindungen.map((v) => {
              const a = p2(v.von)
              const b = p2(v.nach)
              return (
                <g key={`${v.art}-${v.id}`} className={v.art === 'strecke' ? 'verbindung strecke' : 'verbindung trasse'}>
                  <line x1={a.x} y1={a.y} x2={b.x} y2={b.y}>
                    <title>
                      {format(t('building3d.connection', '{name}: {from} → {to}'), {
                        name: v.bezeichnung,
                        from: raumName(v.vonRaumId),
                        to: raumName(v.nachRaumId),
                      })}
                    </title>
                  </line>
                  {beschriftung && (
                    <text x={(a.x + b.x) / 2} y={(a.y + b.y) / 2} className="verbindung-text">
                      {v.adern
                        ? format(t('building3d.runLabel', '{name} · {free}/{all} free'), {
                            name: v.bezeichnung,
                            free: v.adern.frei,
                            all: v.adern.gesamt,
                          })
                        : v.bezeichnung}
                    </text>
                  )}
                </g>
              )
            })}
          </svg>
        </div>

        <aside className="gebaeude-liste" aria-label={t('building3d.show', 'Show')}>
          <h3>{t('building3d.floors', 'Floors and rooms')}</h3>
          {[...gebaeude.etagen].reverse().map((e) => (
            <div key={e.id} className="gebaeude-etage">
              <label className="wahl">
                <input
                  type="checkbox"
                  checked={!ausEtagen.has(e.id)}
                  onChange={() => setAusEtagen(umschalten(ausEtagen, e.id))}
                />
                <strong>{e.name}</strong>
              </label>
              {gebaeude.raeume
                .filter((r) => r.etageId === e.id)
                .map((r) => (
                  <label key={r.id} className="wahl eingerueckt">
                    <input
                      type="checkbox"
                      checked={!ausRaeume.has(r.id)}
                      disabled={ausEtagen.has(e.id)}
                      onChange={() => setAusRaeume(umschalten(ausRaeume, r.id))}
                    />
                    {r.name}
                  </label>
                ))}
            </div>
          ))}
          {gebaeude.raeume.some((r) => !gebaeude.etagen.some((e) => e.id === r.etageId)) && (
            <div className="gebaeude-etage">
              <strong className="leise">{t('building3d.noFloor', 'Without floor')}</strong>
              {gebaeude.raeume
                .filter((r) => !gebaeude.etagen.some((e) => e.id === r.etageId))
                .map((r) => (
                  <label key={r.id} className="wahl eingerueckt">
                    <input
                      type="checkbox"
                      checked={!ausRaeume.has(r.id)}
                      onChange={() => setAusRaeume(umschalten(ausRaeume, r.id))}
                    />
                    {r.name}
                  </label>
                ))}
            </div>
          )}
        </aside>
      </div>
    </section>
  )
}
