const Mantenimiento = require('../models/Mantenimiento');
const { cloudinary } = require('../middlewares/upload');

// GET /api/mantenimientos
const listar = async (req, res, next) => {
  try {
    const filtro = { activo: true };
    if (!['ADMIN', 'SUPER_ADMIN'].includes(req.user.rol)) filtro.visitador = req.user._id;

    const { completado, desde, hasta } = req.query;
    if (completado !== undefined) filtro.completado = completado === 'true';
    if (desde || hasta) {
      filtro.fechaHora = {};
      if (desde) filtro.fechaHora.$gte = new Date(desde);
      if (hasta) filtro.fechaHora.$lte = new Date(hasta);
    }

    const mantenimientos = await Mantenimiento.find(filtro)
      .populate('puntoDeVenta', 'nombre ciudad direccion')
      .populate('visitador', 'nombre email')
      .populate('novedades.usuario', 'nombre email')
      .sort({ fechaHora: 1 });

    res.json({ success: true, data: mantenimientos });
  } catch (err) { next(err); }
};

// POST /api/mantenimientos — solo ADMIN
const crear = async (req, res, next) => {
  try {
    const { puntoDeVenta, visitador, tipo, frecuencia, fechaHora, notas } = req.body;
    const m = await Mantenimiento.create({ puntoDeVenta, visitador, tipo, frecuencia, fechaHora, notas });
    const populado = await m.populate([
      { path: 'puntoDeVenta', select: 'nombre ciudad' },
      { path: 'visitador', select: 'nombre email' },
    ]);
    res.status(201).json({ success: true, message: 'Mantenimiento programado.', data: populado });
  } catch (err) { next(err); }
};

// PUT /api/mantenimientos/:id — solo ADMIN
const actualizar = async (req, res, next) => {
  try {
    const { puntoDeVenta, visitador, tipo, frecuencia, fechaHora, notas, completado } = req.body;
    const m = await Mantenimiento.findById(req.params.id);
    if (!m) return res.status(404).json({ success: false, message: 'No encontrado.' });

    if (puntoDeVenta) m.puntoDeVenta = puntoDeVenta;
    if (visitador) m.visitador = visitador;
    if (tipo) m.tipo = tipo;
    if (frecuencia) m.frecuencia = frecuencia;
    if (fechaHora) m.fechaHora = new Date(fechaHora);
    if (notas !== undefined) m.notas = notas;
    if (completado !== undefined) m.completado = completado;

    await m.save();
    const populado = await m.populate([
      { path: 'puntoDeVenta', select: 'nombre ciudad' },
      { path: 'visitador', select: 'nombre email' },
    ]);
    res.json({ success: true, message: 'Mantenimiento actualizado.', data: populado });
  } catch (err) { next(err); }
};

// PATCH /api/mantenimientos/:id/completar — TÉCNICO (solo el asignado)
const completarMantenimiento = async (req, res, next) => {
  try {
    const m = await Mantenimiento.findById(req.params.id);
    if (!m) return res.status(404).json({ success: false, message: 'Mantenimiento no encontrado.' });

    // Solo el técnico asignado puede completarlo
    if (!['ADMIN', 'SUPER_ADMIN'].includes(req.user.rol) &&
        m.visitador.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'No tienes permiso para editar este mantenimiento.' });
    }

    const { completado, notas, novedad } = req.body;
    if (completado !== undefined) m.completado = completado === true || completado === 'true';
    if (notas !== undefined) m.notas = notas;

    // Fotos subidas via Cloudinary
    if (req.files?.fotos) req.files.fotos.forEach((f) => m.fotos.push(f.path));
    if (req.files?.firma) m.firma = req.files.firma[0].path;

    // Novedad de texto
    if (novedad && novedad.trim()) {
      m.novedades.push({ texto: novedad.trim(), usuario: req.user._id });
    }

    await m.save();
    await m.populate([
      { path: 'puntoDeVenta', select: 'nombre ciudad' },
      { path: 'visitador', select: 'nombre email' },
      { path: 'novedades.usuario', select: 'nombre email' },
    ]);
    res.json({ success: true, message: 'Mantenimiento actualizado.', data: m });
  } catch (err) { next(err); }
};

// DELETE /api/mantenimientos/:id — solo ADMIN (soft delete)
const eliminar = async (req, res, next) => {
  try {
    const m = await Mantenimiento.findByIdAndUpdate(req.params.id, { activo: false }, { new: true });
    if (!m) return res.status(404).json({ success: false, message: 'No encontrado.' });
    res.json({ success: true, message: 'Mantenimiento eliminado.' });
  } catch (err) { next(err); }
};

module.exports = { listar, crear, actualizar, eliminar, completarMantenimiento };
