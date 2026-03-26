import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import toast from 'react-hot-toast';

const FRECUENCIAS = ['UNICA', 'SEMANAL', 'QUINCENAL', 'MENSUAL'];
const TIPOS_COMUNES = [
  'Limpieza de refrigeradores',
  'Calibración de balanzas',
  'Revisión de equipos',
  'Mantenimiento de hornos',
  'Inspección sanitaria',
  'Revisión eléctrica',
  'Otro',
];

const emptyForm = { puntoDeVenta: '', visitador: '', tipo: '', frecuencia: 'MENSUAL', fechaHora: '', notas: '' };

export default function MantenimientosManager() {
  const navigate = useNavigate();
  const [mantenimientos, setMantenimientos] = useState([]);
  const [puntos, setPuntos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [mRes, pRes, uRes] = await Promise.all([
        api.get('/mantenimientos'),
        api.get('/puntos'),
        api.get('/usuarios'),
      ]);
      setMantenimientos(mRes.data.data);
      setPuntos(pRes.data.data);
      setUsuarios(uRes.data.data.filter((u) => u.activo && u.rol === 'TECNICO'));
    } catch { toast.error('Error cargando datos'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const abrirCrear = () => { setEditando(null); setForm(emptyForm); setModal(true); };
  const abrirEditar = (m) => {
    setEditando(m);
    setForm({
      puntoDeVenta: m.puntoDeVenta._id,
      visitador: m.visitador._id,
      tipo: m.tipo,
      frecuencia: m.frecuencia,
      fechaHora: new Date(m.fechaHora).toISOString().slice(0, 16),
      notas: m.notas || '',
    });
    setModal(true);
  };

  const cerrar = () => { setModal(false); setEditando(null); setForm(emptyForm); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.puntoDeVenta || !form.visitador || !form.tipo || !form.fechaHora) {
      toast.error('Completa todos los campos requeridos');
      return;
    }
    setSaving(true);
    try {
      if (editando) {
        await api.put(`/mantenimientos/${editando._id}`, form);
        toast.success('✅ Mantenimiento actualizado');
      } else {
        await api.post('/mantenimientos', form);
        toast.success('✅ Mantenimiento programado');
      }
      cerrar();
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar');
    } finally { setSaving(false); }
  };

  const toggleCompletado = async (m) => {
    try {
      await api.put(`/mantenimientos/${m._id}`, { completado: !m.completado });
      setMantenimientos((prev) => prev.map((x) => x._id === m._id ? { ...x, completado: !x.completado } : x));
    } catch { toast.error('Error al actualizar'); }
  };

  const eliminar = async (id) => {
    if (!confirm('¿Eliminar este mantenimiento?')) return;
    try {
      await api.delete(`/mantenimientos/${id}`);
      toast.success('Eliminado');
      fetchAll();
    } catch { toast.error('Error al eliminar'); }
  };

  const proximidad = (fechaHora) => {
    const diff = new Date(fechaHora) - new Date();
    const dias = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (dias < 0) return { texto: 'Vencido', color: 'text-red-400 bg-red-950/40' };
    if (dias === 0) return { texto: 'Hoy', color: 'text-orange-400 bg-orange-950/40' };
    if (dias === 1) return { texto: 'Mañana', color: 'text-yellow-400 bg-yellow-950/40' };
    if (dias <= 7) return { texto: `En ${dias}d`, color: 'text-blue-400 bg-blue-950/40' };
    return { texto: `En ${dias}d`, color: 'text-gray-400 bg-gray-800' };
  };

  const formatFecha = (f) => new Date(f).toLocaleString('es-CO', {
    weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <div className="page-header">
        <button onClick={() => navigate('/admin')} className="text-gray-400 hover:text-white p-1">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h1 className="font-bold text-white flex-1">🔧 Mantenimientos</h1>
        <button onClick={abrirCrear} className="btn-primary py-2 px-4 text-sm">+ Nuevo</button>
      </div>

      <div className="p-4 space-y-3 pb-8">
        {loading ? (
          <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="card animate-pulse h-24 bg-gray-800" />)}</div>
        ) : mantenimientos.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <span className="text-5xl block mb-3">🔧</span>
            <p>No hay mantenimientos programados</p>
            <button onClick={abrirCrear} className="btn-primary mt-4 w-auto px-6">Programar primero</button>
          </div>
        ) : (
          mantenimientos.map((m) => {
            const prox = proximidad(m.fechaHora);
            return (
              <div key={m._id} className={`card space-y-2 ${m.completado ? 'opacity-50' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-sm truncate">{m.tipo}</p>
                    <p className="text-gray-400 text-xs truncate">🏪 {m.puntoDeVenta?.nombre}</p>
                    <p className="text-gray-500 text-xs">👤 {m.visitador?.nombre}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${prox.color}`}>{prox.texto}</span>
                    <span className="text-xs text-gray-500">{m.frecuencia}</span>
                  </div>
                </div>
                <p className="text-gray-400 text-xs">📅 {formatFecha(m.fechaHora)}</p>
                {m.notas && <p className="text-gray-500 text-xs italic">{m.notas}</p>}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => toggleCompletado(m)}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-medium transition ${m.completado ? 'bg-gray-700 text-gray-400' : 'bg-green-900/40 text-green-400 border border-green-800'}`}
                  >
                    {m.completado ? '↩ Reabrir' : '✓ Completar'}
                  </button>
                  <button onClick={() => abrirEditar(m)} className="flex-1 btn-secondary py-1.5 text-xs">Editar</button>
                  <button onClick={() => eliminar(m._id)} className="w-10 flex items-center justify-center bg-red-950/40 text-red-400 rounded-xl text-sm border border-red-800/30">🗑</button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal crear/editar */}
      {modal && (
        <div className="fixed inset-0 z-40 bg-black/70 flex items-end" onClick={cerrar}>
          <div className="bg-gray-900 w-full rounded-t-3xl p-5 space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-bold text-white text-base">{editando ? 'Editar' : 'Nuevo'} mantenimiento</h2>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="label">Punto de venta *</label>
                <select className="input" value={form.puntoDeVenta} onChange={(e) => setForm({ ...form, puntoDeVenta: e.target.value })}>
                  <option value="">Seleccionar...</option>
                  {puntos.map((p) => <option key={p._id} value={p._id}>{p.nombre} — {p.ciudad}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Técnico asignado *</label>
                <select className="input" value={form.visitador} onChange={(e) => setForm({ ...form, visitador: e.target.value })}>
                  <option value="">Seleccionar técnico...</option>
                  {usuarios.length === 0
                    ? <option disabled>No hay técnicos activos</option>
                    : usuarios.map((u) => <option key={u._id} value={u._id}>{u.nombre}</option>)
                  }
                </select>
              </div>
              <div>
                <label className="label">Tipo de mantenimiento *</label>
                <select className="input" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                  <option value="">Seleccionar...</option>
                  {TIPOS_COMUNES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                {form.tipo === 'Otro' && (
                  <input className="input mt-2" placeholder="Describe el tipo..." onChange={(e) => setForm({ ...form, tipo: e.target.value })} />
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Frecuencia</label>
                  <select className="input" value={form.frecuencia} onChange={(e) => setForm({ ...form, frecuencia: e.target.value })}>
                    {FRECUENCIAS.map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Fecha y hora *</label>
                  <input type="datetime-local" className="input" value={form.fechaHora} onChange={(e) => setForm({ ...form, fechaHora: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="label">Notas adicionales</label>
                <textarea className="input resize-none" rows={2} value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} placeholder="Instrucciones, observaciones..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={cerrar} className="flex-1 btn-secondary">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 btn-primary disabled:opacity-60">
                  {saving ? 'Guardando...' : editando ? 'Actualizar' : 'Programar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
