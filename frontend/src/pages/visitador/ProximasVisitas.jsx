import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import toast from 'react-hot-toast';

export default function ProximasVisitas() {
  const navigate = useNavigate();
  const [visitas, setVisitas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/mantenimientos')
      .then(({ data }) => {
        const ordenadas = data.data.sort((a, b) => new Date(a.fechaHora) - new Date(b.fechaHora));
        setVisitas(ordenadas);
      })
      .catch(() => toast.error('Error cargando visitas'))
      .finally(() => setLoading(false));
  }, []);

  const urgencia = (fechaHora) => {
    const diff = new Date(fechaHora) - new Date();
    const dias = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (dias < 0) return { texto: 'Vencida', color: 'bg-red-950/60 border-red-800 text-red-400', icono: '🚨' };
    if (dias === 0) return { texto: 'Hoy', color: 'bg-orange-950/60 border-orange-700 text-orange-400', icono: '🔔' };
    if (dias === 1) return { texto: 'Mañana', color: 'bg-yellow-950/40 border-yellow-800 text-yellow-400', icono: '⏰' };
    if (dias <= 7) return { texto: `En ${dias} días`, color: 'bg-blue-950/30 border-blue-800 text-blue-400', icono: '📅' };
    return { texto: `En ${dias} días`, color: 'bg-gray-900 border-gray-700 text-gray-400', icono: '🗓' };
  };

  const pendientes = visitas.filter((v) => !v.completado);
  const completadas = visitas.filter((v) => v.completado);

  return (
    <div className="min-h-screen bg-gray-950">
      <div className="page-header">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-white p-1">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h1 className="font-bold text-white flex-1">📅 Próximas Visitas</h1>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="p-4 space-y-4 pb-8">
          {pendientes.length === 0 && completadas.length === 0 && (
            <div className="text-center py-16 text-gray-500">
              <span className="text-5xl block mb-3">📅</span>
              <p>No tienes visitas programadas</p>
            </div>
          )}

          {pendientes.length > 0 && (
            <div>
              <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">Pendientes ({pendientes.length})</p>
              <div className="space-y-3">
                {pendientes.map((v) => {
                  const urg = urgencia(v.fechaHora);
                  return (
                    <div
                      key={v._id}
                      className={`rounded-2xl border p-4 space-y-2 ${urg.color} cursor-pointer active:scale-[0.98] transition`}
                      onClick={() => navigate(`/punto/${v.puntoDeVenta?._id}`)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-white text-sm truncate">{urg.icono} {v.tipo}</p>
                          <p className="text-current text-xs truncate opacity-80">🏪 {v.puntoDeVenta?.nombre}</p>
                          <p className="text-current text-xs opacity-60">📍 {v.puntoDeVenta?.ciudad}</p>
                        </div>
                        <span className="text-xs font-bold uppercase px-2 py-0.5 rounded-full bg-black/30">{urg.texto}</span>
                      </div>
                      <p className="text-current text-xs opacity-70">
                        📅 {new Date(v.fechaHora).toLocaleString('es-CO', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                      {v.notas && <p className="text-current text-xs opacity-60 italic">{v.notas}</p>}
                      <div className="flex items-center gap-1 pt-1">
                        <span className="text-xs opacity-60">{v.frecuencia}</span>
                        <span className="text-xs opacity-40 ml-auto">Tap para ir al reporte →</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {completadas.length > 0 && (
            <div>
              <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">Completadas ({completadas.length})</p>
              <div className="space-y-2">
                {completadas.map((v) => (
                  <div key={v._id} className="card opacity-40 flex items-center gap-3">
                    <span className="text-green-400 text-xl">✓</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate line-through">{v.tipo}</p>
                      <p className="text-gray-500 text-xs truncate">{v.puntoDeVenta?.nombre}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
