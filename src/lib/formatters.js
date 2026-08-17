import { getCountry } from './countries';

// currencyOverride: usalo cuando el monto ya viene resuelto en una moneda
// específica (ej. getPlanPrice cayó a USD por fallback) distinta a la del país.
export function formatCurrency(amount, countryCode, currencyOverride) {
  const { currency, locale } = getCountry(countryCode);
  const finalCurrency = currencyOverride || currency;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: finalCurrency,
    maximumFractionDigits: finalCurrency === 'USD' ? 2 : 0,
  }).format(Number(amount) || 0);
}

export function formatDate(date, countryCode, options = { day: '2-digit', month: 'long', year: 'numeric' }) {
  if (!date) return '';
  const { locale } = getCountry(countryCode);
  return new Date(date).toLocaleDateString(locale, options);
}

// Resuelve el precio de un plan (fila de plan_config) en la moneda del país.
// plan.prices es un jsonb tipo {"CLP": 9990, "USD": 10}. Si la moneda del país
// no tiene entrada propia, cae a USD y, si tampoco existe, al price/currency legacy.
export function getPlanPrice(plan, countryCode) {
  const { currency } = getCountry(countryCode);
  const prices = plan?.prices || {};

  if (prices[currency] !== undefined) {
    return { amount: Number(prices[currency]), currency };
  }
  if (prices.USD !== undefined) {
    return { amount: Number(prices.USD), currency: 'USD' };
  }
  return { amount: Number(plan?.price) || 0, currency: plan?.currency || currency };
}
