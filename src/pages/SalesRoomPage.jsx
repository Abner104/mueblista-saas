/**
 * SalesRoomPage — Editor visual del catálogo público
 * Secciones: Identidad · Contacto · Colecciones (trabajos) · Productos (venta)
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Hammer, Eye, EyeOff, Save, Plus, Trash2, Upload,
  ExternalLink, Store, Phone, Package,
  CheckCircle2, AlertCircle, Pencil, Images,
  X, ImagePlus, ChevronLeft, ChevronRight, Loader2,
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const BUCKET    = 'catalog-photos';
const CATS      = ['dormitorio','cocina','sala','oficina','exterior','otro'];
const INPUT_CLS = 'w-full rounded-xl bg-zinc-800 border border-zinc-700 px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 transition';

const DEFAULT_CONFIG = {
  shop_name: '', tagline: '', accent_color: '#c8923a',
  phone: '', address: '', city: '', slug: '', logo_url: '',
  stats: [
    { label: 'Proyectos entregados', value: '120+' },
    { label: 'Clientes satisfechos', value: '98%'  },
    { label: 'Años de trayectoria',  value: '5'    },
    { label: 'Respuesta cotización', value: '24h'  },
  ],
  guarantees: ['Sin adelanto','Instalación incluida','Garantía 12 meses','Corte CNC de precisión'],
};

const EMPTY_PRODUCT    = { name:'', category:'dormitorio', price:'', time:'', tag:'', wood:'', finish:'', dims:'', description:'', photos:[], visible:true };
const EMPTY_COLLECTION = { title:'', description:'', photos:[] };

// ─── HELPERS ───────────────────────────────────────────────────────────────

async function getUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}
function publicUrl(path) {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

// ─── UI ATOMS ──────────────────────────────────────────────────────────────

function Toast({ msg, type }) {
  return (
    <motion.div
      className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl px-5 py-4 shadow-2xl text-sm font-medium"
      style={{ background: type==='ok'?'#1a2e1a':'#2e1a1a', border:`1px solid ${type==='ok'?'#2d5a2d':'#5a2d2d'}`, color:type==='ok'?'#6fcf6f':'#cf6f6f' }}
      initial={{ opacity:0, y:20, scale:0.95 }} animate={{ opacity:1, y:0, scale:1 }} exit={{ opacity:0, y:10 }}
    >
      {type==='ok' ? <CheckCircle2 size={16}/> : <AlertCircle size={16}/>}
      {msg}
    </motion.div>
  );
}

function SectionTitle({ icon: Icon, label }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center">
        <Icon size={15} className="text-amber-500" />
      </div>
      <h2 className="text-base font-bold text-white">{label}</h2>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs text-zinc-500 mb-1.5 uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}

// ─── LIGHTBOX ──────────────────────────────────────────────────────────────

function Lightbox({ photos, index, onClose }) {
  const [cur, setCur] = useState(index);
  return (
    <motion.div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/92"
      initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      onClick={onClose}>
      <button className="absolute top-4 right-4 text-white/60 hover:text-white" onClick={onClose}><X size={28}/></button>
      {cur > 0 && (
        <button className="absolute left-4 p-2 text-white/60 hover:text-white"
          onClick={e => { e.stopPropagation(); setCur(c=>c-1); }}>
          <ChevronLeft size={36}/>
        </button>
      )}
      <motion.img key={cur} src={photos[cur]} alt=""
        className="max-h-[85vh] max-w-[85vw] rounded-2xl shadow-2xl object-contain"
        initial={{ scale:0.9, opacity:0 }} animate={{ scale:1, opacity:1 }} exit={{ scale:0.9, opacity:0 }}
        onClick={e => e.stopPropagation()}/>
      {cur < photos.length-1 && (
        <button className="absolute right-4 p-2 text-white/60 hover:text-white"
          onClick={e => { e.stopPropagation(); setCur(c=>c+1); }}>
          <ChevronRight size={36}/>
        </button>
      )}
      <div className="absolute bottom-6 flex gap-2">
        {photos.map((_,i) => (
          <button key={i} onClick={e=>{e.stopPropagation();setCur(i);}}
            className="w-2 h-2 rounded-full transition-all"
            style={{ background: i===cur?'#c8923a':'#ffffff40' }}/>
        ))}
      </div>
    </motion.div>
  );
}

// ─── PHOTO UPLOADER ────────────────────────────────────────────────────────

function PhotoUploader({ photos, onChange, userId, label='Fotos', max=10 }) {
  const inputRef = useRef(null);
  const [busy, setBusy]   = useState(false);
  const [lb,   setLb]     = useState(null);
  const [err,  setErr]    = useState('');

  async function handleFiles(files) {
    if (!files?.length) return;
    setBusy(true); setErr('');
    const uploaded = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) { setErr('Solo imágenes'); continue; }
      if (file.size > 5*1024*1024)         { setErr(`${file.name} supera 5 MB`); continue; }
      const ext  = file.name.split('.').pop();
      const path = `${userId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert:false });
      if (error) { setErr(error.message); continue; }
      uploaded.push(publicUrl(path));
    }
    onChange([...photos, ...uploaded]);
    setBusy(false);
  }

  async function removePhoto(url) {
    const path = url.split(`/${BUCKET}/`)[1];
    if (path) await supabase.storage.from(BUCKET).remove([path]);
    onChange(photos.filter(u => u !== url));
  }

  return (
    <div>
      <p className="text-xs text-zinc-500 mb-2 uppercase tracking-wider">{label} ({photos.length}/{max})</p>
      {photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mb-3">
          {photos.map((url, i) => (
            <div key={url} className="relative group aspect-square rounded-xl overflow-hidden border border-zinc-700">
              <img src={url} alt="" className="w-full h-full object-cover cursor-zoom-in" onClick={() => setLb(i)}/>
              <div className="absolute top-1 left-1 bg-black/60 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">{i+1}</div>
              <button onClick={() => removePhoto(url)}
                className="absolute top-1 right-1 bg-black/70 text-red-400 rounded-full p-1 opacity-0 group-hover:opacity-100 transition">
                <X size={10}/>
              </button>
            </div>
          ))}
        </div>
      )}
      {photos.length < max && (
        <div onDrop={e=>{e.preventDefault();handleFiles(e.dataTransfer.files);}}
          onDragOver={e=>e.preventDefault()} onClick={() => inputRef.current?.click()}
          className="w-full rounded-xl border border-dashed border-zinc-700 bg-zinc-900 h-24 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-amber-500/60 hover:bg-zinc-800 transition group">
          {busy
            ? <Loader2 size={20} className="text-amber-500 animate-spin"/>
            : <><ImagePlus size={20} className="text-zinc-600 group-hover:text-amber-500 transition"/>
                <p className="text-xs text-zinc-600 group-hover:text-zinc-400 transition">Clic o arrastrá · PNG, JPG, WEBP · máx 5 MB</p></>
          }
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={e=>handleFiles(e.target.files)}/>
      {err && <p className="text-xs text-red-400 mt-1">{err}</p>}
      <AnimatePresence>
        {lb !== null && <Lightbox photos={photos} index={lb} onClose={() => setLb(null)}/>}
      </AnimatePresence>
    </div>
  );
}

// ─── LOGO UPLOADER ─────────────────────────────────────────────────────────

function LogoUploader({ logoUrl, onChange, userId }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState('');

  async function handleFile(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) { setErr('Solo imágenes'); return; }
    if (file.size > 2*1024*1024)         { setErr('Máximo 2 MB'); return; }
    setBusy(true); setErr('');
    const ext  = file.name.split('.').pop();
    const path = `${userId}/logo_${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert:true });
    if (error) { setErr(error.message); setBusy(false); return; }
    onChange(publicUrl(path));
    setBusy(false);
  }

  return (
    <div className="flex items-center gap-4">
      <div className="w-16 h-16 rounded-xl border border-dashed border-zinc-700 bg-zinc-800 flex items-center justify-center overflow-hidden shrink-0 cursor-pointer hover:border-amber-500/60 transition"
        onClick={() => inputRef.current?.click()}>
        {busy ? <Loader2 size={20} className="text-amber-500 animate-spin"/>
          : logoUrl ? <img src={logoUrl} alt="logo" className="w-full h-full object-contain"/>
          : <Hammer size={24} className="text-zinc-600"/>}
      </div>
      <div>
        <button onClick={() => inputRef.current?.click()}
          className="flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs text-zinc-400 hover:bg-zinc-700 transition">
          <Upload size={13}/> {logoUrl ? 'Cambiar logo' : 'Subir logo'}
        </button>
        <p className="text-[10px] text-zinc-600 mt-1">PNG o SVG transparente · máx 2 MB</p>
        {err && <p className="text-[10px] text-red-400 mt-1">{err}</p>}
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e=>handleFile(e.target.files?.[0])}/>
    </div>
  );
}

// ─── MODAL COLECCIÓN ───────────────────────────────────────────────────────

function CollectionModal({ collection, userId, onSave, onClose }) {
  const isNew = !collection?.id;
  const [form, setForm] = useState(collection ? { ...collection, photos: collection.photos || [] } : { ...EMPTY_COLLECTION });
  const [busy, setBusy] = useState(false);

  function set(k, v) { setForm(p => ({ ...p, [k]: v })); }

  async function handleSave() {
    if (!form.title.trim() && form.photos.length === 0) return;
    setBusy(true);
    const payload = { ...form, owner_id: userId };
    let error;
    if (isNew) ({ error } = await supabase.from('catalog_collections').insert(payload));
    else       ({ error } = await supabase.from('catalog_collections').update(payload).eq('id', form.id));
    setBusy(false);
    if (!error) { onSave(); onClose(); }
    else alert(error.message);
  }

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose}/>
      <motion.div className="relative z-10 w-full max-w-2xl rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl overflow-hidden flex flex-col"
        style={{ maxHeight:'90vh' }}
        initial={{ scale:0.93, y:20 }} animate={{ scale:1, y:0 }} exit={{ scale:0.93, y:20 }}
        transition={{ type:'spring', stiffness:300, damping:28 }}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800 shrink-0">
          <h3 className="text-lg font-bold text-white">{isNew ? 'Nueva colección' : 'Editar colección'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-800 transition text-zinc-500"><X size={16}/></button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          <PhotoUploader photos={form.photos} onChange={v => set('photos', v)} userId={userId} label="Fotos de la colección" max={20}/>
          <Field label="Título de la colección">
            <input className={INPUT_CLS} value={form.title} onChange={e => set('title', e.target.value)} placeholder="Ej: Dormitorios 2024, Cocinas modernas"/>
          </Field>
          <Field label="Descripción (opcional)">
            <textarea className={INPUT_CLS + ' resize-none'} rows={2}
              value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="Breve descripción de este conjunto de trabajos..."/>
          </Field>
        </div>
        <div className="flex gap-3 px-6 py-5 border-t border-zinc-800 shrink-0">
          <button onClick={onClose} className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900 py-3 text-sm text-zinc-400 hover:bg-zinc-800 transition">Cancelar</button>
          <button onClick={handleSave} disabled={busy}
            className="flex-1 rounded-xl bg-amber-500 text-black py-3 text-sm font-bold hover:bg-amber-400 transition disabled:opacity-40 flex items-center justify-center gap-2">
            {busy ? <Loader2 size={15} className="animate-spin"/> : <Save size={14}/>}
            {isNew ? 'Agregar colección' : 'Guardar cambios'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── MODAL PRODUCTO ────────────────────────────────────────────────────────

function ProductModal({ product, userId, onSave, onClose }) {
  const isNew = !product?.id;
  const [form, setForm] = useState(product ? { ...product, photos: product.photos || [] } : { ...EMPTY_PRODUCT });
  const [busy, setBusy] = useState(false);

  function set(k, v) { setForm(p => ({ ...p, [k]: v })); }

  async function handleSave() {
    if (!form.name.trim()) return;
    setBusy(true);
    const payload = { ...form, owner_id: userId, photos: form.photos ?? [] };
    let error;
    if (isNew) ({ error } = await supabase.from('catalog_products').insert(payload));
    else       ({ error } = await supabase.from('catalog_products').update(payload).eq('id', form.id));
    setBusy(false);
    if (!error) { onSave(); onClose(); }
    else alert(error.message);
  }

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose}/>
      <motion.div className="relative z-10 w-full max-w-2xl rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl overflow-hidden flex flex-col"
        style={{ maxHeight:'90vh' }}
        initial={{ scale:0.93, y:20 }} animate={{ scale:1, y:0 }} exit={{ scale:0.93, y:20 }}
        transition={{ type:'spring', stiffness:300, damping:28 }}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800 shrink-0">
          <h3 className="text-lg font-bold text-white">{isNew ? 'Nuevo producto' : 'Editar producto'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-800 transition text-zinc-500"><X size={16}/></button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          <PhotoUploader photos={form.photos} onChange={v => set('photos', v)} userId={userId} label="Fotos del producto"/>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nombre del mueble">
              <input className={INPUT_CLS} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Ej: Placard 3 puertas"/>
            </Field>
            <Field label="Categoría">
              <select className={INPUT_CLS} value={form.category} onChange={e => set('category', e.target.value)}>
                {CATS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Precio">
              <input className={INPUT_CLS} value={form.price} onChange={e => set('price', e.target.value)} placeholder="Ej: 1.500.000 o Consultar"/>
            </Field>
            <Field label="Plazo de entrega">
              <input className={INPUT_CLS} value={form.time} onChange={e => set('time', e.target.value)} placeholder="Ej: 10 días hábiles"/>
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Etiqueta (tag)">
              <input className={INPUT_CLS} value={form.tag} onChange={e => set('tag', e.target.value)} placeholder="Ej: Más pedido, Premium"/>
            </Field>
            <Field label="Dimensiones">
              <input className={INPUT_CLS} value={form.dims} onChange={e => set('dims', e.target.value)} placeholder="Ej: 2.40 × 2.00 m"/>
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Material principal">
              <input className={INPUT_CLS} value={form.wood} onChange={e => set('wood', e.target.value)} placeholder="Ej: MDF enchapado roble"/>
            </Field>
            <Field label="Terminación">
              <input className={INPUT_CLS} value={form.finish} onChange={e => set('finish', e.target.value)} placeholder="Ej: Barniz satinado"/>
            </Field>
          </div>
          <Field label="Descripción corta">
            <textarea className={INPUT_CLS + ' resize-none'} rows={2}
              value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="Una línea sobre el producto..."/>
          </Field>
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div onClick={() => set('visible', !form.visible)}
              className="w-10 h-6 rounded-full transition-colors relative shrink-0"
              style={{ background: form.visible ? '#c8923a' : '#3f3f46' }}>
              <div className="absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all"
                style={{ left: form.visible ? '22px' : '4px' }}/>
            </div>
            <span className="text-sm text-zinc-300">
              {form.visible ? 'Visible en el catálogo público' : 'Oculto del catálogo'}
            </span>
          </label>
        </div>
        <div className="flex gap-3 px-6 py-5 border-t border-zinc-800 shrink-0">
          <button onClick={onClose} className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900 py-3 text-sm text-zinc-400 hover:bg-zinc-800 transition">Cancelar</button>
          <button onClick={handleSave} disabled={!form.name.trim() || busy}
            className="flex-1 rounded-xl bg-amber-500 text-black py-3 text-sm font-bold hover:bg-amber-400 transition disabled:opacity-40 flex items-center justify-center gap-2">
            {busy ? <Loader2 size={15} className="animate-spin"/> : <Save size={14}/>}
            {isNew ? 'Agregar producto' : 'Guardar cambios'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── FOCUS INPUT — componente top-level para no violar reglas de hooks ─────

const INPUT_BASE = 'w-full rounded-xl bg-zinc-800 border border-zinc-700 px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none transition';

function FocusInput({ accent, className, style, ...props }) {
  const [focused, setFocused] = useState(false);
  const focusStyle = focused
    ? { borderColor: accent + 'aa', boxShadow: `0 0 0 3px ${accent}18` }
    : {};
  return (
    <input
      {...props}
      className={INPUT_BASE + (className ? ' ' + className : '')}
      style={{ ...style, ...focusStyle }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  );
}

// ─── PAGE ──────────────────────────────────────────────────────────────────

export default function SalesRoomPage() {
  const [config,      setConfig]      = useState(DEFAULT_CONFIG);
  const [products,    setProducts]    = useState([]);
  const [collections, setCollections] = useState([]);
  const [userId,      setUserId]      = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [toast,       setToast]       = useState(null);
  const [editP,       setEditP]       = useState(undefined);
  const [editC,       setEditC]       = useState(undefined);
  const [activeTab,   setActiveTab]   = useState('identidad');

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const user = await getUser();
    if (!user) return;
    setUserId(user.id);

    const [cfgRes, prodRes, colRes] = await Promise.all([
      supabase.from('shop_config').select('*').eq('owner_id', user.id).maybeSingle(),
      supabase.from('catalog_products').select('*').eq('owner_id', user.id).order('sort_order'),
      supabase.from('catalog_collections').select('*').eq('owner_id', user.id).order('sort_order'),
    ]);

    if (cfgRes.data)  setConfig({ ...DEFAULT_CONFIG, ...cfgRes.data });
    if (prodRes.data) setProducts(prodRes.data);
    if (colRes.data)  setCollections(colRes.data);
    setLoading(false);
  }

  function showToast(msg, type = 'ok') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function saveConfig() {
    setSaving(true);
    const payload = { ...config, owner_id: userId };
    const { error } = await supabase.from('shop_config').upsert(payload, { onConflict: 'owner_id' });
    setSaving(false);
    if (error) showToast(error.message, 'err');
    else showToast('Cambios publicados correctamente');
  }

  async function toggleVisible(p) {
    const { error } = await supabase.from('catalog_products').update({ visible: !p.visible }).eq('id', p.id);
    if (!error) setProducts(prev => prev.map(x => x.id === p.id ? { ...x, visible: !x.visible } : x));
  }

  async function deleteProduct(id) {
    if (!confirm('¿Eliminar este producto?')) return;
    const { error } = await supabase.from('catalog_products').delete().eq('id', id);
    if (!error) setProducts(prev => prev.filter(x => x.id !== id));
  }

  async function deleteCollection(id) {
    if (!confirm('¿Eliminar esta colección?')) return;
    const { error } = await supabase.from('catalog_collections').delete().eq('id', id);
    if (!error) setCollections(prev => prev.filter(x => x.id !== id));
  }

  function setField(k, v) { setConfig(c => ({ ...c, [k]: v })); }
  function setStat(i, k, v) {
    const s = [...config.stats]; s[i] = { ...s[i], [k]: v };
    setConfig(c => ({ ...c, stats: s }));
  }
  function setGuarantee(i, v) {
    const g = [...config.guarantees]; g[i] = v;
    setConfig(c => ({ ...c, guarantees: g }));
  }
  function removeGuarantee(i) {
    setConfig(c => ({ ...c, guarantees: c.guarantees.filter((_,idx) => idx !== i) }));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-zinc-500">
        <Loader2 size={24} className="animate-spin mr-3"/> Cargando editor...
      </div>
    );
  }

  const accent     = config.accent_color || '#c8923a';
  const slug       = config.slug || '';
  const catalogUrl = slug ? `/catalogo/${slug}` : null;

  const TABS = [
    { id: 'identidad',   label: 'Identidad',   icon: Store   },
    { id: 'contacto',    label: 'Contacto',     icon: Phone   },
    { id: 'estadisticas',label: 'Estadísticas', icon: Package },
  ];

  return (
    <div className="space-y-5 pb-10">

      {/* HEADER */}
      <div
        className="rounded-2xl p-5 flex items-center justify-between gap-4 flex-wrap"
        style={{ background: '#131009', border: `1px solid ${accent}30` }}
      >
        <div className="flex items-center gap-4">
          {/* Logo preview animado */}
          <motion.div
            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
            style={{ background: accent + '20', border: `1px solid ${accent}40` }}
            animate={{ borderColor: accent + '60' }}
            transition={{ duration: 0.4 }}
          >
            {config.logo_url
              ? <img src={config.logo_url} alt="logo" className="w-full h-full object-contain"/>
              : <Hammer size={20} style={{ color: accent }}/>
            }
          </motion.div>
          <div>
            <h1 className="text-lg font-black text-white leading-tight">
              {config.shop_name || 'Tu taller'}
            </h1>
            <p className="text-xs mt-0.5" style={{ color: accent + 'cc' }}>
              {catalogUrl
                ? <a href={catalogUrl} target="_blank" rel="noopener noreferrer"
                    className="hover:underline inline-flex items-center gap-1">
                    /catalogo/{slug} <ExternalLink size={10}/>
                  </a>
                : 'Sala de ventas'
              }
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {catalogUrl && (
            <a href={catalogUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 transition">
              <Eye size={14}/> Vista previa
            </a>
          )}
          <motion.button
            onClick={saveConfig}
            disabled={saving}
            className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition disabled:opacity-50"
            style={{ background: accent, color: '#0f0d0b' }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            {saving ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>}
            Publicar cambios
          </motion.button>
        </div>
      </div>

      <div className="grid xl:grid-cols-[1fr_420px] gap-5">

        {/* IZQUIERDA */}
        <div className="space-y-5">

          {/* Tabs de navegación con indicator animado */}
          <div
            className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden"
          >
            {/* Tab bar */}
            <div className="flex border-b border-zinc-800 relative">
              {TABS.map((tab) => {
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className="relative flex-1 flex items-center justify-center gap-2 py-3.5 text-xs font-semibold transition-colors"
                    style={{ color: active ? accent : '#71717a' }}
                  >
                    <tab.icon size={13}/>
                    {tab.label}
                    {active && (
                      <motion.div
                        layoutId="tab-indicator"
                        className="absolute bottom-0 left-0 right-0 h-[2px]"
                        style={{ background: accent }}
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Contenido del tab activo */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="p-6"
              >
                {activeTab === 'identidad' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field label="Nombre del taller">
                        <FocusInput accent={accent} value={config.shop_name}
                          onChange={e => setField('shop_name', e.target.value)} placeholder="Mi Carpintería"/>
                      </Field>
                      <Field label="Color de acento">
                        <div className="flex items-center gap-2">
                          <input type="color" value={accent} onChange={e => setField('accent_color', e.target.value)}
                            className="w-10 h-10 rounded-lg border border-zinc-700 bg-transparent cursor-pointer shrink-0"/>
                          <FocusInput accent={accent} value={accent} onChange={e => setField('accent_color', e.target.value)}/>
                        </div>
                      </Field>
                    </div>
                    <Field label="Tagline / frase">
                      <FocusInput accent={accent} value={config.tagline}
                        onChange={e => setField('tagline', e.target.value)} placeholder="Muebles a medida con materiales de primera"/>
                    </Field>
                    <Field label="Logo del taller">
                      <LogoUploader logoUrl={config.logo_url} onChange={v => setField('logo_url', v)} userId={userId}/>
                    </Field>
                    {/* Preview de identidad en vivo */}
                    <div className="rounded-xl p-4 flex items-center gap-4 mt-2"
                      style={{ background:'#0f0d0b', border:`1px solid ${accent}25` }}>
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
                        style={{ background:accent+'20', border:`1px solid ${accent}40` }}>
                        {config.logo_url
                          ? <img src={config.logo_url} alt="logo" className="w-full h-full object-contain"/>
                          : <Hammer size={20} style={{ color:accent }}/>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] uppercase tracking-widest mb-0.5" style={{ color:accent+'99' }}>
                          Vista previa en tiempo real
                        </p>
                        <h3 className="text-base font-black text-white truncate">{config.shop_name || 'Mi Carpintería'}</h3>
                        <p className="text-xs truncate" style={{ color:'#b5a48e' }}>{config.tagline || 'Muebles a medida'}</p>
                      </div>
                      <div className="rounded-lg px-3 py-1.5 text-[11px] font-black shrink-0 transition-colors"
                        style={{ background:accent, color:'#0f0d0b' }}>
                        Ver catálogo
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'contacto' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field label="WhatsApp / Teléfono">
                        <FocusInput accent={accent} value={config.phone}
                          onChange={e => setField('phone', e.target.value)} placeholder="+56 9 1234 5678"/>
                      </Field>
                      <Field label="Ciudad / Ubicación">
                        <FocusInput accent={accent} value={config.city}
                          onChange={e => setField('city', e.target.value)} placeholder="Santiago, Chile"/>
                      </Field>
                      <Field label="Dirección del taller">
                        <FocusInput accent={accent} value={config.address}
                          onChange={e => setField('address', e.target.value)} placeholder="Av. Providencia 1234"/>
                      </Field>
                    </div>
                    <Field label="URL del catálogo (slug)">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-zinc-600 shrink-0">/catalogo/</span>
                        <FocusInput accent={accent} value={config.slug || ''}
                          onChange={e => setField('slug', e.target.value)} placeholder="mi-carpinteria" className="flex-1"/>
                      </div>
                    </Field>
                  </div>
                )}

                {activeTab === 'estadisticas' && (
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div>
                      <p className="text-xs text-zinc-500 mb-3 uppercase tracking-wider">Números del taller</p>
                      <div className="space-y-2">
                        {(config.stats || []).map((s, i) => (
                          <div key={i} className="flex gap-2">
                            <FocusInput accent={accent} className="w-20 text-center font-bold"
                              value={s.value} onChange={e => setStat(i, 'value', e.target.value)} placeholder="120+"/>
                            <FocusInput accent={accent} value={s.label} onChange={e => setStat(i, 'label', e.target.value)} placeholder="Proyectos entregados"/>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 mb-3 uppercase tracking-wider">Garantías / bullets</p>
                      <div className="space-y-2">
                        {(config.guarantees || []).map((g, i) => (
                          <div key={i} className="flex gap-2 items-center">
                            <FocusInput accent={accent} value={g}
                              onChange={e => setGuarantee(i, e.target.value)} placeholder="Ej: Sin adelanto"/>
                            <button onClick={() => removeGuarantee(i)}
                              className="p-2 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition shrink-0">
                              <Trash2 size={14}/>
                            </button>
                          </div>
                        ))}
                        <button onClick={() => setConfig(c => ({ ...c, guarantees: [...(c.guarantees||[]), ''] }))}
                          className="text-xs flex items-center gap-1 transition mt-1"
                          style={{ color: accent }}>
                          <Plus size={13}/> Agregar bullet
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* DERECHA */}
        <div className="space-y-4">

          {/* ── COLECCIONES ─────────────────────────── */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <SectionTitle icon={Images} label="Colecciones / Trabajos realizados"/>
            <p className="text-xs text-zinc-500 mb-4 -mt-2">Galerías de fotos de proyectos terminados. Se muestran como inspiración en tu catálogo.</p>

            <div className="space-y-2 mb-4 max-h-64 overflow-y-auto pr-1">
              {collections.length === 0 && (
                <div className="rounded-xl border border-dashed border-zinc-700 p-5 text-center text-zinc-600 text-sm">
                  Sin colecciones. Agregá fotos de tus trabajos.
                </div>
              )}
              {collections.map((c) => (
                <motion.div key={c.id} layout
                  className="rounded-xl border border-zinc-700 bg-zinc-800 p-3 flex items-center gap-3">
                  {/* Miniatura grid */}
                  <div className="w-14 h-14 rounded-lg overflow-hidden border border-zinc-700 shrink-0 bg-zinc-700 grid grid-cols-2 gap-px">
                    {c.photos?.slice(0,4).map((url, i) => (
                      <img key={i} src={url} alt="" className="w-full h-full object-cover"/>
                    ))}
                    {(c.photos?.length || 0) === 0 && (
                      <div className="col-span-2 row-span-2 flex items-center justify-center">
                        <Images size={16} className="text-zinc-600"/>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{c.title || 'Sin título'}</p>
                    <p className="text-xs text-zinc-500">{c.photos?.length || 0} foto{c.photos?.length !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => setEditC(c)}
                      className="p-1.5 rounded-lg hover:bg-zinc-700 transition text-zinc-500 hover:text-amber-400">
                      <Pencil size={13}/>
                    </button>
                    <button onClick={() => deleteCollection(c.id)}
                      className="p-1.5 rounded-lg hover:bg-red-500/10 transition text-zinc-500 hover:text-red-400">
                      <Trash2 size={13}/>
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>

            <button onClick={() => setEditC(null)}
              className="w-full rounded-xl border border-dashed border-zinc-700 py-3 text-sm text-zinc-500 hover:border-amber-500/50 hover:text-amber-500 transition flex items-center justify-center gap-2">
              <Plus size={15}/> Nueva colección
            </button>
          </div>

          {/* ── PRODUCTOS ───────────────────────────── */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <SectionTitle icon={Package} label="Productos con precio (venta directa)"/>
            <p className="text-xs text-zinc-500 mb-4 -mt-2">Muebles con precio, plazo y botón de cotización. El cliente puede consultar desde el catálogo.</p>

            <div className="space-y-2 mb-4 max-h-64 overflow-y-auto pr-1">
              {products.length === 0 && (
                <div className="rounded-xl border border-dashed border-zinc-700 p-5 text-center text-zinc-600 text-sm">
                  Sin productos. Agregá el primero.
                </div>
              )}
              {products.map((p) => (
                <motion.div key={p.id} layout
                  className="rounded-xl border bg-zinc-800 p-3 flex items-center gap-3"
                  style={{ borderColor: p.visible ? '#3d3528' : '#27272a' }}>
                  <div className="w-12 h-12 rounded-lg overflow-hidden border border-zinc-700 shrink-0 bg-zinc-700">
                    {p.photos?.[0]
                      ? <img src={p.photos[0]} alt="" className="w-full h-full object-cover"/>
                      : <div className="w-full h-full flex items-center justify-center"><Hammer size={16} className="text-zinc-600"/></div>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{p.name || 'Sin nombre'}</p>
                    <p className="text-xs text-zinc-500">
                      {p.category} · {p.price}
                      {p.photos?.length > 0 && <span className="ml-2 text-amber-600">{p.photos.length} foto{p.photos.length>1?'s':''}</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => toggleVisible(p)}
                      className="p-1.5 rounded-lg hover:bg-zinc-700 transition"
                      style={{ color: p.visible ? '#c8923a' : '#52525b' }}>
                      {p.visible ? <Eye size={13}/> : <EyeOff size={13}/>}
                    </button>
                    <button onClick={() => setEditP(p)}
                      className="p-1.5 rounded-lg hover:bg-zinc-700 transition text-zinc-500 hover:text-amber-400">
                      <Pencil size={13}/>
                    </button>
                    <button onClick={() => deleteProduct(p.id)}
                      className="p-1.5 rounded-lg hover:bg-red-500/10 transition text-zinc-500 hover:text-red-400">
                      <Trash2 size={13}/>
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>

            <button onClick={() => setEditP(null)}
              className="w-full rounded-xl border border-dashed border-zinc-700 py-3 text-sm text-zinc-500 hover:border-amber-500/50 hover:text-amber-500 transition flex items-center justify-center gap-2">
              <Plus size={15}/> Agregar producto
            </button>

            {catalogUrl && (
              <a href={catalogUrl} target="_blank" rel="noopener noreferrer"
                className="mt-3 w-full rounded-xl bg-zinc-800 border border-zinc-700 py-3 text-sm text-zinc-400 hover:text-white hover:bg-zinc-700 transition flex items-center justify-center gap-2">
                <ExternalLink size={14}/> Abrir catálogo: /catalogo/{slug}
              </a>
            )}
          </div>
        </div>
      </div>

      {/* MODALES Y TOAST */}
      <AnimatePresence>
        {editP !== undefined && userId && (
          <ProductModal product={editP} userId={userId} onSave={loadAll} onClose={() => setEditP(undefined)}/>
        )}
        {editC !== undefined && userId && (
          <CollectionModal collection={editC} userId={userId} onSave={loadAll} onClose={() => setEditC(undefined)}/>
        )}
        {toast && <Toast msg={toast.msg} type={toast.type}/>}
      </AnimatePresence>
    </div>
  );
}
