import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { EstadoBadge } from '../../components/EstadoStatus';
import toast from 'react-hot-toast';

const EMPTY_FORM = {
  nombre: '',
  direccion: '',
  ciudad: '',
  contactoNombre: '',
  contactoTelefono: '',
  contactoEmail: '',
  notas: '',
};

export default function PuntosManager() {
  const navigate = useNavigate();
  const [puntos, setPuntos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showAsignModal, setShowAsignModal] = useState(null); // punto
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [asignSeleccion, setAsignSeleccion] = useState([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pRes, uRes] = await Promise.all([api.get('/puntos'), api.get('/usuarios')]);
      setPuntos(pRes.data.data);
      setUsuarios(uRes.data.data.filter((u) => u.activo));
    } catch {
      toast.error('Error cargando datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditId(null);
    setShowModal(true);
  };

  const openEdit = (punto) => {
    setForm({
      nombre: punto.nombre || '',
      direccion: punto.direccion || '',
      ciudad: punto.ciudad || '',
      contactoNombre: punto.contactoNombre || '',
      contactoTelefono: punto.contactoTelefono || '',
      contactoEmail: punto.contactoEmail || '',
      notas: punto.notas || '',
    });
    setEditId(punto._id);
    setShowModal(true);
  };

  const openAsignar = (punto) => {
    setShowAsignModal(punto);
    setAsignSeleccion(punto.usuariosAsignados.map((u) => u._id));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.nombre || !form.direccion || !form.ciudad) {
      toast.error('Nombre, dirección y ciudad son obligatorios');
      return;
    }
    setSaving(true);
    try {
      if (editId) {
        await api.put(`/puntos/${editId}`, form);
        toast.success('Punto actualizado');
      } else {
        await api.post('/puntos', form);
        toast.success('Punto creado');
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Desactivar este punto de venta?')) return;
    try {
      await api.delete(`/puntos/${id}`);
      toast.success('Punto desactivado');
      fetchData();
    } catch { toast.error('Error al desactivar'); }
  };

  const handleAsignar = async () => {
    try {
      await api.post(`/puntos/${showAsignModal._id}/asignar`, { usuariosIds: asignSeleccion });
      toast.success('Usuarios asignados');
      setShowAsignModal(null);
      fetchData();
    } catch { toast.error('Error al asignar'); }
  };

  const toggleAsign = (uid) => {
    setAsignSeleccion((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <div className="page-header">
        <button onClick={() => navigate('/admin')} className="text-gray-400 hover:text-white p-1">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="font-bold text-white flex-1">Puntos de Venta</h1>
        <button onClick={openCreate} className="bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold px-4 py-2 rounded-xl active:scale-95 transition-all">
          + Nuevo
        </button>
      </div>

      <div className="p-4 space-y-3 pb-8">
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="card animate-pulse h-20 bg-gray-800" />
            ))}
          </div>
        ) : puntos.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <span className="text-5xl block mb-3">🏪</span>
            <p className="font-medium">No hay puntos de venta</p>
            <p className="text-sm mt-1">Crea el primer punto</p>
          </div>
        ) : (
          puntos.map((punto) => (
            <div key={punto._id} className="card space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white truncate">{punto.nombre}</p>
                  <p className="text-gray-400 text-sm truncate">📍 {punto.ciudad} — {punto.direccion}</p>
                  {punto.contactoNombre && (
                    <p className="text-gray-500 text-xs mt-0.5">👤 {punto.contactoNombre} {punto.contactoTelefono && `· ${punto.contactoTelefono}`}</p>
                  )}
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${punto.activo ? 'bg-green-950 text-green-400' : 'bg-gray-800 text-gray-500'}`}>
                  {punto.activo ? 'Activo' : 'Inactivo'}
                </span>
              </div>

              {/* Usuarios asignados */}
              <div className="flex flex-wrap gap-1.5">
                {punto.usuariosAsignados.length === 0 ? (
                  <span className="text-gray-600 text-xs">Sin visitadores asignados</span>
                ) : (
                  punto.usuariosAsignados.map((u) => (
                    <span key={u._id} className="bg-gray-800 text-gray-300 text-xs px-2 py-1 rounded-lg">
                      {u.nombre}
                    </span>
                  ))
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button onClick={() => openEdit(punto)} className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-xl active:scale-95 transition-all">
                  ✏️ Editar
                </button>
                <button onClick={() => openAsignar(punto)} className="flex-1 py-2 bg-brand-950 hover:bg-brand-900 text-brand-300 text-sm font-medium rounded-xl border border-brand-800 active:scale-95 transition-all">
                  👥 Asignar
                </button>
                <button onClick={() => handleDelete(punto._id)} className="py-2 px-3 bg-red-950 hover:bg-red-900 text-red-400 text-sm font-medium rounded-xl active:scale-95 transition-all">
                  🗑️
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Crear/Editar */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end" onClick={() => setShowModal(false)}>
          <div className="bg-gray-900 rounded-t-3xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">{editId ? 'Editar Punto' : 'Nuevo Punto'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white text-xl">✕</button>
            </div>
            <form onSubmit={handleSave} className="space-y-3">
              {[
                { key: 'nombre', label: 'Nombre del punto *', placeholder: 'Ej: Pastelería Centro' },
                { key: 'direccion', label: 'Dirección *', placeholder: 'Calle 123 #45-67' },
                { key: 'ciudad', label: 'Ciudad *', placeholder: 'Bogotá' },
                { key: 'contactoNombre', label: 'Nombre de contacto', placeholder: 'Juan García' },
                { key: 'contactoTelefono', label: 'Teléfono de contacto', placeholder: '300 000 0000', type: 'tel' },
                { key: 'contactoEmail', label: 'Email de contacto', placeholder: 'contacto@punto.com', type: 'email' },
              ].map((field) => (
                <div key={field.key}>
                  <label className="label">{field.label}</label>
                  <input
                    type={field.type || 'text'}
                    className="input"
                    placeholder={field.placeholder}
                    value={form[field.key]}
                    onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                  />
                </div>
              ))}
              <div>
                <label className="label">Notas adicionales</label>
                <textarea
                  className="input resize-none"
                  rows={3}
                  placeholder="Observaciones..."
                  value={form.notas}
                  onChange={(e) => setForm({ ...form, notas: e.target.value })}
                />
              </div>
              <button type="submit" disabled={saving} className="btn-primary mt-2 disabled:opacity-60">
                {saving ? 'Guardando...' : editId ? 'Actualizar Punto' : 'Crear Punto'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Asignar Usuarios */}
      {showAsignModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end" onClick={() => setShowAsignModal(null)}>
          <div className="bg-gray-900 rounded-t-3xl w-full max-h-[70vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Asignar visitadores</h2>
              <button onClick={() => setShowAsignModal(null)} className="text-gray-400 text-xl">✕</button>
            </div>
            <p className="text-gray-400 text-sm mb-4">📍 {showAsignModal.nombre}</p>
            <div className="space-y-2 mb-5">
              {usuarios.map((u) => (
                <button
                  key={u._id}
                  type="button"
                  onClick={() => toggleAsign(u._id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all active:scale-[0.98] ${
                    asignSeleccion.includes(u._id)
                      ? 'bg-brand-950 border-brand-700 text-brand-300'
                      : 'bg-gray-800 border-gray-700 text-gray-300'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${asignSeleccion.includes(u._id) ? 'bg-brand-500 border-brand-500' : 'border-gray-600'}`}>
                    {asignSeleccion.includes(u._id) && <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-sm">{u.nombre}</p>
                    <p className="text-xs text-gray-500">{u.rol} · {u.email}</p>
                  </div>
                </button>
              ))}
            </div>
            <button onClick={handleAsignar} className="btn-primary">
              Guardar asignación
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
