/**
 * Construye la URL absoluta de un archivo multimedia (fotos/firmas).
 * - Producción: las URLs son de Cloudinary (absolutas, se retornan tal cual)
 * - Desarrollo: usa el hostname del navegador + puerto 5000
 */
const MEDIA_BASE = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`;

export function getMediaUrl(path) {
  if (!path) return null;
  if (path.startsWith('http')) return path; // URLs absolutas (Cloudinary) → sin cambios
  return `${MEDIA_BASE}${path}`;
}
