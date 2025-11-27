import express from 'express';
import { pushService } from '../pushService.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Suscribirse a notificaciones push (requiere autenticación)
router.post('/subscribe', authenticateToken, async (req, res) => {
  try {
    const { subscription } = req.body;
    
    if (!subscription) {
      return res.status(400).json({ 
        success: false,
        error: 'Subscription es requerida' 
      });
    }

    const result = await pushService.saveSubscription(req.user._id, subscription);
    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Enviar notificación a todos los usuarios
router.post('/send', authenticateToken, async (req, res) => {
  try {
    const { title, message, icon, url, image, tag } = req.body;
    
    if (!title) {
      return res.status(400).json({ 
        success: false,
        error: 'Title es requerido' 
      });
    }

    const results = await pushService.sendNotificationToAll(title, {
      body: message,
      icon: icon || '/icons/icon-192x192.png',
      image: image,
      data: { url: url || '/' },
      tag: tag || 'general'
    });

    res.json(results);
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Enviar notificación a un usuario específico
router.post('/send-to-user/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { title, message, icon, url, image, tag } = req.body;
    
    if (!title) {
      return res.status(400).json({ 
        success: false,
        error: 'Title es requerido' 
      });
    }

    const results = await pushService.sendNotificationToUser(userId, title, {
      body: message,
      icon: icon || '/icons/icon-192x192.png',
      image: image,
      data: { url: url || '/' },
      tag: tag || 'general'
    });

    res.json(results);
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Enviar notificación a múltiples usuarios
router.post('/send-to-users', authenticateToken, async (req, res) => {
  try {
    const { userIds, title, message, icon, url, image, tag } = req.body;
    
    if (!title || !userIds || !Array.isArray(userIds)) {
      return res.status(400).json({ 
        success: false,
        error: 'Title y userIds (array) son requeridos' 
      });
    }

    const results = await pushService.sendNotificationToUsers(userIds, title, {
      body: message,
      icon: icon || '/icons/icon-192x192.png',
      image: image,
      data: { url: url || '/' },
      tag: tag || 'general'
    });

    res.json(results);
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Obtener estadísticas de notificaciones
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const stats = await pushService.getStats();
    res.json({
      success: true,
      ...stats
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Eliminar suscripción del usuario actual
router.delete('/subscription', authenticateToken, async (req, res) => {
  try {
    const { endpoint } = req.body;
    
    if (!endpoint) {
      return res.status(400).json({ 
        success: false,
        error: 'Endpoint es requerido' 
      });
    }

    const result = await pushService.removeSubscription(req.user._id, endpoint);
    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

export default router;