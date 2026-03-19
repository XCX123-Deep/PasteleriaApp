import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import toast from 'react-hot-toast';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  Title, Tooltip, Legend, LineElement, PointElement,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, LineElement, PointElement);

function KpiCard({ icon, label, value, sub, color = 'brand' }) {
  const colors = {
    brand: 'from-brand-600/20 to-brand-400/10 border-brand-500/20 text-brand-300',
    red: 'from-red-950/60 to-red-900/20 border-red-800/40 text-red-400',
    orange: 'from-orange-950/60 to-orange-900/20 border-orange-800/40 text-orange-400',
    green: 'from-green-950/60 to-green-900/20 border-green-800/40 text-green-400',
  };
  return (
    <div className={`bg-gradient-to-br ${colors[color]} rounded-2xl p-4 border flex flex-col gap-1`}>
      <p className="text-xs font-medium opacity-80">{icon} {label}</p>
      <p className="text-3xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs opacity-60">{sub}</p>}
    </div>
  );
}

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await api.get('/stats');
        setStats(data.data);
      } catch {
        toast.error('Error cargando estadísticas');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  // Datos para gráfico de barras evolución semanal
  const evolucionData = stats?.evolucion?.length > 0 ? {
    labels: stats.evolucion.map((s) => `Sem ${s._id.semana}`),
    datasets: [
      { label: '🔴 Rojo', data: stats.evolucion.map((s) => s.ROJO), backgroundColor: '#ef4444aa', borderRadius: 6 },
      { label: '🟠 Naranja', data: stats.evolucion.map((s) => s.NARANJA), backgroundColor: '#f97316aa', borderRadius: 6 },
      { label: '🟢 Verde', data: stats.evolucion.map((s) => s.VERDE), backgroundColor: '#22c55eaa', borderRadius: 6 },
    ],
  } : null;

  const chartOptions = {
    responsive: true,
    plugins: { legend: { labels: { color: '#9ca3af', font: { size: 11 } } }, title: { display: false } },
    scales: {
      x: { ticks: { color: '#6b7280' }, grid: { color: '#1f2937' } },
      y: { ticks: { color: '#6b7280' }, grid: { color: '#1f2937' }, beginAtZero: true },
    },
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
            <h1 className="font-bold text-white text-sm leading-tight">Panel Admin</h1>
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
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[...Array(6)].map((_, i) => <div key={i} className="card animate-pulse h-24 bg-gray-800" />)}
          </div>
        ) : stats && (
          <>
            {/* KPIs principales */}
            <div>
              <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">Trazabilidad</p>
              <div className="grid grid-cols-2 gap-3">
                <KpiCard icon="🏪" label="Puntos activos" value={stats.totalPuntos} sub="en total" />
                <KpiCard icon="✅" label="Cumplimiento" value={`${stats.cumplimiento}%`} sub="últimos 30 días" color="green" />
                <KpiCard icon="🔴" label="Sin visita" value={stats.porEstado.ROJO} sub="reportes críticos" color="red" />
                <KpiCard icon="🟠" label="En proceso" value={stats.porEstado.NARANJA} sub="reportes" color="orange" />
              </div>
            </div>

            {/* Gráfico evolución semanal */}
            {evolucionData && (
              <div>
                <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">Evolución semanal</p>
                <div className="card">
                  <Bar data={evolucionData} options={chartOptions} />
                </div>
              </div>
            )}

            {/* Top problemáticos */}
            {stats.topProblematicos?.length > 0 && (
              <div>
                <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">⚠️ Más problemáticos (30 días)</p>
                <div className="space-y-2">
                  {stats.topProblematicos.map((p) => (
                    <div key={p._id} className="card flex items-center justify-between">
                      <div>
                        <p className="text-white text-sm font-medium">{p.nombre}</p>
                        <p className="text-gray-500 text-xs">{p.ciudad}</p>
                      </div>
                      <span className="text-red-400 font-bold text-sm">🔴 {p.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Acciones rápidas */}
        <div>
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">Acciones rápidas</p>
          <div className="space-y-2">
            {[
              { label: 'Puntos de Venta', icon: '🏪', path: '/admin/puntos' },
              { label: 'Usuarios', icon: '👥', path: '/admin/usuarios' },
              { label: 'Todos los Reportes', icon: '📋', path: '/admin/reportes' },
              { label: 'Mantenimientos', icon: '🔧', path: '/admin/mantenimientos' },
              { label: 'Calendario', icon: '📅', path: '/admin/calendario' },
            ].map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="w-full card flex items-center gap-4 hover:bg-gray-800 active:bg-gray-700 active:scale-[0.98] transition-all duration-150 text-left"
              >
                <span className="text-2xl">{item.icon}</span>
                <span className="font-medium text-gray-200">{item.label}</span>
                <svg className="w-4 h-4 text-gray-500 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
