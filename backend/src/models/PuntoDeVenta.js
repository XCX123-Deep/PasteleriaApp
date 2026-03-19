const mongoose = require('mongoose');

const puntoDeVentaSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, 'El nombre del punto de venta es requerido'],
      trim: true,
    },
    direccion: {
      type: String,
      required: [true, 'La dirección es requerida'],
      trim: true,
    },
    ciudad: {
      type: String,
      required: [true, 'La ciudad es requerida'],
      trim: true,
    },
    contactoNombre: {
      type: String,
      trim: true,
    },
    contactoTelefono: {
      type: String,
      trim: true,
    },
    contactoEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    notas: {
      type: String,
      trim: true,
    },
    activo: {
      type: Boolean,
      default: true,
    },
    usuariosAsignados: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Usuario',
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('PuntoDeVenta', puntoDeVentaSchema);
