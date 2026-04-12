import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Scissors, Plus, Trash2, ChevronDown,
  AlertTriangle, CheckCircle2, RefreshCw, Download,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { optimizeCuts } from '../lib/cutOptimizer';
import { useThemeStore } from '../store/themeStore';

// ── Planchas estándar de melamina ─────────────────────────────────
const STANDARD_SHEETS = [
  { label: 'Melamina estándar 1830×2440',  w: 1830, h: 2440 },
  { label: 'Melamina 2100×2750',           w: 2100, h: 2750 },
  { label: 'MDF 1220×2440',                w: 1220, h: 2440 },
  { label: 'Plywood 1220×2440',            w: 1220, h: 2440 },
  { label: 'Vidrio 1000×2000',             w: 1000, h: 2000 },
  { label: 'Personalizado',                w: null,  h: null  },
];

const PIECE_EMPTY = { name: '', width_mm: '', height_mm: '', quantity: 1 };

// ── Vista SVG de una plancha ──────────────────────────────────────
function SheetSVG({ sheet, scale = 0.12, isDark }) {
  const W = sheet.width  * scale;
  const H = sheet.height * scale;

  return (
    <svg
      viewBox={`0 0 ${sheet.width} ${sheet.height}`}
      width={W}
      height={H}
      className="rounded-xl overflow-hidden border"
      style={{ borderColor: isDark ? '#3d3528' : '#d6d3d1', display: 'block' }}
    >
      {/* Fondo = desperdicio */}
      <rect width={sheet.width} height={sheet.height}
        fill={isDark ? '#1a1610' : '#f5f5f4'} />

      {/* Patrón de grain para el fondo */}
      <defs>
        <pattern id={`grain-${sheet.id}`} patternUnits="userSpaceOnUse" width="4" height="4">
          <line x1="0" y1="2" x2="4" y2="2" stroke={isDark ? '#2e2820' : '#e7e5e4'} strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width={sheet.width} height={sheet.height} fill={`url(#grain-${sheet.id})`} />

      {/* Piezas */}
      {sheet.placed.map((p, i) => (
        <g key={i}>
          <rect
            x={p.x} y={p.y} width={p.w} height={p.h}
            fill={p.color + 'cc'}
            stroke={p.color}
            strokeWidth="6"
            rx="8"
          />
          {/* Texto si la pieza es suficientemente grande */}
          {p.w > 80 && p.h > 60 && (
            <text
              x={p.x + p.w / 2}
              y={p.y + p.h / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={Math.min(p.w, p.h) * 0.12}
              fill="white"
              fontWeight="bold"
              style={{ userSelect: 'none' }}
            >
              {p.name.length > 14 ? p.name.slice(0, 13) + '…' : p.name}
            </text>
          )}
          {p.w > 80 && p.h > 90 && (
            <text
              x={p.x + p.w / 2}
              y={p.y + p.h / 2 + Math.min(p.w, p.h) * 0.13}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={Math.min(p.w, p.h) * 0.09}
              fill="white"
              opacity="0.75"
              style={{ userSelect: 'none' }}
            >
              {p.w}×{p.h}
            </text>
          )}
        </g>
      ))}

      {/* Borde plancha */}
      <rect width={sheet.width} height={sheet.height}
        fill="none"
        stroke={isDark ? '#c8923a' : '#a16207'}
        strokeWidth="12"
        rx="8"
      />
    </svg>
  );
}

// ── Fila editable de pieza ────────────────────────────────────────
function PieceRow({ piece, index, onChange, onDelete, isDark }) {
  const inp = `rounded-xl border px-3 py-2 text-sm outline-none transition w-full ${
    isDark
      ? 'bg-zinc-900 border-zinc-700 text-white placeholder-zinc-600 focus:border-amber-500'
      : 'bg-stone-50 border-stone-300 text-stone-900 placeholder-stone-400 focus:border-amber-500'
  }`;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      className="grid grid-cols-[1fr_90px_90px_60px_36px] gap-2 items-center"
    >
      <input
        placeholder="Nombre de la pieza"
        value={piece.name}
        onChange={(e) => onChange(index, 'name', e.target.value)}
        className={inp}
      />
      <input
        type="number" min="1" placeholder="Ancho"
        value={piece.width_mm}
        onChange={(e) => onChange(index, 'width_mm', e.target.value)}
        className={inp}
      />
      <input
        type="number" min="1" placeholder="Alto"
        value={piece.height_mm}
        onChange={(e) => onChange(index, 'height_mm', e.target.value)}
        className={inp}
      />
      <input
        type="number" min="1" max="99" placeholder="Cant"
        value={piece.quantity}
        onChange={(e) => onChange(index, 'quantity', e.target.value)}
        className={inp}
      />
      <button
        onClick={() => onDelete(index)}
        className={`p-2 rounded-xl transition ${isDark ? 'text-zinc-600 hover:text-red-400 hover:bg-zinc-800' : 'text-stone-400 hover:text-red-500 hover:bg-stone-100'}`}
      >
        <Trash2 size={14} />
      </button>
    </motion.div>
  );
}

// ── Página principal ──────────────────────────────────────────────
export default function CutOptimizerPage() {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';

  // Plancha
  const [sheetPreset, setSheetPreset]   = useState(0);
  const [sheetWidth,  setSheetWidth]    = useState(1830);
  const [sheetHeight, setSheetHeight]   = useState(2440);
  const [allowRotate, setAllowRotate]   = useState(true);

  // Piezas
  const [pieces, setPieces] = useState([
    { name: 'Lateral',  width_mm: 600,  height_mm: 2200, quantity: 2 },
    { name: 'Repisa',   width_mm: 556,  height_mm: 400,  quantity: 5 },
    { name: 'Fondo',    width_mm: 1180, height_mm: 2190, quantity: 1 },
    { name: 'Puerta',   width_mm: 596,  height_mm: 2196, quantity: 2 },
  ]);

  const [activeSheet, setActiveSheet] = useState(0);

  const tk = isDark ? {
    bg:    'bg-zinc-950',
    card:  'bg-zinc-900 border-zinc-800',
    panel: 'bg-zinc-900/50 border-zinc-800',
    text:  'text-white',
    sub:   'text-zinc-400',
    input: 'bg-zinc-900 border-zinc-700 text-white focus:border-amber-500',
    sel:   'bg-zinc-900 border-zinc-700 text-white',
    tab:   'bg-zinc-800 text-zinc-400',
    tabA:  'bg-amber-500 text-black',
    th:    'bg-zinc-900/50 border-zinc-800 text-zinc-500',
    row:   'border-zinc-800/50 hover:bg-zinc-800/40',
    toggle:'bg-zinc-800 border-zinc-700',
  } : {
    bg:    'bg-stone-100',
    card:  'bg-white border-stone-200',
    panel: 'bg-white border-stone-200',
    text:  'text-stone-900',
    sub:   'text-stone-500',
    input: 'bg-stone-50 border-stone-300 text-stone-900 focus:border-amber-500',
    sel:   'bg-stone-50 border-stone-300 text-stone-900',
    tab:   'bg-stone-200 text-stone-500',
    tabA:  'bg-amber-500 text-black',
    th:    'bg-stone-50 border-stone-200 text-stone-500',
    row:   'border-stone-100 hover:bg-stone-50',
    toggle:'bg-stone-100 border-stone-300',
  };

  // Resultado del optimizador (recalcula en tiempo real)
  const result = useMemo(() => {
    const validPieces = pieces.filter(
      (p) => p.name.trim() && Number(p.width_mm) > 0 && Number(p.height_mm) > 0
    );
    if (validPieces.length === 0) return null;
    return optimizeCuts({ sheetWidth, sheetHeight, pieces: validPieces, allowRotate });
  }, [pieces, sheetWidth, sheetHeight, allowRotate]);

  // Handlers piezas
  function addPiece() {
    setPieces((prev) => [...prev, { ...PIECE_EMPTY }]);
  }

  function updatePiece(index, field, value) {
    setPieces((prev) => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));
  }

  function deletePiece(index) {
    setPieces((prev) => prev.filter((_, i) => i !== index));
  }

  function resetPieces() {
    setPieces([{ ...PIECE_EMPTY }]);
    setActiveSheet(0);
  }

  function downloadPDF() {
    if (!result) return;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();
    const OAK = [200, 146, 58];

    // Header
    doc.setFillColor(...OAK);
    doc.rect(0, 0, W, 26, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16); doc.setFont('helvetica', 'bold');
    doc.text('PLANO DE CORTES', 14, 11);
    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    doc.text(`Generado: ${new Date().toLocaleDateString('es-AR')}`, 14, 19);
    doc.text(`Plancha: ${sheetWidth}×${sheetHeight}mm`, W - 14, 19, { align: 'right' });

    // Resumen
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(10); doc.setFont('helvetica', 'bold');
    doc.text('Resumen', 14, 34);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    doc.text(`Planchas necesarias: ${result.sheetCount}`, 14, 41);
    doc.text(`Total de piezas: ${result.totalPieces}`, 70, 41);
    doc.text(`Aprovechamiento general: ${result.overallEfficiency}%`, 130, 41);

    // Tabla de piezas
    const validPieces = pieces.filter(p => p.name.trim() && Number(p.width_mm) > 0 && Number(p.height_mm) > 0);
    autoTable(doc, {
      startY: 48,
      head: [['Pieza', 'Ancho (mm)', 'Alto (mm)', 'Cantidad', 'Área unit.']],
      body: validPieces.map(p => [
        p.name,
        Number(p.width_mm),
        Number(p.height_mm),
        Number(p.quantity),
        `${(Number(p.width_mm) * Number(p.height_mm) / 1e6).toFixed(3)} m²`,
      ]),
      theme: 'striped',
      headStyles: { fillColor: OAK, textColor: [255,255,255], fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [250, 248, 245] },
      margin: { left: 14, right: 14 },
    });

    // Una página por plancha
    result.sheets.forEach((sheet, si) => {
      doc.addPage();
      // Mini header
      doc.setFillColor(...OAK);
      doc.rect(0, 0, W, 16, 'F');
      doc.setTextColor(255,255,255);
      doc.setFontSize(11); doc.setFont('helvetica', 'bold');
      doc.text(`Plancha ${si + 1} de ${result.sheetCount}`, 14, 10);
      doc.setFontSize(8); doc.setFont('helvetica', 'normal');
      doc.text(`${sheet.efficiency}% aprovechado · ${sheet.placed.length} piezas`, W - 14, 10, { align: 'right' });

      // Tabla de piezas en esta plancha
      autoTable(doc, {
        startY: 22,
        head: [['Pieza', 'X (mm)', 'Y (mm)', 'Ancho (mm)', 'Alto (mm)', 'Girada']],
        body: sheet.placed.map(p => [
          p.label || p.name,
          Math.round(p.x),
          Math.round(p.y),
          Math.round(p.w),
          Math.round(p.h),
          p.rotated ? 'Sí' : 'No',
        ]),
        theme: 'striped',
        headStyles: { fillColor: [60, 50, 40], textColor: [255,255,255], fontSize: 8 },
        bodyStyles: { fontSize: 8 },
        alternateRowStyles: { fillColor: [250, 248, 245] },
        margin: { left: 14, right: 14 },
      });

      // Nota de desperdicio
      const finalY = doc.lastAutoTable.finalY + 6;
      doc.setFontSize(8); doc.setTextColor(120, 100, 80);
      doc.text(
        `Desperdicio: ${(sheet.wasteArea / 1e6).toFixed(3)} m²  ·  Posición X/Y desde esquina superior izquierda`,
        14, finalY
      );
    });

    doc.save(`plano-cortes-${Date.now()}.pdf`);
  }

  // Handler preset plancha
  function handlePreset(idx) {
    setSheetPreset(idx);
    const preset = STANDARD_SHEETS[idx];
    if (preset.w) { setSheetWidth(preset.w); setSheetHeight(preset.h); }
  }

  const currentSheet = result?.sheets[activeSheet];

  // Eficiencia color
  function effColor(eff) {
    if (eff >= 80) return 'text-emerald-400';
    if (eff >= 60) return 'text-amber-400';
    return 'text-red-400';
  }

  const inpCls = `w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition ${tk.input}`;
  const selCls = `w-full appearance-none rounded-xl border px-3.5 py-2.5 text-sm outline-none transition focus:border-amber-500 ${tk.sel}`;

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className={`text-3xl font-bold ${tk.text}`}>Optimizador de cortes</h1>
          <p className={`${tk.sub} mt-1`}>Calculá cuántas planchas necesitás y cómo acomodar las piezas.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={downloadPDF}
            disabled={!result}
            className="flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium transition bg-amber-500 hover:bg-amber-400 text-black disabled:opacity-40"
          >
            <Download size={15} /> PDF de cortes
          </button>
          <button
            onClick={resetPieces}
            className={`flex items-center gap-2 border rounded-2xl px-4 py-2.5 text-sm font-medium transition ${isDark ? 'border-zinc-700 text-zinc-400 hover:bg-zinc-800' : 'border-stone-300 text-stone-600 hover:bg-stone-100'}`}
          >
            <RefreshCw size={15} /> Limpiar
          </button>
        </div>
      </div>

      <div className="grid xl:grid-cols-[400px_1fr] gap-6 items-start">

        {/* ── Panel izquierdo: configuración ── */}
        <div className="space-y-5">

          {/* Configuración de la plancha */}
          <div className={`rounded-3xl border ${tk.card} p-5 space-y-4`}>
            <h2 className={`font-semibold ${tk.text} flex items-center gap-2`}>
              <Scissors size={16} className="text-amber-400" />
              Plancha de material
            </h2>

            {/* Preset */}
            <div>
              <label className={`block text-xs uppercase tracking-wider mb-1.5 ${tk.sub}`}>Tipo de plancha</label>
              <div className="relative">
                <select
                  value={sheetPreset}
                  onChange={(e) => handlePreset(Number(e.target.value))}
                  className={selCls}
                >
                  {STANDARD_SHEETS.map((s, i) => (
                    <option key={i} value={i}>{s.label}</option>
                  ))}
                </select>
                <ChevronDown size={13} className={`absolute right-3 top-1/2 -translate-y-1/2 ${tk.sub} pointer-events-none`} />
              </div>
            </div>

            {/* Dimensiones */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={`block text-xs uppercase tracking-wider mb-1.5 ${tk.sub}`}>Ancho (mm)</label>
                <input type="number" min="100" value={sheetWidth}
                  onChange={(e) => { setSheetWidth(Number(e.target.value)); setSheetPreset(5); }}
                  className={inpCls} />
              </div>
              <div>
                <label className={`block text-xs uppercase tracking-wider mb-1.5 ${tk.sub}`}>Alto (mm)</label>
                <input type="number" min="100" value={sheetHeight}
                  onChange={(e) => { setSheetHeight(Number(e.target.value)); setSheetPreset(5); }}
                  className={inpCls} />
              </div>
            </div>

            {/* Permitir rotación */}
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <div
                onClick={() => setAllowRotate((v) => !v)}
                className={`relative w-10 h-6 rounded-full border transition-colors ${tk.toggle} ${allowRotate ? 'bg-amber-500 border-amber-500' : ''}`}
              >
                <motion.div
                  animate={{ x: allowRotate ? 18 : 2 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                  className="absolute top-1 w-4 h-4 bg-white rounded-full shadow"
                />
              </div>
              <span className={`text-sm ${tk.text}`}>Permitir rotación de piezas</span>
            </label>
          </div>

          {/* Lista de piezas */}
          <div className={`rounded-3xl border ${tk.card} p-5 space-y-4`}>
            <h2 className={`font-semibold ${tk.text} flex items-center gap-2`}>
              <Scissors size={16} className="text-amber-400" />
              Piezas a cortar
            </h2>

            {/* Encabezados */}
            <div className={`grid grid-cols-[1fr_90px_90px_60px_36px] gap-2 text-[10px] uppercase tracking-wider ${tk.sub}`}>
              <span>Nombre</span>
              <span>Ancho mm</span>
              <span>Alto mm</span>
              <span>Cant.</span>
              <span />
            </div>

            <div className="space-y-2">
              <AnimatePresence>
                {pieces.map((piece, i) => (
                  <PieceRow
                    key={i}
                    piece={piece}
                    index={i}
                    onChange={updatePiece}
                    onDelete={deletePiece}
                    isDark={isDark}
                  />
                ))}
              </AnimatePresence>
            </div>

            <button
              onClick={addPiece}
              className={`w-full flex items-center justify-center gap-2 rounded-2xl py-2.5 text-sm font-medium border border-dashed transition ${isDark ? 'border-zinc-700 text-zinc-400 hover:border-amber-500 hover:text-amber-400' : 'border-stone-300 text-stone-500 hover:border-amber-500 hover:text-amber-600'}`}
            >
              <Plus size={15} /> Agregar pieza
            </button>
          </div>

          {/* Resumen de errores */}
          <AnimatePresence>
            {result?.errors?.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 space-y-1"
              >
                <div className="flex items-center gap-2 text-red-400 text-sm font-medium mb-2">
                  <AlertTriangle size={15} /> Piezas que no caben
                </div>
                {result.errors.map((err, i) => (
                  <p key={i} className="text-xs text-red-400">{err}</p>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Panel derecho: resultado ── */}
        <div className="space-y-5">
          {!result ? (
            <div className={`rounded-3xl border ${tk.card} flex flex-col items-center justify-center py-24 gap-3 ${tk.sub}`}>
              <Scissors size={40} strokeWidth={1} />
              <p className="text-sm">Agregá piezas para ver el resultado</p>
            </div>
          ) : (
            <>
              {/* KPIs */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Planchas necesarias', value: result.sheetCount,         unit: '',   big: true },
                  { label: 'Total de piezas',     value: result.totalPieces,        unit: '',   big: false },
                  { label: 'Aprovechamiento',     value: result.overallEfficiency,  unit: '%',  big: false, color: effColor(result.overallEfficiency) },
                ].map(({ label, value, unit, big, color }) => (
                  <div key={label} className={`rounded-2xl border ${tk.card} p-4 text-center`}>
                    <p className={`text-xs ${tk.sub} mb-2`}>{label}</p>
                    <p className={`font-bold ${big ? 'text-4xl' : 'text-2xl'} ${color || tk.text}`}>
                      {value}{unit}
                    </p>
                  </div>
                ))}
              </div>

              {/* Tabs de planchas */}
              {result.sheets.length > 1 && (
                <div className="flex gap-2 flex-wrap">
                  {result.sheets.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveSheet(i)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition ${activeSheet === i ? tk.tabA : tk.tab}`}
                    >
                      Plancha {i + 1}
                      <span className="ml-1.5 text-xs opacity-70">{s.efficiency}%</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Vista gráfica */}
              {currentSheet && (
                <motion.div
                  key={activeSheet}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.25 }}
                  className={`rounded-3xl border ${tk.card} p-5`}
                >
                  <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                    <div>
                      <h3 className={`font-semibold ${tk.text}`}>
                        Plancha {activeSheet + 1} de {result.sheetCount}
                      </h3>
                      <p className={`text-sm ${tk.sub}`}>
                        {sheetWidth}×{sheetHeight}mm ·{' '}
                        <span className={effColor(currentSheet.efficiency)}>
                          {currentSheet.efficiency}% aprovechado
                        </span>
                        {' · '}
                        <span className={tk.sub}>
                          {currentSheet.placed.length} {currentSheet.placed.length === 1 ? 'pieza' : 'piezas'}
                        </span>
                      </p>
                    </div>
                    {/* Barra de eficiencia */}
                    <div className="flex items-center gap-2">
                      {currentSheet.efficiency >= 80
                        ? <CheckCircle2 size={16} className="text-emerald-400" />
                        : <AlertTriangle size={16} className="text-amber-400" />
                      }
                      <span className={`text-sm font-medium ${effColor(currentSheet.efficiency)}`}>
                        {currentSheet.efficiency >= 80 ? 'Excelente' : currentSheet.efficiency >= 60 ? 'Aceptable' : 'Mejorable'}
                      </span>
                    </div>
                  </div>

                  {/* SVG de la plancha — responsive */}
                  <div className="flex justify-center overflow-auto">
                    <SheetSVG sheet={currentSheet} scale={0.13} isDark={isDark} />
                  </div>

                  {/* Barra de eficiencia visual */}
                  <div className={`mt-4 h-2 rounded-full ${isDark ? 'bg-zinc-800' : 'bg-stone-200'}`}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${currentSheet.efficiency}%` }}
                      transition={{ duration: 0.7, ease: 'easeOut' }}
                      className="h-full rounded-full"
                      style={{ background: currentSheet.efficiency >= 80 ? '#10b981' : currentSheet.efficiency >= 60 ? '#f59e0b' : '#ef4444' }}
                    />
                  </div>
                  <div className="flex justify-between text-xs mt-1">
                    <span className={tk.sub}>Aprovechado: {currentSheet.efficiency}%</span>
                    <span className={tk.sub}>
                      Desperdicio: {Math.round(currentSheet.wasteArea / 10000)} dm²
                    </span>
                  </div>
                </motion.div>
              )}

              {/* Tabla de piezas por plancha */}
              {currentSheet && (
                <div className={`rounded-3xl border ${tk.card} overflow-hidden`}>
                  <div className={`grid grid-cols-[1fr_80px_80px_auto] gap-4 px-5 py-3 text-xs uppercase tracking-wider border-b ${tk.th}`}>
                    <span>Pieza</span>
                    <span className="text-right">Ancho</span>
                    <span className="text-right">Alto</span>
                    <span className="text-right">Rotada</span>
                  </div>
                  <div className={`divide-y ${isDark ? 'divide-zinc-800/50' : 'divide-stone-100'}`}>
                    {currentSheet.placed.map((p, i) => (
                      <div key={i} className={`grid grid-cols-[1fr_80px_80px_auto] gap-4 px-5 py-3 items-center text-sm transition ${tk.row}`}>
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-3 h-3 rounded-sm shrink-0" style={{ background: p.color }} />
                          <span className={`truncate ${tk.text}`}>{p.label}</span>
                        </div>
                        <span className={`text-right ${tk.sub}`}>{p.w} mm</span>
                        <span className={`text-right ${tk.sub}`}>{p.h} mm</span>
                        <span className={`text-right text-xs ${p.rotated ? 'text-amber-400' : tk.sub}`}>
                          {p.rotated ? '↻ Sí' : '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Resumen total */}
              <div className={`rounded-2xl border ${isDark ? 'border-amber-500/20 bg-amber-500/5' : 'border-amber-200 bg-amber-50'} p-4`}>
                <p className={`text-sm font-medium ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
                  Resumen: necesitás <strong>{result.sheetCount}</strong> plancha{result.sheetCount !== 1 ? 's' : ''} para cortar{' '}
                  <strong>{result.totalPieces}</strong> pieza{result.totalPieces !== 1 ? 's' : ''} con un aprovechamiento promedio del{' '}
                  <strong>{result.overallEfficiency}%</strong>.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
