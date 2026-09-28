// ───────────────────────────────────────────────────────────────────────────
// Grundriss-Bilder auf DIESEM Rechner.
//
// Das Modell bleibt dabei: der Grundriss traegt eine ADRESSE, kein Bild
// (`domain/modell.ts`, `Grundriss.quelle`). Neu ist nur eine dritte Sorte
// Adresse neben URL und Pfad: `planbild:<kennung>`, ein Bild, das jemand per
// Drag & Drop oder Dateiauswahl hineingegeben hat und das hier in IndexedDB
// liegt.
//
// WARUM NICHT EINFACH DIE DATEI VERLINKEN. Ein abgelegtes Bild hat im Fenster
// keinen Pfad: Electron laeuft ohne Preload, und `File.path` gibt es seit
// Electron 32 nicht mehr. Eine `file://`-Adresse laedt eine http(s)-Seite
// ohnehin nicht. Uebrig bleibt, die Bytes selbst aufzubewahren — aber nicht im
// Dokument, weil es sonst durch jede Runde zwischen Haus und Plan reiste.
//
// Die Kennung ist der Hash des Bildes: dasselbe Bild zweimal abgelegt ist ein
// Eintrag, nicht zwei. Auf einem anderen Rechner fehlt es — und dafuer hat die
// Grundriss-Sicht ihren Satz schon: die Lagen bleiben gueltig, sie stehen in
// Metern.
// ───────────────────────────────────────────────────────────────────────────
import { PLAN_BILDER_DB } from './storageKeys'

export const PLANBILD_PRAEFIX = 'planbild:'

export const istPlanbild = (quelle: string | undefined): boolean => !!quelle?.startsWith(PLANBILD_PRAEFIX)

const SPEICHER = 'bilder'

const oeffne = (): Promise<IDBDatabase> =>
  new Promise((ok, fehler) => {
    if (typeof indexedDB === 'undefined') {
      fehler(new Error('indexeddb'))
      return
    }
    const r = indexedDB.open(PLAN_BILDER_DB, 1)
    r.onupgradeneeded = () => r.result.createObjectStore(SPEICHER)
    r.onsuccess = () => ok(r.result)
    r.onerror = () => fehler(r.error ?? new Error('indexeddb'))
  })

/** Kennung aus dem Inhalt: die ersten 16 Hex-Stellen des SHA-256. */
export async function planbildKennung(dataUrl: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(dataUrl))
  const hex = Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, '0')).join('')
  return `${PLANBILD_PRAEFIX}${hex.slice(0, 16)}`
}

/** Legt das Bild ab und gibt die Adresse zurueck, die in `quelle` gehoert. */
export async function planbildAblegen(dataUrl: string): Promise<string> {
  const kennung = await planbildKennung(dataUrl)
  const db = await oeffne()
  await new Promise<void>((ok, fehler) => {
    const tx = db.transaction(SPEICHER, 'readwrite')
    tx.objectStore(SPEICHER).put(dataUrl, kennung)
    tx.oncomplete = () => ok()
    tx.onerror = () => fehler(tx.error ?? new Error('indexeddb'))
  })
  db.close()
  return kennung
}

/** Das Bild zu einer Adresse — `null`, wenn es auf diesem Rechner fehlt. */
export async function planbildLesen(kennung: string): Promise<string | null> {
  try {
    const db = await oeffne()
    const wert = await new Promise<unknown>((ok, fehler) => {
      const r = db.transaction(SPEICHER, 'readonly').objectStore(SPEICHER).get(kennung)
      r.onsuccess = () => ok(r.result)
      r.onerror = () => fehler(r.error)
    })
    db.close()
    return typeof wert === 'string' ? wert : null
  } catch {
    return null
  }
}
