import express from 'express';
import User from '../models/User.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Buscar usuario por email
router.get('/email/:email', authenticateToken, async (req, res) => {
  try {
    const { email } = req.params;
    
    const user = await User.findOne({ 
      email: email.toLowerCase(),
      isActive: true 
    }).select('-password -pushSubscriptions');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Buscar múltiples usuarios por emails
router.post('/emails', authenticateToken, async (req, res) => {
  try {
    const { emails } = req.body;
    
    if (!emails || !Array.isArray(emails)) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere un array de emails'
      });
    }

    const users = await User.find({
      email: { $in: emails.map(email => email.toLowerCase()) },
      isActive: true
    }).select('-password -pushSubscriptions');

    res.json({
      success: true,
      users: users.map(user => ({
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      })),
      found: users.length,
      total: emails.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;