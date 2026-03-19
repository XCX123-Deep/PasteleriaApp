const mongoose = require('mongoose');

// Caché de conexión para entornos serverless (Vercel)
// Evita abrir una nueva conexión en cada invocación de la función
let cached = global._mongoConn;
if (!cached) cached = global._mongoConn = { conn: null, promise: null };

const connectDB = async () => {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 20000,
    }).then((m) => {
      console.log(`✅ MongoDB conectado: ${m.connection.host}`);
      return m;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    console.error(`❌ Error MongoDB: ${error.message}`);
    process.exit(1);
  }
  return cached.conn;
};

module.exports = connectDB;
