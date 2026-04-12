export function calculateQuote({ materials = [], laborCost = 0, extraCost = 0, marginPercent = 30 }) {
  const materialsSubtotal = materials.reduce((acc, item) => acc + Number(item.total_cost || 0), 0);
  const subtotal = materialsSubtotal + Number(laborCost) + Number(extraCost);
  const total = subtotal * (1 + Number(marginPercent) / 100);

  return {
    materialsSubtotal,
    subtotal,
    total: Number(total.toFixed(2))
  };
}