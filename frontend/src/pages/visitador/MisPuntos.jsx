import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import toast from 'react-hot-toast';

export default function MisPuntos() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [puntos, setPuntos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ultimosReportes, setUltimosReportes] = useState({});
  const [crearNuevo, setCrearNuevo] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pRes, rRes] = await Promise.all([
          api.get('/puntos'),
          api.get('/reportes'),
        ]);
        setPuntos(pRes.data.data);
        const mapa = {};
        rRes.data.data.forEach((r) => {
          const pid = r.puntoDeVenta?._id;
          if (!pid) return;
          if (!mapa[pid] || new Date(r.fechaVisita) > new Date(mapa[pid].fechaVisita)) {
            mapa[pid] = r;
          }
        });
        setUltimosReportes(mapa);
      } catch { toast.error('Error cargando puntos'); }
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const irAlPunto = (puntoId) => {
    navigate(`/punto/${puntoId}`, { state: crearNuevo ? { modoNuevo: true } : undefined });
  };

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <div className="page-header justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-brand-400 to-brand-600 rounded-xl flex items-center justify-center">
            <span className="text-lg">🧁</span>
          </div>
          <div>
            <h1 className="font-bold text-white text-sm leading-tight">
              {crearNuevo ? '📝 Selecciona el punto' : 'Mis Puntos'}
            </h1>
            <p className="text-gray-400 text-xs">{user?.nombre}</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Botón ➕ / ✕ nuevo reporte */}
          <button
            onClick={() => setCrearNuevo((v) => !v)}
            title={crearNuevo ? 'Cancelar' : 'Nuevo reporte'}
            className={`p-2 rounded-xl transition-all ${
              crearNuevo
                ? 'bg-brand-600 text-white'
                : 'text-gray-400 hover:text-brand-400 hover:bg-brand-950/30'
            }`}
          >
            {crearNuevo ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            )}
          </button>

          {/* Próximas visitas */}
          <button
            onClick={() => navigate('/mis-visitas')}
            className="text-gray-400 hover:text-brand-400 transition-colors p-2 rounded-xl hover:bg-brand-950/30"
            title="Próximas visitas"
          >
            📅
          </button>

          {/* Logout */}
          <button onClick={logout} className="text-gray-400 hover:text-red-400 transition-colors p-2 rounded-xl hover:bg-red-950/30">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>

      {/* Banner guía cuando modo crear */}
      {crearNuevo && (
        <div className="mx-4 mt-2 bg-brand-900/40 border border-brand-700 rounded-2xl px-4 py-2.5 text-brand-300 text-sm flex items-center gap-2">
          <span>✍️</span>
          <span>Toca el punto donde quieres crear el reporte</span>
        </div>
      )}

      <div className="p-4 space-y-3 pb-8">
        <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">
          Puntos asignados — {puntos.length}
        </p>

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="card animate-pulse h-24 bg-gray-800" />)}
          </div>
        ) : puntos.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <span className="text-5xl block mb-3">📍</span>
            <p className="font-medium">Sin puntos asignados</p>
            <p className="text-sm mt-1">El administrador te asignará puntos pronto</p>
          </div>
        ) : (
          puntos.map((punto) => {
            const ultimoReporte = ultimosReportes[punto._id];
            const estadoActual = ultimoReporte?.estado || 'ROJO';
            const estadoBg = {
              ROJO:    'border-red-800/50',
              NARANJA: 'border-orange-800/50',
              VERDE:   'border-green-800/50',
            }[estadoActual];

            return (
              <button
                key={punto._id}
                onClick={() => irAlPunto(punto._id)}
                className={`w-full card text-left flex gap-4 items-center active:scale-[0.98] transition-all duration-150 hover:bg-gray-800 border ${estadoBg} ${crearNuevo ? 'ring-2 ring-brand-600/40' : ''}`}
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 text-2xl ${
                  estadoActual === 'ROJO' ? 'bg-red-950' : estadoActual === 'NARANJA' ? 'bg-orange-950' : 'bg-green-950'
                }`}>
                  {crearNuevo ? '➕' : (estadoActual === 'ROJO' ? '🔴' : estadoActual === 'NARANJA' ? '🟠' : '🟢')}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white truncate">{punto.nombre}</p>
                  <p className="text-gray-400 text-sm truncate">📍 {punto.ciudad}</p>
                  <p className="text-gray-500 text-xs truncate">{punto.direccion}</p>
                  {!crearNuevo && ultimoReporte && (
                    <p className="text-gray-600 text-xs mt-0.5">
                      Últ. visita: {new Date(ultimoReporte.fechaVisita).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                    </p>
                  )}
                  {crearNuevo && (
                    <p className="text-brand-400 text-xs mt-0.5 font-medium">Crear nuevo reporte aquí →</p>
                  )}
                </div>

                <svg className="w-4 h-4 text-gray-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
