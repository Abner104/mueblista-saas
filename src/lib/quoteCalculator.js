// billingMode 'area': el cargo de mano de obra se reemplaza por
// superficie (m²) × precio por m² — típico en instalación de cielo
// raso, paredes o revestimientos, en vez de fabricación de mueble.
export function calculateQuote({
  materials = [], laborCost = 0, extraCost = 0, marginPercent = 30,
  billingMode = 'fixed', areaWidthM = 0, areaHeightM = 0, areaPriceM2 = 0,
}) {
  const materialsSubtotal = materials.reduce((acc, item) => acc + Number(item.total_cost || 0), 0);

  const areaM2 = billingMode === 'area' ? Number(areaWidthM) * Number(areaHeightM) : 0;
  const areaCost = billingMode === 'area' ? areaM2 * Number(areaPriceM2) : 0;
  const laborOrAreaCost = billingMode === 'area' ? areaCost : Number(laborCost);

  const subtotal = materialsSubtotal + laborOrAreaCost + Number(extraCost);
  const total = subtotal * (1 + Number(marginPercent) / 100);

  return {
    materialsSubtotal,
    areaM2: Number(areaM2.toFixed(2)),
    areaCost,
    subtotal,
    total: Number(total.toFixed(2))
  };
}