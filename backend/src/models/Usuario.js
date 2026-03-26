const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const usuarioSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, 'El nombre es requerido'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'El email es requerido'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'La contraseña es requerida'],
      minlength: 6,
      select: false,
    },
    rol: {
      type: String,
      enum: ['SUPER_ADMIN', 'ADMIN', 'LIDER', 'TECNICO', 'VISITADOR'],
      default: 'VISITADOR',
    },
    telefono: {
      type: String,
      trim: true,
    },
    activo: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Hash password antes de guardar
usuarioSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

// Comparar password
usuarioSchema.methods.compararPassword = async function (candidato) {
  return await bcrypt.compare(candidato, this.password);
};

module.exports = mongoose.model('Usuario', usuarioSchema);
