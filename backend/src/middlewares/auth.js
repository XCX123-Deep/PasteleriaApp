const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');

// Verifica JWT y adjunta usuario a req
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No autorizado. Token requerido.',
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const usuario = await Usuario.findById(decoded.id).select('-password');
    if (!usuario || !usuario.activo) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no encontrado o inactivo.',
      });
    }

    req.user = usuario;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Token inválido o expirado.',
    });
  }
};

// Verifica que el usuario tenga uno de los roles permitidos.
// SUPER_ADMIN pasa automáticamente cualquier guard sin excepción.
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(403).json({ success: false, message: 'Acceso denegado.' });
    }
    // SUPER_ADMIN tiene acceso a todo
    if (req.user.rol === 'SUPER_ADMIN') return next();
    if (!roles.includes(req.user.rol)) {
      return res.status(403).json({
        success: false,
        message: `Acceso denegado. Se requiere rol: ${roles.join(', ')}.`,
      });
    }
    next();
  };
};

module.exports = { verifyToken, requireRole };
