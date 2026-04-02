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

// GET /api/mantenimientos/:id
const obtenerUno = async (req, res, next) => {
  try {
    const m = await Mantenimiento.findById(req.params.id)
      .populate('puntoDeVenta', 'nombre ciudad direccion')
      .populate('visitador', 'nombre email')
      .populate('novedades.usuario', 'nombre email rol');
    if (!m || !m.activo) return res.status(404).json({ success: false, message: 'Mantenimiento no encontrado.' });

    // Validar acceso: admin ve todo; técnico solo el suyo
    if (!['ADMIN', 'SUPER_ADMIN'].includes(req.user.rol) &&
        m.visitador._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'No tienes acceso a este mantenimiento.' });
    }
    res.json({ success: true, data: m });
  } catch (err) { next(err); }
};

// POST /api/mantenimientos — solo ADMIN
const crear = async (req, res, next) => {
  try {
    const { puntoDeVenta, visitador, tipo, tipos, frecuencia, fechaHora, notas } = req.body;
    // Normalizar tipos: acepta array o string legacy
    const tiposArr = Array.isArray(tipos) && tipos.length
      ? tipos
      : (tipo ? [tipo] : []);
    const m = await Mantenimiento.create({
      puntoDeVenta, visitador,
      tipos: tiposArr,
      tipo: tiposArr[0] || tipo || '',   // compat
      frecuencia, fechaHora, notas,
    });
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
    const { puntoDeVenta, visitador, tipo, tipos, frecuencia, fechaHora, notas, completado } = req.body;
    const m = await Mantenimiento.findById(req.params.id);
    if (!m) return res.status(404).json({ success: false, message: 'No encontrado.' });

    if (puntoDeVenta) m.puntoDeVenta = puntoDeVenta;
    if (visitador) m.visitador = visitador;
    // Actualizar tipos
    if (Array.isArray(tipos) && tipos.length) {
      m.tipos = tipos;
      m.tipo  = tipos[0];       // compat
    } else if (tipo) {
      m.tipo  = tipo;
      m.tipos = [tipo];
    }
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
    if (completado !== undefined) {
      const val = completado === true || completado === 'true';
      m.completado = val;
      // Registrar timestamp exacto de completación
      m.completadoAt = val ? new Date() : null;
    }
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

module.exports = { listar, obtenerUno, crear, actualizar, eliminar, completarMantenimiento };
