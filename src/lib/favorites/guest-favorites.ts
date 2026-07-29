// Favoritos de un visitante sin sesion: viven solo en localStorage del
// navegador (nunca en la DB, a diferencia del carrito de invitado que usa
// una cookie server-side) — pedido explicito del owner: "que mantenga esa
// informacion en el cache o en la seccion del navegador". Se fusionan con
// la cuenta recien al loguearse/crear cuenta (ver mergeGuestFavoritesIntoUser
// en actions.ts) y se limpian de ahi.
const STORAGE_KEY = "tienda3d_guest_favorites";
const NOTICE_KEY = "tienda3d_guest_favorites_notice_seen";

function readIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function getGuestFavoriteIds(): string[] {
  return readIds();
}

export function isGuestFavorite(productId: string): boolean {
  return readIds().includes(productId);
}

// Devuelve el nuevo estado (true = quedo como favorito) despues de alternar.
export function toggleGuestFavorite(productId: string): boolean {
  const current = readIds();
  const wasFavorite = current.includes(productId);
  const next = wasFavorite ? current.filter((id) => id !== productId) : [...current, productId];
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // no-op: si el navegador bloquea localStorage (modo privado estricto,
    // por ejemplo), el corazon simplemente no persiste — no vale la pena
    // romper la interaccion por esto.
  }
  return !wasFavorite;
}

export function hasSeenGuestFavoritesNotice(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(NOTICE_KEY) === "1";
  } catch {
    return true;
  }
}

export function markGuestFavoritesNoticeSeen(): void {
  try {
    window.localStorage.setItem(NOTICE_KEY, "1");
  } catch {
    // no-op
  }
}

export function clearGuestFavorites(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // no-op
  }
}
