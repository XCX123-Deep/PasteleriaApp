import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import toast from 'react-hot-toast';

const EMPTY_FORM = { nombre: '', email: '', password: '', rol: 'VISITADOR', telefono: '' };

export default function UsuariosManager() {
  const navigate = useNavigate();
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchUsuarios = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/usuarios');
      setUsuarios(data.data);
    } catch { toast.error('Error cargando usuarios'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUsuarios(); }, []);

  const openCreate = () => { setForm(EMPTY_FORM); setEditId(null); setShowModal(true); };
  const openEdit = (u) => {
    setForm({ nombre: u.nombre, email: u.email, password: '', rol: u.rol, telefono: u.telefono || '' });
    setEditId(u._id);
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.nombre || !form.email) { toast.error('Nombre y email son obligatorios'); return; }
    if (!editId && !form.password) { toast.error('La contraseña es obligatoria'); return; }
    setSaving(true);
    try {
      const body = { ...form };
      if (editId && !form.password) delete body.password;
      if (editId) await api.put(`/usuarios/${editId}`, body);
      else await api.post('/usuarios', body);
      toast.success(editId ? 'Usuario actualizado' : 'Usuario creado');
      setShowModal(false);
      fetchUsuarios();
    } catch (err) { toast.error(err.response?.data?.message || 'Error al guardar'); }
    finally { setSaving(false); }
  };

  const toggleActivo = async (u) => {
    try {
      await api.put(`/usuarios/${u._id}`, { activo: !u.activo });
      toast.success(u.activo ? 'Usuario desactivado' : 'Usuario activado');
      fetchUsuarios();
    } catch { toast.error('Error'); }
  };

  const rolColors = { ADMIN: 'text-purple-400 bg-purple-950 border-purple-800', LIDER: 'text-blue-400 bg-blue-950 border-blue-800', TECNICO: 'text-teal-400 bg-teal-950 border-teal-800', VISITADOR: 'text-violet-300 bg-violet-950 border-violet-800' };

  return (
    <div className="min-h-screen bg-gray-950">
      <div className="page-header">
        <button onClick={() => navigate('/admin')} className="text-gray-400 hover:text-white p-1">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h1 className="font-bold text-white flex-1">Usuarios</h1>
        <button onClick={openCreate} className="bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold px-4 py-2 rounded-xl active:scale-95 transition-all">+ Nuevo</button>
      </div>

      <div className="p-4 space-y-3 pb-8">
        {loading ? (
          <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="card animate-pulse h-16 bg-gray-800" />)}</div>
        ) : usuarios.length === 0 ? (
          <div className="text-center py-16 text-gray-500"><span className="text-5xl block mb-3">👥</span><p>No hay usuarios</p></div>
        ) : (
          usuarios.map((u) => (
            <div key={u._id} className="card flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {u.nombre.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-white text-sm truncate">{u.nombre}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium flex-shrink-0 ${rolColors[u.rol]}`}>{u.rol}</span>
                </div>
              <p className="text-xs text-gray-500">{u.email}</p>
                {u.telefono && <p className="text-gray-500 text-xs">📞 {u.telefono}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <button onClick={() => openEdit(u)} className="text-xs text-gray-400 hover:text-white bg-gray-800 px-3 py-1.5 rounded-lg active:scale-95 transition-all">Editar</button>
                <button onClick={() => toggleActivo(u)} className={`text-xs px-3 py-1.5 rounded-lg active:scale-95 transition-all ${u.activo ? 'bg-red-950 text-red-400' : 'bg-green-950 text-green-400'}`}>
                  {u.activo ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end" onClick={() => setShowModal(false)}>
          <div className="bg-gray-900 rounded-t-3xl w-full max-h-[85vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">{editId ? 'Editar Usuario' : 'Nuevo Usuario'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 text-xl">✕</button>
            </div>
            <form onSubmit={handleSave} className="space-y-3">
              <div><label className="label">Nombre completo *</label><input className="input" placeholder="Nombre Apellido" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></div>
              <div><label className="label">Correo electrónico *</label><input type="email" className="input" placeholder="usuario@correo.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><label className="label">{editId ? 'Nueva contraseña (dejar vacío para mantener)' : 'Contraseña *'}</label><input type="password" className="input" placeholder="Mínimo 6 caracteres" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
              <div><label className="label">Teléfono</label><input type="tel" className="input" placeholder="300 000 0000" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} /></div>
              <div>
                <label className="label">Rol</label>
                <select className="input" value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value })}>
                  <option value="VISITADOR">Asesor</option>
                  <option value="LIDER">Líder</option>
                  <option value="TECNICO">Técnico</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>
              <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
                {saving ? 'Guardando...' : editId ? 'Actualizar' : 'Crear Usuario'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
