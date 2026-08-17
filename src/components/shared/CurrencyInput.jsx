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
    return num.toLocaleString('es-CL', {
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
    // Solo dígitos (y un punto decimal si allowDecimals).
    const cleaned = allowDecimals
      ? raw.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1')
      : raw.replace(/[^\d]/g, '');
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
