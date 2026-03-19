const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { v2: cloudinary } = require('cloudinary');

// Configurar Cloudinary con las variables de entorno
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Storage en Cloudinary (sin disco local)
const storage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => ({
    folder: file.fieldname === 'firma' ? 'pasteleria/firmas' : 'pasteleria/fotos',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'],
    resource_type: 'image',
  }),
});

const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    'image/jpeg', 'image/jpg', 'image/png',
    'image/gif', 'image/webp', 'image/svg+xml',
    'application/octet-stream',
  ];
  if (allowedMimes.includes(file.mimetype)) return cb(null, true);
  cb(new Error('Solo se permiten imágenes (jpeg, png, webp, svg, gif)'));
};

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter,
});

module.exports = upload;
module.exports.cloudinary = cloudinary; // exportar para poder eliminar imágenes por public_id
