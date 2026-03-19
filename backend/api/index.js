// Punto de entrada para Vercel (serverless)
// No llama a app.listen() — Vercel maneja el servidor por su cuenta
require('dotenv').config();
const app = require('../src/app');
const connectDB = require('../src/config/db');

// Conectar a MongoDB al iniciar la función (se cachea entre invocaciones)
connectDB();

module.exports = app;
