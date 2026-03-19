const Reporte = require('../models/Reporte');
const PuntoDeVenta = require('../models/PuntoDeVenta');
const path = require('path');
const fs = require('fs');
const { cloudinary } = require('../middlewares/upload');

// GET /api/reportes — con filtros
const listarReportes = async (req, res, next) => {
  try {
    const { estado, puntoDeVenta, usuario, desde, hasta } = req.query;
    const filtro = {};

    // Visitador solo ve sus reportes
    if (req.user.rol !== 'ADMIN') {
      filtro.usuario = req.user._id;
    }

    if (estado) filtro.estado = estado.toUpperCase();
    if (puntoDeVenta) filtro.puntoDeVenta = puntoDeVenta;
    if (usuario && req.user.rol === 'ADMIN') filtro.usuario = usuario;
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

// GET /api/reportes/:id
const obtenerReporte = async (req, res, next) => {
  try {
    const reporte = await Reporte.findById(req.params.id)
      .populate('puntoDeVenta', 'nombre ciudad direccion contactoNombre contactoTelefono')
      .populate('usuario', 'nombre email rol');
    if (!reporte) return res.status(404).json({ success: false, message: 'Reporte no encontrado.' });
    res.json({ success: true, data: reporte });
  } catch (error) {
    next(error);
  }
};

// POST /api/reportes — Visitador/Líder crea reporte
const crearReporte = async (req, res, next) => {
  try {
    const { puntoDeVenta, estado, descripcion, fechaVisita } = req.body;

    // Verificar que el punto esté asignado al usuario (si no es ADMIN)
    if (req.user.rol !== 'ADMIN') {
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

    // Solo el dueño o ADMIN puede editar
    if (req.user.rol !== 'ADMIN' && reporte.usuario.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'No tienes permiso para editar este reporte.' });
    }

    const { estado, descripcion, fechaVisita } = req.body;
    if (estado) reporte.estado = estado.toUpperCase();
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

module.exports = { listarReportes, obtenerReporte, crearReporte, actualizarReporte, eliminarReporte };
