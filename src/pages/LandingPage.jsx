/**
 * LandingPage — Ruta pública /
 * Scroll storytelling: plancha de melamina → piezas optimizadas → módulos del sistema → pipeline ventas → CTA
 * GSAP ScrollTrigger + Framer Motion micro-interacciones
 */

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  Hammer, ChevronRight, ArrowUpRight, CheckCircle2,
  LayoutGrid, Scissors, FileText, Users, Package,
  TrendingUp, Zap, Shield, Star, Menu, X,
  Ruler, ClipboardList, Store, Sparkles,
} from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

// ─── PALETA ────────────────────────────────────────────────────────────────
const C = {
  bg:       '#0a0806',
  surface:  '#131009',
  surface2: '#1c1812',
  border:   '#272118',
  border2:  '#362e1e',
  oak:      '#c8923a',
  mahogany: '#8b5e3c',
  pine:     '#a67c52',
  linen:    '#f0e6d3',
  sand:     '#b5a48e',
  earth:    '#7a6e60',
  dark:     '#0f0d0b',
};

// ─── HELPERS ───────────────────────────────────────────────────────────────

function Noise({ op = 0.025 }) {
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: op }}>
      <filter id="noise-landing">
        <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#noise-landing)" />
    </svg>
  );
}

function MagBtn({ children, className, style, onClick }) {
  const ref = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 200, damping: 18 });
  const sy = useSpring(y, { stiffness: 200, damping: 18 });

  function onMove(e) {
    const r = ref.current.getBoundingClientRect();
    x.set((e.clientX - r.left - r.width  / 2) * 0.28);
    y.set((e.clientY - r.top  - r.height / 2) * 0.28);
  }
  function onLeave() { x.set(0); y.set(0); }

  return (
    <motion.button
      ref={ref}
      style={{ ...style, x: sx, y: sy }}
      className={className}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      onClick={onClick}
      whileTap={{ scale: 0.96 }}
    >
      {children}
    </motion.button>
  );
}

// ─── NAV ───────────────────────────────────────────────────────────────────

function Nav({ onLogin }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  function scrollTo(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setOpen(false);
  }

  return (
    <motion.header
      className="fixed top-0 left-0 right-0 z-50"
      style={{
        background: scrolled ? `${C.bg}f2` : 'transparent',
        borderBottom: scrolled ? `1px solid ${C.border}` : '1px solid transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        transition: 'background 0.4s, border-color 0.4s, backdrop-filter 0.4s',
      }}
      initial={{ y: -70, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-6">
        {/* Logo */}
        <img src="/LogoCarpento.png" alt="Carpento" className="h-14 w-auto" />

        {/* Links desktop */}
        <nav className="hidden md:flex items-center gap-8 text-sm" style={{ color: C.sand }}>
          {[['funciones', 'Funciones'], ['proceso', 'El proceso'], ['precios', 'Precios']].map(([id, label]) => (
            <button key={id} onClick={() => scrollTo(id)}
              className="hover:text-white transition-colors duration-200">{label}</button>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <button onClick={onLogin}
            className="px-4 py-2 text-sm font-medium transition-colors duration-200"
            style={{ color: C.sand }}>
            Ingresar
          </button>
          <MagBtn
            onClick={onLogin}
            className="px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors"
            style={{ background: C.oak, color: C.dark }}
          >
            Empezar gratis
            <ChevronRight size={14} />
          </MagBtn>
        </div>

        <button className="md:hidden p-2" onClick={() => setOpen(v => !v)} style={{ color: C.sand }}>
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden px-6 pb-5 space-y-3"
            style={{ background: C.bg, borderTop: `1px solid ${C.border}` }}
          >
            {[['funciones', 'Funciones'], ['proceso', 'El proceso'], ['precios', 'Precios']].map(([id, label]) => (
              <button key={id} onClick={() => scrollTo(id)}
                className="block w-full text-left py-2.5 text-sm border-b"
                style={{ color: C.sand, borderColor: C.border }}>
                {label}
              </button>
            ))}
            <button onClick={onLogin}
              className="w-full rounded-xl py-3 text-sm font-bold"
              style={{ background: C.oak, color: C.dark }}>
              Empezar gratis
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}

// ─── SECCIÓN 1: HERO — La plancha que se corta ────────────────────────────

function HeroSection({ onLogin }) {
  const sectionRef = useRef(null);
  const boardRef   = useRef(null);
  const titleRef   = useRef(null);
  const subRef     = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Entrada del título
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.fromTo('.hero-badge',
        { opacity: 0, y: -16, scale: 0.9 },
        { opacity: 1, y: 0, scale: 1, duration: 0.6 }
      )
      .fromTo(titleRef.current,
        { opacity: 0, y: 80, skewY: 4 },
        { opacity: 1, y: 0, skewY: 0, duration: 1.1 }, '-=0.3'
      )
      .fromTo(subRef.current,
        { opacity: 0, y: 24 },
        { opacity: 1, y: 0, duration: 0.75 }, '-=0.55'
      )
      .fromTo('.hero-cta',
        { opacity: 0, y: 18, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.55, stagger: 0.1 }, '-=0.45'
      )
      .fromTo('.hero-pills',
        { opacity: 0 },
        { opacity: 1, duration: 0.5 }, '-=0.2'
      );

      // Líneas de corte CNC animadas con scroll
      gsap.to('.cut-line', {
        scaleX: 1,
        ease: 'power2.inOut',
        stagger: 0.12,
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top top',
          end: '60% top',
          scrub: 1.2,
        },
      });

      // Plancha se "parte" — las piezas caen
      gsap.to('.board-piece', {
        y: (i) => (i % 2 === 0 ? 8 : -8),
        opacity: (i) => 0.6 + (i % 3) * 0.13,
        ease: 'power1.inOut',
        stagger: { each: 0.08, from: 'random' },
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top top',
          end: '80% top',
          scrub: 1.5,
        },
      });

      // Parallax vetas fondo
      gsap.to('.hero-veta', {
        yPercent: -25,
        ease: 'none',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top top',
          end: 'bottom top',
          scrub: 1.8,
        },
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  // Piezas de la plancha de melamina (simulan corte optimizado)
  const pieces = [
    { w: 42, h: 22, x: 0,  y: 0,  label: 'Lateral A' },
    { w: 42, h: 22, x: 44, y: 0,  label: 'Lateral B' },
    { w: 88, h: 8,  x: 0,  y: 24, label: 'Fondo'     },
    { w: 28, h: 22, x: 0,  y: 34, label: 'Estante 1' },
    { w: 28, h: 22, x: 30, y: 34, label: 'Estante 2' },
    { w: 28, h: 22, x: 60, y: 34, label: 'Estante 3' },
    { w: 88, h: 8,  x: 0,  y: 58, label: 'Tapa'      },
    { w: 42, h: 18, x: 0,  y: 68, label: 'Puerta 1'  },
    { w: 44, h: 18, x: 44, y: 68, label: 'Puerta 2'  },
  ];

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen flex flex-col items-center justify-center text-center overflow-hidden pt-20 pb-32 px-6"
    >
      <Noise op={0.02} />

      {/* Vetas fondo */}
      <div className="hero-veta absolute inset-0 pointer-events-none" style={{ opacity: 0.055 }}>
        {[...Array(18)].map((_, i) => (
          <div key={i} className="absolute top-[-10%] bottom-[-10%]"
            style={{
              left: `${(i / 18) * 100}%`,
              width: `${0.6 + (i % 4) * 0.5}px`,
              background: `linear-gradient(180deg, transparent, ${C.oak} 30%, ${C.mahogany} 70%, transparent)`,
              opacity: 0.2 + (i % 5) * 0.16,
              transform: `skewX(${-2 + (i % 6) * 0.9}deg)`,
            }}
          />
        ))}
      </div>

      {/* Glow central */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        style={{
          width: 900, height: 400,
          background: `radial-gradient(ellipse, ${C.oak}0f 0%, transparent 70%)`,
          borderRadius: '50%',
        }}
      />

      {/* Badge */}
      <div
        className="hero-badge mb-8 inline-flex items-center gap-2 rounded-full px-5 py-2 text-[11px] font-bold uppercase tracking-widest"
        style={{ background: C.surface2, border: `1px solid ${C.border2}`, color: C.sand, opacity: 0 }}
      >
        <Sparkles size={11} style={{ color: C.oak }} />
        El SaaS para talleres de muebles
      </div>

      {/* Título */}
      <h1
        ref={titleRef}
        className="max-w-4xl font-black leading-[1.02] tracking-tight"
        style={{ fontSize: 'clamp(2.8rem, 6vw, 5.2rem)', opacity: 0 }}
      >
        <span style={{
          backgroundImage: `linear-gradient(135deg, ${C.linen} 0%, ${C.oak} 45%, ${C.pine} 80%)`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          Del taller
        </span>
        <br />
        <span style={{ color: C.linen }}>al cierre de venta.</span>
      </h1>

      <p
        ref={subRef}
        className="mt-6 max-w-xl text-base leading-relaxed"
        style={{ color: C.sand, opacity: 0 }}
      >
        Cotizaciones, optimizador de cortes, inventario y sala de ventas online —
        todo en un solo sistema pensado para el mueblista.
      </p>

      <div className="hero-cta mt-10 flex flex-wrap items-center justify-center gap-4" style={{ opacity: 0 }}>
        <MagBtn
          onClick={onLogin}
          className="rounded-xl px-8 py-4 text-sm font-black flex items-center gap-2"
          style={{ background: C.oak, color: C.dark, boxShadow: `0 8px 32px ${C.oak}35` }}
        >
          Empezar gratis
          <ChevronRight size={16} />
        </MagBtn>
        <MagBtn
          onClick={() => document.getElementById('proceso')?.scrollIntoView({ behavior: 'smooth' })}
          className="rounded-xl px-8 py-4 text-sm font-semibold flex items-center gap-2 transition-colors"
          style={{ background: C.surface2, border: `1px solid ${C.border2}`, color: C.sand }}
        >
          Ver cómo funciona
          <ArrowUpRight size={14} />
        </MagBtn>
      </div>

      {/* Pills de garantías */}
      <div className="hero-pills mt-10 flex flex-wrap justify-center gap-3 text-xs" style={{ color: C.earth, opacity: 0 }}>
        {['Gratis para empezar', 'Sin tarjeta de crédito', 'Configuración en 5 minutos', 'Soporte en español'].map(t => (
          <span key={t} className="flex items-center gap-1.5">
            <CheckCircle2 size={11} style={{ color: C.oak }} />
            {t}
          </span>
        ))}
      </div>

      {/* ── PLANCHA DE MELAMINA VISUAL ── */}
      <div ref={boardRef} className="mt-20 relative w-full max-w-2xl mx-auto select-none">
        {/* Label */}
        <div className="mb-4 flex items-center justify-between px-1">
          <span className="text-[10px] uppercase tracking-widest" style={{ color: C.earth }}>
            Plancha 2440 × 1220 mm · Melamina Roble
          </span>
          <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color: C.oak }}>
            Optimizado 94.2%
          </span>
        </div>

        {/* SVG plancha con piezas */}
        <div
          className="relative rounded-2xl overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${C.surface} 0%, ${C.surface2} 100%)`,
            border: `1px solid ${C.border2}`,
            padding: '2px',
          }}
        >
          {/* Ruido de textura madera */}
          <div className="absolute inset-0 pointer-events-none" style={{ opacity: 0.04 }}>
            <svg width="100%" height="100%"><filter id="wood-noise"><feTurbulence type="turbulence" baseFrequency="0.02 0.8" numOctaves="4" seed="3" /><feColorMatrix type="saturate" values="0.3" /></filter><rect width="100%" height="100%" filter="url(#wood-noise)" /></svg>
          </div>

          <svg viewBox="0 0 90 90" className="w-full" style={{ maxHeight: 360 }}>
            {/* Borde de la plancha */}
            <rect x="0.5" y="0.5" width="89" height="89" rx="1.5"
              fill={C.surface} stroke={C.border2} strokeWidth="0.5" />

            {/* Líneas de veta */}
            {[...Array(12)].map((_, i) => (
              <line key={i}
                x1={0} y1={7 + i * 7} x2={90} y2={7 + i * 7}
                stroke={C.oak} strokeWidth="0.12" strokeOpacity="0.18"
                strokeDasharray={`${3 + i * 0.5} ${2 + i * 0.3}`}
              />
            ))}

            {/* Líneas de corte CNC */}
            {[22, 44, 66].map((y, i) => (
              <line key={`h${i}`}
                className="cut-line"
                x1="0" y1={y} x2="90" y2={y}
                stroke={C.oak} strokeWidth="0.35" strokeOpacity="0.7"
                strokeDasharray="1.5 1"
                style={{ transformOrigin: 'left center', transform: 'scaleX(0)' }}
              />
            ))}
            {[44].map((x, i) => (
              <line key={`v${i}`}
                className="cut-line"
                x1={x} y1="0" x2={x} y2="90"
                stroke={C.oak} strokeWidth="0.35" strokeOpacity="0.7"
                strokeDasharray="1.5 1"
                style={{ transformOrigin: 'center top', transform: 'scaleX(0)' }}
              />
            ))}

            {/* Piezas */}
            {pieces.map((p, i) => (
              <g key={i} className="board-piece">
                <rect
                  x={p.x * 90 / 90 + 1} y={p.y * 90 / 90 + 1}
                  width={p.w * 90 / 90 - 1.5} height={p.h * 90 / 90 - 1.5}
                  rx="0.8"
                  fill={i % 3 === 0 ? `${C.oak}18` : i % 3 === 1 ? `${C.mahogany}14` : `${C.pine}12`}
                  stroke={i % 2 === 0 ? C.oak : C.mahogany}
                  strokeWidth="0.3"
                  strokeOpacity="0.5"
                />
                {p.w > 25 && (
                  <text
                    x={p.x * 90 / 90 + p.w / 2}
                    y={p.y * 90 / 90 + p.h / 2 + 1}
                    textAnchor="middle"
                    fill={C.sand}
                    fontSize="2.8"
                    fontFamily="monospace"
                    opacity="0.7"
                  >
                    {p.label}
                  </text>
                )}
              </g>
            ))}

            {/* Indicador de sierra CNC */}
            <circle className="cut-line" cx="0" cy="22" r="1.5"
              fill={C.oak} opacity="0.9"
              style={{ transformOrigin: 'left center', transform: 'scaleX(0)' }}
            />
          </svg>

          {/* Badge "corte optimizado" */}
          <div
            className="absolute bottom-3 right-3 rounded-lg px-3 py-1.5 text-[10px] font-bold flex items-center gap-1.5"
            style={{ background: `${C.oak}20`, border: `1px solid ${C.oak}40`, color: C.oak }}
          >
            <Scissors size={10} />
            Corte CNC optimizado
          </div>
        </div>

        <p className="mt-3 text-center text-[11px]" style={{ color: C.earth }}>
          El optimizador calcula el mejor aprovechamiento de cada plancha
        </p>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        animate={{ y: [0, 9, 0] }}
        transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
      >
        <div className="w-px h-12 rounded"
          style={{ background: `linear-gradient(180deg, ${C.oak}70, transparent)` }} />
      </motion.div>
    </section>
  );
}

// ─── SECCIÓN 2: PIEZAS → MÓDULOS DEL SISTEMA ──────────────────────────────

function ModulesSection() {
  const sectionRef = useRef(null);

  const modules = [
    { icon: FileText,    label: 'Cotizaciones',        desc: 'Generá presupuestos profesionales en PDF con un clic. El cliente recibe todo en segundos.', color: '#c8923a' },
    { icon: Scissors,    label: 'Optimizador de corte', desc: 'Calculá el mejor aprovechamiento de cada plancha. Menos desperdicio, más ganancia.', color: '#a67c52' },
    { icon: Package,     label: 'Inventario',           desc: 'El stock se descuenta automáticamente al producir. Nunca más te quedás sin material.', color: '#8b5e3c' },
    { icon: Store,       label: 'Sala de ventas',        desc: 'Tu catálogo online personalizado. Los clientes ven tus trabajos y piden cotización.', color: '#c8923a' },
    { icon: Users,       label: 'Leads y clientes',     desc: 'Cada consulta llega a tu panel. Seguí a cada prospecto hasta cerrar la venta.', color: '#a67c52' },
    { icon: ClipboardList, label: 'Órdenes de producción', desc: 'Del presupuesto aceptado al taller. Con estado, fechas y seguimiento en tiempo real.', color: '#8b5e3c' },
  ];

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Label de sección
      gsap.fromTo('.modules-label',
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out',
          scrollTrigger: { trigger: sectionRef.current, start: 'top 80%' } }
      );

      // Tarjetas de módulos: entran como piezas de madera desde posiciones aleatorias
      gsap.fromTo('.module-card',
        {
          opacity: 0,
          y: (i) => 40 + (i % 3) * 20,
          x: (i) => (i % 2 === 0 ? -20 : 20),
          rotation: (i) => (i % 2 === 0 ? -3 : 3),
        },
        {
          opacity: 1, y: 0, x: 0, rotation: 0,
          duration: 0.7,
          stagger: { each: 0.1, from: 'start' },
          ease: 'power3.out',
          scrollTrigger: {
            trigger: '.modules-grid',
            start: 'top 78%',
          },
        }
      );

      // Línea conectora horizontal animada
      gsap.fromTo('.modules-line',
        { scaleX: 0 },
        { scaleX: 1, duration: 1.2, ease: 'power2.inOut',
          scrollTrigger: { trigger: sectionRef.current, start: 'top 70%' } }
      );
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="funciones"
      className="py-28 px-6 relative overflow-hidden"
      style={{ borderTop: `1px solid ${C.border}` }}
    >
      <Noise op={0.015} />

      {/* Glow lateral */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 pointer-events-none"
        style={{ width: 400, height: 600,
          background: `radial-gradient(ellipse at left, ${C.oak}07, transparent 70%)` }} />

      <div className="max-w-6xl mx-auto">
        <div className="modules-label mb-16 text-center" style={{ opacity: 0 }}>
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-5 text-[11px] font-bold uppercase tracking-widest"
            style={{ background: C.surface2, border: `1px solid ${C.border2}`, color: C.sand }}>
            <LayoutGrid size={11} style={{ color: C.oak }} />
            6 módulos integrados
          </div>
          <h2
            className="font-black leading-tight tracking-tight"
            style={{ fontSize: 'clamp(2rem, 4vw, 3.2rem)', color: C.linen }}
          >
            Las piezas del sistema
          </h2>
          <p className="mt-4 max-w-lg mx-auto text-sm leading-relaxed" style={{ color: C.sand }}>
            Como un mueble bien diseñado, cada módulo encaja con los demás.
            Trabajás en uno y los otros se actualizan solos.
          </p>
          {/* Línea decorativa */}
          <div className="mt-6 h-px max-w-xs mx-auto origin-left"
            style={{ background: `linear-gradient(90deg, transparent, ${C.oak}, transparent)` }} />
        </div>

        <div className="modules-grid grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map((m, i) => (
            <motion.div
              key={m.label}
              className="module-card relative rounded-2xl p-6 overflow-hidden group cursor-default"
              style={{
                background: C.surface,
                border: `1px solid ${C.border}`,
                opacity: 0,
              }}
              whileHover={{
                borderColor: m.color + '60',
                y: -4,
                transition: { duration: 0.25 },
              }}
            >
              <Noise op={0.025} />
              {/* Veta lateral */}
              <motion.div
                className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-2xl"
                style={{ background: `linear-gradient(180deg, ${m.color}, ${m.color}40)`, opacity: 0.35 }}
                whileHover={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              />
              {/* Número */}
              <span
                className="absolute top-4 right-5 text-[10px] font-black tabular-nums"
                style={{ color: C.border2 }}
              >
                0{i + 1}
              </span>
              {/* Icono */}
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                style={{ background: `${m.color}18`, border: `1px solid ${m.color}30` }}
              >
                <m.icon size={18} style={{ color: m.color }} />
              </div>
              <h3 className="font-bold text-sm mb-2" style={{ color: C.linen }}>{m.label}</h3>
              <p className="text-xs leading-relaxed" style={{ color: C.earth }}>{m.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── SECCIÓN 3: EL PROCESO (scroll storytelling) ──────────────────────────

function ProcesoSection() {
  const sectionRef = useRef(null);

  const steps = [
    {
      icon: Store,
      step: '01',
      title: 'El cliente ve tu catálogo',
      desc: 'Tu sala de ventas online, personalizada con tus trabajos, precios y fotos. Disponible 24/7 desde cualquier dispositivo.',
      detail: 'Catálogo público en /catalogo/tu-taller',
      color: C.oak,
    },
    {
      icon: FileText,
      step: '02',
      title: 'Pide cotización, llega tu lead',
      desc: 'El formulario del catálogo genera un lead en tu panel. Con el nombre, contacto y el producto que le interesa.',
      detail: 'Notificación instantánea en el panel',
      color: C.pine,
    },
    {
      icon: Scissors,
      step: '03',
      title: 'Generás presupuesto y optimizás cortes',
      desc: 'Desde el lead creás la cotización. El optimizador calcula cuántas planchas necesitás y el mejor layout de corte.',
      detail: 'PDF profesional generado en 1 clic',
      color: C.mahogany,
    },
    {
      icon: ClipboardList,
      step: '04',
      title: 'El taller produce, vos controlás',
      desc: 'La cotización aceptada se convierte en orden de producción. El inventario se descuenta al avanzar cada etapa.',
      detail: 'Stock actualizado en tiempo real',
      color: C.oak,
    },
  ];

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Header de sección
      gsap.fromTo('.proceso-header',
        { opacity: 0, y: 40 },
        { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out',
          scrollTrigger: { trigger: sectionRef.current, start: 'top 78%' } }
      );

      // Línea de progreso vertical
      gsap.fromTo('.proceso-progress-line',
        { scaleY: 0 },
        { scaleY: 1, duration: 2, ease: 'power2.inOut',
          scrollTrigger: {
            trigger: '.proceso-steps',
            start: 'top 70%',
            end: 'bottom 60%',
            scrub: 1,
          }
        }
      );

      // Tarjetas — entran como bloques de madera deslizando
      gsap.fromTo('.proceso-card',
        { opacity: 0, x: (i) => i % 2 === 0 ? -60 : 60 },
        {
          opacity: 1, x: 0,
          duration: 0.75,
          stagger: 0.2,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: '.proceso-steps',
            start: 'top 75%',
          },
        }
      );
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="proceso"
      className="py-28 px-6 relative overflow-hidden"
      style={{ borderTop: `1px solid ${C.border}` }}
    >
      <Noise op={0.015} />
      <div className="absolute right-0 top-1/3 pointer-events-none"
        style={{ width: 400, height: 500,
          background: `radial-gradient(ellipse at right, ${C.mahogany}06, transparent 70%)` }} />

      <div className="max-w-5xl mx-auto">
        <div className="proceso-header mb-20 text-center" style={{ opacity: 0 }}>
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-5 text-[11px] font-bold uppercase tracking-widest"
            style={{ background: C.surface2, border: `1px solid ${C.border2}`, color: C.sand }}>
            <Zap size={11} style={{ color: C.oak }} />
            Del taller al cierre de venta
          </div>
          <h2
            className="font-black leading-tight"
            style={{ fontSize: 'clamp(2rem, 4vw, 3.2rem)', color: C.linen }}
          >
            El flujo completo
          </h2>
          <p className="mt-4 max-w-md mx-auto text-sm leading-relaxed" style={{ color: C.sand }}>
            Cuatro pasos que se conectan solos. Sin planillas, sin saltar entre apps.
          </p>
        </div>

        <div className="proceso-steps relative">
          {/* Línea vertical de progreso */}
          <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2"
            style={{ background: C.border }}>
            <div
              className="proceso-progress-line w-full origin-top"
              style={{
                background: `linear-gradient(180deg, ${C.oak}, ${C.mahogany})`,
                height: '100%',
                transformOrigin: 'top center',
                transform: 'scaleY(0)',
              }}
            />
          </div>

          <div className="space-y-12 lg:space-y-16">
            {steps.map((s, i) => (
              <div
                key={s.step}
                className={`proceso-card relative flex flex-col lg:flex-row gap-8 items-center ${i % 2 === 1 ? 'lg:flex-row-reverse' : ''}`}
                style={{ opacity: 0 }}
              >
                {/* Contenido */}
                <div className="flex-1">
                  <div
                    className="relative rounded-2xl p-7 overflow-hidden group"
                    style={{
                      background: C.surface,
                      border: `1px solid ${C.border}`,
                      boxShadow: `0 4px 32px ${s.color}08`,
                    }}
                  >
                    <Noise op={0.02} />
                    <div className="absolute top-0 left-0 right-0 h-[2px]"
                      style={{ background: `linear-gradient(90deg, transparent, ${s.color}80, transparent)` }} />

                    <div className="flex items-start gap-4 mb-4">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: `${s.color}18`, border: `1px solid ${s.color}35` }}
                      >
                        <s.icon size={19} style={{ color: s.color }} />
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: s.color }}>
                          Paso {s.step}
                        </span>
                        <h3 className="text-base font-bold leading-snug mt-0.5" style={{ color: C.linen }}>
                          {s.title}
                        </h3>
                      </div>
                    </div>
                    <p className="text-sm leading-relaxed mb-4" style={{ color: C.sand }}>{s.desc}</p>
                    <div
                      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium"
                      style={{ background: `${s.color}12`, color: s.color }}
                    >
                      <CheckCircle2 size={11} />
                      {s.detail}
                    </div>
                  </div>
                </div>

                {/* Nodo central en desktop */}
                <div className="hidden lg:flex items-center justify-center w-14 shrink-0 z-10">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center font-black text-sm"
                    style={{
                      background: s.color,
                      color: C.dark,
                      boxShadow: `0 0 20px ${s.color}50`,
                    }}
                  >
                    {i + 1}
                  </div>
                </div>

                {/* Espaciador lado opuesto */}
                <div className="flex-1 hidden lg:block" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── SECCIÓN 4: PIPELINE SALA DE VENTAS (tarjetas como bloques de madera) ──

function PipelineSection() {
  const sectionRef = useRef(null);

  const columns = [
    {
      label: 'Nuevos leads',
      color: C.sand,
      cards: [
        { name: 'Placard dormitorio', client: 'Martín G.', time: 'hace 2h', tag: 'Nuevo' },
        { name: 'Cocina integral',   client: 'Laura B.',  time: 'hace 5h', tag: 'Nuevo' },
      ],
    },
    {
      label: 'En cotización',
      color: C.pine,
      cards: [
        { name: 'Living modular',     client: 'Roberto K.', time: 'ayer',   tag: 'PDF listo' },
        { name: 'Escritorio a medida', client: 'Ana M.',    time: '2 días', tag: 'En revisión' },
      ],
    },
    {
      label: 'En producción',
      color: C.oak,
      cards: [
        { name: 'Vestidor roble',   client: 'Sofía R.', time: '5 días', tag: 'En corte' },
        { name: 'Mesa de comedor',  client: 'Diego F.', time: '8 días', tag: 'Ensamble' },
      ],
    },
    {
      label: 'Entregados',
      color: '#4ade80',
      cards: [
        { name: 'Cocina laqueada',   client: 'Carlos T.', time: 'esta semana', tag: 'Cobrado' },
        { name: 'Placard infantil',  client: 'Marta L.',  time: 'esta semana', tag: 'Cobrado' },
      ],
    },
  ];

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.pipeline-header',
        { opacity: 0, y: 40 },
        { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out',
          scrollTrigger: { trigger: sectionRef.current, start: 'top 80%' } }
      );

      // Columnas entran con stagger
      gsap.fromTo('.pipeline-col',
        { opacity: 0, y: 60, scale: 0.95 },
        {
          opacity: 1, y: 0, scale: 1,
          duration: 0.65,
          stagger: 0.15,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: '.pipeline-board',
            start: 'top 75%',
          },
        }
      );

      // Cards dentro de cada columna: entran como bloques de madera cayendo
      gsap.fromTo('.pipeline-card',
        { opacity: 0, y: -30, scale: 0.9 },
        {
          opacity: 1, y: 0, scale: 1,
          duration: 0.5,
          stagger: { each: 0.08, from: 'start' },
          ease: 'back.out(1.2)',
          scrollTrigger: {
            trigger: '.pipeline-board',
            start: 'top 70%',
          },
        }
      );
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="py-28 px-6 relative overflow-hidden"
      style={{ borderTop: `1px solid ${C.border}` }}
    >
      <Noise op={0.015} />
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at 50% 0%, ${C.oak}06, transparent 60%)` }} />

      <div className="max-w-6xl mx-auto">
        <div className="pipeline-header mb-14 text-center" style={{ opacity: 0 }}>
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-5 text-[11px] font-bold uppercase tracking-widest"
            style={{ background: C.surface2, border: `1px solid ${C.border2}`, color: C.sand }}>
            <TrendingUp size={11} style={{ color: C.oak }} />
            Pipeline de ventas
          </div>
          <h2
            className="font-black leading-tight"
            style={{ fontSize: 'clamp(2rem, 4vw, 3.2rem)', color: C.linen }}
          >
            Todas tus ventas,<br />de un vistazo
          </h2>
          <p className="mt-4 max-w-md mx-auto text-sm leading-relaxed" style={{ color: C.sand }}>
            Desde el primer lead hasta la entrega. Cada trabajo tiene su lugar en el tablero.
          </p>
        </div>

        {/* Board Kanban */}
        <div className="pipeline-board grid grid-cols-2 lg:grid-cols-4 gap-4">
          {columns.map((col, ci) => (
            <div
              key={col.label}
              className="pipeline-col rounded-2xl p-4 flex flex-col gap-3"
              style={{
                background: C.surface,
                border: `1px solid ${C.border}`,
                opacity: 0,
                minHeight: 260,
              }}
            >
              {/* Header columna */}
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: col.color }}>
                  {col.label}
                </span>
                <span
                  className="w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center"
                  style={{ background: `${col.color}20`, color: col.color }}
                >
                  {col.cards.length}
                </span>
              </div>

              {/* Línea de color */}
              <div className="h-[2px] rounded w-full mb-2"
                style={{ background: `linear-gradient(90deg, ${col.color}80, transparent)` }} />

              {/* Tarjetas */}
              {col.cards.map((card, ki) => (
                <div
                  key={ki}
                  className="pipeline-card rounded-xl p-3 relative overflow-hidden"
                  style={{
                    background: C.surface2,
                    border: `1px solid ${C.border2}`,
                    opacity: 0,
                  }}
                >
                  {/* Veta lateral */}
                  <div className="absolute left-0 top-0 bottom-0 w-[2px]"
                    style={{ background: col.color, opacity: 0.6 }} />
                  <p className="text-xs font-bold pl-2" style={{ color: C.linen }}>{card.name}</p>
                  <p className="text-[10px] mt-1 pl-2" style={{ color: C.earth }}>{card.client}</p>
                  <div className="flex items-center justify-between mt-2 pl-2">
                    <span
                      className="text-[9px] px-2 py-0.5 rounded-full font-bold"
                      style={{ background: `${col.color}20`, color: col.color }}
                    >
                      {card.tag}
                    </span>
                    <span className="text-[9px]" style={{ color: C.earth }}>{card.time}</span>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── SECCIÓN 5: PRECIOS ────────────────────────────────────────────────────

function PreciosSection({ onLogin }) {
  const sectionRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.precio-card',
        { opacity: 0, y: 50, scale: 0.96 },
        {
          opacity: 1, y: 0, scale: 1,
          duration: 0.7,
          stagger: 0.15,
          ease: 'power3.out',
          scrollTrigger: { trigger: sectionRef.current, start: 'top 75%' },
        }
      );
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  const plans = [
    {
      name: 'Gratis',
      price: '$0',
      period: 'para siempre',
      desc: 'Para arrancar y probar el sistema sin riesgo.',
      features: ['1 taller', 'Catálogo público', 'Hasta 10 productos', 'Cotizaciones básicas', 'Leads ilimitados'],
      cta: 'Empezar gratis',
      highlight: false,
    },
    {
      name: 'Pro',
      price: '$12.000',
      period: 'por mes',
      desc: 'Para el mueblista que ya tiene volumen y quiere crecer.',
      features: ['Todo lo de Gratis', 'Productos ilimitados', 'Optimizador de cortes', 'Órdenes de producción', 'Control de inventario', 'PDF profesional', 'Soporte prioritario'],
      cta: 'Empezar Pro',
      highlight: true,
    },
  ];

  return (
    <section
      ref={sectionRef}
      id="precios"
      className="py-28 px-6 relative overflow-hidden"
      style={{ borderTop: `1px solid ${C.border}` }}
    >
      <Noise op={0.015} />
      <div className="max-w-3xl mx-auto text-center mb-16">
        <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-5 text-[11px] font-bold uppercase tracking-widest"
          style={{ background: C.surface2, border: `1px solid ${C.border2}`, color: C.sand }}>
          <Star size={11} style={{ color: C.oak }} />
          Precios simples
        </div>
        <h2
          className="font-black leading-tight"
          style={{ fontSize: 'clamp(2rem, 4vw, 3.2rem)', color: C.linen }}
        >
          Sin letra chica
        </h2>
        <p className="mt-4 text-sm leading-relaxed" style={{ color: C.sand }}>
          Empezá gratis, pagá cuando realmente lo necesites.
        </p>
      </div>

      <div className="max-w-3xl mx-auto grid md:grid-cols-2 gap-5">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className="precio-card relative rounded-2xl p-8 flex flex-col overflow-hidden"
            style={{
              background: plan.highlight ? `linear-gradient(135deg, ${C.surface2}, ${C.surface})` : C.surface,
              border: `1px solid ${plan.highlight ? C.oak + '50' : C.border}`,
              boxShadow: plan.highlight ? `0 8px 48px ${C.oak}18` : 'none',
              opacity: 0,
            }}
          >
            <Noise op={plan.highlight ? 0.03 : 0.02} />
            {plan.highlight && (
              <div className="absolute top-0 left-0 right-0 h-[2px]"
                style={{ background: `linear-gradient(90deg, transparent, ${C.oak}, transparent)` }} />
            )}
            {plan.highlight && (
              <div
                className="absolute top-4 right-4 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider"
                style={{ background: C.oak, color: C.dark }}
              >
                Popular
              </div>
            )}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: plan.highlight ? C.oak : C.earth }}>
                {plan.name}
              </p>
              <p className="font-black" style={{ fontSize: 'clamp(2rem, 4vw, 2.8rem)', color: C.linen }}>
                {plan.price}
                <span className="text-sm font-medium ml-1" style={{ color: C.earth }}>/{plan.period}</span>
              </p>
              <p className="mt-2 text-sm" style={{ color: C.sand }}>{plan.desc}</p>
            </div>
            <ul className="my-8 space-y-2.5 flex-1">
              {plan.features.map(f => (
                <li key={f} className="flex items-center gap-2.5 text-sm" style={{ color: C.sand }}>
                  <CheckCircle2 size={14} style={{ color: plan.highlight ? C.oak : C.pine, shrink: 0 }} />
                  {f}
                </li>
              ))}
            </ul>
            <MagBtn
              onClick={onLogin}
              className="w-full rounded-xl py-3.5 text-sm font-black flex items-center justify-center gap-2 transition-colors"
              style={{
                background: plan.highlight ? C.oak : C.surface2,
                color: plan.highlight ? C.dark : C.sand,
                border: plan.highlight ? 'none' : `1px solid ${C.border2}`,
              }}
            >
              {plan.cta}
              <ChevronRight size={14} />
            </MagBtn>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── SECCIÓN 6: CTA FINAL ─────────────────────────────────────────────────

function CtaSection({ onLogin }) {
  const sectionRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.cta-content',
        { opacity: 0, y: 50 },
        { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out',
          scrollTrigger: { trigger: sectionRef.current, start: 'top 80%' } }
      );
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="py-32 px-6 relative overflow-hidden"
      style={{ borderTop: `1px solid ${C.border}` }}
    >
      <Noise op={0.02} />
      {/* Glow fondo */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at 50% 50%, ${C.oak}0a, transparent 70%)` }} />

      {/* Vetas decorativas */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ opacity: 0.04 }}>
        {[...Array(10)].map((_, i) => (
          <div key={i} className="absolute top-0 bottom-0"
            style={{
              left: `${10 + i * 9}%`,
              width: `${0.8 + (i % 3) * 0.6}px`,
              background: `linear-gradient(180deg, transparent, ${C.oak}, transparent)`,
              opacity: 0.3 + (i % 4) * 0.15,
            }}
          />
        ))}
      </div>

      <div className="cta-content max-w-2xl mx-auto text-center relative" style={{ opacity: 0 }}>
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-8"
          style={{
            background: `linear-gradient(135deg, ${C.oak}, ${C.mahogany})`,
            boxShadow: `0 8px 40px ${C.oak}40`,
          }}
        >
          <Hammer size={28} className="text-black" />
        </div>

        <h2
          className="font-black leading-tight tracking-tight"
          style={{ fontSize: 'clamp(2.2rem, 5vw, 4rem)', color: C.linen }}
        >
          Del taller al cierre de venta,<br />
          <span style={{
            backgroundImage: `linear-gradient(135deg, ${C.oak}, ${C.pine})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            todo en un solo sistema.
          </span>
        </h2>

        <p className="mt-6 text-base leading-relaxed" style={{ color: C.sand }}>
          Más de 200 talleres ya gestionan su negocio con Carpento.
          Empezá hoy, sin tarjeta de crédito.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <MagBtn
            onClick={onLogin}
            className="rounded-xl px-10 py-4 text-sm font-black flex items-center gap-2"
            style={{
              background: C.oak,
              color: C.dark,
              boxShadow: `0 10px 40px ${C.oak}45`,
            }}
          >
            Crear cuenta gratis
            <ChevronRight size={16} />
          </MagBtn>
          <MagBtn
            onClick={onLogin}
            className="rounded-xl px-10 py-4 text-sm font-semibold flex items-center gap-2 transition-colors"
            style={{ background: C.surface2, border: `1px solid ${C.border2}`, color: C.sand }}
          >
            Ver demo
            <ArrowUpRight size={14} />
          </MagBtn>
        </div>

        <div className="mt-10 flex flex-wrap justify-center gap-6 text-xs" style={{ color: C.earth }}>
          {[
            [Shield, 'Datos seguros'],
            [Zap, 'Configuración en 5 min'],
            [Star, 'Soporte en español'],
          ].map(([Icon, label]) => (
            <span key={label} className="flex items-center gap-1.5">
              <Icon size={12} style={{ color: C.oak }} />
              {label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── FOOTER ────────────────────────────────────────────────────────────────

function Footer({ onLogin }) {
  return (
    <footer
      className="py-10 px-6"
      style={{ borderTop: `1px solid ${C.border}` }}
    >
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <img src="/LogoCarpento.png" alt="Carpento" className="h-12 w-auto" />
        <p className="text-xs text-center" style={{ color: C.earth }}>
          © 2025 Carpento · El SaaS para talleres de muebles · Argentina
        </p>
        <button
          onClick={onLogin}
          className="text-xs font-medium transition-colors"
          style={{ color: C.sand }}
        >
          Ingresar al panel →
        </button>
      </div>
    </footer>
  );
}

// ─── PAGE PRINCIPAL ────────────────────────────────────────────────────────

export default function LandingPage() {
  const navigate = useNavigate();

  function goLogin() {
    navigate('/login');
  }

  return (
    <div style={{ background: C.bg, color: C.linen }} className="min-h-screen">
      <Nav onLogin={goLogin} />
      <HeroSection onLogin={goLogin} />
      <ModulesSection />
      <ProcesoSection />
      <PipelineSection />
      <PreciosSection onLogin={goLogin} />
      <CtaSection onLogin={goLogin} />
      <Footer onLogin={goLogin} />
    </div>
  );
}
