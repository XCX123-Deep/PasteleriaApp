import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/client';
import { getMediaUrl } from '../../api/mediaUrl';
import { EstadoBadge } from '../../components/EstadoStatus';
import toast from 'react-hot-toast';

/* ── Lightbox simple ──────────────────────────────────────────────────────── */
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

export default function LiderPunto() {
  const { puntoId } = useParams();
  const navigate = useNavigate();

  const [punto, setPunto] = useState(null);
  const [reportes, setReportes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lightboxSrc, setLightboxSrc] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pRes, rRes] = await Promise.all([
          api.get(`/puntos/${puntoId}`),
          api.get('/reportes', { params: { puntoDeVenta: puntoId } }),
        ]);
        setPunto(pRes.data.data);
        setReportes(rRes.data.data);
      } catch {
        toast.error('Error cargando información del punto');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [puntoId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const ultimoReporte = reportes[0];

  return (
    <div className="min-h-screen bg-gray-950">
      <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />

      {/* Header */}
      <div className="page-header">
        <button onClick={() => navigate('/lider')} className="text-gray-400 hover:text-white p-1">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-white text-sm truncate">{punto?.nombre}</h1>
          <p className="text-gray-400 text-xs truncate">📍 {punto?.ciudad}</p>
        </div>
        {ultimoReporte && <EstadoBadge estado={ultimoReporte.estado} />}
      </div>

      <div className="p-4 space-y-4 pb-8">
        {/* Info del punto */}
        <div className="card space-y-1.5">
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Información del punto</p>
          <p className="text-gray-200 text-sm">{punto?.direccion}</p>
          {punto?.contactoNombre && (
            <p className="text-gray-400 text-sm">👤 {punto.contactoNombre}{punto.contactoTelefono && ` · ${punto.contactoTelefono}`}</p>
          )}
          {punto?.notas && <p className="text-gray-500 text-xs italic">{punto.notas}</p>}
        </div>

        {/* Visitadores asignados */}
        {punto?.usuariosAsignados?.length > 0 && (
          <div className="card space-y-2">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Usuarios asignados</p>
            {punto.usuariosAsignados.map((u) => (
              <div key={u._id} className="flex items-center gap-2">
                <div className="w-7 h-7 bg-indigo-900 rounded-full flex items-center justify-center text-xs font-bold text-indigo-300">
                  {u.nombre?.[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="text-white text-sm">{u.nombre} <span className="text-gray-600 text-xs">({u.rol})</span></p>
                  <p className="text-gray-500 text-xs">{u.email}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Botón crear reporte (el lider también puede reportar) */}
        <button
          onClick={() => navigate(`/punto/${puntoId}`)}
          className="btn-primary flex items-center justify-center gap-2"
        >
          <span>📝</span> Crear / Ver mi reporte
        </button>

        {/* Historial de todos los reportes del punto */}
        <div>
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">
            Historial de reportes ({reportes.length})
          </p>

          {reportes.length === 0 ? (
            <div className="text-center py-10 text-gray-600">
              <span className="text-4xl block mb-2">📋</span>
              <p>Sin reportes en este punto</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reportes.map((r) => (
                <div key={r._id} className={`rounded-2xl border p-4 space-y-2 ${colorEstado[r.estado] || 'bg-gray-900 border-gray-700'}`}>
                  {/* Cabecera */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-gray-700 rounded-full flex items-center justify-center text-xs font-bold text-gray-300">
                        {r.usuario?.nombre?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">{r.usuario?.nombre}</p>
                        <p className="text-gray-500 text-xs">{r.usuario?.email}</p>
                      </div>
                    </div>
                    <EstadoBadge estado={r.estado} />
                  </div>

                  {/* Fecha */}
                  <p className="text-gray-500 text-xs">
                    📅 {new Date(r.fechaVisita).toLocaleDateString('es-CO', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>

                  {/* Descripción */}
                  {r.descripcion && (
                    <p className="text-gray-300 text-sm leading-relaxed">{r.descripcion}</p>
                  )}

                  {/* Fotos */}
                  {r.fotos?.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {r.fotos.map((f, i) => (
                        <img
                          key={i}
                          src={getMediaUrl(f)}
                          alt={`Foto ${i + 1}`}
                          className="w-20 h-20 rounded-xl object-cover border border-gray-600 cursor-pointer active:scale-95 flex-shrink-0"
                          onClick={() => setLightboxSrc(getMediaUrl(f))}
                        />
                      ))}
                    </div>
                  )}

                  {/* Firma */}
                  {r.firma && (
                    <div>
                      <p className="text-gray-500 text-xs mb-1">Firma:</p>
                      <img
                        src={getMediaUrl(r.firma)}
                        alt="Firma"
                        className="h-12 rounded-lg border border-gray-700 bg-gray-800 object-contain cursor-pointer"
                        onClick={() => setLightboxSrc(getMediaUrl(r.firma))}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
