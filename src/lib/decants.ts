export const DECANT_VOLUMES = ["5ml", "10ml"] as const;

export function normalizeVolume(value: unknown): string | undefined {
  const text = String(value ?? "").trim().toLowerCase().replace(/\s+/g, "");
  if (!text) return undefined;
  return /^\d+(?:[.,]\d+)?$/.test(text) ? `${text}ml` : text;
}

/** Stable identity makes importing the same uncoded decant update, not duplicate it. */
export function generateDecantSku(name: string, brand: string | undefined, volume: string): string {
  const identity = [name, brand ?? "", volume].map((s) =>
    s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim(),
  ).join("|");
  let hash = 2166136261;
  for (const char of identity) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return `DEC-${volume.toUpperCase()}-${(hash >>> 0).toString(16).padStart(8, "0").toUpperCase()}`;
}

export function decantCatalogFilter(volumes: string[]) {
  return volumes.length ? { productTypes: ["decant"], decantVolumes: volumes } : {};
}

export type DecantVolumeCounts = Record<string, number>;

/**
 * Groups decants by normalized volume so the catalog can show how many 5ml and
 * 10ml decants exist. Tolerates "5 ml", "5ML" and "5" spellings in the database.
 */
export function countDecantVolumes(
  rows: { product_type?: string | null; volume?: string | null; image_url?: string | null }[],
): DecantVolumeCounts {
  const counts: DecantVolumeCounts = {};
  for (const row of rows) {
    if (row.product_type !== "decant") continue;
    // Só contam os decants que a loja mostra: sem foto, o card fica oculto no catálogo.
    if (!row.image_url) continue;
    const volume = normalizeVolume(row.volume);
    if (!volume) continue;
    counts[volume] = (counts[volume] ?? 0) + 1;
  }
  return counts;
}