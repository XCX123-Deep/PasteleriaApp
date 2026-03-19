const Usuario = require('../models/Usuario');

// GET /api/usuarios — Solo ADMIN / SUPER_ADMIN
// SUPER_ADMIN nunca aparece en la lista
const listarUsuarios = async (req, res, next) => {
  try {
    const usuarios = await Usuario.find({ rol: { $ne: 'SUPER_ADMIN' } }).sort({ createdAt: -1 });
    res.json({ success: true, data: usuarios });
  } catch (error) {
    next(error);
  }
};

// POST /api/usuarios — ADMIN crea usuario
const crearUsuario = async (req, res, next) => {
  try {
    const { nombre, email, password, rol, telefono } = req.body;
    const existe = await Usuario.findOne({ email });
    if (existe) {
      return res.status(409).json({ success: false, message: 'Ya existe un usuario con ese email.' });
    }
    const usuario = await Usuario.create({ nombre, email, password, rol, telefono });
    res.status(201).json({
      success: true,
      message: 'Usuario creado exitosamente.',
      data: { _id: usuario._id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol },
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/usuarios/:id — ADMIN edita usuario
const actualizarUsuario = async (req, res, next) => {
  try {
    const { nombre, email, rol, telefono, activo, password } = req.body;
    const usuario = await Usuario.findById(req.params.id).select('+password');
    if (!usuario) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    }
    if (nombre) usuario.nombre = nombre;
    if (email) usuario.email = email;
    if (rol) usuario.rol = rol;
    if (telefono !== undefined) usuario.telefono = telefono;
    if (activo !== undefined) usuario.activo = activo;
    if (password) usuario.password = password; // el pre-save lo hashea
    await usuario.save();
    // Devolver sin contraseña
    const { password: _pw, ...usuarioSafe } = usuario.toObject();
    res.json({ success: true, message: 'Usuario actualizado.', data: usuarioSafe });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/usuarios/:id
const eliminarUsuario = async (req, res, next) => {
  try {
    // Proteger contra auto-desactivación
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'No puedes desactivar tu propia cuenta.' });
    }

    const objetivo = await Usuario.findById(req.params.id);
    if (!objetivo) return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });

    // SUPER_ADMIN nunca puede ser desactivado por nadie
    if (objetivo.rol === 'SUPER_ADMIN') {
      return res.status(403).json({ success: false, message: 'No puedes modificar una cuenta SUPER_ADMIN.' });
    }

    // Un ADMIN corriente NO puede desactivar a otro ADMIN (solo SUPER_ADMIN puede)
    if (req.user.rol === 'ADMIN' && objetivo.rol === 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Solo el Super Administrador puede desactivar a un administrador.' });
    }

    objetivo.activo = false;
    await objetivo.save();
    res.json({ success: true, message: 'Usuario desactivado.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { listarUsuarios, crearUsuario, actualizarUsuario, eliminarUsuario };
