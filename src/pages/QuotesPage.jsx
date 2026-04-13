import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Download, Trash2, Plus, X, MessageCircle, Eye } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../lib/supabaseClient';
import { useThemeStore } from '../store/themeStore';
import QuoteForm from '../components/quotes/QuoteForm';

const STATUS_COLORS_DARK  = { draft:'bg-zinc-700/60 text-zinc-300', sent:'bg-amber-500/20 text-amber-300', approved:'bg-emerald-500/20 text-emerald-300', rejected:'bg-red-500/20 text-red-300' };
const STATUS_COLORS_LIGHT = { draft:'bg-zinc-200 text-zinc-600',    sent:'bg-amber-100 text-amber-700',    approved:'bg-emerald-100 text-emerald-700',    rejected:'bg-red-100 text-red-700'       };
const STATUS_LABELS  = { draft:'Borrador', sent:'Enviada', approved:'Aprobada', rejected:'Rechazada' };
const STATUS_OPTIONS = Object.entries(STATUS_LABELS);

// ── PDF ───────────────────────────────────────────────────────────
async function generatePDF(quote) {
  const doc = new jsPDF({ unit:'mm', format:'a4' });
  const W   = doc.internal.pageSize.getWidth();
  const OAK = [200, 146, 58];

  doc.setFillColor(...OAK);
  doc.rect(0, 0, W, 28, 'F');
  doc.setTextColor(255,255,255);
  doc.setFontSize(18); doc.setFont('helvetica','bold');
  doc.text('COTIZACIÓN', 14, 12);
  doc.setFontSize(10); doc.setFont('helvetica','normal');
  doc.text(`N° ${quote.id.slice(0,8).toUpperCase()}`, 14, 20);
  const dateStr = new Date(quote.created_at).toLocaleDateString('es-AR', { day:'2-digit', month:'long', year:'numeric' });
  doc.text(dateStr, W-14, 12, { align:'right' });
  doc.text(`Estado: ${STATUS_LABELS[quote.status] || quote.status}`, W-14, 20, { align:'right' });

  doc.setTextColor(30,30,30);
  doc.setFontSize(11); doc.setFont('helvetica','bold'); doc.text('Cliente',14,38);
  doc.setFont('helvetica','normal'); doc.text(quote.clients?.name||'—',14,45);
  doc.setFont('helvetica','bold'); doc.text('Título',70,38);
  doc.setFont('helvetica','normal'); doc.text(quote.title,70,45);
  doc.setFont('helvetica','bold'); doc.text('Tipo de mueble',140,38);
  doc.setFont('helvetica','normal'); doc.text(quote.furniture_type,140,45);
  doc.setFont('helvetica','bold'); doc.text('Dimensiones',14,55);
  doc.setFont('helvetica','normal'); doc.text(`${quote.width_mm} × ${quote.height_mm} × ${quote.depth_mm} mm`,14,62);

  doc.setDrawColor(...OAK); doc.setLineWidth(0.5); doc.line(14,67,W-14,67);

  const items = (quote.quote_items||[]).map(i=>[i.description,`${Number(i.quantity)} ${i.unit}`,`$${Number(i.unit_cost).toLocaleString('es-AR')}`,`$${Number(i.total_cost).toLocaleString('es-AR')}`]);
  if (items.length>0) {
    autoTable(doc,{ startY:72, head:[['Material','Cantidad','P. Unit.','Total']], body:items, theme:'striped',
      headStyles:{ fillColor:OAK, textColor:255, fontStyle:'bold', fontSize:10 },
      bodyStyles:{ fontSize:9, textColor:[40,40,40] },
      columnStyles:{ 0:{cellWidth:80}, 1:{halign:'right'}, 2:{halign:'right'}, 3:{halign:'right'} },
      margin:{ left:14, right:14 } });
  }

  const finalY = (doc.lastAutoTable?.finalY||72)+8;
  const boxX   = W-14-80;
  doc.setFillColor(250,248,244); doc.roundedRect(boxX,finalY,80,52,3,3,'F');
  doc.setDrawColor(...OAK); doc.setLineWidth(0.3); doc.roundedRect(boxX,finalY,80,52,3,3,'S');
  const row = (label,value,y,bold=false) => {
    doc.setFont('helvetica',bold?'bold':'normal'); doc.setFontSize(bold?11:9);
    doc.setTextColor(bold?30:90,bold?30:90,bold?30:90); doc.text(label,boxX+5,y);
    doc.setTextColor(...(bold?OAK:[90,90,90])); doc.text(value,boxX+75,y,{align:'right'});
  };
  const mat=(quote.quote_items||[]).reduce((s,i)=>s+Number(i.total_cost),0);
  row('Materiales',`$${mat.toLocaleString('es-AR')}`,finalY+10);
  row('Mano de obra',`$${Number(quote.labor_cost).toLocaleString('es-AR')}`,finalY+19);
  row('Costos extra',`$${Number(quote.extra_cost).toLocaleString('es-AR')}`,finalY+28);
  doc.setDrawColor(200,200,200); doc.line(boxX+5,finalY+32,boxX+75,finalY+32);
  row('Subtotal',`$${Number(quote.subtotal).toLocaleString('es-AR')}`,finalY+38);
  doc.setDrawColor(...OAK); doc.line(boxX+5,finalY+42,boxX+75,finalY+42);
  row('TOTAL',`$${Number(quote.total).toLocaleString('es-AR')}`,finalY+50,true);

  const pageH=doc.internal.pageSize.getHeight();
  doc.setFontSize(8); doc.setTextColor(160,160,160);
  doc.text('Generado con WoodFlow · Cotización válida por 15 días',W/2,pageH-10,{align:'center'});
  doc.save(`cotizacion-${quote.id.slice(0,8)}.pdf`);
}

// ── Modal detalle ─────────────────────────────────────────────────
function QuoteDetailModal({ quote, onClose, onStatusChange, onDelete, tk, isDark }) {
  const [status,      setStatus]      = useState(quote.status);
  const [updating,    setUpdating]    = useState(false);
  const [confirmApprove, setConfirmApprove] = useState(false);
  const SC = isDark ? STATUS_COLORS_DARK : STATUS_COLORS_LIGHT;

  async function saveStatus(v) {
    setUpdating(true);
    const prev = status;
    await supabase.from('quotes').update({ status: v }).eq('id', quote.id);

    // Al aprobar: descontar stock + crear orden automática
    if (v === 'approved' && prev !== 'approved') {
      const { data: { user } } = await supabase.auth.getUser();

      // Descontar stock
      for (const item of quote.quote_items || []) {
        if (!item.material_id) continue;
        const { data: mat } = await supabase.from('materials').select('stock').eq('id', item.material_id).single();
        if (!mat) continue;
        const newStock = Math.max(0, Number(mat.stock) - Number(item.quantity));
        await supabase.from('materials').update({ stock: newStock }).eq('id', item.material_id);
        await supabase.from('material_movements').insert({
          owner_id: user.id, material_id: item.material_id,
          type: 'out', quantity: Number(item.quantity),
          note: `Cotización aprobada: ${quote.title}`,
        });
      }

      // Crear orden de producción automáticamente
      await supabase.from('sales').insert({
        owner_id: user.id,
        quote_id: quote.id,
        status: 'confirmed',
        amount: Number(quote.total),
        payment_status: 'unpaid',
      });
    }

    // Al rechazar una aprobada: revertir stock
    if (v === 'rejected' && prev === 'approved') {
      const { data: { user } } = await supabase.auth.getUser();
      for (const item of quote.quote_items || []) {
        if (!item.material_id) continue;
        const { data: mat } = await supabase.from('materials').select('stock').eq('id', item.material_id).single();
        if (!mat) continue;
        const newStock = Number(mat.stock) + Number(item.quantity);
        await supabase.from('materials').update({ stock: newStock }).eq('id', item.material_id);
        await supabase.from('material_movements').insert({
          owner_id: user.id, material_id: item.material_id,
          type: 'in', quantity: Number(item.quantity),
          note: `Cotización rechazada (reversión): ${quote.title}`,
        });
      }
    }

    setStatus(v);
    onStatusChange(quote.id, v);
    setUpdating(false);
    setConfirmApprove(false);
  }

  return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}>
      <motion.div
        initial={{ scale:0.95, y:20 }} animate={{ scale:1, y:0 }} exit={{ scale:0.95, y:20 }}
        transition={{ type:'spring', stiffness:300, damping:28 }}
        className={`${tk.modal} ${tk.text} rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto`}
        onClick={e=>e.stopPropagation()}>

        {/* Header */}
        <div className={`flex items-start justify-between p-6 border-b ${tk.border}`}>
          <div>
            <p className={`text-xs uppercase tracking-wider mb-1 ${tk.sub}`}>{quote.furniture_type}</p>
            <h2 className={`text-xl font-bold ${tk.text}`}>{quote.title}</h2>
            <p className={`text-sm mt-0.5 ${tk.sub}`}>{quote.clients?.name}</p>
          </div>
          <button onClick={onClose} className={`${tk.sub} hover:${tk.text} transition p-1`}><X size={20}/></button>
        </div>

        {/* Dimensiones */}
        <div className={`px-6 py-4 grid grid-cols-3 gap-3 border-b ${tk.border}`}>
          {[['Ancho',quote.width_mm],['Alto',quote.height_mm],['Fondo',quote.depth_mm]].map(([l,v])=>(
            <div key={l} className={`${tk.card2} rounded-xl p-3 text-center`}>
              <p className={`text-xs uppercase tracking-wider ${tk.sub}`}>{l}</p>
              <p className={`text-lg font-bold mt-1 ${tk.text}`}>{v} <span className={`text-xs ${tk.sub}`}>mm</span></p>
            </div>
          ))}
        </div>

        {/* Materiales */}
        {quote.quote_items?.length > 0 && (
          <div className={`px-6 py-4 border-b ${tk.border}`}>
            <p className={`text-xs uppercase tracking-wider mb-3 ${tk.sub}`}>Materiales</p>
            <div className="space-y-2">
              {quote.quote_items.map(item=>(
                <div key={item.id} className="flex justify-between text-sm">
                  <span className={tk.text}>{item.description} <span className={tk.sub}>× {item.quantity} {item.unit}</span></span>
                  <span className="text-amber-500 font-medium">${Number(item.total_cost).toLocaleString('es-AR')}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Totales */}
        <div className={`px-6 py-4 space-y-2 border-b ${tk.border}`}>
          {[['Mano de obra',quote.labor_cost],['Costos extra',quote.extra_cost]].map(([l,v])=>(
            <div key={l} className={`flex justify-between text-sm ${tk.sub}`}>
              <span>{l}</span><span>${Number(v).toLocaleString('es-AR')}</span>
            </div>
          ))}
          <div className={`flex justify-between text-sm pt-1 border-t ${tk.border} ${tk.sub}`}>
            <span>Subtotal</span><span>${Number(quote.subtotal).toLocaleString('es-AR')}</span>
          </div>
          <div className={`flex justify-between text-xl font-bold pt-2 border-t border-amber-500/30 ${tk.text}`}>
            <span>Total</span><span className="text-amber-500">${Number(quote.total).toLocaleString('es-AR')}</span>
          </div>
        </div>

        {/* Estado actual */}
        <div className={`px-6 py-3 border-b ${tk.border} flex items-center gap-2`}>
          <span className={`text-xs uppercase tracking-wider ${tk.sub}`}>Estado:</span>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${SC[status]}`}>{STATUS_LABELS[status]}</span>
        </div>

        {/* Flujo de estado */}
        <div className={`px-6 py-4 border-b ${tk.border}`}>
          <p className={`text-xs uppercase tracking-wider mb-3 ${tk.sub}`}>Cambiar estado</p>

          {/* Confirmación de aprobación */}
          {confirmApprove ? (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3">
              <p className={`text-sm font-semibold ${tk.text}`}>¿Aprobar esta cotización?</p>
              <ul className={`text-xs space-y-1 ${tk.sub}`}>
                <li>• Se descontarán los materiales del inventario</li>
                <li>• Se creará una orden de producción automáticamente</li>
              </ul>
              <div className="flex gap-2">
                <button
                  onClick={() => saveStatus('approved')} disabled={updating}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-bold rounded-xl py-2 text-sm transition">
                  {updating ? 'Procesando…' : 'Confirmar aprobación'}
                </button>
                <button onClick={() => setConfirmApprove(false)}
                  className={`px-4 rounded-xl border text-sm ${tk.input} transition`}>
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {status !== 'sent' && (
                <button onClick={() => saveStatus('sent')} disabled={updating}
                  className="flex items-center gap-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/30 rounded-xl px-3 py-2 text-sm font-medium transition">
                  Marcar enviada
                </button>
              )}
              {status !== 'approved' && (
                <button onClick={() => setConfirmApprove(true)} disabled={updating}
                  className="flex items-center gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 border border-emerald-500/30 rounded-xl px-3 py-2 text-sm font-medium transition">
                  Aprobar → crear orden
                </button>
              )}
              {status !== 'rejected' && status !== 'approved' && (
                <button onClick={() => saveStatus('rejected')} disabled={updating}
                  className="flex items-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-xl px-3 py-2 text-sm font-medium transition">
                  Rechazar
                </button>
              )}
              {status === 'approved' && (
                <button onClick={() => saveStatus('rejected')} disabled={updating}
                  className="flex items-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-xl px-3 py-2 text-sm font-medium transition">
                  Revertir aprobación
                </button>
              )}
              {status !== 'draft' && (
                <button onClick={() => saveStatus('draft')} disabled={updating}
                  className={`flex items-center gap-1.5 border rounded-xl px-3 py-2 text-sm font-medium transition ${tk.input}`}>
                  Volver a borrador
                </button>
              )}
            </div>
          )}
        </div>

        {/* Acciones */}
        <div className="px-6 py-4 flex flex-wrap gap-3">
          <button onClick={()=>generatePDF(quote)}
            className="flex items-center gap-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/30 rounded-xl px-4 py-2.5 text-sm font-medium transition">
            <Download size={14}/> Descargar PDF
          </button>
          {quote.clients?.phone && (
            <a href={`https://wa.me/${quote.clients.phone.replace(/\D/g,'')}?text=${encodeURIComponent(
              `Hola ${quote.clients.name}, te envío la cotización para *${quote.title}*.\n\n` +
              `• Tipo: ${quote.furniture_type}\n` +
              `• Dimensiones: ${quote.width_mm}×${quote.height_mm}×${quote.depth_mm}mm\n` +
              `• Total: $${Number(quote.total).toLocaleString('es-AR')}\n\n` +
              `Cualquier consulta estoy disponible.`)}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 border border-emerald-500/30 rounded-xl px-4 py-2.5 text-sm font-medium transition">
              <MessageCircle size={14}/> Enviar por WhatsApp
            </a>
          )}
          <button onClick={()=>onDelete(quote.id)}
            className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-xl px-4 py-2.5 text-sm font-medium transition">
            <Trash2 size={14}/> Eliminar
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Page ──────────────────────────────────────────────────────────
export default function QuotesPage() {
  const location  = useLocation();
  const { theme } = useThemeStore();
  const isDark    = theme === 'dark';

  const tk = isDark ? {
    bg:     'bg-zinc-950',
    card:   'bg-zinc-900/50 border-zinc-800 hover:bg-zinc-900 hover:border-zinc-700',
    card2:  'bg-zinc-900',
    modal:  'bg-zinc-950 border border-zinc-800',
    text:   'text-white',
    sub:    'text-zinc-400',
    border: 'border-zinc-800',
    input:  'bg-zinc-900 border border-zinc-700 text-white',
    form:   'bg-zinc-900/40 border-zinc-800',
    tabOn:  'bg-white text-black',
    tabOff: 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800',
    empty:  'text-zinc-600',
  } : {
    bg:     'bg-stone-50',
    card:   'bg-white border-stone-200 hover:border-stone-300 hover:shadow-sm',
    card2:  'bg-stone-100',
    modal:  'bg-white border border-stone-200',
    text:   'text-stone-900',
    sub:    'text-stone-500',
    border: 'border-stone-200',
    input:  'bg-stone-50 border border-stone-300 text-stone-900',
    form:   'bg-white border-stone-200',
    tabOn:  'bg-stone-900 text-white',
    tabOff: 'bg-white text-stone-500 hover:text-stone-800 border border-stone-200',
    empty:  'text-stone-400',
  };

  const SC = isDark ? STATUS_COLORS_DARK : STATUS_COLORS_LIGHT;

  const [quotes,       setQuotes]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [showForm,     setShowForm]     = useState(false);
  const [prefill,      setPrefill]      = useState(null);
  const [selected,     setSelected]     = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    if (location.state?.prefill) {
      setPrefill(location.state.prefill);
      setShowForm(true);
      window.history.replaceState({}, '');
    }
  }, [location.state]);

  useEffect(() => { fetchQuotes(); }, []);

  async function fetchQuotes() {
    setLoading(true);
    const { data } = await supabase
      .from('quotes')
      .select('*, clients(name, phone), quote_items(*)')
      .order('created_at', { ascending: false });
    setQuotes(data || []);
    setLoading(false);
  }

  function handleSaved() { setShowForm(false); setPrefill(null); fetchQuotes(); }

  function handleStatusChange(id, newStatus) {
    setQuotes(prev => prev.map(q => q.id===id ? {...q, status:newStatus} : q));
    if (selected?.id===id) setSelected(p=>({...p, status:newStatus}));
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar esta cotización?')) return;
    await supabase.from('quotes').delete().eq('id', id);
    setSelected(null);
    setQuotes(prev => prev.filter(q => q.id!==id));
  }

  const filtered = filterStatus==='all' ? quotes : quotes.filter(q=>q.status===filterStatus);

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h1 className={`text-2xl md:text-3xl font-bold ${tk.text}`}>Cotizaciones</h1>
          <p className={`mt-1 ${tk.sub}`}>Creá y gestioná presupuestos para tus clientes.</p>
        </div>
        <button onClick={()=>setShowForm(v=>!v)}
          className="flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-2xl px-5 py-3 transition shadow-lg shadow-amber-500/20 w-full sm:w-auto">
          <Plus size={18}/> Nueva cotización
        </button>
      </div>

      {/* Form panel */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }}
            exit={{ opacity:0, height:0 }} transition={{ duration:0.3 }} className="overflow-hidden">
            <div className={`rounded-3xl border ${tk.form} p-6`}>
              <div className="flex items-center justify-between mb-5">
                <h2 className={`text-lg font-semibold ${tk.text}`}>Nueva cotización</h2>
                <button onClick={()=>{ setShowForm(false); setPrefill(null); }} className={`${tk.sub} transition`}>
                  <X size={18}/>
                </button>
              </div>
              <QuoteForm onSaved={handleSaved} prefill={prefill}/>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {[['all','Todas'], ...STATUS_OPTIONS].map(([val,label])=>(
          <button key={val} onClick={()=>setFilterStatus(val)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${filterStatus===val ? tk.tabOn : tk.tabOff}`}>
            {label}
            {val!=='all' && <span className="ml-1.5 text-xs opacity-60">{quotes.filter(q=>q.status===val).length}</span>}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-zinc-700 border-t-amber-500"/>
        </div>
      ) : filtered.length===0 ? (
        <div className={`flex flex-col items-center justify-center py-20 gap-3 ${tk.empty}`}>
          <FileText size={40} strokeWidth={1}/>
          <p className="text-sm">No hay cotizaciones aún</p>
        </div>
      ) : (
        <div className="grid gap-3">
          <AnimatePresence>
            {filtered.map((q,i)=>(
              <motion.div key={q.id}
                initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}
                exit={{ opacity:0, y:-10 }} transition={{ delay:i*0.04 }}
                onClick={()=>setSelected(q)}
                className={`group cursor-pointer rounded-2xl border transition-all p-3 md:p-4 flex items-center gap-2 md:gap-4 ${tk.card}`}>
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                  <FileText size={18} className="text-amber-500"/>
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold truncate ${tk.text}`}>{q.title}</p>
                  <p className={`text-sm truncate ${tk.sub}`}>{q.clients?.name} · {q.furniture_type}</p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${SC[q.status]}`}>
                  {STATUS_LABELS[q.status]}
                </span>
                <div className="text-right shrink-0">
                  <p className={`font-bold ${tk.text}`}>${Number(q.total).toLocaleString('es-AR')}</p>
                  <p className={`text-xs ${tk.sub}`}>{new Date(q.created_at).toLocaleDateString('es-AR')}</p>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition shrink-0 hidden sm:flex">
                  <button onClick={e=>{ e.stopPropagation(); generatePDF(q); }}
                    className={`p-2 rounded-xl hover:bg-amber-500/10 ${tk.sub} hover:text-amber-500 transition`}>
                    <Download size={15}/>
                  </button>
                  <button onClick={e=>{ e.stopPropagation(); setSelected(q); }}
                    className={`p-2 rounded-xl ${isDark?'hover:bg-zinc-700':'hover:bg-stone-100'} ${tk.sub} transition`}>
                    <Eye size={15}/>
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {selected && (
          <QuoteDetailModal
            quote={selected}
            onClose={()=>setSelected(null)}
            onStatusChange={handleStatusChange}
            onDelete={handleDelete}
            tk={tk}
            isDark={isDark}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
