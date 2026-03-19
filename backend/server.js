require('dotenv').config();
const app = require('./src/app');
const connectDB = require('./src/config/db');

// Conectar MongoDB (se cachea en Vercel entre invocaciones)
connectDB();

// Solo llama listen() en entorno local (no en Vercel serverless)
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
    console.log(`📁 Ambiente: ${process.env.NODE_ENV}`);
    console.log(`🌐 URL: http://localhost:${PORT}`);
  });
}

// Exportar para Vercel
module.exports = app;
