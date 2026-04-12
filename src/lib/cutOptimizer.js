/**
 * cutOptimizer.js — Bin packing 2D Guillotine Best-Fit Decreasing
 * Optimiza el corte de planchas de melamina/MDF.
 */

const KERF = 4; // mm de sierra por corte

function guillotineSplit(space, piece) {
  const rightW = space.w - piece.w - KERF;
  const topH   = space.h - piece.h - KERF;
  const spaces = [];
  if (rightW >= topH) {
    if (rightW > 0) spaces.push({ x: space.x + piece.w + KERF, y: space.y, w: rightW, h: space.h });
    if (topH   > 0) spaces.push({ x: space.x, y: space.y + piece.h + KERF, w: piece.w, h: topH });
  } else {
    if (topH   > 0) spaces.push({ x: space.x, y: space.y + piece.h + KERF, w: space.w, h: topH });
    if (rightW > 0) spaces.push({ x: space.x + piece.w + KERF, y: space.y, w: rightW, h: piece.h });
  }
  return spaces;
}

function tryPlace(sheet, piece, allowRotate) {
  let best = null;
  let bestScore = Infinity;
  let bestOrient = null;

  const orientations = [
    { w: piece.w, h: piece.h, rotated: false },
    ...(allowRotate && piece.w !== piece.h ? [{ w: piece.h, h: piece.w, rotated: true }] : []),
  ];

  for (const orient of orientations) {
    for (const space of sheet.freeSpaces) {
      if (orient.w <= space.w && orient.h <= space.h) {
        const score = space.w * space.h - orient.w * orient.h;
        if (score < bestScore) {
          bestScore = score;
          best = space;
          bestOrient = orient;
        }
      }
    }
  }

  if (!best) return false;

  sheet.placed.push({
    name: piece.name, label: piece.label,
    x: best.x, y: best.y,
    w: bestOrient.w, h: bestOrient.h,
    rotated: bestOrient.rotated,
    color: piece.color,
  });

  sheet.freeSpaces = sheet.freeSpaces.filter((s) => s !== best);
  sheet.freeSpaces.push(...guillotineSplit(best, bestOrient));
  sheet.usedArea += bestOrient.w * bestOrient.h;
  return true;
}

const COLORS = [
  '#c8923a','#5b7fa6','#6b8f6b','#9b6b9b','#c0845a',
  '#7a9e7e','#8fa8c8','#b8866a','#4a7a6a','#8a5a6a',
  '#a67c52','#5a6a8a','#8b5e3c','#6a8a5a','#8a6a4a',
];

export function optimizeCuts({ sheetWidth, sheetHeight, pieces, allowRotate = true }) {
  const expanded = [];
  const colorMap = {};
  let colorIdx = 0;

  for (const piece of pieces) {
    const qty = Number(piece.quantity || 1);
    if (!colorMap[piece.name]) {
      colorMap[piece.name] = COLORS[colorIdx % COLORS.length];
      colorIdx++;
    }
    for (let i = 0; i < qty; i++) {
      expanded.push({
        name:  piece.name,
        label: qty > 1 ? `${piece.name} ${i + 1}/${qty}` : piece.name,
        w:     Number(piece.width_mm),
        h:     Number(piece.height_mm),
        color: colorMap[piece.name],
      });
    }
  }

  expanded.sort((a, b) => b.w * b.h - a.w * a.h);

  const sheets = [];
  const errors = [];

  for (const piece of expanded) {
    const fitsNormal  = piece.w <= sheetWidth && piece.h <= sheetHeight;
    const fitsRotated = allowRotate && piece.h <= sheetWidth && piece.w <= sheetHeight;

    if (!fitsNormal && !fitsRotated) {
      errors.push(`"${piece.name}" (${piece.w}x${piece.h}mm) no cabe en la plancha`);
      continue;
    }

    let placed = false;
    for (const sheet of sheets) {
      if (tryPlace(sheet, piece, allowRotate)) { placed = true; break; }
    }

    if (!placed) {
      const newSheet = {
        id: sheets.length, width: sheetWidth, height: sheetHeight,
        placed: [], freeSpaces: [{ x: 0, y: 0, w: sheetWidth, h: sheetHeight }],
        usedArea: 0,
      };
      sheets.push(newSheet);
      tryPlace(newSheet, piece, allowRotate);
    }
  }

  const totalArea = sheetWidth * sheetHeight;
  for (const sheet of sheets) {
    sheet.efficiency = totalArea > 0 ? Math.round((sheet.usedArea / totalArea) * 100) : 0;
    sheet.wasteArea  = totalArea - sheet.usedArea;
  }

  const overallEfficiency = sheets.length > 0
    ? Math.round(sheets.reduce((s, sh) => s + sh.usedArea, 0) / (sheets.length * totalArea) * 100)
    : 0;

  return { sheetCount: sheets.length, sheets, overallEfficiency, errors, totalPieces: expanded.length };
}
