// Funciones puras (sin DB, sin efectos): viven aparte de actions.ts porque
// Next.js exige que TODO export de un archivo "use server" sea una funcion
// async (se tratan como Server Actions invocables desde el cliente) --
// computeCampaignDiscount es un helper sincrono puro, no una action, y
// meterlo en actions.ts rompe el build ("Server Actions must be async
// functions").
export function computeCampaignDiscount(campaign: { type: "percent" | "fixed"; value: string }, subtotal: number) {
  const value = Number(campaign.value);
  const raw = campaign.type === "percent" ? subtotal * (value / 100) : value;
  return Math.min(Math.max(0, raw), subtotal);
}
