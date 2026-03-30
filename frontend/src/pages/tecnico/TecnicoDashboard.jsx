import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import toast from 'react-hot-toast';

const estadoBg    = { ROJO: 'border-red-800/50', NARANJA: 'border-orange-800/50', VERDE: 'border-green-800/50' };
const estadoIcon  = { ROJO: '🔴', NARANJA: '🟠', VERDE: '🟢' };
const estadoFondo = { ROJO: 'bg-red-950', NARANJA: 'bg-orange-950', VERDE: 'bg-green-950' };

function proximidad(fechaHora) {
  const diff = new Date(fechaHora) - new Date();
  const dias  = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (dias < 0)  return { texto: 'Vencido',  color: 'text-red-400',    bg: 'bg-red-950/60 border-red-800' };
  if (dias === 0) return { texto: 'Hoy',      color: 'text-orange-400', bg: 'bg-orange-950/60 border-orange-800' };
  if (dias === 1) return { texto: 'Mañana',   color: 'text-yellow-400', bg: 'bg-yellow-950/60 border-yellow-800' };
  return { texto: `En ${dias} días`, color: 'text-gray-400', bg: 'bg-gray-800/60 border-gray-700' };
}

export default function TecnicoDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [puntos, setPuntos]               = useState([]);
  const [ultimosReportes, setUltimosReportes] = useState({});
  const [mantenimientos, setMantenimientos] = useState([]);
  const [loading, setLoading]             = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pRes, rRes, mRes] = await Promise.all([
          api.get('/puntos'),
          api.get('/reportes'),
          api.get('/mantenimientos', { params: { completado: false } }),
        ]);
        setPuntos(pRes.data.data);
        // Mapa último reporte por punto
        const mapa = {};
        rRes.data.data.forEach((r) => {
          const pid = r.puntoDeVenta?._id;
          if (!pid) return;
          if (!mapa[pid] || new Date(r.fechaVisita) > new Date(mapa[pid].fechaVisita)) mapa[pid] = r;
        });
        setUltimosReportes(mapa);
        // Ordenar por fecha más próxima primero
        setMantenimientos(mRes.data.data.sort((a, b) => new Date(a.fechaHora) - new Date(b.fechaHora)));
      } catch {
        toast.error('Error cargando datos');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const resumen = { ROJO: 0, NARANJA: 0, VERDE: 0, SIN: 0 };
  puntos.forEach((p) => {
    const r = ultimosReportes[p._id];
    if (r) resumen[r.estado] = (resumen[r.estado] || 0) + 1;
    else resumen.SIN += 1;
  });

  return (
    <div className="min-h-screen bg-gray-950">
      <div className="page-header justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-teal-400 to-teal-600 rounded-xl flex items-center justify-center">
            <span className="text-lg">🔧</span>
          </div>
          <div>
            <h1 className="font-bold text-white text-sm leading-tight">Panel Técnico</h1>
            <p className="text-gray-400 text-xs">{user?.nombre}</p>
          </div>
        </div>
        <button onClick={logout} className="text-gray-400 hover:text-red-400 transition-colors p-2 rounded-xl hover:bg-red-950/30">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>

      <div className="p-4 space-y-5 pb-8">

        {/* ── Próximos mantenimientos ───────────────────────────────── */}
        <div>
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">
            🔧 Mantenimientos asignados
          </p>
          {loading ? (
            <div className="space-y-2">
              {[...Array(2)].map((_, i) => <div key={i} className="card animate-pulse h-16 bg-gray-800" />)}
            </div>
          ) : mantenimientos.length === 0 ? (
            <div className="card text-center py-6 text-gray-600">
              <span className="text-3xl block mb-1">📭</span>
              <p className="text-sm">Sin mantenimientos pendientes</p>
            </div>
          ) : (
            <div className="space-y-2">
              {mantenimientos.map((m) => {
                const prox = proximidad(m.fechaHora);
                const fechaStr = new Date(m.fechaHora).toLocaleString('es-CO', {
                  weekday: 'short', day: '2-digit', month: 'short',
                  hour: '2-digit', minute: '2-digit',
                });
                return (
                  <div key={m._id} className={`card flex items-center gap-3 border ${prox.bg}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-semibold text-white text-sm truncate">{m.tipo}</p>
                        <span className={`text-xs font-bold flex-shrink-0 ${prox.color}`}>{prox.texto}</span>
                      </div>
                      <p className="text-gray-400 text-xs truncate">🏪 {m.puntoDeVenta?.nombre}</p>
                      <p className="text-gray-500 text-xs">📅 {fechaStr}</p>
                      {m.notas && <p className="text-gray-600 text-xs truncate mt-0.5">📝 {m.notas}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Resumen de puntos ─────────────────────────────────────── */}
        {!loading && puntos.length > 0 && (
          <div className="grid grid-cols-4 gap-2">
            {[
              { key: 'ROJO',   emoji: '🔴', label: 'Críticos', bg: 'bg-red-950/60 border-red-800' },
              { key: 'NARANJA',emoji: '🟠', label: 'Alerta',   bg: 'bg-orange-950/60 border-orange-800' },
              { key: 'VERDE',  emoji: '🟢', label: 'OK',       bg: 'bg-green-950/60 border-green-800' },
              { key: 'SIN',    emoji: '⬜', label: 'Sin rep.', bg: 'bg-gray-800 border-gray-700' },
            ].map(({ key, emoji, label, bg }) => (
              <div key={key} className={`rounded-2xl border p-2 text-center ${bg}`}>
                <p className="text-xl">{emoji}</p>
                <p className="text-white font-bold text-lg leading-none">{resumen[key]}</p>
                <p className="text-gray-400 text-[10px] mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── Mis puntos ────────────────────────────────────────────── */}
        <div>
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">
            Mis puntos — {puntos.length}
          </p>
          {loading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="card animate-pulse h-24 bg-gray-800" />)}</div>
          ) : puntos.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <span className="text-5xl block mb-3">🔧</span>
              <p className="font-medium">Sin puntos asignados</p>
            </div>
          ) : (
            puntos.map((punto) => {
              const r = ultimosReportes[punto._id];
              const estado = r?.estado || 'ROJO';
              return (
                <button
                  key={punto._id}
                  onClick={() => navigate(`/tecnico/punto/${punto._id}`)}
                  className={`w-full card text-left flex gap-4 items-center active:scale-[0.98] transition-all duration-150 hover:bg-gray-800 border mb-2 ${estadoBg[estado]}`}
                >
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 text-2xl ${estadoFondo[estado]}`}>
                    {estadoIcon[estado]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white truncate">{punto.nombre}</p>
                    <p className="text-gray-400 text-sm truncate">📍 {punto.ciudad}</p>
                    <p className="text-gray-500 text-xs truncate">{punto.direccion}</p>
                    {r ? (
                      <p className="text-gray-600 text-xs mt-0.5">
                        Últ. reporte: {new Date(r.fechaVisita).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                        {r.novedades?.length > 0 && ` · ${r.novedades.length} novedad${r.novedades.length > 1 ? 'es' : ''}`}
                      </p>
                    ) : (
                      <p className="text-gray-700 text-xs mt-0.5">Sin reportes aún</p>
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
    </div>
  );
}

export default function TecnicoDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [puntos, setPuntos] = useState([]);
  const [ultimosReportes, setUltimosReportes] = useState({});
  const [loading, setLoading] = useState(true);

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
          if (!mapa[pid] || new Date(r.fechaVisita) > new Date(mapa[pid].fechaVisita)) mapa[pid] = r;
        });
        setUltimosReportes(mapa);
      } catch {
        toast.error('Error cargando puntos');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const resumen = { ROJO: 0, NARANJA: 0, VERDE: 0, SIN: 0 };
  puntos.forEach((p) => {
    const r = ultimosReportes[p._id];
    if (r) resumen[r.estado] = (resumen[r.estado] || 0) + 1;
    else resumen.SIN += 1;
  });

  return (
    <div className="min-h-screen bg-gray-950">
      <div className="page-header justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-teal-400 to-teal-600 rounded-xl flex items-center justify-center">
            <span className="text-lg">🔧</span>
          </div>
          <div>
            <h1 className="font-bold text-white text-sm leading-tight">Panel Técnico</h1>
            <p className="text-gray-400 text-xs">{user?.nombre}</p>
          </div>
        </div>
        <button onClick={logout} className="text-gray-400 hover:text-red-400 transition-colors p-2 rounded-xl hover:bg-red-950/30">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>

      <div className="p-4 space-y-4 pb-8">
        {/* Resumen */}
        {!loading && puntos.length > 0 && (
          <div className="grid grid-cols-4 gap-2">
            {[
              { key: 'ROJO', emoji: '🔴', label: 'Críticos', bg: 'bg-red-950/60 border-red-800' },
              { key: 'NARANJA', emoji: '🟠', label: 'Alerta', bg: 'bg-orange-950/60 border-orange-800' },
              { key: 'VERDE', emoji: '🟢', label: 'OK', bg: 'bg-green-950/60 border-green-800' },
              { key: 'SIN', emoji: '⬜', label: 'Sin rep.', bg: 'bg-gray-800 border-gray-700' },
            ].map(({ key, emoji, label, bg }) => (
              <div key={key} className={`rounded-2xl border p-2 text-center ${bg}`}>
                <p className="text-xl">{emoji}</p>
                <p className="text-white font-bold text-lg leading-none">{resumen[key]}</p>
                <p className="text-gray-400 text-[10px] mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        )}

        <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Mis puntos — {puntos.length}</p>

        {loading ? (
          <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="card animate-pulse h-24 bg-gray-800" />)}</div>
        ) : puntos.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <span className="text-5xl block mb-3">🔧</span>
            <p className="font-medium">Sin puntos asignados</p>
          </div>
        ) : (
          puntos.map((punto) => {
            const r = ultimosReportes[punto._id];
            const estado = r?.estado || 'ROJO';
            return (
              <button
                key={punto._id}
                onClick={() => navigate(`/tecnico/punto/${punto._id}`)}
                className={`w-full card text-left flex gap-4 items-center active:scale-[0.98] transition-all duration-150 hover:bg-gray-800 border ${estadoBg[estado]}`}
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 text-2xl ${estadoFondo[estado]}`}>
                  {estadoIcon[estado]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white truncate">{punto.nombre}</p>
                  <p className="text-gray-400 text-sm truncate">📍 {punto.ciudad}</p>
                  <p className="text-gray-500 text-xs truncate">{punto.direccion}</p>
                  {r ? (
                    <p className="text-gray-600 text-xs mt-0.5">
                      Últ. reporte: {new Date(r.fechaVisita).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                      {r.novedades?.length > 0 && ` · ${r.novedades.length} novedad${r.novedades.length > 1 ? 'es' : ''}`}
                    </p>
                  ) : (
                    <p className="text-gray-700 text-xs mt-0.5">Sin reportes aún</p>
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
