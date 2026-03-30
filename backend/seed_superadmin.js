require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./src/config/db');
const Usuario = require('./src/models/Usuario');

const seedSuperAdmin = async () => {
  await connectDB();
  try {
    const email = 'superadmin@pasteleria.com';
    const existe = await Usuario.findOne({ email });
    if (existe) {
      await Usuario.deleteOne({ email });
      console.log('🗑️  Super Admin anterior eliminado para recrear.');
    }

    const superAdmin = new Usuario({
      nombre: 'Super Administrador',
      email,
      password: 'SuperAdmin2026!',
      rol: 'SUPER_ADMIN',
      telefono: '',
      activo: true,
    });

    await superAdmin.save();
    console.log('✅ Super Admin creado:');
    console.log('   Email:    superadmin@pasteleria.com');
    console.log('   Password: SuperAdmin2026!');
    console.log('   Rol:      SUPER_ADMIN');
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

seedSuperAdmin();
