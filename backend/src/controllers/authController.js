const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');

const generarToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email y contraseña requeridos.' });
    }

    const usuario = await Usuario.findOne({ email }).select('+password');
    if (!usuario || !usuario.activo) {
      return res.status(401).json({ success: false, message: 'Credenciales inválidas.' });
    }

    const passwordOk = await usuario.compararPassword(password);
    if (!passwordOk) {
      return res.status(401).json({ success: false, message: 'Credenciales inválidas.' });
    }

    const token = generarToken(usuario._id);
    res.json({
      success: true,
      data: {
        token,
        usuario: {
          _id: usuario._id,
          nombre: usuario.nombre,
          email: usuario.email,
          rol: usuario.rol,
          telefono: usuario.telefono,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/auth/me
const getMe = (req, res) => {
  res.json({ success: true, data: req.user });
};

module.exports = { login, getMe };
