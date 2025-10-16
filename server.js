import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Importar rutas
import authRoutes from './routes/auth.js';
import imageRoutes from './routes/images.js';
import pushRoutes from './routes/push.js';

// Configurar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Conectar a MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pwa_app')
  .then(() => {
    console.log('✅ Conectado a MongoDB');
  })
  .catch((error) => {
    console.error('❌ Error conectando a MongoDB:', error);
    process.exit(1);
  });

// Middlewares
app.use(cors());
app.use(express.json());

// Middleware de logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/push', pushRoutes);

// Ruta de salud
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: '🚀 Servidor backend funcionando correctamente',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: mongoose.connection.readyState === 1 ? 'Conectado' : 'Desconectado'
  });
});

// Ruta principal
app.get('/', (req, res) => {
  res.json({
    message: 'Bienvenido al backend de la PWA',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      images: '/api/images',
      push: '/api/push',
      health: '/api/health'
    }
  });
});

// Manejo de rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Ruta no encontrada'
  });
});

// Manejo de errores global
app.use((error, req, res, next) => {
  console.error('❌ Error del servidor:', error);
  res.status(500).json({
    success: false,
    error: 'Error interno del servidor'
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log('=====================================');
  console.log(' Servidor backend iniciado');
  console.log(` URL: http://localhost:${PORT}`);
  console.log(' MONGODB_URI:', process.env.MONGODB_URI ? 'Cargada' : '❌ No cargada');
  console.log(` Notificaciones push: CONFIGURADAS`);
  console.log(` VAPID Key: ${process.env.VAPID_PUBLIC_KEY?.substring(0, 20)}...`);
  console.log(` JWT Auth: HABILITADO`);
  console.log('=====================================');
});

export default app;