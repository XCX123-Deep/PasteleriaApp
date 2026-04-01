const Reporte = require('../models/Reporte');
const PuntoDeVenta = require('../models/PuntoDeVenta');
const Usuario = require('../models/Usuario');
const { cloudinary } = require('../middlewares/upload');
const { enviarEmailReporte } = require('../services/emailService');

// Emails de todos los admins activos
const getEmailsAdmins = async () => {
  const admins = await Usuario.find(
    { rol: { $in: ['ADMIN', 'SUPER_ADMIN'] }, activo: true },
    'email'
  ).lean();
  return admins.map((a) => a.email);
};

// Emails de admins + líderes + asesores asignados al punto (sin duplicados)
const getDestinatarios = async (puntoId) => {
  const [admins, punto] = await Promise.all([
    Usuario.find({ rol: { $in: ['ADMIN', 'SUPER_ADMIN'] }, activo: true }, 'email').lean(),
    PuntoDeVenta.findById(puntoId).populate('usuariosAsignados', 'email rol').lean(),
  ]);
  // Incluir líderes Y asesores (visitadores) asignados al punto
  const emailsAsignados = (punto?.usuariosAsignados || [])
    .filter((u) => u.rol === 'LIDER' || u.rol === 'VISITADOR')
    .map((u) => u.email);
  const todos = [...new Set([...admins.map((a) => a.email), ...emailsAsignados])];
  return todos.filter(Boolean);
};

// GET /api/reportes — con filtros
const listarReportes = async (req, res, next) => {
  try {
    const { estado, puntoDeVenta, usuario, desde, hasta } = req.query;
    const filtro = {};

    if (req.user.rol === 'LIDER') {
      const puntosAsignados = await PuntoDeVenta.find(
        { usuariosAsignados: req.user._id, activo: true }, '_id'
      ).lean();
      filtro.puntoDeVenta = { $in: puntosAsignados.map((p) => p._id) };
    } else if (req.user.rol === 'TECNICO') {
      // Técnico ve: reportes de sus puntos + reportes donde está asignado como técnico
      const puntosAsignados = await PuntoDeVenta.find(
        { usuariosAsignados: req.user._id, activo: true }, '_id'
      ).lean();
      filtro.$or = [
        { puntoDeVenta: { $in: puntosAsignados.map((p) => p._id) } },
        { tecnicoAsignado: req.user._id },
      ];
    } else if (!['ADMIN', 'SUPER_ADMIN'].includes(req.user.rol)) {
      filtro.usuario = req.user._id;
    }

    if (estado) filtro.estado = estado.toUpperCase();

    // Para TECNICO: el puntoDeVenta se integra al $or para no sobreescribirlo
    if (puntoDeVenta) {
      if (req.user.rol === 'TECNICO' && filtro.$or) {
        // Ver reportes del punto específico donde el técnico sea creador o tecnicoAsignado
        delete filtro.$or;
        filtro.puntoDeVenta = puntoDeVenta;
        filtro.$or = [
          { usuario: req.user._id },
          { tecnicoAsignado: req.user._id },
        ];
      } else {
        filtro.puntoDeVenta = puntoDeVenta;
      }
    }

    if (usuario) {
      if (['ADMIN', 'SUPER_ADMIN'].includes(req.user.rol) || usuario === req.user._id.toString()) {
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
      .populate('tecnicoAsignado', 'nombre email')
      .sort({ fechaVisita: -1 });

    res.json({ success: true, data: reportes });
  } catch (error) { next(error); }
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
      // Guardar al mediodía UTC para evitar desfase de zona horaria
      fechaVisita: fechaVisita ? new Date(`${fechaVisita}T12:00:00.000Z`) : new Date(),
    });

    const populado = await reporte.populate([
      { path: 'puntoDeVenta', select: 'nombre ciudad' },
      { path: 'usuario', select: 'nombre email' },
    ]);

    // Responder al cliente primero — email se envía después manteniendo la fn viva
    res.status(201).json({ success: true, message: 'Reporte creado exitosamente.', data: populado });

    // await mantiene la función serverless viva hasta que el SMTP confirme
    try {
      const emails = await getDestinatarios(puntoDeVenta);
      await enviarEmailReporte(populado, 'creado', emails);
    } catch (_) {}
  } catch (error) {
    next(error);
  }
};

// PUT /api/reportes/:id — Actualizar reporte
const actualizarReporte = async (req, res, next) => {
  try {
    const reporte = await Reporte.findById(req.params.id);
    if (!reporte) return res.status(404).json({ success: false, message: 'Reporte no encontrado.' });

    const isAdmin   = ['ADMIN', 'SUPER_ADMIN'].includes(req.user.rol);
    const esDueño   = reporte.usuario.toString() === req.user._id.toString();
    const esTecAsig = reporte.tecnicoAsignado?.toString() === req.user._id.toString();

    // Solo admin, dueño o técnico asignado pueden editar
    if (!isAdmin && !esDueño && !esTecAsig) {
      return res.status(403).json({ success: false, message: 'No tienes permiso para editar este reporte.' });
    }

    const { estado, descripcion, fechaVisita } = req.body;
    // Solo admin o técnico asignado pueden cambiar el estado
    if (estado && (isAdmin || esTecAsig)) {
      reporte.estado = estado.toUpperCase();
    }
    if (descripcion !== undefined && (isAdmin || esDueño)) reporte.descripcion = descripcion;
    if (fechaVisita) reporte.fechaVisita = new Date(`${fechaVisita}T12:00:00.000Z`);

    if (req.files?.fotos) req.files.fotos.forEach((f) => reporte.fotos.push(f.path));
    if (req.files?.firma) reporte.firma = req.files.firma[0].path;

    await reporte.save();
    const populado = await reporte.populate([
      { path: 'puntoDeVenta', select: 'nombre ciudad' },
      { path: 'usuario', select: 'nombre email' },
      { path: 'tecnicoAsignado', select: 'nombre email' },
    ]);

    // Responder al cliente primero
    res.json({ success: true, message: 'Reporte actualizado.', data: populado });

    // await mantiene la función serverless viva hasta que el SMTP confirme
    try {
      const emails = await getDestinatarios(populado.puntoDeVenta._id);
      await enviarEmailReporte(populado, 'actualizado', emails);
    } catch (_) {}
  } catch (error) { next(error); }
};

// PUT /api/reportes/:id/tecnico — Solo ADMIN asigna técnico
const asignarTecnico = async (req, res, next) => {
  try {
    const { tecnicoId } = req.body;
    const reporte = await Reporte.findById(req.params.id);
    if (!reporte) return res.status(404).json({ success: false, message: 'Reporte no encontrado.' });

    reporte.tecnicoAsignado = tecnicoId || null;
    await reporte.save();
    const populado = await reporte.populate([
      { path: 'puntoDeVenta', select: 'nombre ciudad' },
      { path: 'usuario', select: 'nombre email' },
      { path: 'tecnicoAsignado', select: 'nombre email' },
    ]);
    res.json({ success: true, message: 'Técnico asignado.', data: populado });
  } catch (error) { next(error); }
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

    // Poblar para email y respuesta
    await reporte.populate([
      { path: 'puntoDeVenta', select: 'nombre ciudad' },
      { path: 'usuario', select: 'nombre email' },
      { path: 'novedades.usuario', select: 'nombre email rol' },
    ]);
    const ultima = reporte.novedades[reporte.novedades.length - 1];

    // Responder al cliente primero
    res.status(201).json({ success: true, message: 'Novedad registrada.', data: ultima });

    // await mantiene la función serverless viva hasta que el SMTP confirme
    try {
      const emails = await getDestinatarios(reporte.puntoDeVenta._id);
      await enviarEmailReporte(reporte, 'novedad', emails, { novedad: ultima.texto, autor: req.user.nombre });
    } catch (_) {}
  } catch (error) {
    next(error);
  }
};

module.exports = { listarReportes, obtenerReporte, crearReporte, actualizarReporte, eliminarReporte, agregarNovedad, asignarTecnico };
