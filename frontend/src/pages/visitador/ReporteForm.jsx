import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import SignatureCanvas from 'react-signature-canvas';
import api from '../../api/client';
import { getMediaUrl } from '../../api/mediaUrl';
import { EstadoBadge, EstadoSelector } from '../../components/EstadoStatus';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

/* ── Lightbox ─────────────────────────────────────────────────────────────── */
function Lightbox({ src, onClose, onDownload }) {
  if (!src) return null;
  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="relative max-w-full max-h-full" onClick={(e) => e.stopPropagation()}>
        <img src={src} alt="Vista completa" className="max-h-[80vh] max-w-[90vw] rounded-2xl object-contain" />
        <div className="absolute top-2 right-2 flex gap-2">
          {onDownload && (
            <button
              onClick={onDownload}
              className="w-9 h-9 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white backdrop-blur transition"
              title="Descargar"
            >
              ⬇️
            </button>
          )}
          <button
            onClick={onClose}
            className="w-9 h-9 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white backdrop-blur transition text-lg"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Thumbnail de foto ─────────────────────────────────────────────────────── */
function FotoThumb({ src, onRemove, onOpen, label }) {
  return (
    <div className="relative group">
      <img
        src={src}
        alt={label || 'Foto'}
        className="w-20 h-20 rounded-xl object-cover border border-gray-700 cursor-pointer active:scale-95 transition"
        onClick={onOpen}
      />
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-600 text-white rounded-full text-xs flex items-center justify-center active:scale-90"
        >✕</button>
      )}
    </div>
  );
}

/* ── Componente principal ──────────────────────────────────────────────────── */
export default function ReporteForm() {
  const { puntoId } = useParams();
  const navigate = useNavigate();
  const sigRef = useRef(null);
  const { isAdmin, isTecnico, user } = useAuth();

  const [punto, setPunto] = useState(null);
  const [reporteExistente, setReporteExistente] = useState(null);
  const [form, setForm] = useState({ estado: 'ROJO', descripcion: '', fechaVisita: new Date().toISOString().split('T')[0] });

  // Fotos nuevas (File[]) y sus previews (dataURL[])
  const [fotos, setFotos] = useState([]);
  const [fotosPreviews, setFotosPreviews] = useState([]);

  // Firma
  const [firmaGuardada, setFirmaGuardada] = useState(false);
  const [firmaUrl, setFirmaUrl] = useState(null); // URL de firma existente en BD

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('reporte');
  const [historial, setHistorial] = useState([]);

  // Lightbox
  const [lightboxSrc, setLightboxSrc] = useState(null);

  /* Cargar datos */
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pRes, rRes] = await Promise.all([
          api.get(`/puntos/${puntoId}`),
          // Filtrar solo el reporte del usuario actual en este punto
          api.get('/reportes', { params: { puntoDeVenta: puntoId, usuario: user._id } }),
        ]);
        setPunto(pRes.data.data);
        const reportes = rRes.data.data;
        setHistorial(reportes);
        if (reportes.length > 0) {
          const ultimo = reportes[0];
          setReporteExistente(ultimo);
          setForm({
            estado: ultimo.estado,
            descripcion: ultimo.descripcion || '',
            fechaVisita: new Date(ultimo.fechaVisita).toISOString().split('T')[0],
          });
          // Cargar firma existente para mostrarla
          if (ultimo.firma) setFirmaUrl(getMediaUrl(ultimo.firma));
        }
      } catch { toast.error('Error cargando información'); }
      finally { setLoading(false); }
    };
    fetchData();
  }, [puntoId]);

  /* Manejo de fotos nuevas */
  const handleFotos = (e) => {
    const files = Array.from(e.target.files);
    if (fotos.length + files.length > 5) { toast.error('Máximo 5 fotos'); return; }
    setFotos((prev) => [...prev, ...files]);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => setFotosPreviews((prev) => [...prev, ev.target.result]);
      reader.readAsDataURL(file);
    });
  };

  const removeFoto = (idx) => {
    setFotos((prev) => prev.filter((_, i) => i !== idx));
    setFotosPreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  const limpiarFirma = () => {
    sigRef.current?.clear();
    setFirmaGuardada(false);
    setFirmaUrl(null);
  };

  /* Descargar imagen */
  const descargar = (url, nombre = 'evidencia.jpg') => {
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    a.target = '_blank';
    a.click();
  };

  /* Submit */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('puntoDeVenta', puntoId);
      formData.append('estado', form.estado);
      formData.append('descripcion', form.descripcion);
      formData.append('fechaVisita', form.fechaVisita);
      fotos.forEach((f) => formData.append('fotos', f));

      // Firma: solo enviar si el usuario dibujó una nueva
      if (sigRef.current && !sigRef.current.isEmpty()) {
        const dataUrl = sigRef.current.toDataURL('image/png');
        const blob = await (await fetch(dataUrl)).blob();
        formData.append('firma', blob, 'firma.png');
      }

      let resData;
      if (reporteExistente) {
        const r = await api.put(`/reportes/${reporteExistente._id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        resData = r.data.data;
        toast.success('✅ Reporte actualizado');
      } else {
        const r = await api.post('/reportes', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        resData = r.data.data;
        toast.success('✅ Reporte creado');
      }
      // Actualizar estado local con datos frescos del servidor
      setReporteExistente(resData);
      if (resData?.firma) setFirmaUrl(getMediaUrl(resData.firma));
      setFotos([]);
      setFotosPreviews([]);
      navigate(-1);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const fotosExistentes = reporteExistente?.fotos || [];

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Lightbox */}
      <Lightbox
        src={lightboxSrc}
        onClose={() => setLightboxSrc(null)}
        onDownload={lightboxSrc ? () => descargar(lightboxSrc) : null}
      />

      {/* Header */}
      <div className="page-header">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-white p-1">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-white text-sm truncate">{punto?.nombre}</h1>
          <p className="text-gray-400 text-xs truncate">📍 {punto?.ciudad}</p>
        </div>
        {reporteExistente && <EstadoBadge estado={reporteExistente.estado} />}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800">
        {['reporte', 'historial'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${activeTab === tab ? 'text-brand-400 border-b-2 border-brand-400' : 'text-gray-500 hover:text-gray-300'}`}
          >
            {tab === 'reporte' ? '📝 Reporte' : `📋 Historial (${historial.length})`}
          </button>
        ))}
      </div>

      {activeTab === 'reporte' ? (
        <form onSubmit={handleSubmit} className="p-4 space-y-5 pb-24">
          {/* Info del punto */}
          <div className="card space-y-1.5">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Información del punto</p>
            <p className="text-gray-200 text-sm">{punto?.direccion}</p>
            {punto?.contactoNombre && <p className="text-gray-400 text-sm">👤 {punto.contactoNombre} {punto.contactoTelefono && `· ${punto.contactoTelefono}`}</p>}
            {punto?.notas && <p className="text-gray-500 text-xs italic">{punto.notas}</p>}
          </div>

          {/* Estado */}
          <div>
            <label className="label text-base font-semibold text-white mb-3 block">Estado del reporte</label>
            {isAdmin() || isTecnico() ? (
              <EstadoSelector value={form.estado} onChange={(e) => setForm({ ...form, estado: e })} />
            ) : (
              <div className="flex items-center gap-3">
                <EstadoBadge estado={form.estado} />
                <p className="text-gray-500 text-xs">El estado lo asigna el administrador</p>
              </div>
            )}
          </div>

          {/* Fecha */}
          <div>
            <label className="label">Fecha de visita</label>
            <input
              type="date"
              className="input"
              value={form.fechaVisita}
              onChange={(e) => setForm({ ...form, fechaVisita: e.target.value })}
            />
          </div>

          {/* Descripción */}
          <div>
            <label className="label">Descripción / hallazgos</label>
            <textarea
              className="input resize-none"
              rows={4}
              placeholder="Describe el problema, hallazgo o estado de la instalación..."
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
            />
          </div>

          {/* Fotos */}
          <div>
            <label className="label">Evidencia fotográfica ({fotosExistentes.length + fotos.length}/5)</label>
            <div className="flex gap-2 flex-wrap">
              {/* Fotos existentes del reporte (guardadas en servidor) */}
              {fotosExistentes.map((url, i) => (
                <FotoThumb
                  key={`ex-${i}`}
                  src={getMediaUrl(url)}
                  label={`Foto ${i + 1}`}
                  onOpen={() => setLightboxSrc(getMediaUrl(url))}
                />
              ))}
              {/* Fotos nuevas (preview local) */}
              {fotosPreviews.map((src, i) => (
                <FotoThumb
                  key={`new-${i}`}
                  src={src}
                  label="Nueva"
                  onRemove={() => removeFoto(i)}
                  onOpen={() => setLightboxSrc(src)}
                />
              ))}
              {/* Botón agregar */}
              {fotosExistentes.length + fotos.length < 5 && (
                <label className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-700 flex flex-col items-center justify-center cursor-pointer hover:border-brand-500 transition-colors active:scale-95">
                  <span className="text-2xl">📷</span>
                  <span className="text-xs text-gray-500 mt-0.5">Agregar</span>
                  <input type="file" accept="image/*" multiple capture="environment" className="hidden" onChange={handleFotos} />
                </label>
              )}
            </div>
          </div>

          {/* Firma electrónica */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Firma electrónica</label>
              <button type="button" onClick={limpiarFirma} className="text-xs text-gray-500 hover:text-gray-300 underline">Limpiar</button>
            </div>

            {/* Firma existente */}
            {firmaUrl && !firmaGuardada && (
              <div className="mb-3">
                <p className="text-xs text-gray-500 mb-1.5">Firma guardada:</p>
                <div className="relative inline-block">
                  <img
                    src={firmaUrl}
                    alt="Firma existente"
                    className="h-20 rounded-xl border border-gray-600 bg-gray-800 object-contain cursor-pointer"
                    onClick={() => setLightboxSrc(firmaUrl)}
                  />
                  <button
                    type="button"
                    onClick={() => descargar(firmaUrl, 'firma.png')}
                    className="absolute top-1 right-1 w-6 h-6 bg-black/60 text-white rounded-full text-xs flex items-center justify-center"
                    title="Descargar firma"
                  >⬇️</button>
                </div>
                <p className="text-xs text-gray-500 mt-1.5">Dibuja abajo para reemplazarla.</p>
              </div>
            )}

            <div className="relative">
              <SignatureCanvas
                ref={sigRef}
                penColor="#f97316"
                canvasProps={{
                  className: 'sigCanvas',
                  style: { width: '100%', height: '140px' },
                }}
                onEnd={() => setFirmaGuardada(true)}
              />
              {!firmaGuardada && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <p className="text-gray-600 text-sm">✍️ {firmaUrl ? 'Nueva firma (reemplaza la guardada)' : 'Dibuja tu firma aquí'}</p>
                </div>
              )}
            </div>
          </div>

          {/* Submit */}
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-gray-950/95 backdrop-blur border-t border-gray-800">
            <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  Guardando...
                </span>
              ) : reporteExistente ? '💾 Actualizar Reporte' : '✅ Crear Reporte'}
            </button>
          </div>
        </form>
      ) : (
        /* Historial */
        <div className="p-4 space-y-3 pb-8">
          {historial.length === 0 ? (
            <div className="text-center py-16 text-gray-500"><span className="text-4xl block mb-3">📋</span><p>Sin reportes previos</p></div>
          ) : (
            historial.map((r) => (
              <div key={r._id} className="card space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-gray-400 text-sm">👤 {r.usuario?.nombre}</p>
                  <EstadoBadge estado={r.estado} />
                </div>
                {r.descripcion && <p className="text-gray-300 text-sm">{r.descripcion}</p>}
                <p className="text-gray-500 text-xs">🕐 {new Date(r.fechaVisita).toLocaleDateString('es-CO', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}</p>
                {r.fotos?.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {r.fotos.map((f, i) => (
                      <FotoThumb
                        key={i}
                        src={getMediaUrl(f)}
                        label={`Foto ${i + 1}`}
                        onOpen={() => setLightboxSrc(getMediaUrl(f))}
                      />
                    ))}
                  </div>
                )}
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
            ))
          )}
        </div>
      )}
    </div>
  );
}
