const PuntoDeVenta = require('../models/PuntoDeVenta');

// GET /api/puntos — ADMIN: todos; VISITADOR: sus puntos asignados
const listarPuntos = async (req, res, next) => {
  try {
    let puntos;
    if (req.user.rol === 'ADMIN') {
      puntos = await PuntoDeVenta.find().populate('usuariosAsignados', 'nombre email rol').sort({ createdAt: -1 });
    } else {
      puntos = await PuntoDeVenta.find({
        usuariosAsignados: req.user._id,
        activo: true,
      }).populate('usuariosAsignados', 'nombre email rol').sort({ nombre: 1 });
    }
    res.json({ success: true, data: puntos });
  } catch (error) {
    next(error);
  }
};

// GET /api/puntos/:id
const obtenerPunto = async (req, res, next) => {
  try {
    const punto = await PuntoDeVenta.findById(req.params.id).populate('usuariosAsignados', 'nombre email rol telefono');
    if (!punto) return res.status(404).json({ success: false, message: 'Punto de venta no encontrado.' });
    res.json({ success: true, data: punto });
  } catch (error) {
    next(error);
  }
};

// POST /api/puntos — ADMIN
const crearPunto = async (req, res, next) => {
  try {
    const { nombre, direccion, ciudad, contactoNombre, contactoTelefono, contactoEmail, notas } = req.body;
    const punto = await PuntoDeVenta.create({ nombre, direccion, ciudad, contactoNombre, contactoTelefono, contactoEmail, notas });
    res.status(201).json({ success: true, message: 'Punto de venta creado.', data: punto });
  } catch (error) {
    next(error);
  }
};

// PUT /api/puntos/:id — ADMIN
const actualizarPunto = async (req, res, next) => {
  try {
    const punto = await PuntoDeVenta.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!punto) return res.status(404).json({ success: false, message: 'Punto de venta no encontrado.' });
    res.json({ success: true, message: 'Punto actualizado.', data: punto });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/puntos/:id — ADMIN (soft delete)
const eliminarPunto = async (req, res, next) => {
  try {
    const punto = await PuntoDeVenta.findByIdAndUpdate(req.params.id, { activo: false }, { new: true });
    if (!punto) return res.status(404).json({ success: false, message: 'Punto de venta no encontrado.' });
    res.json({ success: true, message: 'Punto desactivado.' });
  } catch (error) {
    next(error);
  }
};

// POST /api/puntos/:id/asignar — ADMIN
const asignarUsuarios = async (req, res, next) => {
  try {
    const { usuariosIds } = req.body; // array de IDs
    if (!Array.isArray(usuariosIds)) {
      return res.status(400).json({ success: false, message: 'usuariosIds debe ser un array.' });
    }
    const punto = await PuntoDeVenta.findByIdAndUpdate(
      req.params.id,
      { usuariosAsignados: usuariosIds },
      { new: true }
    ).populate('usuariosAsignados', 'nombre email rol');
    if (!punto) return res.status(404).json({ success: false, message: 'Punto de venta no encontrado.' });
    res.json({ success: true, message: 'Usuarios asignados exitosamente.', data: punto });
  } catch (error) {
    next(error);
  }
};

module.exports = { listarPuntos, obtenerPunto, crearPunto, actualizarPunto, eliminarPunto, asignarUsuarios };
