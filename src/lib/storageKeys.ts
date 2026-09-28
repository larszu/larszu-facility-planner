// ───────────────────────────────────────────────────────────────────────────
// Die localStorage-Schlüssel dieser App — an einer Stelle.
//
// Eigenes Präfix, wie im `inventory-planner` und aus demselben Grund: diese App
// läuft unter eigener Herkunft, der Speicher der anderen Werkzeuge ist für sie
// ohnehin unerreichbar. Ein geerbtes `cable-planner:` behauptete dieselbe
// Ablage und rettete nichts.
// ───────────────────────────────────────────────────────────────────────────

export const STORAGE_KEYS = {
  /** Das Gebäude: Räume, Anschlusspunkte, Kreise, Verteilungen, Klinken, Mängel. */
  gebaeude: 'facility-planner:gebaeude',
} as const

/**
 * IndexedDB-Datenbank fuer Grundriss-Bilder (`lib/planBilder.ts`). Nicht in
 * `localStorage`: ein verkleinerter Scan hat ein bis zwei Megabyte, und der
 * ganze `localStorage` einer Herkunft hat etwa fuenf.
 */
export const PLAN_BILDER_DB = 'facility-planner:planbilder'
