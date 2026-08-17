/**
 * Países soportados — moneda, locale y método de pago disponible.
 * paymentMethod: 'mercadopago' | 'manual'
 */
export const COUNTRIES = [
  { code: 'CL', name: 'Chile',     flag: '🇨🇱', currency: 'CLP', locale: 'es-CL', paymentMethod: 'mercadopago' },
  { code: 'VE', name: 'Venezuela', flag: '🇻🇪', currency: 'USD', locale: 'es-VE', paymentMethod: 'manual' },
];

export const DEFAULT_COUNTRY_CODE = 'CL';

export function getCountry(code) {
  return COUNTRIES.find((c) => c.code === code) || COUNTRIES.find((c) => c.code === DEFAULT_COUNTRY_CODE);
}
