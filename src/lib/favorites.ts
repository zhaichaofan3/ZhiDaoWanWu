const STORAGE_KEY = "secondhand_favorites";

function safeGetWindow() {
  return typeof window === "undefined" ? null : window;
}

export function getFavoriteIds(): string[] {
  const w = safeGetWindow();
  if (!w) return [];
  try {
    const raw = w.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function setFavoriteIds(ids: string[]) {
  const w = safeGetWindow();
  if (!w) return;
  try {
    w.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(new Set(ids.map(String)))));
  } catch {
    // ignore quota / serialization errors
  }
}

export function isFavorited(productId: string): boolean {
  return getFavoriteIds().includes(String(productId));
}

export function toggleFavorite(productId: string): boolean {
  const id = String(productId);
  const ids = getFavoriteIds();
  const exists = ids.includes(id);
  const next = exists ? ids.filter((x) => x !== id) : [...ids, id];
  setFavoriteIds(next);
  return !exists;
}

