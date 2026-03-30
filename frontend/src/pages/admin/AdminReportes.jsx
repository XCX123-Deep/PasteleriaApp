import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { getMediaUrl } from '../../api/mediaUrl';
import { EstadoBadge } from '../../components/EstadoStatus';
import toast from 'react-hot-toast';

/* ── Lightbox ─────────────────────────────────────────────────────────────── */
function Lightbox({ src, onClose }) {
  if (!src) return null;
  const descargar = () => {
    const a = document.createElement('a');
    a.href = src; a.download = src.split('/').pop() || 'evidencia.jpg';
    a.target = '_blank'; a.click();
  };
  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={onClose}>
      <div className="relative max-w-full max-h-full" onClick={(e) => e.stopPropagation()}>
        <img src={src} alt="Vista completa" className="max-h-[80vh] max-w-[90vw] rounded-2xl object-contain" />
        <div className="absolute top-2 right-2 flex gap-2">
          <button onClick={descargar} className="w-9 h-9 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white backdrop-blur transition" title="Descargar">⬇️</button>
          <button onClick={onClose} className="w-9 h-9 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white backdrop-blur transition text-lg">✕</button>
        </div>
      </div>
    </div>
  );
}

export default function AdminReportes() {
  const navigate = useNavigate();
  const [reportes, setReportes] = useState([]);
  const [tecnicos, setTecnicos] = useState([]);
  const [puntos, setPuntos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState({ estado: '', desde: '', hasta: '' });
  const [showFiltros, setShowFiltros] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const [asignando, setAsignando] = useState({});
  const [showCrear, setShowCrear] = useState(false);
  const [crearForm, setCrearForm] = useState({ puntoDeVenta: '', estado: 'ROJO', descripcion: '', fechaVisita: new Date().toISOString().split('T')[0] });
  const [creando, setCreando] = useState(false);

  const fetchReportes = async () => {
    setLoading(true);
    const params = {};
    if (filtros.estado) params.estado = filtros.estado;
    if (filtros.desde)  params.desde  = filtros.desde;
    if (filtros.hasta)  params.hasta  = filtros.hasta;
    try {
      const [rRes, uRes, pRes] = await Promise.all([
        api.get('/reportes', { params }),
        api.get('/usuarios'),
        api.get('/puntos'),
      ]);
      setReportes(rRes.data.data);
      setTecnicos(uRes.data.data.filter((u) => u.activo && u.rol === 'TECNICO'));
      setPuntos(pRes.data.data);
    } catch { toast.error('Error cargando reportes'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchReportes(); }, []);

  const estadoCount = (e) => reportes.filter((r) => r.estado === e).length;

  const handleAsignarTecnico = async (reporteId, tecnicoId) => {
    setAsignando((p) => ({ ...p, [reporteId]: true }));
    try {
      const { data } = await api.put(`/reportes/${reporteId}/tecnico`, { tecnicoId: tecnicoId || null });
      setReportes((prev) => prev.map((r) => r._id === reporteId ? data.data : r));
      toast.success(tecnicoId ? 'Técnico asignado ✅' : 'Técnico removido');
    } catch { toast.error('Error al asignar técnico'); }
    finally { setAsignando((p) => ({ ...p, [reporteId]: false })); }
  };

  const handleCrearReporte = async (e) => {
    e.preventDefault();
    if (!crearForm.puntoDeVenta) { toast.error('Selecciona un punto'); return; }
    setCreando(true);
    try {
      const fd = new FormData();
      fd.append('puntoDeVenta', crearForm.puntoDeVenta);
      fd.append('estado', crearForm.estado);
      fd.append('descripcion', crearForm.descripcion);
      fd.append('fechaVisita', crearForm.fechaVisita);
      const { data } = await api.post('/reportes', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setReportes((prev) => [data.data, ...prev]);
      setShowCrear(false);
      setCrearForm({ puntoDeVenta: '', estado: 'ROJO', descripcion: '', fechaVisita: new Date().toISOString().split('T')[0] });
      toast.success('Reporte creado ✅');
    } catch { toast.error('Error al crear reporte'); }
    finally { setCreando(false); }
  };

  const handleEliminarReporte = async (reporteId) => {
    if (!window.confirm('¿Eliminar este reporte? Esta acción no se puede deshacer.')) return;
    try {
      await api.delete(`/reportes/${reporteId}`);
      setReportes((prev) => prev.filter((r) => r._id !== reporteId));
      toast.success('Reporte eliminado');
    } catch { toast.error('Error al eliminar reporte'); }
  };

  const filtrarPills = (e) => {
    const next = filtros.estado === e ? '' : e;
    setFiltros((f) => ({ ...f, estado: next }));
    setLoading(true);
    const params = {};
    if (next) params.estado = next;
    if (filtros.desde) params.desde = filtros.desde;
    if (filtros.hasta) params.hasta = filtros.hasta;
    api.get('/reportes', { params })
      .then(({ data }) => setReportes(data.data))
      .catch(() => toast.error('Error cargando reportes'))
      .finally(() => setLoading(false));
  };

  return (
    <div className="min-h-screen bg-gray-950">
      <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />

      {/* Modal crear reporte */}
      {showCrear && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-end" onClick={() => setShowCrear(false)}>
          <form
            onSubmit={handleCrearReporte}
            onClick={(e) => e.stopPropagation()}
            className="w-full bg-gray-900 rounded-t-3xl p-6 space-y-4 border-t border-gray-700"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-white text-lg">Nuevo Reporte</h2>
              <button type="button" onClick={() => setShowCrear(false)} className="text-gray-400 text-2xl leading-none">✕</button>
            </div>
            <div>
              <label className="label">Punto de venta</label>
              <select className="input" required value={crearForm.puntoDeVenta} onChange={(e) => setCrearForm({ ...crearForm, puntoDeVenta: e.target.value })}>
                <option value="">— Seleccionar punto —</option>
                {puntos.map((p) => <option key={p._id} value={p._id}>{p.nombre} — {p.ciudad}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Estado</label>
              <div className="grid grid-cols-3 gap-2">
                {[['ROJO','🔴'],['NARANJA','🟠'],['VERDE','🟢']].map(([v,icon]) => (
                  <button type="button" key={v}
                    onClick={() => setCrearForm({ ...crearForm, estado: v })}
                    className={`py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                      crearForm.estado === v ? 'bg-gray-700 border-brand-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400'
                    }`}>
                    {icon} {v}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Descripción</label>
              <textarea className="input resize-none" rows={3} placeholder="Describe el hallazgo o situación..."
                value={crearForm.descripcion} onChange={(e) => setCrearForm({ ...crearForm, descripcion: e.target.value })} />
            </div>
            <div>
              <label className="label">Fecha de visita</label>
              <input type="date" className="input" value={crearForm.fechaVisita}
                onChange={(e) => setCrearForm({ ...crearForm, fechaVisita: e.target.value })} />
            </div>
            <button type="submit" disabled={creando} className="btn-primary disabled:opacity-60">
              {creando ? 'Creando...' : '✅ Crear Reporte'}
            </button>
          </form>
        </div>
      )}

      <div className="page-header">
        <button onClick={() => navigate('/admin')} className="text-gray-400 hover:text-white p-1">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="font-bold text-white flex-1">Reportes</h1>
        {/* Botón crear reporte */}
        <button onClick={() => setShowCrear(true)} className="text-gray-400 hover:text-brand-400 p-2 rounded-xl hover:bg-brand-950/30 transition-colors" title="Crear reporte">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
        <button onClick={() => setShowFiltros(!showFiltros)} className="text-gray-400 hover:text-white p-2 rounded-xl hover:bg-gray-800">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
          </svg>
        </button>
      </div>

      {/* Pills de estado */}
      <div className="flex gap-2 px-4 pt-3 pb-1">
        {[['ROJO', '🔴', 'red'], ['NARANJA', '🟠', 'orange'], ['VERDE', '🟢', 'green']].map(([e, icon, c]) => (
          <button
            key={e}
            onClick={() => filtrarPills(e)}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95 ${
              filtros.estado === e
                ? `bg-${c}-900 text-${c}-300 border border-${c}-700`
                : 'bg-gray-800 text-gray-400'
            }`}
          >
            {icon} {estadoCount(e)}
          </button>
        ))}
      </div>

      {/* Filtros expandibles */}
      {showFiltros && (
        <div className="mx-4 mt-2 card space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">Desde</label>
              <input type="date" className="input text-sm" value={filtros.desde}
                onChange={(e) => setFiltros({ ...filtros, desde: e.target.value })} />
            </div>
            <div>
              <label className="label">Hasta</label>
              <input type="date" className="input text-sm" value={filtros.hasta}
                onChange={(e) => setFiltros({ ...filtros, hasta: e.target.value })} />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={fetchReportes} className="flex-1 btn-primary py-2.5 text-sm">Aplicar</button>
            <button
              onClick={() => { setFiltros({ estado: '', desde: '', hasta: '' }); setShowFiltros(false); }}
              className="flex-1 btn-secondary py-2.5 text-sm"
            >Limpiar</button>
          </div>
        </div>
      )}

      <div className="p-4 space-y-3 pb-8">
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => <div key={i} className="card animate-pulse h-20 bg-gray-800" />)}
          </div>
        ) : reportes.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <span className="text-5xl block mb-3">📋</span>
            <p>No hay reportes</p>
          </div>
        ) : (
          reportes.map((r) => (
            <div key={r._id} className="card space-y-3">
              {/* Cabecera */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white text-sm truncate">{r.puntoDeVenta?.nombre}</p>
                  <p className="text-gray-400 text-xs">👤 {r.usuario?.nombre}</p>
                  <p className="text-gray-500 text-xs">
                    🕐 {new Date(r.fechaVisita).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <EstadoBadge estado={r.estado} />
                  <button
                    onClick={() => handleEliminarReporte(r._id)}
                    className="p-1.5 text-gray-600 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-all active:scale-90"
                    title="Eliminar reporte"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              {r.descripcion && <p className="text-gray-300 text-sm leading-relaxed">{r.descripcion}</p>}

              {/* Asignar técnico */}
              <div className="border-t border-gray-800 pt-3">
                <label className="text-gray-500 text-xs font-semibold uppercase tracking-wider block mb-1.5">
                  🔧 Técnico asignado
                </label>
                <div className="flex items-center gap-2">
                  <select
                    className="input text-sm flex-1 py-2"
                    value={r.tecnicoAsignado?._id || ''}
                    onChange={(e) => handleAsignarTecnico(r._id, e.target.value)}
                    disabled={asignando[r._id]}
                  >
                    <option value="">— Sin asignar —</option>
                    {tecnicos.map((t) => (
                      <option key={t._id} value={t._id}>{t.nombre}</option>
                    ))}
                  </select>
                  {asignando[r._id] && (
                    <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                  )}
                </div>
                {r.tecnicoAsignado && (
                  <p className="text-brand-400 text-xs mt-1.5">✅ {r.tecnicoAsignado.nombre} asignado</p>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-gray-800 pt-2">
                <p className="text-gray-500 text-xs">
                  🕐 {new Date(r.fechaVisita).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
                <div className="flex gap-2">
                  {r.fotos?.length > 0 && <span className="text-xs text-gray-500">📷 {r.fotos.length}</span>}
                  {r.firma && <span className="text-xs text-gray-500">✍️</span>}
                </div>
              </div>

              {/* Fotos */}
              {r.fotos?.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {r.fotos.map((f, i) => (
                    <img key={i} src={getMediaUrl(f)} alt={`Evidencia ${i + 1}`}
                      className="h-16 w-16 rounded-xl object-cover flex-shrink-0 border border-gray-700 cursor-pointer active:scale-95 transition"
                      onClick={() => setLightboxSrc(getMediaUrl(f))} />
                  ))}
                </div>
              )}

              {/* Firma */}
              {r.firma && (
                <div>
                  <p className="text-gray-500 text-xs mb-1">Firma:</p>
                  <img src={getMediaUrl(r.firma)} alt="Firma"
                    className="h-12 rounded-lg border border-gray-700 bg-gray-800 object-contain cursor-pointer"
                    onClick={() => setLightboxSrc(getMediaUrl(r.firma))} />
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
