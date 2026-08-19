import { useState, useEffect, useRef } from 'react';

// Formatea con puntos de miles mientras se escribe (ej: 1500000 -> "1.500.000").
// value/onChange siempre trabajan con el número plano (sin separadores) —
// el componente solo cambia cómo se ve, no qué se guarda.
// Al hacer foco con el valor en 0 (o vacío), el campo empieza en blanco
// para no obligar a borrar el cero antes de escribir.
export default function CurrencyInput({
  value,
  onChange,
  placeholder = '0',
  className = '',
  allowDecimals = false,
  ...props
}) {
  const [display, setDisplay] = useState('');
  const [focused, setFocused] = useState(false);
  const inputRef = useRef(null);

  const format = (raw) => {
    if (raw === '' || raw === null || raw === undefined) return '';
    const num = Number(raw);
    if (isNaN(num)) return '';
    // es-CL: punto de miles. Para decimales, en-US da coma de miles y
    // punto decimal — más intuitivo para montos en dólares que la coma
    // decimal de es-CL, que se confunde fácil con el punto de miles.
    return num.toLocaleString(allowDecimals ? 'en-US' : 'es-CL', {
      minimumFractionDigits: allowDecimals ? 2 : 0,
      maximumFractionDigits: allowDecimals ? 2 : 0,
    });
  };

  // Sincroniza el valor mostrado cuando cambia value desde afuera
  // (ej: al cargar un registro existente), salvo mientras el usuario
  // está escribiendo — ahí dejamos que su propio input mande.
  useEffect(() => {
    if (!focused) setDisplay(format(value));
  }, [value, focused]);

  function handleFocus(e) {
    setFocused(true);
    if (Number(value) === 0 || value === '' || value === null || value === undefined) {
      setDisplay('');
    } else {
      // Mientras se edita, mostramos el número plano (sin puntos) para
      // que agregar/borrar dígitos en el medio sea predecible.
      setDisplay(String(value));
    }
    props.onFocus?.(e);
  }

  function handleBlur(e) {
    setFocused(false);
    setDisplay(format(value));
    props.onBlur?.(e);
  }

  function handleChange(e) {
    const raw = e.target.value;
    let cleaned;
    if (allowDecimals) {
      // Solo dígitos y un único punto decimal.
      cleaned = raw.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1');
    } else {
      // Sin decimales: si el usuario escribe un separador (. o ,),
      // se corta ahí en vez de borrarlo y pegar los dígitos siguientes
      // (evita que "16.0" termine guardándose como 160).
      cleaned = raw.split(/[.,]/)[0].replace(/[^\d]/g, '');
    }
    setDisplay(cleaned);
    onChange(cleaned);
  }

  return (
    <input
      {...props}
      ref={inputRef}
      type="text"
      inputMode="decimal"
      value={focused ? display : format(value)}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onChange={handleChange}
      placeholder={placeholder}
      className={className}
    />
  );
}
