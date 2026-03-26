import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/client';
import { getMediaUrl } from '../../api/mediaUrl';
import { EstadoBadge, EstadoSelector } from '../../components/EstadoStatus';
import toast from 'react-hot-toast';

/* ── Lightbox ─────────────────────────────────────────────────────────────── */
function Lightbox({ src, onClose }) {
  if (!src) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={onClose}>
      <img src={src} alt="Vista completa" className="max-h-[80vh] max-w-[90vw] rounded-2xl object-contain" />
      <button onClick={onClose} className="absolute top-4 right-4 w-9 h-9 bg-white/20 rounded-full text-white text-lg flex items-center justify-center">✕</button>
    </div>
  );
}

const colorEstado = {
  ROJO: 'bg-red-950/60 border-red-800',
  NARANJA: 'bg-orange-950/60 border-orange-800',
  VERDE: 'bg-green-950/60 border-green-800',
};

export default function TecnicoPunto() {
  const { puntoId } = useParams();
  const navigate = useNavigate();

  const [punto, setPunto] = useState(null);
  const [reportes, setReportes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lightboxSrc, setLightboxSrc] = useState(null);

  // Para cambio de estado
  const [reporteActivo, setReporteActivo] = useState(null);
  const [nuevoEstado, setNuevoEstado] = useState('');
  const [guardandoEstado, setGuardandoEstado] = useState(false);

  // Para novedad
  const [novedadTexto, setNovedadTexto] = useState('');
  const [guardandoNovedad, setGuardandoNovedad] = useState(false);
  const novedadRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pRes, rRes] = await Promise.all([
          api.get(`/puntos/${puntoId}`),
          api.get('/reportes', { params: { puntoDeVenta: puntoId } }),
        ]);
        setPunto(pRes.data.data);
        const lista = rRes.data.data;
        setReportes(lista);
        if (lista.length > 0) {
          setReporteActivo(lista[0]);
          setNuevoEstado(lista[0].estado);
        }
      } catch {
        toast.error('Error cargando información del punto');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [puntoId]);

  // Guardar nuevo estado del reporte más reciente
  const handleGuardarEstado = async () => {
    if (!reporteActivo || nuevoEstado === reporteActivo.estado) return;
    setGuardandoEstado(true);
    try {
      const fd = new FormData();
      fd.append('estado', nuevoEstado);
      const { data } = await api.put(`/reportes/${reporteActivo._id}`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setReporteActivo(data.data);
      setReportes((prev) => prev.map((r) => r._id === data.data._id ? data.data : r));
      toast.success('✅ Estado actualizado');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al actualizar estado');
    } finally {
      setGuardandoEstado(false);
    }
  };

  // Añadir novedad al reporte más reciente
  const handleAgregarNovedad = async (e) => {
    e.preventDefault();
    if (!novedadTexto.trim() || !reporteActivo) return;
    setGuardandoNovedad(true);
    try {
      const { data } = await api.post(`/reportes/${reporteActivo._id}/novedad`, { texto: novedadTexto.trim() });
      // Añadir novedad al reporte activo localmente
      setReporteActivo((prev) => ({
        ...prev,
        novedades: [...(prev.novedades || []), data.data],
      }));
      setNovedadTexto('');
      toast.success('✅ Novedad registrada');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al registrar novedad');
    } finally {
      setGuardandoNovedad(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />

      {/* Header */}
      <div className="page-header">
        <button onClick={() => navigate('/tecnico')} className="text-gray-400 hover:text-white p-1">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-white text-sm truncate">{punto?.nombre}</h1>
          <p className="text-gray-400 text-xs truncate">📍 {punto?.ciudad}</p>
        </div>
        {reporteActivo && <EstadoBadge estado={reporteActivo.estado} />}
      </div>

      <div className="p-4 space-y-5 pb-8">
        {/* Info del punto */}
        <div className="card space-y-1">
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Información del punto</p>
          <p className="text-gray-200 text-sm">{punto?.direccion}</p>
          {punto?.contactoNombre && (
            <p className="text-gray-400 text-sm">👤 {punto.contactoNombre}{punto.contactoTelefono && ` · ${punto.contactoTelefono}`}</p>
          )}
        </div>

        {/* Botón para ir al formulario completo con fotos y firma */}
        <button
          onClick={() => navigate(`/punto/${puntoId}`)}
          className="w-full flex items-center justify-center gap-2 bg-teal-900/40 border border-teal-700 text-teal-300 font-semibold py-3 rounded-2xl active:scale-[0.98] transition-all hover:bg-teal-900/60"
        >
          <span>📷</span>
          {reporteActivo ? 'Ver / editar mi reporte con fotos y firma' : 'Crear mi reporte de visita'}
        </button>

        {reporteActivo ? (
          <>
            {/* Cambiar estado */}
            <div className="card space-y-3">
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Actualizar estado del reporte</p>
              <EstadoSelector value={nuevoEstado} onChange={setNuevoEstado} />
              <button
                onClick={handleGuardarEstado}
                disabled={guardandoEstado || nuevoEstado === reporteActivo?.estado}
                className="btn-primary disabled:opacity-40"
              >
                {guardandoEstado ? 'Guardando...' : '💾 Guardar estado'}
              </button>
            </div>

            {/* Añadir novedad */}
            <div className="card space-y-3">
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Registrar novedad</p>
              <form onSubmit={handleAgregarNovedad} className="space-y-2">
                <textarea
                  ref={novedadRef}
                  className="input resize-none"
                  rows={3}
                  placeholder="Describe el hallazgo, la reparación realizada o cualquier observación..."
                  value={novedadTexto}
                  onChange={(e) => setNovedadTexto(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={guardandoNovedad || !novedadTexto.trim()}
                  className="btn-primary disabled:opacity-40"
                >
                  {guardandoNovedad ? 'Guardando...' : '📝 Añadir novedad'}
                </button>
              </form>

              {/* Historial de novedades del reporte activo */}
              {reporteActivo.novedades?.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-gray-800">
                  <p className="text-xs text-gray-600">Novedades anteriores:</p>
                  {[...reporteActivo.novedades].reverse().map((n, i) => (
                    <div key={i} className="bg-gray-900 rounded-xl p-3 space-y-1">
                      <p className="text-gray-200 text-sm">{n.texto}</p>
                      <p className="text-gray-600 text-xs">
                        {n.usuario?.nombre && `👤 ${n.usuario.nombre} · `}
                        {new Date(n.fecha).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Info del reporte actual */}
            <div className={`rounded-2xl border p-4 space-y-2 ${colorEstado[reporteActivo.estado] || 'bg-gray-900 border-gray-700'}`}>
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Reporte más reciente</p>
              <p className="text-gray-300 text-sm">
                👤 {reporteActivo.usuario?.nombre} · 📅 {new Date(reporteActivo.fechaVisita).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
              {reporteActivo.descripcion && <p className="text-gray-300 text-sm">{reporteActivo.descripcion}</p>}
              {reporteActivo.fotos?.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {reporteActivo.fotos.map((f, i) => (
                    <img
                      key={i}
                      src={getMediaUrl(f)}
                      alt={`Foto ${i + 1}`}
                      className="w-20 h-20 rounded-xl object-cover border border-gray-600 cursor-pointer flex-shrink-0"
                      onClick={() => setLightboxSrc(getMediaUrl(f))}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-10 text-gray-600">
            <span className="text-4xl block mb-2">📋</span>
            <p>Sin reportes en este punto</p>
            <p className="text-sm mt-1">No hay nada que actualizar aún</p>
          </div>
        )}

        {/* Historial de reportes anteriores */}
        {reportes.length > 1 && (
          <div>
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">Historial ({reportes.length - 1} anteriores)</p>
            <div className="space-y-2">
              {reportes.slice(1).map((r) => (
                <div key={r._id} className="card flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-400 text-sm truncate">
                      {new Date(r.fechaVisita).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                      {' · '}
                      {r.usuario?.nombre}
                    </p>
                    {r.descripcion && <p className="text-gray-600 text-xs truncate italic">{r.descripcion}</p>}
                  </div>
                  <EstadoBadge estado={r.estado} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
