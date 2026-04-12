/**
 * CatalogPage — Ruta pública /catalogo
 * Accesible sin login. El cliente ve los trabajos del taller,
 * filtra por categoría y pide cotización. El lead llega al panel del mueblista.
 */

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion, useMotionValue, useSpring, AnimatePresence } from 'framer-motion';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  Ruler,
  Layers,
  CheckCircle2,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Star,
  Package,
  Clock,
  BadgeCheck,
  Hammer,
  TreePine,
  Wrench,
  Shield,
  Menu,
  X,
  Send,
  Phone,
  MapPin,
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

gsap.registerPlugin(ScrollTrigger);

// ─── PALETA ────────────────────────────────────────────────────────────────

const W_BASE = {
  bg:       '#0f0d0b',
  surface:  '#1a1610',
  surface2: '#211d16',
  border:   '#2e2820',
  border2:  '#3d3528',
  oak:      '#c8923a',
  mahogany: '#8b5e3c',
  pine:     '#a67c52',
  linen:    '#f0e6d3',
  sand:     '#b5a48e',
  earth:    '#7a6e60',
};
// W se usa en subcomponentes fuera del componente principal,
// se actualiza dinámicamente cuando carga shopConfig
const W = { ...W_BASE };

// ─── DATOS DE DEMO ─────────────────────────────────────────────────────────
// En producción esto vendría de Supabase (tabla products/catalog)

const categories = [
  { id: 'todos',      label: 'Todo' },
  { id: 'dormitorio', label: 'Dormitorio' },
  { id: 'cocina',     label: 'Cocina' },
  { id: 'sala',       label: 'Sala y comedor' },
  { id: 'oficina',    label: 'Oficina' },
];

const catalog = [
  {
    id: 1,
    name: 'Placard Corredera Roble',
    category: 'dormitorio',
    price: 1850000,
    time: '12 días hábiles',
    tag: 'Más pedido',
    wood: 'MDF enchapado roble',
    finish: 'Barniz satinado al agua',
    dims: '2.40 × 2.00 × 0.60 m',
    details: ['Riel alemán silencioso', 'Tirador de acero inox', 'Interior melamina blanca'],
    description: 'Diseño limpio con frentes enchapados en roble natural. Deslizamiento suave garantizado por rieles importados.',
  },
  {
    id: 2,
    name: 'Cocina Integral a Medida',
    category: 'cocina',
    price: 4200000,
    time: '25 días hábiles',
    tag: 'Premium',
    wood: 'MDF lacado + frentes roble',
    finish: 'Laca mate industrial',
    dims: 'Medida a pedido',
    details: ['Bisagra Blum amortiguada', 'Extracción total', 'Zócalo regulable'],
    description: 'Cocina completa diseñada para tu espacio. Combinamos funcionalidad máxima con estética de carpintería fina.',
  },
  {
    id: 3,
    name: 'Escritorio Flotante Nogal',
    category: 'oficina',
    price: 680000,
    time: '7 días hábiles',
    tag: 'Clásico',
    wood: 'Melamina nogal texturado',
    finish: 'Canto ABS 2 mm',
    dims: '1.60 × 0.75 m',
    details: ['Soporte acero laqueado', 'Pasacables', 'Fijación a stud'],
    description: 'Escritorio moderno que aprovecha la pared. Perfecto para home office sin ocupar espacio en el piso.',
  },
  {
    id: 4,
    name: 'Mesa de Comedor Rústica',
    category: 'sala',
    price: 1350000,
    time: '15 días hábiles',
    tag: 'Artesanal',
    wood: 'Pino macizo cepillado',
    finish: 'Aceite de tung + cera',
    dims: '1.80 × 0.90 × 0.76 m',
    details: ['Patas de hierro forjado', 'Cola de carpintero', 'Veta natural visible'],
    description: 'Mesa maciza trabajada a mano. El veteado natural de la madera hace que cada pieza sea única.',
  },
  {
    id: 5,
    name: 'Biblioteca Empotrada',
    category: 'oficina',
    price: 2100000,
    time: '18 días hábiles',
    tag: 'A medida',
    wood: 'MDF crudo + frente cedro',
    finish: 'Epoxi + barniz cedro',
    dims: '3.00 × 2.40 × 0.35 m',
    details: ['LED integrado', 'Estantes regulables', 'Panel trasero contraplacado'],
    description: 'Biblioteca que cubre la pared completa. Iluminación LED integrada que resalta cada objeto.',
  },
  {
    id: 6,
    name: 'Cajonera Organizadora',
    category: 'dormitorio',
    price: 920000,
    time: '10 días hábiles',
    tag: 'Versátil',
    wood: 'Melamina blanca + tapa roble',
    finish: 'Enchape natural',
    dims: '0.80 × 1.10 × 0.45 m',
    details: ['5 cajones extracción total', 'Tirador fresado', 'Ruedas bloqueables'],
    description: 'Cajonera con cierre amortiguado en todos los cajones. Mezcla de melamina blanca y detalle en roble.',
  },
];

const steps = [
  { icon: Ruler,  label: 'Medición',    desc: 'Visita técnica sin costo o planos digitales. Relevamos cada detalle del espacio.' },
  { icon: Layers, label: 'Diseño',      desc: 'Cotización detallada con materiales, plazos y render previo del proyecto.' },
  { icon: Hammer, label: 'Fabricación', desc: 'Corte CNC de precisión milimétrica y ensamble artesanal en nuestro taller.' },
  { icon: Shield, label: 'Entrega',     desc: 'Instalación incluida. Garantía de 12 meses en estructura y herrajes.' },
];

const stats = [
  { val: 340, suf: '+',     label: 'Proyectos entregados', icon: Package },
  { val: 98,  suf: '%',    label: 'Clientes satisfechos',  icon: Star },
  { val: 8,   suf: ' años', label: 'De trayectoria',       icon: BadgeCheck },
  { val: 24,  suf: 'h',    label: 'Tiempo de respuesta',   icon: Clock },
];

// ─── HELPERS ───────────────────────────────────────────────────────────────

function money(n) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS', maximumFractionDigits: 0,
  }).format(n);
}

function scrollTo(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

// ─── STAT VALUE con CountUp animado ────────────────────────────────────────
// Detecta si el valor empieza con número para animarlo, si no lo muestra tal cual
function StatValue({ value }) {
  const match = String(value).match(/^(\d+)(.*)/);
  const ref   = useRef(null);
  const [display, setDisplay] = useState(match ? '0' : value);

  useEffect(() => {
    if (!match) return;
    const num    = parseInt(match[1], 10);
    const suffix = match[2] || '';
    let triggered = false;

    const trigger = ScrollTrigger.create({
      trigger: ref.current,
      start: 'top 88%',
      onEnter: () => {
        if (triggered) return;
        triggered = true;
        const start = performance.now();
        const dur   = 1200;
        function tick(now) {
          const p = Math.min((now - start) / dur, 1);
          // ease out cubic
          const eased = 1 - Math.pow(1 - p, 3);
          setDisplay(Math.round(eased * num) + suffix);
          if (p < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      },
    });

    return () => trigger.kill();
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  return <span ref={ref}>{display}</span>;
}

// ─── MAGNETIC BUTTON ───────────────────────────────────────────────────────

function MagBtn({ children, className, style, onClick, type = 'button' }) {
  const ref = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 180, damping: 18 });
  const sy = useSpring(y, { stiffness: 180, damping: 18 });

  return (
    <motion.button
      ref={ref} type={type}
      style={{ x: sx, y: sy, ...style }}
      onMouseMove={(e) => {
        const r = ref.current.getBoundingClientRect();
        x.set((e.clientX - r.left - r.width / 2) * 0.28);
        y.set((e.clientY - r.top - r.height / 2) * 0.28);
      }}
      onMouseLeave={() => { x.set(0); y.set(0); }}
      whileTap={{ scale: 0.96 }}
      className={className}
      onClick={onClick}
    >
      {children}
    </motion.button>
  );
}

// ─── COUNT UP ──────────────────────────────────────────────────────────────

function CountUp({ val, suf }) {
  const ref  = useRef(null);
  const done = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !done.current) {
        done.current = true;
        // Usamos un objeto proxy con getter para animar sin DOM directo
        const proxy = { v: 0 };
        gsap.to(proxy, {
          v: val, duration: 2.2, ease: 'power2.out',
          onUpdate() { el.textContent = Math.round(proxy.v) + suf; },
        });
      }
    }, { threshold: 0.6 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [val, suf]);
  return <span ref={ref}>0{suf}</span>;
}

// ─── GRAIN SVG ─────────────────────────────────────────────────────────────

function Grain({ op = 0.04, id = 'g0' }) {
  return (
    <svg className="pointer-events-none absolute inset-0 w-full h-full" style={{ opacity: op }}>
      <filter id={id}>
        <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter={`url(#${id})`} />
    </svg>
  );
}

// ─── QUOTE MODAL ───────────────────────────────────────────────────────────

function QuoteModal({ product, onClose, ownerId }) {
  const [name,  setName]  = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [note,  setNote]  = useState('');
  const [sent,  setSent]  = useState(false);
  const [busy,  setBusy]  = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    setBusy(true);
    try {
      await supabase.from('catalog_leads').insert({
        owner_id: ownerId,
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        message: note.trim(),
        product_id: product?.id ?? null,
        product_name: product?.name ?? '',
        status: 'new',
      });
    } catch (_) { /* silent */ }
    setBusy(false);
    setSent(true);
  }

  const title = product ? product.name : 'Consulta general';

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      <motion.div
        className="absolute inset-0 backdrop-blur-sm"
        style={{ background: 'rgba(0,0,0,0.78)' }}
        onClick={onClose}
      />
      <motion.div
        className="relative z-10 w-full max-w-md rounded-2xl p-8 shadow-2xl overflow-hidden"
        style={{ background: W.surface2, border: `1px solid ${W.border2}` }}
        initial={{ scale: 0.92, y: 24, opacity: 0 }}
        animate={{ scale: 1,    y: 0,  opacity: 1 }}
        exit={{   scale: 0.92, y: 24, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 26 }}
      >
        <Grain id="qm" op={0.04} />
        {/* Línea dorada top */}
        <div className="absolute top-0 left-0 right-0 h-[2px]"
          style={{ background: `linear-gradient(90deg, transparent, ${W.oak}, transparent)` }} />

        {!sent ? (
          <>
            <div className="mb-6">
              <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: W.earth }}>
                Solicitud de cotización
              </p>
              <h3 className="text-2xl font-black" style={{ color: W.linen }}>{title}</h3>
              {product && (
                <p className="text-xs mt-1" style={{ color: W.earth }}>
                  {product.dims} · {product.wood}
                </p>
              )}
            </div>

            <form onSubmit={submit} className="space-y-3">
              <input
                required type="text" placeholder="Tu nombre *" value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition"
                style={{ background: W.surface, border: `1px solid ${W.border2}`, color: W.linen }}
                onFocus={e => e.target.style.borderColor = W.oak + '80'}
                onBlur={e  => e.target.style.borderColor = W.border2}
              />
              <input
                required type="tel" placeholder="WhatsApp / Teléfono *" value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition"
                style={{ background: W.surface, border: `1px solid ${W.border2}`, color: W.linen }}
                onFocus={e => e.target.style.borderColor = W.oak + '80'}
                onBlur={e  => e.target.style.borderColor = W.border2}
              />
              <input
                type="email" placeholder="Correo (opcional)" value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition"
                style={{ background: W.surface, border: `1px solid ${W.border2}`, color: W.linen }}
                onFocus={e => e.target.style.borderColor = W.oak + '80'}
                onBlur={e  => e.target.style.borderColor = W.border2}
              />
              <textarea
                placeholder="Medidas, detalles o consulta..."
                value={note} onChange={(e) => setNote(e.target.value)}
                rows={3}
                className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition resize-none"
                style={{ background: W.surface, border: `1px solid ${W.border2}`, color: W.linen }}
                onFocus={e => e.target.style.borderColor = W.oak + '80'}
                onBlur={e  => e.target.style.borderColor = W.border2}
              />
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={onClose}
                  className="flex-1 rounded-xl py-3 text-sm font-medium transition"
                  style={{ background: W.surface, border: `1px solid ${W.border2}`, color: W.sand }}
                >
                  Cancelar
                </button>
                <MagBtn type="submit"
                  className="flex-1 rounded-xl py-3 text-sm font-black transition disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ background: W.oak, color: '#0f0d0b' }}
                >
                  {busy ? 'Enviando...' : <><Send size={13} /> Enviar</>}
                </MagBtn>
              </div>
            </form>
          </>
        ) : (
          <motion.div
            className="text-center py-6"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 280, damping: 22 }}
          >
            <motion.div
              initial={{ scale: 0 }} animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 260, damping: 18 }}
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
              style={{ background: W.oak + '20', border: `1px solid ${W.oak}40` }}
            >
              <CheckCircle2 size={30} style={{ color: W.oak }} />
            </motion.div>
            <h3 className="text-2xl font-black mb-2" style={{ color: W.linen }}>¡Recibido!</h3>
            <p className="text-sm mb-6 leading-relaxed" style={{ color: W.sand }}>
              Te contactamos en menos de 24 horas con la cotización.
              {product && <> Guardamos tu consulta sobre <strong style={{ color: W.linen }}>{product.name}</strong>.</>}
            </p>
            <button onClick={onClose}
              className="rounded-xl px-6 py-3 text-sm font-medium transition"
              style={{ background: W.surface, border: `1px solid ${W.border2}`, color: W.sand }}
            >
              Cerrar
            </button>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─── CAROUSEL (drag vs click separados) ───────────────────────────────────

function Carousel({ items, onQuote }) {
  const x          = useMotionValue(0);
  const dragging   = useRef(false);
  const pointerDown= useRef({ x: 0, y: 0 });
  const timerRef   = useRef(null);
  const pausedRef  = useRef(false);
  const CARD_W     = 280; // card 260px + gap 20px
  const SPEED      = 0.6; // px por frame

  // ── Autoplay: mueve suavemente hacia la izquierda en loop
  useEffect(() => {
    if (items.length === 0) return;
    const totalW = items.length * CARD_W;

    function tick() {
      if (pausedRef.current || dragging.current) {
        timerRef.current = requestAnimationFrame(tick);
        return;
      }
      const next = x.get() - SPEED;
      // cuando llegó al final, vuelve al inicio sin salto (loop infinito)
      x.set(next < -totalW ? 0 : next);
      timerRef.current = requestAnimationFrame(tick);
    }

    timerRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(timerRef.current);
  }, [items.length, x]);

  // Duplicamos suficientes veces para que el loop funcione aunque haya pocos items
  const copies  = items.length < 4 ? 4 : 2;
  const looped  = Array.from({ length: copies }, () => items).flat();

  return (
    <section className="py-16 px-6 md:px-16" style={{ borderTop: `1px solid ${W.border}` }}>
      <div className="mb-8 flex items-end justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: W.earth }}>Explorar</p>
          <h2 className="text-3xl font-black" style={{ color: W.linen }}>
            Nuestra <span style={{ color: W.oak }}>colección</span>
          </h2>
        </div>
        <p className="hidden md:flex items-center gap-1 text-xs select-none" style={{ color: W.earth }}>
          <ChevronRight size={12} /> tocá una card para cotizar
        </p>
      </div>

      <div
        className="overflow-hidden"
        onMouseEnter={() => { pausedRef.current = true;  }}
        onMouseLeave={() => { pausedRef.current = false; }}
      >
        <motion.div
          style={{ x }}
          drag="x"
          dragConstraints={{ left: -(items.length * CARD_W * 2), right: 0 }}
          dragElastic={0.02}
          dragMomentum={false}
          onDragStart={() => {
            dragging.current  = true;
            pausedRef.current = true;
          }}
          onDragEnd={() => {
            // delay corto para que el click de hijos no dispare
            setTimeout(() => {
              dragging.current  = false;
              pausedRef.current = false;
            }, 80);
          }}
          className="flex gap-5 w-max cursor-grab active:cursor-grabbing"
        >
          {looped.map((p, i) => (
            <div
              key={i}
              className="shrink-0 w-64 rounded-2xl overflow-hidden relative select-none"
              style={{ height: 300, background: W.surface, border: `1px solid ${W.border}` }}
              onPointerDown={(e) => { pointerDown.current = { x: e.clientX, y: e.clientY }; }}
              onPointerUp={(e) => {
                const dx = Math.abs(e.clientX - pointerDown.current.x);
                const dy = Math.abs(e.clientY - pointerDown.current.y);
                // solo dispara click si el movimiento fue < 8px (tap real)
                if (dx < 8 && dy < 8 && !dragging.current) onQuote(p);
              }}
            >
              {/* Foto o placeholder */}
              {p.photos?.[0] ? (
                <img
                  src={p.photos[0]} alt={p.name}
                  className="w-full h-36 object-cover"
                  draggable={false}
                />
              ) : (
                <div
                  className="w-full h-36 flex items-center justify-center relative overflow-hidden"
                  style={{ background: `linear-gradient(135deg, ${W.oak}12, ${W.mahogany}08)` }}
                >
                  {[...Array(5)].map((_, j) => (
                    <div key={j} className="absolute h-full"
                      style={{ left: `${15 + j * 16}%`, width: '1px',
                        background: `linear-gradient(180deg, transparent, ${W.oak}22, transparent)` }} />
                  ))}
                  <Hammer size={36} strokeWidth={1.3} style={{ color: W.oak, opacity: 0.5 }} />
                </div>
              )}

              {/* Veta lateral */}
              <div className="absolute left-0 top-0 bottom-0 w-[2px]"
                style={{ background: `linear-gradient(180deg, ${W.oak}, ${W.mahogany})` }} />

              <div className="p-4 flex flex-col justify-between" style={{ height: 164 }}>
                <div>
                  {p.tag && (
                    <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
                      style={{ background: W.oak + '18', color: W.oak }}>
                      {p.tag}
                    </span>
                  )}
                  <h3 className="text-sm font-bold mt-2 leading-snug" style={{ color: W.linen }}>{p.name}</h3>
                  <p className="text-xs mt-1" style={{ color: W.earth }}>{p.dims}</p>
                </div>
                <div className="flex items-end justify-between">
                  <p className="text-lg font-black" style={{ color: W.oak }}>
                    {isNaN(Number(p.price)) || p.price === '' ? p.price : `$${Number(p.price).toLocaleString('es-AR')}`}
                  </p>
                  <span className="text-[10px] flex items-center gap-0.5" style={{ color: W.earth }}>
                    <ArrowUpRight size={10} /> cotizar
                  </span>
                </div>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ─── PHOTO GALLERY (mini carrusel en card) ─────────────────────────────────

function PhotoGallery({ photos }) {
  const [idx,       setIdx]     = useState(0);
  const [lightbox,  setLightbox] = useState(false);

  if (!photos?.length) return null;

  function prev(e) { e.stopPropagation(); setIdx(i => (i - 1 + photos.length) % photos.length); }
  function next(e) { e.stopPropagation(); setIdx(i => (i + 1) % photos.length); }

  // Teclado dentro del lightbox
  function onKey(e) {
    if (e.key === 'ArrowLeft')  setIdx(i => (i - 1 + photos.length) % photos.length);
    if (e.key === 'ArrowRight') setIdx(i => (i + 1) % photos.length);
    if (e.key === 'Escape')     setLightbox(false);
  }

  return (
    <>
      {/* ── Miniatura en la card ── */}
      <div className="relative w-full h-44 rounded-xl overflow-hidden group">
        <AnimatePresence mode="wait" initial={false}>
          <motion.img
            key={idx}
            src={photos[idx]} alt=""
            className="absolute inset-0 w-full h-full object-cover cursor-zoom-in"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            draggable={false}
            onPointerDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); setLightbox(true); }}
          />
        </AnimatePresence>

        {/* Hint de zoom */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition pointer-events-none">
          <div className="bg-black/50 backdrop-blur-sm rounded-full px-3 py-1 text-white text-[11px] flex items-center gap-1">
            <span>🔍</span> Ver completa
          </div>
        </div>

        {/* Navegación entre fotos — solo si hay más de 1 */}
        {photos.length > 1 && (
          <>
            <button
              onPointerDown={e => e.stopPropagation()}
              onClick={prev}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
            ><ChevronLeft size={13} /></button>
            <button
              onPointerDown={e => e.stopPropagation()}
              onClick={next}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
            ><ChevronRight size={13} /></button>

            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              {photos.map((_, i) => (
                <button key={i}
                  onPointerDown={e => e.stopPropagation()}
                  onClick={e => { e.stopPropagation(); setIdx(i); }}
                  className="w-1.5 h-1.5 rounded-full transition-all"
                  style={{ background: i === idx ? W.oak : 'rgba(255,255,255,0.4)' }}
                />
              ))}
            </div>

            <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full">
              {idx + 1}/{photos.length}
            </div>
          </>
        )}
      </div>

      {/* ── Lightbox fullscreen ── */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            className="fixed inset-0 z-[200] flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.95)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightbox(false)}
            onKeyDown={onKey}
            tabIndex={-1}
          >
            {/* Cerrar */}
            <button
              className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition z-10"
              onClick={() => setLightbox(false)}
            >
              <X size={20} />
            </button>

            {/* Contador */}
            {photos.length > 1 && (
              <div className="absolute top-5 left-1/2 -translate-x-1/2 bg-white/10 text-white text-xs px-4 py-1.5 rounded-full z-10">
                {idx + 1} / {photos.length}
              </div>
            )}

            {/* Imagen principal */}
            <AnimatePresence mode="wait" initial={false}>
              <motion.img
                key={idx}
                src={photos[idx]} alt=""
                className="max-h-[88vh] max-w-[88vw] rounded-2xl object-contain shadow-2xl"
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.94 }}
                transition={{ duration: 0.22 }}
                onClick={e => e.stopPropagation()}
                draggable={false}
              />
            </AnimatePresence>

            {/* Flechas */}
            {photos.length > 1 && (
              <>
                <button
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition z-10"
                  onClick={prev}
                >
                  <ChevronLeft size={24} />
                </button>
                <button
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition z-10"
                  onClick={next}
                >
                  <ChevronRight size={24} />
                </button>
              </>
            )}

            {/* Thumbnails strip */}
            {photos.length > 1 && (
              <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                {photos.map((url, i) => (
                  <button
                    key={i}
                    onClick={e => { e.stopPropagation(); setIdx(i); }}
                    className="w-14 h-10 rounded-lg overflow-hidden border-2 transition"
                    style={{ borderColor: i === idx ? W.oak : 'transparent', opacity: i === idx ? 1 : 0.5 }}
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" draggable={false} />
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ─── PRODUCT CARD ──────────────────────────────────────────────────────────

function ProductCard({ p, index, onQuote }) {
  const [hover, setHover] = useState(false);

  return (
    <motion.article
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.55, delay: index * 0.07, ease: [0.22, 1, 0.36, 1] }}
      onHoverStart={() => setHover(true)}
      onHoverEnd={() => setHover(false)}
      whileHover={{ y: -5 }}
      style={{
        background: W.surface,
        border: `1px solid ${hover ? W.border2 : W.border}`,
        transition: 'border-color 0.3s',
      }}
      className="relative rounded-2xl p-6 flex flex-col gap-5 overflow-hidden"
    >
      <Grain id={`pc${p.id}`} op={0.03} />

      {/* Veta lateral */}
      <motion.div
        className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-2xl"
        style={{ background: `linear-gradient(180deg, ${W.oak}, ${W.mahogany})` }}
        animate={{ opacity: hover ? 1 : 0.35 }}
        transition={{ duration: 0.3 }}
      />

      {/* Tag + rating */}
      <div className="flex items-start justify-between gap-3">
        <span
          className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full"
          style={{ background: W.oak + '18', color: W.oak, border: `1px solid ${W.oak}30` }}
        >
          {p.tag}
        </span>
        <div className="flex items-center gap-1 text-xs">
          <Star size={11} fill={W.oak} color={W.oak} />
          <span style={{ color: W.sand }}>4.9</span>
        </div>
      </div>

      {/* Foto principal o placeholder */}
      {p.photos?.length > 0 ? (
        <PhotoGallery photos={p.photos} />
      ) : (
        <div
          className="w-full h-36 rounded-xl flex items-center justify-center relative overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${W.oak}10, ${W.mahogany}06)` }}
        >
          {[...Array(5)].map((_, i) => (
            <div key={i} className="absolute h-full"
              style={{ left: `${15 + i * 16}%`, width: '1px',
                background: `linear-gradient(180deg, transparent, ${W.oak}22, transparent)`,
                opacity: hover ? 1 : 0.4, transition: 'opacity 0.4s' }}
            />
          ))}
          <Hammer size={44} strokeWidth={1.3}
            style={{ color: W.oak, opacity: hover ? 0.9 : 0.55, transition: 'opacity 0.3s' }}
          />
        </div>
      )}

      {/* Info */}
      <div>
        <h3 className="text-lg font-bold leading-snug" style={{ color: W.linen }}>{p.name}</h3>
        <p className="text-xs mt-1 leading-relaxed" style={{ color: W.earth }}>{p.description}</p>
        <p className="text-xs mt-2" style={{ color: W.earth }}>{p.dims}</p>
      </div>

      {/* Material + acabado */}
      <div className="space-y-1.5 text-xs" style={{ color: W.sand }}>
        <div className="flex items-center gap-2">
          <TreePine size={12} style={{ color: W.pine }} />
          <span>{p.wood}</span>
        </div>
        <div className="flex items-center gap-2">
          <Wrench size={12} style={{ color: W.pine }} />
          <span>{p.finish}</span>
        </div>
      </div>

      {/* Detalles */}
      {p.details?.length > 0 && (
        <ul className="space-y-1">
          {p.details.map((d) => (
            <li key={d} className="flex items-center gap-2 text-xs" style={{ color: W.earth }}>
              <CheckCircle2 size={11} style={{ color: W.oak }} />
              {d}
            </li>
          ))}
        </ul>
      )}

      {/* Precio + plazo */}
      <div
        className="flex items-end justify-between pt-4 mt-auto"
        style={{ borderTop: `1px solid ${W.border}` }}
      >
        <div>
          <p className="text-[10px] uppercase tracking-widest mb-0.5" style={{ color: W.earth }}>Desde</p>
          <p className="text-xl font-black" style={{ color: W.oak }}>
            {isNaN(Number(p.price)) || p.price === '' ? p.price : `$${Number(p.price).toLocaleString('es-AR')}`}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-widest mb-0.5" style={{ color: W.earth }}>Plazo</p>
          <p className="text-sm font-semibold" style={{ color: W.sand }}>{p.time}</p>
        </div>
      </div>

      <MagBtn
        style={{ background: `${W.oak}18`, border: `1px solid ${W.oak}35`, color: W.oak }}
        className="w-full rounded-xl py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors hover:bg-[#c8923a28]"
        onClick={() => onQuote(p)}
      >
        Pedir cotización
        <ArrowUpRight size={14} />
      </MagBtn>
    </motion.article>
  );
}

// ─── NAVBAR PÚBLICA ────────────────────────────────────────────────────────

function PublicNav({ onQuote, shopConfig }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenu]     = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <motion.header
      className="fixed top-0 left-0 right-0 z-40 transition-all"
      style={{
        background: scrolled ? W.bg + 'f0' : 'transparent',
        borderBottom: scrolled ? `1px solid ${W.border}` : '1px solid transparent',
        backdropFilter: scrolled ? 'blur(16px)' : 'none',
      }}
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden"
            style={{ background: W.oak + '20', border: `1px solid ${W.oak}40` }}
          >
            {shopConfig?.logo_url
              ? <img src={shopConfig.logo_url} alt="logo" className="w-full h-full object-contain"/>
              : <Hammer size={16} style={{ color: W.oak }} />
            }
          </div>
          <div>
            <p className="text-sm font-black leading-none" style={{ color: W.linen }}>
              {shopConfig?.shop_name || 'WoodFlow'}
            </p>
            <p className="text-[9px] uppercase tracking-widest leading-none mt-0.5" style={{ color: W.earth }}>
              Carpintería artesanal
            </p>
          </div>
        </div>

        {/* Nav desktop */}
        <nav className="hidden md:flex items-center gap-6 text-sm" style={{ color: W.sand }}>
          {[['catalogo', 'Catálogo'], ['proceso', 'Cómo trabajamos'], ['contacto', 'Contacto']].map(([id, label]) => (
            <button
              key={id}
              onClick={() => scrollTo(id)}
              className="hover:text-white transition-colors"
              style={{ color: W.sand }}
            >
              {label}
            </button>
          ))}
        </nav>

        {/* CTA + menu mobile */}
        <div className="flex items-center gap-3">
          <MagBtn
            className="hidden md:flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold transition-colors"
            style={{ background: W.oak, color: '#0f0d0b' }}
            onClick={() => onQuote(null)}
          >
            <Send size={13} />
            Consulta rápida
          </MagBtn>
          <button
            className="md:hidden p-2 rounded-lg"
            style={{ color: W.sand }}
            onClick={() => setMenu(!menuOpen)}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            className="md:hidden px-6 pb-5 space-y-3"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ background: W.bg, borderTop: `1px solid ${W.border}` }}
          >
            {[['catalogo', 'Catálogo'], ['proceso', 'Cómo trabajamos'], ['contacto', 'Contacto']].map(([id, label]) => (
              <button
                key={id}
                onClick={() => { scrollTo(id); setMenu(false); }}
                className="block w-full text-left py-2 text-sm"
                style={{ color: W.sand }}
              >
                {label}
              </button>
            ))}
            <button
              onClick={() => { onQuote(null); setMenu(false); }}
              className="w-full rounded-xl py-3 text-sm font-bold"
              style={{ background: W.oak, color: '#0f0d0b' }}
            >
              Consulta rápida
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}

// ─── PAGE PRINCIPAL ────────────────────────────────────────────────────────

export default function CatalogPage() {
  const { slug }   = useParams();
  const heroRef    = useRef(null);
  const titleRef   = useRef(null);
  const subtitleRef= useRef(null);
  const statsRef   = useRef(null);
  const stepsRef   = useRef(null);

  const [activeCategory, setCategory] = useState('todos');
  const [quoteProduct,   setQuoteFor]      = useState(undefined);
  const [products,       setProducts]      = useState([]);
  const [collections,    setCollections]   = useState([]);
  const [shopConfig,     setShopConfig]    = useState(null);
  const [notFound,       setNotFound]      = useState(false);
  const [loadingCatalog, setLoadingCatalog] = useState(true);

  // Carga config del taller por slug → luego sus productos y colecciones
  useEffect(() => {
    async function load() {
      setLoadingCatalog(true);

      if (!slug) { setNotFound(true); setLoadingCatalog(false); return; }

      // 1. Buscar shop_config por slug
      const { data: cfg, error: cfgErr } = await supabase
        .from('shop_config')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      // Si hay error de tabla (404/42P01) o no existe el slug
      if (cfgErr || !cfg) { setNotFound(true); setLoadingCatalog(false); return; }
      setShopConfig(cfg);

      // 2. Cargar productos y colecciones del owner
      const [prodRes, colRes] = await Promise.all([
        supabase.from('catalog_products').select('*')
          .eq('owner_id', cfg.owner_id).eq('visible', true).order('sort_order'),
        supabase.from('catalog_collections').select('*')
          .eq('owner_id', cfg.owner_id).order('sort_order'),
      ]);

      setProducts(prodRes.data || []);
      setCollections(colRes.data || []);
      setLoadingCatalog(false);
    }
    load();
  }, [slug]);

  const filtered = activeCategory === 'todos'
    ? products
    : products.filter((p) => p.category === activeCategory);

  // Hero GSAP
  useEffect(() => {
    if (loadingCatalog) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.fromTo(titleRef.current,
        { opacity: 0, y: 70, skewY: 3 },
        { opacity: 1, y: 0, skewY: 0, duration: 1.1 }
      )
      .fromTo(subtitleRef.current,
        { opacity: 0, y: 28 },
        { opacity: 1, y: 0, duration: 0.8 }, '-=0.55'
      )
      .fromTo('.hero-action',
        { opacity: 0, y: 18, scale: 0.96 },
        { opacity: 1, y: 0, scale: 1, duration: 0.55, stagger: 0.1 }, '-=0.4'
      )
      .fromTo('.hero-tag',
        { opacity: 0, x: -16 },
        { opacity: 1, x: 0, duration: 0.45 }, '-=0.3'
      );

      // Parallax vetas — más pronunciado
      gsap.to('.bg-veta', {
        yPercent: -35, ease: 'none',
        scrollTrigger: {
          trigger: heroRef.current, start: 'top top', end: 'bottom top', scrub: 1.4,
        },
      });

      // Glow se expande y desvanece con scroll
      gsap.to('.hero-glow', {
        scale: 1.6, opacity: 0, ease: 'none',
        scrollTrigger: {
          trigger: heroRef.current, start: 'top top', end: '70% top', scrub: 1.2,
        },
      });

      // Subtítulo con parallax suave (sin desvanecerse — el nombre siempre visible)
      gsap.to(subtitleRef.current, {
        yPercent: -12, ease: 'none',
        scrollTrigger: {
          trigger: heroRef.current, start: 'top top', end: 'bottom top', scrub: 1.5,
        },
      });
    }, heroRef);
    return () => ctx.revert();
  }, [loadingCatalog]);

  // Stats reveal
  useEffect(() => {
    if (loadingCatalog) return;
    const ctx = gsap.context(() => {
      gsap.fromTo('.stat-item',
        { opacity: 0, y: 40 },
        { opacity: 1, y: 0, duration: 0.65, stagger: 0.1, ease: 'power3.out',
          scrollTrigger: { trigger: statsRef.current, start: 'top 82%' } }
      );
    }, statsRef);
    return () => ctx.revert();
  }, [loadingCatalog]);

  // Steps reveal
  useEffect(() => {
    if (loadingCatalog) return;
    const ctx = gsap.context(() => {
      gsap.fromTo('.step-item',
        { opacity: 0, x: -30 },
        { opacity: 1, x: 0, duration: 0.6, stagger: 0.15, ease: 'power3.out',
          scrollTrigger: { trigger: stepsRef.current, start: 'top 78%' } }
      );
      gsap.fromTo('.step-connector',
        { scaleX: 0 },
        { scaleX: 1, duration: 1.4, ease: 'power2.inOut',
          scrollTrigger: { trigger: stepsRef.current, start: 'top 72%' } }
      );
    }, stepsRef);
    return () => ctx.revert();
  }, [loadingCatalog]);

  // hScrollRef eliminado — drag scroll no necesita useEffect

  if (loadingCatalog) {
    return (
      <div style={{ background: W.bg }} className="min-h-screen flex flex-col items-center justify-center gap-5">
        <div className="flex gap-1.5">
          {[0,1,2].map(i => (
            <motion.div
              key={i}
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: W.oak }}
              animate={{ y: [0, -10, 0], opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.18 }}
            />
          ))}
        </div>
        <p className="text-sm tracking-widest uppercase" style={{ color: W.earth }}>Cargando catálogo…</p>
      </div>
    );
  }

  if (notFound) {
    return (
      <div style={{ background: W.bg, color: W.linen }} className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-6">
        <Hammer size={48} style={{ color: W.oak, opacity: 0.6 }} strokeWidth={1.3} />
        <h1 className="text-3xl font-black" style={{ color: W.linen }}>Taller no encontrado</h1>
        <p style={{ color: W.earth }}>
          El catálogo <strong style={{ color: W.oak }}>/{slug}</strong> no existe o no está disponible.
        </p>
      </div>
    );
  }

  // Aplica color de acento del taller — muta W.oak para que todos los subcomponentes lo usen
  W.oak = shopConfig?.accent_color || W_BASE.oak;

  return (
    <div style={{ background: W.bg, color: W.linen }} className="min-h-screen">

      <PublicNav onQuote={(p) => setQuoteFor(p)} shopConfig={shopConfig} />

      {/* ── HERO ─────────────────────────────────────── */}
      <section
        ref={heroRef}
        className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 overflow-hidden pt-20"
      >
        {/* Vetas de fondo */}
        <div className="bg-veta absolute inset-0 pointer-events-none" style={{ opacity: 0.06 }}>
          {[...Array(14)].map((_, i) => (
            <div key={i} className="absolute top-0 bottom-0"
              style={{
                left: `${(i / 14) * 100}%`,
                width: `${0.8 + (i % 3) * 0.6}px`,
                background: `linear-gradient(180deg, transparent, ${W.oak} 30%, ${W.mahogany} 70%, transparent)`,
                opacity: 0.25 + (i % 4) * 0.2,
                transform: `skewX(${-1.5 + (i % 5) * 0.8}deg)`,
              }}
            />
          ))}
        </div>

        {/* Glow */}
        <div
          className="hero-glow absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none rounded-full blur-3xl"
          style={{ width: 700, height: 350, background: `radial-gradient(ellipse, ${W.oak}14, transparent 70%)` }}
        />

        {/* Badge */}
        <div
          className="hero-tag mb-8 inline-flex items-center gap-2 rounded-full px-5 py-2 text-xs font-semibold uppercase tracking-widest"
          style={{ background: W.surface2, border: `1px solid ${W.border2}`, color: W.sand, opacity: 0 }}
        >
          <TreePine size={13} style={{ color: W.oak }} />
          Carpintería artesanal · A medida
        </div>

        <h1
          ref={titleRef}
          className="max-w-3xl font-black leading-[1.04] tracking-tight"
          style={{ fontSize: 'clamp(3rem, 6.5vw, 5.5rem)', opacity: 0 }}
        >
          <span style={{
            backgroundImage: `linear-gradient(135deg, ${W.oak} 0%, ${W.pine} 50%, ${W.mahogany} 100%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            {shopConfig?.shop_name || 'Tu taller'}
          </span>
        </h1>

        <p
          ref={subtitleRef}
          className="mt-6 max-w-lg text-base leading-relaxed"
          style={{ color: W.sand, opacity: 0 }}
        >
          {shopConfig?.tagline || 'Muebles a medida con materiales de primera.'}
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <MagBtn
            className="hero-action rounded-xl px-8 py-4 text-sm font-black flex items-center gap-2 transition-colors"
            style={{ background: W.oak, color: '#0f0d0b', opacity: 0 }}
            onClick={() => scrollTo('catalogo')}
          >
            Ver catálogo
            <ChevronRight size={16} />
          </MagBtn>
          <MagBtn
            className="hero-action rounded-xl px-8 py-4 text-sm font-semibold flex items-center gap-2 transition-colors"
            style={{ background: W.surface2, border: `1px solid ${W.border2}`, color: W.sand, opacity: 0 }}
            onClick={() => setQuoteFor(null)}
          >
            <Send size={14} />
            Consulta rápida
          </MagBtn>
        </div>

        <div className="hero-action mt-10 flex flex-wrap items-center justify-center gap-5 text-xs" style={{ color: W.earth, opacity: 0 }}>
          {(shopConfig?.guarantees?.length > 0
            ? shopConfig.guarantees
            : ['Sin adelanto', 'Instalación incluida', 'Garantía 12 meses', 'Corte CNC de precisión']
          ).map((t) => (
            <span key={t} className="flex items-center gap-1.5">
              <CheckCircle2 size={12} style={{ color: W.oak }} />
              {t}
            </span>
          ))}
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
        >
          <div className="w-px h-10 rounded"
            style={{ background: `linear-gradient(180deg, ${W.oak}60, transparent)` }} />
        </motion.div>
      </section>

      {/* ── STATS ────────────────────────────────────── */}
      <section
        ref={statsRef}
        className="py-16 px-6"
        style={{ borderTop: `1px solid ${W.border}`, borderBottom: `1px solid ${W.border}` }}
      >
        <div
          className="max-w-4xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-px"
          style={{ background: W.border }}
        >
          {(shopConfig?.stats?.length > 0 ? shopConfig.stats : [
            { value: '100+', label: 'Proyectos entregados' },
            { value: '98%',  label: 'Clientes satisfechos' },
            { value: '5',    label: 'Años de trayectoria'  },
            { value: '24h',  label: 'Tiempo de respuesta'  },
          ]).map(({ value, label }) => (
            <motion.div
              key={label}
              className="stat-item flex flex-col items-center text-center px-6 py-8 cursor-default"
              style={{ background: W.bg, opacity: 0 }}
              whileHover={{ scale: 1.04, transition: { duration: 0.22 } }}
            >
              <div className="text-3xl font-black mb-1" style={{ color: W.linen }}>
                <StatValue value={value} />
              </div>
              <div className="w-6 h-px mb-2 rounded" style={{ background: W.oak + '60' }} />
              <p className="text-[10px] uppercase tracking-widest" style={{ color: W.earth }}>{label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── CAROUSEL SHOWCASE (solo si hay 4+ productos) ── */}
      {products.length >= 4 && <Carousel items={products} onQuote={setQuoteFor} />}

      {/* ── CATÁLOGO GRID ────────────────────────────── */}
      <section id="catalogo" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            className="mb-12"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: W.earth }}>Catálogo</p>
            <h2 className="text-4xl font-black" style={{ color: W.linen }}>Trabajos del taller</h2>
            <div className="mt-2 h-[2px] w-16 rounded"
              style={{ background: `linear-gradient(90deg, ${W.oak}, transparent)` }} />
          </motion.div>

          {/* Filtros */}
          <motion.div
            className="flex flex-wrap gap-2 mb-10"
            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
            viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.2 }}
          >
            {categories.map((cat) => {
              const active = activeCategory === cat.id;
              return (
                <motion.button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                  className="px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
                  style={{
                    background: active ? W.oak : W.surface2,
                    color: active ? '#0f0d0b' : W.sand,
                    border: `1px solid ${active ? W.oak : W.border}`,
                  }}
                >
                  {cat.label}
                </motion.button>
              );
            })}
          </motion.div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeCategory}
              className="grid md:grid-cols-2 xl:grid-cols-3 gap-5"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              {filtered.map((p, i) => (
                <ProductCard key={p.id} p={p} index={i} onQuote={setQuoteFor} />
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      {/* ── COLECCIONES / TRABAJOS ───────────────────── */}
      {collections.length > 0 && (
        <section className="py-20 px-6" style={{ borderTop: `1px solid ${W.border}` }}>
          <div className="max-w-6xl mx-auto">
            <div className="mb-12">
              <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: W.earth }}>Portfolio</p>
              <h2 className="text-4xl font-black" style={{ color: W.linen }}>Trabajos realizados</h2>
              <div className="mt-2 h-[2px] w-16 rounded"
                style={{ background: `linear-gradient(90deg, ${W.oak}, transparent)` }} />
            </div>
            <div className="space-y-12">
              {collections.map((col) => (
                <div key={col.id}>
                  {col.title && (
                    <div className="mb-4">
                      <h3 className="text-xl font-bold" style={{ color: W.linen }}>{col.title}</h3>
                      {col.description && (
                        <p className="text-sm mt-1" style={{ color: W.earth }}>{col.description}</p>
                      )}
                    </div>
                  )}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {(col.photos || []).map((url, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.4, delay: i * 0.05 }}
                        whileHover={{ scale: 1.02 }}
                        className="aspect-square rounded-2xl overflow-hidden cursor-pointer relative group"
                        style={{ border: `1px solid ${W.border}` }}
                      >
                        <img src={url} alt={col.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"/>
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                          style={{ background: `linear-gradient(to top, ${W.oak}40, transparent)` }}/>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── PROCESO ──────────────────────────────────── */}
      <section
        id="proceso" ref={stepsRef}
        className="py-20 px-6"
        style={{ borderTop: `1px solid ${W.border}` }}
      >
        <div className="max-w-5xl mx-auto">
          <div className="mb-14">
            <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: W.earth }}>Metodología</p>
            <h2 className="text-4xl font-black" style={{ color: W.linen }}>Del diseño a la entrega</h2>
            <div className="mt-2 h-[2px] w-16 rounded"
              style={{ background: `linear-gradient(90deg, ${W.oak}, transparent)` }} />
          </div>

          <div className="relative">
            <div className="hidden lg:block absolute top-7 left-[calc(12.5%-1px)] right-[calc(12.5%-1px)] h-px"
              style={{ background: W.border }}>
              <div className="step-connector h-full origin-left"
                style={{ background: `linear-gradient(90deg, ${W.oak}, ${W.mahogany})`, transform: 'scaleX(0)' }} />
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-10">
              {steps.map((s, i) => (
                <div key={s.label} className="step-item flex flex-col items-center text-center" style={{ opacity: 0 }}>
                  <div
                    className="relative z-10 w-14 h-14 rounded-xl flex items-center justify-center mb-5"
                    style={{ background: W.surface2, border: `1px solid ${W.border2}` }}
                  >
                    <s.icon size={22} style={{ color: W.oak }} />
                    <span
                      className="absolute -top-2 -right-2 w-5 h-5 rounded-full text-[9px] font-black flex items-center justify-center"
                      style={{ background: W.oak, color: '#0f0d0b' }}
                    >
                      {i + 1}
                    </span>
                  </div>
                  <h3 className="font-bold text-sm mb-2" style={{ color: W.linen }}>{s.label}</h3>
                  <p className="text-xs leading-relaxed" style={{ color: W.earth }}>{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CONTACTO ─────────────────────────────────── */}
      <section
        id="contacto"
        className="py-20 px-6"
        style={{ borderTop: `1px solid ${W.border}` }}
      >
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: W.earth }}>Contacto</p>
            <h2 className="text-4xl font-black mb-4" style={{ color: W.linen }}>
              Hablemos de<br />tu proyecto
            </h2>
            <p className="text-sm leading-relaxed mb-8" style={{ color: W.sand }}>
              Visitá nuestro taller o mandanos un mensaje. Respondemos
              todas las consultas en el mismo día.
            </p>
            <div className="space-y-4">
              {shopConfig?.phone && (
                <div className="flex items-start gap-3 text-sm" style={{ color: W.sand }}>
                  <Phone size={16} className="mt-0.5 shrink-0" style={{ color: W.oak }} />
                  <span>{shopConfig.phone}</span>
                </div>
              )}
              {shopConfig?.address && (
                <div className="flex items-start gap-3 text-sm" style={{ color: W.sand }}>
                  <MapPin size={16} className="mt-0.5 shrink-0" style={{ color: W.oak }} />
                  <span>{shopConfig.address}</span>
                </div>
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
            className="relative rounded-2xl p-8 overflow-hidden"
            style={{ background: W.surface, border: `1px solid ${W.border2}` }}
          >
            <Grain id="contact" op={0.04} />
            <div className="absolute top-0 left-0 right-0 h-[2px]"
              style={{ background: `linear-gradient(90deg, transparent, ${W.oak}, transparent)` }} />
            <p className="text-sm font-bold mb-5" style={{ color: W.linen }}>Envianos un mensaje</p>
            <div className="space-y-3">
              {[
                { ph: 'Tu nombre', type: 'text' },
                { ph: 'WhatsApp / Email', type: 'text' },
              ].map(({ ph, type }) => (
                <input key={ph} type={type} placeholder={ph}
                  className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition"
                  style={{ background: W.surface2, border: `1px solid ${W.border2}`, color: W.linen }}
                  onFocus={e => e.target.style.borderColor = W.oak + '80'}
                  onBlur={e  => e.target.style.borderColor = W.border2}
                />
              ))}
              <textarea rows={4} placeholder="Contanos tu proyecto..."
                className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition resize-none"
                style={{ background: W.surface2, border: `1px solid ${W.border2}`, color: W.linen }}
                onFocus={e => e.target.style.borderColor = W.oak + '80'}
                onBlur={e  => e.target.style.borderColor = W.border2}
              />
              <MagBtn
                className="w-full rounded-xl py-3 text-sm font-black flex items-center justify-center gap-2 transition-colors"
                style={{ background: W.oak, color: '#0f0d0b' }}
                onClick={() => setQuoteFor(null)}
              >
                <Send size={14} />
                Enviar mensaje
              </MagBtn>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────── */}
      <footer
        className="py-8 px-6 text-center text-xs"
        style={{ borderTop: `1px solid ${W.border}`, color: W.earth }}
      >
        <div className="flex items-center justify-center gap-2 mb-2">
          <Hammer size={13} style={{ color: W.oak }} />
          <span className="font-bold" style={{ color: W.sand }}>WoodFlow</span>
        </div>
        <p>Carpintería artesanal a medida · Buenos Aires, Argentina</p>
      </footer>

      {/* ── MODAL COTIZACIÓN ─────────────────────────── */}
      <AnimatePresence>
        {quoteProduct !== undefined && (
          <QuoteModal
            product={quoteProduct}
            onClose={() => setQuoteFor(undefined)}
            ownerId={shopConfig?.owner_id}
          />
        )}
      </AnimatePresence>

    </div>
  );
}
