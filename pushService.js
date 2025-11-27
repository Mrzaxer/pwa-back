import webpush from 'web-push';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

// Configurar web-push con las claves VAPID
webpush.setVapidDetails(
  `mailto:${process.env.VAPID_EMAIL}`,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

class PushService {
  constructor() {
    console.log('🔔 Servicio de notificaciones push inicializado');
  }

  // Guardar suscripción para un usuario
  async saveSubscription(userId, subscription) {
    try {
      const user = await User.findById(userId);
      
      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      await user.addPushSubscription(subscription);
      
      console.log('📱 Nueva suscripción push guardada para usuario:', user.username);
      return { 
        success: true, 
        message: 'Suscripción guardada correctamente'
      };
    } catch (error) {
      console.error('❌ Error guardando suscripción:', error);
      throw error;
    }
  }

  // Enviar notificación a todos los usuarios
  async sendNotificationToAll(title, options = {}) {
    try {
      const users = await User.find({ isActive: true }).populate('pushSubscriptions');
      let totalSent = 0;
      let totalFailed = 0;

      console.log(`📤 Enviando notificación a ${users.length} usuarios:`, title);

      for (const user of users) {
        if (user.pushSubscriptions && user.pushSubscriptions.length > 0) {
          for (const subscription of user.pushSubscriptions) {
            try {
              await this.sendNotification(subscription, title, options);
              totalSent++;
            } catch (error) {
              totalFailed++;
              console.error(`❌ Error enviando a ${user.username}:`, error.message);
              
              // Si la suscripción es inválida, eliminarla
              if (error.statusCode === 410) {
                await user.removePushSubscription(subscription.endpoint);
              }
            }
          }
        }
      }

      console.log(`✅ Notificaciones enviadas: ${totalSent} exitosas, ${totalFailed} fallidas`);
      return {
        success: true,
        message: `Notificaciones enviadas: ${totalSent} exitosas, ${totalFailed} fallidas`,
        results: {
          sent: totalSent,
          failed: totalFailed,
          totalUsers: users.length
        }
      };
    } catch (error) {
      console.error('❌ Error enviando notificaciones a todos:', error);
      throw error;
    }
  }

  // Enviar notificación a un usuario específico
  async sendNotificationToUser(userId, title, options = {}) {
    try {
      const user = await User.findById(userId).populate('pushSubscriptions');
      
      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      if (!user.pushSubscriptions || user.pushSubscriptions.length === 0) {
        return {
          success: false,
          message: 'El usuario no tiene suscripciones push activas'
        };
      }

      let sent = 0;
      let failed = 0;

      for (const subscription of user.pushSubscriptions) {
        try {
          await this.sendNotification(subscription, title, options);
          sent++;
        } catch (error) {
          failed++;
          console.error(`❌ Error enviando a ${user.username}:`, error.message);
          
          if (error.statusCode === 410) {
            await user.removePushSubscription(subscription.endpoint);
          }
        }
      }

      return {
        success: true,
        message: `Notificaciones enviadas a ${user.username}: ${sent} exitosas, ${failed} fallidas`,
        results: { sent, failed }
      };
    } catch (error) {
      console.error('❌ Error enviando notificación a usuario:', error);
      throw error;
    }
  }

  // Enviar notificación a múltiples usuarios específicos
  async sendNotificationToUsers(userIds, title, options = {}) {
    try {
      const users = await User.find({ 
        _id: { $in: userIds },
        isActive: true 
      }).populate('pushSubscriptions');

      let totalSent = 0;
      let totalFailed = 0;
      const results = [];

      console.log(`📤 Enviando notificación a ${users.length} usuarios específicos:`, title);

      for (const user of users) {
        let userSent = 0;
        let userFailed = 0;

        if (user.pushSubscriptions && user.pushSubscriptions.length > 0) {
          for (const subscription of user.pushSubscriptions) {
            try {
              await this.sendNotification(subscription, title, options);
              userSent++;
              totalSent++;
            } catch (error) {
              userFailed++;
              totalFailed++;
              console.error(`❌ Error enviando a ${user.username}:`, error.message);
              
              if (error.statusCode === 410) {
                await user.removePushSubscription(subscription.endpoint);
              }
            }
          }
        }

        results.push({
          userId: user._id,
          username: user.username,
          sent: userSent,
          failed: userFailed,
          totalSubscriptions: user.pushSubscriptions?.length || 0
        });
      }

      console.log(`✅ Notificaciones enviadas a usuarios específicos: ${totalSent} exitosas, ${totalFailed} fallidas`);
      return {
        success: true,
        message: `Notificaciones enviadas: ${totalSent} exitosas, ${totalFailed} fallidas`,
        results: {
          totalSent,
          totalFailed,
          userResults: results
        }
      };
    } catch (error) {
      console.error('❌ Error enviando notificaciones a usuarios específicos:', error);
      throw error;
    }
  }

  // Enviar notificación individual
  async sendNotification(subscription, title, options = {}) {
    const payload = JSON.stringify({
      title: title,
      body: options.body || 'Tienes una nueva notificación',
      icon: options.icon || '/icons/icon-192x192.png',
      image: options.image,
      badge: '/icons/icon-72x72.png',
      data: options.data || { url: '/' },
      tag: options.tag || 'general',
      timestamp: Date.now()
    });

    try {
      await webpush.sendNotification(subscription, payload);
      return { success: true };
    } catch (error) {
      console.error('❌ Error enviando notificación:', error.message);
      throw error;
    }
  }

  // Eliminar suscripción de un usuario
  async removeSubscription(userId, endpoint) {
    try {
      const user = await User.findById(userId);
      
      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      await user.removePushSubscription(endpoint);
      console.log('🗑️ Suscripción eliminada para usuario:', user.username);
      
      return {
        success: true,
        message: 'Suscripción eliminada correctamente'
      };
    } catch (error) {
      console.error('❌ Error eliminando suscripción:', error);
      throw error;
    }
  }

  // Obtener estadísticas
  async getStats() {
    try {
      const totalUsers = await User.countDocuments({ isActive: true });
      const usersWithSubscriptions = await User.countDocuments({
        'pushSubscriptions.0': { $exists: true }
      });
      
      const allUsers = await User.find({ isActive: true });
      let totalSubscriptions = 0;
      
      allUsers.forEach(user => {
        totalSubscriptions += user.pushSubscriptions.length;
      });

      return {
        totalUsers,
        usersWithSubscriptions,
        totalSubscriptions,
        vapidPublicKey: process.env.VAPID_PUBLIC_KEY?.substring(0, 20) + '...'
      };
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      throw error;
    }
  }
}

export const pushService = new PushService();