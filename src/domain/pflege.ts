// ───────────────────────────────────────────────────────────────────────────
// Pflege-Schritte, die ABGELEHNT werden koennen.
//
// Die meisten Aenderungen am Gebaeude sind ein `map` im Store und koennen
// nicht schiefgehen. Die hier koennen es: eine Etage entfernen, auf der noch
// Raeume stehen, oder einer Ader einen Namen geben, den die Strecke schon
// fuehrt. Beides muss mit einem GRUND abgelehnt werden, und der Grund ist ein
// Satz in der Sprache der Oberflaeche.
//
// ─── WARUM NICHT IM VERTRAG UND NICHT IN DEN AUSKUENFTEN ───────────────────
//
// `vertrag.ts` traegt die sechs Fragen des Plans und den EINEN Rueckweg;
// `vertrag.test.ts` besteht darauf, dass dort nichts dazukommt. Und
// `gebaeudeAuskunft.ts` liest nur. Was hier steht, schreibt — rein, als neues
// Gebaeude, nach demselben Muster wie `mangelMelden`: der Store ruft es auf
// und reicht die Ablehnung durch, statt die Pruefung selbst zu fuehren.
// ───────────────────────────────────────────────────────────────────────────
import { format, quelle, type Uebersetzen } from '../i18n/quelle'
import type { Gebaeude, StreckenAder } from './modell'

export type PflegeErgebnis = { ok: true; gebaeude: Gebaeude } | { ok: false; grund: string }

/**
 * Eine Etage entfernen — aber keinen Raum still um seine Etage bringen.
 *
 * Stehen noch Raeume darauf, wird ABGELEHNT und die Raeume werden genannt.
 * Die Alternative, sie auf „keine Etage" zu setzen, waere bequemer und
 * verlore eine Angabe, die jemand gemacht hat: danach stuende „nicht
 * angegeben" da, wo vorher „2. OG" stand, und niemand wuesste, dass es
 * einmal anders war. Umhaengen geht in derselben Sicht, in der entfernt wird.
 */
export const etageEntfernen = (
  gebaeude: Gebaeude,
  etageId: string,
  t: Uebersetzen = quelle,
): PflegeErgebnis => {
  const etage = gebaeude.etagen.find((e) => e.id === etageId)
  if (!etage) return { ok: true, gebaeude }
  const darauf = gebaeude.raeume.filter((r) => r.etageId === etageId)
  if (darauf.length > 0) {
    return {
      ok: false,
      grund: format(
        t(
          'care.floor.inUse',
          'The floor "{name}" is still assigned to these rooms: {raeume}. Move them to another floor first, otherwise they would lose their floor without anyone noticing.',
        ),
        { name: etage.name, raeume: darauf.map((r) => r.name).join(', ') },
      ),
    }
  }
  return { ok: true, gebaeude: { ...gebaeude, etagen: gebaeude.etagen.filter((e) => e.id !== etageId) } }
}

/** Eine Etage in der Liste um eine Stelle verschieben. Am Rand bleibt alles, wie es ist. */
export const etageVerschieben = (gebaeude: Gebaeude, etageId: string, richtung: -1 | 1): Gebaeude => {
  const i = gebaeude.etagen.findIndex((e) => e.id === etageId)
  const j = i + richtung
  if (i < 0 || j < 0 || j >= gebaeude.etagen.length) return gebaeude
  const etagen = [...gebaeude.etagen]
  ;[etagen[i], etagen[j]] = [etagen[j]!, etagen[i]!]
  return { ...gebaeude, etagen }
}

/** Die Pruefung, die Anlegen und Umbenennen teilen: nicht leer, nicht doppelt. */
const aderNameFehler = (
  adern: readonly StreckenAder[],
  nr: string,
  t: Uebersetzen,
): string | undefined => {
  if (nr === '') return t('care.core.empty', 'A core needs a designation — it is what a plan cable refers to.')
  if (adern.some((a) => a.nr === nr)) {
    return format(t('care.core.duplicate', 'This run already has a core "{nr}".'), { nr })
  }
  return undefined
}

/**
 * Eine Ader an eine Strecke haengen.
 *
 * Die Bezeichnung muss je Strecke EINDEUTIG sein: eine Zuordnung nennt die
 * Ader bei ihrem Namen, und zwei Adern „3" machten aus der Angabe „das Kabel
 * liegt auf 3" eine Wahl, die niemand getroffen hat.
 */
export const aderAnlegen = (
  gebaeude: Gebaeude,
  streckeId: string,
  ader: StreckenAder,
  t: Uebersetzen = quelle,
): PflegeErgebnis => {
  const strecke = gebaeude.strecken.find((s) => s.id === streckeId)
  if (!strecke) {
    return {
      ok: false,
      grund: format(t('care.run.missing', 'There is no run with the id "{id}".'), { id: streckeId }),
    }
  }
  const nr = ader.nr.trim()
  const fehler = aderNameFehler(strecke.adern ?? [], nr, t)
  if (fehler) return { ok: false, grund: fehler }
  return {
    ok: true,
    gebaeude: {
      ...gebaeude,
      strecken: gebaeude.strecken.map((s) =>
        s.id === streckeId ? { ...s, adern: [...(s.adern ?? []), { ...ader, nr }] } : s,
      ),
    },
  }
}

/**
 * Eine Ader umbenennen — und die Zuordnungen, die sie nennen, mitnehmen.
 *
 * Umbenennen heisst hier: dieselbe Ader bekommt ein anderes Schild („1" wird
 * „SDI 1"). Die Erklaerung „Plan-Kabel 12 liegt auf dieser Ader" gilt weiter,
 * also folgt sie dem Namen. Ohne das stuende das Kabel danach auf einer Ader,
 * die es nicht mehr gibt, und die Ader, auf der es wirklich liegt, hiesse frei.
 *
 * Die Ader wird ueber ihre STELLE in der Liste angesprochen und nicht ueber
 * ihren Namen: eine eingelesene Datei kann einen Namen doppelt fuehren, und
 * dann traefe der Name beide. Fuehrt die Strecke den alten Namen doppelt,
 * bleiben die Zuordnungen deshalb auch stehen — welche der beiden gemeint
 * war, weiss niemand, und mitgenommen wuerden sie auf eine davon geraten.
 */
export const aderUmbenennen = (
  gebaeude: Gebaeude,
  streckeId: string,
  stelle: number,
  neu: string,
  t: Uebersetzen = quelle,
): PflegeErgebnis => {
  const strecke = gebaeude.strecken.find((s) => s.id === streckeId)
  const adern = strecke?.adern ?? []
  const alt = adern[stelle]?.nr
  if (!strecke || alt === undefined) {
    return {
      ok: false,
      grund: format(t('care.core.missing', 'The run "{id}" has no core at position {stelle}.'), {
        id: streckeId,
        stelle: stelle + 1,
      }),
    }
  }
  const nr = neu.trim()
  if (nr === alt) return { ok: true, gebaeude }
  const fehler = aderNameFehler(adern, nr, t)
  if (fehler) return { ok: false, grund: fehler }
  const eindeutig = adern.filter((a) => a.nr === alt).length === 1
  return {
    ok: true,
    gebaeude: {
      ...gebaeude,
      strecken: gebaeude.strecken.map((s) =>
        s.id === streckeId ? { ...s, adern: adern.map((a, j) => (j === stelle ? { ...a, nr } : a)) } : s,
      ),
      zuordnungen: eindeutig
        ? gebaeude.zuordnungen.map((z) =>
            z.hausStreckeId === streckeId && z.ader === alt ? { ...z, ader: nr } : z,
          )
        : gebaeude.zuordnungen,
    },
  }
}
