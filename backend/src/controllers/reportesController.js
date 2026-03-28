const Reporte = require('../models/Reporte');
const PuntoDeVenta = require('../models/PuntoDeVenta');
const Usuario = require('../models/Usuario');
const { cloudinary } = require('../middlewares/upload');
const { enviarEmailReporte } = require('../services/emailService');

// Obtiene los emails de todos los admins activos en la BD
const getEmailsAdmins = async () => {
  const admins = await Usuario.find(
    { rol: { $in: ['ADMIN', 'SUPER_ADMIN'] }, activo: true },
    'email'
  ).lean();
  return admins.map((a) => a.email);
};

// GET /api/reportes — con filtros
const listarReportes = async (req, res, next) => {
  try {
    const { estado, puntoDeVenta, usuario, desde, hasta } = req.query;
    const filtro = {};

    // Filtro por rol:
    // ADMIN/SUPER_ADMIN → sin restricción
    // LIDER/TECNICO     → todos los reportes de sus puntos asignados
    // VISITADOR         → solo sus propios reportes
    if (req.user.rol === 'LIDER' || req.user.rol === 'TECNICO') {
      const puntosAsignados = await PuntoDeVenta.find(
        { usuariosAsignados: req.user._id, activo: true },
        '_id'
      ).lean();
      filtro.puntoDeVenta = { $in: puntosAsignados.map((p) => p._id) };
    } else if (req.user.rol !== 'ADMIN') {
      filtro.usuario = req.user._id;
    }

    if (estado) filtro.estado = estado.toUpperCase();
    if (puntoDeVenta) filtro.puntoDeVenta = puntoDeVenta;
    // ADMIN puede filtrar por cualquier usuario; los demás solo por su propio ID
    if (usuario) {
      if (req.user.rol === 'ADMIN' || usuario === req.user._id.toString()) {
        filtro.usuario = usuario;
      }
    }
    if (desde || hasta) {
      filtro.fechaVisita = {};
      if (desde) filtro.fechaVisita.$gte = new Date(desde);
      if (hasta) filtro.fechaVisita.$lte = new Date(hasta);
    }

    const reportes = await Reporte.find(filtro)
      .populate('puntoDeVenta', 'nombre ciudad direccion')
      .populate('usuario', 'nombre email rol')
      .sort({ fechaVisita: -1 });

    res.json({ success: true, data: reportes });
  } catch (error) {
    next(error);
  }
};

// GET /api/reportes/:id — valida acceso por rol
const obtenerReporte = async (req, res, next) => {
  try {
    const reporte = await Reporte.findById(req.params.id)
      .populate('puntoDeVenta', 'nombre ciudad direccion contactoNombre contactoTelefono')
      .populate('usuario', 'nombre email rol')
      .populate('novedades.usuario', 'nombre email rol');
    if (!reporte) return res.status(404).json({ success: false, message: 'Reporte no encontrado.' });

    // No-admin: solo ve reportes de sus puntos asignados o propios
    if (!['ADMIN', 'SUPER_ADMIN'].includes(req.user.rol)) {
      const esPropietario = reporte.usuario._id.toString() === req.user._id.toString();
      if (!esPropietario) {
        // Verificar que el punto esté asignado al usuario
        const punto = await PuntoDeVenta.findOne({
          _id: reporte.puntoDeVenta._id,
          usuariosAsignados: req.user._id,
        });
        if (!punto) return res.status(403).json({ success: false, message: 'No tienes acceso a este reporte.' });
      }
    }

    res.json({ success: true, data: reporte });
  } catch (error) {
    next(error);
  }
};

// POST /api/reportes — Visitador/Líder/Técnico crea reporte
const crearReporte = async (req, res, next) => {
  try {
    const { puntoDeVenta, estado, descripcion, fechaVisita } = req.body;

    // ADMIN y SUPER_ADMIN pueden crear en cualquier punto
    if (!['ADMIN', 'SUPER_ADMIN'].includes(req.user.rol)) {
      const punto = await PuntoDeVenta.findOne({ _id: puntoDeVenta, usuariosAsignados: req.user._id });
      if (!punto) {
        return res.status(403).json({ success: false, message: 'No tienes acceso a este punto de venta.' });
      }
    }

    // Procesar archivos subidos — Cloudinary devuelve la URL en file.path
    const fotos = [];
    if (req.files?.fotos) {
      req.files.fotos.forEach((f) => fotos.push(f.path));
    }

    const reporte = await Reporte.create({
      puntoDeVenta,
      usuario: req.user._id,
      estado: estado || 'ROJO',
      descripcion,
      fotos,
      firma: req.files?.firma ? req.files.firma[0].path : null,
      fechaVisita: fechaVisita || Date.now(),
    });

    const populado = await reporte.populate([
      { path: 'puntoDeVenta', select: 'nombre ciudad' },
      { path: 'usuario', select: 'nombre email' },
    ]);

    // Notificar a los admins — fire-and-forget
    getEmailsAdmins()
      .then((emails) => enviarEmailReporte(populado, 'creado', emails))
      .catch(() => {});

    res.status(201).json({ success: true, message: 'Reporte creado exitosamente.', data: populado });
  } catch (error) {
    next(error);
  }
};

// PUT /api/reportes/:id — Actualizar reporte
const actualizarReporte = async (req, res, next) => {
  try {
    const reporte = await Reporte.findById(req.params.id);
    if (!reporte) return res.status(404).json({ success: false, message: 'Reporte no encontrado.' });

    // Solo el dueño, ADMIN o TÉCNICO (en sus puntos) puede editar
    const puedeEditar =
      req.user.rol === 'ADMIN' ||
      req.user.rol === 'SUPER_ADMIN' ||
      req.user.rol === 'TECNICO' ||
      reporte.usuario.toString() === req.user._id.toString();
    if (!puedeEditar) {
      return res.status(403).json({ success: false, message: 'No tienes permiso para editar este reporte.' });
    }

    const { estado, descripcion, fechaVisita } = req.body;
    // ADMIN, SUPER_ADMIN y TÉCNICO pueden cambiar el estado
    if (estado && ['ADMIN', 'SUPER_ADMIN', 'TECNICO'].includes(req.user.rol)) {
      reporte.estado = estado.toUpperCase();
    }
    if (descripcion !== undefined) reporte.descripcion = descripcion;
    if (fechaVisita) reporte.fechaVisita = new Date(fechaVisita);

    // Agregar nuevas fotos si se suben
    if (req.files?.fotos) {
      req.files.fotos.forEach((f) => reporte.fotos.push(f.path));
    }
    // Reemplazar firma si se sube
    if (req.files?.firma) {
      reporte.firma = req.files.firma[0].path;
    }

    await reporte.save();
    const populado = await reporte.populate([
      { path: 'puntoDeVenta', select: 'nombre ciudad' },
      { path: 'usuario', select: 'nombre email' },
    ]);

    // Notificar a los admins — fire-and-forget
    getEmailsAdmins()
      .then((emails) => enviarEmailReporte(populado, 'actualizado', emails))
      .catch(() => {});

    res.json({ success: true, message: 'Reporte actualizado.', data: populado });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/reportes/:id — Solo ADMIN
const eliminarReporte = async (req, res, next) => {
  try {
    const reporte = await Reporte.findById(req.params.id);
    if (!reporte) return res.status(404).json({ success: false, message: 'Reporte no encontrado.' });

    // Eliminar imágenes de Cloudinary
    const extractPublicId = (url) => {
      if (!url || !url.includes('cloudinary.com')) return null;
      const parts = url.split('/');
      const fileWithExt = parts[parts.length - 1];
      const folder = parts[parts.length - 2];
      return `${folder}/${fileWithExt.split('.')[0]}`;
    };
    const eliminarDeCloud = async (url) => {
      const pid = extractPublicId(url);
      if (pid) await cloudinary.uploader.destroy(pid).catch(() => {});
    };

    await Promise.all([
      ...(reporte.fotos || []).map(eliminarDeCloud),
      reporte.firma ? eliminarDeCloud(reporte.firma) : Promise.resolve(),
    ]);

    await reporte.deleteOne();
    res.json({ success: true, message: 'Reporte eliminado.' });
  } catch (error) {
    next(error);
  }
};

// POST /api/reportes/:id/novedad — TÉCNICO y ADMIN
const agregarNovedad = async (req, res, next) => {
  try {
    const { texto } = req.body;
    if (!texto || !texto.trim()) {
      return res.status(400).json({ success: false, message: 'El texto de la novedad es requerido.' });
    }
    const reporte = await Reporte.findById(req.params.id);
    if (!reporte) return res.status(404).json({ success: false, message: 'Reporte no encontrado.' });

    reporte.novedades.push({ texto: texto.trim(), usuario: req.user._id });
    await reporte.save();

    // Populate la última novedad para devolverla
    await reporte.populate('novedades.usuario', 'nombre email rol');
    const ultima = reporte.novedades[reporte.novedades.length - 1];

    res.status(201).json({ success: true, message: 'Novedad registrada.', data: ultima });
  } catch (error) {
    next(error);
  }
};

module.exports = { listarReportes, obtenerReporte, crearReporte, actualizarReporte, eliminarReporte, agregarNovedad };
